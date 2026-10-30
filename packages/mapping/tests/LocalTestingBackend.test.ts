import { beforeEach, describe, expect, it } from "vitest"
import {
    ConcreteFDORecord,
    ConcreteLocalFDORecord,
    ConcreteProfile,
    LocalFDOGraph,
    type Attribute,
    type PID,
    type ProfileDefinition,
} from "@fdo-sdk/primitives"
import {
    ContinuousMappingContext,
    LocalTestingBackend,
    type MappingResult,
} from "../src/index.js"

type TestProfileAttributes = {
    datasetName: string
    authors: string | string[]
}

const def: ProfileDefinition<TestProfileAttributes> = {
    pid: "profile/test",
    readableName: "Test Profile",
    mapping: {
        datasetName: "attr/datasetName",
        authors: "attr/authors",
    },
}

const fromAttr: Attribute<string> = {
    pid: "attr/from",
    readableName: "from",
}

const toAttr: Attribute<string> = {
    pid: "attr/to",
    readableName: "to",
}

const mappingPID = "TEST/mapping"

function newGraphWithRecords(
    ...records: ConcreteLocalFDORecord[]
): LocalFDOGraph {
    const graph = new LocalFDOGraph()
    for (const record of records) graph.addRecord(record)
    return graph
}

/**
 * A mapping result for the mapping with the given PID: the given records are
 * created by the mapping, the given PIDs are deleted by the mapping.
 */
function newMappingResult(
    records: ConcreteLocalFDORecord[] = [],
    deleted: PID[] = [],
    pid: PID = mappingPID,
): MappingResult {
    return {
        mappingPID: pid,
        create: newGraphWithRecords(...records),
        update: new LocalFDOGraph(),
        delete: deleted,
    }
}

async function publishAll(
    backend: LocalTestingBackend,
    ...records: ConcreteLocalFDORecord[]
): Promise<void> {
    await publishFor(backend, mappingPID, ...records)
}

async function publishFor(
    backend: LocalTestingBackend,
    pid: PID,
    ...records: ConcreteLocalFDORecord[]
): Promise<void> {
    await backend.publishContinuous(newMappingResult(records, [], pid))
}

describe("LocalTestingBackend", () => {
    beforeEach(() => {
        LocalTestingBackend.resetStore()
    })

    describe("publishContinuous", () => {
        it("assigns fresh unique PIDs to records without a PID", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/1")
            const recordB = new ConcreteLocalFDORecord("LOCAL/2")

            await publishAll(backend, recordA, recordB)

            expect(recordA.PID).toMatch(/^TEST\//)
            expect(recordB.PID).toMatch(/^TEST\//)
            expect(recordA.PID).not.toBe(recordB.PID)
        })

        it("keeps the PID of records that already have one", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1", "existing/pid")

            await publishAll(backend, record)

            expect(record.PID).toBe("existing/pid")
            expect(await backend.resolveRecord("existing/pid")).toBeDefined()
        })

        it("publishes plain records without a localID", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteFDORecord()
            record.set("attr/a", "value")

            await backend.publishContinuous(
                newMappingResult([record as unknown as ConcreteLocalFDORecord]),
            )

            const resolved = await backend.resolveRecord(record.PID!)
            expect(resolved?.get("attr/a")).toBe("value")
            expect(resolved?.PID).toBe(record.PID)
        })

        it("updates the stored snapshot when a record is published again", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            record.set("attr/a", "v1")
            await publishAll(backend, record)
            const firstPID = record.PID!

            record.set("attr/a", "v2")
            await publishAll(backend, record)

            expect(record.PID).toBe(firstPID)
            const resolved = await backend.resolveRecord(firstPID)
            expect(resolved?.get("attr/a")).toBe("v2")
        })

        it("keeps the PID of a record that was published before under the same local ID", async () => {
            const backend = new LocalTestingBackend()
            const context = new ContinuousMappingContext(mappingPID)
            context.newRecord("LOCAL/1")
            await backend.publishContinuous(context.build())
            const firstPID = (
                await backend.resolveMappingRecords(mappingPID)
            ).getRecords()[0]!.PID

            // A second run of the same mapping creates a new record object for
            // the same local ID. The context resolves the remote graph and
            // classifies the record as an update, carrying the PID of the
            // first run, so publishing overwrites the existing record.
            const secondContext = new ContinuousMappingContext(mappingPID)
            await secondContext.resolveRemoteGraph(backend)
            const secondRun = secondContext.newRecord("LOCAL/1")
            await backend.publishContinuous(secondContext.build())

            expect(secondRun.PID).toBe(firstPID)
            expect(
                (await backend.resolveMappingRecords(mappingPID)).getRecords(),
            ).toHaveLength(1)
        })

        it("does not reuse the PID of a record of another mapping", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/1")
            await publishAll(backend, recordA)

            const recordB = new ConcreteLocalFDORecord("LOCAL/1")
            await publishFor(backend, "TEST/other-mapping", recordB)

            expect(recordB.PID).not.toBe(recordA.PID)
        })

        it("deletes the records that are not part of the mapping result anymore", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            await publishAll(backend, record)
            const pid = record.PID!

            await backend.publishContinuous(newMappingResult([], [pid]))

            expect(await backend.resolveRecord(pid)).toBeUndefined()
            expect(
                (await backend.resolveMappingRecords(mappingPID)).getRecords(),
            ).toHaveLength(0)
        })

        it("returns the PID of the mapping", async () => {
            const backend = new LocalTestingBackend()

            const result = await backend.publishContinuous(newMappingResult())

            expect(result.mappingPID).toBe(mappingPID)
        })

        it("returns the published records of the mapping", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/1")
            const recordB = new ConcreteLocalFDORecord("LOCAL/2")
            await publishAll(backend, recordA, recordB)

            const result = await backend.publishContinuous(
                newMappingResult([recordA, recordB]),
            )

            expect(result.graph.getRecords()).toHaveLength(2)
            expect(result.graph.getRecord(recordA.PID!)).toBeDefined()
            expect(result.graph.getRecord(recordB.PID!)).toBeDefined()
        })

        it("returns the PIDs of the deleted records", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            await publishAll(backend, record)
            const pid = record.PID!

            const result = await backend.publishContinuous(
                newMappingResult([], [pid]),
            )

            expect(result.deleted).toEqual([pid])
        })

        it("does not report a PID that was not published as deleted", async () => {
            const backend = new LocalTestingBackend()

            const result = await backend.publishContinuous(
                newMappingResult([], ["TEST/unknown"]),
            )

            expect(result.deleted).toEqual([])
        })

        it("publishes the records that are updated by the mapping", async () => {
            const backend = new LocalTestingBackend()
            const context = new ContinuousMappingContext(mappingPID)
            const record = context.newRecord("LOCAL/1")
            record.set("attr/a", "v1")
            await backend.publishContinuous(context.build())
            const firstPID = record.PID!

            // The second run of the same mapping updates the record: the
            // context stamps the PID of the first run onto it, so publishing
            // overwrites the existing record.
            const secondContext = new ContinuousMappingContext(mappingPID)
            await secondContext.resolveRemoteGraph(backend)
            const secondRun = secondContext.newRecord("LOCAL/1")
            secondRun.set("attr/a", "v2")

            const result = await backend.publishContinuous(
                secondContext.build(),
            )

            expect(secondRun.PID).toBe(firstPID)
            expect(result.graph.getRecord(firstPID)?.get("attr/a")).toBe("v2")
        })
    })

    describe("publishGraph", () => {
        it("publishes all the records of the graph", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/a")
            const recordB = new ConcreteLocalFDORecord("LOCAL/b")

            const published = await backend.publishGraph(
                newGraphWithRecords(recordA, recordB),
            )

            expect(published.getRecords()).toHaveLength(2)
            expect(recordA.PID).toMatch(/^TEST\//)
            expect(recordB.PID).toMatch(/^TEST\//)
        })

        it("returns the published records with their PIDs", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            record.set("attr/a", "value")

            const published = await backend.publishGraph(
                newGraphWithRecords(record),
            )

            const publishedRecord = published.getRecord(record.PID!)
            expect(publishedRecord?.PID).toBe(record.PID)
            expect(publishedRecord?.get("attr/a")).toBe("value")
        })

        it("does not create a high level FDO record of a mapping", async () => {
            const backend = new LocalTestingBackend()

            await backend.publishGraph(
                newGraphWithRecords(new ConcreteLocalFDORecord("LOCAL/a")),
            )

            expect(await backend.resolveRecord(mappingPID)).toBeUndefined()
        })

        it("does not reference a mapping from the published records", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")

            const published = await backend.publishGraph(
                newGraphWithRecords(record),
            )

            expect(
                published.getRecord(record.PID!)?.get("attr/partOfMapping"),
            ).toBeUndefined()
        })

        it("keeps the own local ID of the published records", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")

            const published = await backend.publishGraph(
                newGraphWithRecords(record),
            )

            expect(published.getRecord(record.PID!)?.get("attr/localId")).toBe(
                "LOCAL/a",
            )
        })

        it("fixes up the references between the published records", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/a")
            const recordB = new ConcreteLocalFDORecord("LOCAL/b")
            recordA.addReference(fromAttr, "LOCAL/b")

            const published = await backend.publishGraph(
                newGraphWithRecords(recordA, recordB),
            )

            expect(published.getRecord(recordA.PID!)?.get("attr/from")).toBe(
                recordB.PID,
            )
        })

        it("publishes records without a local ID", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteFDORecord()
            const graph = new LocalFDOGraph()
            graph.addRecord(record as unknown as ConcreteLocalFDORecord)

            const published = await backend.publishGraph(graph)

            expect(published.getRecords()).toHaveLength(1)
            expect(published.getRecord(record.PID!)).toBeDefined()
        })

        it("assigns a new PID to a record that is published again", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            await backend.publishGraph(newGraphWithRecords(record))
            const firstPID = record.PID!

            const secondRun = new ConcreteLocalFDORecord("LOCAL/a")
            await backend.publishGraph(newGraphWithRecords(secondRun))

            expect(secondRun.PID).not.toBe(firstPID)
        })

        it("does not reuse the PID of a record of a mapping", async () => {
            const backend = new LocalTestingBackend()
            const mapped = new ConcreteLocalFDORecord("LOCAL/a")
            await publishAll(backend, mapped)

            const unmapped = new ConcreteLocalFDORecord("LOCAL/a")
            await backend.publishGraph(newGraphWithRecords(unmapped))

            expect(unmapped.PID).not.toBe(mapped.PID)
        })
    })

    describe("publishRecord", () => {
        it("assigns a PID to the record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")

            const published = await backend.publishRecord(record)

            expect(record.PID).toMatch(/^TEST\//)
            expect(published.PID).toBe(record.PID)
        })

        it("publishes the record so that it can be resolved", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            record.set("attr/a", "value")

            const published = await backend.publishRecord(record)

            const resolved = await backend.resolveRecord(published.PID)
            expect(resolved?.get("attr/a")).toBe("value")
        })

        it("keeps the own local ID of the record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")

            const published = await backend.publishRecord(record)

            expect(published.get("attr/localId")).toBe("LOCAL/a")
        })

        it("does not reference a mapping from the published record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")

            const published = await backend.publishRecord(record)

            expect(published.get("attr/partOfMapping")).toBeUndefined()
        })

        it("publishes a record without a local ID", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteFDORecord()

            const published = await backend.publishRecord(record)

            expect(published.PID).toBe(record.PID)
            expect(published.get("attr/localId")).toBeUndefined()
        })

        it("assigns a new PID to a record that is published again", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            await backend.publishRecord(record)
            const firstPID = record.PID!

            const secondRun = new ConcreteLocalFDORecord("LOCAL/a")
            await backend.publishRecord(secondRun)

            expect(secondRun.PID).not.toBe(firstPID)
        })

        it("keeps the back-reference to the mapping of the record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            await publishAll(backend, record)

            const published = await backend.publishRecord(record)

            expect(published.get("attr/partOfMapping")).toBe(mappingPID)
        })
    })

    describe("the references of the published records", () => {
        it("are fixed up to the PIDs of the records of the mapping", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/a")
            const recordB = new ConcreteLocalFDORecord("LOCAL/b")
            recordA.addReference(fromAttr, "LOCAL/b")
            await publishAll(backend, recordA, recordB)

            const resolved = await backend.resolveRecord(recordA.PID!)

            expect(resolved?.get("attr/from")).toBe(recordB.PID)
            expect(resolved?.getReferences()).toEqual([
                {
                    direction: "uni",
                    fromAttribute: "attr/from",
                    toRecord: recordB.PID!,
                },
            ])
        })

        it("are fixed up to the PIDs of the fresh records of a later run", async () => {
            const backend = new LocalTestingBackend()
            const firstRun = new ConcreteLocalFDORecord("LOCAL/a")
            const target = new ConcreteLocalFDORecord("LOCAL/b")
            firstRun.addReference(fromAttr, "LOCAL/b")
            await publishAll(backend, firstRun, target)

            // The second run of the same mapping publishes new records: they
            // receive fresh PIDs, and the references are fixed up to those
            // PIDs.
            const secondRun = new ConcreteLocalFDORecord("LOCAL/a")
            const secondTarget = new ConcreteLocalFDORecord("LOCAL/b")
            secondRun.addReference(fromAttr, "LOCAL/b")
            await publishAll(backend, secondRun, secondTarget)

            expect(secondRun.PID).not.toBe(firstRun.PID)
            expect(secondTarget.PID).not.toBe(target.PID)
            const resolved = await backend.resolveRecord(secondRun.PID!)
            expect(resolved?.get("attr/from")).toBe(secondTarget.PID)
        })

        it("include the back-references of bidirectional references", async () => {
            const backend = new LocalTestingBackend()
            const context = new ContinuousMappingContext(mappingPID)
            const recordA = context.newRecord("LOCAL/a")
            const recordB = context.newRecord("LOCAL/b")
            recordA.addReferenceBidi(fromAttr, toAttr, "LOCAL/b")
            await backend.publishContinuous(context.build())

            const resolvedA = await backend.resolveRecord(recordA.PID!)
            const resolvedB = await backend.resolveRecord(recordB.PID!)

            expect(resolvedA?.get("attr/from")).toBe(recordB.PID)
            expect(resolvedB?.get("attr/to")).toBe(recordA.PID)
        })

        it("keep the reference to a record that is not part of the mapping", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            record.addReference(fromAttr, "LOCAL/unknown")
            await publishAll(backend, record)

            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/from")).toBe("LOCAL/unknown")
            expect(resolved?.getReferences()).toEqual([
                {
                    direction: "uni",
                    fromAttribute: "attr/from",
                    toRecord: "LOCAL/unknown",
                },
            ])
        })

        it("leave the local ID in attributes that do not hold references", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            record.set("attr/sourceId", "LOCAL/a")
            record.set("attr/relatedIds", ["LOCAL/a", "LOCAL/b"])
            await publishAll(backend, record)

            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/sourceId")).toBe("LOCAL/a")
            expect(resolved?.get("attr/relatedIds")).toEqual([
                "LOCAL/a",
                "LOCAL/b",
            ])
        })
    })

    describe("the own local ID of a published record", () => {
        it("is kept in the attribute of the record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/a")
            await publishAll(backend, record)

            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/localId")).toBe("LOCAL/a")
        })

        it("is the only local ID of the published record", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/a")
            const recordB = new ConcreteLocalFDORecord("LOCAL/b")
            recordA.addReference(fromAttr, "LOCAL/b")
            await publishAll(backend, recordA, recordB)

            const resolved = await backend.resolveRecord(recordA.PID!)
            const localIDs = Object.entries(resolved?.toJSON() ?? {}).flatMap(
                ([attribute, value]) =>
                    attribute === "attr/localId"
                        ? []
                        : (Array.isArray(value) ? value : [value]).filter(
                              (entry) =>
                                  typeof entry === "string" &&
                                  entry.startsWith("LOCAL/"),
                          ),
            )

            expect(localIDs).toEqual([])
        })

        it("is not added to a record without a local ID", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteFDORecord()

            await backend.publishContinuous(
                newMappingResult([record as unknown as ConcreteLocalFDORecord]),
            )

            const resolved = await backend.resolveRecord(record.PID!)
            expect(resolved?.get("attr/localId")).toBeUndefined()
        })
    })

    describe("the high level FDO record of the mapping", () => {
        it("is a record with the PID of the mapping", async () => {
            const backend = new LocalTestingBackend()
            await publishAll(backend, new ConcreteLocalFDORecord("LOCAL/1"))

            const mappingRecord = await backend.resolveRecord(mappingPID)

            expect(mappingRecord).toBeDefined()
            expect(mappingRecord?.PID).toBe(mappingPID)
        })

        it("references all the records that are part of the mapping", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/1")
            const recordB = new ConcreteLocalFDORecord("LOCAL/2")
            await publishAll(backend, recordA, recordB)

            const mappingRecord = await backend.resolveRecord(mappingPID)

            expect(mappingRecord?.get("attr/hasMappingRecord")).toEqual([
                recordA.PID,
                recordB.PID,
            ])
            expect(mappingRecord?.getReferences()).toEqual([
                {
                    direction: "bidi",
                    fromAttribute: "attr/hasMappingRecord",
                    inverseAttribute: "attr/partOfMapping",
                    toRecord: recordA.PID!,
                },
                {
                    direction: "bidi",
                    fromAttribute: "attr/hasMappingRecord",
                    inverseAttribute: "attr/partOfMapping",
                    toRecord: recordB.PID!,
                },
            ])
        })

        it("is referenced back by every record of the mapping", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            await publishAll(backend, record)

            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/partOfMapping")).toBe(mappingPID)
        })

        it("keeps an already existing back-reference of a record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            record.set("attr/partOfMapping", "existing/mapping")
            await publishAll(backend, record)

            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/partOfMapping")).toEqual([
                "existing/mapping",
                mappingPID,
            ])
        })

        it("keeps the already existing back-references of a record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            record.set("attr/partOfMapping", [
                "existing/mapping-1",
                "existing/mapping-2",
            ])
            await publishAll(backend, record)

            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/partOfMapping")).toEqual([
                "existing/mapping-1",
                "existing/mapping-2",
                mappingPID,
            ])
        })

        it("does not contain the records of another mapping", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            await publishAll(backend, record)

            const otherMappingRecord =
                await backend.resolveRecord("TEST/other-mapping")

            expect(otherMappingRecord).toBeUndefined()
        })

        it("is updated when the mapping is published again", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            await publishAll(backend, record)

            const secondRun = new ConcreteLocalFDORecord("LOCAL/2")
            await publishAll(backend, secondRun)

            const mappingRecord = await backend.resolveRecord(mappingPID)
            expect(mappingRecord?.get("attr/hasMappingRecord")).toEqual([
                record.PID,
                secondRun.PID,
            ])
        })
    })

    describe("resolveRecord", () => {
        it("returns a record with the same PID, attributes, references and profiles", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            record.addProfile(new ConcreteProfile(def), {
                datasetName: "My Dataset",
                authors: ["a1", "a2"],
            })
            record.set("attr/plain", "value")
            record.addReference(fromAttr, "LOCAL/target")
            record.addReferenceBidi(fromAttr, toAttr, "LOCAL/target2")

            await publishAll(backend, record)
            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.PID).toBe(record.PID)
            expect(resolved?.get("attr/datasetName")).toBe("My Dataset")
            expect(resolved?.get("attr/authors")).toEqual(["a1", "a2"])
            expect(resolved?.get("attr/plain")).toBe("value")
            expect(resolved?.getReferences()).toEqual([
                {
                    direction: "uni",
                    fromAttribute: "attr/from",
                    toRecord: "LOCAL/target",
                },
                {
                    direction: "bidi",
                    fromAttribute: "attr/from",
                    inverseAttribute: "attr/to",
                    toRecord: "LOCAL/target2",
                },
            ])
            expect(resolved?.getProfiles()).toEqual(["profile/test"])
        })

        it("returns undefined for an unknown PID", async () => {
            const backend = new LocalTestingBackend()
            expect(await backend.resolveRecord("TEST/unknown")).toBeUndefined()
        })

        it("returns a snapshot that is unaffected by later changes to the published record", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            record.set("attr/a", "before")
            await publishAll(backend, record)

            record.set("attr/a", "after")
            const resolved = await backend.resolveRecord(record.PID!)

            expect(resolved?.get("attr/a")).toBe("before")
        })

        it("resolves records from any mapping published through any backend", async () => {
            const backendA = new LocalTestingBackend()
            const backendB = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/a")
            await publishAll(backendA, recordA)

            expect(await backendB.resolveRecord(recordA.PID!)).toBeDefined()
        })
    })

    describe("resolveMappingRecords", () => {
        it("returns a graph of all records published for the mapping", async () => {
            const backend = new LocalTestingBackend()
            const context = new ContinuousMappingContext(mappingPID)
            context.newRecord("LOCAL/1")
            context.newRecord("LOCAL/2")
            await backend.publishContinuous(context.build())

            const graph = await backend.resolveMappingRecords(mappingPID)

            const records = graph.getRecords()
            expect(records).toHaveLength(2)
            for (const record of records) {
                expect(record.PID).toMatch(/^TEST\//)
                expect(["LOCAL/1", "LOCAL/2"]).toContain(record.localID)
                expect(graph.getRecord(record.localID)).toBe(record)
                expect(graph.getRecord(record.PID!)).toBe(record)
            }
        })

        it("does not contain the high level FDO record of the mapping", async () => {
            const backend = new LocalTestingBackend()
            const context = new ContinuousMappingContext(mappingPID)
            context.newRecord("LOCAL/1")
            await backend.publishContinuous(context.build())

            const graph = await backend.resolveMappingRecords(mappingPID)

            expect(graph.getRecord(mappingPID)).toBeUndefined()
        })

        it("resolves the records of each mapping independently", async () => {
            const backend = new LocalTestingBackend()
            const recordA = new ConcreteLocalFDORecord("LOCAL/a")
            const recordB = new ConcreteLocalFDORecord("LOCAL/b")
            await publishFor(backend, "TEST/mapping-a", recordA)
            await publishFor(backend, "TEST/mapping-b", recordB)

            const graphA = await backend.resolveMappingRecords("TEST/mapping-a")
            const graphB = await backend.resolveMappingRecords("TEST/mapping-b")

            expect(graphA.getRecord("LOCAL/a")).toBeDefined()
            expect(graphA.getRecord("LOCAL/b")).toBeUndefined()
            expect(graphB.getRecord("LOCAL/b")).toBeDefined()
            expect(graphB.getRecord("LOCAL/a")).toBeUndefined()
        })

        it("throws when the mapping has not been published", async () => {
            const backend = new LocalTestingBackend()
            await expect(
                backend.resolveMappingRecords("TEST/unknown"),
            ).rejects.toThrow("Mapping record not found")
        })
    })

    describe("resetStore", () => {
        it("clears all published records and PID assignments", async () => {
            const backend = new LocalTestingBackend()
            const record = new ConcreteLocalFDORecord("LOCAL/1")
            await publishAll(backend, record)

            LocalTestingBackend.resetStore()

            expect(await backend.resolveRecord(record.PID!)).toBeUndefined()
            expect(await backend.resolveRecord(mappingPID)).toBeUndefined()
            await expect(
                backend.resolveMappingRecords(mappingPID),
            ).rejects.toThrow("Mapping record not found")
        })
    })
})
