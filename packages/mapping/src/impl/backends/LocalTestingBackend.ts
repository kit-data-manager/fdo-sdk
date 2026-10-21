import type { PublishAdapter, ResolveAdapter } from "../../interfaces/index.js"
import {
    ConcreteFDORecord,
    MappedGraph,
    type FDOGraph,
    type LocalID,
    type MappedFDORecord,
    type PID,
    type PublishedFDORecord,
    type PublishedMappedFDORecord,
    type RecordValue,
    type ReferenceDeclaration,
} from "@fdo-sdk/primitives"

type StoredRecord = {
    pid: PID
    localID: LocalID | undefined
    attributes: Map<PID, RecordValue>
    references: ReferenceDeclaration[]
    profiles: PID[]
}

const pidPrefix = "TEST"

const store: {
    pidCounter: number
    records: Map<PID, StoredRecord>
    mappings: Map<PID, Set<PID>>
} = {
    pidCounter: 0,
    records: new Map(),
    mappings: new Map(),
}

class RestoredFDORecord extends ConcreteFDORecord {
    readonly localID: LocalID | undefined

    constructor(stored: StoredRecord) {
        super(stored.pid)
        this.localID = stored.localID
        this.attributes = new Map(stored.attributes)
        this.references = [...stored.references]
        this.conformsToProfiles = [...stored.profiles]
    }
}

/**
 * An in-memory backend for local testing, acting as a stand-in for a PID
 * service. Implements both {@link PublishAdapter} and {@link ResolveAdapter}.
 *
 * Records are published through {@link publishGraph}, which assigns a fresh
 * PID to every record that does not have one yet. Published records can then
 * be resolved again through {@link resolveRecord} and, grouped by mapping,
 * through {@link resolveMappingRecords}.
 *
 * All backend instances share one store, so records published for one mapping
 * are resolvable through the backend instance of another mapping. Use
 * {@link resetStore} to clear the store, e.g. between tests.
 */
export class LocalTestingBackend implements PublishAdapter, ResolveAdapter {
    private readonly mappingPID: PID

    constructor(mappingPID: PID) {
        this.mappingPID = mappingPID
    }

    async publishGraph(graph: FDOGraph): Promise<void> {
        const mappingRecords = this.getOrCreateMappingRecords()

        for (const record of graph.getRecords()) {
            let pid = record.PID
            if (pid === undefined) {
                pid = `${pidPrefix}/${++store.pidCounter}`
                ;(record as { PID: PID }).PID = pid
            }

            const localID =
                "localID" in record
                    ? (record as MappedFDORecord).localID
                    : undefined

            store.records.set(pid, {
                pid,
                localID,
                attributes: record.getAll(),
                references: record.getReferences(),
                profiles: [...record.getProfiles()],
            })
            mappingRecords.add(pid)
        }
    }

    async resolveMappingRecords(
        mappingPID: PID,
    ): Promise<FDOGraph<PublishedMappedFDORecord>> {
        const recordPIDs = store.mappings.get(mappingPID)
        if (!recordPIDs) {
            throw new Error(`Mapping record not found: ${mappingPID}`)
        }

        const graph = new MappedGraph<PublishedMappedFDORecord>()
        for (const pid of recordPIDs) {
            const stored = store.records.get(pid)!
            graph.addRecord(
                new RestoredFDORecord(stored) as PublishedMappedFDORecord,
            )
        }
        return graph
    }

    async resolveRecord(
        recordPID: PID,
    ): Promise<PublishedFDORecord | undefined> {
        const stored = store.records.get(recordPID)
        if (!stored) return undefined
        return new RestoredFDORecord(stored) as PublishedFDORecord
    }

    static resetStore(): void {
        store.pidCounter = 0
        store.records.clear()
        store.mappings.clear()
    }

    private getOrCreateMappingRecords(): Set<PID> {
        let records = store.mappings.get(this.mappingPID)
        if (!records) {
            records = new Set()
            store.mappings.set(this.mappingPID, records)
        }
        return records
    }
}
