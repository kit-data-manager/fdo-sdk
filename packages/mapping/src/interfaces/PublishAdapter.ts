import type { MappingResult, PublishResult } from "../types.js"
import type {
    FDORecord,
    PublishedFDORecord,
    ReadOnlyFDOGraph,
} from "@fdo-sdk/primitives"

export interface PublishAdapter {
    publishContinuous(mappingResult: MappingResult): Promise<PublishResult>
    publishGraph(
        graph: ReadOnlyFDOGraph<FDORecord>,
    ): Promise<ReadOnlyFDOGraph<PublishedFDORecord>>
    publishRecord(record: FDORecord): Promise<PublishedFDORecord>
}
