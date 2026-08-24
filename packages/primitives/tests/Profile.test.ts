import { describe, it, expect } from "vitest"
import type { Profile } from "../src/index.js"
import type { ProfileDefinition } from "../src/index.js"
import { ConcreteProfile } from "../src/index.js"

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
        const mapped = profile.mapAttributeNameToPID("datasetName")
        expect(mapped).toBe("some/pid1")
    })

    it("throws when an attribute has no mapping", () => {
        const profile = new ConcreteProfile(def)
        expect(() => profile.mapAttributeNameToPID("unknown")).toThrow(
            "mapAttributeNameToPID: No attribute with the name unknown is defined in the profile HMC Profile",
        )
    })
})
