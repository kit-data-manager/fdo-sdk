import type { PID, PublishedFDORecord } from "../index.js"

/**
 * Resolves published records from a backend.
 *
 * Resolving and publishing adapters agree on how the local ID of a record is
 * persisted. Adapters that resolve records for a mapping additionally have to
 * restore the local ID a record was published with, because mappings correlate
 * records between runs through their local IDs. The FDO model does not
 * prescribe where a local ID lives - it may be a record attribute, system
 * metadata, or part of the PID - so every adapter pair implements its own
 * mechanism.
 */
export interface ResolveAdapter {
    /**
     * Resolves a record by its PID, or returns `undefined` if no record with
     * that PID exists.
     */
    resolveRecord(recordPID: PID): Promise<PublishedFDORecord | undefined>
}
