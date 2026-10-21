import type { MappingContext } from "../interfaces/index.js"
import type { MappingResult } from "../types.js"
import {
    MappedGraph,
    type LocalID,
    type FDORecord,
    ConcreteMappedFDORecord,
} from "@fdo-sdk/primitives"
import type { ReadOnlyFDOGraph } from "@fdo-sdk/primitives"
import type { PublishedMappedFDORecord } from "@fdo-sdk/primitives"
import type { PID } from "@fdo-sdk/primitives"
import type { FDOGraph, MappedFDORecord } from "@fdo-sdk/primitives"

export class ConcreteMappingContext implements MappingContext {
    readonly #localGraph = new MappedGraph()

    constructor(
        readonly mappingPID: PID,
        readonly remoteGraph: ReadOnlyFDOGraph<PublishedMappedFDORecord> = new MappedGraph(),
    ) {}

    get localGraph(): Omit<FDOGraph<MappedFDORecord>, "build"> {
        return this.#localGraph
    }

    newRecord(localID: LocalID): FDORecord {
        const record = new ConcreteMappedFDORecord(localID)
        this.#localGraph.addRecord(record)
        return record
    }

    build(): MappingResult {
        this.#localGraph.build()
        const deleted = new Set<PID>()

        for (const existingRecord of this.remoteGraph.getRecords()) {
            if (!this.#localGraph.getRecord(existingRecord.localID)) {
                deleted.add(existingRecord.PID)
            }
        }

        return {
            mappingPID: this.mappingPID,
            graph: this.localGraph,
            delete: Array.from(deleted),
        }
    }
}
