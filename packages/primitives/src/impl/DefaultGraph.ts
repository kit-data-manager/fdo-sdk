import type { IFDORecord, IFDOGraph } from "../interfaces/index.js"
import type { LocalID, PID } from "../types.js"

export class DefaultGraph implements IFDOGraph {
    private recordsByLocalID = new Map<LocalID, IFDORecord>()
    private pids = new Map<PID, LocalID>()

    addRecord(record: IFDORecord): void {
        const previous = this.recordsByLocalID.get(record.localID)
        if (previous?.PID) this.pids.delete(previous.PID)
        this.recordsByLocalID.set(record.localID, record)
        if (record.PID) this.pids.set(record.PID, record.localID)
    }

    findRecord(predicate: (r: IFDORecord) => boolean): IFDORecord | undefined {
        for (const record of this.recordsByLocalID.values()) {
            if (predicate(record)) return record
        }
        return undefined
    }

    getRecord(id: PID | LocalID): IFDORecord | undefined {
        const pidOwner = this.pids.get(id as PID)
        if (pidOwner) return this.recordsByLocalID.get(pidOwner)
        return this.recordsByLocalID.get(id as LocalID)
    }

    getRecords(): IFDORecord[] {
        return [...this.recordsByLocalID.values()]
    }

    removeRecord(id: PID | LocalID): void {
        const record = this.getRecord(id)
        if (!record) return
        this.recordsByLocalID.delete(record.localID)
        if (record.PID) this.pids.delete(record.PID)
    }
}
