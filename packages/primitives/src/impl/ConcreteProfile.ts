import type { ProfileDefinition } from "../interfaces/index.js"
import type { Profile } from "../interfaces/Profile.js"
import type {
    AllowKeep,
    PID,
    ProfileAttributes,
    RecordValue,
} from "../types.js"

export class ConcreteProfile<
    D extends ProfileDefinition<ProfileAttributes>,
> implements Profile<D> {
    readonly def: D

    constructor(def: D) {
        this.def = def
    }

    mapPIDToAttributeName(pid: PID): string {
        const mapping = Object.entries(this.def.mapping)
        const match = mapping.find(([, p]) => p === pid)!
        return match[0]
    }

    mapAttributeNamesToPIDs(
        attributes: D extends ProfileDefinition<infer A> ? AllowKeep<A> : never,
    ): Map<PID, RecordValue | symbol> {
        const entries = Object.entries(attributes)
        const map = new Map<PID, RecordValue | symbol>()
        for (const [key, value] of entries) {
            const PID = this.def.mapping[key]
            if (!PID) throw new Error(`Unknown mapped attribute "${key}"`)
            map.set(PID, value)
        }
        return map
    }
}
