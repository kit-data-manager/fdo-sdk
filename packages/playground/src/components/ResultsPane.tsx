import { useEffect, useState } from "react"
import type { GraphSnapshot } from "../runner/snapshot.js"
import { ForceGraph } from "./ForceGraph.js"
import { RecordCard, RecordList } from "./RecordList.js"

type ViewMode = "graph" | "records"

export function ResultsPane({ snapshot }: { snapshot: GraphSnapshot }) {
    const [mode, setMode] = useState<ViewMode>("graph")
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        setSelectedId(null)
    }, [snapshot])

    const selected = selectedId
        ? snapshot.records.find((record) => record.id === selectedId)
        : undefined

    return (
        <section className="pane-card results-card" aria-label="Results">
            <header className="pane-header pane-header-wrap">
                <h2>Published graph</h2>
                <span className="pane-hint pane-hint-count">
                    {snapshot.records.length}{" "}
                    {snapshot.records.length === 1 ? "record" : "records"}
                </span>
                <div
                    className="view-toggle"
                    role="group"
                    aria-label="View mode"
                >
                    <button
                        type="button"
                        className={`btn btn-toggle${mode === "graph" ? " btn-toggle-active" : ""}`}
                        aria-pressed={mode === "graph"}
                        onClick={() => setMode("graph")}
                    >
                        Graph
                    </button>
                    <button
                        type="button"
                        className={`btn btn-toggle${mode === "records" ? " btn-toggle-active" : ""}`}
                        aria-pressed={mode === "records"}
                        onClick={() => setMode("records")}
                    >
                        Records
                    </button>
                </div>
            </header>
            <div className="results-body">
                {mode === "graph" ? (
                    <ForceGraph
                        snapshot={snapshot}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                    />
                ) : (
                    <RecordList records={snapshot.records} />
                )}
                {mode === "graph" && selected && (
                    <div className="detail-overlay">
                        <RecordCard record={selected} />
                        <button
                            type="button"
                            className="btn btn-ghost detail-close"
                            aria-label="Close record details"
                            onClick={() => setSelectedId(null)}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}
