export type WorkerRequest =
    | { id: number; type: "update"; code: string }
    | { id: number; type: "complete"; offset: number }
    | { id: number; type: "details"; name: string; offset: number }
    | { id: number; type: "diagnostics" }

export type WorkerResponse = {
    id: number
    result?: unknown
    error?: string
}
