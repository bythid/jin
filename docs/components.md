# Components

A reference for every control: what it is for, its public surface, and the accessibility contract it
upholds. Tokens, theming and the consumption setup live in the [README](../README.md) and
[consuming.md](consuming.md).

Conventions used throughout:

- **`v-model`** — `modelValue` in, `update:modelValue` out, on every control that holds a value.
- **`size`** — `'sm' | 'md' | 'lg'`, default `'md'`.
- **`tone`** — `'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'`.
- **Slots** — anything visual that needs application content arrives through a named slot; the
  library never guesses at your markup.
- **Nothing global** — components are imported, never registered globally.

---

## Actions

### JinButton

The base action control: a real `<button>` by default, an `<a>` when `href` is set.

| Prop | Type | Notes |
| --- | --- | --- |
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'link'` | Default `'secondary'` |
| `size`, `block`, `type` | | `type` defaults to `'button'` |
| `icon` | `boolean` | Icon-only: square layout; takes `label` as its accessible name |
| `label` | `string` | Visible text, or the accessible name in icon mode |
| `href` | `string` | Renders an anchor; disabled/loading drop the `href` and use `aria-disabled` |
| `loading` | `boolean` | Swaps the icon for a spinner, sets `aria-busy`, blocks activation |
| `disabled` | `boolean` | Blocks activation and removes the control from the tab order |

Slots: `icon`, default.

**The accessible-name rule.** An icon-only button (`icon` + `label`) renders `label` as
visually-hidden text — whether or not the application also passes a `#icon` slot — so the button
always has a name. This is the button's single naming mechanism: it never carries `aria-label` as
well, so there is one name to translate and one for a screen reader to announce. The name also
stays while the button is loading, so a busy button still says what it does.

---

## Feedback

### JinSpinner

Indeterminate activity.

| Prop | Type | Notes |
| --- | --- | --- |
| `size` | `Size` | 16 / 20 / 32 in font-relative units |
| `label` | `string` | Providing one turns it into a live region; omitting it makes it decorative |

A spinner communicates "working" through motion. That is why the two mechanical animations in the
library (this one and the skeleton sweep) are the only durations exempt from the reduced-motion
zeroing — a frozen spinner says nothing.

### JinProgress

Linear or circular, determinate or not.

| Prop | Type | Notes |
| --- | --- | --- |
| `variant` | `'linear' \| 'circular'` | |
| `value` | `number \| null` | `null` (or omitted) is indeterminate |
| `max` | `number` | Default 100 |
| `size`, `showValue`, `label`, `diameter` | | `diameter` is circular-only, in px |

Determinate mode always prints the percentage. Indeterminate mode omits `aria-valuenow` entirely
rather than reporting a fake number.

### JinSkeleton

| Prop | Type | Notes |
| --- | --- | --- |
| `variant` | `'text' \| 'rect' \| 'circle'` | |
| `width`, `height` | `string \| number` | |
| `animated` | `boolean` | The sweep; suppressed under reduced motion |

Use a skeleton when the final layout is predictable, a spinner when it is not.

### JinAlert

Persistent, inline feedback belonging to a region of the page.

| Prop | Type | Notes |
| --- | --- | --- |
| `tone` | `Tone` | `warning` and `danger` become `role="alert"`; the rest `role="status"` |
| `title`, `description` | `string` | |
| `dismissible` | `boolean` | Emits `dismiss` |
| `dismissLabel` | `string` | Overrides the accessible name of the close button |

Slots: `icon`, `actions`, default.

Every tone pairs its colour with a distinct icon, so a colour-blind user or a greyscale printout
still reads the severity.

### JinToastRegion / JinNotificationRegion

Both are hosts. Mount each **once** at the application root; mounting twice renders every message
twice.

```vue
<JinToastRegion />
<JinNotificationRegion />
```

Driven through their stores:

```ts
import { useToasts, useNotifications } from '@bythid/jin'

const toasts = useToasts()
const notifications = useNotifications()

toasts.push({ tone: 'success', title: 'Saved', description: 'All changes are on disk.' })
notifications.push({
  tone: 'warning',
  title: 'Update available',
  actions: [{ label: 'Install', primary: true, handler: install }],
})
```

| Option | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Reuse to update in place |
| `tone` | `Tone` | |
| `title`, `description` | `string` | |
| `duration` | `number` | ms; **0 means "until dismissed"** and is the notification default |
| `position` | `QueuePosition` | Six positions, settable per message |
| `closable` | `boolean` | Default `true` |
| `actions` | `FeedbackAction[]` | `{ label, handler, primary?, keepOpen? }` |
| `priority` | `number` | Higher-priority entries are evicted later |

Both regions also take an **`offset`** prop — `{ x?, y?, unit? }` with `unit: 'px' | 'percent'`
(default `'px'`) — that shifts the **whole sequence** (every message in every rendered region) by a
signed amount from its pinned corner. The directions are physical and absolute: `+x` is always
rightward, `+y` always downward, with no RTL mirroring — the values are explicit coordinates, not
flow-relative ones. `percent` resolves against the viewport (the region's fixed containing block),
so a ratio offset follows window resizes. An offset may push messages off-screen; the queue neither
reflows around it nor clamps it — the caller owns the values. The decision is reusable:
`regionTransform(position, offset)` from the package root returns the inline transform. Because the
direction is absolute, a host that only wants *some* corners shifted (a top sequence yielding a
sticky header) splits its regions by `positions` — disjoint subsets never double-render a message.

Store methods: `push` (returns the id), `update`, `dismiss`, `clear`, `pause`, `resume`, plus the
reactive `items` and `byPosition`.

**Toast vs notification** — the distinction the library takes seriously:

- A **toast** auto-dismisses and must not interrupt. It carries confirmation, never a decision.
- A **notification** persists until handled. It is for anything the user must act on.

Hovering or focusing a region pauses its timers, so a message cannot vanish mid-read. When a
position is full, the oldest **toast** is evicted; a notification is never dropped to make room.

### JinResult

| Prop | Type | Notes |
| --- | --- | --- |
| `status` | `'success' \| 'danger' \| 'warning' \| 'info' \| 'empty' \| 'forbidden' \| 'notFound' \| 'offline'` | Chooses tone + icon + default title |
| `title`, `description`, `icon` | | `icon` overrides the status preset |

Slots: `icon`, `actions`, default.

---

## Overlays

All five share one portal container, one positioning module, one dismissal module and one focus
module. Opening a second overlay while the first is open does not create a second scrim, and Escape
always reaches only the topmost entry.

### JinModal

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | | `v-model` |
| `title`, `description` | `string` | | Also settable via the `header` slot |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | |
| `closeOnEsc` | `boolean` | `true` | |
| `closeOnOutside` | `boolean` | `true` | Scrim clicks |
| `hideClose` | `boolean` | `false` | |
| `busy` | `boolean` | `false` | Blocks both dismissal paths and switches to `role="alertdialog"` |
| `ariaLabel` | `string` | | When there is no title |
| `noScrim` | `boolean` | `false` | For a nested dialog that must not re-darken |

Emits: `update:modelValue`, `open`, `close`, `afterClose`. Slots: `header`, `footer`, default.

The corner close button floats over the panel chrome: top-left on Apple platforms (mirroring the
system traffic lights) and top-right elsewhere, mirroring with the document direction. `hideClose`
removes it for hosts that render their own close affordance.

On open, focus moves into the panel; Tab cycles within it; on close, focus returns to the element
that opened it. A `busy` dialog is a deliberate exception to "always dismissable" — that is what
prevents a half-finished save from being dismissed by a stray keystroke.

### JinDrawer

Same contract as the modal, with `side: 'top' | 'right' | 'bottom' | 'left'` and four width steps.

### JinPopover

| Prop | Type | Notes |
| --- | --- | --- |
| `modelValue` | `boolean` | Omitting it makes the popover self-managing |
| `anchor` | `HTMLElement` | Defaults to the `#anchor` slot's wrapper |
| `placement` | `Placement` | `'bottom'`, `'top-start'`, `'right-end'`, … |
| `offset`, `flip`, `shift`, `arrow` | | Flip and shift default on; flip keeps the preferred side whenever it fits |
| `closeOnEsc`, `closeOnOutside` | `boolean` | |
| `ignoreAnchor` | `boolean` | Clicks on the trigger do not dismiss (default `true`) |
| `lazy` | `boolean` | **Declared but not implemented** — the panel is always mounted while closed |

This is the substrate for the dropdown, select, tooltip and popconfirm — none of them re-solve
anchoring.

### JinTooltip

Non-interactive by design; never the only place information lives.

| Prop | Type | Notes |
| --- | --- | --- |
| `content` | `string` | Or the `#content` slot |
| `placement` | `Placement` | Default `'top'` |
| `openDelay` / `closeDelay` | `number` | ms; defaults 300 / 80 |
| `disabled` | `boolean` | |

Opens on hover **and focus**, so touch and keyboard reach it too.

### JinPopconfirm

| Prop | Type | Notes |
| --- | --- | --- |
| `title`, `description`, `tone` | | `tone: 'danger'` colours the confirm action |
| `confirmLabel`, `cancelLabel` | `string` | Fall back to the injected translations |
| `loading` | `boolean` | For a confirm that itself takes time |
| `placement` | `Placement` | |

Focus moves to the confirm button on open, so a keyboard user is not stranded. Escape cancels.
An `anchor` handed over together with the open flag is measured after the DOM update, so the bubble
is positioned against the real anchor rather than a stale or zero rect.

---

## Forms

### JinField

The label / hint / error container the other controls compose.

| Prop | Type | Notes |
| --- | --- | --- |
| `label`, `hint`, `error` | `string` | An `error` replaces the hint and switches the field to invalid |
| `required`, `optional` | `boolean` | `required` draws and announces `*`; `optional` shows an "(optional)" tag |
| `optionalLabel` | `string` | Replaces the default "(optional)" text |
| `labelFor`, `noLabelFor` | | Override or suppress the label's `for` association |
| `reserveMessageSpace` | `boolean` | Prevents layout shift when an error appears |

A control placed in the default slot inherits the ids through provide/inject and wires its own
`aria-describedby` / `aria-invalid` / `aria-required`. When a field holds a composite control (a
switch, a group), pass `:no-label-for="true"`.

### JinTextField

| Prop | Type | Notes |
| --- | --- | --- |
| `modelValue` | `string` | |
| `multiline` | `boolean` | Renders a textarea |
| `rows`, `autosize`, `maxRows` | | Autosizing stops at `maxRows` and scrolls |
| `type`, `size`, `placeholder` | | |
| `disabled`, `readonly` | `boolean` | |
| `clearable` | `boolean` | Only when there is something to clear |
| `showCount`, `maxlength` | | The counter turns into a warning past the limit |
| `invalid` | `boolean` | Usually inherited from the surrounding field |
| `block` | `boolean` | Default `true` |

Slots: `prefix`, `suffix`. Emits: `update:modelValue`, `input`, `change`, `clear`, `focus`, `blur`,
`keydown`.

### JinSearchField

A `JinTextField` specialised for search: a search icon, a clear button, Escape to clear, and a
debounced `search` event (`debounce`, default 300ms; `0` for Enter-only).

### JinSelect

One API, two implementations.

| Prop | Type | Notes |
| --- | --- | --- |
| `modelValue` | `string \| null` | |
| `options` | `SelectOption[]` | `{ value, label, disabled?, data? }` |
| `native` | `boolean` | Renders a real `<select>`; flipping it changes nothing else |
| `placeholder`, `size`, `disabled`, `invalid`, `block` | | |
| `keepOpen` | `boolean` | Custom mode only |

Emits `update:modelValue` and `change(value, option)`. Slot: `option` for rich rows.

Custom mode is a `role="combobox"` trigger plus a `role="listbox"`, with arrow-key navigation,
type-ahead, disabled-option skipping and `aria-activedescendant`. Native mode is the platform
control — the right choice when fidelity matters more than styling.

### JinCombobox

A text input whose value filters a listbox of options — the WAI-ARIA combobox pattern with
optional free-form entry. **Custom-only by design**: there is no `native` mode. The closest
native analogue, `<datalist>`, cannot render custom option rows, cannot offer the
commit-typed-value affordance, and leaves the filtering itself to the user agent — so a native
mode would not be the same control.

| Prop | Type | Notes |
| --- | --- | --- |
| `modelValue` | `string \| null` | |
| `options` | `SelectOption[]` | Same `{ value, label, disabled?, data? }` shape as JinSelect |
| `freeEntry` | `boolean` | Default `false`. `false` (restricted) commits only listed options; `true` commits the typed text, whether or not it is listed |
| `openOnFocus` | `boolean` | Default `true`; set `false` to open only on typing or `ArrowDown` |
| `placeholder`, `size`, `disabled`, `invalid`, `block`, `ariaLabel` | | |

Emits `update:modelValue` and `change(value, option)`. Slot: `option` for rich rows (receives
`{ option, selected }`; the default row highlights the matched substring). The popup is a
`JinPopover`, so it shares the one portal, positioning, overlay stack and dismissal.

**Commit moments.** `update:modelValue` fires on commit, never per keystroke:

1. an option is picked — click, or `Enter` on the active option;
2. `Enter` with no active option — the typed text commits under the mode's rules;
3. blur with a changed value — in free entry the typed text commits (surrounding whitespace
   trimmed); in restricted mode a text that names a listed option commits that option, anything
   else reverts silently.

A typed text that exactly names a listed option always commits *that option* (so `change` carries
it and the value stays canonical), in both modes. `Escape` closes the popup first, and — with the
popup already closed and something to clear — clears the value, emitting `null`. An Escape that
does nothing local still reaches the overlay behind the combobox.

**Keyboard.** The input is the trigger and keeps focus while the popup is open;
`aria-activedescendant` moves through the options (`role="combobox"`, `aria-expanded`,
`aria-controls`, `aria-autocomplete="list"`; options carry `aria-selected`). `ArrowUp`/`ArrowDown`
navigate (skipping disabled rows, opening the popup from closed), `Home`/`End` jump to first/last
while the popup is open and stay caret keys when it is closed, `Enter` commits, `Escape` closes
then clears. Typing filters.

**Filtering.** Case-insensitive and diacritic-insensitive substring match on the label, anywhere
in it — `foldText`, `filterIndices` and `matchSegments` in `src/core/filter.ts` are the decision,
and an application building its own control can reuse them from the package root.

**Large lists, deliberately not windowed.** Options run to several hundred and every filtered row
is rendered. Measured in the gallery (dev build): opening the popup with 500 options costs
roughly 65 ms to first paint, and a filter keystroke against the full 500 — matching, diffing and
re-rendering the rows — lands between 1 and 6 ms. That is well inside interactive budget, so no
virtualisation: consistent with the architecture's stance, a windowing layer would complicate
focus, `scrollIntoView` and the `#option` slot for a problem the measurements do not show.

### JinCheckbox

| Prop | Type | Notes |
| --- | --- | --- |
| `modelValue` | `boolean` | |
| `indeterminate` | `boolean` | Exposed as `aria-checked="mixed"` |
| `label`, `hint` | `string` | |
| `disabled`, `invalid` | `boolean` | |
| `value`, `name` | `string` | For checkboxes feeding one array model |

### JinRadioGroup

| Prop | Type | Notes |
| --- | --- | --- |
| `modelValue` | `string \| null` | |
| `options` | `RadioOption[]` | `{ value, label, hint?, disabled? }` |
| `label`, `hint`, `error`, `required` | | The group renders its own `fieldset`/`legend` |
| `orientation` | `'vertical' \| 'horizontal'` | |
| `disabled` | `boolean` | |

The group is one tab stop; arrows move and select, skipping disabled options. Implemented over real
radio inputs, so screen readers announce genuine radio semantics.

### JinSwitch

`modelValue: boolean`, `label`, `disabled`, `size`, `name`, `ariaLabel`.

Uses `role="switch"`, so the state is announced as *on/off* rather than *true/false*.

### JinHotkeyRecorder

| Prop | Type | Notes |
| --- | --- | --- |
| `modelValue` | `string` | Serialized form, e.g. `"Ctrl+Shift+K"` |
| `bindings` | `HotkeyBinding[]` | `{ id, hotkey }` to check against |
| `rejectConflicts` | `boolean` | Refuse a conflicting combination instead of only warning |
| `allowBareKeys` | `boolean` | Without it, a modifier-less letter is refused — it would swallow typing |
| `messages` | `object` | Override the built-in status text |
| `disabled`, `placeholder`, `ariaLabel` | | |

Emits: `update:modelValue`, `record(serialized, parts)`, `clear`, `conflict(ids, parts)`,
`invalid(parts)`.

Click it, then press a combination. Normalization, recordability rules and conflict detection are
pure functions in `src/core/hotkey.ts` — an application can reuse them for global shortcuts without
mounting the component.

---

## Navigation and structure

### JinTabs

| Prop | Type | Notes |
| --- | --- | --- |
| `items` | `TabItem[]` | `{ value, label, disabled?, badge? }` |
| `modelValue` | `string \| null` | |
| `orientation` | `'horizontal' \| 'vertical'` | |
| `activation` | `'automatic' \| 'manual'` | Manual means arrows move focus and Enter/Space selects |
| `grow` | `boolean` | Tabs fill the list |

Panels are projected by tab value (`<template #panelValue>`), or by the shared `#panel` slot for
every tab without a value-named slot; `#default` is **not** a panel route and renders nothing. The
library wires `role="tab"`/`role="tabpanel"` and `aria-controls` without taking ownership of where
the panel lives.

### JinMenu

A flat, keyboard-driven row list — the substrate for the dropdown and context menu.

| Prop | Type | Notes |
| --- | --- | --- |
| `items` | `MenuEntry[]` | See below |
| `ariaLabel` | `string` | |
| `autofocus` | `boolean` | Default `true` |
| `closeOnSelect` | `boolean` | |
| `rtl` | `boolean` | Swaps the horizontal arrow keys |

```ts
interface MenuEntry {
  id: string
  label?: string
  type?: 'item' | 'separator' | 'label'
  disabled?: boolean
  danger?: boolean
  checked?: boolean       // renders a check mark and sets aria-checked
  items?: MenuEntry[]     // a submenu
  keywords?: string       // extra type-ahead words
  shortcut?: string       // display-only accelerator hint
}
```

Keyboard: Up/Down move (skipping separators, labels and disabled rows), Right opens a submenu, Left
closes it, Home/End jump, Escape closes the deepest thing first, and typing jumps to a matching
label. Emits `select`, `open-change`, `close`.

### JinDropdown

A menu behind a trigger. `items`, `placement` (default `'bottom-end'`), `ariaLabel`, `disabled`,
`keepOpen`, plus a `#trigger` slot. `chevron` is **declared but not implemented** — the default
trigger draws no chevron. Enter/Space/ArrowDown open it and move focus to the first row; Escape
closes it and focus returns to the trigger.

### JinContextMenu

Right-click, or **Shift+F10 / the Menu key** when focused — a context menu that ignores the
keyboard is unusable. Long-press is **not implemented** (the wrapper listens to `contextmenu` and
`keydown` only), so touch users currently have no route into this menu. The menu is clamped into
the viewport when the pointer is near an edge. Emits `select`.

The wrapper is an inline-block `<span class="jin-context-menu">`, and the wrapper's box — not the
page — is the right-click surface. A panel whose blank area should answer right-clicks too lets the
wrapper fill it: attributes fall through, so put the application's own class on the component and
size the wrapper there (`display: block; min-height: 100%` inside a panel of definite height, or
`position: absolute; inset: 0` inside a positioned one). The library keeps no layout opinion beyond
`inline-block`. Note the default `keyboardAccessible` makes that wrapper a tab stop; set it to
`false` for a panel-wide surface that should not be one.

An `#item` slot (`{ entry, row }`) forwards to the inner `JinMenu`'s row content, so a host can
render its own row innards (hint glyphs, badges) in a pointer-anchored menu. The fallback replicates
JinMenu's default label span: a host that passes no slot sees no change.

### JinBreadcrumb

`items: BreadcrumbItem[]` (`{ label, href?, onClick?, current? }`), `ariaLabel`, `maxItems`, and a
`#separator` slot. Renders a real `<nav>` + `<ol>`; the last item carries `aria-current="page"`.

`maxItems` is **declared but not implemented** — every item is rendered regardless of its value.

### JinDivider

`orientation`, `spaced`, `label`. With a label it becomes a labelled rule with the text between two
lines; without one it is an `<hr>`.

### JinCard

`title`, `description`, `elevation: 'flat' | 'base' | 'raised'`, `interactive`, `ariaLabel`. The
interactive variant is a real focusable surface that responds to Enter and Space — not a `div` with
a click handler. Slots: `header`, `actions`, `footer`, default.

### JinToolbar

A horizontal action strip that is **one tab stop**: arrows move between its controls, so a long
toolbar does not become a Tab marathon. `ariaLabel`, `quiet` (drops the surface for use inside a
card header).

### JinNav

`items: NavItem[]` (`{ id, label, icon?, href?, badge?, disabled?, items? }`), `current`
(marks `aria-current`), `orientation`, `ariaLabel`. Nested items render as an indented sub-list;
emits `select`. Purely presentational — it has no idea what a route is.

### JinTree

The most demanding control in the set, and the one with the strictest boundary.

| Prop | Type | Notes |
| --- | --- | --- |
| `nodes` | `TreeNode[]` | `{ id, label?, children?, hasChildren?, disabled?, tone?, icon?, data? }` |
| `load` | `(node) => Promise<TreeNode[]>` | For branches with `hasChildren` and no `children` |
| `expanded` | `string[]` | `v-model:expanded`; omit to let the tree keep its own state |
| `selected` | `string \| null` | `v-model:selected` |
| `selectionMode` | `'none' \| 'single' \| 'multiple'` | Multiple selection is uncontrolled: the tree keeps the set internally and reports it through `update:selectedMany`; there is no `selectedMany` prop to write back yet |
| `ariaLabel`, `indent`, `loadingLabel`, `emptyLabel` | | |

Emits: `update:expanded`, `update:selected`, `update:selectedMany`, `activate`, `toggle`,
`load-start`, `load`, `load-error`.

```vue
<JinTree
  :nodes="nodes"
  :load="loadChildren"
  v-model:expanded="expandedIds"
  v-model:selected="selectedId"
  @load-error="onLoadError"
>
  <template #item="{ node, depth, expanded, loading, failed, selected }"> … </template>
</JinTree>
```

**What the library provides:** nesting, expansion, selection, keyboard navigation, `aria-level` /
`aria-setsize` / `aria-posinset` / `aria-expanded` / `aria-selected`, the inline loading indicator
on the row that is loading, and the load state machine.

**What the application provides:** what a node means, where children come from, why a load failed,
what a badge says, what a colour means, and every string the user reads.

**The application's data wins when it supplies it.** `node.children` is what the tree renders for
that node; the result of `load` is the stand-in only while the node carries no `children`. So a
branch that was fetched once stops showing the fetched rows as soon as the application puts
`children` back on the node — including an empty array, which makes it a leaf.

The boundary of that rule: a node whose `children` the application removes again falls back to the
cached load result, and there is no invalidation API — replacing the `nodes` array does not clear
the cache either. To force a branch back to "not loaded", give it `children: []` or remount the
tree. An invalidation route (`invalidate(id)` / a cache option) is a candidate for a later round,
not part of this API.

**The failure contract.** When `load` rejects, the library does exactly three things:

1. returns the row to *not loaded* — collapsed, no loading flag — so a retry is a fresh attempt;
2. emits `load-error` with `{ node, error }`, so the application can roll back its own state;
3. never swallows the error. The row also shows an inline failure marker with a retry control.

**Decoration, two routes.** A generic `tone` prop (`default` / `muted` / `warning` / `danger`) which
the library translates into colour without asking why, and a scoped `#item` slot for everything
else. `TreeNode.icon` is opaque application data: the default row does **not** draw it, so a node
icon needs the `#item` slot. Neither route requires the library to understand the data.

**Keyboard.** Up/Down move, Right expands or steps into a branch, Left collapses or moves to the
parent, Home/End jump, `*` expands every loaded branch, and typing jumps to a matching label. The
tree is one tab stop. When no row has been active yet — a freshly focused tree, or one whose data
was just replaced — the first selectable row is the anchor, so the very first key press already
moves or expands rather than doing nothing.

---

## Data display

### JinBadge

`tone`, `variant: 'text' | 'dot'`, `label`, `ariaLabel`. A dot badge **always** takes a
label, because a bare coloured circle conveys nothing to a screen reader and very little to anyone
else.

### JinTag

`tone`, `label`, `removable`, `removeLabel`, `disabled`. A removable tag's remove button is in the
tab order — a keyboard user must be able to take a tag off. Emits `remove`.

### JinDetailList

`items: DetailItem[]` (`{ key, label, value?, hidden? }`), `bordered`, `striped`, `compact`,
`emptyText`. Renders a real `<dl>`, so the label/value relationship survives without aria plumbing;
a `#value` slot handles per-row custom rendering.

### JinLink

`href`, `external`, `muted`, `disabled`. With `external` and an `openExternal` capability, the
navigation is handed to the host instead of the browser — which is what a desktop shell needs.
Without the capability it degrades to a normal anchor with `target="_blank"`.

### JinIcon

`name`, `size` (in `em`, so it follows the surrounding text), `label`. A labelled icon is exposed as
an image with that accessible name; an unlabelled one is hidden from assistive technology.

This is a slot-and-convention component, not an icon system: every control accepts a slot for its
glyphs and falls back to this set, so an application with its own icon library passes its own
component and the library never notices.

---

## Composables and pure modules

Anything an application may need to reuse is exported from the package root.

```ts
import {
  // injection
  useTheme, useT, useCapabilities,
  // message stores
  useToasts, useNotifications,
  // kernel, for building your own controls
  computePosition, usePositioning,
  createOverlayStack, useOverlay,
  useFocusTrap, stepIndex, resolveFocusReturn,
  nextRovingIndex, createTypeaheadBuffer,
  filterIndices, foldText, matchSegments,
  regionTransform,
  flattenMenu, menuNavigate,
  flattenTree, navigateTree, applyLoadFailure,
  fromKeyboardEvent, serializeHotkey, findHotkeyConflicts,
  createQueue,
  // platform conventions
  closeButtonSide,
} from '@bythid/jin'
```

The distinction worth keeping in mind: `useOverlay`, `usePositioning` and `useFocusTrap` are the DOM
halves, and the functions beside them are the decisions. If you build a control the library does not
ship, use the decision functions directly — that is how the behaviour stays identical to the built-in
controls instead of merely similar.

`closeButtonSide(userAgent)` is the one decision behind the modal's corner close control:
`'left'` on Apple platforms (the traffic-light corner), `'right'` elsewhere. An application that
draws its own dialog chrome — a popover styled as a window, a custom header — should put its close
or back control on the same side, so the corner users reach for matches the window they are in.

---

## Not in the library, on purpose

Date and time pickers, colour pickers, data grids and virtualisation, avatars, carousels, sliders,
ratings, product tours, and anything that is genuinely just CSS (`text`, `label`, `link` — use the
typography tokens and a plain element). Each is either a substantial product in its own right or
does not benefit from being abstracted. The full reasoning, including which Fluent UI components
were deliberately not adopted, are a deliberate scope decision.
