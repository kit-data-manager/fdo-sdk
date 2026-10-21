import type { LocalFDORecord } from "../interfaces/index.js"
import { type LocalID, type PID } from "../types.js"
import { ConcreteFDORecord } from "./ConcreteFDORecord.js"

/**
 * {@link FDORecord} implementation that can hold a local ID. The local ID
 * will be replaced by the publisher service with a PID.
 */
export class ConcreteLocalFDORecord
    extends ConcreteFDORecord
    implements LocalFDORecord
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
