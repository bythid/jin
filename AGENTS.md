# AGENTS.md

Orientation for an agent working in this repository. This is a map and a set of rules, not an API
reference: the authoritative documents are linked below, and where this file and one of them
disagree, they win.

## What this is

Jin (锦) — a token-driven Vue 3 control library, published as `@bythid/jin` (0.1.0, MIT, peer
`vue ^3.5`). 36 components, 12 pure decision modules, 9 DOM composables, 181 tests. Two ideas carry
everything:

1. **Behaviour lives in plain TypeScript; components only render.** `src/core/` imports no Vue and
   assumes no DOM, which is why most tests run in Node in milliseconds.
2. **The token contract is the only style interface.** `contracts/tokens.json` (80 tokens, prefix
   `--jin-`) is enforced mechanically, and every theme restates all of it.

Style and mode are two orthogonal axes, set on `<html>`: `data-jin-style` (`jin` plus eight styles
implemented from the ui-ux-pro-max-skill catalogue) and `data-jin-mode` (`light`, `dark`). The full
list, with the contract axis each style exercises, is docs/theming.md §8.

## Where things are

| Path | What lives there |
| --- | --- |
| `src/core/` | Pure decisions: positioning, focus, roving, menu, tree, overlay stack, dismissal, hotkeys, queues. No Vue, no DOM. |
| `src/composables/` | The DOM half: measuring, focus movement, rAF scheduling, the overlay controller. |
| `src/components/` | The `Jin*.vue` components: render and bind events. |
| `src/injection/` | Plugin (`JinUI`), theme controller, translation, capabilities, stylesheet warning. |
| `src/styles/jin.css` | The base stylesheet — an explicit consumer import, never a side effect of the module. |
| `themes/` | 18 files: nine styles (`jin`, `minimalism-and-swiss-style`, `neumorphism`, `glassmorphism`, `claymorphism`, `flat-design`, `neubrutalism`, `brutalism`, `dimensional-layering`), each with a `.dark` variant. |
| `contracts/` | `tokens.json` (80 tokens) and `strings.json` (25 UI strings). |
| `docs/` | `architecture.md` (why it is shaped this way), `components.md` (API reference), `consuming.md`, `theming.md`, and `README.en.md`, the English twin of the root README. |
| `gallery/` | Vue 3 + Tauri demo app, and the browser-side checkpoint. Consumes the library through a `file:..` dependency, which pnpm hard-links into the gallery's virtual store: an in-place edit to an existing file is live there, an added or deleted one needs a reinstall. Its `src/i18n/` holds the en/zh dictionaries, the locale state, and the `t` it passes to `JinUI`. |
| `tools/*.py` | `check_tokens.py` (six discipline checks), `check_contrast.py`, `smoke_pack.py`. |
| `tests/` | Vitest. Pure logic runs in Node; component tests opt into jsdom with a `// @vitest-environment jsdom` docblock. `gallery-i18n.spec.ts` guards the gallery dictionaries against the pages that use them. |

## Hard rules

Not preferences. Most are enforced by a checker; the rest are enforced in review, and a change that
breaks one gets reverted rather than adjusted.

**Layering**

- A new behaviour decision goes in `src/core/` as a pure module with unit tests — never inline in a
  component. Components render and bind events.
- Nothing under `src/` imports application code. The dependency is one-way.

**Style**

- No literal colour, radius, shadow, duration, font size or border width outside `themes/`.
  Everything reads `var(--jin-*)`.
- A theme restates the whole contract rather than inheriting values from another style.
  `--jin-focus-ring-color` is declared, never derived from the accent.
- `jin-*` classes, `Jin*` components, `data-jin-*` attributes, and no global element selectors in
  the base stylesheet.

**Words**

- No business vocabulary anywhere in the library source — comments included. If a control needs a
  domain noun it arrives through props, slots or injection: the library knows structure,
  interaction, accessibility and state machines; the application owns the nouns.

**Shape**

- `src/index.ts` is the only entry point. No per-directory barrels, no global component
  registration, no new deep-import paths.
- The base stylesheet stays an explicit consumer import. Never re-import it from `src/index.ts`:
  the `.jin-portal` marker (`--jin-stylesheet-loaded`) plus the install-time warning is how a
  missing sheet is detected, and an import a bundler can drop fails silently.

**Overlays**

- `.jin-portal` is the viewport: `position: fixed; inset: 0`, `pointer-events: none` with each child
  restoring `auto`, and no inline layout on it. A host must not restyle it — every overlay
  coordinate is computed in that box.
- One shared overlay stack. Escape reaches the topmost entry only, so nested overlays close one at a
  time. The scrim is shared; a second dialog passes `noScrim`.
- Focus is trapped while open and returns to the trigger on close — to a focusable fallback if the
  trigger became unfocusable, never to `<body>`.

**Accessibility** — a hard requirement, not a checklist bolted on afterwards

- Every interactive control is keyboard reachable with a visible focus ring drawn from the focus
  tokens, and state is never communicated by colour alone.
- Groups (tabs, menus, toolbars, trees, selects, radio groups) are one tab stop with roving
  tabindex; arrows move within.
- `prefers-reduced-motion: reduce` zeroes every duration token except the mechanical animations
  (spinner, skeleton sweep).

## Definition of done

```bash
pnpm run verify     # check_tokens.py + check_contrast.py + vitest + vue-tsc + publint/attw
pnpm run smoke      # packs the library and builds a consumer against the tarball (before publish)
pnpm run gallery    # browser checkpoint — required for portal, positioning or theme changes
```

- `pnpm run verify` must pass. `tools/check_tokens.py` prints the offending file and line for each of
  its six checks: complete themes, no hardcoded style values, no business words, one-way dependency,
  naming discipline, stylesheet marker agreement.
- jsdom measures no layout, so nothing in a test can catch an overlay painted off-screen. Portal,
  positioning and theming changes need eyes in the gallery; `tests/portal.spec.ts` only pins the
  stylesheet rule at the source level.
- Docs move with the code: `docs/components.md` for the API, `docs/theming.md` for measured contrast
numbers (compute them — `tools/check_contrast.py` is the source of truth), the README in both of its
languages, and for a release a `CHANGELOG.md` entry plus a `package.json` bump in one commit on
`main`, tagged `vX.Y.Z`.

## Environment gotchas

- The checkers and the gallery launcher are Python (`python tools/check_tokens.py`,
  `python start_gallery.py`); the test runner is vitest. Both are already wired into pnpm scripts.
- GitHub (`bythid/jin`) is the canonical repository and `origin`; CI, Dependabot and publishing run
  there, and its `publish.yml` fires on any `v*` tag, so pushing a tag is a publish — see Packaging
  in the README before pushing one. Gitee is a read-only mirror of branches, tags and commits:
  issues and pull requests are not mirrored, so contributions belong on GitHub.

## Conventions

- Code, comments, filenames and commit messages are English, including when the conversation about
  them is not; so is everything under `docs/`, except `docs/theming.md`, which is written in Chinese.
  `README.md` is the one root file that is Chinese, and `docs/README.en.md` is its English twin: the
  two are one document in two languages, so a change to either is a change to both. Commits follow
  `type(scope): summary` — `feat`, `fix`, `docs`, `chore`.
- Comments state a constraint the code cannot show. They do not narrate the change, the next line,
  or why the change is correct.
- The public surface is what `src/index.ts` exports; a new export is an API decision, so it needs a
  `docs/components.md` line and, pre-1.0, a CHANGELOG entry that says what an application must react
  to.

---

The short version: decisions in `src/core`, styles only through tokens, no business nouns, one entry
point, verify before claiming done, and open the gallery when layout is involved.
