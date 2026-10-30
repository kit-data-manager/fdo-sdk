import { beforeEach, describe, expect, it } from "vitest"
import {
    ConcreteLocalFDORecord,
    ConcreteProfile,
    LocalFDOGraph,
    type LocalID,
} from "@fdo-sdk/primitives"
import { ContinuousMappingContext } from "@fdo-sdk/mapping"
import {
    PlaygroundBackend,
    type StoreEvent,
} from "../src/runner/playground-backend.js"

const nameAttr = { pid: "attr/name", readableName: "name" }

const authorProfile = new ConcreteProfile({
    pid: "profile/author",
    readableName: "Author",
    mapping: { name: nameAttr.pid },
})

function makeRecord(localID: LocalID, name: string) {
    const record = new ConcreteLocalFDORecord(localID)
    record.addProfile(authorProfile, { name })
    return record
}

function collect(): { events: StoreEvent[]; subscribe: () => () => void } {
    const events: StoreEvent[] = []
    return {
        events,
        subscribe: () =>
            PlaygroundBackend.onStoreChange((next) => events.push(...next)),
    }
}

beforeEach(() => {
    PlaygroundBackend.resetStore()
})

describe("PlaygroundBackend publish events", () => {
    it("emits a created event for a new record", async () => {
        const { events, subscribe } = collect()
        const unsubscribe = subscribe()
        const backend = PlaygroundBackend.getInstance()

        await backend.publishRecord(makeRecord("LOCAL/one", "One"))

        expect(events).toEqual([
            { kind: "created", pid: "TEST/1", localID: "LOCAL/one" },
        ])
        unsubscribe()
    })

    it("emits an updated event when the record has a PID already", async () => {
        const { events, subscribe } = collect()
        const unsubscribe = subscribe()
        const backend = PlaygroundBackend.getInstance()
        const record = makeRecord("LOCAL/one", "One")
        await backend.publishRecord(record)

        record.set(nameAttr.pid, "One changed")
        await backend.publishRecord(record)

        expect(events).toEqual([
            { kind: "created", pid: "TEST/1", localID: "LOCAL/one" },
            { kind: "updated", pid: "TEST/1", localID: "LOCAL/one" },
        ])
        unsubscribe()
    })

    it("classifies the records of publishGraph by existing PID", async () => {
        const { events, subscribe } = collect()
        const unsubscribe = subscribe()
        const backend = PlaygroundBackend.getInstance()
        const graph = new LocalFDOGraph()
        graph.addRecord(makeRecord("LOCAL/one", "One"))
        graph.addRecord(makeRecord("LOCAL/two", "Two"))

        await backend.publishGraph(graph)
        expect(events.map((event) => event.kind)).toEqual([
            "created",
            "created",
        ])

        const changed = makeRecord("LOCAL/one", "One changed")
        ;(changed as { PID: string }).PID = "TEST/1"
        const secondGraph = new LocalFDOGraph()
        secondGraph.addRecord(changed)
        await backend.publishGraph(secondGraph)

        expect(events[2]).toEqual({
            kind: "updated",
            pid: "TEST/1",
            localID: "LOCAL/one",
        })
        unsubscribe()
    })

    it("classifies create/update/delete for continuous mappings", async () => {
        const { events, subscribe } = collect()
        const unsubscribe = subscribe()
        const backend = PlaygroundBackend.getInstance()

        const firstContext = new ContinuousMappingContext("TEST/mapping")
        firstContext.newRecord("LOCAL/one").set(nameAttr.pid, "One")
        await backend.publishContinuous(firstContext.build())

        expect(events).toEqual([
            { kind: "created", pid: "TEST/1", localID: "LOCAL/one" },
            { kind: "created-mapping", pid: "TEST/mapping" },
        ])

        const updateContext = new ContinuousMappingContext("TEST/mapping")
        await updateContext.resolveRemoteGraph(backend)
        updateContext.newRecord("LOCAL/one").set(nameAttr.pid, "One changed")
        updateContext.newRecord("LOCAL/two").set(nameAttr.pid, "Two")
        const result = updateContext.build()
        await backend.publishContinuous(result)

        expect(events.slice(2)).toEqual([
            { kind: "created", pid: "TEST/2", localID: "LOCAL/two" },
            { kind: "updated", pid: "TEST/1", localID: "LOCAL/one" },
        ])
        unsubscribe()
    })

    it("emits created-mapping only once per mapping PID", async () => {
        const { events, subscribe } = collect()
        const unsubscribe = subscribe()
        const backend = PlaygroundBackend.getInstance()

        const firstContext = new ContinuousMappingContext("TEST/mapping")
        firstContext.newRecord("LOCAL/one").set(nameAttr.pid, "One")
        await backend.publishContinuous(firstContext.build())

        const secondContext = new ContinuousMappingContext("TEST/mapping")
        await secondContext.resolveRemoteGraph(backend)
        secondContext.newRecord("LOCAL/one").set(nameAttr.pid, "One changed")
        await backend.publishContinuous(secondContext.build())

        expect(
            events.filter((event) => event.kind === "created-mapping"),
        ).toEqual([{ kind: "created-mapping", pid: "TEST/mapping" }])
        unsubscribe()
    })
})

describe("PlaygroundBackend store tracking", () => {
    it("getAllRecords returns every tracked record", async () => {
        const backend = PlaygroundBackend.getInstance()
        const graph = new LocalFDOGraph()
        graph.addRecord(makeRecord("LOCAL/one", "One"))
        graph.addRecord(makeRecord("LOCAL/two", "Two"))
        await backend.publishGraph(graph)

        const records = await backend.getAllRecords()
        expect(records.map((record) => record.PID).sort()).toEqual([
            "TEST/1",
            "TEST/2",
        ])
    })

    it("drops deleted PIDs from tracking", async () => {
        const backend = PlaygroundBackend.getInstance()
        const context = new ContinuousMappingContext("TEST/mapping")
        context.newRecord("LOCAL/one").set(nameAttr.pid, "One")
        await backend.publishContinuous(context.build())

        const updateContext = new ContinuousMappingContext("TEST/mapping")
        await updateContext.resolveRemoteGraph(backend)
        const result = updateContext.build()
        expect(result.delete).toEqual(["TEST/1"])
        await backend.publishContinuous(result)

        expect(await backend.getAllRecords()).toEqual([
            expect.objectContaining({ PID: "TEST/mapping" }),
        ])
    })

    it("resetStore clears tracking and emits an empty event list", async () => {
        const backend = PlaygroundBackend.getInstance()
        await backend.publishRecord(makeRecord("LOCAL/one", "One"))

        const { events, subscribe } = collect()
        const unsubscribe = subscribe()
        PlaygroundBackend.resetStore()

        expect(events).toEqual([])
        expect(await backend.getAllRecords()).toEqual([])
        unsubscribe()
    })
})
