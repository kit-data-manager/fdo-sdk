import { useCallback, useEffect, useRef, useState } from "react"
import {
    Group,
    Panel,
    Separator,
    useDefaultLayout,
} from "react-resizable-panels"
import { CodeEditor } from "./components/CodeEditor.js"
import { ConsolePanel } from "./components/ConsolePanel.js"
import { ResultsPane } from "./components/ResultsPane.js"
import { EXAMPLES } from "./examples/examples.js"
import { runScript, type ConsoleEntry } from "./runner/sandbox.js"
import { PlaygroundBackend } from "./runner/playground-backend.js"
import type { GraphSnapshot } from "./runner/snapshot.js"

const IS_MAC =
    typeof navigator !== "undefined" && /Mac/.test(navigator.platform)
const RUN_SHORTCUT = IS_MAC ? "⌘⏎" : "Ctrl+↵"

const CODE_KEY_PREFIX = "fdo-playground.code."
const CODE_REV_PREFIX = "fdo-playground.codeRev."
const EXAMPLE_KEY = "fdo-playground.example"

/**
 * FNV-1a hash of an example's source. Stored code is kept only while it
 * belongs to the current revision of the example, so reworked examples
 * replace the code in editors instead of showing stale saved sources.
 */
function hashSource(source: string): string {
    let hash = 0x811c9dc5
    for (let i = 0; i < source.length; i++) {
        hash ^= source.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(36)
}

function loadStoredExampleId(): string {
    const stored = localStorage.getItem(EXAMPLE_KEY)
    if (stored !== null && EXAMPLES.some((example) => example.id === stored)) {
        return stored
    }
    return EXAMPLES[0]!.id
}

function loadStoredCode(exampleId: string): string {
    const example = EXAMPLES.find((candidate) => candidate.id === exampleId)
    if (!example) return EXAMPLES[0]!.source
    const storedRevision = localStorage.getItem(CODE_REV_PREFIX + exampleId)
    if (storedRevision !== hashSource(example.source)) return example.source
    return localStorage.getItem(CODE_KEY_PREFIX + exampleId) ?? example.source
}

function emptySnapshot(): GraphSnapshot {
    return { label: "Published graph", records: [] }
}

export function App() {
    const [exampleId, setExampleId] = useState(loadStoredExampleId)
    const [codeByExample, setCodeByExample] = useState<Record<string, string>>(
        () =>
            Object.fromEntries(
                EXAMPLES.map((example) => [
                    example.id,
                    loadStoredCode(example.id),
                ]),
            ),
    )
    const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
    const [snapshot, setSnapshot] = useState<GraphSnapshot>(emptySnapshot)
    const [running, setRunning] = useState(false)
    const runningRef = useRef(false)
    const runIdRef = useRef(0)
    const mainLayout = useDefaultLayout({ id: "fdo-playground.layout.main" })
    const editorLayout = useDefaultLayout({
        id: "fdo-playground.layout.editor",
    })

    const example =
        EXAMPLES.find((candidate) => candidate.id === exampleId) ?? EXAMPLES[0]!
    const code = codeByExample[exampleId] ?? example.source

    useEffect(() => {
        localStorage.setItem(CODE_KEY_PREFIX + exampleId, code)
        localStorage.setItem(
            CODE_REV_PREFIX + exampleId,
            hashSource(example.source),
        )
    }, [code, exampleId, example.source])

    useEffect(() => {
        localStorage.setItem(EXAMPLE_KEY, exampleId)
    }, [exampleId])

    const run = useCallback(async () => {
        if (runningRef.current) return
        runningRef.current = true
        setRunning(true)
        const runId = ++runIdRef.current
        const isCurrent = () => runIdRef.current === runId
        setConsoleEntries([])
        try {
            await runScript(code, {
                onConsoleEntry: (entry) => {
                    if (isCurrent()) {
                        setConsoleEntries((previous) => [...previous, entry])
                    }
                },
                onSnapshot: (next) => {
                    if (isCurrent()) setSnapshot(next)
                },
            })
        } finally {
            if (isCurrent()) setRunning(false)
            runningRef.current = false
        }
    }, [code])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault()
                void run()
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [run])

    const resetBackend = () => {
        PlaygroundBackend.resetStore()
        setConsoleEntries([
            {
                level: "log",
                text: "Backend store reset — all published records were removed.",
            },
        ])
        setSnapshot(emptySnapshot())
    }

    const setCode = (value: string) => {
        setCodeByExample((previous) => ({ ...previous, [exampleId]: value }))
    }

    return (
        <div className="app">
            <header className="app-header">
                <div className="app-title">
                    <h1>FDO SDK Playground</h1>
                    <p>
                        Build records, graphs and continuous mappings in the
                        browser.
                    </p>
                </div>
                <div className="app-actions">
                    <label className="example-select">
                        <span>Example</span>
                        <select
                            value={exampleId}
                            onChange={(event) =>
                                setExampleId(event.target.value)
                            }
                        >
                            {EXAMPLES.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                    {entry.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        className="btn"
                        onClick={resetBackend}
                    >
                        Reset backend
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void run()}
                        disabled={running}
                        aria-keyshortcuts="Control+Enter Meta+Enter"
                    >
                        {running ? "Running…" : `Run  ${RUN_SHORTCUT}`}
                    </button>
                </div>
            </header>
            <main className="app-main">
                <Group
                    orientation="horizontal"
                    className="app-panels"
                    defaultLayout={mainLayout.defaultLayout}
                    onLayoutChanged={mainLayout.onLayoutChanged}
                >
                    <Panel id="editor" className="editor-pane" minSize="25%">
                        <Group
                            orientation="vertical"
                            className="editor-panels"
                            defaultLayout={editorLayout.defaultLayout}
                            onLayoutChanged={editorLayout.onLayoutChanged}
                        >
                            <Panel
                                id="code"
                                className="editor-panel"
                                defaultSize="75%"
                                minSize="25%"
                            >
                                <section
                                    className="pane-card editor-card"
                                    aria-label="Code"
                                >
                                    <header className="pane-header">
                                        <h2>Code</h2>
                                        <p
                                            className="pane-hint"
                                            title={example.description}
                                        >
                                            {example.description}
                                        </p>
                                    </header>
                                    <div className="editor-body">
                                        <CodeEditor
                                            key={exampleId}
                                            value={code}
                                            onChange={setCode}
                                            onRun={run}
                                        />
                                    </div>
                                </section>
                            </Panel>
                            <Separator
                                className="resize-handle resize-handle-horizontal"
                                aria-label="Resize code and console panels"
                            />
                            <Panel
                                id="console"
                                className="console-panel"
                                defaultSize="25%"
                                minSize="10%"
                            >
                                <ConsolePanel
                                    entries={consoleEntries}
                                    onClear={() => setConsoleEntries([])}
                                />
                            </Panel>
                        </Group>
                    </Panel>
                    <Separator
                        className="resize-handle"
                        aria-label="Resize editor and results panels"
                    />
                    <Panel id="results" className="results-panel" minSize="25%">
                        <ResultsPane snapshot={snapshot} />
                    </Panel>
                </Group>
            </main>
        </div>
    )
}
