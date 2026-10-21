import type { ReadOnlyFDOGraph } from "../interfaces/index.js"
import type { PublishedFDORecord } from "../interfaces/index.js"
import type { LocalID, PID, RecordValue } from "../types.js"

/**
 * A graph of published FDO records. The records are identified by their
 * {@link PID}. In contrast to the {@link MappedGraph}, the records of a
 * published graph do not need a local ID: a published record is globally
 * identified by its PID.
 */
export class PublishedGraph<
    RecordType extends PublishedFDORecord = PublishedFDORecord,
> implements ReadOnlyFDOGraph<RecordType> {
    private readonly records = new Map<PID, RecordType>()
    private readonly recordsByLocalID = new Map<LocalID, RecordType>()

    addRecord(record: RecordType): void {
        this.records.set(record.PID, record)

        const localID = (record as { localID?: LocalID }).localID
        if (localID !== undefined) {
            this.recordsByLocalID.set(localID, record)
        }
    }

    getRecords(): RecordType[] {
        return [...this.records.values()]
    }

    getRecord(id: PID | LocalID): RecordType | undefined {
        return (
            this.records.get(id as PID) ??
            this.recordsByLocalID.get(id as LocalID)
        )
    }

    findRecord(predicate: (r: RecordType) => boolean): RecordType | undefined {
        return this.getRecords().find(predicate)
    }

    toJSON(): Record<string, Record<string, RecordValue>>[] {
        const entries = this.getRecords().map((record) => [
            this.labelOf(record),
            record.toJSON(),
        ])
        return Object.fromEntries(entries)
    }

    toString(): string {
        return this.getRecords()
            .map((record) => record.toString())
            .join("\n")
    }

    private labelOf(record: RecordType): string {
        const localID = (record as { localID?: LocalID }).localID
        return localID === undefined ? record.PID : `${localID} - ${record.PID}`
    }
}
