import { describe, expect, it } from "vitest"
import {
    ConcreteMappedFDORecord,
    MappedGraph,
    type PublishedMappedFDORecord,
} from "@fdo-sdk/primitives"
import { ConcreteMappingContext } from "../src/index.js"

const mappingPID = "TEST/mapping"

function remoteGraphWith(
    ...records: ConcreteMappedFDORecord[]
): MappedGraph<PublishedMappedFDORecord> {
    const graph = new MappedGraph<PublishedMappedFDORecord>()
    for (const record of records) {
        graph.addRecord(record as PublishedMappedFDORecord)
    }
    return graph
}

describe("ConcreteMappingContext", () => {
    describe("build", () => {
        it("returns the built local graph", () => {
            const context = new ConcreteMappingContext(mappingPID)
            context.newRecord("LOCAL/1")

            const result = context.build()

            expect(result.graph.getRecord("LOCAL/1")).toBeDefined()
            expect(result.delete).toEqual([])
        })

        it("reports the PIDs of the remote records that are not part of the mapping anymore", () => {
            const remote = remoteGraphWith(
                new ConcreteMappedFDORecord("LOCAL/1", "TEST/1"),
                new ConcreteMappedFDORecord("LOCAL/2", "TEST/2"),
            )
            const context = new ConcreteMappingContext(mappingPID, remote)
            context.newRecord("LOCAL/1")

            const result = context.build()

            expect(result.delete).toEqual(["TEST/2"])
            expect(result.graph.getRecord("LOCAL/1")).toBeDefined()
            expect(result.graph.getRecord("LOCAL/2")).toBeUndefined()
        })

        it("realizes the bidirectional references of the local graph", () => {
            const context = new ConcreteMappingContext(mappingPID)
            const source = context.newRecord("LOCAL/source")
            source.addReferenceBidi("attr/from", "attr/to", "LOCAL/target")
            context.newRecord("LOCAL/target")

            context.build()

            expect(
                context.localGraph.getRecord("LOCAL/target")?.get("attr/to"),
            ).toBe("LOCAL/source")
        })
    })
})
