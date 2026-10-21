import type {
    FDORecord,
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

export function isMapped(record: FDORecord): record is LocalFDORecord {
    return "localID" in record
}

export function isPublished(record: FDORecord): record is PublishedFDORecord {
    return record.PID !== undefined
}

export function isPublishedMapped(
    record: FDORecord,
): record is PublishedLocalFDORecord {
    return isMapped(record) && isPublished(record)
}
