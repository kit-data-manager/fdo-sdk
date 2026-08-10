import type { IProfileDefinition } from "./IProfileDefinition.js"
import type { PID, ProfileAttributes, RecordValue } from "../types.js"

export interface IProfile<D extends IProfileDefinition<ProfileAttributes>> {
    readonly def: D

    mapAttributeNamesToPIDs(
        attributes: D extends IProfileDefinition<infer A> ? A : never,
    ): Map<PID, RecordValue>
}
