import type { PublishAdapter } from "@fdo-sdk/primitives"
import type { MappingResult, ContinuousPublishResult } from "../types.js"

/**
 * A {@link PublishAdapter} that can publish the result of a continuous
 * mapping: it publishes the records the mapping creates and updates, deletes
 * the records the mapping no longer contains, and maintains the high level FDO
 * record of the mapping.
 *
 * Like every publish adapter, it has to persist the local IDs of the records
 * it publishes so they can be restored by the matching
 * {@link ContinuousResolveAdapter} - regardless of whether it stores them as
 * record attributes, as system metadata, or in the PID itself.
 */
export interface ContinuousPublishAdapter extends PublishAdapter {
    publishContinuous(
        mappingResult: MappingResult,
    ): Promise<ContinuousPublishResult>
}
