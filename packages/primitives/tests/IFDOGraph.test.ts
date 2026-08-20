import { describe, it, expect } from "vitest"
import type { IFDOGraph } from "../src/index.js"
import type { IFDORecord } from "../src/index.js"
import { DefaultGraph, DefaultRecord } from "../src/index.js"

describe("IFDOGraph (via DefaultGraph)", () => {
    describe("construction", () => {
        it("starts with no records", () => {
            const graph: IFDOGraph = new DefaultGraph()
            expect(graph.getRecords()).toEqual([])
        })
    })

    describe("addRecord / getRecords", () => {
        it("returns all added records", () => {
            const graph: IFDOGraph = new DefaultGraph()
            const a: IFDORecord = new DefaultRecord("LOCAL/1", "rec/a")
            const b: IFDORecord = new DefaultRecord("LOCAL/2")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.getRecords()).toEqual([a, b])
        })

        it("returns a new array each time (mutating it does not affect the graph)", () => {
            const graph: IFDOGraph = new DefaultGraph()
            graph.addRecord(new DefaultRecord("LOCAL/1"))
            const records = graph.getRecords()
            records.pop()
            expect(graph.getRecords()).toHaveLength(1)
        })

        it("replaces an existing record with the same localID", () => {
            const graph: IFDOGraph = new DefaultGraph()
            graph.addRecord(new DefaultRecord("LOCAL/1", "rec/a"))
            const replacement: IFDORecord = new DefaultRecord("LOCAL/1")
            graph.addRecord(replacement)
            expect(graph.getRecords()).toEqual([replacement])
            expect(graph.getRecord("LOCAL/1")).toBe(replacement)
            expect(graph.getRecord("rec/a")).toBeUndefined()
        })

        it("re-indexes the PID when a record with the same localID is replaced", () => {
            const graph: IFDOGraph = new DefaultGraph()
            graph.addRecord(new DefaultRecord("LOCAL/1", "rec/a"))
            graph.addRecord(new DefaultRecord("LOCAL/1", "rec/b"))
            expect(graph.getRecord("rec/a")).toBeUndefined()
            expect(graph.getRecord("rec/b")?.localID).toBe("LOCAL/1")
        })
    })

    describe("getRecord", () => {
        it("finds a record by localID", () => {
            const graph: IFDOGraph = new DefaultGraph()
            const r: IFDORecord = new DefaultRecord("LOCAL/1", "rec/a")
            graph.addRecord(r)
            expect(graph.getRecord("LOCAL/1")).toBe(r)
        })

        it("finds a record by PID", () => {
            const graph: IFDOGraph = new DefaultGraph()
            const r: IFDORecord = new DefaultRecord("LOCAL/1", "rec/a")
            graph.addRecord(r)
            expect(graph.getRecord("rec/a")).toBe(r)
        })

        it("finds a PID-less record by localID", () => {
            const graph: IFDOGraph = new DefaultGraph()
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            graph.addRecord(r)
            expect(graph.getRecord("LOCAL/1")).toBe(r)
        })

        it("returns undefined for an unknown id", () => {
            const graph: IFDOGraph = new DefaultGraph()
            graph.addRecord(new DefaultRecord("LOCAL/1", "rec/a"))
            expect(graph.getRecord("LOCAL/missing")).toBeUndefined()
            expect(graph.getRecord("rec/missing")).toBeUndefined()
        })
    })

    describe("removeRecord", () => {
        it("removes a PID-less record by localID", () => {
            const graph: IFDOGraph = new DefaultGraph()
            graph.addRecord(new DefaultRecord("LOCAL/1"))
            graph.removeRecord("LOCAL/1")
            expect(graph.getRecords()).toEqual([])
        })

        it("removes a record by PID and clears both lookups", () => {
            const graph: IFDOGraph = new DefaultGraph()
            graph.addRecord(new DefaultRecord("LOCAL/1", "rec/a"))
            graph.removeRecord("rec/a")
            expect(graph.getRecords()).toEqual([])
            expect(graph.getRecord("LOCAL/1")).toBeUndefined()
            expect(graph.getRecord("rec/a")).toBeUndefined()
        })

        it("only removes the matching record when multiple exist", () => {
            const graph: IFDOGraph = new DefaultGraph()
            const keep: IFDORecord = new DefaultRecord("LOCAL/2", "rec/b")
            graph.addRecord(new DefaultRecord("LOCAL/1", "rec/a"))
            graph.addRecord(keep)
            graph.removeRecord("LOCAL/1")
            expect(graph.getRecords()).toEqual([keep])
        })

        it("does nothing for an unknown id", () => {
            const graph: IFDOGraph = new DefaultGraph()
            const r: IFDORecord = new DefaultRecord("LOCAL/1")
            graph.addRecord(r)
            expect(() => graph.removeRecord("rec/missing")).not.toThrow()
            expect(graph.getRecords()).toEqual([r])
        })
    })

    describe("findRecord", () => {
        it("returns the first record matching the predicate", () => {
            const graph: IFDOGraph = new DefaultGraph()
            const a: IFDORecord = new DefaultRecord("LOCAL/1", "rec/a")
            const b: IFDORecord = new DefaultRecord("LOCAL/2", "rec/b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.findRecord((r) => r.PID === "rec/b")).toBe(b)
        })

        it("returns undefined when no record matches", () => {
            const graph: IFDOGraph = new DefaultGraph()
            graph.addRecord(new DefaultRecord("LOCAL/1"))
            expect(graph.findRecord(() => false)).toBeUndefined()
        })
    })
})
