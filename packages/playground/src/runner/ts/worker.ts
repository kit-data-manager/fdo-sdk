import backendSource from "../playground-backend.ts?raw"
import { LIB_FILES } from "./lib-files.js"
import type { WorkerRequest, WorkerResponse } from "./protocol.js"
import { createProject } from "./project.js"

const primitives = import.meta.glob("../../../../primitives/src/**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
}) as Record<string, string>

const mapping = import.meta.glob("../../../../mapping/src/**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
}) as Record<string, string>

const simpleTypes = import.meta.glob("../../../../simple-types/src/**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
}) as Record<string, string>

function virtualize(key: string): string {
    const match = key.match(/(primitives|mapping|simple-types)\/src\/(.*)$/)
    if (match === null) throw new Error(`Unexpected SDK source path: ${key}`)
    return `/node_modules/@fdo-sdk/${match[1]}/src/${match[2]}`
}

const sdkFiles: Record<string, string> = {}
for (const [key, content] of Object.entries(primitives)) {
    sdkFiles[virtualize(key)] = content
}
for (const [key, content] of Object.entries(mapping)) {
    sdkFiles[virtualize(key)] = content
}
for (const [key, content] of Object.entries(simpleTypes)) {
    sdkFiles[virtualize(key)] = content
}
sdkFiles["/node_modules/@fdo-sdk/playground/src/runner/playground-backend.ts"] =
    backendSource

const project = createProject(sdkFiles, LIB_FILES)

const worker = self as unknown as {
    onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
    postMessage: (message: WorkerResponse) => void
}

worker.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const request = event.data
    let result: unknown
    switch (request.type) {
        case "update":
            project.update(request.code)
            break
        case "complete":
            result = project.complete(request.offset)
            break
        case "details":
            result = project.details(request.name, request.offset)
            break
        case "diagnostics":
            result = project.diagnostics()
            break
    }
    worker.postMessage({ id: request.id, result })
}
