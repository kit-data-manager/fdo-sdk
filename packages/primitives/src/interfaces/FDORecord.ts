import type { ProfileDefinition } from "./ProfileDefinition.js"
import type {
    Attribute,
    LocalID,
    PID,
    ProfileAttributes,
    RecordValue,
    ReferenceDeclaration,
} from "../types.js"
import type { Profile } from "./Profile.js"

export interface FDORecord {
    localID: LocalID
    PID: PID | undefined

    get(attribute: PID): RecordValue | undefined
    getAll(): Map<PID, RecordValue>
    getReferences(): ReferenceDeclaration[]
    getProfiles(): Profile<ProfileDefinition<ProfileAttributes>>[]
    has(attribute: PID): boolean
    set(attribute: PID, value: RecordValue): void
    remove(attribute: PID): void

    add(record: FDORecord): void
    add(attribute: Attribute): void
    addReference(
        fromAttribute: PID,
        toAttribute: PID,
        toRecord: PID | LocalID | FDORecord,
    ): void
    addProfile<P extends Profile<ProfileDefinition<ProfileAttributes>>>(
        profile: P,
        attributes: P extends Profile<ProfileDefinition<infer A>> ? A : never,
    ): void
}
