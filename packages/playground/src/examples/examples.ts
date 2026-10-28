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
            "Build records with the simple types profiles, markers and references, publish them and resolve them back.",
        source: `// Build FDO records with the profiles and attributes of
// @fdo-sdk/simple-types - the simple types used for testing in the
// department - and publish them with the playground backend. The published
// graph on the right shows the current state of the store after every
// publish.
import {
    ConcreteLocalFDORecord,
    LocalFDOGraph,
    keep,
    referenceBidi,
    reference,
    skip,
} from "@fdo-sdk/primitives"
import { SIMPLE_ATTRIBUTES, SIMPLE_PROFILES } from "@fdo-sdk/simple-types"
import { PlaygroundBackend } from "@fdo-sdk/playground"

const backend = new PlaygroundBackend()
const graph = new LocalFDOGraph()

// A software repository with the simple software profile. Every value is
// stored under the attribute PID the profile maps the readable name to;
// skip() leaves an attribute out even though the profile declares it.
const software = new ConcreteLocalFDORecord("LOCAL/software/climate-tools")
software.addProfile(SIMPLE_PROFILES.SOFTWARE, {
    softwareRepositoryType: "git",
    softwareLocation: "https://github.com/example/climate-tools",
    softwareLicense: "MIT",
    readmeLocation: skip(),
})

// A data object of the software, with the data object profile. keep()
// keeps a value that was set on the record before the profile was applied.
const measurements = new ConcreteLocalFDORecord(
    "LOCAL/data-object/measurements",
)
measurements.set(SIMPLE_ATTRIBUTES.DATA_OBJECT_LICENSE, "CC-BY-4.0")
measurements.addProfile(SIMPLE_PROFILES.DATA_OBJECT, {
    dataObjectLocation: "https://example.org/data/measurements.nc",
    dataObjectLicense: keep(),
    mimeType: "application/netcdf",
    createdWithSoftware: reference(software)
})

const analysis = new ConcreteLocalFDORecord("LOCAL/data-object/analysis")
analysis.addProfile(SIMPLE_PROFILES.DATA_OBJECT, {
    dataObjectLocation: "https://example.org/data/analysis.csv",
    dataObjectLicense: "CC-BY-4.0",
    mimeType: "text/csv",
    createdWithSoftware: reference(software)
})

// Records do not need a profile: the two creators of the publication are
// plain records that only serve as reference targets for now.
const ada = new ConcreteLocalFDORecord("LOCAL/person/ada")
const grace = new ConcreteLocalFDORecord("LOCAL/person/grace")

// A publication describing the data objects. Profile values can be
// reference markers as well: publicationCreator links to the creator
// records, and build() writes the back-references on them.
const publication = new ConcreteLocalFDORecord(
    "LOCAL/publication/climate-index",
)
publication.addProfile(SIMPLE_PROFILES.PUBLICATION, {
    doi: "10.1234/climate-index-2026",
    publicationTitle: "Climate Index 2026",
    publicationCreator: [
        referenceBidi(
            SIMPLE_ATTRIBUTES.PUBLICATION_CREATOR,
            ada,
        ),
        referenceBidi(
            SIMPLE_ATTRIBUTES.PUBLICATION_CREATOR,
            grace,
        ),
    ],
    hasPart: [
        referenceBidi(
            SIMPLE_ATTRIBUTES.IS_PART_OF, 
            measurements
        ), 
        referenceBidi(
            SIMPLE_ATTRIBUTES.IS_PART_OF, 
            analysis
        )
    ]
})

for (const record of [
    software,
    measurements,
    analysis,
    ada,
    grace,
    publication,
]) {
    graph.addRecord(record)
}

// Publishing assigns a PID to every record and fixes the references up to
// PIDs. The published graph on the right is updated as soon as the store
// changes.
await backend.publishGraph(graph)

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
// The log tells you exactly which records were created, updated and
// deleted, and the published graph on the right always shows the current
// store.
import { skip } from "@fdo-sdk/primitives"
import { SIMPLE_PROFILES } from "@fdo-sdk/simple-types"
import { ContinuousMappingContext } from "@fdo-sdk/mapping"
import { PlaygroundBackend } from "@fdo-sdk/playground"

const backend = new PlaygroundBackend()
const mappingPID = "TEST/mapping-climate-software"

// The mapping is a pure function of the source data and the context, so it
// can be run as often as needed - every run fills a fresh local graph.
function mapping(context, source) {
    const software = context.newRecord(source.software.localID)
    software.addProfile(SIMPLE_PROFILES.SOFTWARE, {
        softwareRepositoryType: source.software.repositoryType,
        softwareLocation: source.software.location,
        softwareLicense: source.software.license,
        readmeLocation: skip(),
    })
    for (const file of source.dataObjects) {
        const record = context.newRecord(file.localID)
        record.addProfile(SIMPLE_PROFILES.DATA_OBJECT, {
            dataObjectLocation: file.location,
            dataObjectLicense: file.license,
            mimeType: file.mimeType,
        })
    }
}

const measurementsSource = {
    localID: "LOCAL/data-object/measurements",
    location: "https://example.org/data/measurements.nc",
    license: "CC-BY-4.0",
    mimeType: "application/netcdf",
}
const analysisSource = {
    localID: "LOCAL/data-object/analysis",
    location: "https://example.org/data/analysis.csv",
    license: "CC-BY-4.0",
    mimeType: "text/csv",
}
const initialData = {
    software: {
        localID: "LOCAL/software/climate-tools",
        repositoryType: "git",
        location: "https://github.com/example/climate-tools",
        license: "MIT",
    },
    dataObjects: [measurementsSource, analysisSource],
}

// Run 1: publish the initial mapping.
const firstContext = new ContinuousMappingContext(mappingPID)
mapping(firstContext, initialData)
const firstResult = firstContext.build()
await backend.publishContinuous(firstResult)

// Run 2: changed source data - the software was relicensed and one data
// object was replaced by a new version. The remote graph is resolved into
// a fresh context, so build() produces create/update/delete diffs. PIDs
// stay stable for records that are still part of the mapping.
const updatedData = {
    software: { ...initialData.software, license: "Apache-2.0" },
    dataObjects: [
        measurementsSource,
        {
            localID: "LOCAL/data-object/analysis-v2",
            location: "https://example.org/data/analysis-v2.csv",
            license: "CC-BY-4.0",
            mimeType: "text/csv",
        },
    ],
}

const updateContext = new ContinuousMappingContext(mappingPID)
await updateContext.resolveRemoteGraph(backend)
mapping(updateContext, updatedData)
const updateResult = updateContext.build()
console.log("Deleted records:", updateResult.delete)
await backend.publishContinuous(updateResult)
`,
    },
    {
        id: "plain-records",
        title: "Plain records",
        description:
            "Records without profiles: plain simple types attributes, unidirectional and bidirectional references.",
        source: `// Records do not need profiles: plain attributes and references are
// enough. This example shows the raw record API of the primitives package
// with the attributes of @fdo-sdk/simple-types.
import { ConcreteLocalFDORecord, LocalFDOGraph } from "@fdo-sdk/primitives"
import { SIMPLE_ATTRIBUTES } from "@fdo-sdk/simple-types"
import { PlaygroundBackend } from "@fdo-sdk/playground"

const backend = new PlaygroundBackend()

const graph = new LocalFDOGraph()

const paper = new ConcreteLocalFDORecord("LOCAL/publication/fdos-in-practice")
paper.set(SIMPLE_ATTRIBUTES.PUBLICATION_TITLE, "FDOs in practice")

const dataset = new ConcreteLocalFDORecord("LOCAL/data-object/reproducibility")
dataset.set(
    SIMPLE_ATTRIBUTES.DATA_OBJECT_LOCATION,
    "https://example.org/data/reproducibility.nc",
)
dataset.set(SIMPLE_ATTRIBUTES.MIME_TYPE, "application/netcdf")

const author = new ConcreteLocalFDORecord("LOCAL/person/jane-doe")
author.set(SIMPLE_ATTRIBUTES.OWNER, "Helmholtz-Zentrum Hereon")
author.set(SIMPLE_ATTRIBUTES.PUBLICATION_CREATOR, "Jane Doe")

// Unidirectional reference: the paper links to its creator record under
// the PUBLICATION_CREATOR attribute ...
paper.addReference(SIMPLE_ATTRIBUTES.PUBLICATION_CREATOR, author)
// ... and a bidirectional one under the DOI attribute: the paper links to
// the dataset it describes, and build() writes the back-reference on the
// dataset so it links back to the paper.
paper.addReferenceBidi(
    SIMPLE_ATTRIBUTES.DOI,
    SIMPLE_ATTRIBUTES.DOI,
    dataset,
)

for (const record of [paper, dataset, author]) graph.addRecord(record)

await backend.publishGraph(graph)
`,
    },
]
