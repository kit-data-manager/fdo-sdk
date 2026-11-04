import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
    plugins: [react()],
    // Relative base so the build works both locally and under the
    // `/fdo-sdk/playground/` path it is published to on GitHub Pages.
    base: "./",
})
