import type { ProfileDefinition } from "../interfaces/index.js"
import type { Profile } from "../interfaces/Profile.js"
import type { PID, ProfileAttributes, RecordValue } from "../types.js"

export class ConcreteProfile<
    D extends ProfileDefinition<ProfileAttributes>,
> implements Profile<D> {
    readonly def: D

    constructor(def: D) {
        this.def = def
    }

    mapAttributeNamesToPIDs(
        attributes: D extends ProfileDefinition<infer A> ? A : never,
    ): Map<PID, RecordValue> {
        const entries = Object.entries(attributes)
        const map = new Map<PID, RecordValue>()
        for (const [key, value] of entries) {
            const PID = this.def.mapping[key]
            if (!PID) throw new Error(`Unknown mapped attribute "${key}"`)
            map.set(PID, value)
        }
        return map
    }
}
