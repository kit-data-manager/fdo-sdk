import type {
    FDOGraph,
    FDOGraphAddRecordOptions,
    LocalFDORecord,
} from "../interfaces/index.js"
import type { LocalID, PID, RecordValue } from "../types.js"
import { ConcreteLocalFDORecord } from "./ConcreteLocalFDORecord.js"

/**
 * A graph of locally created FDO records than can be used without PIDs
 */
export class LocalFDOGraph implements FDOGraph<LocalFDORecord> {
    private recordsByLocalID = new Map<LocalID, LocalFDORecord>()
    private pids = new Map<PID, LocalID>()
    private hasBeenBuilt = false

    addRecord(
        record: LocalFDORecord,
        options?: FDOGraphAddRecordOptions,
    ): void {
        const existing = this.recordsByLocalID.get(record.localID)
        if (existing && (!options || !options.overwrite)) {
            throw new Error(
                `A record with the same identifier (${record.localID}) already exists in this graph. Pass \`overwrite: true\` in the method options to overwrite`,
            )
        }
        if (existing?.PID) this.pids.delete(existing.PID)
        this.recordsByLocalID.set(record.localID, record)
        if (record.PID) this.pids.set(record.PID, record.localID)
    }

    /**
     * Create a new local FDO record with the given local ID and add it to the graph.
     * Returns the new local FDO record.
     * @param localID {@link LocalID} of the new record
     * @param options Options for the add record method (e.g. `overwrite`)
     */
    newRecord(
        localID: LocalID,
        options?: FDOGraphAddRecordOptions,
    ): LocalFDORecord {
        const record = new ConcreteLocalFDORecord(localID)
        this.addRecord(record, options)
        return record
    }

    findRecord(
        predicate: (r: LocalFDORecord) => boolean,
    ): LocalFDORecord | undefined {
        for (const record of this.recordsByLocalID.values()) {
            if (predicate(record)) return record
        }
        return undefined
    }

    getRecord(id: PID | LocalID): LocalFDORecord | undefined {
        const pidOwner = this.pids.get(id as PID)
        if (pidOwner) return this.recordsByLocalID.get(pidOwner)
        return this.recordsByLocalID.get(id as LocalID)
    }

    getRecords(): LocalFDORecord[] {
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
