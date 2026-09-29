# Credits and attribution

## Reference styles: nextlevelbuilder/ui-ux-pro-max-skill

The non-Jin themes in this library are implementations of style definitions from
[**nextlevelbuilder/ui-ux-pro-max-skill**](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
an AI design-intelligence skill that catalogues searchable UI styles alongside colour palettes,
font pairings and UX guidelines.

- **Repository:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- **Author:** Next Level Builder
- **License:** MIT — Copyright (c) 2024 Next Level Builder
- **What we took:** the *style definitions* — the visual characteristics that make a named style
  recognisable. The catalogue is where the token contract's requirement to cover shape, depth,
  texture and motion — not just colour — came from. Eight entries are implemented as themes:

  | Style | The characteristics we implemented |
  | --- | --- |
  | **Minimalism & Swiss Style** | Monochrome page, one red as the only colour, zero radius, no shadow, hierarchy from type and alignment |
  | **Neumorphism** | One material, extruded and pressed: panels are the page's own colour, told apart by a light-and-shade pair of shadows and an inset shadow |
  | **Glassmorphism** | Translucent surfaces over a coloured ground, 1px light edge, backdrop blur, diagonal sheen instead of a drop shadow |
  | **Claymorphism** | Chunky pastel clay: 3px rims in a tint of the fill, 16–24px radii, matte gradient, solid thickness offset under a soft shadow |
  | **Flat Design** | Solid colour on solid colour, 1px lines, no gradient or shadow or blur, colour-shift transitions |
  | **Neubrutalism** | 3px black outlines, 5px hard offset shadows with no blur radius, poster palette, sharp corners |
  | **Brutalism** | Zero radius, no shadow, no motion, thick visible borders, flat colour |
  | **Dimensional Layering** | Soft depth through four elevation levels, generous radii, layered surfaces |

  The eight were not picked at random: they are the styles the field treats as mainstream, and the
  ones the catalogue itself references most often in its own product and UX guidance. In this
  library's terms they also happen to cover the contract's axes with as little overlap as possible —
  glass is the only user of `--jin-blur`, neumorphism of `--jin-shadow-inset`, claymorphism of thick
  pastel rims — which is what makes them worth having side by side.

  The catalogue holds 88 entries, of which 50 are marked active. The rest — including the whole
  mobile, dashboard and platform/system groups — are unimplemented; the section below says what a
  further one has to satisfy.

- **What is ours:** the token values, the CSS, and the translation of each style onto this library's
  80-token contract. No stylesheet or asset from that repository is copied in.

### Why the styles are implemented rather than imported

That catalogue is a *skill*: it describes styles as guidance for a design or coding agent. It ships
no CSS that could be dropped in, and its styles are not written against this library's token
contract. So each style here is an independent implementation of the described characteristics,
which is also what makes them comparable side by side in the Gallery.

### Adding more styles

The catalogue is much larger than eight entries. Any further style added to `themes/` should be
credited here in the same table, and should keep the same obligations: define all 80 contract
tokens, pass `tools/check_tokens.py` and `tools/check_contrast.py`, and make no reference to an
application. [docs/theming.md](docs/theming.md) carries the full list with each style's identity,
and `gallery/src/host/preferences.ts` is where a style becomes selectable.

## Jin (锦)

The Jin theme — the library's own visual identity and default — is original work, not drawn from
that catalogue. Its specification is in [docs/theming.md](docs/theming.md).

## Dependencies

Runtime and build dependencies are credited through their own packages; the library ships none of
their code. The single peer dependency is Vue 3, consumed as an external.
