import { describe, it, expect } from "vitest"
import type { Profile } from "../src/interfaces/Profile.js"
import type { ProfileDefinition } from "../src/interfaces/ProfileDefinition.js"
import type { ProfileAttributes } from "../src/types.js"
import { ConcreteProfile } from "../src/impl/index.js"

type HMCProfileAttributes = {
    datasetName: string
    authors: string | string[]
    dateCreated?: string
}

const def: ProfileDefinition<HMCProfileAttributes> = {
    pid: "profile/pid",
    readableName: "HMC Profile",
    mapping: {
        datasetName: "some/pid1",
        authors: "some/pid2",
        dateCreated: "some/pid3",
    },
}

describe("Profile (via ConcreteProfile)", () => {
    it("exposes the definition via readonly def", () => {
        const profile: Profile<ProfileDefinition<HMCProfileAttributes>> =
            new ConcreteProfile(def)
        expect(profile.def).toBe(def)
        expect(profile.def.pid).toBe("profile/pid")
        expect(profile.def.mapping.datasetName).toBe("some/pid1")
    })

    it("maps a single string attribute name to its PID", () => {
        const profile = new ConcreteProfile(def)
        const mapped = profile.mapAttributeNamesToPIDs({
            datasetName: "My Dataset",
            authors: "author1",
        })
        expect(mapped.get("some/pid1")).toBe("My Dataset")
        expect(mapped.get("some/pid2")).toBe("author1")
    })

    it("maps array-valued attributes", () => {
        const profile = new ConcreteProfile(def)
        const mapped = profile.mapAttributeNamesToPIDs({
            datasetName: "DS",
            authors: ["a1", "a2"],
        })
        expect(mapped.get("some/pid2")).toEqual(["a1", "a2"])
    })

    it("omits attributes that are not provided", () => {
        const profile = new ConcreteProfile(def)
        const mapped = profile.mapAttributeNamesToPIDs({
            datasetName: "DS",
            authors: "a1",
        })
        expect(mapped.has("some/pid3")).toBe(false)
        expect(mapped.size).toBe(2)
    })

    it("returns a Map with the correct size when all attributes are provided", () => {
        const profile = new ConcreteProfile(def)
        const mapped = profile.mapAttributeNamesToPIDs({
            datasetName: "DS",
            authors: ["a1", "a2"],
            dateCreated: "2024",
        })
        expect(mapped.size).toBe(3)
        expect(mapped.get("some/pid3")).toBe("2024")
    })

    it("throws when an attribute has no mapping", () => {
        const profile = new ConcreteProfile(def)
        const attrs = {
            datasetName: "DS",
            authors: "a1",
            unknown: "x",
        }
        expect(() =>
            profile.mapAttributeNamesToPIDs(attrs as HMCProfileAttributes),
        ).toThrow('Unknown mapped attribute "unknown"')
    })
})
