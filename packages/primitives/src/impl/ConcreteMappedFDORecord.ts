import type { MappedFDORecord } from "../interfaces/index.js"
import { type LocalID, type PID } from "../types.js"
import { ConcreteFDORecord } from "./ConcreteFDORecord.js"

export class ConcreteMappedFDORecord
    extends ConcreteFDORecord
    implements MappedFDORecord
{
    readonly localID: LocalID

    constructor(localID: LocalID, pid?: PID) {
        super(pid)
        this.localID = localID
    }

    toString(): string {
        return JSON.stringify(
            {
                localID: this.localID,
                PID: this.PID,
                profiles: this.conformsToProfiles.join(", "),
                attributes: Object.fromEntries(this.attributes),
                references: this.references,
            },
            null,
            2,
        )
    }
}
