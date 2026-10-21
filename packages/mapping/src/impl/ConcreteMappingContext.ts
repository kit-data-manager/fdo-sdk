import type { MappingContext } from "../interfaces/index.js"
import type { MappingResult } from "../types.js"
import {
    LocalFDOGraph,
    type LocalID,
    type FDORecord,
    ConcreteLocalFDORecord,
} from "@fdo-sdk/primitives"
import type { ReadOnlyFDOGraph } from "@fdo-sdk/primitives"
import type { PublishedLocalFDORecord } from "@fdo-sdk/primitives"
import type { PID } from "@fdo-sdk/primitives"
import type { FDOGraph, LocalFDORecord } from "@fdo-sdk/primitives"
import { PublishedFDOGraph } from "@fdo-sdk/primitives"

export class ConcreteMappingContext implements MappingContext {
    readonly #localGraph = new LocalFDOGraph()

    constructor(
        readonly mappingPID: PID,
        readonly remoteGraph: ReadOnlyFDOGraph<PublishedLocalFDORecord> = new PublishedFDOGraph(),
    ) {}

    get localGraph(): Omit<FDOGraph<LocalFDORecord>, "build"> {
        return this.#localGraph
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

        for (const existingRecord of this.remoteGraph.getRecords()) {
            if (!this.#localGraph.getRecord(existingRecord.localID)) {
                deleted.add(existingRecord.PID)
            }
        }

        for (const newRecord of this.#localGraph.getRecords()) {
            if (!this.remoteGraph.getRecord(newRecord.localID)) {
                created.addRecord(newRecord)
            } else {
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
