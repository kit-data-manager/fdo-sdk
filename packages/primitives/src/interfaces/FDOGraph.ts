import type { FDORecord } from "./FDORecord.js"
import type { LocalID, PID } from "../types.js"

export interface FDOGraph {
    getRecords(): FDORecord[]
    getRecord(id: PID | LocalID): FDORecord | undefined
    addRecord(record: FDORecord): void
    removeRecord(id: PID | LocalID): void
    findRecord(predicate: (r: FDORecord) => boolean): FDORecord | undefined
}
