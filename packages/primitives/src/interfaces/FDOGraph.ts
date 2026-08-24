import type { FDORecord } from "./FDORecord.js"
import type { LocalID, PID } from "../types.js"

export interface ReadOnlyFDOGraph {
    getRecords(): FDORecord[]
    getRecord(id: PID | LocalID): FDORecord | undefined
    findRecord(predicate: (r: FDORecord) => boolean): FDORecord | undefined
}

export interface FDOGraph extends ReadOnlyFDOGraph {
    addRecord(record: FDORecord): void
    removeRecord(id: PID | LocalID): void
}
