# Changelog

What changed, per version, newest first. Applications read this to know what a version brings before
they take it; the git history is the long version, this is the one that fits in a pull-request
description.

## How versions work

Semantic Versioning, in its pre-1.0 reading:

- **0.x.y** — the component API is still moving. A `y` release only fixes; an `x` release may change
  behaviour or the API, and its entry says so. Nothing an application can see changes without a line
  in here.
- **1.0.0** — when the surface documented in [docs/components.md](docs/components.md) stops moving.

A release is one commit on `main` that bumps `package.json` and adds the entry below it, tagged
`vX.Y.Z`. A consumer pinned to a `file:` or git dependency can point at the tag and read exactly
what it contains. Entries are written for the application that has to react — including behaviour
that only shows up in an unusual host layout, because that is the kind of change that costs
downstream an afternoon.

## [Unreleased]

Nothing yet. Add entries here as work lands; they move under the next version when it is cut.

## [0.3.1] — 2026-10-02

Fixed:

- **A nested overlay now stacks above the overlay that opened it.** The stack
  assigned `z-index = layer token + position`, and the token is a fixed base, so
  a lower-numbered layer could never outrank a higher one: a select inside a
  dialog is a `dropdown` (1000) inside a `modal` (1200), and it painted *behind*
  the dialog — the listbox was open, hit-testing landed on the dialog, and the
  list could not be clicked at all. The token is now a **floor**: the z-index
  never decreases along the stack, which is what `topmost()`, Escape and
  outside-click routing already assumed. Layer bases, and therefore the visual
  order of unrelated surfaces, are unchanged. Applications that worked around
  this by raising `--jin-z-dropdown` above `--jin-z-modal` themselves can drop
  that override after upgrading.

- **Injection keys are now in the global symbol registry.** Every control
  reaches the shared overlay stack, theme controller, translation context and
  feedback stores through an `InjectionKey`, and a plain `Symbol('jin-overlay')`
  is unique per module evaluation. A host that loaded two copies of the library —
  a bundler pre-bundling one and serving the other from source, two versions in
  a monorepo, a micro-frontend — therefore had two keys that merely look alike:
  the plugin provided its controller under one, a component from the other copy
  looked up the second, missed, and silently fell back to a private one. Nothing
  threw; overlays stopped being layered (a select inside a dialog painted behind
  it and took no clicks), Escape stopped reaching the topmost overlay, and
  translations and theme reverted to the library defaults. The keys are
  `Symbol.for('jin.…')` now, which is one symbol in every copy. Applications are
  unaffected: `app.provide` is still per app, so two Vue apps on one page keep
  their own controllers.

## [0.3.0] — 2026-10-02

Changed:

- **`JinModal`: the corner close button now floats over the panel chrome** —
  top-left on Apple platforms (mirroring the system traffic lights, decided
  from the user agent and not mirroring with the document direction) and
  top-right elsewhere (inline end, mirrors in RTL). It previously flowed after
  the footer with no positioning at all, which read as a stray button below
  the dialog's own action row. Hosts that render their own close affordance
  keep `hideClose`; hosts that want the old flow position can override the
  new `position: absolute` on `.jin-modal__close` from their side.

Added:

- `core/platform.ts` — `closeButtonSide(userAgent)` decides that placement as
  a pure, tested decision.

## [0.2.1] — 2026-09-30

Fixed:

- Removed ten unused declarations (leftover imports, locals and an unexported
  positioning helper) that consumers' `noUnusedLocals` / `noUnusedParameters`
  flag when they typecheck the library through the `source` export condition.
  The library's own typecheck now runs with both flags set, so this class of
  drift cannot come back.

## [0.2.0] — 2026-09-30

Added:

- `JinContextMenu` now forwards the `#item` slot to its inner `JinMenu`, so hosts can render their
  own row content (hint glyphs, badges) in a pointer-anchored menu. Without the slot the rendering
  is byte-for-byte what it was — the fallback replicates JinMenu's default label span.

## [0.1.0] — 2026-09-29

First release.

`@bythid/jin` is a token-driven Vue 3 control library. Two ideas carry it: behaviour is plain
TypeScript that assumes no DOM and no Vue, so most of it is decidable without a browser; and the
style surface is one contract — `contracts/tokens.json`, 80 tokens under the `--jin-` prefix — that
every theme restates in full instead of inheriting values from another.

### Added

- **36 components** behind one entry point, `@bythid/jin`, alongside `JinUI` — the plugin that
  installs the theme controller, the translation bridge and the capability probes.
- **Nine styles, each with a light and a dark variant** (18 files under `themes/`): `jin` plus eight
  implemented from the [ui-ux-pro-max-skill](CREDITS.md) catalogue. Style and mode are two
  orthogonal axes set on `<html>` — `data-jin-style` and `data-jin-mode`.
- **Subpath exports** for the pieces an application composes itself:
  `@bythid/jin/styles.css` (the base stylesheet), `@bythid/jin/themes/*.css`,
  `@bythid/jin/contracts/*.json` (the token and string contracts), and `@bythid/jin/package.json`.
- **Overlays that share one stack**: dialogs, menus, selects, tooltips and popovers all measure
  inside `.jin-portal`, so escape reaches the topmost layer and closes one at a time; focus is
  trapped while open and returns to the trigger on close.
- **A translation bridge**: `app.use(JinUI, { t })` hands the library the application's translate
  function, and every string it renders — including "Close", "Expand all" and "No data" — comes from
  `contracts/strings.json` through it.

### What an application has to know

- `vue ^3.5` is the single peer dependency. The library never ships a copy of Vue; a second one is
  the most confusing failure this setup has.
- **The base stylesheet is an import the application writes**:
  `import '@bythid/jin/styles.css'`. It is deliberately not a side effect of importing the module,
  because a bundler can drop a stylesheet imported from inside a dependency — silently, with every
  control still rendering. When it is missing, the plugin warns once at install with the specifier
  to add.
- Style and mode are set on `<html>`, not on the component tree, and every theme defines the whole
  contract, so switching styles cannot leave a token undefined.
- `prefers-reduced-motion: reduce` zeroes every duration token except the mechanical animations
  (spinner, skeleton sweep).
