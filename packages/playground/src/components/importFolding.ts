import {
    codeFolding,
    foldEffect,
    foldService,
    syntaxTree,
} from "@codemirror/language"
import type { EditorState, Extension } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"

export type ImportBlock = { from: number; to: number }

/**
 * The contiguous run of import declarations at the top of the document,
 * after any leading comments. Returns null when there are no imports.
 */
export function findImportBlock(state: EditorState): ImportBlock | null {
    // Skip leading non-import nodes, e.g. comments.
    let node = syntaxTree(state).topNode.firstChild
    while (node !== null && node.name !== "ImportDeclaration") {
        node = node.nextSibling
    }
    if (node === null) return null

    // Consume the contiguous run of imports.
    const from = node.from
    let to = node.to
    for (let next = node.nextSibling; next !== null; next = next.nextSibling) {
        if (next.name !== "ImportDeclaration") break
        to = next.to
    }
    return { from, to }
}

const importFoldService = foldService.of((state, lineStart) => {
    const block = findImportBlock(state)
    if (block === null) return null
    // Only anchor the fold on the first import line; otherwise every line of
    // a multi-line import would be reported as foldable.
    return state.doc.lineAt(block.from).from === lineStart ? block : null
})

function countImports(state: EditorState, range: ImportBlock): number {
    return (
        state.doc.sliceString(range.from, range.to).match(/^\s*import\b/gm) ??
        []
    ).length
}

/**
 * Renders folded imports as a chip ("3 imports") and falls back to the
 * default ellipsis for any other fold. Clicking it (or pressing Enter/Space)
 * expands the block.
 */
const placeholderDOM = (
    view: EditorView,
    onclick: (event: Event) => void,
    prepared: unknown,
): HTMLElement => {
    const element = document.createElement("span")
    if (typeof prepared === "number") {
        element.className = "cm-imports-fold"
        element.textContent = `${prepared} import${prepared === 1 ? "" : "s"}`
        element.title = "Show imports"
        element.setAttribute("role", "button")
        element.tabIndex = 0
        element.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onclick(event)
            }
        })
    } else {
        element.className = "cm-foldPlaceholder"
        element.textContent = "…"
        element.title = view.state.phrase("unfold")
    }
    element.addEventListener("click", onclick)
    return element
}

/**
 * Import folding for the playground editor: registers the fold state, makes
 * the import block foldable and labels its collapsed state.
 */
export const importFolding: Extension = [
    codeFolding({
        preparePlaceholder(state, range) {
            const block = findImportBlock(state)
            if (
                block === null ||
                block.from !== range.from ||
                block.to !== range.to
            ) {
                return null
            }
            return countImports(state, block)
        },
        placeholderDOM,
    }),
    importFoldService,
]

/** Collapses the import block, if the document has one. Idempotent. */
export function foldImports(view: EditorView): void {
    const block = findImportBlock(view.state)
    if (block === null) return
    view.dispatch({ effects: foldEffect.of(block) })
}
