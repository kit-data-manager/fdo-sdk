import type {
    MappedFDORecord,
    PID,
    ReadOnlyFDOGraph,
} from "@fdo-sdk/primitives"
import type { PublishedMappedFDORecord } from "@fdo-sdk/primitives"

export type MappingResult = {
    /**
     * The PID of the mapping. It identifies the mapping and is also the PID of
     * the high level FDO record that represents the mapping.
     */
    mappingPID: PID
    graph: ReadOnlyFDOGraph<MappedFDORecord>
    delete: PID[]
}

export type PublishResult = {
    /**
     * The PID of the mapping. It identifies the mapping and is also the PID of
     * the high level FDO record that represents the mapping.
     */
    mappingPID: PID
    graph: ReadOnlyFDOGraph<PublishedMappedFDORecord>
    deleted: PID[]
}
