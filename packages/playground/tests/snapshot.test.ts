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
})
