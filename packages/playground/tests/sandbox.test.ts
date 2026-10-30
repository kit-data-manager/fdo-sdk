import { describe, expect, it, vi } from "vitest"
import { TransformError, transformSource } from "../src/runner/transform.js"
import { runScript, type ConsoleEntry } from "../src/runner/sandbox.js"
import { PlaygroundBackend } from "../src/runner/playground-backend.js"
import type { GraphSnapshot } from "../src/runner/snapshot.js"

describe("transformSource", () => {
    it("rewrites named imports into destructuring preamble", async () => {
        const result = await transformSource(
            'import { keep, skip } from "@fdo-sdk/primitives"\nconst x = keep()',
        )

        expect(result.preambleLines).toBe(1)
        const lines = result.code.split("\n")
        expect(lines[0]).toContain("const { keep, skip } = __fdo_primitives;")
        expect(lines[2]!.trim()).toBe("const x = keep()")
        expect(result.code).not.toContain("import")
    })

    it("rewrites aliased named imports", async () => {
        const result = await transformSource(
            'import { keep as k } from "@fdo-sdk/primitives"\nk()',
        )

        expect(result.code).toContain("const { keep: k } = __fdo_primitives;")
        expect(result.code).not.toContain("import")
    })

    it("rewrites namespace imports", async () => {
        const result = await transformSource(
            'import * as mapping from "@fdo-sdk/mapping"\nmapping',
        )

        expect(result.preambleLines).toBe(1)
        expect(result.code).toContain("const mapping = __fdo_mapping;")
        expect(result.code).not.toContain("import")
    })

    it("drops side-effect-only imports", async () => {
        const result = await transformSource(
            'import "@fdo-sdk/mapping"\nconsole.log("hi")',
        )

        expect(result.preambleLines).toBe(0)
        expect(result.code.trim()).toBe('console.log("hi")')
    })

    it("keeps code without imports untouched", async () => {
        const result = await transformSource('console.log("hi")')

        expect(result.preambleLines).toBe(0)
        expect(result.code).toBe('console.log("hi")')
    })

    it("rejects unknown specifiers", async () => {
        await expect(
            transformSource('import fs from "node:fs"'),
        ).rejects.toThrowError(TransformError)
        await expect(
            transformSource('import x from "./other.js"'),
        ).rejects.toThrowError(/@fdo-sdk\/primitives/)
    })

    it("rejects default imports with a helpful message", async () => {
        await expect(
            transformSource('import P from "@fdo-sdk/primitives"'),
        ).rejects.toThrowError(/default export/)
        await expect(
            transformSource('import P, { keep } from "@fdo-sdk/primitives"'),
        ).rejects.toThrowError(/default export/)
    })

    it("rejects dynamic imports", async () => {
        await expect(
            transformSource('await import("@fdo-sdk/primitives")'),
        ).rejects.toThrowError(/dynamic/i)
    })

    it("rejects top-level exports", async () => {
        await expect(
            transformSource("export const x = 1"),
        ).rejects.toThrowError(/export/i)
    })

    it("handles imports spread over multiple lines", async () => {
        const source =
            'import {\n    keep,\n    skip,\n} from "@fdo-sdk/primitives"\nconst x = keep()'
        const result = await transformSource(source)

        expect(result.code).toContain(
            "const { keep, skip } = __fdo_primitives;",
        )
        const lines = result.code.split("\n")
        expect(lines[2]!.trim()).toBe("const x = keep()")
    })
})

describe("runScript", () => {
    it("runs user code and captures console output", async () => {
        PlaygroundBackend.resetStore()
        const outcome = await runScript(
            'import { keep } from "@fdo-sdk/primitives"\nconsole.log("value:", keep())',
        )

        expect(outcome.error).toBeNull()
        expect(outcome.console).toHaveLength(1)
        expect(outcome.console[0]!.level).toBe("log")
        expect(outcome.console[0]!.text).toContain('"mark": "keep"')
    })

    it("maps runtime errors back to user source lines", async () => {
        const outcome = await runScript(
            'const a = 1\nconst b = 2\nthrow new Error("boom")',
        )

        expect(outcome.error).toContain("boom")
        expect(outcome.error).toContain("line 3")
    })

    it("maps runtime errors back past the import preamble", async () => {
        const outcome = await runScript(
            'import { keep } from "@fdo-sdk/primitives"\nconst a = 1\nthrow new Error("boom")',
        )

        expect(outcome.error).toContain("boom")
        expect(outcome.error).toContain("line 3")
    })

    it("reports transform errors without a stack trace", async () => {
        PlaygroundBackend.resetStore()
        const outcome = await runScript('import fs from "node:fs"')

        expect(outcome.error).toContain("node:fs")
        expect(outcome.error).toContain("@fdo-sdk/primitives")
        expect(outcome.console.at(-1)?.level).toBe("error")
    })

    it("supports top level await", async () => {
        PlaygroundBackend.resetStore()
        const outcome = await runScript(
            'await Promise.resolve()\nconsole.log("done")',
        )

        expect(outcome.error).toBeNull()
        expect(outcome.console.at(-1)?.text).toBe("done")
    })

    it("streams console entries through the hooks", async () => {
        PlaygroundBackend.resetStore()
        const streamed: ConsoleEntry[] = []
        const outcome = await runScript(
            'console.log("one")\nconsole.warn("two")',
            { onConsoleEntry: (entry) => streamed.push(entry) },
        )

        expect(outcome.console).toHaveLength(2)
        expect(streamed).toEqual(outcome.console)
    })

    it("exposes @fdo-sdk/simple-types to user scripts", async () => {
        const outcome = await runScript(
            [
                'import { ConcreteLocalFDORecord } from "@fdo-sdk/primitives"',
                'import { SIMPLE_ATTRIBUTES, SIMPLE_PROFILES } from "@fdo-sdk/simple-types"',
                'const record = new ConcreteLocalFDORecord("LOCAL/one")',
                "record.addProfile(SIMPLE_PROFILES.DATA_OBJECT, {",
                '    dataObjectLocation: "https://example.org/data/one.nc",',
                '    dataObjectLicense: "CC-BY-4.0",',
                '    mimeType: "application/netcdf",',
                "})",
                "console.log(record.get(SIMPLE_ATTRIBUTES.MIME_TYPE))",
            ].join("\n"),
        )

        expect(outcome.error).toBeNull()
        expect(outcome.console).toContainEqual({
            level: "log",
            text: "application/netcdf",
        })
    })

    it("logs store events and streams published graph snapshots", async () => {
        PlaygroundBackend.resetStore()
        const snapshots: GraphSnapshot[] = []
        const outcome = await runScript(
            [
                'import { ConcreteLocalFDORecord, LocalFDOGraph } from "@fdo-sdk/primitives"',
                'import { PlaygroundBackend } from "@fdo-sdk/playground"',
                "const backend = PlaygroundBackend.getInstance()",
                'const record = new ConcreteLocalFDORecord("LOCAL/one")',
                'record.set("attr/name", "one")',
                "const graph = new LocalFDOGraph()",
                "graph.addRecord(record)",
                "await backend.publishGraph(graph)",
            ].join("\n"),
            { onSnapshot: (snapshot) => snapshots.push(snapshot) },
        )
        await vi.waitFor(() => {
            expect(snapshots.length).toBeGreaterThan(0)
        })

        expect(outcome.error).toBeNull()
        expect(outcome.console).toContainEqual({
            level: "info",
            text: "created record TEST/1 (LOCAL/one)",
        })
        const latest = snapshots.at(-1)!
        expect(latest.label).toBe("Published graph")
        expect(latest.records).toHaveLength(1)
        expect(latest.records[0]!.id).toBe("TEST/1")
        expect(latest.records[0]!.localID).toBe("LOCAL/one")
    })

    it("reports an updated record when a PID already exists", async () => {
        PlaygroundBackend.resetStore()
        const outcome = await runScript(
            [
                'import { ConcreteLocalFDORecord, LocalFDOGraph } from "@fdo-sdk/primitives"',
                'import { PlaygroundBackend } from "@fdo-sdk/playground"',
                "const backend = PlaygroundBackend.getInstance()",
                'const record = new ConcreteLocalFDORecord("LOCAL/one")',
                'record.set("attr/name", "one")',
                "const graph = new LocalFDOGraph()",
                "graph.addRecord(record)",
                "await backend.publishGraph(graph)",
                'record.set("attr/name", "one changed")',
                "await backend.publishGraph(graph)",
            ].join("\n"),
        )

        expect(outcome.error).toBeNull()
        expect(outcome.console).toContainEqual({
            level: "info",
            text: "created record TEST/1 (LOCAL/one)",
        })
        expect(outcome.console).toContainEqual({
            level: "info",
            text: "updated record TEST/1 (LOCAL/one)",
        })
    })
})
