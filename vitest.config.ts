import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// The repository root, which is also the library itself.
const libraryRoot = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Gallery sources import the library by its published name — the consumer
      // path docs/consuming.md documents. Inside the gallery that name resolves
      // through the `file:..` link in its own node_modules, which a CI checkout
      // does not have (gallery/node_modules is ignored), so a test that reaches
      // into gallery sources has to supply the same resolution. Without it,
      // tests/gallery-i18n.spec.ts dies on ERR_MODULE_NOT_FOUND while resolving
      // `@bythid/jin/contracts/strings.json`.
      '@bythid/jin': libraryRoot,
    },
  },
  test: {
    // Pure logic runs in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock (see tests/components.spec.ts).
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    globals: false,
    // CSS is stubbed away for speed by default. The portal contract test reads
    // the real sheet (`?raw`) to pin the rule that anchors the portal to the
    // viewport, so that one file is processed instead of stubbed.
    css: { include: [/jin\.css/] },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**'],
      // src/core is the part that can be tested without a browser, so it is
      // also the part held to a floor. Components and composables are covered
      // opportunistically (jsdom measures no layout).
      thresholds: {
        'src/core/**': { lines: 80, functions: 80, branches: 70, statements: 80 },
      },
    },
  },
})
