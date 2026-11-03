import { describe, it, expect } from "vitest"
import type { FDOGraph, LocalFDORecord } from "../src/index.js"
import type { FDORecord } from "../src/index.js"
import { LocalFDOGraph, ConcreteLocalFDORecord } from "../src/index.js"

describe("LocalFDOGraph", () => {
    describe("construction", () => {
        it("starts with no records", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            expect(graph.getRecords()).toEqual([])
        })
    })

    describe("addRecord / getRecords", () => {
        it("returns all added records", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteLocalFDORecord("LOCAL/2")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.getRecords()).toEqual([a, b])
        })

        it("returns a new array each time (mutating it does not affect the graph)", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1"))
            const records = graph.getRecords()
            records.pop()
            expect(graph.getRecords()).toHaveLength(1)
        })

        it("throws when a record with the same id already exists", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const original = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            graph.addRecord(original)
            const replacement: FDORecord = new ConcreteLocalFDORecord("LOCAL/1")
            expect(() => graph.addRecord(replacement)).toThrow()
            expect(graph.getRecords()).toEqual([original])
            expect(graph.getRecord("LOCAL/1")).toBe(original)
            expect(graph.getRecord("rec/a")).toBeDefined()
        })

        it("replaces an existing record with the same localID when overwrite is true", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/a"))
            const replacement: FDORecord = new ConcreteLocalFDORecord("LOCAL/1")
            graph.addRecord(replacement, { overwrite: true })
            expect(graph.getRecords()).toEqual([replacement])
            expect(graph.getRecord("LOCAL/1")).toBe(replacement)
            expect(graph.getRecord("rec/a")).toBeUndefined()
        })

        it("does not re-index the PID when a record with the same localID is replaced and overwrite is false", () => {
            const graph: LocalFDOGraph = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/a"))
            expect(() =>
                graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/b")),
            ).toThrow()
            expect(graph.getRecord("rec/a")?.localID).toBe("LOCAL/1")
            expect(graph.getRecord("rec/b")).toBeUndefined()
        })

        it("re-indexes the PID when a record with the same localID is replaced and overwrite is true", () => {
            const graph: LocalFDOGraph = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/a"))
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/b"), {
                overwrite: true,
            })
            expect(graph.getRecord("rec/a")).toBeUndefined()
            expect(graph.getRecord("rec/b")?.localID).toBe("LOCAL/1")
        })
    })

    describe("newRecord", () => {
        it("creates a new record with the given local ID and adds it to the graph", () => {
            const graph = new LocalFDOGraph()
            const record = graph.newRecord("LOCAL/1")
            expect(record).toBeDefined()
            expect(graph.getRecord("LOCAL/1")).toBeDefined()
        })

        it("creates a new record with the given local ID and replaces records with the same local id in the graph", () => {
            const graph = new LocalFDOGraph()
            const a = graph.newRecord("LOCAL/1")
            expect(a).toBeDefined()
            expect(graph.getRecord("LOCAL/1")).toBe(a)

            const b = graph.newRecord("LOCAL/1", { overwrite: true })
            expect(b).toBeDefined()
            expect(graph.getRecord("LOCAL/1")).toBe(b)
        })
    })

    describe("getRecord", () => {
        it("finds a record by localID", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const r: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            graph.addRecord(r)
            expect(graph.getRecord("LOCAL/1")).toBe(r)
        })

        it("finds a record by PID", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const r: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            graph.addRecord(r)
            expect(graph.getRecord("rec/a")).toBe(r)
        })

        it("finds a PID-less record by localID", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const r: FDORecord = new ConcreteLocalFDORecord("LOCAL/1")
            graph.addRecord(r)
            expect(graph.getRecord("LOCAL/1")).toBe(r)
        })

        it("returns undefined for an unknown id", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/a"))
            expect(graph.getRecord("LOCAL/missing")).toBeUndefined()
            expect(graph.getRecord("rec/missing")).toBeUndefined()
        })
    })

    describe("removeRecord", () => {
        it("removes a PID-less record by localID", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1"))
            graph.removeRecord("LOCAL/1")
            expect(graph.getRecords()).toEqual([])
        })

        it("removes a record by PID and clears both lookups", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/a"))
            graph.removeRecord("rec/a")
            expect(graph.getRecords()).toEqual([])
            expect(graph.getRecord("LOCAL/1")).toBeUndefined()
            expect(graph.getRecord("rec/a")).toBeUndefined()
        })

        it("only removes the matching record when multiple exist", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const keep: FDORecord = new ConcreteLocalFDORecord(
                "LOCAL/2",
                "rec/b",
            )
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1", "rec/a"))
            graph.addRecord(keep)
            graph.removeRecord("LOCAL/1")
            expect(graph.getRecords()).toEqual([keep])
        })

        it("does nothing for an unknown id", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const r: FDORecord = new ConcreteLocalFDORecord("LOCAL/1")
            graph.addRecord(r)
            expect(() => graph.removeRecord("rec/missing")).not.toThrow()
            expect(graph.getRecords()).toEqual([r])
        })
    })

    describe("findRecord", () => {
        it("returns the first record matching the predicate", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteLocalFDORecord("LOCAL/2", "rec/b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.findRecord((r) => r.PID === "rec/b")).toBe(b)
        })

        it("returns undefined when no record matches", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            graph.addRecord(new ConcreteLocalFDORecord("LOCAL/1"))
            expect(graph.findRecord(() => false)).toBeUndefined()
        })
    })

    describe("build", () => {
        it("adds a back-reference via the toAttribute on the target record", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/1",
                "rec/a",
            )
            const b: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/2",
                "rec/b",
            )
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReferenceBidi("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toBe("rec/a")
        })

        it("uses the source record's localID as back-reference when it has no PID", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: LocalFDORecord = new ConcreteLocalFDORecord("LOCAL/1")
            const b: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/2",
                "rec/b",
            )
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReferenceBidi("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toBe("LOCAL/1")
        })

        it("resolves the target by localID", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/1",
                "rec/a",
            )
            const b: LocalFDORecord = new ConcreteLocalFDORecord("LOCAL/2")
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReferenceBidi("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toBe("rec/a")
        })

        it("leaves the forward reference in place on the source record", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/1",
                "rec/a",
            )
            const b: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/2",
                "rec/b",
            )
            graph.addRecord(a)
            graph.addRecord(b)

            a.addReferenceBidi("has/data", "belongs/to", b)
            graph.build()

            expect(a.get("has/data")).toBe("rec/b")
            expect(a.getReferences()).toHaveLength(1)
            expect(b.getReferences()).toHaveLength(0)
        })

        it("concatenates back-references from multiple sources", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            const c: FDORecord = new ConcreteLocalFDORecord("LOCAL/3", "rec/c")
            const b: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/2",
                "rec/b",
            )
            graph.addRecord(a)
            graph.addRecord(c)
            graph.addRecord(b)

            a.addReferenceBidi("has/data", "belongs/to", b)
            c.addReferenceBidi("has/data", "belongs/to", b)

            graph.build()

            expect(b.get("belongs/to")).toEqual(["rec/a", "rec/c"])
        })

        it("does not add back-references for unidirectional references", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            const c: FDORecord = new ConcreteLocalFDORecord("LOCAL/3", "rec/c")
            const b: LocalFDORecord = new ConcreteLocalFDORecord(
                "LOCAL/2",
                "rec/b",
            )
            graph.addRecord(a)
            graph.addRecord(c)
            graph.addRecord(b)

            a.addReference("has/data", b)
            c.addReference("has/data", b)

            graph.build()

            expect(b.has("belongs/to")).toBe(false)
            expect(b.getAll().size).toBe(0)
        })

        it("throws on bidirectional references to records that are not in the local graph", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            graph.addRecord(a)

            a.addReferenceBidi("has/data", "is/dataFor", "LOCAL/missing")

            expect(() => graph.build()).toThrow()
            expect(a.get("has/data")).toBe("LOCAL/missing")
        })

        it("throws when built twice or more", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            graph.addRecord(a)

            a.addReference("has/data", "LOCAL/missing")

            expect(() => graph.build()).not.toThrow()
            expect(() => graph.build()).toThrow()
            expect(() => graph.build()).toThrow()
        })
    })

    describe("toString", () => {
        it("prints all record toStrings separated by newlines", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1", "rec/a")
            const b: FDORecord = new ConcreteLocalFDORecord("LOCAL/2")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.toString()).toBe(`${a.toString()}\n${b.toString()}`)
        })

        it("is empty for an empty graph", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            expect(graph.toString()).toBe("")
        })
    })

    describe("toJSON", () => {
        it("returns an array of the record JSON objects", () => {
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            const a: FDORecord = new ConcreteLocalFDORecord("LOCAL/1")
            const b: FDORecord = new ConcreteLocalFDORecord("LOCAL/2")
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
            const graph: FDOGraph<LocalFDORecord> = new LocalFDOGraph()
            expect(graph.toJSON()).toEqual({})
        })
    })
})
