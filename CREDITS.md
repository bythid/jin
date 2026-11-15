# Credits and attribution

## Reference styles: nextlevelbuilder/ui-ux-pro-max-skill

The non-Jin themes in this library are implementations of style definitions from
[**nextlevelbuilder/ui-ux-pro-max-skill**](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
an AI design-intelligence skill that catalogues searchable UI styles alongside colour palettes,
font pairings and UX guidelines.

- **Repository:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Author:** Next Level Builder
- **License:** MIT — Copyright (c) 2024 Next Level Builder
- **What was taken:** the *style definitions* — the visual characteristics that make a named style
  recognisable. The catalogue is also where the token contract's requirement to cover shape, depth,
  texture and motion — not just colour — came from. Fourteen entries are implemented as themes:

  | Style | The characteristics that were implemented |
  | --- | --- |
  | **Minimalism & Swiss Style** | Monochrome page, a single red accent, zero radius, no shadow, hierarchy from type and alignment |
  | **Neumorphism** | One material, extruded and pressed: panels are the page's own colour, told apart by a light-and-shade pair of shadows and an inset shadow |
  | **Glassmorphism** | Translucent surfaces over a coloured ground, 1px light edge, backdrop blur, diagonal sheen instead of a drop shadow |
  | **Claymorphism** | Chunky pastel clay: 3px rims in a tint of the fill, 16–24px radii, matte gradient, solid thickness offset under a soft shadow |
  | **Flat Design** | Solid colour on solid colour, 1px lines, no gradient or shadow or blur, colour-shift transitions |
  | **Neubrutalism** | 3px black outlines, 5px hard offset shadows with no blur radius, poster palette, sharp corners |
  | **Brutalism** | Zero radius, no shadow, no motion, thick visible borders, flat colour |
  | **Dimensional Layering** | Soft depth through four elevation levels, generous radii, layered surfaces |
  | **Retro-Futurism** | Phosphor tube in a dark room: deep indigo ground, neon cyan at work, magenta held back for strong borders and the focus ring, CRT raster as the texture, one monospace voice, depth as glow |
  | **Aurora UI** | A flowing teal-violet-pink gradient across every panel, depth drawn by coloured glow, fine grain against gradient banding |
  | **E-Ink / Paper** | One achromatic scale on matte paper: the accent is ink itself, state colours step through grays, borders carry depth because paper casts no shadow, serif reading voice, linear refresh-like motion |
  | **Skeuomorphism** | A desk of real materials: layered realistic shadows, a brushed specular sheen, recessed wells with a light bottom edge, linen crosshatch texture, tooled-leather accent, steel focus ring, and the 300–500ms motion the token contract reserved for this style |
  | **Memphis Design** | 80s Milan paper collage: geometric confetti texture (triangle, circle, squiggle, tilted square), clashing pastels with hot pink at work, depth declared none outright, spring easing |
  | **Pixel Art** | An NES-family palette on console beige, dither-checker texture, hard block shadows with no blur, steps() frame-stepped motion, pixel face for titles, and the true NES yellow focus ring in dark mode |

  The first eight were selected on two conditions. They are styles the field treats as mainstream
  and the ones the catalogue itself references most often in its product and UX guidance; and they
  cover the contract's axes with as little overlap as possible — glass and dimensional layering are
  the only non-zero users of `--jin-blur`, neumorphism makes `--jin-shadow-inset` its primary
  visual, claymorphism of thick pastel rims. That overlap-free spread is what makes them worth
  having side by side. The second batch (`retro-futurism`, `aurora-ui`, `e-ink-paper`) keeps the
  same standard and opens the axes the first batch left untouched: a second, opposite texture;
  gradient as the main visual and coloured glow as depth; and the only achromatic palette. The
  third batch (`skeuomorphism`, `memphis-design`, `pixel-art`) takes the strongest of what remains:
  the style the contract itself reserved a duration window for, the geometric-pattern texture, and
  the only user of steps() easing — accepting two deliberate overlaps on pixel-art (zero radius
  with brutalism, hard offset with neubrutalism) in exchange for a texture, palette and motion
  voice nothing else has.

  The catalogue holds 89 entries, of which 51 are marked active (repository snapshots: 2026-09 at
  the first batch, 2026-11 at the second and third). The rest — including the whole mobile,
  dashboard and platform/system groups — are unimplemented; [docs/theming.md](docs/theming.md) §8
  explains why those groups are out of scope for a control library.

- **What is ours:** the token values, the CSS, and the mapping of each style onto this library's
  80-token contract. No stylesheet or asset from that repository is copied in.

### Why the styles are implemented rather than imported

That catalogue is a *skill*: it describes styles as guidance for a design or coding agent. It ships
no CSS that could be dropped in, and its styles are not written against this library's token
contract. So each style here is an independent implementation of the described characteristics —
which is also what makes them comparable side by side in the Gallery.

### Adding more styles

Any further style added to `themes/` is credited in the table above and must meet the same checks:
define all 80 contract tokens, pass `tools/check_tokens.py` and `tools/check_contrast.py`, and
contain no application vocabulary. [docs/theming.md](docs/theming.md) §8 carries the full list and
what each style exercises; `gallery/src/host/preferences.ts` (`AVAILABLE_STYLES`) is where a style
becomes selectable.

## Jin (锦)

The Jin theme — the library's own visual style and the default — is original work, not drawn from
that catalogue. Its specification is in [docs/theming.md](docs/theming.md).

## Dependencies

Runtime and build dependencies are credited through their own packages; the library ships none of
their code. The single peer dependency is Vue 3, consumed as an external.
