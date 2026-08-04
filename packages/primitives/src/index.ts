type LocalID = `LOCAL/${string}`
type PID = `${string}/${string}`

type RecordValue = string |string[]
type Attribute = [PID, RecordValue]

interface Profile<Attributes extends ProfileAttributes> {
    readonly pid: PID

    /**
     * Maps the readable name of an attribute to its PID
     */
    readonly mapping: AttributeToPID<Attributes>
}

type ProfileAttributes = {
    [key: string]: any
}

type AttributeToPID<P extends ProfileAttributes> = {-readonly [key in keyof P]-?: PID}

interface Record {
    localID: LocalID
    PID?: PID

    get(attribute: PID): RecordValue | undefined
    has(attribute: PID): boolean
    count(attribute: PID): number
    set(attribute: PID, value: RecordValue): void

    add(record: Record): void
    add(attribute: Attribute): void
    addReference(fromAttribute: PID, toAttribute: PID, toRecord: PID | LocalID | Record): void
    addProfile<P extends Profile<ProfileAttributes>>(profile: P, attributes: P extends Profile<infer I> ? I : never): void
}

const record: Record = {} as Record


type HMCRecord = {
    /**
     * The description of is metadata for
     */
    isMetadataFor: RecordValue,

    /**
     * Has metadata description
     */
    hasMetadata: RecordValue,

    /**
     * Description for dateCreated
     */
    dateCreated?: RecordValue
}

const myProfile: Profile<HMCRecord> = {
    pid: "jfisodf/gkfpgfk",
    mapping: {
        isMetadataFor: "21/21",
        hasMetadata: "21/22",
        dateCreated: "21/23"
    }
}

record.addProfile(myProfile, {
    hasMetadata: "fdsf",
    isMetadataFor: "fdsf",
    dateCreated: "fdf"
})

