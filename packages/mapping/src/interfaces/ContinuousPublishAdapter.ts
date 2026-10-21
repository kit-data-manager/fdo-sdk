import type { PublishAdapter } from "@fdo-sdk/primitives"
import type { MappingResult, ContinuousPublishResult } from "../types.js"

export interface ContinuousPublishAdapter extends PublishAdapter {
    publishContinuous(
        mappingResult: MappingResult,
    ): Promise<ContinuousPublishResult>
}
