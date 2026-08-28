/**
 * The local ID is a locally unique (e.g. within the context of a specific mapping) identifier for one FDO record.
 * Care must be taken to ensure the local identifier is always unique and always the same for each
 * thing that will be represented as an FDO record.
 */
export type LocalID = `LOCAL/${string}`

/**
 * The PID is the globally unique and persistent identifier of a published FDO record. Its structure
 * depends on the FDO flavor.
 */
export type PID = string

/**
 * Possible values of attributes within an FDO record
 */
export type RecordValue = string | string[]

export type ProfileAttributes = {
    [key: string]: RecordValue
}

export type KeepMarker = { mark: "keep" }
export type SkipMarker = { mark: "skip" }
export type ReferenceMarker = {
    mark: "reference"
    ref:
        | Omit<ReferenceDeclaration & { direction: "uni" }, "fromAttribute">
        | Omit<ReferenceDeclaration & { direction: "bidi" }, "fromAttribute">
}

/**
 * Attribute markers are used in {@link FDORecord.addProfile} to allow declaring
 * skipped (see {@link skip}), kept (see {@link keep}) or referenced (see {@link reference}) attribute inline in the profile attribute
 * definition.
 */
export type AttributeMarker = KeepMarker | SkipMarker | ReferenceMarker

/**
 * @internal
 */
type AddMarker<T> = T extends (infer InnerType)[]
    ? AttributeMarker | (InnerType | ReferenceMarker)[]
    : T | AttributeMarker

/**
 * @internal
 */
export type WithMarkers<P extends ProfileAttributes> = {
    [key in keyof P]: AddMarker<P[key]>
}

/**
 * @internal
 */
export type AttributeToPID<P extends ProfileAttributes> = {
    -readonly [key in keyof P]-?: PID
}

export type UniReferenceDeclaration = {
    direction: "uni"
    /**
     * Attribute of the local record that references toRecord
     */
    fromAttribute: PID
    /**
     * local ID or PID of target record
     */
    toRecord: LocalID | PID
}
export type BidiReferenceDeclaration = {
    direction: "bidi"
    /**
     * Attribute of the local record that references toRecord
     */
    fromAttribute: PID
    /**
     * Attribute of toRecord where the back-reference to this record will be placed
     */
    inverseAttribute: PID
    /**
     * local ID or PID of target record
     */
    toRecord: LocalID | PID
}

/**
 * Declares a reference between two records. Either unidirectional or bidirectional.
 */
export type ReferenceDeclaration =
    UniReferenceDeclaration | BidiReferenceDeclaration
