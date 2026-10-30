import * as primitives from "@fdo-sdk/primitives"
import * as mapping from "@fdo-sdk/mapping"
import * as simpleTypes from "@fdo-sdk/simple-types"
import { TransformError, transformSource } from "./transform.js"
import { snapshotRecords, type GraphSnapshot } from "./snapshot.js"
import { PlaygroundBackend, type StoreEvent } from "./playground-backend.js"

export type ConsoleLevel = "log" | "info" | "warn" | "error"

export type ConsoleEntry = { level: ConsoleLevel; text: string }

export type RunOutcome = {
    console: ConsoleEntry[]
    error: string | null
}

export type RunHooks = {
    onConsoleEntry?: (entry: ConsoleEntry) => void
    onSnapshot?: (snapshot: GraphSnapshot) => void
}

const MAX_CONSOLE_ENTRIES = 300

const SNAPSHOT_LABEL = "Published graph"

/**
 * The offset between a line number in a runtime stack trace and the line in
 * the user's source: the two header lines `new Function` reports (the
 * `function anonymous(...)` line and the `) {` line) plus the two wrapper
 * lines ("use strict" and the async wrapper). The import preamble is part of
 * the code, so its line count is added on top.
 */
const FIXED_LINE_OFFSET = 4

type CapturedConsole = {
    log: (...values: unknown[]) => void
    info: (...values: unknown[]) => void
    warn: (...values: unknown[]) => void
    error: (...values: unknown[]) => void
}

/**
 * Runs a user script in the browser: imports are rewritten to the SDK
 * namespaces, `console` is captured and every store change of the
 * `PlaygroundBackend` is logged and streamed to the UI as a new snapshot of
 * the published graph.
 */
export async function runScript(
    source: string,
    hooks: RunHooks = {},
): Promise<RunOutcome> {
    const consoleEntries: ConsoleEntry[] = []
    let suppressed = false

    const push = (level: ConsoleLevel, values: unknown[]): void => {
        if (consoleEntries.length >= MAX_CONSOLE_ENTRIES) {
            if (!suppressed) {
                suppressed = true
                const entry: ConsoleEntry = {
                    level: "warn",
                    text: "Console output truncated after 300 entries.",
                }
                consoleEntries.push(entry)
                hooks.onConsoleEntry?.(entry)
            }
            return
        }
        const entry: ConsoleEntry = {
            level,
            text: values.map(formatValue).join(" "),
        }
        consoleEntries.push(entry)
        hooks.onConsoleEntry?.(entry)
    }

    const capturedConsole: CapturedConsole = {
        log: (...values) => push("log", values),
        info: (...values) => push("info", values),
        warn: (...values) => push("warn", values),
        error: (...values) => push("error", values),
    }

    const backend = PlaygroundBackend.getInstance()
    let snapshotQueue = Promise.resolve()
    const refreshSnapshot = (): void => {
        // Serializing keeps the snapshots in emission order even though
        // getAllRecords() resolves asynchronously.
        snapshotQueue = snapshotQueue.then(async () => {
            const records = await backend.getAllRecords()
            hooks.onSnapshot?.(snapshotRecords(records, SNAPSHOT_LABEL))
        })
    }
    const unsubscribe = PlaygroundBackend.onStoreChange((events) => {
        for (const event of events) {
            push("info", [describeEvent(event)])
        }
        refreshSnapshot()
    })

    let preambleLines = 0
    try {
        const transform = await transformSource(source)
        preambleLines = transform.preambleLines
        const execute = new Function(
            "__fdo_primitives",
            "__fdo_mapping",
            "__fdo_simple_types",
            "__fdo_playground",
            "console",
            `"use strict";
return (async () => {
${transform.code}
})()`,
        ) as (
            p: typeof primitives,
            m: typeof mapping,
            s: typeof simpleTypes,
            g: { PlaygroundBackend: typeof PlaygroundBackend },
            c: CapturedConsole,
        ) => Promise<void>

        await execute(
            primitives,
            mapping,
            simpleTypes,
            { PlaygroundBackend },
            capturedConsole,
        )
    } catch (error) {
        const message =
            error instanceof TransformError
                ? error.message
                : formatThrown(error, FIXED_LINE_OFFSET + preambleLines)
        const entry: ConsoleEntry = { level: "error", text: message }
        consoleEntries.push(entry)
        hooks.onConsoleEntry?.(entry)
        return { console: consoleEntries, error: message }
    } finally {
        unsubscribe()
    }

    return { console: consoleEntries, error: null }
}

export function describeEvent(event: StoreEvent): string {
    switch (event.kind) {
        case "created":
            return `created record ${event.pid}${event.localID ? ` (${event.localID})` : ""}`
        case "updated":
            return `updated record ${event.pid}${event.localID ? ` (${event.localID})` : ""}`
        case "deleted":
            return `deleted record ${event.pid}`
        case "created-mapping":
            return `created mapping ${event.pid}`
    }
}

function formatThrown(error: unknown, offset: number): string {
    const message =
        error instanceof Error
            ? `${error.name}: ${error.message}`
            : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    const match = stack?.match(/<anonymous>:(\d+):\d+/)
    if (match) {
        const line = Number(match[1]) - offset
        if (line > 0) return `${message} (line ${line})`
    }
    return message
}

function formatValue(value: unknown): string {
    if (typeof value === "string") return value
    if (value instanceof Error) return `${value.name}: ${value.message}`
    if (typeof value === "function") {
        return `[function ${value.name || "anonymous"}]`
    }
    if (value === undefined) return "undefined"
    if (typeof value === "symbol" || typeof value === "bigint") {
        return String(value)
    }
    try {
        return JSON.stringify(value, null, 2) ?? String(value)
    } catch {
        return String(value)
    }
}
