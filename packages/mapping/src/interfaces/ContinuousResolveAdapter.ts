import type {
    ResolveAdapter,
    PID,
    ReadOnlyFDOGraph,
    PublishedLocalFDORecord,
} from "@fdo-sdk/primitives"

/**
 * A {@link ResolveAdapter} that can resolve all the records of a mapping.
 *
 * The resolved records must carry the local IDs they were published with,
 * because a continuous mapping uses the local IDs to decide which records are
 * new, which ones already exist and which ones were deleted. How the local ID
 * was persisted is up to the adapter - a record attribute like in the testing
 * backend, system metadata, or the PID itself - as long as resolving restores
 * it.
 */
export interface ContinuousResolveAdapter extends ResolveAdapter {
    /**
     * Resolves all the records that are part of the given mapping.
     */
    resolveMappingRecords(
        mappingPID: PID,
    ): Promise<ReadOnlyFDOGraph<PublishedLocalFDORecord>>
}
