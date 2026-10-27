import type { ReadOnlyFDOGraph } from "./FDOGraph.js"
import type { FDORecord, PublishedFDORecord } from "./FDORecord.js"

export interface PublishAdapter {
    publishGraph(
        graph: ReadOnlyFDOGraph<FDORecord>,
    ): Promise<ReadOnlyFDOGraph<PublishedFDORecord>>
    publishRecord(record: FDORecord): Promise<PublishedFDORecord>
}
