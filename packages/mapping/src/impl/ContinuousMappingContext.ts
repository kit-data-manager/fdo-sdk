import type {
    ContinuousResolveAdapter,
    MappingContext,
} from "../interfaces/index.js"
import type { MappingResult } from "../types.js"
import type {
    FDOGraph,
    LocalFDORecord,
    PID,
    PublishedLocalFDORecord,
    ReadOnlyFDOGraph,
} from "@fdo-sdk/primitives"
import {
    ConcreteLocalFDORecord,
    type FDORecord,
    LocalFDOGraph,
    type LocalID,
} from "@fdo-sdk/primitives"
import { PublishedFDOGraph } from "@fdo-sdk/primitives"

export class ContinuousMappingContext implements MappingContext {
    readonly #localGraph = new LocalFDOGraph()
    #remoteGraph: ReadOnlyFDOGraph<PublishedLocalFDORecord> =
        new PublishedFDOGraph()
    #hasResolvedRemoteGraph = false

    constructor(readonly mappingPID: PID) {}

    get hasResolvedRemoteGraph(): boolean {
        return this.#hasResolvedRemoteGraph
    }

    get localGraph(): Omit<FDOGraph<LocalFDORecord>, "build"> {
        return this.#localGraph
    }

    get remoteGraph(): ReadOnlyFDOGraph<PublishedLocalFDORecord> {
        return structuredClone(this.#remoteGraph)
    }

    async resolveRemoteGraph(resolver: ContinuousResolveAdapter) {
        this.#remoteGraph = await resolver.resolveMappingRecords(
            this.mappingPID,
        )
        this.#hasResolvedRemoteGraph = true
    }

    newRecord(localID: LocalID): FDORecord {
        const record = new ConcreteLocalFDORecord(localID)
        this.#localGraph.addRecord(record)
        return record
    }

    build(): MappingResult {
        this.#localGraph.build()
        const deleted = new Set<PID>()
        const created = new LocalFDOGraph()
        const updated = new LocalFDOGraph()

        for (const existingRecord of this.#remoteGraph.getRecords()) {
            if (!this.#localGraph.getRecord(existingRecord.localID)) {
                deleted.add(existingRecord.PID)
            }
        }

        for (const newRecord of this.#localGraph.getRecords()) {
            const existingRecord = this.#remoteGraph.getRecord(
                newRecord.localID,
            )
            if (!existingRecord) {
                created.addRecord(newRecord)
            } else {
                // The record exists in the remote graph: it is published again
                // with the PID it was published with, so that publishing
                // overwrites the existing record instead of creating a new
                // one.
                ;(newRecord as { PID: PID }).PID = existingRecord.PID
                updated.addRecord(newRecord)
            }
        }

        return {
            mappingPID: this.mappingPID,
            create: created,
            update: updated,
            delete: Array.from(deleted),
        }
    }
}
