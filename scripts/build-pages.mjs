import { cp, mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const site = path.join(root, "site")

/**
 * Assembles the GitHub Pages artifact:
 *
 *   site/              landing page (packages/docs/landing)
 *   site/api/          TypeDoc HTML (packages/docs/generated)
 *   site/playground/   Vite playground (packages/playground/dist)
 *
 * The sources are expected to be built already; run this through
 * `pnpm build:pages` from the repository root.
 */
await rm(site, { recursive: true, force: true })
await mkdir(site, { recursive: true })

await cp(path.join(root, "packages/docs/landing"), site, { recursive: true })
await cp(path.join(root, "packages/docs/generated"), path.join(site, "api"), {
    recursive: true,
})
await cp(
    path.join(root, "packages/playground/dist"),
    path.join(site, "playground"),
    { recursive: true },
)

console.log(`Assembled GitHub Pages site in ${site}`)
