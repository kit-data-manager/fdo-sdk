import type { FDORecord, FDOGraph } from "../interfaces/index.js"
import type { LocalID, PID, RecordValue } from "../types.js"

export class MapGraph implements FDOGraph {
    private recordsByLocalID = new Map<LocalID, FDORecord>()
    private pids = new Map<PID, LocalID>()
    private hasBeenBuilt = false

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

    build(): void {
        if (this.hasBeenBuilt) {
            throw new Error(
                "This graph has already been built before. Building twice will lead to unexpected behaviour.",
            )
        }
        this.hasBeenBuilt = true

        for (const record of this.recordsByLocalID.values()) {
            for (const reference of record.getReferences()) {
                const target = this.getRecord(reference.toRecord)
                if (!target || reference.direction === "uni") continue
                target.addAttribute(
                    reference.inverseAttribute,
                    record.PID ?? record.localID,
                )
            }
        }
    }

    toString(): string {
        return this.getRecords()
            .map((record) => record.toString())
            .join("\n")
    }

    toJSON(): Record<string, Record<string, RecordValue>>[] {
        const entries = this.getRecords().map((record) => [
            `${record.localID} - ${record.PID || "unpublished"}`,
            record.toJSON(),
        ])
        return Object.fromEntries(entries)
    }
}
