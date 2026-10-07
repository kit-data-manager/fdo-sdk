import type { PID } from "@fdo-sdk/primitives"
import type { FDOGraph } from "@fdo-sdk/primitives"
import type { MappingContext } from "./MappingContext.js"

export interface Mapping {
    readonly mappingPID: PID

    resolveRemoteGraph(): Promise<FDOGraph>
    newLocalGraph(): Promise<MappingContext>
}
