import { describe, it, expect } from "vitest"
import type { FDOGraph } from "../src/index.js"
import type { FDORecord } from "../src/index.js"
import { MapGraph, ConcreteRecord } from "../src/index.js"

describe("FDOGraph (via MapGraph)", () => {
    describe("construction", () => {
        it("starts with no records", () => {
            const graph: FDOGraph = new MapGraph()
            expect(graph.getRecords()).toEqual([])
        })
    })

    describe("addRecord / getRecords", () => {
        it("returns all added records", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteRecord("LOCAL/2")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.getRecords()).toEqual([a, b])
        })

        it("returns a new array each time (mutating it does not affect the graph)", () => {
            const graph: FDOGraph = new MapGraph()
            graph.addRecord(new ConcreteRecord("LOCAL/1"))
            const records = graph.getRecords()
            records.pop()
            expect(graph.getRecords()).toHaveLength(1)
        })

        it("replaces an existing record with the same localID", () => {
            const graph: FDOGraph = new MapGraph()
            graph.addRecord(new ConcreteRecord("LOCAL/1", "rec/a"))
            const replacement: FDORecord = new ConcreteRecord("LOCAL/1")
            graph.addRecord(replacement)
            expect(graph.getRecords()).toEqual([replacement])
            expect(graph.getRecord("LOCAL/1")).toBe(replacement)
            expect(graph.getRecord("rec/a")).toBeUndefined()
        })

        it("re-indexes the PID when a record with the same localID is replaced", () => {
            const graph: FDOGraph = new MapGraph()
            graph.addRecord(new ConcreteRecord("LOCAL/1", "rec/a"))
            graph.addRecord(new ConcreteRecord("LOCAL/1", "rec/b"))
            expect(graph.getRecord("rec/a")).toBeUndefined()
            expect(graph.getRecord("rec/b")?.localID).toBe("LOCAL/1")
        })
    })

    describe("getRecord", () => {
        it("finds a record by localID", () => {
            const graph: FDOGraph = new MapGraph()
            const r: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            graph.addRecord(r)
            expect(graph.getRecord("LOCAL/1")).toBe(r)
        })

        it("finds a record by PID", () => {
            const graph: FDOGraph = new MapGraph()
            const r: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            graph.addRecord(r)
            expect(graph.getRecord("rec/a")).toBe(r)
        })

        it("finds a PID-less record by localID", () => {
            const graph: FDOGraph = new MapGraph()
            const r: FDORecord = new ConcreteRecord("LOCAL/1")
            graph.addRecord(r)
            expect(graph.getRecord("LOCAL/1")).toBe(r)
        })

        it("returns undefined for an unknown id", () => {
            const graph: FDOGraph = new MapGraph()
            graph.addRecord(new ConcreteRecord("LOCAL/1", "rec/a"))
            expect(graph.getRecord("LOCAL/missing")).toBeUndefined()
            expect(graph.getRecord("rec/missing")).toBeUndefined()
        })
    })

    describe("removeRecord", () => {
        it("removes a PID-less record by localID", () => {
            const graph: FDOGraph = new MapGraph()
            graph.addRecord(new ConcreteRecord("LOCAL/1"))
            graph.removeRecord("LOCAL/1")
            expect(graph.getRecords()).toEqual([])
        })

        it("removes a record by PID and clears both lookups", () => {
            const graph: FDOGraph = new MapGraph()
            graph.addRecord(new ConcreteRecord("LOCAL/1", "rec/a"))
            graph.removeRecord("rec/a")
            expect(graph.getRecords()).toEqual([])
            expect(graph.getRecord("LOCAL/1")).toBeUndefined()
            expect(graph.getRecord("rec/a")).toBeUndefined()
        })

        it("only removes the matching record when multiple exist", () => {
            const graph: FDOGraph = new MapGraph()
            const keep: FDORecord = new ConcreteRecord("LOCAL/2", "rec/b")
            graph.addRecord(new ConcreteRecord("LOCAL/1", "rec/a"))
            graph.addRecord(keep)
            graph.removeRecord("LOCAL/1")
            expect(graph.getRecords()).toEqual([keep])
        })

        it("does nothing for an unknown id", () => {
            const graph: FDOGraph = new MapGraph()
            const r: FDORecord = new ConcreteRecord("LOCAL/1")
            graph.addRecord(r)
            expect(() => graph.removeRecord("rec/missing")).not.toThrow()
            expect(graph.getRecords()).toEqual([r])
        })
    })

    describe("findRecord", () => {
        it("returns the first record matching the predicate", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteRecord("LOCAL/2", "rec/b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.findRecord((r) => r.PID === "rec/b")).toBe(b)
        })

        it("returns undefined when no record matches", () => {
            const graph: FDOGraph = new MapGraph()
            graph.addRecord(new ConcreteRecord("LOCAL/1"))
            expect(graph.findRecord(() => false)).toBeUndefined()
        })
    })

    describe("build", () => {
        it("adds a back-reference via the toAttribute on the target record", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteRecord("LOCAL/2", "rec/b")
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReference("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toBe("rec/a")
        })

        it("uses the source record's localID as back-reference when it has no PID", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1")
            const b: FDORecord = new ConcreteRecord("LOCAL/2", "rec/b")
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReference("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toBe("LOCAL/1")
        })

        it("resolves the target by localID", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteRecord("LOCAL/2")
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReference("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toBe("rec/a")
        })

        it("leaves the forward reference in place on the source record", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteRecord("LOCAL/2", "rec/b")
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReference("has/data", "belongs/to", b)
            graph.build()

            expect(a.get("has/data")).toBe("rec/b")
            expect(a.getReferences()).toHaveLength(1)
            expect(b.getReferences()).toHaveLength(0)
        })

        it("concatenates back-references from multiple sources", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            const c: FDORecord = new ConcreteRecord("LOCAL/3", "rec/c")
            const b: FDORecord = new ConcreteRecord("LOCAL/2", "rec/b")
            graph.addRecord(a)
            graph.addRecord(c)
            graph.addRecord(b)

            a.addReference("has/data", "belongs/to", b)
            c.addReference("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toEqual(["rec/a", "rec/c"])
        })

        it("skips references whose target is not part of the graph", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            graph.addRecord(a)

            a.addReference("has/data", "belongs/to", "LOCAL/missing")

            expect(() => graph.build()).not.toThrow()
            expect(a.get("has/data")).toBe("LOCAL/missing")
        })

        it("throws when built twice or more", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            graph.addRecord(a)

            a.addReference("has/data", "belongs/to", "LOCAL/missing")

            expect(() => graph.build()).not.toThrow()
            expect(() => graph.build()).toThrow()
            expect(() => graph.build()).toThrow()
        })
    })

    describe("toString", () => {
        it("prints all record toStrings separated by newlines", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteRecord("LOCAL/2")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.toString()).toBe(`${a.toString()}\n${b.toString()}`)
        })

        it("is empty for an empty graph", () => {
            const graph: FDOGraph = new MapGraph()
            expect(graph.toString()).toBe("")
        })
    })

    describe("toJSON", () => {
        it("returns an array of the record JSON objects", () => {
            const graph: FDOGraph = new MapGraph()
            const a: FDORecord = new ConcreteRecord("LOCAL/1")
            const b: FDORecord = new ConcreteRecord("LOCAL/2")
            a.set("a/pid", "value-a")
            b.set("b/pid", "value-b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.toJSON()).toEqual({
                "LOCAL/1 - unpublished": { "a/pid": "value-a" },
                "LOCAL/2 - unpublished": { "b/pid": "value-b" },
            })
        })

        it("returns an empty record for an empty graph", () => {
            const graph: FDOGraph = new MapGraph()
            expect(graph.toJSON()).toEqual({})
        })
    })
})
