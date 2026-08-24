export type LocalID = `LOCAL/${string}`
export type PID = `${string}/${string}`

export type RecordValue = string | string[]

export type ProfileAttributes = {
    [key: string]: RecordValue
}

export const Keep = Symbol("Keep")

export type AllowKeep<P extends ProfileAttributes> = {
    [key in keyof P]: P[key] | typeof Keep
}

export type AttributeToPID<P extends ProfileAttributes> = {
    -readonly [key in keyof P]-?: PID
}

export type ReferenceDeclaration = {
    fromAttribute: string
    toAttribute: string
    toRecord: LocalID | PID
}
