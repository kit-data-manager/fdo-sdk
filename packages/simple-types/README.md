# @fdo-sdk/simple-types

A small, practical set of attributes and profiles used by the examples in
this repository. They are not an exhaustive FDO standard: they are meant to
make examples readable and to show how profiles and attributes fit together.

```bash
pnpm add @fdo-sdk/simple-types
```

## Usage

```ts
import { LocalFDOGraph, reference } from "@fdo-sdk/primitives"
import { SIMPLE_ATTRIBUTES, SIMPLE_PROFILES } from "@fdo-sdk/simple-types"

const graph = new LocalFDOGraph()

const software = graph.newRecord("LOCAL/software/climate-tools")
software.addProfile(SIMPLE_PROFILES.SOFTWARE, {
    softwareRepositoryType: "git",
    softwareLocation: "https://github.com/example/climate-tools",
    softwareLicense: "MIT",
})

const data = graph.newRecord("LOCAL/data-object/measurements")
data.addProfile(SIMPLE_PROFILES.DATA_OBJECT, {
    dataObjectLocation: "https://example.org/data/measurements.nc",
    dataObjectLicense: "CC-BY-4.0",
    mimeType: "application/netcdf",
    createdWithSoftware: reference(software),
})

data.get(SIMPLE_ATTRIBUTES.MIME_TYPE) // "application/netcdf"
```

The attribute constants can be used anywhere a PID or `Attribute` is
expected, e.g. `record.get(SIMPLE_ATTRIBUTES.DOI)`.

## Profiles

| Profile                       | Mandatory attributes                                            | Optional attributes               |
| ----------------------------- | --------------------------------------------------------------- | --------------------------------- |
| `SIMPLE_PROFILES.CORE`        | `owner`, `helmholtzResearchField`                               | —                                 |
| `SIMPLE_PROFILES.SOFTWARE`    | `softwareRepositoryType`, `softwareLocation`, `softwareLicense` | `readmeLocation`                  |
| `SIMPLE_PROFILES.DATA_OBJECT` | `dataObjectLocation`, `dataObjectLicense`, `mimeType`           | `isPartOf`, `createdWithSoftware` |
| `SIMPLE_PROFILES.PUBLICATION` | `doi`, `publicationTitle`, `publicationCreator`                 | `hasPart`                         |

Every profile uses `0.SIMPLE/PROFILE` as its profile marker attribute, so
`addProfile()` writes the profile PID there and into `getProfiles()`.

## Attributes

| Constant                                     | PID                                 |
| -------------------------------------------- | ----------------------------------- |
| `SIMPLE_ATTRIBUTES.OWNER`                    | `0.SIMPLE/OWNER`                    |
| `SIMPLE_ATTRIBUTES.HELMHOLTZ_RESEARCH_FIELD` | `0.SIMPLE/HELMHOLTZ_RESEARCH_FIELD` |
| `SIMPLE_ATTRIBUTES.PROFILE`                  | `0.SIMPLE/PROFILE`                  |
| `SIMPLE_ATTRIBUTES.SOFTWARE_REPOSITORY_TYPE` | `0.SIMPLE/SOFTWARE_REPOSITORY_TYPE` |
| `SIMPLE_ATTRIBUTES.SOFTWARE_LOCATION`        | `0.SIMPLE/SOFTWARE_LOCATION`        |
| `SIMPLE_ATTRIBUTES.SOFTWARE_LICENSE`         | `0.SIMPLE/SOFTWARE_LICENSE`         |
| `SIMPLE_ATTRIBUTES.README_LOCATION`          | `0.SIMPLE/README_LOCATION`          |
| `SIMPLE_ATTRIBUTES.DATA_OBJECT_LOCATION`     | `0.SIMPLE/DATA_OBJECT_LOCATION`     |
| `SIMPLE_ATTRIBUTES.DATA_OBJECT_LICENSE`      | `0.SIMPLE/DATA_OBJECT_LICENSE`      |
| `SIMPLE_ATTRIBUTES.MIME_TYPE`                | `0.SIMPLE/MIME_TYPE`                |
| `SIMPLE_ATTRIBUTES.DOI`                      | `0.SIMPLE/DOI`                      |
| `SIMPLE_ATTRIBUTES.PUBLICATION_TITLE`        | `0.SIMPLE/PUBLICATION_TITLE`        |
| `SIMPLE_ATTRIBUTES.PUBLICATION_CREATOR`      | `0.SIMPLE/PUBLICATION_CREATOR`      |
| `SIMPLE_ATTRIBUTES.VERSION`                  | `0.SIMPLE/VERSION`                  |
| `SIMPLE_ATTRIBUTES.PUBLICATION_DATE`         | `0.SIMPLE/PUBLICATION_DATE`         |
| `SIMPLE_ATTRIBUTES.CREATION_DATE`            | `0.SIMPLE/CREATION_DATE`            |
| `SIMPLE_ATTRIBUTES.IS_PART_OF`               | `0.SIMPLE/IS_PART_OF`               |
| `SIMPLE_ATTRIBUTES.HAS_PART`                 | `0.SIMPLE/HAS_PART`                 |
| `SIMPLE_ATTRIBUTES.CREATED_WITH_SOFTWARE`    | `0.SIMPLE/CREATED_WITH_SOFTWARE`    |
| `SIMPLE_ATTRIBUTES.LOCAL_ID`                 | `0.SIMPLE/LOCAL_ID`                 |

The raw identifier objects are exported too: `FDO_TYPES` (attributes),
`FDO_PROFILES` (profiles) and `LEGACY_TYPE_KEYS` (the legacy version and date
attributes).

## Writing your own types

For real data, define your own `ProfileDefinition` and instantiate it with
`ConcreteProfile` from `@fdo-sdk/primitives`. The simple types are a model for
how to do that, not a fixed vocabulary.
