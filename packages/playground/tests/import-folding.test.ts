import { javascript } from "@codemirror/lang-javascript"
import { foldEffect, foldable, foldedRanges } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { describe, expect, it } from "vitest"
import {
    findImportBlock,
    importFolding,
    type ImportBlock,
} from "../src/components/importFolding.js"

function stateOf(doc: string): EditorState {
    return EditorState.create({
        doc,
        extensions: [javascript(), importFolding],
    })
}

describe("findImportBlock", () => {
    it("finds the import block after leading comments", () => {
        const doc = [
            "// A leading comment.",
            'import { a } from "@fdo-sdk/a"',
            "import {",
            "    b,",
            '} from "@fdo-sdk/b"',
            "",
            "const value = 1",
        ].join("\n")
        const block = findImportBlock(stateOf(doc))

        expect(block).toEqual({
            from: doc.indexOf("import"),
            to: doc.indexOf('"@fdo-sdk/b"') + '"@fdo-sdk/b"'.length,
        })
    })

    it("stops at the first non-import statement", () => {
        const doc = [
            'import { a } from "a"',
            "const value = 1",
            'import { b } from "b"',
        ].join("\n")
        const block = findImportBlock(stateOf(doc))

        expect(block).toEqual({
            from: 0,
            to: 'import { a } from "a"'.length,
        })
    })

    it("returns null when the document has no imports", () => {
        expect(findImportBlock(stateOf("const value = 1\n"))).toBeNull()
    })
})

describe("importFolding", () => {
    const doc = [
        "// Header.",
        'import { a } from "a"',
        'import { b } from "b"',
        "",
        "const value = 1",
    ].join("\n")

    it("folds the import block", () => {
        const state = stateOf(doc)
        const block = findImportBlock(state)!
        const folded = state.update({ effects: foldEffect.of(block) }).state
        const ranges: ImportBlock[] = []
        foldedRanges(folded).between(0, folded.doc.length, (from, to) => {
            ranges.push({ from, to })
        })

        expect(ranges).toEqual([block])
    })

    it("exposes the block as foldable from its first line", () => {
        const state = stateOf(doc)
        const block = findImportBlock(state)!
        const firstLine = state.doc.lineAt(block.from)

        expect(foldable(state, firstLine.from, firstLine.to)).toEqual(block)
    })
})
