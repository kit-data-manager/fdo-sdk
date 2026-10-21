/**
 * A comprehensive example for `LocalTestingBackend`, the in-memory backend
 * that stands in for a real PID service during local testing.
 *
 * The example walks through the full lifecycle of a mapping:
 *
 *   1. Building a local graph of FDO records from two profiles
 *   2. Realizing bidirectional references via `FDOGraph.build()`
 *   3. Publishing the graph through a `PublishAdapter`
 *   4. Resolving records again through a `ResolveAdapter`
 *   5. Snapshot semantics of resolved records
 *   6. An update cycle (modify + add records, republish, PIDs stay stable)
 *   7. Isolation between mappings (scoped graphs, shared store)
 *   8. Resetting the store between test runs
 *
 * Everything is typed against the interfaces (`MappingContext`,
 * `PublishAdapter`, `ResolveAdapter`, `FDOGraph`, `FDORecord`, `Profile`, ...)
 * so the example would work unchanged with a different context or backend
 * implementation. The only concrete classes used are `ConcreteMappingContext`
 * (constructed, then consumed as `MappingContext`), `ConcreteProfile` (the
 * standard way to define a profile) and `LocalTestingBackend` itself — the
 * latter also exposes `resetStore()` as a static method that no interface
 * covers.
 */
import {
    ConcreteProfile,
    keep,
    reference,
    referenceBidi,
    skip,
    type Attribute,
    type FDOGraph,
    type PID,
    type Profile,
    type ProfileDefinition,
    type PublishedMappedFDORecord,
} from "@fdo-sdk/primitives"
import {
    ConcreteMappingContext,
    LocalTestingBackend,
    type MappingContext,
    type PublishAdapter,
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
    /** Back-reference, filled in by `FDOGraph.build()` — see `skip()` below */
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

async function publish(
    publisher: PublishAdapter,
    graph: FDOGraph,
): Promise<void> {
    await publisher.publishGraph(graph)
}

async function resolveMapping(
    resolver: ResolveAdapter,
    mappingPID: PID,
): Promise<FDOGraph<PublishedMappedFDORecord>> {
    return await resolver.resolveMappingRecords(mappingPID)
}

function summarize(graph: FDOGraph<PublishedMappedFDORecord>): unknown {
    return graph
        .getRecords()
        .map((record) => ({ localID: record.localID, PID: record.PID }))
}

// ---------------------------------------------------------------------------
// 1. Setup: a mapping context plus a backend used through its two adapters
// ---------------------------------------------------------------------------

section("1. Setup")

const context: MappingContext = new ConcreteMappingContext()

// LocalTestingBackend is the concrete class under test, but everything below
// only ever talks to it through the PublishAdapter / ResolveAdapter interfaces.
const backend: PublishAdapter & ResolveAdapter = new LocalTestingBackend(
    mappingPID,
)
const publisher: PublishAdapter = backend
const resolver: ResolveAdapter = backend

show("Mapping PID", mappingPID)
show("Fresh local graph records", context.localGraph.getRecords())

// ---------------------------------------------------------------------------
// 2. Build the local graph
// ---------------------------------------------------------------------------

section("2. Build the local graph")

// Authors: the mandatory `authoredDatasets` back-reference is skipped here —
// it will be filled in by `localGraph.build()` once the datasets declare their
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
const code = context.newRecord("LOCAL/supplement/code")
code.set(titleAttr, "Companion analysis code")
code.set(formatAttr, "text/x-python")

// The dataset profile is filled from "source data": the description is set
// first and then declared as `keep()`, the authors are declared as
// bidirectional references and the supplement as a unidirectional one.
const dataset = context.newRecord("LOCAL/dataset/climate-index")
dataset.set(
    descriptionAttr,
    "A curated collection of yearly climate index measurements.",
)
dataset.addProfile(DatasetProfile, {
    name: "Climate Index 2026",
    description: keep(), // already present on the record, see above
    keyword: ["climate", "index"],
    license: "CC-BY-4.0",
    hasAuthor: [
        referenceBidi(authoredDatasetsAttr, "LOCAL/author/ada"),
        referenceBidi(authoredDatasetsAttr, "LOCAL/author/grace"),
    ],
    hasPart: [reference("LOCAL/supplement/code")],
})

show("Local graph (records with attributes)", context.localGraph.toJSON())

// ---------------------------------------------------------------------------
// 3. Realize bidirectional references
// ---------------------------------------------------------------------------

section("3. localGraph.build() realizes the back-references")

// `build()` must run before the first publish: back-references are written as
// `record.PID ?? record.localID`, and at this point no record has a PID yet,
// so both directions consistently reference local IDs.
context.localGraph.build()

show("ada.get(authoredDatasetsAttr)", ada.get(authoredDatasetsAttr))
show("grace.get(authoredDatasetsAttr)", grace.get(authoredDatasetsAttr))
show("dataset.get(hasAuthorAttr)", dataset.get(hasAuthorAttr))

// ---------------------------------------------------------------------------
// 4. Publish through the PublishAdapter
// ---------------------------------------------------------------------------

section("4. Publish the local graph")

show("dataset.PID before publish", dataset.PID)
await publish(publisher, context.localGraph)
show("dataset.PID after publish", dataset.PID)
show("ada.PID after publish", ada.PID)

// ---------------------------------------------------------------------------
// 5. Resolve through the ResolveAdapter
// ---------------------------------------------------------------------------

section("5. Resolve the mapping records")

const published = await resolveMapping(resolver, mappingPID)
show("Resolved records", summarize(published))

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
// 7. Update cycle: modify, add, republish — PIDs stay stable
// ---------------------------------------------------------------------------

section("7. Update cycle")

const previousDatasetPID = dataset.PID!

// Changes to an existing record...
dataset.set(nameAttr, "Climate Index 2026 (final)")

// ...and a brand-new record. Only unidirectional references are added here,
// because `build()` is one-shot and has already run.
const notes = context.newRecord("LOCAL/supplement/notes")
notes.set(titleAttr, "Analysis notes")
notes.set(formatAttr, "text/markdown")
dataset.addReference(hasPartAttr, "LOCAL/supplement/notes")

await publish(publisher, context.localGraph)

const updated = await resolveMapping(resolver, mappingPID)
show("Resolved records after update", summarize(updated))
show(
    "PID of the dataset is stable",
    updated.getRecord("LOCAL/dataset/climate-index")?.PID ===
        previousDatasetPID,
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
    "hasPart now references both supplements",
    updated.getRecord("LOCAL/dataset/climate-index")?.get(hasPartAttr),
)

// ---------------------------------------------------------------------------
// 8. Mapping isolation: scoped graphs over a shared store
// ---------------------------------------------------------------------------

section("8. Mapping isolation")

// A second, independent mapping. All LocalTestingBackend instances share one
// store, so its records are visible to the first mapping's backend as well.
const otherContext: MappingContext = new ConcreteMappingContext()
const otherBackend: PublishAdapter & ResolveAdapter = new LocalTestingBackend(
    otherMappingPID,
)
const otherResolver: ResolveAdapter = otherBackend

const release = otherContext.newRecord("LOCAL/release/v1")
release.set(titleAttr, "Climate Index 2026 release announcement")
await publish(otherBackend, otherContext.localGraph)

const otherPublished = await resolveMapping(otherResolver, otherMappingPID)
show("Records of the other mapping", summarize(otherPublished))
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
    (await otherResolver.resolveRecord(previousDatasetPID))?.PID,
)

// ---------------------------------------------------------------------------
// 9. Reset the store between test runs
// ---------------------------------------------------------------------------

section("9. Reset the store")

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
show(
    "resolveRecord after reset",
    await resolver.resolveRecord(previousDatasetPID),
)

console.log("\nDone.")
