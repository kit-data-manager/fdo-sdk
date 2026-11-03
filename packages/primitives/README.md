# @fdo-sdk/primitives

The core model of the SDK. It has no backend and no dependencies: it defines
records, profiles, references and graphs, plus the interfaces that connect
them to a publishing service.

```bash
pnpm add @fdo-sdk/primitives
```

## Records

A record is a set of attributes identified by PIDs. Values are strings or
lists of strings.

```ts
import { ConcreteLocalFDORecord, type FDORecord } from "@fdo-sdk/primitives"

const record: FDORecord = new ConcreteLocalFDORecord("LOCAL/publication/1")

record.set("attr/title", "FDOs in practice")
record.addAttribute("attr/keyword", ["FDO", "metadata"])
record.addAttribute("attr/keyword", "reproducibility") // appends

record.has("attr/title") // true
record.get("attr/keyword") // ["FDO", "metadata", "reproducibility"]
```

`set()` replaces all values of an attribute; `addAttribute()` keeps existing
ones. Use `remove()` to delete an attribute and `getAll()` / `toJSON()` to
inspect the record.

## Profiles

A profile gives attributes readable names and declares which of them are
mandatory. Attribute values are still stored under their PIDs.

```ts
import {
    ConcreteLocalFDORecord,
    ConcreteProfile,
    reference,
    skip,
} from "@fdo-sdk/primitives"

const publicationProfile = new ConcreteProfile({
    pid: "PROFILE/PUBLICATION",
    readableName: "Publication",
    profileAttributePID: "attr/profiles",
    mapping: {
        title: "attr/title",
        creator: "attr/creator",
        doi: "attr/doi",
    },
})

const author = new ConcreteLocalFDORecord("LOCAL/person/jane-doe")
author.set("attr/name", "Jane Doe")

const publication = new ConcreteLocalFDORecord("LOCAL/publication/1")
publication.addProfile(publicationProfile, {
    title: "FDOs in practice",
    creator: reference(author),
    doi: skip(),
})
```

Rules for profile values:

- A plain value is written to the mapped PID.
- `skip()` leaves a mandatory attribute out. Use with care.
- `keep()` keeps a value that is already present; applying the profile throws
  if the attribute is missing.
- `reference(record)` and `referenceBidi(attribute, record)` add a reference
  from the profile attribute instead of a plain value.

`addProfile()` also records the profile PID in `profileAttributePID` (if
defined) and adds it to `getProfiles()`.

## References

References are declared on a record. Unidirectional references need no
further processing; bidirectional references get their back-reference when
the graph is built.

```ts
const paper = graph.newRecord("LOCAL/publication/fdos-in-practice")
const dataset = graph.newRecord("LOCAL/data-object/reproducibility")

paper.addReference("attr/creator", author)
paper.addReferenceBidi("attr/doi", "attr/doi", dataset)

graph.build() // writes the back-reference on the dataset
```

`addReference()` and `addReferenceBidi()` accept a `PID`, a `LocalID`, or a
record object as the target.

## Graphs

`LocalFDOGraph` holds records that may or may not be published:

```ts
import { LocalFDOGraph } from "@fdo-sdk/primitives"

const graph = new LocalFDOGraph()
const record = graph.newRecord("LOCAL/1") // creates and adds

graph.getRecord("LOCAL/1") // by LocalID
graph.getRecords()
graph.findRecord((candidate) => candidate.has("attr/title"))
graph.removeRecord("LOCAL/1")
```

Call `build()` once to realize bidirectional references. Publishing then
assigns PIDs. `PublishedFDOGraph` is the read-only counterpart for records
that already have a PID; it indexes records by both PID and local ID.

> `LocalFDOGraph` throws when `build()` is called a second time, and when
> `newRecord()` / `addRecord()` is used with an existing local ID unless
> `{ overwrite: true }` is passed.

## Publishing and resolving

The SDK keeps backends out of the model through two interfaces:

- `PublishAdapter` — `publishGraph(graph)` and `publishRecord(record)` return
  published records with PIDs and references expressed as PIDs.
- `ResolveAdapter` — `resolveRecord(pid)` returns a published record or
  `undefined`.

A publish adapter must persist the local ID of every record it publishes so
that a matching resolve adapter can restore it. The model does not prescribe
how: it may be a record attribute, system metadata, or part of the PID.

`@fdo-sdk/mapping` contains `LocalTestingBackend`, an in-memory
implementation of both interfaces, which is useful for tests and local
experiments. Production backends implement the same interfaces.

## Main API

| Export                                       | Purpose                                   |
| -------------------------------------------- | ----------------------------------------- |
| `LocalFDOGraph`                              | Mutable graph of local records            |
| `PublishedFDOGraph`                          | Read-only graph of published records      |
| `ConcreteLocalFDORecord`                     | Record with a local ID                    |
| `ConcreteFDORecord`                          | Base record, optionally with a PID        |
| `ConcreteProfile`                            | Implementation of `Profile`               |
| `keep`, `skip`, `reference`, `referenceBidi` | Markers and references for `addProfile()` |
| `FDORecord`, `FDOGraph`, `Profile`, ...      | Interfaces for custom implementations     |
| `LocalID`, `PID`, `RecordValue`, ...         | Core types                                |

The `@fdo-sdk/docs` package builds the full API reference:
`pnpm --filter @fdo-sdk/docs build`, then
`pnpm --filter @fdo-sdk/docs serve` to browse it locally.
