import type { RecordSnapshot } from "../runner/snapshot.js"

function formatAttributeValue(value: string | string[]): string {
    return Array.isArray(value) ? value.join(", ") : value
}

export function RecordCard({ record }: { record: RecordSnapshot }) {
    return (
        <article className="record-card">
            <header className="record-header">
                <code className="record-id">{record.id}</code>
                {record.pid !== undefined && record.pid !== record.id && (
                    <code className="chip" title="Persistent identifier">
                        {record.pid}
                    </code>
                )}
                {record.profiles.map((profile) => (
                    <code className="chip chip-profile" key={profile}>
                        {profile}
                    </code>
                ))}
            </header>
            <dl className="record-attributes">
                {record.attributes.map((attribute) => (
                    <div className="record-attribute" key={attribute.pid}>
                        <dt>
                            <code>{attribute.pid}</code>
                        </dt>
                        <dd>{formatAttributeValue(attribute.value)}</dd>
                    </div>
                ))}
            </dl>
            {record.references.length > 0 && (
                <ul className="record-references">
                    {record.references.map((reference, index) => (
                        <li
                            key={`${reference.attribute}-${reference.target}-${index}`}
                        >
                            <code>{reference.attribute}</code>
                            <span
                                className="reference-arrow"
                                title={
                                    reference.direction === "bidi"
                                        ? "bidirectional reference"
                                        : "unidirectional reference"
                                }
                            >
                                {reference.direction === "bidi" ? "↔" : "→"}
                            </span>
                            <code>{reference.target}</code>
                        </li>
                    ))}
                </ul>
            )}
        </article>
    )
}

export function RecordList({ records }: { records: RecordSnapshot[] }) {
    if (records.length === 0) {
        return <p className="empty">No records in this graph.</p>
    }
    return (
        <ul className="record-list">
            {records.map((record) => (
                <li key={record.id}>
                    <RecordCard record={record} />
                </li>
            ))}
        </ul>
    )
}
