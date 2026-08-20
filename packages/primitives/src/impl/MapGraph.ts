import type { FDORecord, FDOGraph } from "../interfaces/index.js"
import type { LocalID, PID } from "../types.js"

export class MapGraph implements FDOGraph {
    private recordsByLocalID = new Map<LocalID, FDORecord>()
    private pids = new Map<PID, LocalID>()

    addRecord(record: FDORecord): void {
        const previous = this.recordsByLocalID.get(record.localID)
        if (previous?.PID) this.pids.delete(previous.PID)
        this.recordsByLocalID.set(record.localID, record)
        if (record.PID) this.pids.set(record.PID, record.localID)
    }

    findRecord(predicate: (r: FDORecord) => boolean): FDORecord | undefined {
        for (const record of this.recordsByLocalID.values()) {
            if (predicate(record)) return record
        }
        return undefined
    }

    getRecord(id: PID | LocalID): FDORecord | undefined {
        const pidOwner = this.pids.get(id as PID)
        if (pidOwner) return this.recordsByLocalID.get(pidOwner)
        return this.recordsByLocalID.get(id as LocalID)
    }

    getRecords(): FDORecord[] {
        return [...this.recordsByLocalID.values()]
    }

    removeRecord(id: PID | LocalID): void {
        const record = this.getRecord(id)
        if (!record) return
        this.recordsByLocalID.delete(record.localID)
        if (record.PID) this.pids.delete(record.PID)
    }
}
