import type {
    ReadOnlyFDOGraph,
    ReadOnlyFDORecord,
    ReferenceDeclaration,
} from "@fdo-sdk/primitives"

export type AttributeSnapshot = { pid: string; value: string | string[] }

export type ReferenceSnapshot = {
    attribute: string
    target: string
    direction: "uni" | "bidi"
}

export type RecordSnapshot = {
    /** Canonical node id: the PID if published, the local ID otherwise. */
    id: string
    pid: string | undefined
    localID: string | undefined
    profiles: string[]
    attributes: AttributeSnapshot[]
    references: ReferenceSnapshot[]
}

export type GraphSnapshot = {
    label: string
    records: RecordSnapshot[]
}

type WithLocalID = { localID?: string }

function localIDOf(record: ReadOnlyFDORecord): string | undefined {
    return (record as WithLocalID).localID
}

function recordId(record: ReadOnlyFDORecord, index: number): string {
    return record.PID ?? localIDOf(record) ?? `record-${index}`
}

export function snapshotGraph(
    graph: ReadOnlyFDOGraph,
    label: string,
): GraphSnapshot {
    return snapshotRecords(graph.getRecords(), label)
}

/**
 * Builds a plain-data snapshot of the given records for the UI. Reference
 * targets are resolved through an id map that covers both PIDs and local IDs.
 */
export function snapshotRecords(
    records: ReadOnlyFDORecord[],
    label: string,
): GraphSnapshot {
    const idByRef = new Map<string, string>()
    records.forEach((record, index) => {
        const id = recordId(record, index)
        if (record.PID) idByRef.set(record.PID, id)
        const localID = localIDOf(record)
        if (localID) idByRef.set(localID, id)
    })

    return {
        label,
        records: records.map((record, index) => ({
            id: recordId(record, index),
            pid: record.PID,
            localID: localIDOf(record),
            profiles: [...record.getProfiles()],
            attributes: [...record.getAll()].map(([pid, value]) => ({
                pid,
                value,
            })),
            references: record
                .getReferences()
                .map((reference) => toReferenceSnapshot(reference, idByRef)),
        })),
    }
}

function toReferenceSnapshot(
    reference: ReferenceDeclaration,
    idByRef: Map<string, string>,
): ReferenceSnapshot {
    return {
        attribute: reference.fromAttribute,
        target: idByRef.get(reference.toRecord) ?? reference.toRecord,
        direction: reference.direction,
    }
}
