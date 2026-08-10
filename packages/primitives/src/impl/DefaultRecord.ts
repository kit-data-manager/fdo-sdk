import type { IFDORecord, IProfileDefinition } from "../interfaces/index.js"
import type {
    Attribute,
    LocalID,
    PID,
    ProfileAttributes,
    RecordValue,
    ReferenceDeclaration,
} from "../types.js"
import { toArray } from "../utils.js"
import type { IProfile } from "../interfaces/IProfile.js"

export class DefaultRecord implements IFDORecord {
    readonly localID: LocalID
    readonly PID: PID | undefined

    private attributes: Map<PID, RecordValue> = new Map()
    private references: ReferenceDeclaration[] = []
    private conformsToProfiles: IProfile<
        IProfileDefinition<ProfileAttributes>
    >[] = []

    constructor(localID: LocalID, pid?: PID) {
        this.localID = localID
        this.PID = pid
    }

    add(record: IFDORecord): void
    add(attribute: Attribute): void
    add(record: IFDORecord | Attribute): void {
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

    addProfile<P extends IProfile<IProfileDefinition<ProfileAttributes>>>(
        profile: P,
        attributes: P extends IProfile<IProfileDefinition<infer I>> ? I : never,
    ): void {
        this.conformsToProfiles.push(profile)
        const mapped = profile.mapAttributeNamesToPIDs(attributes)
        this.addMap(mapped)
    }

    addReference(
        fromAttribute: PID,
        toAttribute: PID,
        toRecord: PID | LocalID | IFDORecord,
    ): void {
        const target =
            typeof toRecord === "object"
                ? (toRecord.PID ?? toRecord.localID)
                : toRecord

        this.references.push({
            fromAttribute,
            toAttribute,
            toRecord: target,
        })
        this.add([fromAttribute, target])
    }

    get(attribute: PID): RecordValue | undefined {
        return structuredClone(this.attributes.get(attribute))
    }

    getAll(): Map<PID, RecordValue> {
        return structuredClone(this.attributes)
    }

    getReferences(): ReferenceDeclaration[] {
        return structuredClone(this.references)
    }

    getProfiles(): IProfile<IProfileDefinition<ProfileAttributes>>[] {
        return this.conformsToProfiles
    }

    has(attribute: PID): boolean {
        return this.attributes.has(attribute)
    }

    set(attribute: PID, value: RecordValue): void {
        this.attributes.set(attribute, value)
        this.removeReferencesFrom(attribute)
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
