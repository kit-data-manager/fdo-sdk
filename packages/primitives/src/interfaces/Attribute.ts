import type { PID, RecordValue } from "../types.js"

export interface Attribute<Type extends RecordValue> {
    readonly pid: PID
    readonly readableName: string
}
