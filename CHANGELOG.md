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
