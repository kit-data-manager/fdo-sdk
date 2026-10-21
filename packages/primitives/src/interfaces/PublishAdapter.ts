import type {
    FDORecord,
    PublishedFDORecord,
    ReadOnlyFDOGraph,
} from "@fdo-sdk/primitives"

export interface PublishAdapter {
    publishGraph(
        graph: ReadOnlyFDOGraph<FDORecord>,
    ): Promise<ReadOnlyFDOGraph<PublishedFDORecord>>
    publishRecord(record: FDORecord): Promise<PublishedFDORecord>
}
