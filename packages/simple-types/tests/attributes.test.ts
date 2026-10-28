import { describe, expect, it } from "vitest"
import { ConcreteFDORecord } from "@fdo-sdk/primitives"
import { FDO_TYPES, LEGACY_TYPE_KEYS, SIMPLE_ATTRIBUTES } from "../src/index.js"

describe("SIMPLE_ATTRIBUTES", () => {
    it("covers every type identifier", () => {
        expect(Object.keys(SIMPLE_ATTRIBUTES)).toEqual(
            expect.arrayContaining([
                ...Object.keys(FDO_TYPES),
                ...Object.keys(LEGACY_TYPE_KEYS),
            ]),
        )
    })

    it("uses the identifier PIDs with non-empty readable names", () => {
        for (const identifiers of [FDO_TYPES, LEGACY_TYPE_KEYS]) {
            for (const [key, pid] of Object.entries(identifiers)) {
                const attribute =
                    SIMPLE_ATTRIBUTES[key as keyof typeof SIMPLE_ATTRIBUTES]
                expect(attribute.pid).toBe(pid)
                expect(attribute.readableName.length).toBeGreaterThan(0)
            }
        }
    })

    it("can be set and read on FDO records", () => {
        const record = new ConcreteFDORecord()
        record.set(SIMPLE_ATTRIBUTES.OWNER, "0000-0002-1825-0097")
        expect(record.get(SIMPLE_ATTRIBUTES.OWNER)).toBe("0000-0002-1825-0097")
        expect(record.get(FDO_TYPES.OWNER)).toBe("0000-0002-1825-0097")
    })

    it("supports array values for multi-valued attributes", () => {
        const record = new ConcreteFDORecord()
        record.set(SIMPLE_ATTRIBUTES.PUBLICATION_CREATOR, [
            "0000-0002-1825-0097",
            "0000-0003-4045-3566",
        ])
        expect(record.get(SIMPLE_ATTRIBUTES.PUBLICATION_CREATOR)).toEqual([
            "0000-0002-1825-0097",
            "0000-0003-4045-3566",
        ])
    })
})
