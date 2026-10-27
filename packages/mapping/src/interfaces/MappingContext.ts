import type {
    FDOGraph,
    ReadOnlyFDOGraph,
    LocalID,
    FDORecord,
} from "@fdo-sdk/primitives"
import type { PID } from "@fdo-sdk/primitives"
import type { MappingResult } from "../types.js"
import type { ContinuousResolveAdapter } from "./ContinuousResolveAdapter.js"

/**
 * The context of a data to FDO record mapping. Holds the local graph, which
 * should contain all the FDOs that should be or should stay published. Also
 * holds the remote graph, containing all records from the mapping that have
 * been published in the past.
 */
export interface MappingContext {
    /**
     * The PID of the mapping. It identifies the mapping and is also the PID of
     * the high level FDO record that represents the mapping.
     */
    readonly mappingPID: PID

    /**
     * The local graph should contain all the FDOs that should be or should stay published
     */
    readonly localGraph: Omit<FDOGraph, "build">

    /**
     * The remote graph contains all FDO records that have been published by this mapping in the past.
     */
    readonly remoteGraph: ReadOnlyFDOGraph

    /**
     * Whether the remote graph for this mapping has already been fetched. If false, the {@link remoteGraph} is empty.
     * If true, the {@link remoteGraph} contains the remote graph, e.g. the most recently published result of this mapping.
     */
    get hasResolvedRemoteGraph(): boolean

    /**
     * Resolve the (previously published) remote graph of this mapping. This is only necessary for continuous mappings.
     * @param resolver Continuous resolve adapter that resolved the remote graph that has been produced in the past by this continuous mapping
     */
    resolveRemoteGraph(resolver: ContinuousResolveAdapter): Promise<void>

    /**
     * Create a new record. This is the standard method to add a record to the
     * local graph, to then be published when the mapping is complete.
     * @param localID Mandatory and locally unique identifier
     */
    newRecord(localID: LocalID): FDORecord

    /**
     * Build the local graph and determine changes to the remoteGraph,
     * yielding the result of the mapping. The resulting graph can be
     * published.
     */
    build(): MappingResult
}
