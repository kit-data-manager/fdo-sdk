import type { FDOGraph, ReadOnlyFDOGraph } from "./FDOGraph.js"
import type { LocalID } from "../types.js"
import type { FDORecord } from "./FDORecord.js"

/**
 * The context of a data to FDO record mapping. Holds the local graph, which
 * should contain all the FDOs that should be or should stay published. Also
 * holds the remote graph, containing all records from the mapping that have
 * been published in the past.
 */
export interface Context {
    /**
     * The local graph should contain all the FDOs that should be or should stay published
     */
    readonly localGraph: FDOGraph

    /**
     * The remote graph contains all FDO records that have been published by this mapping in the past.
     */
    readonly remoteGraph: ReadOnlyFDOGraph

    /**
     * Create a new record. This is the standard method to add a record to the
     * local graph, to then be published when the mapping is complete.
     * @param localID Mandatory and locally unique identifier
     */
    newRecord(localID: LocalID): FDORecord
}
