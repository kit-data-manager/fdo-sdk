export type LocalID = `LOCAL/${string}`
export type PID = `${string}/${string}`

export type RecordValue = string | string[]

export type ProfileAttributes = {
    [key: string]: RecordValue
}

export type KeepMarker = { mark: "keep" }
export type SkipMarker = { mark: "skip" }
export type ReferenceMarker = { mark: "reference" } & Omit<
    ReferenceDeclaration,
    "fromAttribute"
>
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

export type ReferenceDeclaration = {
    fromAttribute: PID
    toAttribute: PID
    toRecord: LocalID | PID
}
