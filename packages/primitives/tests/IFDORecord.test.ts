import { describe, it, expect } from "vitest"
import type { IFDORecord } from "../src/interfaces/IFDORecord.js"
import type { IProfileDefinition } from "../src/interfaces/IProfileDefinition.js"
import type { ProfileAttributes } from "../src/types.js"
import { DefaultRecord, DefaultProfile } from "../src/impl/index.js"

type HMCProfileAttributes = {
    datasetName: string
    authors: string | string[]
    dateCreated?: string
}

const def: IProfileDefinition<HMCProfileAttributes> = {
    pid: "profile/pid",
    mapping: {
        datasetName: "some/pid1",
        authors: "some/pid2",
        dateCreated: "some/pid3",
    },
}

describe("IFDORecord (via DefaultRecord)", () => {
    describe("construction", () => {
        it("sets localID and leaves PID undefined when no PID is given", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            expect(r.localID).toBe("LOCAL/1")
            expect(r.PID).toBeUndefined()
        })

        it("sets PID when one is provided", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1", "rec/pid")
            expect(r.PID).toBe("rec/pid")
        })
    })

    describe("set / get / has", () => {
        it("get returns undefined for a missing attribute", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            expect(r.get("missing/pid")).toBeUndefined()
        })

        it("has returns false for missing and true for present attributes", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            expect(r.has("a/pid")).toBe(false)
            r.set("a/pid", "v")
            expect(r.has("a/pid")).toBe(true)
        })

        it("set stores a string value retrievable by get", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/pid", "value")
            expect(r.get("a/pid")).toBe("value")
        })

        it("set stores an array value retrievable by get", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/pid", ["x", "y"])
            expect(r.get("a/pid")).toEqual(["x", "y"])
        })

        it("set overwrites an existing value without concatenating", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/pid", "first")
            r.set("a/pid", "second")
            expect(r.get("a/pid")).toBe("second")
        })

        it("get returns a deep clone (mutating the result does not affect the record)", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/pid", ["x", "y"])
            const val = r.get("a/pid") as string[]
            val.push("z")
            expect(r.get("a/pid")).toEqual(["x", "y"])
        })

        it("set removes all reference declarations", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.addReference("test/src-attr", "test/tgt-attr", "LOCAL/2")
            expect(r.get("test/src-attr")).toBe("LOCAL/2")
            expect(r.getReferences()).toHaveLength(1)
            r.set("test/src-attr", "other value")
            expect(r.get("test/src-attr")).toBe("other value")
            expect(r.getReferences()).toHaveLength(0)
        })

        it("set removes all reference declarations", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/pid", ["x", "y"])
            r.set("b/pid", ["x", "y"])
            expect(r.getAll().size).toBe(2)
            expect(r.get("a/pid")).not.toBeUndefined()
            expect(r.get("b/pid")).not.toBeUndefined()
            r.remove("a/pid")
            expect(r.getAll().size).toBe(1)
            expect(r.get("a/pid")).toBeUndefined()
            expect(r.get("b/pid")).not.toBeUndefined()
        })
    })

    describe("getAll", () => {
        it("returns an empty map for a fresh record", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            expect(r.getAll().size).toBe(0)
        })

        it("returns all set attributes", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/1", "v1")
            r.set("a/2", "v2")
            const all = r.getAll()
            expect(all.get("a/1")).toBe("v1")
            expect(all.get("a/2")).toBe("v2")
            expect(all.size).toBe(2)
        })

        it("returns a clone (mutating the map does not affect the record)", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/1", "v1")
            const all = r.getAll()
            all.set("a/2", "injected")
            all.delete("a/1")
            expect(r.has("a/1")).toBe(true)
            expect(r.get("a/2")).toBeUndefined()
        })
    })

    describe("add (attribute tuple)", () => {
        it("adds a [PID, value] tuple", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.add(["a/pid", "v"])
            expect(r.get("a/pid")).toBe("v")
        })

        it("concatenates values when adding a tuple for an existing PID", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/pid", "first")
            r.add(["a/pid", "second"])
            expect(r.get("a/pid")).toEqual(["first", "second"])
        })

        it("concatenates into an existing array value", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("a/pid", ["x"])
            r.add(["a/pid", "y"])
            expect(r.get("a/pid")).toEqual(["x", "y"])
        })
    })

    describe("add (record)", () => {
        it("merges all attributes from another record", () => {
            const a: IFDORecord = new DefaultRecord("LOCAL/1")
            a.set("a/1", "v1")
            a.set("a/2", "v2")
            const b: IFDORecord = new DefaultRecord("LOCAL/2")
            b.add(a)
            expect(b.get("a/1")).toBe("v1")
            expect(b.get("a/2")).toBe("v2")
        })

        it("concatenates values for overlapping PIDs when merging records", () => {
            const a: IFDORecord = new DefaultRecord("LOCAL/1")
            a.set("shared/pid", "fromA")
            const b: IFDORecord = new DefaultRecord("LOCAL/2")
            b.set("shared/pid", "fromB")
            b.add(a)
            expect(b.get("shared/pid")).toEqual(["fromB", "fromA"])
        })
    })

    describe("addReference", () => {
        it("adds a reference attribute pointing at a PID target", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.addReference("from/pid", "to/pid", "target/pid")
            expect(r.get("from/pid")).toBe("target/pid")
        })

        it("adds a reference attribute pointing at a LocalID target", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.addReference("from/pid", "to/pid", "LOCAL/2")
            expect(r.get("from/pid")).toBe("LOCAL/2")
        })

        it("uses the record's PID as target when given a record with a PID", () => {
            const target: IFDORecord = new DefaultRecord(
                "LOCAL/2",
                "target/pid",
            )
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.addReference("from/pid", "to/pid", target)
            expect(r.get("from/pid")).toBe("target/pid")
        })

        it("falls back to localID when the target record has no PID", () => {
            const target: IFDORecord = new DefaultRecord("LOCAL/2")
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.addReference("from/pid", "to/pid", target)
            expect(r.get("from/pid")).toBe("LOCAL/2")
        })

        it("concatenates with an existing value for the from-attribute", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("from/pid", "existing")
            r.addReference("from/pid", "to/pid", "target/pid")
            expect(r.get("from/pid")).toEqual(["existing", "target/pid"])
        })
    })

    describe("addProfile", () => {
        it("maps profile attributes to PIDs and adds them to the record", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            const profile = new DefaultProfile(def)
            r.addProfile(profile, {
                datasetName: "My Dataset",
                authors: ["a1", "a2"],
            })
            expect(r.get("some/pid1")).toBe("My Dataset")
            expect(r.get("some/pid2")).toEqual(["a1", "a2"])
            expect(r.getProfiles()).toEqual([profile])
        })

        it("only adds provided attributes (optional ones are omitted)", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            const profile = new DefaultProfile(def)
            r.addProfile(profile, { datasetName: "DS", authors: "a1" })
            expect(r.has("some/pid3")).toBe(false)
        })

        it("concatenates with existing values for overlapping PIDs", () => {
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            r.set("some/pid1", "existing")
            const profile = new DefaultProfile(def)
            r.addProfile(profile, { datasetName: "new", authors: "a1" })
            expect(r.get("some/pid1")).toEqual(["existing", "new"])
        })
    })
})
