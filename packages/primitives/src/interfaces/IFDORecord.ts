import type { IProfileDefinition } from "./IProfileDefinition.js"
import type {
    Attribute,
    LocalID,
    PID,
    ProfileAttributes,
    RecordValue,
    ReferenceDeclaration,
} from "../types.js"
import type { IProfile } from "./IProfile.js"

export interface IFDORecord {
    localID: LocalID
    PID: PID | undefined

    get(attribute: PID): RecordValue | undefined
    getAll(): Map<PID, RecordValue>
    getReferences(): ReferenceDeclaration[]
    getProfiles(): IProfile<IProfileDefinition<ProfileAttributes>>[]
    has(attribute: PID): boolean
    set(attribute: PID, value: RecordValue): void
    remove(attribute: PID): void

    add(record: IFDORecord): void
    add(attribute: Attribute): void
    addReference(
        fromAttribute: PID,
        toAttribute: PID,
        toRecord: PID | LocalID | IFDORecord,
    ): void
    addProfile<P extends IProfile<IProfileDefinition<ProfileAttributes>>>(
        profile: P,
        attributes: P extends IProfile<IProfileDefinition<infer A>> ? A : never,
    ): void
}
