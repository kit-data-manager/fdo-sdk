import type { ProfileDefinition } from "./ProfileDefinition.js"
import type { PID, ProfileAttributes } from "../types.js"

export interface Profile<A extends ProfileAttributes> {
    readonly def: ProfileDefinition<A>

    mapPIDToAttributeName(pid: PID): string
    mapAttributeNameToPID(attributeName: string): PID
}
