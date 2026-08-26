import type { Context } from "../interfaces/Context.js"
import { MapGraph } from "./MapGraph.js"
import type { LocalID, PID } from "../types.js"
import type { FDORecord } from "../interfaces/index.js"
import { ConcreteRecord } from "./ConcreteRecord.js"

export class ConcreteContext implements Context {
    readonly localGraph = new MapGraph()
    readonly remoteGraph = new MapGraph()

    newRecord(localID: LocalID): FDORecord {
        const record = new ConcreteRecord(localID)
        this.localGraph.addRecord(record)
        return record
    }
}

export function createMapping(mappingPID: PID) {
    return new ConcreteContext()
}
