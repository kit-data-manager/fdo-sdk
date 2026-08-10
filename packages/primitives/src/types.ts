export type LocalID = `LOCAL/${string}`
export type PID = `${string}/${string}`

export type RecordValue = string | string[]
export type Attribute = [PID, RecordValue]

export type ProfileAttributes = {
    [key: string]: RecordValue
}

export type AttributeToPID<P extends ProfileAttributes> = {
    -readonly [key in keyof P]-?: PID
}

export type ReferenceDeclaration = {
    fromAttribute: string
    toAttribute: string
    toRecord: LocalID | PID
}
