import { useEffect, useRef } from "react"
import type { ConsoleEntry } from "../runner/sandbox.js"

export function ConsolePanel({
    entries,
    onClear,
}: {
    entries: ConsoleEntry[]
    onClear: () => void
}) {
    const bodyRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight })
    }, [entries])

    return (
        <section className="pane-card console-card" aria-label="Console">
            <header className="pane-header">
                <h2>Console</h2>
                {entries.length > 0 && (
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onClear}
                    >
                        Clear
                    </button>
                )}
            </header>
            <div
                className="console-body"
                ref={bodyRef}
                role="log"
                aria-live="polite"
            >
                {entries.length === 0 ? (
                    <p className="empty">Console output appears here.</p>
                ) : (
                    entries.map((entry, index) => (
                        <div
                            className={`console-entry console-${entry.level}`}
                            key={index}
                        >
                            <span className="console-level">{entry.level}</span>
                            <pre>{entry.text}</pre>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
