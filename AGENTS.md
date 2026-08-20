# AGENTS.md

## Layout & commands

pnpm monorepo (`packages/*`). Only one package exists: `packages/primitives` (`@fdo-sdk/primitives`). Run all commands from `packages/primitives` — the root `pnpm test` is a stub that always fails.

- `pnpm test` — vitest (coverage via v8 is enabled by default, runs every time). Use `pnpm test -- ...` / edit `tests/**/*.test.ts` for focused runs; `pnpm test:watch` for watch mode.
- `pnpm build` — `tsc --noEmit` then `tsdown`, emitting a single bundle to `dist/index.mjs`. Source changes do not reach consumers until this runs; package `exports` points at `./dist/index.mjs`.
- No lint config or script exists. Prettier (root-only dependency, root `.prettierrc`: tabWidth 4, no semicolons, double quotes) is the only format tool.

## Code conventions

- TS is strict with `verbatimModuleSyntax`/`isolatedModules`: type-only imports MUST use `import type`.
- Relative imports must end in `.js` even though files are `.ts` (node16/nodenext resolution), e.g. `../types.js`.
- Public surface is `src/index.ts`. Interfaces have no prefix (`FDORecord`, `FDOGraph`, `Profile`, `ProfileDefinition`); implementations are `Concrete`-prefixed classes in `src/impl/` (`ConcreteRecord`, `ConcreteProfile`), except the graph implementation, which is named after its strategy (`MapGraph`).
- Core types (`PID`, `LocalID`, `RecordValue`, ...) live in `src/types.ts`.

## Testing

- Vitest tests live in `tests/*.test.ts` (node environment) and import from `../src/...` directly (never from `dist`).
- Coverage currently reports 100%; no threshold is enforced, but keep touched code covered.
