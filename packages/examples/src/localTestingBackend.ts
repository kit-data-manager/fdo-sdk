/**
 * A comprehensive example for `LocalTestingBackend`, the in-memory backend
 * that stands in for a real PID service during local testing.
 *
 * The example walks through the full lifecycle of a mapping:
 *
 *   1. Building a local graph of FDO records from two profiles
 *   2. Realizing bidirectional references via `MappingContext.build()`
 *   3. Publishing the built mapping result through a `PublishAdapter`
 *   4. Resolving records again through a `ResolveAdapter`
 *   5. The high level FDO record of the mapping and the published records,
 *      which hold no local IDs except their own
 *   6. Snapshot semantics of resolved records
 *   7. An update cycle (the same mapping procedure runs a second time on
 *      changed source data: modify, add and delete records, republish, PIDs
 *      stay stable)
 *   8. Isolation between mappings (scoped graphs, shared store)
 *   9. Publishing without a mapping (a single record or a whole graph)
 *   10. Resetting the store between test runs
 *
 * Everything is typed against the interfaces (`MappingContext`,
 * `MappingResult`, `PublishAdapter`, `ResolveAdapter`, `FDOGraph`,
 * `FDORecord`, `Profile`, ...) so the example would work unchanged with a
 * different context or backend implementation. The only concrete classes used
 * are `ConcreteMappingContext` (constructed, then consumed as
 * `MappingContext`), `ConcreteProfile` (the standard way to define a
 * profile) and `LocalTestingBackend` itself — the latter also exposes
 * `resetStore()` as a static method that no interface covers.
 */
import {
    ConcreteProfile,
    keep,
    reference,
    referenceBidi,
    skip,
    type Attribute,
    type LocalID,
    type PID,
    type Profile,
    type ProfileDefinition,
    type PublishedMappedFDORecord,
    type ReadOnlyFDOGraph,
} from "@fdo-sdk/primitives"
import {
    ConcreteMappingContext,
    LocalTestingBackend,
    type MappingContext,
    type MappingResult,
    type PublishAdapter,
    type PublishResult,
    type ResolveAdapter,
} from "@fdo-sdk/mapping"

// ---------------------------------------------------------------------------
// The domain: a small self-contained "dataset publishing" mapping with
// dataset records, author records and supplement records.
// ---------------------------------------------------------------------------

const mappingPID: PID = "TEST/mapping-example"
const otherMappingPID: PID = "TEST/mapping-other"

// Attribute definitions, shared by the profiles and the example code below.
const nameAttr: Attribute<string> = { pid: "attr/name", readableName: "name" }
const descriptionAttr: Attribute<string> = {
    pid: "attr/description",
    readableName: "description",
}
const keywordAttr: Attribute<string[]> = {
    pid: "attr/keyword",
    readableName: "keyword",
}
const licenseAttr: Attribute<string> = {
    pid: "attr/license",
    readableName: "license",
}
const hasAuthorAttr: Attribute<string[]> = {
    pid: "attr/hasAuthor",
    readableName: "hasAuthor",
}
const hasPartAttr: Attribute<string[]> = {
    pid: "attr/hasPart",
    readableName: "hasPart",
}
const affiliationAttr: Attribute<string> = {
    pid: "attr/affiliation",
    readableName: "affiliation",
}
const authoredDatasetsAttr: Attribute<string[]> = {
    pid: "attr/authoredDatasets",
    readableName: "authoredDatasets",
}
const titleAttr: Attribute<string> = {
    pid: "attr/title",
    readableName: "title",
}
const formatAttr: Attribute<string> = {
    pid: "attr/format",
    readableName: "format",
}

type DatasetAttributes = {
    name: string
    description: string
    keyword: string[]
    license: string
    hasAuthor: string[]
    hasPart: string[]
}

type AuthorAttributes = {
    name: string
    affiliation: string
    /** Back-reference, filled in by `MappingContext.build()` — see `skip()` below */
    authoredDatasets: string[]
}

const datasetDef: ProfileDefinition<DatasetAttributes> = {
    pid: "profile/dataset",
    readableName: "Dataset Profile",
    mapping: {
        name: nameAttr.pid,
        description: descriptionAttr.pid,
        keyword: keywordAttr.pid,
        license: licenseAttr.pid,
        hasAuthor: hasAuthorAttr.pid,
        hasPart: hasPartAttr.pid,
    },
}

const authorDef: ProfileDefinition<AuthorAttributes> = {
    pid: "profile/author",
    readableName: "Author Profile",
    mapping: {
        name: nameAttr.pid,
        affiliation: affiliationAttr.pid,
        authoredDatasets: authoredDatasetsAttr.pid,
    },
}

// Profiles are consumed through the `Profile` interface, so the concrete
// implementation behind them can be swapped without touching any consumer.
const DatasetProfile: Profile<DatasetAttributes> = new ConcreteProfile(
    datasetDef,
)
const AuthorProfile: Profile<AuthorAttributes> = new ConcreteProfile(authorDef)

// ---------------------------------------------------------------------------
// The source data: the input of the mapping procedure. The mapping is a pure
// function of this data, so running it again with changed data is what the
// update cycle in section 6 does.
// ---------------------------------------------------------------------------

type Supplement = {
    localID: LocalID
    title: string
    format: string
}

type SourceData = {
    datasetName: string
    supplements: Supplement[]
}

const initialSourceData: SourceData = {
    datasetName: "Climate Index 2026",
    supplements: [
        {
            localID: "LOCAL/supplement/code",
            title: "Companion analysis code",
            format: "text/x-python",
        },
    ],
}

const updatedSourceData: SourceData = {
    datasetName: "Climate Index 2026 (final)",
    supplements: [
        {
            localID: "LOCAL/supplement/notes",
            title: "Analysis notes",
            format: "text/markdown",
        },
    ],
}

// ---------------------------------------------------------------------------
// Helpers that only depend on interfaces
// ---------------------------------------------------------------------------

function section(title: string): void {
    console.log(`\n${"=".repeat(72)}`)
    console.log(title)
    console.log("=".repeat(72))
}

function show(label: string, value: unknown): void {
    const rendered =
        typeof value === "string" ? value : JSON.stringify(value, null, 2)
    console.log(`${label}: ${rendered}`)
}

/**
 * The mapping procedure: it maps the source data onto FDO records in the
 * local graph of the given context. It does not depend on the state of the
 * context, so it can be run as often as needed — every run fills a fresh
 * local graph.
 */
function mapping(context: MappingContext, source: SourceData): void {
    // Authors: the mandatory `authoredDatasets` back-reference is skipped here —
    // it will be filled in by `context.build()` once the datasets declare their
    // bidirectional references.
    const ada = context.newRecord("LOCAL/author/ada")
    ada.addProfile(AuthorProfile, {
        name: "Ada Lovelace",
        affiliation: "Analytical Engines Lab",
        authoredDatasets: skip(),
    })

    const grace = context.newRecord("LOCAL/author/grace")
    grace.addProfile(AuthorProfile, {
        name: "Grace Hopper",
        affiliation: "Naval Computing Lab",
        authoredDatasets: skip(),
    })

    // Supplements do not conform to any profile — plain attributes are fine too.
    for (const supplement of source.supplements) {
        const record = context.newRecord(supplement.localID)
        record.set(titleAttr, supplement.title)
        record.set(formatAttr, supplement.format)
    }

    // The dataset profile is filled from "source data": the description is set
    // first and then declared as `keep()`, the authors are declared as
    // bidirectional references and the supplements as unidirectional ones.
    const dataset = context.newRecord("LOCAL/dataset/climate-index")
    dataset.set(
        descriptionAttr,
        "A curated collection of yearly climate index measurements.",
    )
    dataset.addProfile(DatasetProfile, {
        name: source.datasetName,
        description: keep(), // already present on the record, see above
        keyword: ["climate", "index"],
        license: "CC-BY-4.0",
        hasAuthor: [
            referenceBidi(authoredDatasetsAttr, "LOCAL/author/ada"),
            referenceBidi(authoredDatasetsAttr, "LOCAL/author/grace"),
        ],
        hasPart: source.supplements.map((supplement) =>
            reference(supplement.localID),
        ),
    })
}

/**
 * Build the local graph of the context and publish the result. This is the
 * regular workflow of a mapping: the graph is built first, so that all
 * references are resolved, and only the built result is published.
 */
async function publishMapping(
    publisher: PublishAdapter,
    context: MappingContext,
): Promise<PublishResult> {
    const result = context.build()
    return await publisher.publishContinuous(result)
}

async function resolveMapping(
    resolver: ResolveAdapter,
    mappingPID: PID,
): Promise<ReadOnlyFDOGraph<PublishedMappedFDORecord>> {
    return await resolver.resolveMappingRecords(mappingPID)
}

function summarize(graph: ReadOnlyFDOGraph<PublishedMappedFDORecord>): unknown {
    return graph
        .getRecords()
        .map((record) => ({ localID: record.localID, PID: record.PID }))
}

// ---------------------------------------------------------------------------
// 1. Setup: a mapping context plus a backend used through its two adapters
// ---------------------------------------------------------------------------

section("1. Setup")

const context: MappingContext = new ConcreteMappingContext(mappingPID)

// LocalTestingBackend is the concrete class under test, but everything below
// only ever talks to it through the PublishAdapter / ResolveAdapter interfaces.
// The backend is not bound to a single mapping: the mapping is determined by
// the mapping result that is published, so one backend can serve any number
// of mappings (see section 8).
const backend: PublishAdapter & ResolveAdapter = new LocalTestingBackend()
const publisher: PublishAdapter = backend
const resolver: ResolveAdapter = backend

show("Mapping PID", mappingPID)
show("Fresh local graph records", context.localGraph.getRecords())

// ---------------------------------------------------------------------------
// 2. Build the local graph
// ---------------------------------------------------------------------------

section("2. Build the local graph")

mapping(context, initialSourceData)

show("Local graph (records with attributes)", context.localGraph.toJSON())

// ---------------------------------------------------------------------------
// 3. Realize bidirectional references
// ---------------------------------------------------------------------------

section("3. context.build() realizes the back-references")

// `build()` must run before the first publish: back-references are written as
// `record.PID ?? record.localID`, and at this point no record has a PID yet,
// so both directions consistently reference local IDs.
//
// The result of the build is the mapping result: the graph that is to be
// published, plus the PIDs of the records that are not part of the mapping
// anymore. Nothing was published before, so the latter list is empty.
const result: MappingResult = context.build()

show("Local graph (built)", context.localGraph.toJSON())
show("Deleted records", result.delete)
show(
    "ada.get(authoredDatasetsAttr)",
    context.localGraph.getRecord("LOCAL/author/ada")?.get(authoredDatasetsAttr),
)
show(
    "grace.get(authoredDatasetsAttr)",
    context.localGraph
        .getRecord("LOCAL/author/grace")
        ?.get(authoredDatasetsAttr),
)
show(
    "dataset.get(hasAuthorAttr)",
    context.localGraph
        .getRecord("LOCAL/dataset/climate-index")
        ?.get(hasAuthorAttr),
)

// ---------------------------------------------------------------------------
// 4. Publish the mapping result through the PublishAdapter
// ---------------------------------------------------------------------------

section("4. Publish the mapping result")

const dataset = context.localGraph.getRecord("LOCAL/dataset/climate-index")!

show("dataset.PID before publish", dataset.PID)

// `publishContinuous` publishes the result of a continuous mapping: the
// records of the mapping are published, the records that are not part of the
// mapping anymore are deleted, and the high level FDO record of the mapping
// is created or updated.
const publishResult: PublishResult = await publisher.publishContinuous(result)

show("dataset.PID after publish", dataset.PID)
show(
    "ada.PID after publish",
    context.localGraph.getRecord("LOCAL/author/ada")?.PID,
)
show("PID of the mapping", publishResult.mappingPID)
show("Published records of the mapping", summarize(publishResult.graph))
show("Deleted records", publishResult.deleted)

// ---------------------------------------------------------------------------
// 5. Resolve through the ResolveAdapter
// ---------------------------------------------------------------------------

section("5. Resolve the mapping records")

const published = await resolveMapping(resolver, mappingPID)
show("Resolved records", summarize(published))

// The mapping itself is a high level FDO record with the PID of the mapping.
// It references all the records that are part of the mapping, and every one
// of them points back to it.
const mappingRecord = await resolver.resolveRecord(mappingPID)
show("Mapping record (high level FDO record)", mappingRecord?.toJSON())
show(
    "Records point back to the mapping record",
    published.getRecords().map((record) => ({
        localID: record.localID,
        partOfMapping: record.get("attr/partOfMapping"),
    })),
)

// The published records contain no local IDs: the backend assigned a PID to
// every record and fixed up the references, so the references of the published
// records point to PIDs. The only local ID a published record holds is its own
// — in `attr/localId`, where it identifies the record for the mapping that
// published it.
show(
    "Local IDs left in the published records",
    published.getRecords().flatMap((record) =>
        Object.entries(record.toJSON()).flatMap(([attribute, value]) =>
            (Array.isArray(value) ? value : [value])
                .filter(
                    (entry) =>
                        typeof entry === "string" && entry.startsWith("LOCAL/"),
                )
                .map((entry) => ({
                    attribute,
                    localID: entry,
                    ownLocalID: record.localID,
                })),
        ),
    ),
)

// Resolved records are addressable by local ID...
const resolvedDataset = published.getRecord("LOCAL/dataset/climate-index")
show("Resolved dataset (by localID)", resolvedDataset)

// ...as well as by PID.
show(
    "Same record by PID",
    published.getRecord(dataset.PID!) === resolvedDataset,
)

// `resolveRecord` fetches a single record from the shared store, independent
// of any mapping. It returns undefined for unknown PIDs.
const single = await resolver.resolveRecord(dataset.PID!)
show("resolveRecord(dataset.PID)", single?.toJSON())
show(
    "resolveRecord(unknown PID)",
    await resolver.resolveRecord("TEST/does-not-exist"),
)

// ---------------------------------------------------------------------------
// 6. Resolved records are snapshots
// ---------------------------------------------------------------------------

section("6. Resolved records are snapshots")

dataset.set(nameAttr, "Climate Index 2026 (draft revision)")
show("local record after change", dataset.get(nameAttr))

const stale = await resolver.resolveRecord(dataset.PID!)
show("resolved record without republishing (unchanged)", stale?.get(nameAttr))

// ---------------------------------------------------------------------------
// 7. Update cycle: the same mapping procedure runs a second time
// ---------------------------------------------------------------------------

section("7. Update cycle")

// The update cycle is a second run of the very same mapping procedure: the
// published records are resolved again and become the remote graph of a new
// context. The mapping is run again on changed source data, the new context
// is built and the new mapping result is published.
//
// The backend keeps the PID of a record stable as long as it is published
// under the same local ID, so the dataset keeps its PID even though it is
// mapped from scratch.
const publishedRecords = await resolveMapping(resolver, mappingPID)
const updateContext: MappingContext = new ConcreteMappingContext(
    mappingPID,
    publishedRecords,
)

mapping(updateContext, updatedSourceData)

const updateResult = updateContext.build()

// The supplement of the first run is not part of the mapping anymore, so the
// context reports its PID as deleted.
show("Deleted records", updateResult.delete)

await publisher.publishContinuous(updateResult)

show(
    "Mapping record after update",
    (await resolver.resolveRecord(mappingPID))?.toJSON(),
)

const updated = await resolveMapping(resolver, mappingPID)
show("Resolved records after update", summarize(updated))
show(
    "PID of the dataset is stable",
    updated.getRecord("LOCAL/dataset/climate-index")?.PID === dataset.PID,
)
show(
    "Updated attribute value",
    updated.getRecord("LOCAL/dataset/climate-index")?.get(nameAttr),
)
show(
    "New supplement record",
    updated.getRecord("LOCAL/supplement/notes")?.toJSON(),
)
show(
    "Supplement that is not part of the mapping anymore",
    updated.getRecord("LOCAL/supplement/code"),
)
show(
    "hasPart now references the new supplement",
    updated.getRecord("LOCAL/dataset/climate-index")?.get(hasPartAttr),
)

// ---------------------------------------------------------------------------
// 8. Mapping isolation: scoped graphs over a shared store
// ---------------------------------------------------------------------------

section("8. Mapping isolation")

// A second, independent mapping, published through the very same backend: the
// backend is not bound to a single mapping. All backend instances share one
// store, so the records of the other mapping are visible to the first mapping
// as well.
const otherContext: MappingContext = new ConcreteMappingContext(otherMappingPID)

const release = otherContext.newRecord("LOCAL/release/v1")
release.set(titleAttr, "Climate Index 2026 release announcement")
await publishMapping(publisher, otherContext)

const otherPublished = await resolveMapping(resolver, otherMappingPID)
show("Records of the other mapping", summarize(otherPublished))
show(
    "Mapping record of the other mapping",
    (await resolver.resolveRecord(otherMappingPID))?.toJSON(),
)
show(
    "The other mapping does not see this mapping's records",
    otherPublished.getRecord("LOCAL/dataset/climate-index") === undefined,
)
show(
    "This mapping does not see the other mapping's records",
    published.getRecord("LOCAL/release/v1") === undefined,
)
show(
    "resolveRecord is not mapping-scoped (shared store)",
    (await resolver.resolveRecord(dataset.PID!))?.PID,
)

// ---------------------------------------------------------------------------
// 9. Publishing without a mapping
// ---------------------------------------------------------------------------

section("9. Publishing without a mapping")

// Not every published record belongs to a mapping: a single record or a whole
// graph can be published on its own. `publishRecord` and `publishGraph` do not
// create a high level FDO record of a mapping, and the published records do
// not point back to one. They are published all the same: they get a PID, they
// are stored and they can be resolved.

const noticeContext: MappingContext = new ConcreteMappingContext("TEST/notice")
const notice = noticeContext.newRecord("LOCAL/notice")
notice.set(titleAttr, "Climate Index 2026 release announcement")

const publishedNotice = await publisher.publishRecord(notice)

show("Published record", publishedNotice.toJSON())
show("PID of the published record", publishedNotice.PID)
show("The record keeps its own local ID", publishedNotice.get("attr/localId"))
show(
    "The record does not point back to a mapping",
    publishedNotice.get("attr/partOfMapping"),
)

// A whole graph, published on its own. The dataset references the part, and
// the reference is fixed up to the PID the part was published with.
const graphContext: MappingContext = new ConcreteMappingContext("TEST/graph")
const graphDataset = graphContext.newRecord("LOCAL/graph/dataset")
graphDataset.addReference(hasPartAttr, "LOCAL/graph/part")

const publishedGraph = await publisher.publishGraph(graphContext.localGraph)

show(
    "Published graph",
    publishedGraph.getRecords().map((record) => ({
        PID: record.PID,
        attributes: record.toJSON(),
    })),
)
show(
    "The reference of the graph is fixed up to a PID",
    publishedGraph.getRecord(graphDataset.PID!)?.get(hasPartAttr),
)

// The published records are not part of any mapping: the mapping of the
// example does not contain them, and there is no high level FDO record for
// them.
show(
    "The published records are not part of the mapping",
    (await resolveMapping(resolver, mappingPID)).getRecord("LOCAL/notice") ===
        undefined,
)
show(
    "There is no high level FDO record for them",
    await resolver.resolveRecord("TEST/notice"),
)
show(
    "The published record is resolvable all the same",
    (await resolver.resolveRecord(publishedNotice.PID))?.get(titleAttr),
)

// ---------------------------------------------------------------------------
// 10. Reset the store between test runs
// ---------------------------------------------------------------------------

section("10. Reset the store")

// `resetStore` is a static method on the class — the one piece of the API not
// covered by the PublishAdapter / ResolveAdapter interfaces.
LocalTestingBackend.resetStore()

try {
    await resolveMapping(resolver, mappingPID)
} catch (error) {
    show(
        "resolveMappingRecords after reset",
        error instanceof Error ? error.message : String(error),
    )
}
show("resolveRecord after reset", await resolver.resolveRecord(dataset.PID!))

console.log("\nDone.")
