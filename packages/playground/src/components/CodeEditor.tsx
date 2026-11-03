import {
    autocompletion,
    type Completion,
    type CompletionContext,
    type CompletionResult,
    type CompletionSource,
} from "@codemirror/autocomplete"
import { javascript } from "@codemirror/lang-javascript"
import { linter, type Diagnostic } from "@codemirror/lint"
import { Prec } from "@codemirror/state"
import { hoverTooltip, keymap } from "@codemirror/view"
import CodeMirror from "@uiw/react-codemirror"
import { foldImports, importFolding } from "./importFolding.js"
import { tsClient } from "../runner/ts/client.js"
import type { TsCompletion } from "../runner/ts/project.js"

/** TypeScript's ScriptElementKind values (TS 6 strings) to CodeMirror types. */
const KIND_TYPES: Record<string, string> = {
    method: "method",
    function: "function",
    "local function": "function",
    property: "property",
    getter: "property",
    setter: "property",
    var: "variable",
    "local var": "variable",
    let: "variable",
    const: "variable",
    class: "class",
    "local class": "class",
    interface: "interface",
    type: "type",
    enum: "enum",
    "enum member": "constant",
}

function completionType(kind: string | undefined): string | undefined {
    if (kind === undefined) return undefined
    return KIND_TYPES[kind]
}

async function showDetails(
    entry: TsCompletion,
    offset: number,
): Promise<HTMLElement | null> {
    const details = await tsClient.details(entry.name, offset)
    if (details === null) return null
    const container = document.createElement("div")
    container.style.cssText = "padding:4px;max-width:420px"
    const signature = document.createElement("code")
    signature.textContent = details.detail
    container.append(signature)
    if (details.doc !== "") {
        const doc = document.createElement("div")
        doc.style.cssText = "margin-top:4px;white-space:pre-wrap"
        doc.textContent = details.doc
        container.append(doc)
    }
    return container
}

const tsCompletionSource: CompletionSource = async (
    context: CompletionContext,
): Promise<CompletionResult | null> => {
    // Ask the language service at every position, not just after an
    // identifier: object literals in a typed argument (e.g. the attributes
    // passed to `addProfile`) have no word before the cursor, yet TypeScript
    // knows exactly which properties are allowed there.
    const code = context.state.doc.toString()
    await tsClient.update(code)
    if (context.aborted) return null
    const entries = await tsClient.complete(context.pos)
    if (context.aborted || entries.length === 0) return null

    const before = context.matchBefore(/[\w$]*/)
    const from = before?.from ?? context.pos
    const offset = context.pos

    const options: Completion[] = entries.map((entry) => {
        const type = completionType(entry.kind)
        const completion: Completion = {
            label: entry.name,
            info: () => showDetails(entry, offset),
        }
        if (type !== undefined) completion.type = type
        if (entry.isRecommended) completion.boost = 1
        return completion
    })
    return {
        from,
        options,
    }
}

const tsHover = hoverTooltip(async (view, pos) => {
    const code = view.state.doc.toString()
    await tsClient.update(code)
    const info = await tsClient.hover(pos)
    if (info === null || info.detail === "") return null

    const word = view.state.wordAt(pos)
    return {
        pos: word?.from ?? pos,
        end: word?.to ?? pos,
        create() {
            const container = document.createElement("div")
            container.className = "cm-ts-hover"
            const signature = document.createElement("code")
            signature.textContent = info.detail
            container.append(signature)
            if (info.doc !== "") {
                const doc = document.createElement("div")
                doc.className = "cm-ts-hover-doc"
                doc.textContent = info.doc
                container.append(doc)
            }
            return { dom: container }
        },
    }
})

const tsLinter = linter(async (view) => {
    const code = view.state.doc.toString()
    await tsClient.update(code)
    const diagnostics = await tsClient.diagnostics()
    const docLength = code.length
    return diagnostics.map((diagnostic): Diagnostic => {
        const from = Math.min(diagnostic.start, docLength)
        const to = Math.min(Math.max(diagnostic.end, from + 1), docLength)
        const start = to === from ? Math.max(0, to - 1) : from
        return {
            from: start,
            to,
            message: diagnostic.message,
            severity: diagnostic.severity,
            source: "typescript",
        }
    })
})

/**
 * Runs the script from inside the editor. CodeMirror's default keymap binds
 * Mod-Enter to `insertBlankLine`, which runs before the window-level shortcut
 * listener — hence this highest-precedence binding.
 */
function runKeymap(onRun: () => void) {
    const run = {
        run: () => {
            onRun()
            return true
        },
        stopPropagation: true,
    }
    return Prec.highest(
        keymap.of([
            { key: "Mod-Enter", ...run },
            { key: "Ctrl-Enter", ...run },
            { key: "Meta-Enter", ...run },
        ]),
    )
}

export function CodeEditor({
    value,
    onChange,
    onRun,
}: {
    value: string
    onChange: (value: string) => void
    onRun: () => void
}) {
    return (
        <div className="code-editor">
            <CodeMirror
                value={value}
                onChange={onChange}
                theme="dark"
                extensions={[
                    runKeymap(onRun),
                    javascript(),
                    // TypeScript is the only completion source. The language's
                    // built-in keyword/snippet and local-variable sources are
                    // disabled — they flooded the list with unrelated entries.
                    autocompletion({ override: [tsCompletionSource] }),
                    tsLinter,
                    tsHover,
                    importFolding,
                ]}
                basicSetup={{ foldGutter: false, autocompletion: false }}
                onCreateEditor={foldImports}
            />
        </div>
    )
}
