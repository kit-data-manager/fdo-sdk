import { describe, it, expect } from "vitest"
import type { LocalID, PublishedFDORecord } from "../src/index.js"
import {
    ConcreteFDORecord,
    ConcreteMappedFDORecord,
    PublishedGraph,
} from "../src/index.js"

function publishedRecord(pid: string): PublishedFDORecord {
    const record = new ConcreteFDORecord(pid)
    return record as PublishedFDORecord
}

function publishedMappedRecord(
    localID: LocalID,
    pid: string,
): PublishedFDORecord {
    const record = new ConcreteMappedFDORecord(localID, pid)
    return record as PublishedFDORecord
}

describe("PublishedGraph", () => {
    describe("construction", () => {
        it("starts with no records", () => {
            const graph = new PublishedGraph()
            expect(graph.getRecords()).toEqual([])
        })
    })

    describe("addRecord / getRecords", () => {
        it("returns all added records", () => {
            const graph = new PublishedGraph()
            const a = publishedRecord("rec/a")
            const b = publishedRecord("rec/b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.getRecords()).toEqual([a, b])
        })

        it("returns a new array each time (mutating it does not affect the graph)", () => {
            const graph = new PublishedGraph()
            graph.addRecord(publishedRecord("rec/a"))
            const records = graph.getRecords()
            records.pop()
            expect(graph.getRecords()).toHaveLength(1)
        })

        it("keeps records without a local ID", () => {
            const graph = new PublishedGraph()
            graph.addRecord(publishedRecord("rec/a"))
            graph.addRecord(publishedRecord("rec/b"))
            expect(graph.getRecords()).toHaveLength(2)
        })

        it("replaces an existing record with the same PID", () => {
            const graph = new PublishedGraph()
            const replacement = publishedRecord("rec/a")
            graph.addRecord(publishedRecord("rec/a"))
            graph.addRecord(replacement)
            expect(graph.getRecords()).toEqual([replacement])
            expect(graph.getRecord("rec/a")).toBe(replacement)
        })
    })

    describe("getRecord", () => {
        it("finds a record by PID", () => {
            const graph = new PublishedGraph()
            const record = publishedRecord("rec/a")
            graph.addRecord(record)
            expect(graph.getRecord("rec/a")).toBe(record)
        })

        it("finds a record by local ID", () => {
            const graph = new PublishedGraph()
            const record = publishedMappedRecord("LOCAL/1", "rec/a")
            graph.addRecord(record)
            expect(graph.getRecord("LOCAL/1")).toBe(record)
        })

        it("returns undefined for an unknown id", () => {
            const graph = new PublishedGraph()
            graph.addRecord(publishedRecord("rec/a"))
            expect(graph.getRecord("rec/missing")).toBeUndefined()
            expect(graph.getRecord("LOCAL/missing")).toBeUndefined()
        })
    })

    describe("findRecord", () => {
        it("returns the first record matching the predicate", () => {
            const graph = new PublishedGraph()
            const a = publishedRecord("rec/a")
            const b = publishedRecord("rec/b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.findRecord((r) => r.PID === "rec/b")).toBe(b)
        })

        it("returns undefined when no record matches", () => {
            const graph = new PublishedGraph()
            graph.addRecord(publishedRecord("rec/a"))
            expect(graph.findRecord(() => false)).toBeUndefined()
        })
    })

    describe("toString", () => {
        it("prints all record toStrings separated by newlines", () => {
            const graph = new PublishedGraph()
            const a = publishedRecord("rec/a")
            const b = publishedRecord("rec/b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.toString()).toBe(`${a.toString()}\n${b.toString()}`)
        })

        it("is empty for an empty graph", () => {
            const graph = new PublishedGraph()
            expect(graph.toString()).toBe("")
        })
    })

    describe("toJSON", () => {
        it("returns the record JSON objects, keyed by PID", () => {
            const graph = new PublishedGraph()
            const a = publishedRecord("rec/a")
            const b = publishedRecord("rec/b")
            a.set("a/pid", "value-a")
            b.set("b/pid", "value-b")
            graph.addRecord(a)
            graph.addRecord(b)
            expect(graph.toJSON()).toEqual({
                "rec/a": { "a/pid": "value-a" },
                "rec/b": { "b/pid": "value-b" },
            })
        })

        it("uses the local ID in the key when the record has one", () => {
            const graph = new PublishedGraph()
            const record = publishedMappedRecord("LOCAL/1", "rec/a")
            graph.addRecord(record)
            expect(graph.toJSON()).toEqual({
                "LOCAL/1 - rec/a": {},
            })
        })

        it("returns an empty record for an empty graph", () => {
            const graph = new PublishedGraph()
            expect(graph.toJSON()).toEqual({})
        })
    })
})
