import type {
    FDORecord,
    IdentifiableFDORecord,
    LocalFDORecord,
    PublishedFDORecord,
    PublishedLocalFDORecord,
} from "./interfaces/index.js"

export function toArray<T>(val: T | T[]): T[] {
    if (Array.isArray(val)) {
        return val
    } else {
        return [val]
    }
}

export function isLocal(record: FDORecord): record is LocalFDORecord {
    return "localID" in record
}

export function isPublished(record: FDORecord): record is PublishedFDORecord {
    return record.PID !== undefined
}

export function isPublishedMapped(
    record: FDORecord,
): record is PublishedLocalFDORecord {
    return isLocal(record) && isPublished(record)
}

export function getRecordIdentifier(record: IdentifiableFDORecord): string {
    return (
        record.PID ??
        (isLocal(record)
            ? record.localID
            : (() => {
                  throw new Error(
                      "Called getRecordIdentifier on a record that has no identifier (no PID, no localID)",
                      { cause: record },
                  )
              })())
    )
}
