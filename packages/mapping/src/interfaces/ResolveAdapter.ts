import type { FDOGraph, PID, FDORecord } from "@fdo-sdk/primitives"

export interface ResolveAdapter {
    resolveMappingRecords(mappingPID: PID): Promise<FDOGraph>
    resolveRecord(recordPID: PID): Promise<FDORecord>
}
