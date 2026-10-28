import type { FDOGraph, LocalFDORecord } from "../interfaces/index.js"
import type { LocalID, PID, RecordValue } from "../types.js"

/**
 * A graph of locally created FDO records than can be used without PIDs
 */
export class LocalFDOGraph<
    RecordType extends LocalFDORecord = LocalFDORecord,
> implements FDOGraph<RecordType> {
    private recordsByLocalID = new Map<LocalID, RecordType>()
    private pids = new Map<PID, LocalID>()
    private hasBeenBuilt = false

    addRecord(record: RecordType): void {
        const previous = this.recordsByLocalID.get(record.localID)
        if (previous?.PID) this.pids.delete(previous.PID)
        this.recordsByLocalID.set(record.localID, record)
        if (record.PID) this.pids.set(record.PID, record.localID)
    }

    findRecord(predicate: (r: RecordType) => boolean): RecordType | undefined {
        for (const record of this.recordsByLocalID.values()) {
            if (predicate(record)) return record
        }
        return undefined
    }

    getRecord(id: PID | LocalID): RecordType | undefined {
        const pidOwner = this.pids.get(id as PID)
        if (pidOwner) return this.recordsByLocalID.get(pidOwner)
        return this.recordsByLocalID.get(id as LocalID)
    }

    getRecords(): RecordType[] {
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
                if (reference.direction === "uni") continue

                const target = this.getRecord(reference.toRecord)
                if (!target)
                    throw new Error(
                        `could not create bidirectional reference to record ${reference.toRecord} because it was not found in the local graph`,
                    )

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
