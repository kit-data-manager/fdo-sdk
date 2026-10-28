export type HintInsertion = { at: number; text: string }

const CONTEXT_HINT =
    '/** @param {import("@fdo-sdk/mapping").MappingContext} context */'

const FUNCTION_LINE =
    /^\s*(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(\s*context\s*[,)]/
const ARROW_LINE =
    /^\s*(?:export\s+)?(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s+)?\(\s*context\s*[,)]/

/**
 * Builds the type-check shadow of a user script: identical code, but with a
 * JSDoc type hint inserted before every function whose first parameter is
 * named `context`. The playground convention is that such a parameter is a
 * mapping context; the hint lets TypeScript provide completions for it even
 * though the user writes plain, unannotated JavaScript. The user's code is
 * never modified — only the shadow the language service compiles.
 */
export function applyHints(code: string): {
    shadow: string
    insertions: HintInsertion[]
} {
    const insertions: HintInsertion[] = []
    let lineStart = 0
    for (const line of code.split("\n")) {
        if (FUNCTION_LINE.test(line) || ARROW_LINE.test(line)) {
            insertions.push({ at: lineStart, text: CONTEXT_HINT + "\n" })
        }
        lineStart += line.length + 1
    }

    let shadow = ""
    let cursor = 0
    for (const insertion of insertions) {
        shadow += code.slice(cursor, insertion.at) + insertion.text
        cursor = insertion.at
    }
    shadow += code.slice(cursor)
    return { shadow, insertions }
}

/**
 * Maps an offset in the user's script to the offset in the shadow. The hint
 * insertions lie before or after it — a cursor at an insertion point is
 * treated as if the hint were already passed.
 */
export function userToShadowOffset(
    insertions: HintInsertion[],
    offset: number,
): number {
    let shift = 0
    for (const insertion of insertions) {
        if (offset < insertion.at) break
        shift += insertion.text.length
    }
    return offset + shift
}

/**
 * Maps an offset in the shadow back to the offset in the user's script.
 * Returns null when the offset lies inside a hint itself — positions there
 * have no equivalent in the user's code.
 */
export function shadowToUserOffset(
    insertions: HintInsertion[],
    offset: number,
): number | null {
    let user = offset
    for (const insertion of insertions) {
        if (user <= insertion.at) return user
        if (user < insertion.at + insertion.text.length) return null
        user -= insertion.text.length
    }
    return user
}
