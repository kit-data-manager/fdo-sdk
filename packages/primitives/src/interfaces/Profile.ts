import type { ProfileDefinition } from "./ProfileDefinition.js"
import type { PID, ProfileAttributes } from "../types.js"

export interface Profile<D extends ProfileDefinition<ProfileAttributes>> {
    readonly def: D

    mapPIDToAttributeName(pid: PID): string
    mapAttributeNameToPID(attributeName: string): PID
}
