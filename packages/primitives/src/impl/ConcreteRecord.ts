import type {
    Attribute,
    FDORecord,
    ProfileDefinition,
} from "../interfaces/index.js"
import {
    type AllowKeep,
    Keep,
    type LocalID,
    type PID,
    type ProfileAttributes,
    type RecordValue,
    type ReferenceDeclaration,
} from "../types.js"
import { toArray } from "../utils.js"
import type { Profile } from "../interfaces/Profile.js"

export class ConcreteRecord implements FDORecord {
    readonly localID: LocalID
    readonly PID: PID | undefined

    private attributes: Map<PID, RecordValue> = new Map()
    private references: ReferenceDeclaration[] = []
    private conformsToProfiles: Profile<
        ProfileDefinition<ProfileAttributes>
    >[] = []

    constructor(localID: LocalID, pid?: PID) {
        this.localID = localID
        this.PID = pid
    }

    addRecord(record: FDORecord): void {
        if (Array.isArray(record)) {
            const recordMap = new Map([[record[0], record[1]]])
            this.addMap(recordMap)
        } else {
            const recordMap = record.getAll()
            this.addMap(recordMap)
        }
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

    addProfile<P extends Profile<ProfileDefinition<ProfileAttributes>>>(
        profile: P,
        attributes: P extends Profile<ProfileDefinition<infer I>>
            ? AllowKeep<I>
            : never,
    ): void {
        this.conformsToProfiles.push(profile)
        const mapped = profile.mapAttributeNamesToPIDs(attributes)
        for (const [key, value] of Object.entries(mapped)) {
            if (value === Keep) {
                const existingValue = this.get(key as PID)
                if (existingValue === undefined) {
                    throw new Error(
                        `Cannot add profile ${profile.def.readableName} because attribute ${profile.mapPIDToAttributeName(key as PID)} was specified as "Keep", but is not present in this record`,
                    )
                } else {
                    mapped.set(key as PID, existingValue)
                }
            }
        }
        this.addMap(mapped as Map<PID, RecordValue>)
    }

    addReference(
        fromAttribute: PID | Attribute<PID | PID[]>,
        toAttribute: PID | Attribute<PID | PID[]>,
        toRecord: PID | LocalID | FDORecord,
    ): void {
        const target =
            typeof toRecord === "object"
                ? (toRecord.PID ?? toRecord.localID)
                : toRecord

        this.references.push({
            fromAttribute: this.getPIDFromAttributOrPID(fromAttribute),
            toAttribute: this.getPIDFromAttributOrPID(toAttribute),
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

    getProfiles(): Profile<ProfileDefinition<ProfileAttributes>>[] {
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
}
