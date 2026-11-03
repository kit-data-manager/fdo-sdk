import { describe, expect, it } from "vitest"
import {
    ConcreteLocalFDORecord,
    ConcreteProfile,
    LocalFDOGraph,
} from "@fdo-sdk/primitives"
import { LocalTestingBackend } from "@fdo-sdk/mapping"
import { snapshotGraph, snapshotRecords } from "../src/runner/snapshot.js"

const nameAttr = { pid: "attr/name", readableName: "name" }
const hasAuthorAttr = { pid: "attr/hasAuthor", readableName: "hasAuthor" }
const authoredAttr = {
    pid: "attr/authoredDatasets",
    readableName: "authoredDatasets",
}

const authorProfile = new ConcreteProfile({
    pid: "profile/author",
    readableName: "Author",
    mapping: { name: nameAttr.pid },
})

function buildGraph(): LocalFDOGraph {
    const graph = new LocalFDOGraph()
    const ada = new ConcreteLocalFDORecord("LOCAL/ada")
    ada.addProfile(authorProfile, { name: "Ada" })
    const grace = new ConcreteLocalFDORecord("LOCAL/grace")
    grace.addProfile(authorProfile, { name: "Grace" })
    const dataset = new ConcreteLocalFDORecord("LOCAL/dataset")
    dataset.addProfile(authorProfile, { name: "Dataset" })
    dataset.addReferenceBidi(hasAuthorAttr, authoredAttr, "LOCAL/ada")
    dataset.addReference(hasAuthorAttr, "LOCAL/grace")
    for (const record of [ada, grace, dataset]) graph.addRecord(record)
    graph.build()
    return graph
}

describe("snapshotGraph", () => {
    it("captures records, profiles, attributes and references", () => {
        const snapshot = snapshotGraph(buildGraph(), "Local")

        expect(snapshot.label).toBe("Local")
        expect(snapshot.records.map((record) => record.id)).toEqual([
            "LOCAL/ada",
            "LOCAL/grace",
            "LOCAL/dataset",
        ])

        const dataset = snapshot.records[2]!
        expect(dataset.profiles).toEqual(["profile/author"])
        expect(dataset.attributes).toContainEqual({
            pid: "attr/name",
            value: "Dataset",
        })
        expect(dataset.references).toContainEqual({
            attribute: "attr/hasAuthor",
            target: "LOCAL/ada",
            direction: "bidi",
        })
        expect(dataset.references).toContainEqual({
            attribute: "attr/hasAuthor",
            target: "LOCAL/grace",
            direction: "uni",
        })

        const ada = snapshot.records[0]!
        expect(ada.attributes).toContainEqual({
            pid: "attr/authoredDatasets",
            value: "LOCAL/dataset",
        })
        // The bidirectional reference is declared on the dataset record; the
        // author record shows the inverse view of the same relationship.
        expect(ada.references).toEqual([
            {
                attribute: "attr/authoredDatasets",
                target: "LOCAL/dataset",
                direction: "bidi",
                derived: true,
            },
        ])

        // A unidirectional reference is not mirrored on the target.
        const grace = snapshot.records[1]!
        expect(grace.references).toEqual([])
    })

    it("resolves published reference targets to PIDs", async () => {
        LocalTestingBackend.resetStore()
        const backend = new LocalTestingBackend()
        const published = await backend.publishGraph(buildGraph())

        const snapshot = snapshotGraph(published, "Published")
        const ids = snapshot.records.map((record) => record.id)
        for (const id of ids) expect(id).toMatch(/^TEST\//)

        const dataset = snapshot.records.find(
            (record) => record.localID === "LOCAL/dataset",
        )!
        expect(dataset.pid).toBeDefined()
        expect(dataset.references.length).toBe(2)
        for (const reference of dataset.references) {
            expect(ids).toContain(reference.target)
        }

        const ada = snapshot.records.find(
            (record) => record.localID === "LOCAL/ada",
        )!
        expect(ada.references).toEqual([
            {
                attribute: "attr/authoredDatasets",
                target: dataset.pid,
                direction: "bidi",
                derived: true,
            },
        ])
    })
})

describe("snapshotRecords", () => {
    it("snapshots an arbitrary list of records", () => {
        const a = new ConcreteLocalFDORecord("LOCAL/a")
        a.set(nameAttr.pid, "A")
        const b = new ConcreteLocalFDORecord("LOCAL/b")
        b.set(nameAttr.pid, "B")

        const snapshot = snapshotRecords([a, b], "Published graph")

        expect(snapshot.label).toBe("Published graph")
        expect(snapshot.records.map((record) => record.id)).toEqual([
            "LOCAL/a",
            "LOCAL/b",
        ])
        expect(snapshot.records[0]!.attributes).toEqual([
            { pid: "attr/name", value: "A" },
        ])
    })

    it("snapshots an empty store", () => {
        const snapshot = snapshotRecords([], "Published graph")

        expect(snapshot.records).toEqual([])
    })

    it("does not duplicate a bidirectional reference that both records declare", () => {
        const a = new ConcreteLocalFDORecord("LOCAL/a")
        const b = new ConcreteLocalFDORecord("LOCAL/b")
        a.addReferenceBidi(hasAuthorAttr, authoredAttr, "LOCAL/b")
        b.addReferenceBidi(authoredAttr, hasAuthorAttr, "LOCAL/a")

        const snapshot = snapshotRecords([a, b], "Local")

        expect(snapshot.records[1]!.references).toEqual([
            {
                attribute: "attr/authoredDatasets",
                target: "LOCAL/a",
                direction: "bidi",
            },
        ])
    })

    it("keeps a bidirectional reference to a record outside the snapshot", () => {
        const record = new ConcreteLocalFDORecord("LOCAL/a")
        record.addReferenceBidi(hasAuthorAttr, authoredAttr, "LOCAL/outside")

        const snapshot = snapshotRecords([record], "Local")

        expect(snapshot.records[0]!.references).toEqual([
            {
                attribute: "attr/hasAuthor",
                target: "LOCAL/outside",
                direction: "bidi",
            },
        ])
    })
})
