import type {
    PID,
    Profile,
    ProfileAttributes,
    ProfileDefinition,
} from "@fdo-sdk/primitives"
import { ConcreteProfile } from "@fdo-sdk/primitives"
import { isPID, splitPID } from "./pid.js"

const HANDLE_API_URL = "https://hdl.handle.net/api/handles"

export type Fetch = (input: string) => Promise<Response>

interface HandleValue {
    index: number
    type: string
    data: { format: string; value: unknown }
    ttl: number
    timestamp: string
}

interface HandleResponse {
    responseCode?: number
    handle?: string
    values?: HandleValue[]
}

export class PIDResolver {
    private readonly cache = new Map<
        string,
        Profile<ProfileDefinition<ProfileAttributes>>
    >()
    private readonly unresolvables = new Set<string>()

    constructor(private readonly fetchImpl: Fetch = fetch) {}

    async resolveProfile(
        pid: string,
    ): Promise<Profile<ProfileDefinition<ProfileAttributes>> | undefined> {
        if (!isPID(pid)) return undefined
        const parts = splitPID(pid)!

        const cached = this.cache.get(pid)
        if (cached) return cached
        if (this.unresolvables.has(pid)) return undefined

        let response: Response
        try {
            response = await this.fetchImpl(
                `${HANDLE_API_URL}/${parts.prefix}/${parts.suffix}#resolve`,
            )
        } catch {
            this.unresolvables.add(pid)
            return undefined
        }

        if (!response.ok) {
            this.unresolvables.add(pid)
            return undefined
        }

        let data: HandleResponse
        try {
            data = (await response.json()) as HandleResponse
        } catch {
            this.unresolvables.add(pid)
            return undefined
        }

        if (!data.values) {
            this.unresolvables.add(pid)
            return undefined
        }

        const profile = new ConcreteProfile(
            this.toProfileDefinition(pid, data.values),
        )
        this.cache.set(pid, profile)
        return profile
    }

    private toProfileDefinition(
        pid: string,
        values: HandleValue[],
    ): ProfileDefinition<ProfileAttributes> {
        const mapping: Record<string, PID> = {}
        for (const value of values) {
            if (isPID(value.type)) {
                mapping[value.type] = value.type as PID
            }
        }
        return { pid: pid as PID, mapping }
    }
}
