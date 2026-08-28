import type {
    KeepMarker,
    LocalID,
    PID,
    ReferenceMarker,
    SkipMarker,
} from "../types.js"
import type { Attribute } from "../interfaces/index.js"

/**
 * To be used in {@link FDORecord.addProfile}. Marks a mandatory attribute as skipped, meaning it won't be added to the record.
 *
 * Use this marker to skip specifying mandatory profile attributes. This is dangerous! Prefer {@link keep} instead, if possible.
 */
export function skip(): SkipMarker {
    return { mark: "skip" }
}

/**
 * To be used in {@link FDORecord.addProfile}. Marks a mandatory attribute as kept, assuming that this attribute is already present in the record.
 *
 * ⚠️ If the attribute is not present yet in the record, {@link FDORecord.addProfile} will throw.
 *
 * @throws when the attribute is not present in the record yet
 */
export function keep(): KeepMarker {
    return { mark: "keep" }
}

/**
 * To be used in {@link FDORecord.addProfile}. Adds a reference from this record to another record.
 * @param targetRecord The {@link PID} or local identifier of the remote record
 */
export function reference(targetRecord: LocalID | PID): ReferenceMarker {
    return {
        mark: "reference",
        ref: {
            direction: "uni",
            toRecord: targetRecord,
        },
    }
}

/**
 * To be used in {@link FDORecord.addProfile}. Adds a reference from this record to another record and back.
 * @param inverseAttribute The {@link PID} or {@link Attribute} instance of the attribute on the remote record that will link bank to this record
 * @param targetRecord The {@link PID} or local identifier of the remote record
 */
export function referenceBidi(
    inverseAttribute: PID | Attribute<never>,
    targetRecord: LocalID | PID,
): ReferenceMarker {
    return {
        mark: "reference",
        ref: {
            direction: "bidi",
            inverseAttribute:
                typeof inverseAttribute === "string"
                    ? inverseAttribute
                    : inverseAttribute.pid,
            toRecord: targetRecord,
        },
    }
}

/**
 * @internal
 */
export function isKeep(input: unknown): input is KeepMarker {
    return (
        input !== null &&
        typeof input === "object" &&
        "mark" in input &&
        input.mark === "keep"
    )
}

/**
 * @internal
 */
export function isSkip(input: unknown): input is SkipMarker {
    return (
        input !== null &&
        typeof input === "object" &&
        "mark" in input &&
        input.mark === "skip"
    )
}

/**
 * @internal
 */
export function isReference(input: unknown): input is ReferenceMarker {
    return (
        input !== null &&
        typeof input === "object" &&
        "mark" in input &&
        input.mark === "reference"
    )
}
