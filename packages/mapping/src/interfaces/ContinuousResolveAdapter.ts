import type {
    ResolveAdapter,
    PID,
    ReadOnlyFDOGraph,
    PublishedLocalFDORecord,
} from "@fdo-sdk/primitives"

export interface ContinuousResolveAdapter extends ResolveAdapter {
    resolveMappingRecords(
        mappingPID: PID,
    ): Promise<ReadOnlyFDOGraph<PublishedLocalFDORecord>>
}
