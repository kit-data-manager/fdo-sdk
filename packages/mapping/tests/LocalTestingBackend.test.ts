import { beforeEach, describe, expect, it } from "vitest"
import {
    ConcreteFDORecord,
    ConcreteMappedFDORecord,
    ConcreteProfile,
    MappedGraph,
    type Attribute,
    type ProfileDefinition,
} from "@fdo-sdk/primitives"
import { ConcreteMappingContext, LocalTestingBackend } from "../src/index.js"

type TestProfileAttributes = {
    datasetName: string
    authors: string | string[]
}

const def: ProfileDefinition<TestProfileAttributes> = {
    pid: "profile/test",
    readableName: "Test Profile",
    mapping: {
        datasetName: "attr/datasetName",
        authors: "attr/authors",
    },
}

const fromAttr: Attribute<string> = {
    pid: "attr/from",
    readableName: "from",
}

const toAttr: Attribute<string> = {
    pid: "attr/to",
    readableName: "to",
}

const mappingPID = "TEST/mapping"

function newGraphWithRecords(
    ...records: ConcreteMappedFDORecord[]
): MappedGraph {
    const graph = new MappedGraph()
    for (const record of records) graph.addRecord(record)
    return graph
}

describe("LocalTestingBackend", () => {
    beforeEach(() => {
        LocalTestingBackend.resetStore()
    })

    describe("publishGraph", () => {
        it("assigns fresh unique PIDs to records without a PID", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const recordA = new ConcreteMappedFDORecord("LOCAL/1")
            const recordB = new ConcreteMappedFDORecord("LOCAL/2")

            await backend.publishGraph(newGraphWithRecords(recordA, recordB))

            expect(recordA.PID).toMatch(/^TEST\//)
            expect(recordB.PID).toMatch(/^TEST\//)
            expect(recordA.PID).not.toBe(recordB.PID)
        })

        it("keeps the PID of records that already have one", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const record = new ConcreteMappedFDORecord(
                "LOCAL/1",
                "existing/pid",
            )

            await backend.publishGraph(newGraphWithRecords(record))

            expect(record.PID).toBe("existing/pid")
            expect(await backend.resolveRecord("existing/pid")).toBeDefined()
        })

        it("publishes plain records without a localID", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const record = new ConcreteFDORecord()
            record.set("attr/a", "value")
            const graph = new MappedGraph()
            graph.addRecord(record as unknown as ConcreteMappedFDORecord)

            await backend.publishGraph(graph)

            const resolved = await backend.resolveRecord(record.PID!)
            expect(resolved?.get("attr/a")).toBe("value")
            expect(resolved?.PID).toBe(record.PID)
        })

        it("updates the stored snapshot when a record is published again", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const record = new ConcreteMappedFDORecord("LOCAL/1")
            record.set("attr/a", "v1")
            await backend.publishGraph(newGraphWithRecords(record))
            const firstPID = record.PID!

            record.set("attr/a", "v2")
            await backend.publishGraph(newGraphWithRecords(record))

            expect(record.PID).toBe(firstPID)
            const resolved = await backend.resolveRecord(firstPID)
            expect(resolved?.get("attr/a")).toBe("v2")
        })
    })

    describe("resolveRecord", () => {
        it("returns a record with the same PID, attributes, references and profiles", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const record = new ConcreteMappedFDORecord("LOCAL/1")
            record.addProfile(new ConcreteProfile(def), {
                datasetName: "My Dataset",
                authors: ["a1", "a2"],
            })
            record.set("attr/plain", "value")
            record.addReference(fromAttr, "LOCAL/target")
            record.addReferenceBidi(fromAttr, toAttr, "LOCAL/target2")

            await backend.publishGraph(newGraphWithRecords(record))
            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.PID).toBe(record.PID)
            expect(resolved?.get("attr/datasetName")).toBe("My Dataset")
            expect(resolved?.get("attr/authors")).toEqual(["a1", "a2"])
            expect(resolved?.get("attr/plain")).toBe("value")
            expect(resolved?.getReferences()).toEqual([
                {
                    direction: "uni",
                    fromAttribute: "attr/from",
                    toRecord: "LOCAL/target",
                },
                {
                    direction: "bidi",
                    fromAttribute: "attr/from",
                    inverseAttribute: "attr/to",
                    toRecord: "LOCAL/target2",
                },
            ])
            expect(resolved?.getProfiles()).toEqual(["profile/test"])
        })

        it("returns undefined for an unknown PID", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            expect(await backend.resolveRecord("TEST/unknown")).toBeUndefined()
        })

        it("returns a snapshot that is unaffected by later changes to the published record", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const record = new ConcreteMappedFDORecord("LOCAL/1")
            record.set("attr/a", "before")
            await backend.publishGraph(newGraphWithRecords(record))

            record.set("attr/a", "after")
            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/a")).toBe("before")
        })

        it("resolves records from any mapping published through any backend", async () => {
            const backendA = new LocalTestingBackend("TEST/mapping-a")
            const backendB = new LocalTestingBackend("TEST/mapping-b")
            const recordA = new ConcreteMappedFDORecord("LOCAL/a")
            await backendA.publishGraph(newGraphWithRecords(recordA))

            expect(await backendB.resolveRecord(recordA.PID!)).toBeDefined()
        })
    })

    describe("resolveMappingRecords", () => {
        it("returns a graph of all records published for the mapping", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const context = new ConcreteMappingContext()
            context.newRecord("LOCAL/1")
            context.newRecord("LOCAL/2")
            await backend.publishGraph(context.localGraph)

            const graph = await backend.resolveMappingRecords(mappingPID)

            const records = graph.getRecords()
            expect(records).toHaveLength(2)
            for (const record of records) {
                expect(record.PID).toMatch(/^TEST\//)
                expect(["LOCAL/1", "LOCAL/2"]).toContain(record.localID)
                expect(graph.getRecord(record.localID)).toBe(record)
                expect(graph.getRecord(record.PID!)).toBe(record)
            }
        })

        it("resolves the records of each mapping independently", async () => {
            const backendA = new LocalTestingBackend("TEST/mapping-a")
            const backendB = new LocalTestingBackend("TEST/mapping-b")
            const recordA = new ConcreteMappedFDORecord("LOCAL/a")
            const recordB = new ConcreteMappedFDORecord("LOCAL/b")
            await backendA.publishGraph(newGraphWithRecords(recordA))
            await backendB.publishGraph(newGraphWithRecords(recordB))

            const graphA =
                await backendB.resolveMappingRecords("TEST/mapping-a")
            const graphB =
                await backendA.resolveMappingRecords("TEST/mapping-b")

            expect(graphA.getRecord("LOCAL/a")).toBeDefined()
            expect(graphA.getRecord("LOCAL/b")).toBeUndefined()
            expect(graphB.getRecord("LOCAL/b")).toBeDefined()
            expect(graphB.getRecord("LOCAL/a")).toBeUndefined()
        })

        it("throws when the mapping has not been published", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            await expect(
                backend.resolveMappingRecords("TEST/unknown"),
            ).rejects.toThrow("Mapping record not found")
        })
    })

    describe("resetStore", () => {
        it("clears all published records and PID assignments", async () => {
            const backend = new LocalTestingBackend(mappingPID)
            const record = new ConcreteMappedFDORecord("LOCAL/1")
            await backend.publishGraph(newGraphWithRecords(record))

            LocalTestingBackend.resetStore()

            expect(await backend.resolveRecord(record.PID!)).toBeUndefined()
            await expect(
                backend.resolveMappingRecords(mappingPID),
            ).rejects.toThrow("Mapping record not found")
        })
    })
})
