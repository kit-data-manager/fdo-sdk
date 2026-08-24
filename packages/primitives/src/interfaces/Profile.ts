import type { ProfileDefinition } from "./ProfileDefinition.js"
import type {
    AllowKeep,
    PID,
    ProfileAttributes,
    RecordValue,
} from "../types.js"

export interface Profile<D extends ProfileDefinition<ProfileAttributes>> {
    readonly def: D

    mapPIDToAttributeName(pid: PID): string
    mapAttributeNamesToPIDs(
        attributes: D extends ProfileDefinition<infer A> ? AllowKeep<A> : never,
    ): Map<PID, RecordValue | symbol>
}
