import type { FDORecord } from "@fdo-sdk/primitives"

export interface FlavorAdapter<FlavorRecordFormat> {
    serializeRecord(input: FlavorRecordFormat): Promise<FDORecord>
    deserializeRecord(record: FDORecord): Promise<FlavorRecordFormat>
}
