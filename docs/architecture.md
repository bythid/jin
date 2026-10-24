# Architecture

Why the library is shaped the way it is. This is an internal design document: reading it is not
needed to use the library. The API reference is [components.md](components.md), the Jin visual
specification is [theming.md](theming.md) (Chinese), and day-to-day repository work is in
[developing.md](developing.md).

---

## The layering rule

**Behaviour lives in plain TypeScript; components only render and bind events.**

`src/core/` imports no Vue and assumes no DOM. It holds the decisions:

| Module | The decision it makes |
| --- | --- |
| `positioning.ts` | Given two rectangles and a preferred side, where does the floating element go? |
| `focus.ts` | Which element receives focus, and where does it go afterwards? |
| `roving.ts` | Given a key press and a current index, what is the next index? |
| `menu.ts` | Given a key and the visible rows, what happens next? |
| `tree.ts` | Given a load result, what is the new tree state? |
| `overlay-stack.ts` | Which entry is topmost, and should Escape reach it? |
| `dismissable.ts` | Should this overlay close, given the event? |
| `hotkey.ts` | Is this combination recordable, and does it collide? |
| `queue.ts` | What expires now, and what is removed when the cap is reached? |

`src/composables/` is the other half: the part that must touch the DOM. `usePositioning` measures
real rectangles and schedules `requestAnimationFrame`; `computePosition` does the geometry.
`useFocusTrap` moves focus; `focus.ts` decides where.

Three things follow from that split:

1. **The tests run without a browser.** The pure modules are unit-tested directly under Node, in
   milliseconds; only component tests opt into jsdom.
2. **There is exactly one implementation of each behaviour.** The modal, drawer, popover, tooltip,
   popconfirm, dropdown and select all call the same positioning code. The context menu is the one
   exception, and a justified one: there is no anchor element to measure, so it takes the pointer's
   viewport coordinates directly — while still sharing the stack, dismissal and focus modules. A new
   overlay inherits the existing flipping, shifting, focus and dismissal behaviour instead of
   re-implementing it.
3. **An application can use the decisions directly.** An application building a control this library
   does not ship imports `computePosition` or `navigateTree` and gets the same behaviour as the
   built-in controls, not a near-copy.

Had positioning been written inside `JinPopover`, every later overlay would have carried its own
copy of the flip logic, and each copy would have had its own edge-case bugs. Preventing that is what
this layering is for.

## The directory map

```
contracts/        the token list and the string list — the two files library and application agree on
themes/           one file per style[.mode], each defining the whole contract
                  (nine styles: jin, minimalism-and-swiss-style, neumorphism, glassmorphism,
                  claymorphism, flat-design, neubrutalism, brutalism, dimensional-layering,
                  each with a .dark variant)
src/core/         pure TypeScript: positioning, focus, roving tabindex, menu, tree, hotkeys, queue
src/composables/  the DOM half of those modules, plus the overlay controller
src/injection/    translation, capabilities, theme, and the plugin that combines them
src/components/   one .vue file per control
src/styles/       the base stylesheet, rooted at .jin-* only
tools/            the automated checks
tests/            vitest; pure logic runs in node, component tests opt into jsdom
gallery/          the demo application and its Tauri shell — also the en/zh translation example
```

If a behaviour can be expressed as a decision, its decision belongs in `src/core/` rather than in a
`.vue` file.

---

## The overlay stack

Every layered element registers with one stack:

```
open()  → assigns a z-index from a layer token + stack position
        → the stack answers: which entry is topmost? is a modal open?
close() → removes it and calls its dismissal callback
```

The layer tokens come from the contract (`--jin-z-dropdown` … `--jin-z-tooltip`), so z-index is a
design decision expressed in the theme, not a number an application picks ad hoc. A layer's token is
a **floor**, not a rank: the stack never lowers the z-index of a new entry below an earlier one, so
whatever opens later sits above whatever was already open. Ranking by the token alone breaks nested
overlays: a select inside a dialog is a `dropdown` (1000) inside a `modal` (1200), and it painted
behind the dialog — the list was open, clicks landed on the dialog, and the list could not be
clicked at all. Stack order is also what `topmost()`, Escape and outside-click routing already treat
as truth; the z-index has to agree with them. Within one layer the order still breaks ties, which is
why two stacked modals layer correctly without either knowing about the other.

The scrim is one shared element. Opening a second dialog does not darken the page twice; the second
dialog sets `noScrim` and the first dialog's scrim stays.

**Dismissal is topmost-only.** `handleEscape()` closes the top entry and stops; it does not close
everything at once. That is what makes Escape predictable in a nested flow: each press closes one
layer.

**The portal container covers the viewport.** Every overlay is teleported into one container that
the controller appends to `<body>`, anchored to the viewport with `position: fixed; inset: 0`. The
rule must hold exactly, and here is why:

- Its padding box starts at the viewport origin, which is the coordinate space overlay positions are
  computed in: `clientX`/`clientY` for the pointer-anchored context menu, `computePosition` output
  for everything anchored to an element. A container in normal flow instead sits wherever the
  application's content ends — usually below the visible area, since an application shell fills the
  viewport — and every overlay inside lands that far off. Nothing reports an error when it does: the elements
  exist, they are not `display: none`, and `defaultPrevented` was set as usual; they are simply
  painted out of view.
- Children that fill their containing block (the scrim's `inset: 0`) fill the viewport because of
  this container.
- Because the box covers the whole viewport, it keeps `pointer-events: none` and each direct child
  restores `auto` — the same split the toast and notification regions use. Otherwise the empty
  container would block input meant for the application.
- The controller puts no inline layout on it. Inline styles beat the stylesheet, and an inline
  `position: relative` would override the anchoring rule above.

An application must not restyle `.jin-portal`: doing so removes the coordinate contract every
overlay is built on. Nothing in a jsdom test can catch a violation — there is no layout to measure —
so the
Gallery shell (which fills the viewport, and where the portal is created after `#app`) is the
browser-side checkpoint, and `tests/portal.spec.ts` pins the stylesheet rule at the source level.

---

## Focus

Focus handling covers three cases, and each is easy to get subtly wrong:

1. **Entry.** Where focus goes when an overlay opens: the panel itself (so a screen reader reads the
   dialog), the first control inside it, or an explicitly nominated element.
2. **Containment.** Tab must cycle within the overlay, not escape to the page behind it — and
   `Shift+Tab` must wrap backwards correctly, including when focus starts on the container.
3. **Return.** When the overlay closes, focus goes back to the element that opened it. Never to
   `<body>`, because that means a keyboard user starts over from the top of the page.

`resolveFocusReturn` encodes the third case as a decision, including one case worth naming: if the
trigger is still in the document but has become unfocusable (it was disabled while the dialog was
open), returning focus to it would drop focus onto `<body>`. So a focusable fallback is preferred
over a present-but-unfocusable trigger.

---

## Roving tabindex

Tabs, menus, toolbars, radio groups, trees and selects all need the same thing: a group that is
**one** tab stop, with arrow keys moving inside it. A tree with 500 rows and a tabindex on every row
makes the Tab key useless.

`useRovingTabindex` maintains the invariant (exactly one element has `tabindex="0"`), and
`nextRovingIndex` computes the target. The index math accounts for orientation, loop-on/off, and
RTL — in a right-to-left layout the horizontal arrows swap meaning, which is handled in the decision
function rather than at each call site.

Type-ahead is shared too: `createTypeaheadBuffer` accumulates keystrokes within a timeout, so typing
`"rep"` quickly searches for `rep` rather than jumping to `r`, then `e`, then `p`.

---

## The token contract

The contract is `contracts/tokens.json`: 80 custom-property names, and every theme file defines all
of them. The checker (`tools/check_tokens.py`) fails the build on a missing token, so "did the theme
define everything?" is a question a script answers, not one a reviewer guesses. Four design points
are worth stating:

**Tokens describe form, not just colour.** A theme that only sets colours cannot express the
difference between a style with 20px radii, inset shadows and springy motion and one with square
corners, no shadows and no animation. So `--jin-radius-*`, `--jin-elevation-*`, `--jin-duration-*`,
`--jin-border-width`, `--jin-surface-gradient` and `--jin-surface-texture` are all part of the
contract, and brutalism exists to prove the abstraction holds: it sets radius, shadow and duration
to their opposites, and no component needs a special case.

**The focus ring is independent of the accent.** `--jin-focus-ring-color` is declared in every theme
and never derived. A style whose accent happens to sit close to its background would otherwise make
the focus ring nearly invisible — an accessibility failure caused by a colour choice. A separate
token makes that impossible to cause by accident.

**Every theme is complete.** A theme file restates the whole contract rather than relying on values
left by another style. Switching themes therefore cannot leave a token undefined.

**Contrast is measured, not judged by eye.** A muted grey at 4.4:1 looks fine to everyone in the
room and is still a WCAG failure, so `tools/check_contrast.py` audits every theme automatically,
measuring each text and focus colour against the surface it actually sits on.

---

## The library/application boundary

The rule: **the library owns structure, interaction, accessibility and state machines. Anything that
needs a business noun arrives through props, slots or injection.**

The tree is the hardest case, and its API shows the shape of the answer:

| The library owns | The application owns |
| --- | --- |
| Nesting, expansion, selection | What a node represents |
| Keyboard navigation, aria attributes | Where children come from |
| The load → success/failure state machine | Why a load failed |
| The generic `tone` → colour translation | What a badge says, what a colour means |

Two customization mechanisms exist for how a row looks, because one is not enough: a `tone` prop for
the common cases, and a scoped `#item` slot for everything else. The library translates `tone` into
colour without asking why, and never learns what the colours mean.

The automated check enforces the boundary from the other side: the business-word blacklist fails the
build if one appears anywhere in the library's source — comments included. That is why the tree's own
documentation calls it "the most demanding component in the set" instead of naming the application
that needs it.

---

## Not built, and why

- **No global component registration.** Components are imported. Global registration would hide which
  names are public and defeat tree-shaking.
- **No `index.ts` barrel per directory.** One entry point keeps the public surface readable and makes
  accidental deep imports visible in review.
- **No CSS-in-JS, no preprocessor.** Tokens are custom properties, which work at runtime and can be
  inspected in devtools. A build-time abstraction would make the Gallery's token panel — the tool
  that proves a theme is complete — impossible.
- **No Shadow DOM.** Vue single-file components cannot produce it, and nothing today requires it.
  Isolation rests on the naming rules plus the checker. Should stronger isolation ever be needed,
  `defineCustomElement` is the documented Vue mechanism.
- **No virtualisation.** A tree or list with a few hundred rows is fine as is (the combobox
  measurements in [components.md](components.md) are the reference numbers); a virtualised variant
  adds a measuring layer that changes focus and scroll behaviour. The decision: add it when a real
  screen needs it, not before.
