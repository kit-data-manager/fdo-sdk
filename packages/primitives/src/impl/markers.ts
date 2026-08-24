import type {
    KeepMarker,
    LocalID,
    PID,
    ReferenceMarker,
    SkipMarker,
} from "../types.js"
import type { Attribute } from "../interfaces/index.js"

export function skip(): SkipMarker {
    return { mark: "skip" }
}

export function keep(): KeepMarker {
    return { mark: "keep" }
}

export function reference(
    inverseAttribute: PID | Attribute<never>,
    targetRecord: LocalID | PID,
): ReferenceMarker {
    return {
        mark: "reference",
        toAttribute:
            typeof inverseAttribute === "string"
                ? inverseAttribute
                : inverseAttribute.pid,
        toRecord: targetRecord,
    }
}

export function isKeep(input: unknown): input is KeepMarker {
    return (
        input !== null &&
        typeof input === "object" &&
        "mark" in input &&
        input.mark === "keep"
    )
}

export function isSkip(input: unknown): input is SkipMarker {
    return (
        input !== null &&
        typeof input === "object" &&
        "mark" in input &&
        input.mark === "skip"
    )
}

export function isReference(input: unknown): input is ReferenceMarker {
    return (
        input !== null &&
        typeof input === "object" &&
        "mark" in input &&
        input.mark === "reference"
    )
}
