/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// The library needs no ambient declarations here: `@bythid/jin/styles.css` and
// `@bythid/jin/themes/*.css` are covered by vite/client's `*.css`, and
// `@bythid/jin/contracts/*.json` resolves through the package's own `exports` map
// with resolveJsonModule on.
