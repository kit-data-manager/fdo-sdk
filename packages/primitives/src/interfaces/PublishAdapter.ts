import type { ReadOnlyFDOGraph } from "./FDOGraph.js"
import type { FDORecord, PublishedFDORecord } from "./FDORecord.js"

/**
 * Publishes records to a backend that assigns PIDs.
 *
 * A publish adapter has to persist the local ID of every record it publishes,
 * so that it can be restored when the record is resolved again (see
 * {@link ResolveAdapter}). How this happens is up to the adapter and the FDO
 * model does not prescribe it: the local ID may be stored as a record
 * attribute, in system metadata that is not part of the record, or even be
 * encoded in the PID.
 */
export interface PublishAdapter {
    /**
     * Publishes all the records of the graph. In the returned graph, the
     * records carry their PIDs and references between them are expressed in
     * terms of those PIDs.
     */
    publishGraph(
        graph: ReadOnlyFDOGraph<FDORecord>,
    ): Promise<ReadOnlyFDOGraph<PublishedFDORecord>>
    /**
     * Publishes a single record and returns it with its PID.
     */
    publishRecord(record: FDORecord): Promise<PublishedFDORecord>
}
