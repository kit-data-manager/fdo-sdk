# @fdo-sdk/playground

A browser playground for the SDK. It runs TypeScript examples against the
workspace packages, shows console output and renders the published graph after
every run. It is private and not published to npm.

The playground is deployed to GitHub Pages together with the documentation:
<https://kit-data-manager.github.io/fdo-sdk/playground/>.

## Run it

```bash
pnpm --filter @fdo-sdk/playground dev
```

Then open the URL Vite prints (usually <http://localhost:5173>). Press
<kbd>Cmd</kbd>+<kbd>Enter</kbd> (macOS) or <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to
run the current example.

Other commands:

```bash
pnpm --filter @fdo-sdk/playground build    # type-check and build
pnpm --filter @fdo-sdk/playground preview  # preview the build
pnpm --filter @fdo-sdk/playground test     # vitest
```

## What it does

- Edits examples in a CodeMirror editor with TypeScript hints backed by a
  language-service worker.
- Runs the code in the page and captures `console` output into the console
  panel.
- Publishes through `PlaygroundBackend`, an instrumented
  `LocalTestingBackend` whose store persists between runs, and renders the
  current published graph.
- Stores your edits per example in `localStorage`, so reworked examples do not
  overwrite them until the example revision changes.
- Can reset the backend store to start from an empty published graph.

## Examples

The examples live in [`src/examples/examples.ts`](src/examples/examples.ts)
and are the source for the snippets in the repository READMEs:

| Example              | Shows                                                           |
| -------------------- | --------------------------------------------------------------- |
| `records`            | Records, profiles, markers, references and publishing           |
| `plain-records`      | Records without profiles, unidirectional and bidirectional refs |
| `continuous-mapping` | Resolve, map, diff and republish with stable PIDs               |

The examples use `@fdo-sdk/primitives`, `@fdo-sdk/mapping` and
`@fdo-sdk/simple-types` and the playground-only `PlaygroundBackend`. In your
own code, use `LocalTestingBackend` from `@fdo-sdk/mapping` or implement the
adapter interfaces.

## Layout

| Path                               | Purpose                                             |
| ---------------------------------- | --------------------------------------------------- |
| `src/examples/examples.ts`         | The example sources shown in the UI                 |
| `src/runner/sandbox.ts`            | Runs a script and captures console output           |
| `src/runner/playground-backend.ts` | Instrumented in-memory backend                      |
| `src/runner/ts/`                   | TypeScript project, hints and worker for the editor |
| `src/components/`                  | Editor, console, published graph and record list    |
