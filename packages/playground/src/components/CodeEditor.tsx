import type {
    Completion,
    CompletionContext,
    CompletionResult,
    CompletionSource,
} from "@codemirror/autocomplete"
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript"
import { linter, type Diagnostic } from "@codemirror/lint"
import CodeMirror from "@uiw/react-codemirror"
import { tsClient } from "../runner/ts/client.js"
import type { TsCompletion } from "../runner/ts/project.js"

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

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
    const before = context.matchBefore(/[\w$.]*/)
    if (before === null) return null
    const text = context.state.doc.sliceString(before.from, before.to)
    let word: string | null = null
    const member = text.match(/^([A-Za-z_$][\w$]*)\.(\w*)$/)
    if (member !== null) word = member[2] ?? ""
    else if (IDENTIFIER.test(text)) word = text
    if (word === null) return null

    const code = context.state.doc.toString()
    const offset = before.to
    await tsClient.update(code)
    if (context.aborted) return null
    const entries = await tsClient.complete(offset)
    if (context.aborted || entries.length === 0) return null

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
        from: before.to - word.length,
        options,
    }
}

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

export function CodeEditor({
    value,
    onChange,
}: {
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div className="code-editor">
            <CodeMirror
                value={value}
                onChange={onChange}
                theme="dark"
                extensions={[
                    javascript(),
                    javascriptLanguage.data.of({
                        autocomplete: tsCompletionSource,
                    }),
                    tsLinter,
                ]}
                basicSetup={{ foldGutter: false, autocompletion: true }}
            />
        </div>
    )
}
