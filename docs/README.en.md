**English** | [简体中文](../README.md)

> This is the English README; [`../README.md`](../README.md) at the repository root is its Chinese
> twin. The two files are one document in two languages: a change to either is a change to both.
> Everything under `docs/` is English except [`theming.md`](theming.md), which is written in
> Chinese.

# Jin · 锦

A Vue 3 control library for desktop applications. It ships the controls an app needs — buttons,
forms, overlays, navigation, messages — every one of them fully operable from the keyboard. The
appearance (colour, radius, shadow, motion) comes entirely from theme files, and the library's own
source contains no hardcoded style values — a rule a checker enforces (see
[docs/developing.md](developing.md)).

**What the name means.** 锦 is brocade: a fabric woven from repeating small units and dyed in
different colourways. The library has the same structure — components are the repeat units, and
appearance is swapped whole, by theme file. The name is the Chinese word, read `jin`, not a
Japanese reading of it.

---

## Install

The package is published on npm (`@bythid/jin`, in its 0.x phase — see Versioning and known
limits):

```bash
npm install @bythid/jin
```

Offline delivery or developing against a local checkout can also use a tarball or a path:

```bash
npm install /path/to/jin                   # a checkout on this machine
npm install ./bythid-jin-<version>.tgz     # the product of `npm pack`
```

`vue` is a **peer dependency** (`^3.5`); the library never ships a second copy. When an application
ends up with two copies of Vue, the symptom is reactivity breaking without an error — the mechanism
is explained in [docs/consuming.md](consuming.md).

Four imports belong in the entry file:

```ts
import { JinUI } from '@bythid/jin'              // the plugin, and the components you use
import '@bythid/jin/styles.css'                  // the base stylesheet — required
import '@bythid/jin/themes/jin.css'              // a style (jin is the default)
import '@bythid/jin/themes/jin.dark.css'         // and its dark mode
```

The base stylesheet must be an import the application writes; the plugin does not pull it in.
A stylesheet imported from inside a dependency can be dropped by the consumer's bundler, and
nothing reports it — the controls still render, they are just unstyled everywhere. If the sheet is
missing at startup, the plugin warns once in the console and names the import to add.

### Working on the library and your application at the same time

A `file:` dependency reads the library's sources, so an edit shows up with no rebuild. Three
settings are needed, each doing one job:

```jsonc
// the application's package.json
{ "dependencies": { "@bythid/jin": "file:../jin" } }
```

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    conditions: ['source'],   // the bundler reads the library's sources, not dist/
    dedupe: ['vue'],          // without it the linked library brings a second Vue copy
  },
  server: {
    fs: { allow: ['..'] },    // the library is outside the app root, which the dev
                              // server refuses to serve by default
  },
})
```

```jsonc
// tsconfig.json — the same condition, for the editor and vue-tsc
{ "compilerOptions": { "customConditions": ["source"] } }
```

Without `customConditions` the types come from `dist/index.d.ts`, one build behind whatever you are
editing. [docs/consuming.md](consuming.md) has the full table of symptoms for every combination
that can go wrong.

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

### The three `JinUI` options

| Option | What it does | If you omit it |
| --- | --- | --- |
| `t` | Translates the library's interface strings | The built-in English defaults are used |
| `capabilities` | Gives the library desktop access: `pickFolder` / `openExternal` / clipboard | Controls that need them hide that entry instead of failing |
| `theme` | Receives theme changes so the application persists them; the library never reads or writes storage itself | Style and mode live for the session only |

Every string the library needs, with its default text, is declared in
[`contracts/strings.json`](../contracts/strings.json). No key contains a business word — the library
has no business vocabulary to translate. An application whose dictionary is keyed by source text
(Chinese, say) writes a small mapping from these keys to its own entries; that layer belongs to the
application, and [docs/consuming.md](consuming.md) shows it.

---

## Theming

Style and mode are two independent axes, set as attributes on `<html>`:

```html
<html data-jin-style="jin" data-jin-mode="dark">
```

| Attribute | Values |
| --- | --- |
| `data-jin-style` | The visual style: `jin` (default) plus eight catalogue styles — table below |
| `data-jin-mode` | `dark` (Jin's signature mode, 玄锦) or `light` (素锦); every style ships both |

Every appearance value comes from a CSS custom property (a design token). There are 80 of them,
listed in [`contracts/tokens.json`](../contracts/tokens.json). Every theme file defines all 80 and
keeps no dependence on values left behind by another theme — switching a theme is swapping a group
of files, with no need to trace which layer a variable's value came from.

Nine styles ship. They were selected to cover different design positions: where one expresses depth
with a diffuse shadow, the next expresses it with a hard offset, a blur, or an inner shadow, and
others express no depth at all.

| Style | Radius (sm / md / lg) | Depth | Borders | Motion (base) |
| --- | --- | --- | --- | --- |
| **Jin · 锦** (default) | 6 / 8 / 12px | diffuse shadow + micro-emboss | 1px gold filament | 200ms |
| **Minimalism & Swiss Style** | 0 | none | 1px hairline | 250ms |
| **Neumorphism** | 10 / 14 / 18px | light-and-shade shadow pairs + inset | 1px, near the surface | 200ms |
| **Glassmorphism** | 8 / 14 / 18px | diffuse coloured shadow | 1px light edge | 220ms |
| **Claymorphism** | 14 / 20 / 24px | thickness offset + soft shadow + inner highlight | 3px, tinted | 240ms, bounce easing |
| **Flat Design** | 2 / 4 / 6px | none, declared as `none` | 1px line | 180ms |
| **Neubrutalism** | 0 | hard offset, no blur radius | 3px black | 150ms |
| **Brutalism** | 0 | none | 3px, always visible | 0s |
| **Dimensional Layering** | 6 / 10 / 14px | four shadow levels | 1px hairline | 200ms |

Titles read `--jin-font-display`: in Jin it is a second family (serif/Songti), elsewhere the same
family as body text; the texture token `--jin-surface-texture` carries Jin's warp/weft grid and is
`none` in the other eight.

### Writing your own theme

1. Copy the token list from `contracts/tokens.json` (importable as
   `@bythid/jin/contracts/tokens.json`).
2. Define **all** 80 tokens under `:root[data-jin-style='your-style']`.
3. Declare the focus-ring tokens `--jin-focus-ring-*` explicitly; never derive them from the accent
   colour. A style whose accent happens to sit close to its own background would otherwise produce
   a focus ring that is nearly invisible, and a visible keyboard focus is a hard requirement.
4. Measure contrast: text against its background at least 4.5:1, the focus ring against its surface
   at least 3:1, compositing translucent colours onto the background they really sit on first.
   `tools/check_contrast.py` in this repository computes exactly that.

The `--jin-` prefix is both the CSS namespace and the component namespace, and it is frozen:
renaming it would rewrite every theme file, every token reference, and every component class, so it
will not change.

### Where the styles come from

**Jin（锦）is original work** — the library's own visual style, and the default.

**The other eight are independent implementations of entries in
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)**
(MIT, © 2024 Next Level Builder), a searchable catalogue of UI styles. The catalogue ships design
guidance rather than CSS, so no stylesheet of it is copied here; the requirement that tokens cover
shape, depth and motion — not just colour — came from that catalogue. The eight implemented entries
are `minimalism-and-swiss-style`, `neumorphism`, `glassmorphism`, `claymorphism`, `flat-design`,
`neubrutalism`, `brutalism` and `dimensional-layering`. Full attribution:
[CREDITS.md](../CREDITS.md); each theme file also credits its source in its header.

---

## The controls

**Feedback** — `JinSpinner` `JinProgress` `JinSkeleton` `JinAlert` `JinToastRegion`
`JinNotificationRegion` `JinResult`
**Overlays** — `JinModal` `JinDrawer` `JinPopover` `JinTooltip` `JinPopconfirm`
**Forms** — `JinField` `JinTextField` `JinSearchField` `JinSelect` `JinCombobox` `JinCheckbox`
`JinRadioGroup` `JinSwitch` `JinHotkeyRecorder`
**Navigation** — `JinTabs` `JinMenu` `JinDropdown` `JinContextMenu` `JinBreadcrumb` `JinDivider`
`JinCard` `JinToolbar` `JinNav` `JinTree`
**Data** — `JinBadge` `JinTag` `JinDetailList` `JinLink` `JinIcon`

Props, events, slots and accessibility behaviour of every control:
[docs/components.md](components.md).

**Deliberately not provided**: date and time pickers, colour pickers, data grids, virtualised
lists, avatars, carousels, sliders, ratings and product tours. A calendar is a whole product's
worth of work; text, labels and links are already solved by CSS and the typography tokens, so
wrapping them in shared controls would add nothing.

### Toast versus notification

They look similar and are not interchangeable:

| | toast | notification |
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

The following holds for every control:

- Every interactive control is keyboard reachable, with a visible focus ring drawn from the focus
  tokens.
- While an overlay is open, focus stays inside it; on close it returns to the element that opened
  the overlay — or, if that element became unfocusable, to a focusable neighbour. Never to
  `<body>`.
- Nested overlays close one at a time: Escape acts only on the topmost one.
- State is never communicated by colour alone. Every tone pairs with an icon, and every value that
  matters also appears as text.
- `prefers-reduced-motion: reduce` sets every duration token to `0s`. The only exempt animations
  are the two loading indicators — the spinner's rotation and the skeleton sweep — because a frozen
  spinner no longer means "loading".
- Groups (tabs, menus, toolbars, trees, selects, radio groups) are one tab stop, with arrow keys
  moving inside the group.

---

## Versioning and known limits

- Semantic Versioning in its pre-1.0 reading: a `0.y` release only fixes; bumping `x` may change
  behaviour or the API. What an application has to do for each version is written in the matching
  entry of [CHANGELOG.md](../CHANGELOG.md).
- The library is built for desktop applications. `JinContextMenu`, for example, has no long-press
  trigger, so a touch device currently has no way to open it.
- No virtual scrolling. With 500 options, opening the popup costs about 65 ms to first paint and a
  filter keystroke 1–6 ms (measured on the Gallery dev build at v0.4.0); larger data sets need the
  application's own handling.
- Three props are declared but not implemented, and setting them does nothing: `lazy` on
  `JinPopover`, `chevron` on `JinDropdown`, `maxItems` on `JinBreadcrumb`.
- The stylesheet relies on CSS custom properties, `:focus-visible` and `backdrop-filter` (the last
  used by the glassmorphism style only).

---

## Documentation

| Document | For | Contents |
| --- | --- | --- |
| [docs/consuming.md](consuming.md) | application developers | the integration guide: dependency paths, Vite/tsconfig settings, symptom table |
| [docs/components.md](components.md) | application developers | API reference and accessibility behaviour of every control |
| [docs/developing.md](developing.md) | repository maintainers | working in this repository: commands, checkers, the Gallery, packaging, publishing |
| [docs/theming.md](theming.md) (Chinese) | repository maintainers | the Jin style's design specification and the implemented-style list; an internal design document, not needed to use the library |
| [docs/architecture.md](architecture.md) | repository maintainers | why the library is shaped this way; an internal design document, not needed to use the library |

---

## License

MIT
