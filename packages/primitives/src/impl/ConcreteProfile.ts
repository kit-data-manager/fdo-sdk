import type { ProfileDefinition } from "../interfaces/index.js"
import type { Profile } from "../interfaces/Profile.js"
import type { PID, ProfileAttributes } from "../types.js"

export class ConcreteProfile<
    D extends ProfileDefinition<ProfileAttributes>,
> implements Profile<D> {
    readonly def: D

    constructor(def: D) {
        this.def = def
    }

    mapPIDToAttributeName(pid: PID): string {
        const mapping = Object.entries(this.def.mapping)
        const match = mapping.find(([, p]) => p === pid)
        if (!match)
            throw new Error(
                `mapPIDToAttributeName: No attribute with the PID ${pid} is defined in the profile ${this.def.readableName}`,
            )
        return match[0]
    }

    mapAttributeNameToPID(attributeName: string): PID {
        const pid = this.def.mapping[attributeName]
        if (!pid)
            throw new Error(
                `mapAttributeNameToPID: No attribute with the name ${attributeName} is defined in the profile ${this.def.readableName}`,
            )
        return pid
    }
}
