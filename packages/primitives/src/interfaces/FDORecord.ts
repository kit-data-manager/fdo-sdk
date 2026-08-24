import type { ProfileDefinition } from "./ProfileDefinition.js"
import type {
    WithMarkers,
    LocalID,
    PID,
    ProfileAttributes,
    RecordValue,
    ReferenceDeclaration,
} from "../types.js"
import type { Profile } from "./Profile.js"
import type { Attribute } from "./Attribute.js"

export interface FDORecord {
    localID: LocalID
    PID: PID | undefined

    get(attribute: PID | Attribute<never>): RecordValue | undefined
    getAll(): Map<PID, RecordValue>
    getReferences(): ReferenceDeclaration[]
    getProfiles(): Profile<ProfileDefinition<ProfileAttributes>>[]
    has(attribute: PID | Attribute<never>): boolean
    set(attribute: PID, value: RecordValue): void
    set<T extends RecordValue>(attribute: Attribute<T>, value: T): void
    remove(attribute: PID | Attribute<never>): void

    addRecord(record: FDORecord): void
    addAttribute(attribute: PID, value: RecordValue): void
    addAttribute<Attr extends Attribute<RecordValue>>(
        attribute: Attr,
        value: Attr extends Attribute<infer T> ? T : never,
    ): void
    addProfile<P extends Profile<ProfileDefinition<ProfileAttributes>>>(
        profile: P,
        attributes: P extends Profile<ProfileDefinition<infer A>>
            ? WithMarkers<A>
            : never,
    ): void
    addReference(
        fromAttribute: PID | Attribute<PID | PID[]>,
        toAttribute: PID | Attribute<PID | PID[]>,
        toRecord: PID | LocalID | FDORecord,
    ): void

    toJSON(): Record<string, RecordValue>
    toString(): string
}
