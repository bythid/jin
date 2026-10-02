import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * The Gallery consumes the library as a `file:` dependency, compiled by this
 * Vite instance rather than taken from the library's build output — so an edit
 * to the library shows up here with no rebuild step.
 *
 * Four settings are what that needs, and none is optional:
 *   - resolve.conditions: `source` picks the library's own `.ts`/`.css` entries
 *     out of its `exports` map instead of `dist/`. One line, in place of an
 *     alias list — which has to order `@bythid/jin/themes/...` before the bare
 *     `@bythid/jin` entry, or the bare alias swallows it at the path boundary.
 *   - resolve.dedupe: the linked library imports `vue` from its own directory,
 *     which would be a second Vue instance; dedupe keeps one.
 *   - server.fs.allow: the dev server refuses to read files outside the project
 *     root, and the library lives one directory up.
 *   - optimizeDeps.exclude: pre-bundling a linked dependency loads it TWICE —
 *     once as `deps/@bythid_jin.js` and once as the source modules it was built
 *     from. Two copies mean two module instances, so two of every module-level
 *     `Symbol`: the plugin provides its overlay controller under one symbol and
 *     the components look up another, find nothing, and quietly fall back to a
 *     private stack each. Every overlay then behaves as if it were alone —
 *     a popover inside a dialog paints below it (1000 under 1200) and takes no
 *     clicks, Escape stops routing to the topmost overlay, and nothing errors.
 *     Excluding the dependency is also what makes an in-place library edit show
 *     up immediately, instead of being served from a stale bundle in
 *     `node_modules/.vite/deps`.
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    conditions: ['source'],
    dedupe: ['vue'],
  },
  optimizeDeps: {
    exclude: ['@bythid/jin'],
  },
  server: {
    port: 5180,
    strictPort: false,
    fs: {
      // Allow serving the library and its contracts from the parent directory.
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Tauri expects a relative asset base.
    target: 'esnext',
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
})
