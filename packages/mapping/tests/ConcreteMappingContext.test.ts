import { describe, expect, it } from "vitest"
import {
    ConcreteLocalFDORecord,
    PublishedFDOGraph,
    type PublishedLocalFDORecord,
} from "@fdo-sdk/primitives"
import { ContinuousMappingContext } from "../src/index.js"
import type { ContinuousResolveAdapter } from "../src/index.js"

const mappingPID = "TEST/mapping"

function remoteGraphWith(
    ...records: ConcreteLocalFDORecord[]
): PublishedFDOGraph<PublishedLocalFDORecord> {
    const graph = new PublishedFDOGraph<PublishedLocalFDORecord>()
    for (const record of records) {
        graph.addRecord(record as PublishedLocalFDORecord)
    }
    return graph
}

describe("ContinuousMappingContext", () => {
    describe("build", () => {
        it("returns the built local graph", () => {
            const context = new ContinuousMappingContext(mappingPID)
            context.newRecord("LOCAL/1")

            const result = context.build()

            expect(result.create.getRecord("LOCAL/1")).toBeDefined()
            expect(result.create.getRecord("LOCAL/1")!.PID).toBeUndefined()
            expect(result.delete).toEqual([])
        })

        it("reports the PIDs of the remote records that are not part of the mapping anymore", async () => {
            const remote = remoteGraphWith(
                new ConcreteLocalFDORecord("LOCAL/1", "TEST/1"),
                new ConcreteLocalFDORecord("LOCAL/2", "TEST/2"),
            )
            const context = new ContinuousMappingContext(mappingPID)
            const resolver: ContinuousResolveAdapter = {
                resolveMappingRecords: async () => remote,
                resolveRecord: async () => undefined,
            }
            await context.resolveRemoteGraph(resolver)
            context.newRecord("LOCAL/1")

            const result = context.build()

            expect(result.delete).toEqual(["TEST/2"])
            // The record exists in the remote graph already, so it is updated
            // rather than created. The update carries the PID of the remote
            // record, so that publishing overwrites the existing record.
            expect(result.update.getRecord("LOCAL/1")).toBeDefined()
            expect(result.update.getRecord("LOCAL/1")!.PID).toBe("TEST/1")
            expect(result.create.getRecord("LOCAL/1")).toBeUndefined()
            expect(result.update.getRecord("LOCAL/2")).toBeUndefined()
        })

        it("realizes the bidirectional references of the local graph", () => {
            const context = new ContinuousMappingContext(mappingPID)
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
