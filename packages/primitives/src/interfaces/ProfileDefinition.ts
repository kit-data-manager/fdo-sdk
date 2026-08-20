import type { AttributeToPID, PID, ProfileAttributes } from "../types.js"

export interface ProfileDefinition<Attributes extends ProfileAttributes> {
    readonly pid: PID

    /**
     * Maps the readable name of an attribute to its PID
     */
    readonly mapping: AttributeToPID<Attributes>
}
