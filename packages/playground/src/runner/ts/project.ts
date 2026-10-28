import ts from "typescript"
import {
    applyHints,
    shadowToUserOffset,
    userToShadowOffset,
    type HintInsertion,
} from "./hints.js"

export const USER_FILE = "/user-script.js"

export const GLOBALS_FILE = "/playground-globals.d.ts"

/**
 * The few ambient globals a playground script can use: `console` is injected
 * into the sandbox, `structuredClone` is used by the SDK itself. The DOM lib
 * is not loaded — scripts run in the sandbox, not in the page.
 */
export const GLOBALS_DECLARATION = `
declare const console: {
    log: (...values: unknown[]) => void
    info: (...values: unknown[]) => void
    warn: (...values: unknown[]) => void
    error: (...values: unknown[]) => void
}

declare function structuredClone<T>(value: T): T
`

export type TsCompletion = {
    name: string
    kind: string | undefined
    insertText: string | undefined
    isRecommended: boolean
    isAutoImport: boolean
}

export type TsDiagnostic = {
    message: string
    code: number
    severity: "error" | "warning"
    start: number
    end: number
}

export type TsEntryDetails = { detail: string; doc: string } | null

export type FdoTsProject = {
    update(code: string): void
    complete(offset: number): TsCompletion[]
    details(name: string, offset: number): TsEntryDetails
    diagnostics(): TsDiagnostic[]
}

const SDK_MODULES: Record<string, string> = {
    "@fdo-sdk/primitives": "/node_modules/@fdo-sdk/primitives/src/index.ts",
    "@fdo-sdk/mapping": "/node_modules/@fdo-sdk/mapping/src/index.ts",
    "@fdo-sdk/playground":
        "/node_modules/@fdo-sdk/playground/src/runner/playground-backend.ts",
}

const COMPILER_OPTIONS: ts.CompilerOptions = {
    allowJs: true,
    checkJs: true,
    strict: false,
    noImplicitAny: false,
    noUnusedLocals: false,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    esModuleInterop: true,
    skipLibCheck: true,
    allowNonTsExtensions: true,
    lib: ["esnext"],
    noEmit: true,
}

function displayPartsToString(
    parts: ts.SymbolDisplayPart[] | undefined,
): string {
    return (parts ?? []).map((part) => part.text).join("")
}

/**
 * A TypeScript language service over a virtual file system: the SDK sources,
 * the ES lib files, the playground globals and the user's script, compiled as
 * plain JavaScript (checkJs, no strict mode, no annotations required). It
 * powers the editor's completions and its lenient type validation.
 */
export function createProject(
    sdkFiles: Record<string, string>,
    libFiles: Record<string, string>,
): FdoTsProject {
    const virtualFiles: Record<string, string> = {
        [GLOBALS_FILE]: GLOBALS_DECLARATION,
        ...sdkFiles,
    }
    for (const [name, content] of Object.entries(libFiles)) {
        virtualFiles[`/lib/${name}`] = content
    }

    let version = 0
    let currentCode = ""
    let insertions: HintInsertion[] = []

    function resolveRelative(
        specifier: string,
        containingFile: string,
    ): string | undefined {
        const baseDir = containingFile.slice(0, containingFile.lastIndexOf("/"))
        const segments: string[] = []
        for (const part of `${baseDir}/${specifier}`.split("/")) {
            if (part === "" || part === ".") continue
            if (part === "..") segments.pop()
            else segments.push(part)
        }
        const joined = `/${segments.join("/")}`
        const candidates = [
            joined,
            joined.replace(/\.js$/, ".ts"),
            joined.replace(/\.js$/, ".tsx"),
        ]
        return candidates.find((candidate) => candidate in virtualFiles)
    }

    const host: ts.LanguageServiceHost = {
        getScriptFileNames: () => [USER_FILE, ...Object.keys(virtualFiles)],
        getScriptVersion: (fileName) =>
            fileName === USER_FILE ? String(version) : "0",
        getScriptSnapshot: (fileName) => {
            const content =
                fileName === USER_FILE ? currentCode : virtualFiles[fileName]
            return content === undefined
                ? undefined
                : ts.ScriptSnapshot.fromString(content)
        },
        getCurrentDirectory: () => "/",
        getCompilationSettings: () => COMPILER_OPTIONS,
        resolveModuleNames: (moduleNames, containingFile) =>
            moduleNames.map((moduleName) => {
                const mapped = SDK_MODULES[moduleName]
                const resolved =
                    mapped ??
                    (moduleName.startsWith(".") || moduleName.startsWith("/")
                        ? resolveRelative(moduleName, containingFile)
                        : undefined)
                return resolved === undefined
                    ? undefined
                    : { resolvedFileName: resolved }
            }),
        getDefaultLibFileName: () => "/lib/lib.esnext.d.ts",
        fileExists: (fileName) =>
            fileName === USER_FILE || fileName in virtualFiles,
        readFile: (fileName) =>
            fileName === USER_FILE ? currentCode : virtualFiles[fileName],
        directoryExists: (dirName) =>
            dirName === "/" ||
            Object.keys(virtualFiles).some((fileName) =>
                fileName.startsWith(`${dirName}/`),
            ),
        getDirectories: () => [],
    }

    const services = ts.createLanguageService(host)

    function shadowOffset(userOffset: number): number | null {
        return userToShadowOffset(insertions, userOffset)
    }

    function userOffset(shadowPosition: number): number | null {
        return shadowToUserOffset(insertions, shadowPosition)
    }

    return {
        update(code: string): void {
            const applied = applyHints(code)
            currentCode = applied.shadow
            insertions = applied.insertions
            version++
        },

        complete(offset: number): TsCompletion[] {
            const at = shadowOffset(offset)
            if (at === null) return []
            const result = services.getCompletionsAtPosition(
                USER_FILE,
                at,
                undefined,
            )
            const prefix = (currentCode
                .slice(0, at)
                .match(/[\p{L}\p{N}_$]*$/u) ?? [""])[0].toLowerCase()
            return (result?.entries ?? [])
                .filter(
                    (entry) =>
                        entry.source === undefined &&
                        entry.kind !== ts.ScriptElementKind.keyword &&
                        entry.name.toLowerCase().startsWith(prefix),
                )
                .map((entry) => ({
                    name: entry.name,
                    kind: entry.kind === "" ? undefined : entry.kind,
                    insertText: entry.insertText ?? undefined,
                    isRecommended: entry.isRecommended ?? false,
                    isAutoImport: entry.source !== undefined,
                }))
        },

        details(name: string, offset: number): TsEntryDetails {
            const at = shadowOffset(offset)
            if (at === null) return null
            const details = services.getCompletionEntryDetails(
                USER_FILE,
                at,
                name,
                undefined,
                undefined,
                undefined,
                undefined,
            )
            if (!details) return null
            return {
                detail: displayPartsToString(details.displayParts),
                doc: displayPartsToString(details.documentation),
            }
        },

        diagnostics(): TsDiagnostic[] {
            const result: TsDiagnostic[] = []
            const syntactic = services.getSyntacticDiagnostics(USER_FILE)
            const semantic = services.getSemanticDiagnostics(USER_FILE)

            for (const [diagnostic, severity] of [
                ...syntactic.map((entry) => [entry, "error"] as const),
                ...semantic.map((entry) => [entry, "warning"] as const),
            ]) {
                if (
                    diagnostic.start === undefined ||
                    diagnostic.length === undefined
                ) {
                    continue
                }
                const start = userOffset(diagnostic.start)
                const end = userOffset(diagnostic.start + diagnostic.length)
                if (start === null || end === null) continue
                result.push({
                    message: ts.flattenDiagnosticMessageText(
                        diagnostic.messageText,
                        "\n",
                    ),
                    code: diagnostic.code,
                    severity,
                    start,
                    end,
                })
            }
            return result
        },
    }
}
