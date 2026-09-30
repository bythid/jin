**English** | [简体中文](../README.md)

> This is the English README; [README.md](../README.md) at the repository root is the Chinese
> original. Everything under `docs/` is English except [`theming.md`](theming.md), which is written
> in Chinese.

# Jin · 锦

A token-driven Vue 3 control library for desktop applications.

**What the name means.** 锦 is brocade: a fabric woven from many small repeated units, dyed in
many colourways. That is the shape of this library — components are the repeat units, themes are the
colourways. It is the Chinese word, read as `jin`, not a Japanese reading of it.

---

## The two ideas the library is built on

**1. Tokens are the only interface between the library and an application.** A theme does not just
set colours. It declares shape, depth, texture, motion, typography and density too, because the
styles this library has to support differ far more in *form* than in hue: one has 20px radii and
springy motion, another has square corners and no animations at all. All 80 contract tokens are
listed in [`contracts/tokens.json`](../contracts/tokens.json) and every theme file defines every one
of them.

**2. Logic is separate from rendering.** Every state machine — anchored positioning, focus traps and
focus return, roving tabindex navigation, menu and tree navigation, hotkey recording, the overlay
stack, the toast queue — lives in plain TypeScript under `src/core/`. None of it imports Vue and all
of it is unit tested without a browser. Components only render and bind events. This is what makes
the behaviour shared across applications instead of re-implemented per control.

---

## Install

```bash
npm install /path/to/jin                  # a checkout on this machine
npm install ./bythid-jin-0.1.0.tgz        # a tarball from `npm pack`
# No registry release yet. When there is one it will be
# `npm install @bythid/jin`; see Packaging for why it is scoped.
```

`vue` is a **peer** dependency: the library never ships its own copy.

Three imports, all in the entry file:

```ts
import { JinUI } from '@bythid/jin'              // the plugin and the components you use
import '@bythid/jin/styles.css'                  // the base stylesheet — required
import '@bythid/jin/themes/jin.css'              // a style (jin is the default)
import '@bythid/jin/themes/jin.dark.css'         // and its mode
```

The base stylesheet is an import the application writes rather than something the plugin pulls in
by itself, and that is deliberate. A stylesheet imported from inside a dependency can be dropped by
the consumer's bundler — silently, because the controls still render, and nothing is reported
anywhere — so it is an import that cannot be dropped. If it is missing at startup the plugin says so
once, by name.

### Working on the library and an application at the same time

A `file:` dependency that reads the library's sources makes an edit visible with no rebuild:

```jsonc
// package.json of the consuming application
{
  "dependencies": { "@bythid/jin": "file:../jin" }    // or an npm workspace entry
}
```

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    // Take the library's `source` entries instead of its built ones.
    conditions: ['source'],
    // Without this the linked library brings a second copy of Vue, and the
    // symptom is silent reactivity breakage rather than an error.
    dedupe: ['vue'],
  },
  server: {
    // The library lives outside the app root, so the dev server must be
    // allowed to read it.
    fs: { allow: ['..'] },
  },
})
```

```jsonc
// tsconfig.json — the same condition, for the type checker
{
  "compilerOptions": { "customConditions": ["source"] }
}
```

Two lines in total, one per tool: `resolve.conditions` decides what the bundler runs,
`customConditions` decides what the editor and `vue-tsc` read. Without the second one the types come
from `dist/index.d.ts`, which is one build behind whatever you are editing.

`pnpm install` inside the library builds `dist/` (its `prepare` script), so the dependency also
resolves without the `source` condition — that path reads the built ESM and declarations, which is
what a tarball or registry install gets. Both are verified mechanically: the Gallery builds and type
checks in source mode, and `pnpm run smoke` packs the library, installs the tarball into a scratch
project and builds it against `dist/`, asserting that the stylesheet and the contracts arrive and
that the shipped declarations type-check.
[`docs/consuming.md`](consuming.md) is the long form, including the symptoms of getting it
wrong.

---

## Use

```ts
// main.ts
import { createApp } from 'vue'
import { JinUI } from '@bythid/jin'
import '@bythid/jin/styles.css'
import '@bythid/jin/themes/jin.css'
import '@bythid/jin/themes/jin.dark.css'
import App from './App.vue'

createApp(App)
  .use(JinUI, {
    // All three are optional: `app.use(JinUI)` on its own is a valid install.
    t: (key, vars) => i18n.t(key, vars),
    capabilities: {
      pickFolder: async () => '/some/path',
      openExternal: async (url) => { /* … */ },
    },
    theme: {
      onChange: (snapshot) => localStorage.setItem('theme', JSON.stringify(snapshot)),
    },
  })
  .mount('#app')
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { JinButton, JinTree, type TreeNode } from '@bythid/jin'

const nodes = ref<TreeNode[]>([{ id: 'a', label: 'Alpha', hasChildren: true }])

async function loadChildren(node: TreeNode): Promise<TreeNode[]> {
  const response = await fetch(`/api/children/${node.id}`)
  if (!response.ok) throw new Error(`Server said ${response.status}`)
  return response.json()
}
</script>

<template>
  <JinButton variant="primary" @click="save">Save</JinButton>

  <JinTree :nodes="nodes" :load="loadChildren" @load-error="rollback" />
</template>
```

### The three injection points

| Option | What it does | If you omit it |
| --- | --- | --- |
| `t` | Translates the library's UI strings | The library's readable English defaults are used |
| `capabilities` | Supplies `pickFolder` / `openExternal` / clipboard access | Controls that need them hide the affordance instead of failing |
| `theme` | Persists style and mode; the library never touches storage itself | Style and mode live for the session only |

The library needs 25 strings. They are declared in
[`contracts/strings.json`](../contracts/strings.json); no key contains a business word, because the
library has no business vocabulary to translate. An application whose dictionary is keyed by source
text (Chinese, say) writes a small mapping layer — that layer belongs to the application.

---

## Theming

Two orthogonal axes, set as attributes on `<html>`:

```html
<html data-jin-style="jin" data-jin-mode="dark">
```

| | |
| --- | --- |
| `data-jin-style` | Which visual language: `jin` (default) plus eight catalogue styles — see the table below |
| `data-jin-mode` | `dark` (Jin's signature 玄锦) or `light` (素锦); every style ships both |

Each theme file is named `风格[.dark].css` and is **self-contained**: it restates the entire
contract rather than relying on values left over from another style. Switching a theme is therefore
just swapping a file — no cascade archaeology.

Nine styles ship, and they were chosen to disagree with each other: where one puts its depth in a
diffuse shadow, the next puts it in a hard offset, in a blur, in an inner shadow, or nowhere at all.

| Style | Radius (sm / md / lg) | Depth | Borders | Motion (base) |
| --- | --- | --- | --- | --- |
| **Jin · 锦** (default) | 6 / 8 / 12px | diffuse shadow + micro-emboss | 1px gold filament | 200ms |
| **Minimalism & Swiss Style** | 0 | none | 1px hairline | 250ms |
| **Neumorphism** | 10 / 14 / 18px | light-and-shade shadow pairs + inset | 1px, near the surface | 200ms |
| **Glassmorphism** | 8 / 14 / 18px | diffuse coloured shadow | 1px light edge | 220ms |
| **Claymorphism** | 14 / 20 / 24px | thickness offset + soft shadow + inner highlight | 3px, tinted | 240ms, bounce |
| **Flat Design** | 2 / 4 / 6px | none, declared as `none` | 1px line | 180ms |
| **Neubrutalism** | 0 | hard offset, no blur radius | 3px black | 150ms |
| **Brutalism** | 0 | none | 3px, always visible | 0s |
| **Dimensional Layering** | 6 / 10 / 14px | four shadow levels | 1px hairline | 200ms |

Titles use `--jin-font-display`, which is a second voice in Jin (serif/Songti) and the body face
everywhere else; texture is Jin's warp/weft grid and `none` in the other eight.

Jin is the house style and the library default; it opens in its signature **dark** mode (玄锦), with a
light variant (素锦). Its full specification is in [docs/theming.md](theming.md); the one-line
identity of every style is in the Gallery's style switcher, and the tokens any style defines are
browsed live in the Gallery's token panel.

Token names are frozen at the `--jin-` prefix. It is simultaneously the CSS namespace and the
component namespace, so it is not something to be renamed later.

### Where the styles come from

**Jin（锦）is original work** — the library's own visual identity, and the default.

**The other styles are implementations of entries in
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)**
(MIT, © 2024 Next Level Builder), a catalogue of searchable UI styles. That catalogue is where the
requirement to make tokens cover shape, depth and motion — not just colour — came from, and eight of
its entries are implemented here: `minimalism-and-swiss-style`, `neumorphism`, `glassmorphism`,
`claymorphism`, `flat-design`, `neubrutalism`, `brutalism` and `dimensional-layering`. They are the
catalogue's mainstream styles, and the ones it references most often in its own product and UX
guidance; [docs/theming.md](theming.md) §8 lists them with the contract axis each one exercises.

We implement the *characteristics* of each style against this library's 80-token contract; no
stylesheet from that project is copied, because it ships guidance rather than CSS. Every such theme
credits its source in its own file header. Full attribution: [CREDITS.md](../CREDITS.md).

### Writing a theme

1. Copy the token list from `contracts/tokens.json` (or run the checker on a work in progress).
2. Define **all** of them under `:root[data-jin-style='your-style']`.
3. Run `pnpm run check` — token completeness is enforced mechanically, not by review.
4. Add the file to the Gallery's `main.ts` imports and it becomes selectable.
5. Run `pnpm run check:contrast` — a theme whose muted text lands at 4.4:1 looks fine and is not fine.

`--jin-focus-ring-*` deserves a note: it is declared explicitly in every theme and never derived
from the accent colour. Keyboard focus is a hard requirement, and a style that happens to place its
accent near its own background would otherwise erase it.

---

## What is in the box

**Feedback** — `JinSpinner` `JinProgress` `JinSkeleton` `JinAlert` `JinToastRegion`
`JinNotificationRegion` `JinResult`
**Overlays** — `JinModal` `JinDrawer` `JinPopover` `JinTooltip` `JinPopconfirm`
**Forms** — `JinField` `JinTextField` `JinSearchField` `JinSelect` `JinCheckbox` `JinRadioGroup`
`JinSwitch` `JinHotkeyRecorder`
**Navigation** — `JinTabs` `JinMenu` `JinDropdown` `JinContextMenu` `JinBreadcrumb` `JinDivider`
`JinCard` `JinToolbar` `JinNav` `JinTree`
**Data** — `JinBadge` `JinTag` `JinDetailList` `JinLink` `JinIcon`

Deliberately absent, and why: date and time pickers, colour pickers, data grids, virtualised lists,
avatars, carousels, sliders, ratings and product tours. Each is either a second product's worth of
work (a calendar) or a solved-by-CSS non-problem (`text`, `label`, `link`), so none of them benefits
from being abstracted into a shared control.

### Toast versus notification

They look similar and are not interchangeable:

| | Toast | Notification |
| --- | --- | --- |
| Lifetime | auto-dismisses after a duration | stays until dismissed |
| Interrupts | never — it must not demand a response | yes; it is for decisions |
| Put in it | confirmation that something happened | anything the user must act on |
| If ignored | nothing is lost | it is still there later |

Both run on the same queue, which is why the eviction rule matters: when a position is full, the
**oldest toast** is dropped, never a notification. Losing a confirmation is a small annoyance;
losing a decision the user still had to make is not.

---

## Accessibility

Not a checklist bolted on afterwards — it is why several modules exist at all.

- Every interactive control is keyboard reachable with a visible focus ring drawn from the focus
  tokens.
- Overlays trap focus while open, and return it to the element that opened them on close — never to
  `<body>`.
- Nested overlays close one at a time: Escape reaches only the topmost entry.
- State is never communicated by colour alone. Every tone pairs with an icon, and every value that
  matters also appears as text.
- `prefers-reduced-motion: reduce` sets every duration token to `0s`, and the mechanical animations
  (spinner, skeleton sweep) are exempted on purpose, because a frozen spinner no longer says
  "working".
- Long lists and toolbars use roving tabindex: one tab stop for the group, arrows within it.

---

## Development

```bash
pnpm install           # also builds dist/ (the `prepare` script)
pnpm run hooks         # one time per clone: wire the git hooks (pre-commit, commit-msg)
pnpm run test          # pure logic + component tests
pnpm run test:coverage # the same, with a coverage floor on src/core
pnpm run check         # the six discipline checks + the contrast audit
pnpm run check:pack    # publint + arethetypeswrong on the packed tarball
pnpm run typecheck
pnpm run verify        # check, test, typecheck and check:pack, in order
pnpm run build         # dist/: ESM + one bundled index.d.ts + source maps
pnpm run smoke         # pack the library and build a consumer project against it
```

Two git hooks keep the conventions mechanical: `pre-commit` runs the token checks and
`commit-msg` runs commitlint against the `type(scope): summary` convention. They live in
`.husky/` and are wired by `pnpm run hooks` — deliberately not by `prepare`, because `prepare`
also runs when the library is installed as a git dependency, and writing git hooks into a
consumer's checkout would be wrong.

### Packaging

What an application resolves comes from `exports` in `package.json`, and each entry has two
answers — the built one, and the `source` one a linked checkout asks for:

| Specifier | Registry install | `conditions: ['source']` |
| --- | --- | --- |
| `@bythid/jin` | `dist/jin.js` + `dist/index.d.ts` | `src/index.ts` — with `customConditions: ['source']` in the consuming `tsconfig.json`, the editor follows too |
| `@bythid/jin/styles.css` | `src/styles/jin.css` | `src/styles/jin.css` |
| `@bythid/jin/themes/*.css` | `themes/*.css` | `themes/*.css` |
| `@bythid/jin/contracts/*.json` | `contracts/*.json` | `contracts/*.json` |

The stylesheet ships as written rather than pre-built: the consumer's bundler minifies it either
way, and one file that is the same in both modes cannot drift from itself. `npm pack` includes
`dist/` (ESM, source maps, and a single bundled `index.d.ts` — api-extractor rolls the
per-module declarations into one file, because the extensionless relative imports in the
unbundled tree fail Node16 type resolution), `src/` (the stylesheet, and the sources the maps
point at), `themes/`, `contracts/`, the README, the credits, the changelog and the licence —
97 files, 258 kB packed (down from 161 files: the per-module declaration tree is gone).

`pnpm run check:pack` audits the publish surface itself and is part of `verify`: publint
validates `exports` and `files`, and arethetypeswrong type-resolves every entry point under
node10, node16 and bundler resolution against the real tarball. One rule is ignored on
purpose — `cjs-resolves-to-esm`: the package is ESM-only by design, so a `require()` that
resolves to ESM is expected, not a defect.

### Publishing

Not published yet: the component API is still moving. The distribution paths today are a
checkout on the same machine, `npm pack`'s tarball, and a git tag — in that order of
convenience, and the reverse order of robustness. Hand someone the tarball: it carries `dist/`,
so it installs with no build step and no lifecycle scripts. A git dependency is built by
`prepare` on install, which `ignore-scripts` and script-approval policies switch off.

There is one repository, on GitHub (`bythid/jin`), and `origin` points at it. CI, Dependabot and
publishing all run there — every push and pull request executes `pnpm run verify`
(`.github/workflows/ci.yml`). Issues and pull requests live there too: there is no second copy to
keep in sync.

Cutting a release stays exactly as [CHANGELOG.md](../CHANGELOG.md) describes, in this order:

1. **Prepare**: one commit on `main` that bumps `version` in `package.json` and writes the entry
   under `[Unreleased]` in the CHANGELOG — written for the application that has to react, not for
   the commit history.
2. **Tag it**: `git tag vX.Y.Z && git push origin vX.Y.Z`. The tag runs
   `.github/workflows/publish.yml`, whose `prepublishOnly` runs `verify` and `smoke` first.
3. **Approve it**: the workflow uses npm trusted publishing (OIDC) to put the version in the
   **stage queue** rather than releasing it — no npm token is stored anywhere, and provenance rides
   on the OIDC token. A maintainer releases it from a trusted device:

   ```bash
   npm stage list @bythid/jin          # find the stage id
   npm stage view <stage-id>           # inspect it
   npm stage approve <stage-id>        # a 2FA challenge, and the version goes live
   ```

   The same queue is visible on the package page at npmjs.com. That step is the point: an action
   compromised inside the workflow can reach the queue but never the consumers.

The first publish is the one exception — it is done by hand to establish the package and its scope,
and the trusted-publisher setting (this repository, `publish.yml`, staged publishing only) is
configured on npmjs.com afterwards. `v0.1.0` is that hand-published version and is therefore never
tagged; tag-driven publishing starts at the next one.

The publish workflow runs on Node 22, whose bundled npm is 10.9.x; trusted publishing needs npm CLI
11.5.1 or later and staged publishing needs 11.15.0 — so the workflow installs npm explicitly
before it touches dependencies. Without that step a tag-triggered publish fails with no auth
channel left to try.

The name is settled for when that changes: **`@bythid/jin`**. It is scoped because npm is out of
good names at this end of the alphabet — `jin` has been taken since 2012 and `jin-ui` since 2022 by
an unrelated uni-app component library, and npm never recycles a name. `publishConfig.access` is
`public`, because a scoped package defaults to private and the first publish would otherwise be
refused.

`npm publish` re-runs the gates first — `prepublishOnly` is `pnpm run verify && pnpm run smoke`, and
`prepare` builds `dist/` — so a release cannot skip them. The smoke test is the one that matters for
this section: it packs the library, extracts the tarball into a scratch project's `node_modules` as
a real directory, and builds that project with a config that knows nothing about this checkout.
Remove the `./styles.css` export, or drop `src` from `files`, and it fails with the reason.

### Starting the gallery

Two entry points, and the name says the surface: `start_gallery_web.py` opens the **browser**
checkpoint — a page in a browser tab — while `start_gallery_desktop.py` opens the **Tauri desktop
shell**, a real window.

```bash
python start_gallery_web.py              # web: dev server, opens the browser
python start_gallery_web.py --build      # web: production build, then serve it
python start_gallery_web.py --port 5300  # web: a different port
python start_gallery_web.py --no-browser # web: don't open a window

python start_gallery_desktop.py          # desktop: rebuilds the release exe when stale, then starts it
python start_gallery_desktop.py --rebuild# desktop: force a release rebuild, then start
python start_gallery_desktop.py --dev    # desktop: dev hot reload (for working on it, not verifying it)
```

`pnpm run gallery:web` / `gallery:web:build` / `gallery:desktop` / `gallery:desktop:dev` map onto
these calls one to one.

Both scripts check the prerequisites before starting (and say which one is missing) and kill the
**whole process tree** on Ctrl+C. That last part matters more than it sounds: `npm` spawns `node`,
which spawns `vite`, so interrupting only the parent leaves an orphan holding the port, and the
next start then fails with "port already in use". The web script additionally reuses a gallery
already running on the port and moves past ports held by something unrelated. The desktop script
works under a different constraint: `tauri build` embeds the built frontend **into the binary**, so
the exe goes stale the moment a source file changes — the default mode compares timestamps and
rebuilds first when anything is newer. Portal, positioning or theme changes have to be seen in the
real window (jsdom measures no layout, and a dev session hides compositor differences), and where
antivirus breaks up cargo subprocess trees, starting the already-built exe is the reliable path.

### The gallery is bilingual

The switcher in the header carries three axes — style, mode and language — and the language one
translates the whole application, including the library's own strings: `main.ts` passes the
gallery's translator to `app.use(JinUI, { t })`, which is the integration path
[consuming.md](consuming.md) describes. English is the source language and falls through to the
library's readable defaults, so an English reader still sees exactly what a consumer who passes no
`t` at all would see; Simplified Chinese is the worked example, and switching to it changes every
"Close", "Expand all" and "No data" the controls announce.

The choice persists (`jin-gallery.locale`), a first visit follows `navigator.language`, and
`<html lang>` follows the choice so the font stack and a screen reader's pronunciation do too.
Everything lives in `gallery/src/i18n/`: `locales/en.ts` is both the English copy and the key
space, `locales/zh.ts` is typed against it — a string added without a translation fails the gallery
typecheck — and `library.ts` covers the keys `contracts/strings.json` declares. A third language is
one file plus one entry in `LOCALES`.

### The discipline checks

`tools/check_tokens.py` enforces the rules that code review reliably misses:

1. every theme file defines every contract token;
2. no hardcoded colours, radii, shadows, durations or font sizes outside the theme layer;
3. no business vocabulary anywhere in the library's source;
4. no library file imports application code;
5. `jin-` classes, `Jin*` components, `data-jin-*` attributes, and no global element selectors;
6. the stylesheet marker the plugin reads is the one `src/styles/jin.css` actually declares — a
   contract between two files that neither of them states on its own.

`tools/check_contrast.py` separately measures every theme's text and focus colours against the
surfaces they actually sit on, and fails below 4.5:1 (body text) or 3:1 (focus rings). It composites
translucent tints onto their real background first, because comparing against a raw `rgba()` triple
reports failures that do not exist — and misses ones that do.

Check 3 accepts vocabulary of your own: copy the template, and the copy is gitignored so it never
ships with the library.

```bash
cp tools/check_tokens.local.json.example tools/check_tokens.local.json
# then add your application's nouns
```

Without it the generic checks still run, so a fresh clone behaves the same.

The whitelists it uses (structural numbers, mechanical animation rates) are written out explicitly in
the script, so relaxing a rule is a visible, reviewable act rather than a quiet regex tweak.

### Architecture

```
contracts/     the token and string contracts — the two files both applications agree on
themes/        one file per style[.mode], each defining the whole contract
               (nine styles — jin, minimalism-and-swiss-style, neumorphism,
               glassmorphism, claymorphism, flat-design, neubrutalism,
               brutalism, dimensional-layering — each with a .dark variant)
src/core/      pure TypeScript: positioning, focus, roving tabindex, menu, tree, hotkeys, queue
src/composables/  the DOM side of those modules, plus the overlay controller
src/injection/    translation, capabilities, theme, and the plugin that wires them
src/components/   one .vue file per control
src/styles/       one stylesheet, rooted at .jin-* only
tools/         the mechanical checks
gallery/       the gallery application and its Tauri shell — also the en/zh i18n example
```

`src/core/` is where the interesting behaviour lives, and it is the part that can be tested without
a browser. If a behaviour can be expressed as a decision, it belongs there rather than in a `.vue`
file.

---

## License

MIT
