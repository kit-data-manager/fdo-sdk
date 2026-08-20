import type { ProfileDefinition } from "./ProfileDefinition.js"
import type { PID, ProfileAttributes, RecordValue } from "../types.js"

export interface Profile<D extends ProfileDefinition<ProfileAttributes>> {
    readonly def: D

    mapAttributeNamesToPIDs(
        attributes: D extends ProfileDefinition<infer A> ? A : never,
    ): Map<PID, RecordValue>
}
