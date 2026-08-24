import type { FDOGraph, ReadOnlyFDOGraph } from "./FDOGraph.js"
import type { LocalID, PID } from "../types.js"
import type { FDORecord } from "./FDORecord.js"

export interface Context {
    localGraph: FDOGraph
    remoteGraph: ReadOnlyFDOGraph

    newRecord(localID: LocalID, pid?: PID): FDORecord
}
