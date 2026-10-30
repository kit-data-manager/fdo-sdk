import type {
    FDORecord,
    LocalID,
    PID,
    PublishedFDORecord,
    ReadOnlyFDOGraph,
} from "@fdo-sdk/primitives"
import {
    LocalTestingBackend,
    type ContinuousPublishResult,
    type MappingResult,
} from "@fdo-sdk/mapping"

export type StoreEvent =
    | { kind: "created"; pid: PID; localID: LocalID | undefined }
    | { kind: "updated"; pid: PID; localID: LocalID | undefined }
    | { kind: "deleted"; pid: PID }
    | { kind: "created-mapping"; pid: PID }

type Listener = (events: StoreEvent[]) => void

type PendingPublish = { record: FDORecord; kind: "created" | "updated" }

function localIDOf(record: FDORecord): LocalID | undefined {
    return (record as { localID?: LocalID }).localID
}

/**
 * The playground backend: the in-memory testing backend, instrumented for
 * the playground. It is a singleton: {@link getInstance} always returns the
 * same instance, backed by the shared store of `LocalTestingBackend` that
 * persists between runs.
 *
 * It tracks every PID it published so the UI can always show the current
 * state of the whole store, and it emits store events ("created record ...",
 * "updated record ...", "deleted record ...") whenever records are
 * published, so the log can tell the story of a mapping run.
 */
export class PlaygroundBackend extends LocalTestingBackend {
    static #instance: PlaygroundBackend | undefined
    static #pids = new Set<PID>()
    static #listeners = new Set<Listener>()

    static getInstance(): PlaygroundBackend {
        PlaygroundBackend.#instance ??= new PlaygroundBackend()
        return PlaygroundBackend.#instance
    }

    private constructor() {
        super()
    }

    static onStoreChange(listener: Listener): () => void {
        PlaygroundBackend.#listeners.add(listener)
        return () => {
            PlaygroundBackend.#listeners.delete(listener)
        }
    }

    static override resetStore(): void {
        super.resetStore()
        PlaygroundBackend.#pids.clear()
        PlaygroundBackend.emit([])
    }

    static emit(events: StoreEvent[]): void {
        for (const listener of PlaygroundBackend.#listeners) {
            listener(events)
        }
    }

    override async publishContinuous(
        mappingResult: MappingResult,
    ): Promise<ContinuousPublishResult> {
        // The mapping result already classifies the records: create holds the
        // records that are not in the remote graph yet, update holds the ones
        // that are. The PIDs are assigned during publishing.
        const pending: PendingPublish[] = [
            ...mappingResult.create
                .getRecords()
                .map((record) => ({ record, kind: "created" as const })),
            ...mappingResult.update
                .getRecords()
                .map((record) => ({ record, kind: "updated" as const })),
        ]
        const mappingIsNew = !PlaygroundBackend.#pids.has(
            mappingResult.mappingPID,
        )

        const published = await super.publishContinuous(mappingResult)

        const events: StoreEvent[] = this.recordEvents(pending)
        for (const pid of published.deleted) {
            PlaygroundBackend.#pids.delete(pid)
            events.push({ kind: "deleted", pid })
        }
        if (mappingIsNew) {
            events.push({
                kind: "created-mapping",
                pid: mappingResult.mappingPID,
            })
        }
        PlaygroundBackend.#pids.add(mappingResult.mappingPID)
        PlaygroundBackend.emit(events)
        return published
    }

    override async publishGraph(
        graph: ReadOnlyFDOGraph<FDORecord>,
    ): Promise<ReadOnlyFDOGraph<PublishedFDORecord>> {
        const pending: PendingPublish[] = graph.getRecords().map((record) => ({
            record,
            kind: record.PID ? ("updated" as const) : ("created" as const),
        }))

        const published = await super.publishGraph(graph)

        PlaygroundBackend.emit(this.recordEvents(pending))
        return published
    }

    override async publishRecord(
        record: FDORecord,
    ): Promise<PublishedFDORecord> {
        const kind: "created" | "updated" = record.PID ? "updated" : "created"

        const published = await super.publishRecord(record)

        PlaygroundBackend.emit(this.recordEvents([{ record, kind }]))
        return published
    }

    /**
     * All records the store currently holds, as far as they were published
     * through this class. This is the state the playground shows as the
     * published graph.
     */
    async getAllRecords(): Promise<PublishedFDORecord[]> {
        const resolved = await Promise.all(
            [...PlaygroundBackend.#pids].map((pid) => this.resolveRecord(pid)),
        )
        return resolved.filter(
            (record): record is PublishedFDORecord => record !== undefined,
        )
    }

    /**
     * Collects the created/updated events of one publish. Must run after the
     * actual publish, because the PIDs of freshly created records are
     * assigned during publishing.
     */
    private recordEvents(pending: PendingPublish[]): StoreEvent[] {
        const events: StoreEvent[] = []
        for (const { record, kind } of pending) {
            if (!record.PID) continue
            PlaygroundBackend.#pids.add(record.PID)
            events.push({ kind, pid: record.PID, localID: localIDOf(record) })
        }
        return events
    }
}
