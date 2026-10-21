# AGENTS.md

## Layout & commands

pnpm monorepo (`packages/*`) orchestrated by Lerna 10 (Nx task runner). Four packages:

| package                     | name                | depends on                 |
| --------------------------- | ------------------- | -------------------------- |
| `packages/primitives`       | `@fdo-sdk/primitives` | —                        |
| `packages/mapping`          | `@fdo-sdk/mapping`    | `primitives`             |
| `packages/examples`         | `@fdo-sdk/examples`   | `primitives`, `mapping`  |
| `packages/docs`             | `@fdo-sdk/docs`       | `primitives`             |

Run workspace commands from the repo root:

- `pnpm build` — `lerna run build` for every package, executed in dependency order (dependencies are built first). `pnpm build:stream` prints interleaved output instead of buffered per-package output.
- `pnpm test` — `lerna run test`; only packages that define a `test` script run (`primitives`, `mapping`). Inside a package, `pnpm test` is still vitest (coverage via v8 is enabled by default). Use `pnpm test -- ...` / edit `tests/**/*.test.ts` for focused runs; `pnpm test:watch` for watch mode.
- `pnpm exec lerna ls --toposort` — print the resolved package order.
- `pnpm exec lerna run <script> --scope <pkg>` — run one script in one package.

Ordering lives in `nx.json`: the `build` target has `dependsOn: ["^build"]`, so a package always builds after its workspace dependencies. Build and test results are cached in `.nx/` (gitignored). `lerna.json` sets `npmClient: "pnpm"`, so package discovery comes from `pnpm-workspace.yaml` rather than `package.json#workspaces`.

Inside a package, `pnpm build` is `tsc --noEmit` then `tsdown`, emitting a single bundle to `dist/index.mjs`. Source changes do not reach consumers until this runs; package `exports` points at `./dist/index.mjs`. No lint config or script exists. Prettier (root-only dependency, root `.prettierrc`: tabWidth 4, no semicolons, double quotes) is the only format tool.

## Code conventions

- TS is strict with `verbatimModuleSyntax`/`isolatedModules`: type-only imports MUST use `import type`.
- Relative imports must end in `.js` even though files are `.ts` (node16/nodenext resolution), e.g. `../types.js`.
- Public surface is `src/index.ts`. Interfaces have no prefix (`FDORecord`, `FDOGraph`, `Profile`, `ProfileDefinition`); implementations are `Concrete`-prefixed classes in `src/impl/` (`ConcreteMappedFDORecord`, `ConcreteProfile`), except the graph implementation, which is named after its strategy (`MappedGraph`).
- Core types (`PID`, `LocalID`, `RecordValue`, ...) live in `src/types.ts`.

## Testing

- Vitest tests live in `tests/*.test.ts` (node environment) and import from `../src/...` directly (never from `dist`).
- Coverage currently reports 100%; no threshold is enforced, but keep touched code covered.
