# Architecture

Why the library is shaped the way it is. The API reference is in
[components.md](components.md); this document is about the seams.

---

## The one decision everything else follows from

**Behaviour lives in plain TypeScript; components only render and bind events.**

`src/core/` contains no Vue import and no DOM assumption. It holds the decisions:

| Module | The decision it makes |
| --- | --- |
| `positioning.ts` | Given two rectangles and a preferred side, where does the floating element go? |
| `focus.ts` | Which element receives focus, and where does it go afterwards? |
| `roving.ts` | Given a key press and a current index, what is the next index? |
| `menu.ts` | Given a key and the visible rows, what happens next? |
| `tree.ts` | Given a load result, what is the new tree state? |
| `overlay-stack.ts` | Who is topmost, and should Escape reach them? |
| `dismissable.ts` | Should this overlay close, given the event? |
| `hotkey.ts` | Is this combination recordable, and does it collide? |
| `queue.ts` | What expires now, and what gets evicted when the cap is reached? |

`src/composables/` is the other half: the part that must touch the DOM. `usePositioning` measures
real rectangles and schedules `requestAnimationFrame`; `computePosition` does the geometry.
`useFocusTrap` moves focus; `focus.ts` decides where.

Three things fall out of that split:

1. **The tests run without a browser.** 107 of the 147 tests are pure logic and execute in
   milliseconds under Node.
2. **There is exactly one implementation of each behaviour.** The modal, drawer, popover, tooltip,
   popconfirm, dropdown and select all call the same positioning code. The context menu is the one
   exception, and an honest one: there is no anchor element to measure, so it takes the pointer's
   viewport coordinates directly — while still sharing the stack, dismissal and focus modules.
   Adding a ninth overlay inherits correct flipping, shifting, focus and dismissal instead of
   re-solving them.
3. **An application can use the decisions directly.** An application that builds a control the
   library does not ship imports `computePosition` or `navigateTree` and gets the same behaviour as
   the built-in controls, not a lookalike.

The counter-example is instructive: had positioning been written inside `JinPopover`, the tenth
overlay would need a fourth copy of the flip logic, and each copy would have a slightly different
edge-case bug. That is the failure mode this architecture exists to prevent.

---

## The overlay stack

Every layered element registers with one stack:

```
open()  → assigns a z-index from a layer token + stack position
        → the stack answers: who is topmost? is a modal open?
close() → removes it and fires its dismissal callback
```

The layer tokens come from the contract (`--jin-z-dropdown` … `--jin-z-tooltip`), so z-index is a
design decision expressed in the theme, not a number an application invents in a hurry. A layer's
token is a **floor**, not a rank: the stack never decreases its z-index along the stack, so whatever
opens later is above whatever was already open. Ranked by the token alone, a nested overlay would
sit under its own host — a select inside a dialog is a `dropdown` (1000) inside a `modal` (1200), so
it painted behind the dialog, hit-tested onto the dialog, and could not be clicked at all. Stack
order is also what `topmost()`, Escape and outside-click routing already treat as truth; the
z-index has to agree with them. Within one layer the order still breaks ties, which is why two
stacked modals order correctly without either knowing about the other.

The scrim is a single shared element. Opening a second dialog does not darken the page twice; the
second dialog sets `noScrim` and the first one's scrim stays put.

**Dismissal is topmost-only.** `handleEscape()` closes the top entry and stops; it does not close
everything at once. This is what makes Escape feel predictable in a nested flow: review dialog →
options drawer → both closed one at a time.

**The portal is the viewport.** Every overlay is teleported into one container that the controller
appends to `<body>`, and that container is anchored to the viewport: `position: fixed; inset: 0`.
The rule is load-bearing, not cosmetic.

- Its padding box starts at the viewport origin, which is the space overlay coordinates are
  computed in: `clientX`/`clientY` for the pointer-anchored context menu, `computePosition` output
  for everything anchored to an element. A container in normal flow instead sits wherever the
  host's content ends — usually below the fold, since an application shell fills the viewport — and
  every overlay inside lands that far off. Nothing reports an error when it does: the elements
  exist, are not `display: none`, and `defaultPrevented` was set as usual; they are simply painted
  out of view.
- Children that fill their containing block (the scrim's `inset: 0`) fill the viewport because of
  it.
- Because the box covers the whole viewport, it keeps `pointer-events: none` and each direct child
  restores `auto` — the same split the toast and notification regions use. Otherwise the empty
  container would swallow input meant for the host.
- The controller puts no inline layout on it. Inline styles beat the stylesheet, and an inline
  `position: relative` overrides the anchoring rule above.

A host must not restyle `.jin-portal`: doing so removes the coordinate contract every overlay is
built on. Nothing in a jsdom test can catch a violation — there is no layout to measure — so the
Gallery shell (which fills the viewport, and where the portal is created after `#app`) is the
browser-side checkpoint, and `tests/portal.spec.ts` pins the stylesheet rule at the source level.

---

## Focus

Focus has three jobs, and they are easy to get subtly wrong:

1. **Entry.** Where does focus go when an overlay opens? The panel itself (so a screen reader reads
   the dialog), or the first control inside it, or an explicitly nominated element.
2. **Containment.** Tab must cycle within the overlay, not escape to the page behind it — and
   `Shift+Tab` must wrap backwards correctly, including when focus starts on the container.
3. **Return.** When the overlay closes, focus goes back to the element that opened it. Never to
   `<body>`, because that means a keyboard user has to start over from the top of the page.

`resolveFocusReturn` encodes the third as a decision, including a case worth calling out: if the
trigger is still in the document but has become unfocusable (it was disabled while the dialog was
open), returning focus to it would silently drop focus onto `<body>`. So a focusable fallback is
preferred over a present-but-unfocusable trigger.

---

## Roving tabindex

Tabs, menus, toolbars, radio groups, trees, selects and toolbars all need the same thing: a group
that is **one** tab stop, with arrows moving inside it. A tree with 500 rows and a tabindex on every
row makes Tab unusable.

`useRovingTabindex` maintains the invariant (exactly one element has `tabindex="0"`), and
`nextRovingIndex` computes the target. The index math accounts for orientation, loop-on/off, and
RTL — in a right-to-left layout the horizontal arrows swap meaning, which is handled in the decision
function rather than at each call site.

Type-ahead is shared too: `createTypeaheadBuffer` accumulates consecutive keystrokes within a
timeout, so typing `"rep"` quickly searches for `rep` rather than jumping to `r`, then `e`, then `p`.

---

## The token contract

The contract has 80 tokens and is enforced mechanically. Two design points are worth stating.

**Tokens describe form, not just colour.** A theme that only sets colours cannot express the
difference between a style with 20px radii, inset shadows and springy motion and one with square
corners, no shadows and no animation. So `--jin-radius-*`, `--jin-elevation-*`, `--jin-duration-*`,
`--jin-border-width`, `--jin-surface-gradient` and `--jin-surface-texture` are all part of the
contract, and brutalism exists precisely to prove the abstraction holds: it changes radius, shadow
and duration to their opposites and no component needs a special case.

**The focus ring is independent of the accent.** `--jin-focus-ring-color` is declared in every
theme and never derived. A style whose accent happens to sit close to its background would otherwise
erase keyboard focus — an accessibility failure caused by a colour choice. Making it a separate
token makes that impossible to do by accident.

**Every theme is complete.** A theme file restates the whole contract rather than relying on values
left by another style. `tools/check_tokens.py` fails the build if a token is missing, which turns
"did I remember everything?" from a review question into a mechanical one.

**Contrast is measured, not eyeballed.** A muted grey at 4.4:1 looks fine to everyone in the room and
is still a WCAG failure, so `tools/check_contrast.py` audits every theme mechanically, measuring each
text and focus colour against the surface it actually sits on.

---

## The boundary

The rule: **the library knows about structure, interaction, accessibility and state machines.
Anything that needs a business noun arrives through props, slots or injection.**

The tree is the hard case, and its API shows the shape of the answer:

| The library owns | The application owns |
| --- | --- |
| Nesting, expansion, selection | What a node represents |
| Keyboard navigation, aria attributes | Where children come from |
| The load → success/failure state machine | Why a load failed |
| The generic `tone` → colour translation | What a badge says, what a colour means |

Two escape hatches exist for decoration, because one is not enough: a `tone` prop for the common
cases, and a scoped `#item` slot for everything else. The library translates `tone` into colour
without asking why, and never learns what the colours mean.

The mechanical check enforces the boundary from the other direction: a blacklist of business words
fails the build if one appears anywhere in the library's source. That includes comments — which is
why the tree's own documentation says "the most demanding component in the set" rather than naming
the application that needs it.

---

## Deliberate omissions

- **No global component registration.** Components are imported. Globality would hide the naming
  discipline and defeat tree-shaking.
- **No `index.ts` barrel per directory.** One entry point keeps the public surface legible and
  makes accidental deep imports visible in review.
- **No CSS-in-JS, no preprocessor.** Tokens are custom properties, which work at runtime and can be
  inspected in devtools. A build-time abstraction would make the token panel — the tool that proves
  a theme is complete — impossible.
- **No Shadow DOM.** Vue SFCs cannot provide it, and there is no requirement for it yet. Isolation
  is achieved by discipline plus the checker; if stronger isolation is ever needed,
  `defineCustomElement` is the documented path.
- **No virtualisation.** A tree or list with 500 rows is already fine; a virtualised one adds a
  measuring layer that changes focus and scroll behaviour. It is a component to add when a real
  screen needs it, not a foundation to build on speculatively.
