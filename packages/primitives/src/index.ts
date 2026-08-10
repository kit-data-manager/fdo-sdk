type LocalID = `LOCAL/${string}`
type PID = `${string}/${string}`

type RecordValue = string | string[]
type Attribute = [PID, RecordValue]

interface ProfileDefinition<Attributes extends ProfileAttributes> {
    readonly pid: PID

    /**
     * Maps the readable name of an attribute to its PID
     */
    readonly mapping: AttributeToPID<Attributes>
}

type ProfileAttributes = {
    [key: string]: any
}

type AttributeToPID<P extends ProfileAttributes> = {
    -readonly [key in keyof P]-?: PID
}

interface Record {
    localID: LocalID
    PID?: PID

    get(attribute: PID): RecordValue | undefined
    has(attribute: PID): boolean
    count(attribute: PID): number
    set(attribute: PID, value: RecordValue): void

    add(record: Record): void
    add(attribute: Attribute): void
    addReference(
        fromAttribute: PID,
        toAttribute: PID,
        toRecord: PID | LocalID | Record,
    ): void
    addProfile<P extends ProfileDefinition<ProfileAttributes>>(
        profile: P,
        attributes: P extends ProfileDefinition<infer I> ? I : never,
    ): void
}

const record: Record = {} as Record

type HMCProfileAttributes = {
    /** The name of the dataset described by this FDO */
    datasetName: string
    /** The authors of the work described by this FDO */
    authors: string | string[]
    /** Description for dateCreated */
    dateCreated?: Date
}

const HMCProfile: ProfileDefinition<HMCProfileAttributes> = {
    pid: "jfisodf/gkfpgfk",
    mapping: {
        datasetName: "some/pid1",
        authors: "some/pid2",
        dateCreated: "some/pid3",
    },
}

record.addProfile(HMCProfile, {
    datasetName: "My Dataset",
    authors: ["orcid1", "orcid2"],
})
