import type {
    TsCompletion,
    TsDiagnostic,
    TsEntryDetails,
    TsHover,
} from "./project.js"
import type { WorkerRequest, WorkerResponse } from "./protocol.js"

type Pending = {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
}

/**
 * Client for the TypeScript language service worker. All calls are serialized
 * through one worker instance; each request is answered by the response that
 * carries its id.
 */
class TsWorkerClient {
    private worker: Worker | null = null
    private nextId = 0
    private pending = new Map<number, Pending>()

    private ensureWorker(): Worker {
        if (this.worker !== null) return this.worker
        const worker = new Worker(new URL("./worker.ts", import.meta.url), {
            type: "module",
        })
        worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const { id, result, error } = event.data
            const pending = this.pending.get(id)
            if (pending === undefined) return
            this.pending.delete(id)
            if (error !== undefined) pending.reject(new Error(error))
            else pending.resolve(result)
        }
        worker.onerror = (event) => {
            const failure = new Error(
                event.message || "TypeScript service failed to start",
            )
            for (const pending of this.pending.values()) pending.reject(failure)
            this.pending.clear()
        }
        this.worker = worker
        return worker
    }

    private request<R>(make: (id: number) => WorkerRequest): Promise<R> {
        const worker = this.ensureWorker()
        const id = this.nextId++
        return new Promise<R>((resolve, reject) => {
            this.pending.set(id, {
                resolve: resolve as (value: unknown) => void,
                reject,
            })
            worker.postMessage(make(id))
        })
    }

    update(code: string): Promise<void> {
        return this.request((id) => ({ id, type: "update", code }))
    }

    complete(offset: number): Promise<TsCompletion[]> {
        return this.request((id) => ({ id, type: "complete", offset }))
    }

    details(name: string, offset: number): Promise<TsEntryDetails> {
        return this.request((id) => ({ id, type: "details", name, offset }))
    }

    hover(offset: number): Promise<TsHover> {
        return this.request((id) => ({ id, type: "hover", offset }))
    }

    diagnostics(): Promise<TsDiagnostic[]> {
        return this.request((id) => ({ id, type: "diagnostics" }))
    }
}

export const tsClient = new TsWorkerClient()
