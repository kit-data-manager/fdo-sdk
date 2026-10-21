import type {
    WithMarkers,
    LocalID,
    PID,
    ProfileAttributes,
    RecordValue,
    ReferenceDeclaration,
} from "../types.js"
import type { Profile } from "./Profile.js"
import type { Attribute } from "./Attribute.js"

export interface LocalFDORecord extends FDORecord {
    /**
     * The locally unique identifier of this record
     */
    readonly localID: LocalID
}

export interface PublishedFDORecord extends FDORecord {
    /**
     * The globally unique and registered identifier of this record.
     */
    readonly PID: PID
}

export interface PublishedLocalFDORecord
    extends Omit<LocalFDORecord, "PID">, PublishedFDORecord {}

/**
 * Represents a single FDO record that is associated with a local identifier and
 * optionally with a registered {@link PID}.
 *
 * A record consists of attributes, each with one or more values. Each attribute
 * is uniquely identified by its {@link PID}.
 */
export interface FDORecord extends ReadOnlyFDORecord {
    /**
     * Set the value of the specified attribute. Will add the attribute to the record
     * if it does not exist yet. Will replace (all) existing value(s) of this attribute
     * with the specified value.
     * @param attribute {@link PID} of the attribute.
     * @param value New value of the attribute. Can be an array to add multiple values, if allowed by the attribute.
     */
    set(attribute: PID, value: RecordValue): void

    /**
     * Set the value of the specified attribute. Will add the attribute to the record
     * if it does not exist yet. Will replace (all) existing value(s) of this attribute
     * with the specified value.
     * @param attribute {@link Attribute} instance of the attribute.
     * @param value New value of the attribute. Can be an array to add multiple values, if allowed by the attribute.
     */
    set<T extends RecordValue>(attribute: Attribute<T>, value: T): void

    /**
     * Remove the attribute and all its values from the record
     * @param attribute {@link PID} or {@link Attribute} instance of the attribute
     */
    remove(attribute: PID | Attribute<never>): void

    /**
     * Add the contents of another record to this record. This method does not
     * override existing data.
     * @param record Other {@link FDORecord} to copy attributes from
     */
    addRecord(record: FDORecord): void

    /**
     * Add an attribute to the record. This method does not override existing
     * data.
     * @param attribute {@link PID} of the attribute
     * @param value New value of the attribute. Can be an array to add multiple values, if allowed by the attribute.
     */
    addAttribute(attribute: PID, value: RecordValue): void

    /**
     * Add an attribute to the record. This method does not override existing
     * data.
     * @param attribute {@link Attribute} instance of the attribute
     * @param value New value of the attribute. Can be an array to add multiple values, if allowed by the attribute.
     */
    addAttribute<Attr extends Attribute<RecordValue>>(
        attribute: Attr,
        value: Attr extends Attribute<infer T> ? T : never,
    ): void

    /**
     * Mark this record as conformant to the specified profile and add at least
     * the required attributes of the profile.
     * @param profile The profile to conform to
     * @param attributes An object containing at least all required attributes of the profile. May also contain optional attributes. You may use {@link reference}, {@link keep} and {@link skip}.
     */
    addProfile<P extends Profile<ProfileAttributes>>(
        profile: P,
        attributes: P extends Profile<infer A> ? WithMarkers<A> : never,
    ): void

    /**
     * Add a unidirectional reference from this record to another record. The target record must either
     * be known locally or be resolvable via its PID
     * @param fromAttribute The attribute of this record where the reference will be placed
     * @param toRecord local ID ({@link LocalID}) or {@link PID} of the referenced record. Must either
     * be known locally or be resolvable via its PID
     * @see {@link FDORecord.addReferenceBidi} for bidirectional references
     */
    addReference(
        fromAttribute: PID | Attribute<PID | PID[]>,
        toRecord: PID | LocalID | FDORecord,
    ): void

    /**
     * Add a bidirectional reference from this record to another record and back.
     * The target record must be in the current local or remote graph in order to
     * create the back-reference
     * @param fromAttribute The attribute of this record where the reference will be placed
     * @param toAttribute The attribute of the target record where the back-reference will be placed
     * @param toRecord local ID ({@link LocalID}) or {@link PID} of the referenced record. Must either
     * be known locally or be resolvable via its PID
     * @see {@link FDORecord.addReference} for unidirectional references
     */
    addReferenceBidi(
        fromAttribute: PID | Attribute<PID | PID[]>,
        toAttribute: PID | Attribute<PID | PID[]>,
        toRecord: PID | LocalID | FDORecord,
    ): void
}

/**
 * Represents a single FDO record that is associated with a local identifier and
 * optionally with a registered {@link PID}. Read-only.
 *
 * A record consists of attributes, each with one or more values. Each attribute
 * is uniquely identified by its {@link PID}.
 */
export interface ReadOnlyFDORecord {
    /**
     * The globally unique and registered identifier of this record. Undefined
     * only if this record has not been published yet.
     */
    readonly PID: PID | undefined

    /**
     * Retrieve the values(s) of an attribute in this record.
     * @param attribute {@link PID} or {@link Attribute} instance of the attribute
     * @returns the value of the attribute, or undefined if the attribute is not present on this record
     */
    get(attribute: PID | Attribute<never>): RecordValue | undefined

    /**
     * Get a map of all attributes present on this record
     * @returns a map of attribute PIDs to attribute values
     */
    getAll(): Map<PID, RecordValue>

    /**
     * Get a list of outgoing references from this record to other records. Locally
     * used to realize bidirectional references when the FDO Graph is published.
     */
    getReferences(): ReferenceDeclaration[]

    /**
     * Get a list of profiles this record conforms to. Can be used for validation.
     * Each profile is globally identified by its PID.
     */
    getProfiles(): PID[]

    /**
     * Check whether a specific attribute is present on this record
     * @param attribute {@link PID} or {@link Attribute} instance of the attribute
     */
    has(attribute: PID | Attribute<never>): boolean

    /**
     * Returns the contents of this record in a plain format, to be used with
     * {@link JSON.stringify}
     */
    toJSON(): Record<string, RecordValue>

    /**
     * Returns the content of this record as a string, mainly useful for
     * logging and debugging.
     */
    toString(): string
}
