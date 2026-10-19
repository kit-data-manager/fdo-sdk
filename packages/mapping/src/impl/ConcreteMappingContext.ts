import type { MappingContext } from "../interfaces/MappingContext.js"
import {
    MappedGraph,
    type LocalID,
    type FDORecord,
    ConcreteMappedFDORecord,
} from "@fdo-sdk/primitives"

export class ConcreteMappingContext implements MappingContext {
    readonly localGraph = new MappedGraph()
    readonly remoteGraph = new MappedGraph()

    newRecord(localID: LocalID): FDORecord {
        const record = new ConcreteMappedFDORecord(localID)
        this.localGraph.addRecord(record)
        return record
    }
}
