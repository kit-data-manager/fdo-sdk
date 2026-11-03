# @fdo-sdk/mapping

Mappings from source data to FDO records. It builds on
`@fdo-sdk/primitives` and adds the pieces needed to keep published records in
sync with data that changes over time.

```bash
pnpm add @fdo-sdk/mapping
```

## Continuous mappings

A continuous mapping is a pure function of your source data. On every run:

1. Resolve the records that earlier runs published for this mapping.
2. Fill a fresh local graph from the current source data.
3. `build()` the local graph and classify it against the remote graph.
4. Publish the result.

Records are correlated across runs by their local ID, so PIDs stay stable for
records that are still part of the mapping. The result separates the work:

```ts
type MappingResult = {
    mappingPID: PID
    create: ReadOnlyFDOGraph<LocalFDORecord>
    update: ReadOnlyFDOGraph<LocalFDORecord>
    delete: PID[]
}
```

A mapping is identified by its `mappingPID`, which is also the PID of the
high-level record representing the mapping.

## Example

```ts
import { ContinuousMappingContext, LocalTestingBackend } from "@fdo-sdk/mapping"
import { skip } from "@fdo-sdk/primitives"
import { SIMPLE_PROFILES } from "@fdo-sdk/simple-types"

type Source = {
    software: {
        localID: `LOCAL/${string}`
        repositoryType: string
        location: string
        license: string
    }
    dataObjects: {
        localID: `LOCAL/${string}`
        location: string
        license: string
        mimeType: string
    }[]
}

const backend = new LocalTestingBackend()
const mappingPID = "TEST/climate-software"

function applyMapping(context: ContinuousMappingContext, source: Source) {
    context
        .newRecord(source.software.localID)
        .addProfile(SIMPLE_PROFILES.SOFTWARE, {
            softwareRepositoryType: source.software.repositoryType,
            softwareLocation: source.software.location,
            softwareLicense: source.software.license,
            readmeLocation: skip(),
        })

    for (const file of source.dataObjects) {
        context
            .newRecord(file.localID)
            .addProfile(SIMPLE_PROFILES.DATA_OBJECT, {
                dataObjectLocation: file.location,
                dataObjectLicense: file.license,
                mimeType: file.mimeType,
            })
    }
}

async function publish(source: Source) {
    const context = new ContinuousMappingContext(mappingPID)

    try {
        await context.resolveRemoteGraph(backend)
    } catch {
        // First run: nothing has been published for this mapping yet.
    }

    applyMapping(context, source)
    const result = context.build()
    await backend.publishContinuous(result)
}
```

Running `publish()` again produces a result that classifies every record as
create, update or delete against what was previously published.

## Mapping context

`ContinuousMappingContext` is the default `MappingContext`:

| Member                   | Purpose                                                     |
| ------------------------ | ----------------------------------------------------------- |
| `mappingPID`             | Identifies the mapping and its high-level record            |
| `newRecord(localID)`     | Creates a record in the fresh local graph                   |
| `localGraph`             | The graph of records that should be published               |
| `remoteGraph`            | The records published by earlier runs                       |
| `hasResolvedRemoteGraph` | Whether the remote graph has been loaded                    |
| `resolveRemoteGraph(a)`  | Loads the remote graph through a `ContinuousResolveAdapter` |
| `build()`                | Builds back-references and returns a `MappingResult`        |

`build()` can only be called once per context. Create a new context for the
next run.

## Adapters

`@fdo-sdk/mapping` defines two extended adapter interfaces:

- `ContinuousResolveAdapter` — `resolveMappingRecords(mappingPID)` returns the
  published records of a mapping, including their restored local IDs.
- `ContinuousPublishAdapter` — extends `PublishAdapter` with
  `publishContinuous(mappingResult)`, which creates, updates and deletes
  records and maintains the high-level mapping record.

How local IDs are persisted is up to the adapter pair: a record attribute,
system metadata, or the PID itself.

### `LocalTestingBackend`

An in-memory implementation of `ContinuousPublishAdapter` and `ResolveAdapter`
for tests and local experiments:

- all instances share one store, so a record published through one instance
  can be resolved through another;
- `LocalTestingBackend.resetStore()` clears everything between tests;
- PIDs are assigned as `TEST/1`, `TEST/2`, ...;
- local IDs are persisted in the `0.SIMPLE/LOCAL_ID` attribute (a
  simplification of the testing setup);
- every mapping gets a high-level record with the `mappingPID` that references
  its records via `attr/hasMappingRecord`, and the records point back via
  `attr/partOfMapping`.

It supports publishing a whole graph (`publishGraph`), a single record
(`publishRecord`), and continuous mapping results (`publishContinuous`).

### `TypidResolver`

A `ResolveAdapter` that fetches records from the Typed PID Maker preview
service. It currently resolves individual records (`resolveRecord`) and is a
starting point for a flavor-specific backend rather than a complete publishing
adapter.
