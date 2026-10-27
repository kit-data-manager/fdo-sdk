import type { PID, PublishedFDORecord } from "../index.js"

export interface ResolveAdapter {
    resolveRecord(recordPID: PID): Promise<PublishedFDORecord | undefined>
}
