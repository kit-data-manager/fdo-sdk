import type { FDOGraph } from "@fdo-sdk/primitives"

export interface PublishAdapter {
    publishGraph(graph: FDOGraph): Promise<void>
}
