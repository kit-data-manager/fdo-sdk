import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { createProject, type FdoTsProject } from "../src/runner/ts/project.js"

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))

function collectSources(pkg: string): Record<string, string> {
    const root = join(here, "../../", pkg, "src")
    const files: Record<string, string> = {}
    const walk = (dir: string): void => {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry)
            if (statSync(full).isDirectory()) {
                walk(full)
            } else if (entry.endsWith(".ts")) {
                const virtual =
                    "/node_modules/@fdo-sdk/" +
                    pkg +
                    "/src/" +
                    relative(root, full).replaceAll("\\", "/")
                files[virtual] = readFileSync(full, "utf8")
            }
        }
    }
    walk(root)
    return files
}

function collectLibs(): Record<string, string> {
    let dir = dirname(require.resolve("typescript"))
    let libDir: string | null = null
    for (let i = 0; i < 3 && libDir === null; i++) {
        const candidate = join(dir, "lib")
        if (existsSync(join(candidate, "lib.es5.d.ts"))) libDir = candidate
        dir = dirname(dir)
    }
    if (libDir === null) throw new Error("typescript lib directory not found")

    const files: Record<string, string> = {}
    for (const entry of readdirSync(libDir)) {
        if (/^lib\..*\.d\.ts$/.test(entry)) {
            files[entry] = readFileSync(join(libDir, entry), "utf8")
        }
    }
    return files
}

function makeProject(): FdoTsProject {
    return createProject(
        {
            ...collectSources("primitives"),
            ...collectSources("mapping"),
            ...collectSources("simple-types"),
            "/node_modules/@fdo-sdk/playground/src/runner/playground-backend.ts":
                readFileSync(
                    join(here, "../src/runner/playground-backend.ts"),
                    "utf8",
                ),
        },
        collectLibs(),
    )
}

function completeNames(project: FdoTsProject, code: string): string[] {
    project.update(code)
    return project.complete(code.length).map((entry) => entry.name)
}

describe("createProject completions", () => {
    it("completes record members on a record variable", () => {
        const project = makeProject()
        const names = completeNames(
            project,
            'import { ConcreteLocalFDORecord } from "@fdo-sdk/primitives"\nconst record = new ConcreteLocalFDORecord("LOCAL/1")\nrecord.',
        )

        expect(names).toContain("addProfile")
        expect(names).toContain("addReferenceBidi")
        expect(names).not.toContain("build")
        expect(names).not.toContain("findRecord")
    })

    it("completes graph members on a graph variable", () => {
        const project = makeProject()
        const names = completeNames(
            project,
            'import { LocalFDOGraph } from "@fdo-sdk/primitives"\nconst graph = new LocalFDOGraph()\ngraph.',
        )

        expect(names).toContain("build")
        expect(names).toContain("addRecord")
        expect(names).not.toContain("addProfile")
    })

    it("infers the mapping context parameter through the JSDoc hint", () => {
        const project = makeProject()
        const code = [
            'import { ContinuousMappingContext } from "@fdo-sdk/mapping"',
            "function mapping(context, source) {",
            "    context.",
            "}",
        ].join("\n")
        project.update(code)
        const names = project
            .complete(code.indexOf("context.") + "context.".length)
            .map((entry) => entry.name)

        expect(names).toContain("newRecord")
        expect(names).toContain("resolveRemoteGraph")
    })

    it("completes PlaygroundBackend static members", () => {
        const project = makeProject()
        const names = completeNames(
            project,
            'import { PlaygroundBackend } from "@fdo-sdk/playground"\nPlaygroundBackend.',
        )

        expect(names).toContain("resetStore")
        expect(names).toContain("onStoreChange")
    })

    it("completes the simple types package", () => {
        const project = makeProject()
        const names = completeNames(
            project,
            'import { SIMPLE_PROFILES } from "@fdo-sdk/simple-types"\nSIMPLE_PROFILES.',
        )

        expect(names).toContain("CORE")
        expect(names).toContain("DATA_OBJECT")
        expect(names).toContain("SOFTWARE")
        expect(names).toContain("PUBLICATION")
    })

    it("completes the published result of a publish call", () => {
        const project = makeProject()
        const names = completeNames(
            project,
            [
                'import { ConcreteLocalFDORecord } from "@fdo-sdk/primitives"',
                'import { PlaygroundBackend } from "@fdo-sdk/playground"',
                "const backend = PlaygroundBackend.getInstance()",
                'const record = new ConcreteLocalFDORecord("LOCAL/1")',
                "record.addProfile",
                "const published = await backend.publishGraph(record)",
                "published.",
            ].join("\n"),
        )

        expect(names).toContain("getRecords")
        expect(names).not.toContain("addProfile")
    })

    it("filters completions by the typed prefix", () => {
        const project = makeProject()
        const names = completeNames(
            project,
            'import { LocalFDOGraph } from "@fdo-sdk/primitives"\nconst graph = new LocalFDOGraph()\ngraph.addRec',
        )

        expect(names).toContain("addRecord")
        expect(names).not.toContain("build")
    })

    it("returns entry details with documentation", () => {
        const project = makeProject()
        const code =
            'import { LocalFDOGraph } from "@fdo-sdk/primitives"\nconst graph = new LocalFDOGraph()\ngraph.'
        project.update(code)
        const details = project.details("addRecord", code.length)

        expect(details).not.toBeNull()
        expect(details!.detail).toContain("addRecord")
    })

    it("maps positions back past the JSDoc hints", () => {
        const project = makeProject()
        const code = [
            "function mapping(context, source) {",
            "    const record = context.newRecord()",
            "    record.build()",
            "}",
        ].join("\n")
        project.update(code)
        const diagnostics = project.diagnostics()

        expect(diagnostics.length).toBeGreaterThan(0)
        const propertyError = diagnostics.find(
            (diagnostic) => diagnostic.code === 2339,
        )
        expect(propertyError).toBeDefined()
        expect(propertyError!.start).toBe(code.indexOf("build"))
    })
})

describe("createProject diagnostics", () => {
    it("warns about a non-existent member", () => {
        const project = makeProject()
        project.update(
            'import { ConcreteLocalFDORecord } from "@fdo-sdk/primitives"\nconst record = new ConcreteLocalFDORecord("LOCAL/1")\nrecord.build()',
        )
        const diagnostics = project.diagnostics()

        expect(diagnostics.some((diagnostic) => diagnostic.code === 2339)).toBe(
            true,
        )
        expect(
            diagnostics.every(
                (diagnostic) => diagnostic.severity === "warning",
            ),
        ).toBe(true)
    })

    it("errors on syntax mistakes", () => {
        const project = makeProject()
        project.update("const x = (")
        const diagnostics = project.diagnostics()

        expect(
            diagnostics.some((diagnostic) => diagnostic.severity === "error"),
        ).toBe(true)
    })

    it("does not report unused variables", () => {
        const project = makeProject()
        project.update(
            'import { ConcreteLocalFDORecord } from "@fdo-sdk/primitives"\nconst unused = new ConcreteLocalFDORecord("LOCAL/1")',
        )

        expect(project.diagnostics()).toEqual([])
    })

    it("accepts valid SDK usage without diagnostics", () => {
        const project = makeProject()
        project.update(
            [
                'import { ConcreteLocalFDORecord, LocalFDOGraph } from "@fdo-sdk/primitives"',
                'import { ContinuousMappingContext } from "@fdo-sdk/mapping"',
                'import { PlaygroundBackend } from "@fdo-sdk/playground"',
                "",
                "PlaygroundBackend.resetStore()",
                "const backend = PlaygroundBackend.getInstance()",
                'const context = new ContinuousMappingContext("TEST/mapping")',
                'const record = context.newRecord("LOCAL/1")',
                'record.set("attr/name", "x")',
                'const local = new ConcreteLocalFDORecord("LOCAL/2")',
                "const graph = new LocalFDOGraph()",
                "graph.addRecord(local)",
                "graph.build()",
                "console.log(graph.toJSON())",
                "await backend.publishGraph(graph)",
            ].join("\n"),
        )

        const diagnostics = project.diagnostics()
        expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual([])
    })

    it("reports no diagnostics for an empty script", () => {
        const project = makeProject()
        project.update("")

        expect(project.diagnostics()).toEqual([])
    })
})
