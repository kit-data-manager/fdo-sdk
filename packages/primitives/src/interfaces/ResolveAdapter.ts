import type {
    PID,
    PublishedFDORecord,
    PublishedLocalFDORecord,
} from "../index.js"
import type { ReadOnlyFDOGraph } from "../index.js"

export interface ResolveAdapter {
    resolveMappingRecords(
        mappingPID: PID,
    ): Promise<ReadOnlyFDOGraph<PublishedLocalFDORecord>>
    resolveRecord(recordPID: PID): Promise<PublishedFDORecord | undefined>
}
