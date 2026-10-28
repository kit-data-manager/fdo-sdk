export type Example = {
    id: string
    title: string
    description: string
    source: string
}

export const EXAMPLES: Example[] = [
    {
        id: "records",
        title: "Records & profiles",
        description:
            "Build records with profiles, markers and references, publish them and resolve them back.",
        source: `// Build FDO records with profiles, markers and references, then publish
// them with the playground backend. The published graph on the right shows
// the current state of the store after every publish.
import {
    ConcreteLocalFDORecord,
    ConcreteProfile,
    LocalFDOGraph,
    keep,
    reference,
    referenceBidi,
    skip,
} from "@fdo-sdk/primitives"
import { PlaygroundBackend } from "@fdo-sdk/playground"

PlaygroundBackend.resetStore()
const backend = new PlaygroundBackend()

// Attributes are globally identified by a PID.
const nameAttr = { pid: "attr/name", readableName: "name" }
const descriptionAttr = { pid: "attr/description", readableName: "description" }
const titleAttr = { pid: "attr/title", readableName: "title" }
const hasAuthorAttr = { pid: "attr/hasAuthor", readableName: "hasAuthor" }
const authoredAttr = { pid: "attr/authoredDatasets", readableName: "authoredDatasets" }
const hasPartAttr = { pid: "attr/hasPart", readableName: "hasPart" }

// A profile bundles attributes: the keys are readable names, the values
// the attribute PIDs the values are stored under.
const datasetProfile = new ConcreteProfile({
    pid: "profile/dataset",
    readableName: "Dataset",
    mapping: {
        name: nameAttr.pid,
        description: descriptionAttr.pid,
        hasAuthor: hasAuthorAttr.pid,
        hasPart: hasPartAttr.pid,
    },
})
const authorProfile = new ConcreteProfile({
    pid: "profile/author",
    readableName: "Author",
    mapping: { name: nameAttr.pid, authoredDatasets: authoredAttr.pid },
})

// Records are created with local IDs. The back-references of the
// bidirectional references below do not exist yet - build() writes them.
const graph = new LocalFDOGraph()

const ada = new ConcreteLocalFDORecord("LOCAL/author/ada")
ada.addProfile(authorProfile, {
    name: "Ada Lovelace",
    authoredDatasets: skip(),
})
const grace = new ConcreteLocalFDORecord("LOCAL/author/grace")
grace.addProfile(authorProfile, {
    name: "Grace Hopper",
    authoredDatasets: skip(),
})

const supplement = new ConcreteLocalFDORecord("LOCAL/supplement/code")
supplement.set(titleAttr, "Companion analysis code")

const dataset = new ConcreteLocalFDORecord("LOCAL/dataset/climate-index")
dataset.set(descriptionAttr, "A curated collection of climate measurements.")
dataset.addProfile(datasetProfile, {
    name: "Climate Index 2026",
    description: keep(),
    hasAuthor: [
        referenceBidi(authoredAttr, "LOCAL/author/ada"),
        referenceBidi(authoredAttr, "LOCAL/author/grace"),
    ],
    hasPart: [reference("LOCAL/supplement/code")],
})

for (const record of [ada, grace, supplement, dataset]) graph.addRecord(record)
graph.build()

console.log("Local graph:", graph.toJSON())

// Publishing assigns a PID to every record and fixes the references up to
// PIDs. Every record keeps its own local ID in attr/localId. The published
// graph on the right is updated as soon as the store changes.
const published = await backend.publishGraph(graph)
console.log("Published:", published.toJSON())

// Published records can be resolved again, by PID or by local ID.
const resolved = await backend.resolveRecord(dataset.PID)
console.log("Resolved dataset:", resolved.toJSON())
`,
    },
    {
        id: "continuous-mapping",
        title: "Continuous mapping",
        description:
            "Run a mapping twice on changed source data: resolve, diff and republish while PIDs stay stable.",
        source: `// A continuous mapping keeps published records in sync with changed
// source data: run the mapping, build a diff against the remote graph,
// publish, and only the changed records are created, updated or deleted.
// The log tells you exactly which records were created, updated and deleted,
// and the published graph on the right always shows the current store.
import { ConcreteProfile, reference, referenceBidi, skip } from "@fdo-sdk/primitives"
import { ContinuousMappingContext } from "@fdo-sdk/mapping"
import { PlaygroundBackend } from "@fdo-sdk/playground"

PlaygroundBackend.resetStore()
const backend = new PlaygroundBackend()
const mappingPID = "TEST/mapping-climate"

const nameAttr = { pid: "attr/name", readableName: "name" }
const titleAttr = { pid: "attr/title", readableName: "title" }
const hasAuthorAttr = { pid: "attr/hasAuthor", readableName: "hasAuthor" }
const authoredAttr = { pid: "attr/authoredDatasets", readableName: "authoredDatasets" }
const hasPartAttr = { pid: "attr/hasPart", readableName: "hasPart" }

const datasetProfile = new ConcreteProfile({
    pid: "profile/dataset",
    readableName: "Dataset",
    mapping: { name: nameAttr.pid, hasAuthor: hasAuthorAttr.pid, hasPart: hasPartAttr.pid },
})
const authorProfile = new ConcreteProfile({
    pid: "profile/author",
    readableName: "Author",
    mapping: { name: nameAttr.pid, authoredDatasets: authoredAttr.pid },
})

// The mapping is a pure function of the source data and the context, so it
// can be run as often as needed - every run fills a fresh local graph.
function mapping(context, source) {
    for (const author of source.authors) {
        const record = context.newRecord(author.localID)
        record.addProfile(authorProfile, {
            name: author.name,
            authoredDatasets: skip(),
        })
    }
    for (const supplement of source.supplements) {
        const record = context.newRecord(supplement.localID)
        record.set(titleAttr, supplement.title)
    }
    const dataset = context.newRecord("LOCAL/dataset/climate-index")
    dataset.addProfile(datasetProfile, {
        name: source.datasetName,
        hasAuthor: source.authors.map((author) =>
            referenceBidi(authoredAttr, author.localID),
        ),
        hasPart: source.supplements.map((supplement) =>
            reference(supplement.localID),
        ),
    })
}

const initialData = {
    datasetName: "Climate Index 2026",
    authors: [
        { localID: "LOCAL/author/ada", name: "Ada Lovelace" },
        { localID: "LOCAL/author/grace", name: "Grace Hopper" },
    ],
    supplements: [
        { localID: "LOCAL/supplement/code", title: "Companion analysis code" },
    ],
}

// Run 1: publish the initial mapping.
const firstContext = new ContinuousMappingContext(mappingPID)
mapping(firstContext, initialData)
const firstResult = firstContext.build()
await backend.publishContinuous(firstResult)

// Run 2: changed source data. The remote graph is resolved into a fresh
// context, so build() produces create/update/delete diffs. PIDs stay
// stable for records that are still part of the mapping.
const updatedData = {
    datasetName: "Climate Index 2026 (final)",
    authors: initialData.authors,
    supplements: [
        { localID: "LOCAL/supplement/notes", title: "Analysis notes" },
    ],
}

const updateContext = new ContinuousMappingContext(mappingPID)
await updateContext.resolveRemoteGraph(backend)
mapping(updateContext, updatedData)
const updateResult = updateContext.build()
console.log("Deleted records:", updateResult.delete)
await backend.publishContinuous(updateResult)

// The mapping itself is a high level record that references all of its
// records - every record points back to it via attr/partOfMapping. Its
// edges are drawn muted in the graph. All records stay in the published
// graph on the right, with stable PIDs.
const mappingRecord = await backend.resolveRecord(mappingPID)
console.log("Mapping record:", mappingRecord.toJSON())
`,
    },
    {
        id: "plain-records",
        title: "Plain records",
        description:
            "Records without profiles: plain attributes, unidirectional and bidirectional references.",
        source: `// Records do not need profiles: plain attributes and references are
// enough. This example shows the raw record API of the primitives package.
import { ConcreteLocalFDORecord, LocalFDOGraph } from "@fdo-sdk/primitives"
import { PlaygroundBackend } from "@fdo-sdk/playground"

PlaygroundBackend.resetStore()
const backend = new PlaygroundBackend()

const titleAttr = { pid: "attr/title", readableName: "title" }
const relatedAttr = { pid: "attr/related", readableName: "related" }
const mentionsAttr = { pid: "attr/mentions", readableName: "mentions" }
const mentionedInAttr = { pid: "attr/mentionedIn", readableName: "mentionedIn" }

const graph = new LocalFDOGraph()

const paper = new ConcreteLocalFDORecord("LOCAL/paper")
paper.set(titleAttr, "FDOs in practice")

const dataset = new ConcreteLocalFDORecord("LOCAL/dataset")
dataset.set(titleAttr, "Reproducibility dataset")

const author = new ConcreteLocalFDORecord("LOCAL/author")
author.set(titleAttr, "Jane Doe")

// Unidirectional reference: paper -> dataset ...
paper.addReference(relatedAttr, dataset)
// ... and a bidirectional one: build() writes the back-reference on the
// dataset under the given attribute.
paper.addReferenceBidi(mentionsAttr, mentionedInAttr, dataset)

for (const record of [paper, dataset, author]) graph.addRecord(record)
graph.build()

const published = await backend.publishGraph(graph)
console.log("Published paper:", paper.toJSON())
`,
    },
]
