# ⚠️ Internal Testing - not ready for use

# FDO SDK

A TypeScript SDK for creating, publishing and resolving **FDO Records**
(FAIR Digital Objects) and the graphs they form.

The two central packages are **`@fdo-sdk/primitives`** and
**`@fdo-sdk/mapping`**:

- **`@fdo-sdk/primitives`** defines the FDO model: records whose attributes
  are identified by PIDs, profiles that map readable attribute names to PIDs,
  references between records, and graphs together with the publish/resolve
  adapter interfaces.
- **`@fdo-sdk/mapping`** builds on that model to map source data to FDO
  records continuously. Every run produces the records to create, update and
  delete, while the PIDs of records that still exist stay stable.

Around them, `@fdo-sdk/simple-types` provides a small set of ready-made
profiles and attributes used by the examples in this repository.
`@fdo-sdk/docs` contains the generated API reference, and
`@fdo-sdk/playground` is a browser sandbox for trying the SDK without setting
up a project.

## Concepts

- **Record** — a set of attributes, each identified by a PID. An attribute
  value is a string or a list of strings.
- **Local ID vs. PID** — records are created with a `LocalID` that is unique
  in the context of your data or mapping. Publishing assigns the globally
  unique `PID`.
- **Profile** — a named set of attribute PIDs. `addProfile()` maps readable
  names to PIDs and checks the mandatory attributes at compile time.
- **Reference** — a unidirectional or bidirectional edge between records.
  `build()` realizes back-references before publishing.
- **Adapters** — publishing and resolving are interfaces, so the SDK does not
  prescribe a backend. `LocalTestingBackend` is an in-memory implementation
  for tests and local experiments; `TypidResolver` reads records from a Typed
  PID Maker.

## Packages

| Package                 | Directory               | Purpose                                                          |
| ----------------------- | ----------------------- | ---------------------------------------------------------------- |
| `@fdo-sdk/primitives`   | `packages/primitives`   | Records, profiles, graphs, references, adapters                  |
| `@fdo-sdk/mapping`      | `packages/mapping`      | Continuous data-to-FDO mappings, testing backend, Typid resolver |
| `@fdo-sdk/simple-types` | `packages/simple-types` | Ready-made attributes and profiles used by the examples          |
| `@fdo-sdk/docs`         | `packages/docs`         | TypeDoc reference for primitives, mapping and simple-types       |
| `@fdo-sdk/playground`   | `packages/playground`   | Browser playground for the examples (private, not published)     |

## Install

```bash
pnpm add @fdo-sdk/primitives @fdo-sdk/mapping @fdo-sdk/simple-types
```

## Quick start

### Create and publish records

Records are built in a local graph and published through an adapter. The
example below uses the profiles and attributes of `@fdo-sdk/simple-types` and
the in-memory `LocalTestingBackend` from `@fdo-sdk/mapping`.

```ts
import { LocalFDOGraph, keep, reference, skip } from "@fdo-sdk/primitives"
import { LocalTestingBackend } from "@fdo-sdk/mapping"
import { SIMPLE_ATTRIBUTES, SIMPLE_PROFILES } from "@fdo-sdk/simple-types"

const backend = new LocalTestingBackend()
const graph = new LocalFDOGraph()

// A record with a profile. skip() leaves an attribute out even though the
// profile declares it.
const software = graph.newRecord("LOCAL/software/climate-tools")
software.addProfile(SIMPLE_PROFILES.SOFTWARE, {
    softwareRepositoryType: "git",
    softwareLocation: "https://github.com/example/climate-tools",
    softwareLicense: "MIT",
    readmeLocation: skip(),
})

// keep() keeps a value that was set before the profile was applied;
// reference() links to another record.
const measurements = graph.newRecord("LOCAL/data-object/measurements")
measurements.set(SIMPLE_ATTRIBUTES.DATA_OBJECT_LICENSE, "CC-BY-4.0")
measurements.addProfile(SIMPLE_PROFILES.DATA_OBJECT, {
    dataObjectLocation: "https://example.org/data/measurements.nc",
    dataObjectLicense: keep(),
    mimeType: "application/netcdf",
    createdWithSoftware: reference(software),
})

// Realize back-references, then publish: every record receives a PID.
graph.build()
const published = await backend.publishGraph(graph)
console.log(published.getRecords())
```

### Map source data to records

A continuous mapping is a pure function of your source data. It fills a fresh
local graph on every run, and `build()` classifies that graph against the
records published by earlier runs.

```ts
import { skip } from "@fdo-sdk/primitives"
import { ContinuousMappingContext, LocalTestingBackend } from "@fdo-sdk/mapping"
import { SIMPLE_PROFILES } from "@fdo-sdk/simple-types"

const backend = new LocalTestingBackend()
const context = new ContinuousMappingContext("TEST/climate-software")

try {
    // Load what an earlier run published for this mapping, if anything.
    await context.resolveRemoteGraph(backend)
} catch {
    // First run: nothing has been published for this mapping yet.
}

const software = context.newRecord("LOCAL/software/climate-tools")
software.addProfile(SIMPLE_PROFILES.SOFTWARE, {
    softwareRepositoryType: "git",
    softwareLocation: "https://github.com/example/climate-tools",
    softwareLicense: "MIT",
    readmeLocation: skip(),
})

const measurements = context.newRecord("LOCAL/data-object/measurements")
measurements.addProfile(SIMPLE_PROFILES.DATA_OBJECT, {
    dataObjectLocation: "https://example.org/data/measurements.nc",
    dataObjectLicense: "CC-BY-4.0",
    mimeType: "application/netcdf",
})

// create/update/delete against the previously published graph
const result = context.build()
await backend.publishContinuous(result)
```

Running the same mapping again with changed source data produces a fresh set
of create/update/delete operations, and records that are still part of the
mapping keep their PIDs.

## Documentation

The API reference is generated with TypeDoc from `packages/docs`:

```bash
pnpm --filter @fdo-sdk/docs build   # HTML in packages/docs/generated,
                                    # Markdown in packages/docs/generated-md
pnpm --filter @fdo-sdk/docs serve   # serve the HTML locally
pnpm build:pages                    # assemble site/ for GitHub Pages
```

The documentation and the playground are deployed to GitHub Pages by the
`Deploy documentation and playground` workflow on every push to `main`:

- <https://kit-data-manager.github.io/fdo-sdk/> — landing page
- <https://kit-data-manager.github.io/fdo-sdk/api/> — API reference
- <https://kit-data-manager.github.io/fdo-sdk/playground/> — playground

Each package also has a short README with its specific API:

- [`packages/primitives`](packages/primitives/README.md)
- [`packages/mapping`](packages/mapping/README.md)
- [`packages/simple-types`](packages/simple-types/README.md)
- [`packages/docs`](packages/docs/README.md)
- [`packages/playground`](packages/playground/README.md)

## Development

Requirements:

- Node.js >= 24
- corepack (ships with Node.js)

Initial setup:

```bash
# automatically installs the pnpm version pinned in package.json
corepack install
corepack enable
# install dependencies
pnpm install
```

Workspace commands:

```bash
pnpm build           # build all packages in dependency order (nx-cached)
pnpm test            # run the tests of all packages that define a test script
pnpm build:pages     # build everything and assemble site/ for GitHub Pages
pnpm build:stream    # same as build, with interleaved output
pnpm test:stream     # same as test, with interleaved output

pnpm --filter @fdo-sdk/primitives test
pnpm --filter @fdo-sdk/playground dev
```
