import type {
    FDOGraph,
    PID,
    PublishedFDORecord,
    PublishedMappedFDORecord,
} from "@fdo-sdk/primitives"

export interface ResolveAdapter {
    resolveMappingRecords(
        mappingPID: PID,
    ): Promise<FDOGraph<PublishedMappedFDORecord>>
    resolveRecord(recordPID: PID): Promise<PublishedFDORecord | undefined>
}
