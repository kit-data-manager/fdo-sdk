import type { PublishAdapter, ResolveAdapter } from "../../interfaces/index.js"
import type { MappingResult, PublishResult } from "../../types.js"
import {
    ConcreteFDORecord,
    PublishedGraph,
    type FDORecord,
    type LocalID,
    type PID,
    type PublishedFDORecord,
    type PublishedMappedFDORecord,
    type ReadOnlyFDOGraph,
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

/**
 * The attribute of the high level FDO record of a mapping that references all
 * the records that are part of the mapping.
 */
const hasMappingRecordAttribute: PID = "attr/hasMappingRecord"

/**
 * The attribute of a record that points back to the high level FDO record of
 * the mapping it is part of.
 */
const partOfMappingAttribute: PID = "attr/partOfMapping"

/**
 * The attribute of a record that holds its own local ID. The local ID is the
 * placeholder a record is referenced by until it is published, and it is the
 * only local ID that is allowed to appear in a published record.
 */
const localIdAttribute: PID = "attr/localId"

const store: {
    pidCounter: number
    records: Map<PID, StoredRecord>
    mappings: Map<PID, Set<PID>>
    unmapped: Set<PID>
} = {
    pidCounter: 0,
    records: new Map(),
    mappings: new Map(),
    unmapped: new Set(),
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
 * service and as the FDO flavor of the local testing setup. Implements both
 * {@link PublishAdapter} and {@link ResolveAdapter}.
 *
 * The backend is not bound to a single mapping: the mapping is determined by
 * the mapping result that is published, so one backend instance can publish
 * and resolve any number of mappings.
 *
 * Records can be published in three ways:
 *
 * - {@link publishContinuous} publishes the result of a continuous mapping: the
 *   records of the mapping are published, the records that are not part of the
 *   mapping anymore are deleted, and the high level FDO record of the mapping
 *   is maintained.
 * - {@link publishGraph} publishes all the records of a graph, without a
 *   mapping.
 * - {@link publishRecord} publishes a single record, without a mapping.
 *
 * Every record that does not have a PID yet gets one assigned. A record that
 * was published before keeps its PID, so that PIDs stay stable over several
 * runs of the same mapping: the PID of a record is looked up by its local ID,
 * within the scope it was published in — the mapping for a continuous
 * mapping, the store of the unpublished records otherwise.
 *
 * The records are referenced by their local ID until they are published, just
 * like a client that passes a placeholder PID to a PID service. The backend
 * assigns the PIDs of all the records first and then fixes up the references:
 * a reference to a record of the published set is expressed in terms of the
 * PID the record was published with. Only the attributes that hold references
 * are fixed up, so a mapping is free to store a local ID in any other
 * attribute.
 *
 * Every published record keeps its own local ID in the `attr/localId`
 * attribute. It is the only local ID that appears in a published record: it
 * identifies the record for the mapping that published it.
 *
 * As the flavor of this setup, the backend adds the high level FDO record of
 * a mapping: it is a record with the PID of the mapping that references,
 * bidirectionally, all the records that are part of the mapping. Every
 * published record of the mapping therefore points back to the mapping it
 * belongs to.
 *
 * Published records can then be resolved again through {@link resolveRecord}
 * and, grouped by mapping, through {@link resolveMappingRecords}.
 *
 * All backend instances share one store, so records published for one mapping
 * are resolvable through the backend instance of another mapping. Use
 * {@link resetStore} to clear the store, e.g. between tests.
 */
export class LocalTestingBackend implements PublishAdapter, ResolveAdapter {
    /**
     * Publishes the result of a continuous mapping.
     *
     * The records of the mapping are published, the records listed in the
     * result are deleted, and the high level FDO record of the mapping is
     * created or updated.
     */
    async publishContinuous(
        mappingResult: MappingResult,
    ): Promise<PublishResult> {
        const mappingPID = mappingResult.mappingPID
        const mappingRecords = this.getOrCreateMappingRecords(mappingPID)

        // Records that are not part of the mapping anymore are deleted.
        const deleted: PID[] = []
        for (const pid of mappingResult.delete) {
            mappingRecords.delete(pid)
            store.unmapped.delete(pid)
            if (store.records.delete(pid)) deleted.push(pid)
        }

        // The records of the mapping are published.
        this.publishRecords(
            mappingResult.graph.getRecords(),
            mappingRecords,
            mappingPID,
        )

        // The high level FDO record of the mapping.
        this.storeMappingRecord(mappingPID, [...mappingRecords])

        return {
            mappingPID,
            graph: this.publishedGraph(mappingRecords),
            deleted,
        }
    }

    /**
     * Publishes all the records of a graph, without a mapping.
     */
    async publishGraph(
        graph: ReadOnlyFDOGraph<FDORecord>,
    ): Promise<ReadOnlyFDOGraph<PublishedFDORecord>> {
        const published = this.publishRecords(
            graph.getRecords(),
            store.unmapped,
            undefined,
        )

        const result = new PublishedGraph()
        for (const { pid } of published) {
            result.addRecord(this.restoredRecord(pid))
        }
        return result
    }

    /**
     * Publishes a single record, without a mapping.
     */
    async publishRecord(record: FDORecord): Promise<PublishedFDORecord> {
        const published = this.publishRecords(
            [record],
            store.unmapped,
            undefined,
        )
        return this.restoredRecord(published[0]!.pid)
    }

    async resolveMappingRecords(
        mappingPID: PID,
    ): Promise<ReadOnlyFDOGraph<PublishedMappedFDORecord>> {
        const recordPIDs = store.mappings.get(mappingPID)
        if (!recordPIDs) {
            throw new Error(`Mapping record not found: ${mappingPID}`)
        }

        return this.publishedGraph(recordPIDs)
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
        store.unmapped.clear()
    }

    /**
     * The high level FDO record of the mapping: a record with the PID of the
     * mapping that references all the records that are part of the mapping.
     */
    private storeMappingRecord(mappingPID: PID, recordPIDs: PID[]): void {
        const attributes = new Map<PID, RecordValue>()
        attributes.set(hasMappingRecordAttribute, recordPIDs)

        const references: ReferenceDeclaration[] = recordPIDs.map((pid) => ({
            direction: "bidi",
            fromAttribute: hasMappingRecordAttribute,
            inverseAttribute: partOfMappingAttribute,
            toRecord: pid,
        }))

        store.records.set(mappingPID, {
            pid: mappingPID,
            localID: undefined,
            attributes,
            references,
            profiles: [],
        })
    }

    /**
     * Assigns the PIDs of the given records, fixes up their references and
     * stores them.
     *
     * @param records the records to publish
     * @param scope the PIDs that are already published in the scope of the
     * publication: the records of a mapping, or the records that were
     * published without a mapping. It determines the PID a record that was
     * published before keeps.
     * @param mappingPID the PID of the mapping the records are part of, if the
     * records are published as part of a mapping
     */
    private publishRecords(
        records: FDORecord[],
        scope: Set<PID>,
        mappingPID: PID | undefined,
    ): { pid: PID; localID: LocalID | undefined; record: FDORecord }[] {
        // The PIDs of all records are determined first: the references between
        // the records are expressed in terms of these PIDs.
        const published = records.map((record) => {
            const localID = this.localIDOf(record)
            const pid =
                record.PID ??
                this.findPublishedPID(scope, localID) ??
                this.nextPID()
            ;(record as { PID: PID }).PID = pid
            return { pid, localID, record }
        })

        const pidsByLocalID = new Map<string, PID>()
        for (const { pid, localID } of published) {
            if (localID !== undefined) pidsByLocalID.set(localID, pid)
        }

        // The attributes that hold references: the attributes the references
        // are declared on, and the attributes that hold the back-references of
        // bidirectional references. Only the values in these attributes are
        // references — any other attribute may hold a local ID as a value.
        const referenceAttributes = new Set<PID>()
        for (const { record } of published) {
            for (const reference of record.getReferences()) {
                referenceAttributes.add(reference.fromAttribute)
                if (reference.direction === "bidi") {
                    referenceAttributes.add(reference.inverseAttribute)
                }
            }
        }

        for (const { pid, localID, record } of published) {
            const attributes = record.getAll()

            // The references are fixed up: the placeholder of a record that was
            // not published before is replaced with the PID it was published
            // with.
            for (const attribute of referenceAttributes) {
                const value = attributes.get(attribute)
                if (value === undefined) continue
                attributes.set(
                    attribute,
                    this.resolvePlaceholders(value, pidsByLocalID),
                )
            }

            if (mappingPID !== undefined) {
                // Every record of the mapping is part of the high level FDO
                // record of the mapping and points back to it.
                this.addValue(attributes, partOfMappingAttribute, mappingPID)
            } else {
                // The back-reference to a mapping belongs to the mapping, not
                // to the content of the record: it is kept when the record is
                // published again without a mapping.
                const previous = store.records
                    .get(pid)
                    ?.attributes.get(partOfMappingAttribute)
                if (previous !== undefined) {
                    attributes.set(partOfMappingAttribute, previous)
                }
            }

            // The record keeps its own local ID: it is the only local ID that
            // is allowed to appear in a published record.
            if (localID !== undefined) {
                attributes.set(localIdAttribute, localID)
            }

            store.records.set(pid, {
                pid,
                localID,
                attributes,
                references: record.getReferences().map((reference) => ({
                    ...reference,
                    toRecord:
                        pidsByLocalID.get(reference.toRecord) ??
                        reference.toRecord,
                })),
                profiles: [...record.getProfiles()],
            })

            scope.add(pid)
            if (mappingPID !== undefined) store.unmapped.delete(pid)
        }

        return published
    }

    private getOrCreateMappingRecords(mappingPID: PID): Set<PID> {
        let records = store.mappings.get(mappingPID)
        if (!records) {
            records = new Set()
            store.mappings.set(mappingPID, records)
        }
        return records
    }

    /**
     * The graph of the published records of the given scope.
     */
    private publishedGraph(
        scope: Set<PID>,
    ): PublishedGraph<PublishedMappedFDORecord> {
        const graph = new PublishedGraph<PublishedMappedFDORecord>()
        for (const pid of scope) {
            const stored = store.records.get(pid)!
            graph.addRecord(
                new RestoredFDORecord(stored) as PublishedMappedFDORecord,
            )
        }
        return graph
    }

    private restoredRecord(pid: PID): PublishedFDORecord {
        return new RestoredFDORecord(
            store.records.get(pid)!,
        ) as PublishedFDORecord
    }

    /**
     * The PID of the record that was published in the given scope under the
     * given local ID, if there is one.
     */
    private findPublishedPID(
        published: Set<PID>,
        localID: LocalID | undefined,
    ): PID | undefined {
        if (localID === undefined) return undefined

        for (const pid of published) {
            if (store.records.get(pid)?.localID === localID) return pid
        }
        return undefined
    }

    private localIDOf(record: FDORecord): LocalID | undefined {
        return "localID" in record
            ? (record as { localID: LocalID }).localID
            : undefined
    }

    private nextPID(): PID {
        return `${pidPrefix}/${++store.pidCounter}`
    }

    /**
     * Replaces the placeholders of the records of the mapping with the PIDs
     * they were published with. The placeholder of a record is the local ID it
     * was referenced by before it was published.
     */
    private resolvePlaceholders(
        value: RecordValue,
        pidsByLocalID: Map<string, PID>,
    ): RecordValue {
        return typeof value === "string"
            ? (pidsByLocalID.get(value) ?? value)
            : value.map((entry) => pidsByLocalID.get(entry) ?? entry)
    }

    private addValue(
        attributes: Map<PID, RecordValue>,
        attribute: PID,
        value: string,
    ): void {
        const current = attributes.get(attribute)
        if (current === undefined) {
            attributes.set(attribute, value)
        } else {
            attributes.set(
                attribute,
                Array.isArray(current) ? [...current, value] : [current, value],
            )
        }
    }
}
