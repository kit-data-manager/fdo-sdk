import type { Context } from "../interfaces/Context.js"
import { MapGraph } from "./MapGraph.js"
import type { LocalID, PID } from "../types.js"
import type { FDORecord } from "../interfaces/index.js"
import { ConcreteRecord } from "./ConcreteRecord.js"

export class ConcreteContext implements Context {
    localGraph = new MapGraph()
    remoteGraph = new MapGraph()

    newRecord(localID: LocalID, pid?: PID): FDORecord {
        const record = new ConcreteRecord(localID, pid)
        this.localGraph.addRecord(record)
        return record
    }
}

export function createMapping(mappingPID: PID) {
    return new ConcreteContext()
}
