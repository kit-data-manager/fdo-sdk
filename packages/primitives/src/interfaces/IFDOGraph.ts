import type { IFDORecord } from "./IFDORecord.js"
import type { LocalID, PID } from "../types.js"

export interface IFDOGraph {
    getRecords(): IFDORecord[]
    getRecord(id: PID | LocalID): IFDORecord | undefined
    addRecord(record: IFDORecord): void
    removeRecord(id: PID | LocalID): void
    findRecord(predicate: (r: IFDORecord) => boolean): IFDORecord | undefined
}
