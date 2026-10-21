import type {
    PID,
    PublishedFDORecord,
    PublishedMappedFDORecord,
} from "@fdo-sdk/primitives"
import type { ReadOnlyFDOGraph } from "@fdo-sdk/primitives"

export interface ResolveAdapter {
    resolveMappingRecords(
        mappingPID: PID,
    ): Promise<ReadOnlyFDOGraph<PublishedMappedFDORecord>>
    resolveRecord(recordPID: PID): Promise<PublishedFDORecord | undefined>
}
