import type { Attribute, FDORecord } from "../interfaces/index.js"
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

export class ConcreteRecord implements FDORecord {
    readonly localID: LocalID
    readonly PID: PID | undefined

    private attributes: Map<PID, RecordValue> = new Map()
    private references: ReferenceDeclaration[] = []
    private conformsToProfiles: PID[] = []

    constructor(localID: LocalID, pid?: PID) {
        this.localID = localID
        this.PID = pid
    }

    addRecord(record: FDORecord): void {
        const recordMap = record.getAll()
        this.addMap(recordMap)
    }

    private addMap(map: Map<PID, RecordValue>) {
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

    private addReferenceDirect(
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
        toRecord: PID | LocalID | FDORecord,
    ): void {
        const target =
            typeof toRecord === "object"
                ? (toRecord.PID ?? toRecord.localID)
                : toRecord

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
        toRecord: PID | LocalID | FDORecord,
    ): void {
        const target =
            typeof toRecord === "object"
                ? (toRecord.PID ?? toRecord.localID)
                : toRecord

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

    private getPIDFromAttributOrPID(attributeOrPID: PID | Attribute<never>) {
        return typeof attributeOrPID === "string"
            ? attributeOrPID
            : attributeOrPID.pid
    }

    private removeReferencesFrom(from: PID) {
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
                localID: this.localID,
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
