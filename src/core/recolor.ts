/**
 * Hue re-anchoring for theme colour tokens.
 *
 * A theme's internal harmony is relative structure — a lightness ladder, a
 * saturation discipline, paired contrast targets — and none of that survives
 * arbitrary per-token edits. So the only axis opened here is hue: every
 * colour-bearing token value is rotated by the same delta in OKLCH, with
 * lightness and chroma held, and the result is clamped back to WCAG AA. The
 * user picks where the family sits on the hue wheel; the theme keeps its
 * relationships.
 *
 * Pure decisions only: no Vue, no DOM. The caller supplies the current token
 * values (typically read off <html> via getComputedStyle) and receives the
 * override map to write back.
 */

/** Tokens whose colour follows the theme hue. Names mirror contracts/tokens.json. */
export const RECOLOR_COLOR_TOKENS: readonly string[] = [
  '--jin-bg',
  '--jin-surface',
  '--jin-surface-raised',
  '--jin-surface-sunken',
  '--jin-surface-translucent',
  '--jin-scrim',
  '--jin-text',
  '--jin-text-muted',
  '--jin-text-subtle',
  '--jin-text-on-accent',
  '--jin-border-color',
  '--jin-border-color-strong',
  '--jin-accent',
  '--jin-accent-hover',
  '--jin-accent-active',
  '--jin-focus-ring-color',
  '--jin-elevation-1',
  '--jin-elevation-2',
  '--jin-elevation-3',
  '--jin-elevation-4',
  '--jin-shadow-inset',
  '--jin-surface-gradient',
  '--jin-surface-texture',
]

/**
 * Semantic state colours never rotate: a red danger must stay red whatever
 * the accent becomes. Their tints sit on the rotated ground, so their pairs
 * are re-measured and reported rather than fixed.
 */
export const RECOLOR_EXEMPT_TOKENS: readonly string[] = [
  '--jin-danger',
  '--jin-danger-text',
  '--jin-danger-bg',
  '--jin-warning',
  '--jin-warning-text',
  '--jin-warning-bg',
  '--jin-success',
  '--jin-success-text',
  '--jin-success-bg',
  '--jin-info',
  '--jin-info-text',
  '--jin-info-bg',
]

/** Scope when a style only recolors its accent family, not the whole ground. */
const ACCENT_ONLY_TOKENS: readonly string[] = [
  '--jin-accent',
  '--jin-accent-hover',
  '--jin-accent-active',
  '--jin-text-on-accent',
  '--jin-focus-ring-color',
]

export type RecolorParticipation = 'full' | 'accent-only' | 'none'

/**
 * Per-style participation. Most styles rotate as a family; the exceptions
 * are identities that hue rotation would erase:
 * - e-ink-paper is the one achromatic style — its accent IS ink — so nothing rotates.
 * - pixel-art's NES-family palette and console-beige ground are the identity, so only
 *   the accent family moves.
 */
export const RECOLOR_PARTICIPATION: Record<string, RecolorParticipation> = {
  'e-ink-paper': 'none',
  'pixel-art': 'accent-only',
}

export function participationFor(style: string): RecolorParticipation {
  return RECOLOR_PARTICIPATION[style] ?? 'full'
}

function scopeFor(participation: RecolorParticipation): readonly string[] {
  if (participation === 'none') return []
  if (participation === 'accent-only') return ACCENT_ONLY_TOKENS
  return RECOLOR_COLOR_TOKENS
}

/**
 * Below this OKLCH chroma a colour is treated as neutral and left untouched.
 * The floor only exists because rotating a pure gray is meaningless (chroma 0
 * has no hue to move); a faint tint — jin's near-neutral ground sits around
 * 0.016 — must still follow the re-anchored hue, or the largest surface on
 * the page ignores the one axis the user can move.
 */
const CHROMA_FLOOR = 0.004

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

export interface Oklch {
  l: number
  c: number
  h: number
}

export function parseColor(value: string): Rgba | null {
  const trimmed = value.trim()
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed)
  if (hex?.[1]) {
    const body = hex[1]
    const full = body.length === 3 ? body.replace(/./g, '$&$&') : body
    return {
      r: parseInt(full.slice(0, 2), 16) / 255,
      g: parseInt(full.slice(2, 4), 16) / 255,
      b: parseInt(full.slice(4, 6), 16) / 255,
      a: 1,
    }
  }
  const fn = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(trimmed)
  if (fn) {
    return {
      r: Number(fn[1]) / 255,
      g: Number(fn[2]) / 255,
      b: Number(fn[3]) / 255,
      a: fn[4] === undefined ? 1 : Number(fn[4]),
    }
  }
  return null
}

function toHexByte(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v * 255)))
    .toString(16)
    .padStart(2, '0')
}

function toByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v * 255)))
}

export function formatRgba(color: Rgba): string {
  const r = toHexByte(color.r)
  const g = toHexByte(color.g)
  const b = toHexByte(color.b)
  if (color.a >= 1) return `#${r}${g}${b}`
  return `rgba(${toByte(color.r)}, ${toByte(color.g)}, ${toByte(color.b)}, ${Number(color.a.toFixed(3))})`
}

function linearize(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function delinearize(v: number): number {
  return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}

function cbrt(v: number): number {
  return Math.cbrt(v)
}

export function srgbToOklch(color: Rgba): Oklch {
  const r = linearize(color.r)
  const g = linearize(color.g)
  const b = linearize(color.b)
  const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI }
}

function oklchToLinearSrgb(lch: Oklch): [number, number, number] {
  const rad = (lch.h * Math.PI) / 180
  const a = lch.c * Math.cos(rad)
  const b = lch.c * Math.sin(rad)
  const l_ = lch.l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = lch.l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = lch.l - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const GAMUT_EPSILON = 1e-6

function inLinearGamut(linear: [number, number, number]): boolean {
  return linear.every((v) => v >= -GAMUT_EPSILON && v <= 1 + GAMUT_EPSILON)
}

/**
 * Reduce chroma until the colour fits sRGB (few bisection steps; hues far
 * from the original family — a neon cyan rotated toward red — need this).
 */
function fitToGamut(lch: Oklch): Oklch {
  if (inLinearGamut(oklchToLinearSrgb(lch))) return lch
  let low = 0
  let high = lch.c
  for (let i = 0; i < 12; i += 1) {
    const mid = (low + high) / 2
    if (inLinearGamut(oklchToLinearSrgb({ ...lch, c: mid }))) low = mid
    else high = mid
  }
  return { ...lch, c: low }
}

/**
 * Rotate one colour by `delta` degrees. Lightness and chroma are held, so
 * every contrast relationship in the theme survives the move; neutral
 * colours (chroma under the floor) pass through untouched.
 */
export function rotateColor(value: string, delta: number): string | null {
  const color = parseColor(value)
  if (!color) return null
  const lch = srgbToOklch(color)
  if (lch.c < CHROMA_FLOOR) return null
  const rotated = fitToGamut({ ...lch, h: lch.h + delta })
  return formatRgba({
    r: delinearize(oklchToLinearSrgb(rotated)[0]),
    g: delinearize(oklchToLinearSrgb(rotated)[1]),
    b: delinearize(oklchToLinearSrgb(rotated)[2]),
    a: color.a,
  })
}

const COLOR_LITERAL =
  /(?:%23|#)([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)/g

/**
 * Rotate every colour literal inside a token *value* — flat colours, the
 * rgba() stops inside gradients and box-shadows, and the %23-encoded hex
 * inside a texture's SVG data URI. Non-colour text (offsets, radii, paths)
 * passes through untouched; `none` and unparseable input return as-is.
 */
export function rotateTokenValue(value: string, delta: number): string {
  if (!value || value === 'none') return value
  return value.replace(COLOR_LITERAL, (match) => {
    const encoded = match.startsWith('%23')
    const rotated = rotateColor(encoded ? `#${match.slice(3)}` : match, delta)
    if (!rotated) return match
    if (encoded) return `%23${rotated.slice(1)}`
    return rotated
  })
}

/** Hue of any colour in degrees 0–360, or null for neutrals and unparseable input. */
export function hueOfColor(value: string): number | null {
  const color = parseColor(value)
  if (!color) return null
  const lch = srgbToOklch(color)
  if (lch.c < CHROMA_FLOOR) return null
  return Math.round(((lch.h % 360) + 360) % 360)
}

function relativeLuminance(color: Rgba): number {
  const r = linearize(color.r)
  const g = linearize(color.g)
  const b = linearize(color.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Composite a (possibly translucent) foreground over an opaque background. */
function composite(fg: Rgba, bg: Rgba): Rgba {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  }
}

export function contrastRatio(fg: string, bg: string): number | null {
  const a = parseColor(fg)
  const b = parseColor(bg)
  if (!a || !b) return null
  const front = a.a >= 1 ? a : composite(a, b)
  const la = relativeLuminance(front)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export interface RecolorPairResult {
  token: string
  against: string
  ratio: number
  pass: boolean
}

export interface RecolorValidation {
  pairs: RecolorPairResult[]
  /** Semantic pairs the rotation cannot repair — reported, never silently fixed. */
  warnings: string[]
}

export interface RecolorResult {
  overrides: Record<string, string>
  validation: RecolorValidation
}

const SURFACE_TOKENS = ['--jin-bg', '--jin-surface', '--jin-surface-raised', '--jin-surface-sunken'] as const
const TEXT_TOKENS = ['--jin-text', '--jin-text-muted', '--jin-text-subtle'] as const
const ACCENT_STATES = ['--jin-accent', '--jin-accent-hover', '--jin-accent-active'] as const

const AA_TEXT = 4.5
const AA_FOCUS = 3.0
const LIGHTNESS_STEP = 0.03
const MAX_LIGHTNESS_STEPS = 24

function toStringColor(lch: Oklch, alpha: number): string {
  const linear = oklchToLinearSrgb(lch)
  return formatRgba({
    r: delinearize(linear[0]),
    g: delinearize(linear[1]),
    b: delinearize(linear[2]),
    a: alpha,
  })
}

/**
 * Move one token's lightness away from the surfaces it must read against
 * until every pair clears its threshold. Deterministic: fixed step, fixed
 * budget, and the direction is chosen once from the first failing pair.
 */
function clampAgainst(
  map: Record<string, string>,
  token: string,
  against: readonly string[],
  threshold: number,
): void {
  for (let step = 0; step < MAX_LIGHTNESS_STEPS; step += 1) {
    const value = map[token]
    if (!value) return
    const failing = against.filter((bgToken) => {
      const bg = map[bgToken]
      if (bg === undefined) return false
      const ratio = contrastRatio(value, bg)
      return ratio === null || ratio < threshold
    })
    if (failing.length === 0) return
    const first = failing[0]
    const fg = parseColor(value)
    const bg = first === undefined ? null : parseColor(map[first] ?? '')
    if (!fg || !bg) return
    const lch = srgbToOklch(fg)
    const surface = srgbToOklch(bg)
    if (Math.abs(lch.l - surface.l) < LIGHTNESS_STEP) return
    const direction = lch.l > surface.l ? 1 : -1
    const next = { ...lch, l: Math.max(0, Math.min(1, lch.l + direction * LIGHTNESS_STEP)) }
    map[token] = toStringColor(next, fg.a)
  }
}

/**
 * Compute the override map that re-anchors `base`'s colour family onto
 * `hue`. The anchor is what the user sees most among the tokens that move:
 * the ground for full participation (the page's largest surface lands exactly
 * on the picked hue, and the accent rides the same delta into wherever the
 * theme's hue architecture puts it), the accent itself when only the accent
 * family rotates. A neutral ground has no hue to anchor on — brutalism's pure
 * black — and falls back to the accent, so those themes still answer the
 * picker. Returns only the values that actually changed; the validation
 * re-measures the AA pairs over the rotated family and clamps lightness
 * where the rotation alone missed a threshold.
 */
export function computeRecolor(
  base: Record<string, string>,
  hue: number,
  participation: RecolorParticipation,
): RecolorResult {
  const empty: RecolorResult = { overrides: {}, validation: { pairs: [], warnings: [] } }
  const scope = scopeFor(participation)
  const anchorToken = participation === 'accent-only' ? '--jin-accent' : '--jin-bg'
  const anchor =
    hueOfColor(base[anchorToken] ?? '') ?? hueOfColor(base['--jin-accent'] ?? '')
  if (scope.length === 0 || anchor === null) return empty

  const delta = ((hue - anchor + 540) % 360) - 180

  const map: Record<string, string> = { ...base }
  const overrides: Record<string, string> = {}
  for (const token of scope) {
    const value = base[token]
    if (!value) continue
    const rotated = rotateTokenValue(value, delta)
    if (rotated !== value) {
      overrides[token] = rotated
      map[token] = rotated
    }
  }

  // The rotation holds lightness, so most pairs keep their ratio; the clamp
  // only moves the tokens the rotation owns when a pair still misses AA.
  const clampTargets: Array<[string, readonly string[], number]> = []
  for (const token of TEXT_TOKENS) {
    if (scope.includes(token)) clampTargets.push([token, SURFACE_TOKENS, AA_TEXT])
  }
  if (scope.includes('--jin-text-on-accent')) {
    clampTargets.push(['--jin-text-on-accent', ACCENT_STATES, AA_TEXT])
  }
  if (scope.includes('--jin-focus-ring-color')) {
    clampTargets.push(['--jin-focus-ring-color', SURFACE_TOKENS, AA_FOCUS])
  }
  for (const [token, against, threshold] of clampTargets) {
    if (!map[token]) continue
    clampAgainst(map, token, against, threshold)
    if (map[token] !== base[token]) overrides[token] = map[token]
  }

  // Semantic families did not move, but their backdrop did: re-measure and
  // report what the rotation cannot repair.
  const warnings: string[] = []
  const families: Array<[string, string, string]> = [
    ['--jin-danger', '--jin-danger-text', '--jin-danger-bg'],
    ['--jin-warning', '--jin-warning-text', '--jin-warning-bg'],
    ['--jin-success', '--jin-success-text', '--jin-success-bg'],
    ['--jin-info', '--jin-info-text', '--jin-info-bg'],
  ]
  const raised = map['--jin-surface-raised'] ?? ''
  for (const [fill, text, tint] of families) {
    const textValue = map[text]
    if (!base[tint] || !textValue) continue
    // A translucent tint reads against the ground it sits on, so composite
    // it before measuring the text pair (same rule as tools/check_contrast.py).
    const tintColor = parseColor(base[tint])
    const ground = raised ? parseColor(raised) : null
    const effective =
      tintColor && ground && tintColor.a < 1 ? formatRgba(composite(tintColor, ground)) : base[tint]
    const ratio = contrastRatio(textValue, effective)
    if (ratio !== null && ratio < AA_TEXT) {
      warnings.push(`${text} on ${tint} over the rotated ground reads ${ratio.toFixed(2)}:1, below ${AA_TEXT}:1`)
    }
    if (base[fill]) {
      const fillRatio = contrastRatio(base[fill], raised)
      if (fillRatio !== null && fillRatio < AA_FOCUS) {
        warnings.push(`${fill} on the rotated surface reads ${fillRatio.toFixed(2)}:1, below ${AA_FOCUS}:1`)
      }
    }
  }

  const pairs: RecolorPairResult[] = []
  for (const token of TEXT_TOKENS) {
    const fg = map[token]
    if (!fg) continue
    for (const surface of SURFACE_TOKENS) {
      const bg = map[surface]
      if (!bg) continue
      const ratio = contrastRatio(fg, bg)
      if (ratio === null) continue
      pairs.push({ token, against: surface, ratio, pass: ratio >= AA_TEXT })
    }
  }
  const onAccent = map['--jin-text-on-accent']
  if (onAccent) {
    for (const state of ACCENT_STATES) {
      const bg = map[state]
      if (!bg) continue
      const ratio = contrastRatio(onAccent, bg)
      if (ratio === null) continue
      pairs.push({ token: '--jin-text-on-accent', against: state, ratio, pass: ratio >= AA_TEXT })
    }
  }
  const focus = map['--jin-focus-ring-color']
  if (focus) {
    for (const surface of SURFACE_TOKENS) {
      const bg = map[surface]
      if (!bg) continue
      const ratio = contrastRatio(focus, bg)
      if (ratio === null) continue
      pairs.push({ token: '--jin-focus-ring-color', against: surface, ratio, pass: ratio >= AA_FOCUS })
    }
  }

  return { overrides, validation: { pairs, warnings } }
}
