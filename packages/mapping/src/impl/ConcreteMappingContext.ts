import type { MappingContext } from "../interfaces/MappingContext.js"
import {
    MapGraph,
    type LocalID,
    type FDORecord,
    ConcreteRecord,
} from "@fdo-sdk/primitives"

export class ConcreteMappingContext implements MappingContext {
    readonly localGraph = new MapGraph()
    readonly remoteGraph = new MapGraph()

    newRecord(localID: LocalID): FDORecord {
        const record = new ConcreteRecord(localID)
        this.localGraph.addRecord(record)
        return record
    }
}
