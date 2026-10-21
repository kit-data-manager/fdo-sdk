import type {
    LocalFDORecord,
    PID,
    PublishedLocalFDORecord,
    ReadOnlyFDOGraph,
} from "@fdo-sdk/primitives"

/**
 * The result of a continuous mapping operation
 */
export type MappingResult = {
    /**
     * The PID of the mapping. It identifies the mapping and is also the PID of
     * the high level FDO record that represents the mapping.
     */
    mappingPID: PID
    create: ReadOnlyFDOGraph<LocalFDORecord>
    update: ReadOnlyFDOGraph<LocalFDORecord>
    delete: PID[]
}

export type ContinuousPublishResult = {
    /**
     * The PID of the mapping. It identifies the mapping and is also the PID of
     * the high level FDO record that represents the mapping.
     */
    mappingPID: PID
    graph: ReadOnlyFDOGraph<PublishedLocalFDORecord>
    deleted: PID[]
}
