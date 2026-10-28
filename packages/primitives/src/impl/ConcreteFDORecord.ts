import type {
    Attribute,
    FDORecord,
    IdentifiableFDORecord,
    PublishedFDORecord,
} from "../interfaces/index.js"
import {
    type WithMarkers,
    type LocalID,
    type PID,
    type ProfileAttributes,
    type RecordValue,
    type ReferenceDeclaration,
} from "../types.js"
import { toArray } from "../utils.js"
import type { Profile } from "../interfaces/Profile.js"
import { isKeep, isReference, isSkip } from "./markers.js"

/**
 * Base implementation of the {@link FDORecord} interface. Can hold a PID to be
 * a {@link PublishedFDORecord} (use {@link isPublished} to check).
 *
 * Consider using {@link ConcreteLocalFDORecord} if you are creating FDOs
 */
export class ConcreteFDORecord implements FDORecord {
    readonly PID: PID | undefined

    protected attributes: Map<PID, RecordValue> = new Map()
    protected references: ReferenceDeclaration[] = []
    protected conformsToProfiles: PID[] = []

    constructor(pid?: PID) {
        this.PID = pid
    }

    addRecord(record: FDORecord): void {
        const recordMap = record.getAll()
        this.addMap(recordMap)
    }

    protected addMap(map: Map<PID, RecordValue>) {
        for (const [key, value] of map) {
            if (this.attributes.has(key)) {
                const currentValue = this.attributes.get(key)!
                const newValue = toArray(currentValue)
                newValue.push(...toArray(value))
                this.attributes.set(key, newValue)
            } else {
                this.attributes.set(key, value)
            }
        }
    }

    addAttribute<Attr extends Attribute<RecordValue>>(
        attribute: Attr | PID,
        value: Attr extends Attribute<infer T> ? T : RecordValue,
    ): void {
        this.addMap(new Map([[this.getPIDFromAttributOrPID(attribute), value]]))
    }

    addProfile<P extends Profile<ProfileAttributes>>(
        profile: P,
        attributes: P extends Profile<infer I> ? WithMarkers<I> : never,
    ): void {
        this.conformsToProfiles.push(profile.def.pid)

        // If the profile defines a profileAttributePID, we mark this profile as active in that profile marker attribute
        if (profile.def.profileAttributePID) {
            const existingProfileMarker = this.get(
                profile.def.profileAttributePID,
            )

            // If the profile marker attribute doesn't exist yet or doesn't contain this specific profile yet, we add it
            if (
                !existingProfileMarker ||
                !toArray(existingProfileMarker).some(
                    (profilePID) => profilePID === profile.def.pid,
                )
            ) {
                this.addAttribute(
                    profile.def.profileAttributePID,
                    profile.def.pid,
                )
            }
        }

        const mapped = new Map<PID, RecordValue>()
        for (const [attributeName, value] of Object.entries(attributes)) {
            const attributePID = profile.mapAttributeNameToPID(attributeName)

            if (isKeep(value)) {
                const existingValue = this.get(attributePID)
                if (existingValue === undefined) {
                    throw new Error(
                        `Cannot add profile ${profile.def.readableName} because attribute ${attributeName} (PID: ${attributePID}) was specified as "keep", but is not present in this record`,
                    )
                }
            } else if (isSkip(value)) {
                // continue
            } else if (isReference(value)) {
                this.addReferenceDirect(attributePID, value.ref)
            } else if (
                Array.isArray(value) &&
                value.some((element) => isReference(element))
            ) {
                const references = value.filter((element) =>
                    isReference(element),
                )
                const primitives = value.filter(
                    (element) => typeof element !== "object",
                )

                for (const reference of references) {
                    this.addReferenceDirect(attributePID, reference.ref)
                }

                mapped.set(attributePID, primitives)
            } else {
                if (
                    (Array.isArray(value) &&
                        value.some((element) => typeof element === "object")) ||
                    (typeof value === "object" && !Array.isArray(value))
                ) {
                    console.error(
                        "Profile instance contains illegal value of type object. This might be an internal error.",
                        attributes,
                        attributePID,
                        value,
                    )
                    throw new Error(
                        "Profile instance contains illegal value of type object. This might be an internal error.",
                    )
                }

                mapped.set(attributePID, value as RecordValue)
            }
        }
        this.addMap(mapped as Map<PID, RecordValue>)
    }

    protected addReferenceDirect(
        fromAttribute: PID,
        reference:
            | Omit<ReferenceDeclaration & { direction: "uni" }, "fromAttribute">
            | Omit<
                  ReferenceDeclaration & { direction: "bidi" },
                  "fromAttribute"
              >,
    ): void {
        this.references.push({ ...reference, fromAttribute })
        this.addAttribute(fromAttribute, reference.toRecord)
    }

    addReference(
        fromAttribute: PID | Attribute<PID | PID[]>,
        toRecord: PID | LocalID | IdentifiableFDORecord,
    ): void {
        const target =
            typeof toRecord === "object"
                ? (toRecord.PID ??
                  ("localID" in toRecord ? toRecord.localID : undefined))
                : toRecord

        if (target === undefined)
            throw new Error(
                "Cannot add reference to target because target has no PID and no LocalID",
            )

        this.references.push({
            direction: "uni",
            fromAttribute: this.getPIDFromAttributOrPID(fromAttribute),
            toRecord: target,
        })
        this.addAttribute(fromAttribute, target)
    }

    addReferenceBidi(
        fromAttribute: PID | Attribute<PID | PID[]>,
        inverseAttribute: PID | Attribute<PID | PID[]>,
        toRecord: PID | LocalID | IdentifiableFDORecord,
    ): void {
        const target =
            typeof toRecord === "object"
                ? (toRecord.PID ??
                  ("localID" in toRecord ? toRecord.localID : undefined))
                : toRecord

        if (target === undefined)
            throw new Error(
                "Cannot add reference to target because target has no PID and no LocalID",
            )

        this.references.push({
            direction: "bidi",
            fromAttribute: this.getPIDFromAttributOrPID(fromAttribute),
            inverseAttribute: this.getPIDFromAttributOrPID(inverseAttribute),
            toRecord: target,
        })
        this.addAttribute(fromAttribute, target)
    }

    get(attribute: PID | Attribute<never>): RecordValue | undefined {
        return structuredClone(
            this.attributes.get(this.getPIDFromAttributOrPID(attribute)),
        )
    }

    getAll(): Map<PID, RecordValue> {
        return structuredClone(this.attributes)
    }

    getReferences(): ReferenceDeclaration[] {
        return structuredClone(this.references)
    }

    getProfiles(): PID[] {
        return this.conformsToProfiles
    }

    has(attribute: PID | Attribute<never>): boolean {
        return this.attributes.has(this.getPIDFromAttributOrPID(attribute))
    }

    set<T extends RecordValue>(attribute: Attribute<T>, value: T): void
    set(attribute: PID, value: RecordValue): void
    set<T extends RecordValue = RecordValue>(
        attribute: PID | Attribute<T>,
        value: T,
    ): void {
        this.attributes.set(this.getPIDFromAttributOrPID(attribute), value)
        this.removeReferencesFrom(this.getPIDFromAttributOrPID(attribute))
    }

    protected getPIDFromAttributOrPID(attributeOrPID: PID | Attribute<never>) {
        return typeof attributeOrPID === "string"
            ? attributeOrPID
            : attributeOrPID.pid
    }

    protected removeReferencesFrom(from: PID) {
        this.references = this.references.filter(
            (ref) => ref.fromAttribute !== from,
        )
    }

    remove(attribute: PID) {
        this.attributes.delete(attribute)
    }

    toJSON(): Record<string, RecordValue> {
        return Object.fromEntries(this.attributes)
    }

    toString(): string {
        return JSON.stringify(
            {
                PID: this.PID,
                profiles: this.conformsToProfiles.join(", "),
                attributes: Object.fromEntries(this.attributes),
                references: this.references,
            },
            null,
            2,
        )
    }
}
