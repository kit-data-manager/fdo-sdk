import { describe, expect, it } from "vitest"
import { ConcreteFDORecord } from "@fdo-sdk/primitives"
import {
    FDO_PROFILES,
    FDO_TYPES,
    SIMPLE_ATTRIBUTES,
    SIMPLE_PROFILES,
} from "../src/index.js"

describe("SIMPLE_PROFILES", () => {
    it("uses the profile identifiers", () => {
        for (const [key, pid] of Object.entries(FDO_PROFILES)) {
            expect(
                SIMPLE_PROFILES[key as keyof typeof SIMPLE_PROFILES].def.pid,
            ).toBe(pid)
        }
    })

    it("maps every attribute to an existing attribute PID", () => {
        const attributePIDs = new Set(
            Object.values(SIMPLE_ATTRIBUTES).map((attribute) => attribute.pid),
        )
        for (const profile of Object.values(SIMPLE_PROFILES)) {
            for (const attributeName of Object.keys(profile.def.mapping)) {
                const pid = profile.mapAttributeNameToPID(attributeName)
                expect(attributePIDs.has(pid)).toBe(true)
            }
        }
    })

    it("resolves attribute names back from PIDs", () => {
        for (const profile of Object.values(SIMPLE_PROFILES)) {
            for (const [attributeName, pid] of Object.entries(
                profile.def.mapping,
            )) {
                expect(profile.mapPIDToAttributeName(pid)).toBe(attributeName)
            }
        }
    })

    it("throws for unknown PIDs and attribute names", () => {
        const profile = SIMPLE_PROFILES.CORE
        expect(() => profile.mapPIDToAttributeName("unknown/pid")).toThrow()
        expect(() => profile.mapAttributeNameToPID("unknown")).toThrow()
    })

    it("includes the PROFILE attribute in every profile", () => {
        for (const profile of Object.values(SIMPLE_PROFILES)) {
            expect(profile.def.mapping.profile).toBe(FDO_TYPES.PROFILE)
        }
    })

    it("can be applied to FDO records", () => {
        const record = new ConcreteFDORecord()
        record.addProfile(SIMPLE_PROFILES.SOFTWARE, {
            profile: FDO_PROFILES.SOFTWARE,
            softwareRepositoryType: "GitHub",
            softwareLocation: "https://github.com/example/example",
            softwareLicense: "MIT",
            readmeLocation: "https://example.com/README.md",
        })
        expect(record.getProfiles()).toEqual([FDO_PROFILES.SOFTWARE])
        expect(record.get(SIMPLE_ATTRIBUTES.PROFILE)).toBe(
            FDO_PROFILES.SOFTWARE,
        )
        expect(record.get(SIMPLE_ATTRIBUTES.SOFTWARE_LOCATION)).toBe(
            "https://github.com/example/example",
        )
    })
})
