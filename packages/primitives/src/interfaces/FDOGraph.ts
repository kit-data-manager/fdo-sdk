import type { FDORecord, ReadOnlyFDORecord } from "./FDORecord.js"
import type { LocalID, PID, RecordValue } from "../types.js"

/**
 * Represents a graph of FDO records, where each node is a record and each
 * edge is a reference from one record to another.
 */
export interface FDOGraph<
    RecordType extends FDORecord,
> extends ReadOnlyFDOGraph<RecordType> {
    /**
     * Add a new record to the graph
     * @param record
     */
    addRecord(record: FDORecord): void

    /**
     * Remove a record in this graph by its local ID or global {@link PID}
     * @param id local identifier or global {@link PID} of the record to remove
     */
    removeRecord(id: PID | LocalID): void

    /**
     * Executes all recorded references, i.e. for every reference declaration
     * the target record receives a back-reference via its toAttribute.
     */
    build(): void
}

/**
 * Represents a graph of FDO records, where each node is a record and each
 * edge is a reference from one record to another. Read-only.
 */
export interface ReadOnlyFDOGraph<RecordType extends ReadOnlyFDORecord> {
    /**
     * Get a flat list of all record in this graph
     */
    getRecords(): RecordType[]

    /**
     * Get a record by its local ID or globally unique and registered {@link PID}
     * @param id local identifier or global {@link PID} of the record to retrieve
     * @returns the record when it exists in this graph, or undefined it not
     */
    getRecord(id: PID | LocalID): RecordType | undefined

    /**
     * Find a record within the graph based on the predicate function. Returns the first match with arbitrary ordering.
     * @param predicate Function that should evaluate to `true` for the record that should be returned.
     * @returns the first record that matches the predicate, or undefined if no record matches the predicate
     */
    findRecord(predicate: (r: RecordType) => boolean): RecordType | undefined

    /**
     * Returns the contents of this graph in a plain format, to be used with
     * {@link JSON.stringify}
     */
    toJSON(): Record<string, Record<string, RecordValue>>[]

    /**
     * Returns the content of this graph as a string, mainly useful for
     * logging and debugging.
     */
    toString(): string
}
