import type { FDORecord } from "./FDORecord.js"
import type { LocalID, PID, RecordValue } from "../types.js"

export interface ReadOnlyFDOGraph {
    getRecords(): FDORecord[]
    getRecord(id: PID | LocalID): FDORecord | undefined
    findRecord(predicate: (r: FDORecord) => boolean): FDORecord | undefined
    toJSON(): Record<string, RecordValue>[]
    toString(): string
}

export interface FDOGraph extends ReadOnlyFDOGraph {
    addRecord(record: FDORecord): void
    removeRecord(id: PID | LocalID): void

    /**
     * Executes all recorded references, i.e. for every reference declaration
     * the target record receives a back-reference via its toAttribute.
     */
    build(): void
}
