import type { AttributeToPID, PID, ProfileAttributes } from "../types.js"

export interface ProfileDefinition<Attributes extends ProfileAttributes> {
    /**
     * The PID of this profile
     */
    readonly pid: PID

    /**
     * The human-readable name of this profile
     */
    readonly readableName: string

    /**
     * The PID of the attribute that is used to mark this profile as active for records that use it.
     * When left undefined, no attribute will be used to mark this profile as active.
     *
     * @example
     * // profileAttributePID: "0.SIMPLE/PROFILE"
     *
     * myRecord.addProfile(MY_PROFILE, { ... })
     * // -> attribute "0.SIMPLE/PROFILE" on myRecord is set to MY_PROFILE.pid
     */
    readonly profileAttributePID?: PID

    /**
     * Maps the readable name of an attribute to its PID
     */
    readonly mapping: AttributeToPID<Attributes>
}
