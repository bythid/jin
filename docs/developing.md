# Developing in this repository

Repository maintenance: commands, the automated checks, the Gallery, packaging, and publishing.
Library usage is in the [README](../README.md) and [consuming.md](consuming.md); why the library is
shaped the way it is is in [architecture.md](architecture.md) (internal design documents, not
needed to use the library).

---

## Getting a clone working

```bash
pnpm install    # also builds dist/ once, via the package's own `prepare` script
pnpm run hooks  # one time per clone: installs the Git hooks (pre-commit, commit-msg)
```

`pre-commit` runs the token checker; `commit-msg` runs commitlint against the
`type(scope): summary` convention (`commitlint.config.mjs`, the standard conventional types).
The hook definitions live in `.husky/` and are installed only by `pnpm run hooks` — deliberately not
by `prepare`, because `prepare` also runs when the library is installed as a git dependency, and
writing Git hooks into a consumer's checkout is wrong.

## Commands

```bash
pnpm run test          # vitest: pure-logic tests run in node, component tests opt into jsdom
pnpm run test:coverage # the same, with a coverage floor on src/core (80% lines/functions/statements, 70% branches)
pnpm run check         # the six style checks, then the contrast audit
pnpm run check:tokens  # tools/check_tokens.py alone
pnpm run check:contrast  # tools/check_contrast.py alone
pnpm run typecheck     # vue-tsc --noEmit, with unused-locals flags set
pnpm run build         # dist/: ESM bundle + one bundled index.d.ts + source maps
pnpm run check:pack    # publint + arethetypeswrong against the real tarball
pnpm run verify        # check, test, typecheck and check:pack, in order
pnpm run smoke         # packs the library and builds a fresh consumer against the tarball
```

`verify` is the definition of done for any change; CI runs it on every push to `main` and every
pull request (`.github/workflows/ci.yml`).

`smoke` answers one question: does the tarball work for a consumer the repository knows nothing
about? It builds the library, packs it, extracts the tarball into a scratch project's
`node_modules` as a real directory (not a symlink), and builds that project with a Vite config that
has no aliases, no `source` condition and no `*.vue` shim. It asserts that the files the `exports`
map points at are actually inside the tarball — `dist/index.d.ts`, `styles.css.d.ts`, both
`contracts/*.json` — that the bundled stylesheet is importable, and that the shipped declarations
type-check under the consumer's `tsconfig.json`. A lying `exports` map, a `files` list that drops
something the map points at, or an unresolvable declaration specifier fails it with the reason. The
scratch project is left in place when a step fails, because that is when it is worth reading.

---

## The automated checks

`tools/check_tokens.py` enforces six rules, and prints the offending file and line for each:

1. **Token completeness** — every theme file defines every token in `contracts/tokens.json`.
2. **No hardcoded values** — no hex colours, px radii, literal box-shadows, durations or font-size
   literals outside the theme layer.
3. **No business words** — the library source (comments included) contains none of the blacklisted
   business vocabulary.
4. **One-way dependency** — no library file imports application code.
5. **Naming discipline** — `jin-*` classes, `Jin*` components, `data-jin-*` attributes, and no
   global element selectors in the base stylesheet.
6. **Stylesheet marker agreement** — the custom property the plugin reads at startup
   (`--jin-stylesheet-loaded`) is exactly the one `src/styles/jin.css` declares. The contract lives
   in two files that neither can state on its own, so the checker owns it.

The whitelists these checks need (structural numbers, and the fixed durations of the two loading
animations) are written out explicitly in the script, so relaxing a rule is a visible, reviewable
change rather than a quiet regex edit.

Rule 3 accepts a private vocabulary file:

```bash
cp tools/check_tokens.local.json.example tools/check_tokens.local.json
# then add the nouns of your application
```

The copy is gitignored, so it never ships with the library. Without it the generic word list still
runs, and a fresh clone behaves the same.

`tools/check_contrast.py` audits every theme separately, measuring text and focus colours against
the surfaces they actually sit on, and failing below 4.5:1 (body, muted, and hint text; accent
fills; strings on status tints) or 3:1 (focus rings, status icons). Translucent colours are
composited onto their real background before measuring — comparing the raw `rgba()` triple reports
failures that do not exist and misses ones that do — and the accent fills are judged by the text
that sits on top of them (`--jin-text-on-accent`), not against the page.

---

## The Gallery

The Gallery (`gallery/`) is the demo application and the browser-side checkpoint. jsdom measures no
layout, so nothing in a test can catch an overlay painted off-screen: portal, positioning and theme
changes have to be seen in the real thing. `tests/portal.spec.ts` pins the portal's stylesheet rule
at the source level only.

Two launchers, one surface each:

```bash
python start_gallery_web.py              # the browser page, at http://localhost:5180
python start_gallery_web.py --build      # production build, then serve it
python start_gallery_web.py --port 5300  # a different port
python start_gallery_web.py --no-browser # don't open a window

python start_gallery_desktop.py          # the Tauri desktop shell (a real window),
                                         # rebuilding first when the exe is stale
python start_gallery_desktop.py --rebuild  # force a release rebuild, then start
python start_gallery_desktop.py --dev    # tauri dev with hot reload — for working on
                                         # the shell, not for verifying it
```

`pnpm run gallery:web` / `gallery:web:build` / `gallery:desktop` / `gallery:desktop:dev` map onto
these calls one to one.

Both launchers do three things a bare `pnpm run dev` does not:

- they check the prerequisites first and say which one is missing;
- the web launcher reuses a Gallery already running on the port (it just opens the browser), and
  moves to a free port when something unrelated holds the one asked for;
- both kill the whole process tree on Ctrl+C. `pnpm` spawns `node`, which spawns `vite`; stopping
  only the parent leaves an orphan holding the port, and the next start fails with "port already in
  use".

The desktop launcher rebuilds before launching by default because `tauri build` embeds the built
frontend into the binary: the exe is stale the moment any source file changes. A shell that quietly
shows yesterday's CSS is the trap; timestamps are compared first, and on machines where antivirus
kills cargo's subprocess trees, starting the already-built exe is the reliable path.

### How the Gallery consumes the library

The Gallery depends on the library through `"@bythid/jin": "file:.."`, so it follows exactly the
integration path [consuming.md](consuming.md) documents: `conditions: ['source']`, `dedupe:
['vue']`, `server.fs.allow`, and `optimizeDeps.exclude` of the library (pre-bundling a linked
dependency loads it twice — once pre-bundled, once from source — which means two of every
module-level symbol and a private overlay stack per component).

One gotcha is pnpm's own: a `file:` dependency is hard-linked, which links the *inode*. Editing a
file in place is live in the Gallery, but a tool that writes a new file over the old one — most
editors and patch tools — leaves the link pointing at stale content, and an added or deleted file
needs a reinstall either way. `pnpm install --force` inside `gallery/` refreshes the link.

### The Gallery is bilingual

The header switcher has three axes — style, mode, language — plus a token panel. The style
switcher carries a one-line description per style; the token panel shows every contract token's
actual value in the current style, marking an undefined one `(missing — fallback in use)` — the
visible proof of theme completeness.

Language exercises the documented integration path: `gallery/src/main.ts` passes the Gallery's
translator to `app.use(JinUI, { t })`. English is the source language and falls through to the
library's own defaults, so an English reader sees exactly what a consumer who passes no `t` sees;
Simplified Chinese is the worked example — switching to it translates the whole application,
including every "Close", "Expand all" and "No data" the library announces.

The dictionaries live in `gallery/src/i18n/`: `locales/en.ts` is both the English copy and the key
space, `locales/zh.ts` is typed against it — adding a string without its translation fails the
Gallery typecheck — and `library.ts` covers the keys `contracts/strings.json` declares. `tests/gallery-i18n.spec.ts`
guards the dictionaries against the pages that use them. Persistence is in
`gallery/src/host/preferences.ts` under `jin-gallery.style`, `jin-gallery.mode` and
`jin-gallery.locale`; a first visit follows `navigator.language`, and `<html lang>` follows the
choice so the font stack and a screen reader's pronunciation do too. A third language is one file
plus one entry in `LOCALES`.

---

## Packaging

What an application resolves comes from `exports` in `package.json`, and each entry has two answers
— the built one, and the `source` one a linked checkout asks for:

| Specifier | From the registry / a tarball | With `conditions: ['source']` |
| --- | --- | --- |
| `@bythid/jin` | `dist/jin.js` + `dist/index.d.ts` | `src/index.ts` — with `customConditions: ['source']` in the consumer's `tsconfig.json`, editors follow too |
| `@bythid/jin/styles.css` | `src/styles/jin.css` | `src/styles/jin.css` |
| `@bythid/jin/themes/*.css` | `themes/*.css` | `themes/*.css` |
| `@bythid/jin/contracts/*.json` | `contracts/*.json` | `contracts/*.json` |

The stylesheet ships as written rather than pre-built: the consumer's bundler minifies it either
way, and one file that is identical in both resolution modes cannot drift from itself.

`npm pack` includes `dist/` (ESM, source maps, and `index.d.ts`), `src/` (the stylesheet and the
sources the maps point at), `themes/`, `contracts/`, `styles.css.d.ts`, the README, CREDITS, the
CHANGELOG and the licence. The declarations are bundled into the single `index.d.ts` by
vite-plugin-dts's `bundleTypes` (which runs api-extractor), because the per-module declaration tree
uses extensionless relative imports that Node16 type resolution refuses — arethetypeswrong reported
one failure per import before the bundling. One file has no relative imports at all, and the
library has one entry point.

`pnpm run check:pack` audits the publish surface: publint validates `exports` and `files`, and
arethetypeswrong type-resolves every entry point under node10, node16 and bundler resolution
against the real tarball. One rule is ignored on purpose — `cjs-resolves-to-esm`: the package is
ESM-only by design, so a `require()` that resolves to ESM is expected, not a defect.

## Publishing

The package is live on npm as **`@bythid/jin`**. The name is scoped because npm never recycles
names: `jin` has been taken since 2012 and `jin-ui` since 2022 by an unrelated uni-app component
library. `publishConfig.access` is `public`, because a scoped package defaults to private.

The repository is GitHub `bythid/jin` (`origin`); CI, Dependabot and publishing run there, and
issues and pull requests are filed there — there is no second copy to keep in sync. `main` and
`v*` tags are guarded by rulesets (Settings → Rules): the rulesets refuse force pushes, tag
moves, and any change to `main` that did not arrive as a pull request whose `verify` check passed —
except for accounts on the bypass list, which the release flow below needs.

Cutting a release:

1. One commit on `main` that bumps `version` in `package.json` and adds the CHANGELOG entry under
   the new version's heading. Entries are written for the application that has to react, not for
   the commit history.
2. Tag it: `git tag vX.Y.Z && git push origin vX.Y.Z`. The tag triggers
   `.github/workflows/publish.yml`.
3. The workflow installs Node 22 and an npm at least 11.15.0 explicitly — Node 22's bundled npm
   (10.9.x) can do neither trusted publishing (needs ≥ 11.5.1) nor staged publishing (needs
   ≥ 11.15.0), so a tag-triggered publish would otherwise fail with no working authentication
   path. It then runs `npm stage publish`: `prepublishOnly` executes `pnpm run verify && pnpm run
   smoke` first, so no release can skip them, and the workflow cannot.
4. The version lands in npm's **staged-publishing queue**, not on the registry. The trusted
   publisher is configured (on npmjs.com: this repository, `publish.yml`, staged publishing only)
   so the workflow has no npm token — provenance rides on the OIDC token, and a compromised action
   inside the workflow can reach the queue but never the consumers. A maintainer reviews and
   releases from a trusted device:

   ```bash
   npm stage list @bythid/jin      # find the stage id
   npm stage view <stage-id>       # inspect what was uploaded
   npm stage approve <stage-id>    # passes a 2FA challenge; only then does the version go live
   ```

   The same queue is visible on the package page at npmjs.com.

Version policy — what `x` and `y` may change — is in the "How versions work" section of
[CHANGELOG.md](../CHANGELOG.md).
