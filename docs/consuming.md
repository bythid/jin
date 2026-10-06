# Consuming Jin from an application

This is the practical guide for wiring the library into a Vue 3 + Vite application. It exists
because the things that go wrong here — a second Vue instance, a dev server that refuses to serve the
library, a stylesheet that never loaded — produce confusing symptoms rather than clear errors.

---

## 1. Add the dependency

Three ways, depending on how much of the loop you want to close:

```jsonc
// package.json
{
  "dependencies": {
    // Edits to the library show up in the application immediately.
    "@bythid/jin": "file:../jin",
    // A packed tarball: `npm pack` inside the library, then install the file.
    // "@bythid/jin": "file:./vendor/bythid-jin-0.1.0.tgz",
    // Or a git tag, which npm builds on install (`prepare`).
    // "@bythid/jin": "git+https://github.com/bythid/jin.git#v0.1.0"
  }
}
```

With npm, a `file:` dependency on a local directory becomes a symlink. That is what you want: edits
to the library appear in the application immediately, and no build step sits between them.

If you are handing the library to someone else, hand them the tarball. A git dependency is built on
install — the package manager runs the library's `prepare`, which needs the dev dependencies to be
reachable from the
registry — so with `ignore-scripts` set, or a script-approval policy in force, it arrives without
`dist/` and nothing resolves. The tarball from `npm pack` carries `dist/` inside it and installs with
no scripts at all.

There is no registry release yet — 0.1.0 is pre-release and the component API is still moving. When
there is one it will be `@bythid/jin` (scoped, because npm already has both `jin` and `jin-ui`);
until then the three paths above are the ones to use.

**Do not** add `vue` to the library's own `dependencies`. It is a peer dependency, and a second copy
is the single most confusing failure mode this setup has.

## 2. Configure Vite

For a linked checkout, three lines and no aliases:

```ts
// vite.config.ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // Take the library's `source` exports instead of `dist/`, so this Vite
    // instance compiles the library's `.ts` and `.vue` files directly.
    conditions: ['source'],
    // Mandatory. See "Symptoms" below for what happens without it.
    dedupe: ['vue'],
  },
  server: {
    fs: {
      // Mandatory when the library is outside the app root: the dev server
      // only serves files under the project root by default.
      allow: [fileURLToPath(new URL('..', import.meta.url))],
    },
  },
})
```

A tarball or registry install needs none of this — it reads `dist/jin.js` and the shipped
declarations, and `vue` resolves to the single copy already in the application. Keep `dedupe` only if
something else in the graph can bring its own Vue.

The type checker needs the same condition, or it reads the last build's declarations instead of the
sources you are editing:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    // Requires `moduleResolution: "bundler"` (or node16/nodenext), which a Vite
    // project already uses.
    "customConditions": ["source"]
  }
}
```

`source` is the whole of the old four-entry alias list, and it exists because that list had a
footgun: a bare `@bythid/jin` alias matches at a path boundary and swallows `@bythid/jin/themes/...` when it is
listed first, producing a "failed to resolve import" that points at the wrong file. A condition is
matched by the package's own `exports` map, so the sub-paths stay where they belong.

## 3. Install the plugin

```ts
// main.ts
import { createApp } from 'vue'
import { JinUI } from '@bythid/jin'

// The base sheet first, then the themes. A theme only sets custom properties,
// so it must come after the sheet that consumes them.
import '@bythid/jin/styles.css'
import '@bythid/jin/themes/jin.css'
import '@bythid/jin/themes/jin.dark.css'

import App from './App.vue'

const app = createApp(App)

// Every option is optional: `app.use(JinUI)` alone is a valid install.
app.use(JinUI, {
  t: (key, vars) => i18n.t(key, vars),
  capabilities: {
    pickFolder: async () => {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const result = await open({ directory: true })
      return typeof result === 'string' ? result : null
    },
    openExternal: async (url) => {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
    },
  },
  theme: {
    defaultStyle: 'jin',
    defaultMode: 'light',
    onChange: (snapshot) => {
      localStorage.setItem('jin.style', snapshot.style)
      localStorage.setItem('jin.mode', snapshot.mode)
    },
  },
})

app.mount('#app')
```

`import '@bythid/jin/styles.css'` is the one import here that nothing else can cover for you. It is
deliberately not pulled in by the library's own entry module, because a stylesheet imported from
inside a dependency can be dropped by the consumer's bundler — and the controls still render, so the
only symptom is that everything is unstyled. If the sheet is missing when the app starts, the plugin
says so once in the console, by name.

### Translating the library's strings

The library declares exactly which keys it needs in `contracts/strings.json`. If the application's
dictionary is keyed by source text rather than by key, write a mapping and pass it in — that mapping
belongs in the application, because only the application knows what its own keys look like:

```ts
const JIN_KEYS: Record<string, string> = {
  'a11y.close': '关闭',
  'a11y.expand': '展开',
  'a11y.collapse': '折叠',
  'empty.noData': '暂无数据',
  // …
}

app.use(JinUI, {
  t: (key, vars) => {
    const translated = JIN_KEYS[key]
    if (translated) return translated
    // Fall back to the application's own dictionary before the library default.
    return i18n.t(key, vars)
  },
})
```

The library never throws on an unknown key and never renders a raw key into the interface.

A few contract keys carry variables — `combobox.useTypedValue` is `Use "{value}"` — so when the
mapping hits, the returned template must be interpolated with the `vars` the library passed in
before it goes back. A host dictionary hit that ignores `vars` renders the raw `{value}`.

This mapping is worth writing against the contract rather than by hand: a dictionary keyed by key —
the way this one is — passes the keys straight through, but it still needs one entry per key the
library declares. The Gallery does exactly that in `gallery/src/i18n/library.ts`, where the Chinese
column is typed `Record<LibraryKey, string>`, so a key added to `contracts/strings.json` fails the
Gallery's typecheck until it is translated. English needs no entries there at all: the bridge falls
through to `defaultTranslate`, and the library's own wording *is* the English text.

### Capabilities and graceful degradation

A capability that is absent is not an error. `JinLink` renders a normal anchor when `openExternal`
is missing, and any control that would offer "Browse…" hides that affordance entirely. This is how
one component set serves both a Tauri application and a plain browser page.

## 4. Mount the message hosts once

```vue
<!-- App.vue -->
<template>
  <RouterView />
  <JinToastRegion />
  <JinNotificationRegion />
</template>
```

Mount them exactly once, at the application root. Mounting a region twice renders every message
twice — the components are hosts, not scoped widgets.

The overlay portal container is created by the plugin at install time, so messages work even if the
application never opens a modal.

## 5. Switching the theme at runtime

```ts
import { useTheme } from '@bythid/jin'

const theme = useTheme()
theme.setStyle('brutalism')
theme.setMode('light')
```

Or bind the two switchers the Gallery uses:

```vue
<JinSelect
  :model-value="theme.style.value"
  :options="styles"
  size="sm"
  @update:model-value="(value) => theme.setStyle(value)"
/>
<JinSwitch
  :model-value="theme.mode.value === 'dark'"
  @update:model-value="(value) => theme.setMode(value ? 'dark' : 'light')"
/>
```

`useTheme()` writes the two attributes on `<html>` and calls `onChange`. It deliberately does not
persist anything itself; that is the application's job, and the Gallery shows one way to do it.

---

## Symptoms and their causes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Controls render, all of them unstyled, nothing in the console from the library | The base stylesheet was never imported | `import '@bythid/jin/styles.css'` in the entry file — the plugin also warns once at startup when it is missing |
| Reactivity silently stops working; `provide`/`inject` returns nothing | Two Vue instances — the linked library loaded its own copy | Add `resolve.dedupe: ['vue']` |
| The application runs the library's built code, and library edits do not appear | `file:` dependency without `resolve.conditions: ['source']` | Add the condition, or drop it and let `pnpm install` in the library rebuild `dist/` |
| The editor and `vue-tsc` report types that are a build behind | Runtime takes the `source` condition, the type checker does not | Add `customConditions: ['source']` to the consuming `tsconfig.json` |
| Dev server returns 403 for library files | The library is outside the app root | Add `server.fs.allow` covering the parent directory |
| Every message appears twice | The toast/notification regions are mounted more than once | Mount them once, at the root |
| A themed control looks unstyled | The theme file was not imported, so the tokens are missing | Import the theme, or accept the token fallbacks in the stylesheet |
| "Cannot find module '@bythid/jin/styles'" after upgrading | The specifier is now `@bythid/jin/styles.css` — the missing `.css` was never resolvable through the package's `exports` | Rename the import |
| Styles leak into the application | The application wrote a `.jin-*` selector, or the library gained a global element selector | Run `pnpm run check` — both are caught mechanically |

---

## Migrating an existing stylesheet

An application with its own CSS variables does not have to rename them all at once. The library's
controls carry a fallback for every token, so the two sets can coexist while the migration happens:

1. Map the application's existing names onto the contract. The common ones have obvious
   counterparts:

   | If you have | The contract token |
   | --- | --- |
   | a page background | `--jin-bg` |
   | a panel or card surface | `--jin-surface` / `--jin-surface-raised` |
   | a primary text colour | `--jin-text` |
   | a secondary or muted text colour | `--jin-text-muted` / `--jin-text-subtle` |
   | a border colour | `--jin-border-color` |
   | an accent or brand colour | `--jin-accent` |
   | semantic colours | `--jin-danger` / `--jin-warning` / `--jin-success` / `--jin-info` |

2. Keep both sets during the transition, then delete the old names.

3. Move the application's own styles onto the contract tokens as well. That is the part that
   matters: a style switch only reaches the whole screen when everything on it reads from the
   same tokens, not just the library's own controls.
