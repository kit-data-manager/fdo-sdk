import { init, parse } from "es-module-lexer"

export class TransformError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "TransformError"
    }
}

export type TransformResult = {
    /** User code with all import statements blanked out. */
    code: string
    /** Number of preamble lines prepended in the executed wrapper. */
    preambleLines: number
}

const SDK_GLOBALS: Record<string, string> = {
    "@fdo-sdk/primitives": "__fdo_primitives",
    "@fdo-sdk/mapping": "__fdo_mapping",
    "@fdo-sdk/playground": "__fdo_playground",
}

let lexerReady: Promise<unknown> | null = null

function ensureLexer(): Promise<unknown> {
    lexerReady ??= init
    return lexerReady
}

type ParsedBinding =
    | { kind: "none" }
    | { kind: "namespace"; name: string }
    | { kind: "named"; names: { name: string; as: string }[] }

/**
 * Rewrites the imports of a user script so it can be executed with
 * `new Function`. Only imports from the SDK packages are allowed; they are
 * replaced by destructuring from the namespaces the sandbox injects. The
 * statements are blanked out with spaces instead of removed, so line and
 * column positions of the original source are preserved.
 */
export async function transformSource(
    source: string,
): Promise<TransformResult> {
    await ensureLexer()

    const [imports, exports] = parse(source, "playground.js")

    if (exports.length > 0) {
        throw new TransformError(
            "Top-level exports are not supported in the playground — call display(...) to hand results over to the UI instead.",
        )
    }

    const preambleLines: string[] = []
    let blanked = source

    for (const entry of [...imports].reverse()) {
        if (entry.d === -2) continue
        if (entry.d !== -1 || entry.n === undefined) {
            throw new TransformError(
                "Dynamic import() is not supported in the playground. Use static imports from @fdo-sdk/primitives, @fdo-sdk/mapping and @fdo-sdk/playground.",
            )
        }

        const specifier = entry.n
        const global = SDK_GLOBALS[specifier]
        if (!global) {
            throw new TransformError(
                `Importing "${specifier}" is not supported — the playground only allows "@fdo-sdk/primitives", "@fdo-sdk/mapping" and "@fdo-sdk/playground".`,
            )
        }

        const binding = parseBindings(source, entry.ss, entry.s, specifier)
        switch (binding.kind) {
            case "namespace":
                preambleLines.push(`const ${binding.name} = ${global};`)
                break
            case "named": {
                const names = binding.names
                    .map(({ name, as }) =>
                        name === as ? name : `${name}: ${as}`,
                    )
                    .join(", ")
                preambleLines.push(`const { ${names} } = ${global};`)
                break
            }
            case "none":
                break
        }

        blanked =
            blanked.slice(0, entry.ss) +
            " ".repeat(entry.se - entry.ss) +
            blanked.slice(entry.se)
    }

    const preamble = preambleLines.join("\n")
    return {
        code: preamble === "" ? blanked : `${preamble}\n${blanked}`,
        preambleLines: preambleLines.length,
    }
}

function parseBindings(
    source: string,
    statementStart: number,
    specifierStart: number,
    specifier: string,
): ParsedBinding {
    const bindings = source
        .slice(statementStart, specifierStart)
        .replace(/["']$/, "")
        .replace(/^import\b/, "")
        .replace(/\bfrom\s*$/, "")
        .trim()

    if (bindings === "") return { kind: "none" }

    if (/^[\w$]+$/.test(bindings) || /^[\w$]+\s*,/.test(bindings)) {
        throw new TransformError(
            `"${specifier}" has no default export — use named imports (import { x } from ...) or a namespace import (import * as x from ...).`,
        )
    }

    if (bindings.startsWith("{")) {
        const names = bindings
            .slice(1, -1)
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
                const match = part.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/)
                if (!match) {
                    throw new TransformError(
                        `Could not parse the import binding "${part}".`,
                    )
                }
                return { name: match[1]!, as: match[2] ?? match[1]! }
            })
        return { kind: "named", names }
    }

    const namespace = bindings.match(/^\*\s*as\s+([\w$]+)$/)
    if (namespace) return { kind: "namespace", name: namespace[1]! }

    throw new TransformError(
        `Could not parse the import statement of "${specifier}".`,
    )
}
