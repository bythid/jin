# Integrating Jin into a Vue 3 + Vite application

The practical guide for adding the library to an application. It exists because the common mistakes
here — two Vue instances, a dev server that refuses to serve the library, a stylesheet that never
loaded — produce confusing symptoms instead of clear errors. Each step's configuration below was
applied and verified in the Gallery, which consumes the library exactly the way an application does.

---

## 1. Add the dependency

The published package is the normal path:

```bash
npm install @bythid/jin
```

The other paths serve development and offline cases:

```jsonc
// package.json
{
  "dependencies": {
    // A local checkout: library edits show up in the application immediately.
    "@bythid/jin": "file:../jin",
    // A packed tarball: `npm pack` inside the library, then install the file.
    // "@bythid/jin": "file:./vendor/bythid-jin-<version>.tgz",
    // Or a git tag, which the package manager builds on install (`prepare`).
    // "@bythid/jin": "git+https://github.com/bythid/jin.git#v0.4.0"
  }
}
```

With npm, a `file:` dependency on a local directory becomes a symlink, so edits to the library
appear in the application immediately, with no build step between them.

If you are handing the library to someone else, hand them the tarball. A git dependency is built on
install — the package manager runs the library's `prepare`, which needs the dev dependencies to be
reachable from the registry — so with `ignore-scripts` set, or a script-approval policy in force, it
arrives without `dist/` and nothing resolves. The tarball from `npm pack` carries `dist/` inside it
and installs with no scripts at all.

The 0.x version line means the component API can still change between minor releases; every visible
change and what an application must do about it is recorded in
[CHANGELOG.md](../CHANGELOG.md).

**Do not** add `vue` to the library's own `dependencies`. It is a peer dependency, and a second copy
is the most confusing failure this setup has (see the Symptoms table at the end).

## 2. Configure Vite

For a linked checkout, three settings and no aliases:

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
something else in the dependency graph can bring its own Vue.

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

Why a condition instead of path aliases: an alias on the bare specifier `@bythid/jin` matches at a
path boundary, so listed first it also swallows `@bythid/jin/themes/...`, and the resulting "failed
to resolve import" points at the wrong file. The `source` condition is matched inside the package's
own `exports` map, so the sub-paths keep resolving where they belong.

## 3. Install the plugin

```ts
// main.ts
import { createApp } from 'vue'
import { JinUI } from '@bythid/jin'

// The base sheet first, then the themes. A theme only sets custom properties,
// so it must come after the sheet that reads them.
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
deliberately not read in by the library's own entry module, because a stylesheet imported from
inside a dependency can be dropped by the consumer's bundler — and the controls still render, so the
only symptom is that everything is unstyled. If the sheet is missing when the app starts, the plugin
warns once in the console, by name.

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

Some contract keys carry variables — `combobox.useTypedValue` is `Use "{value}"` — so when the
mapping answers such a key, the returned template must be interpolated with the `vars` the library
passed in before it goes back. A dictionary hit that ignores `vars` renders the raw `{value}`.

This mapping is worth writing against the contract rather than by hand: a dictionary keyed by name —
the way this one is — passes the keys straight through, but it still needs one entry per key the
library declares. The Gallery does exactly that in `gallery/src/i18n/library.ts`, where the Chinese
column is typed `Record<LibraryKey, string>`, so a key added to `contracts/strings.json` fails the
Gallery's typecheck until it is translated. English needs no entries there at all: the bridge falls
through to `defaultTranslate`, and the library's own wording *is* the English text.

### When a capability is missing

A capability that is absent is not an error. `JinLink` renders a normal anchor when `openExternal`
is missing, and any control that would offer a "Browse…" button hides that button entirely. This is
how one set of components serves both a Tauri application and a plain browser page.

## 4. Mount the message regions once

```vue
<!-- App.vue -->
<template>
  <RouterView />
  <JinToastRegion />
  <JinNotificationRegion />
</template>
```

Mount them exactly once, at the application root. Mounting a region twice renders every message
twice — these components are global message containers, not per-section widgets.

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

### Recoloring a theme without changing the style

The tokens are CSS custom properties, so the colour family of a style can be changed at runtime
without touching its shape: radii, borders, shadows, motion and typography stay as the theme
declared them because the overrides never name those tokens. Three ways, from most constrained to
most free:

1. **A stylesheet imported after the theme files**, mirroring the theme's own selector:

   ```css
   /* loaded after themes/glassmorphism.css and glassmorphism.dark.css */
   :root[data-jin-style='glassmorphism'][data-jin-mode='dark'] {
     --jin-bg: #0a0f1c;
     --jin-surface: #101828;
     --jin-accent: #38bdf8;
     /* …the rest of the colour family… */
   }
   ```

2. **Inline on `<html>`**, which beats every stylesheet and applies across all styles and modes.
   The Gallery's Token panel recolors this way for quick experiments:

   ```ts
   document.documentElement.style.setProperty('--jin-accent', '#38bdf8')
   ```

3. **The library's recolor API** — the theme controller re-anchors the theme's whole colour family
   onto a hue you pick. Only the hue moves: lightness and chroma stay the theme's own, the semantic
   state colours (danger, warning, success, info) never rotate, and every contrast pair is
   re-measured against WCAG AA with lightness clamped where the rotation alone missed it. This is
   the path that keeps a palette harmonious by construction instead of by hand:

   ```ts
   const theme = useTheme()
   theme.setAccentHue(210)  // the chromatic family re-derives from the new anchor
   theme.validateRecolor()  // per-pair ratios, or null while no hue is set
   theme.setAccentHue(null) // back to the theme's own palette
   ```

   The anchor is the ground: the colour most of the page wears lands exactly on your hue, and the
   accent rides the same delta into wherever the theme's hue architecture puts it. Styles whose
   ground is a pure neutral (brutalism, minimalism) have no hue to anchor on and fall back to
   accent anchoring. A few styles limit what moves (`RECOLOR_PARTICIPATION`): e-ink-paper is
   achromatic and rotates nothing, pixel-art moves only its accent family. The hue rides in
   `ThemeSnapshot.accentHue`, so the same `onChange` persistence that stores style and mode stores
   it too.

Colours move as a family, not one token at a time. A retint that changes `--jin-accent` but keeps
the theme's `--jin-text-on-accent`, `--jin-accent-hover`/`-active` and `--jin-focus-ring-color`
leaves text unreadable or focus invisible. The colour-bearing tokens to override together:

| Group | Tokens |
| --- | --- |
| Ground | `--jin-bg`, `--jin-surface`, `--jin-surface-raised`, `--jin-surface-sunken`, `--jin-surface-translucent`, `--jin-surface-gradient`, `--jin-scrim` |
| Text | `--jin-text`, `--jin-text-muted`, `--jin-text-subtle`, `--jin-text-on-accent` |
| Border | `--jin-border-color`, `--jin-border-color-strong` |
| Accent | `--jin-accent`, `--jin-accent-hover`, `--jin-accent-active`, `--jin-focus-ring-color` |
| Depth | `--jin-elevation-1` through `--jin-elevation-4`, `--jin-shadow-inset` |
| Status | `--jin-danger` / `--jin-warning` / `--jin-success` / `--jin-info` and their `-text` / `-bg` variants |

`--jin-focus-ring-color` is a declared value, never derived from the accent — override it
explicitly alongside the accent. Contrast is then the application's responsibility: the shipped
themes are audited by `tools/check_contrast.py` against WCAG AA (4.5:1 text, 3:1 focus), and that
audit does not cover overridden values.

---

## Symptoms and their causes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Controls render, all of them unstyled, nothing in the console from the library | The base stylesheet was never imported | `import '@bythid/jin/styles.css'` in the entry file — the plugin also warns once at startup when it is missing |
| Reactivity stops working without an error; `provide`/`inject` finds nothing | Two Vue instances — the linked library loaded its own copy | Add `resolve.dedupe: ['vue']` |
| The application runs the library's built code, and library edits do not appear | `file:` dependency without `resolve.conditions: ['source']` | Add the condition, or drop it and let `pnpm install` in the library rebuild `dist/` |
| The editor and `vue-tsc` report types that are a build behind | Runtime takes the `source` condition, the type checker does not | Add `customConditions: ['source']` to the consuming `tsconfig.json` |
| Dev server returns 403 for library files | The library is outside the app root | Add `server.fs.allow` covering the parent directory |
| Every message appears twice | The toast/notification regions are mounted more than once | Mount them once, at the root |
| A themed control looks unstyled | The theme file was not imported, so its tokens have no values | Import the theme, or rely on the fallback values written into the base stylesheet |
| "Cannot find module '@bythid/jin/styles'" after upgrading | The specifier is now `@bythid/jin/styles.css` — the version without `.css` never resolved through the package's `exports` | Rename the import |
| Styles leak into the application | The application wrote a `.jin-*` selector, or the library gained a global element selector | An application-side `.jin-*` selector is invisible to the checkers and is fixed app-side; the library side is reported by check 5 of `tools/check_tokens.py` (`pnpm run check` in the library) |

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
   | status colours (danger, warning, success, info) | `--jin-danger` / `--jin-warning` / `--jin-success` / `--jin-info` |

2. Keep both sets during the transition, then delete the old names.

3. Move the application's own styles onto the contract tokens as well. That is the part that
   matters: a style switch only reaches the whole screen when everything on it reads from the same
   tokens, not just the library's own controls.
