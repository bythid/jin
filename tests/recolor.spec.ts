import { describe, expect, it } from 'vitest'
import {
  RECOLOR_COLOR_TOKENS,
  RECOLOR_EXEMPT_TOKENS,
  RECOLOR_PARTICIPATION,
  computeRecolor,
  contrastRatio,
  hueOfColor,
  participationFor,
  parseColor,
  rotateColor,
  rotateTokenValue,
  srgbToOklch,
} from '../src/core/recolor'

/** A compact stand-in for a dark theme's colour tokens (claymorphism.dark values). */
const BASE: Record<string, string> = {
  '--jin-bg': '#131b28',
  '--jin-surface': '#182334',
  '--jin-surface-raised': '#1f2c40',
  '--jin-surface-sunken': '#0e1520',
  '--jin-surface-translucent': '#1f2c40',
  '--jin-scrim': 'rgba(8, 12, 22, 0.68)',
  '--jin-text': '#e8effa',
  '--jin-text-muted': '#b3c2d9',
  '--jin-text-subtle': '#92a5bd',
  '--jin-text-on-accent': '#0d2135',
  '--jin-border-color': '#2c3d58',
  '--jin-border-color-strong': '#48618a',
  '--jin-accent': '#82c7ee',
  '--jin-accent-hover': '#9ad6f4',
  '--jin-accent-active': '#66b4dd',
  '--jin-focus-ring-color': '#82c7ee',
  '--jin-elevation-1': '0 3px 0 rgba(0, 0, 0, 0.35), 0 8px 18px rgba(0, 0, 0, 0.4)',
  '--jin-surface-gradient':
    'linear-gradient(160deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.14) 100%)',
  '--jin-surface-texture': 'none',
  // semantic families, exempt from rotation
  '--jin-danger': '#ff8fa6',
  '--jin-danger-text': '#ffaabc',
  '--jin-danger-bg': '#3a1a2a',
  '--jin-warning': '#ffc078',
  '--jin-warning-text': '#ffd39b',
  '--jin-warning-bg': '#38280f',
  '--jin-success': '#6ee0ac',
  '--jin-success-text': '#9cebc4',
  '--jin-success-bg': '#14352a',
  '--jin-info': '#67d0e2',
  '--jin-info-text': '#8fdcea',
  '--jin-info-bg': '#10333e',
}

describe('parseColor', () => {
  it('reads six-digit hex', () => {
    expect(parseColor('#82c7ee')).toEqual({ r: 0x82 / 255, g: 0xc7 / 255, b: 0xee / 255, a: 1 })
  })
  it('reads three-digit hex', () => {
    expect(parseColor('#abc')).toEqual({ r: 0xaa / 255, g: 0xbb / 255, b: 0xcc / 255, a: 1 })
  })
  it('reads rgb() and rgba() with alpha', () => {
    expect(parseColor('rgb(8, 12, 22)')).toEqual({ r: 8 / 255, g: 12 / 255, b: 22 / 255, a: 1 })
    const rgba = parseColor('rgba(8, 12, 22, 0.68)')
    expect(rgba?.a).toBe(0.68)
  })
  it('rejects non-colours', () => {
    expect(parseColor('none')).toBeNull()
    expect(parseColor('1px solid')).toBeNull()
    expect(parseColor('')).toBeNull()
  })
})

describe('srgbToOklch and hueOfColor', () => {
  it('places the canonical families on their expected hue ranges', () => {
    expect(hueOfColor('#ff0000')).toBeGreaterThan(20)
    expect(hueOfColor('#ff0000')).toBeLessThan(35)
    expect(hueOfColor('#00ff00')).toBeGreaterThan(135)
    expect(hueOfColor('#00ff00')).toBeLessThan(150)
    expect(hueOfColor('#0000ff')).toBeGreaterThan(255)
    expect(hueOfColor('#0000ff')).toBeLessThan(275)
  })
  it('returns null for neutrals and garbage', () => {
    expect(hueOfColor('#111111')).toBeNull()
    expect(hueOfColor('#ffffff')).toBeNull()
    expect(hueOfColor('not-a-color')).toBeNull()
  })
})

describe('rotateColor', () => {
  it('holds lightness and chroma across the rotation', () => {
    const before = srgbToOklch(parseColor('#82c7ee')!)
    const rotated = rotateColor('#82c7ee', 137)
    expect(rotated).toBeTypeOf('string')
    const after = srgbToOklch(parseColor(rotated!)!)
    expect(Math.abs(after.l - before.l)).toBeLessThan(0.01)
    expect(Math.abs(after.c - before.c)).toBeLessThan(0.01)
  })
  it('moves the hue to the requested family', () => {
    const rotated = rotateColor('#f45c9e', 180)!
    const expected = (hueOfColor('#f45c9e')! + 180) % 360
    const actual = hueOfColor(rotated)!
    expect(Math.abs(((actual - expected + 540) % 360) - 180)).toBeLessThan(4)
  })
  it('leaves neutrals untouched', () => {
    expect(rotateColor('#111111', 90)).toBeNull()
    expect(rotateColor('#ffffff', 90)).toBeNull()
  })
  it('lets faint tints follow the rotation', () => {
    // jin.dark's ground: chroma ~0.016 — near-neutral, but not neutral.
    expect(rotateColor('#12171d', 120)).not.toBeNull()
  })
  it('preserves alpha', () => {
    const rotated = rotateColor('rgba(63, 217, 197, 0.09)', 90)!
    expect(rotated).toContain('0.09')
    expect(rotated.startsWith('rgba(')).toBe(true)
  })
  it('keeps out-of-gamut results convertible (neon hues rotated far)', () => {
    const rotated = rotateColor('#3fd9c5', 180)!
    expect(parseColor(rotated)).not.toBeNull()
  })
})

describe('rotateTokenValue', () => {
  it('passes none and empty values through', () => {
    expect(rotateTokenValue('none', 90)).toBe('none')
    expect(rotateTokenValue('', 90)).toBe('')
  })
  it('keeps neutral gradient stops untouched and preserves the geometry', () => {
    const value = 'linear-gradient(160deg, rgba(255, 255, 255, 0.07) 0%, rgba(0, 0, 0, 0.14) 100%)'
    const rotated = rotateTokenValue(value, 120)
    expect(rotated).toContain('linear-gradient(160deg')
    expect(rotated).toContain(' 0%')
    expect(rotated).toContain(' 100%)')
    // white and black are neutral; the rotation has nothing to move
    expect(rotated).toBe(value)
  })
  it('rotates the chromatic shadow of a box-shadow while neutral black stays', () => {
    const value = '0 3px 0 rgba(126, 87, 194, 0.12), 0 6px 14px rgba(0, 0, 0, 0.14)'
    const rotated = rotateTokenValue(value, 120)
    expect(rotated).not.toBe(value)
    expect(rotated).toContain('rgba(0, 0, 0, 0.14)')
    expect(rotated).toMatch(/^0 3px 0 rgba\(\d+, \d+, \d+, 0\.12\), 0 6px 14px rgba\(0, 0, 0, 0\.14\)$/)
    const originalHue = hueOfColor('#7e57c2')!
    const rotatedColor = rotated.match(/rgba\((\d+), (\d+), (\d+), 0\.12\)/)![0]
    const rotatedHue = hueOfColor(rotatedColor)!
    const moved = ((rotatedHue - originalHue + 540) % 360) - 180
    expect(Math.abs(moved - 120)).toBeLessThan(4)
  })
  it('rotates %23-encoded hex inside an SVG data URI and keeps the markup', () => {
    const value =
      'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'28\'%3E%3Cpath d=\'M3 21l5-9 5 9z\' fill=\'%23f45c9e\' fill-opacity=\'.08\'/%3E%3C/svg%3E")'
    const rotated = rotateTokenValue(value, 180)
    expect(rotated).toContain('%3Csvg')
    expect(rotated).not.toContain('%23f45c9e')
    expect(rotated).toMatch(/%23[0-9a-f]{6}/)
    expect(rotated).toContain("fill-opacity='.08'")
  })
})

describe('participationFor', () => {
  it('defaults to full rotation', () => {
    expect(participationFor('jin')).toBe('full')
    expect(participationFor('claymorphism')).toBe('full')
  })
  it('declares the identity exceptions', () => {
    expect(participationFor('e-ink-paper')).toBe('none')
    expect(participationFor('pixel-art')).toBe('accent-only')
    expect(RECOLOR_PARTICIPATION['e-ink-paper']).toBe('none')
  })
})

describe('computeRecolor', () => {
  it('rotates the whole chromatic family onto the requested hue', () => {
    const target = 40
    const { overrides, validation } = computeRecolor(BASE, target, 'full')
    const accentHue = hueOfColor(overrides['--jin-accent']!)
    expect(Math.abs(accentHue! - target)).toBeLessThan(4)
    // visibly chromatic tokens follow the same anchor
    const bgHue = hueOfColor(overrides['--jin-bg']!)
    expect(bgHue).not.toBeNull()
    // and the semantic families stay exactly where they were
    for (const token of RECOLOR_EXEMPT_TOKENS) {
      expect(overrides[token]).toBeUndefined()
    }
    expect(validation.pairs.length).toBeGreaterThan(0)
    expect(validation.warnings).toEqual([])
  })

  it('keeps every AA pair passing for the reference theme', () => {
    const { validation } = computeRecolor(BASE, 200, 'full')
    for (const pair of validation.pairs) {
      expect(pair.pass, `${pair.token} vs ${pair.against} = ${pair.ratio.toFixed(2)}`).toBe(true)
    }
  })

  it('emits only changed values', () => {
    const { overrides } = computeRecolor(BASE, 0, 'full')
    for (const [token, value] of Object.entries(overrides)) {
      expect(value, token).not.toBe(BASE[token])
      expect(RECOLOR_COLOR_TOKENS).toContain(token)
    }
  })

  it('rotates only the accent family under accent-only participation', () => {
    const { overrides } = computeRecolor(BASE, 40, 'accent-only')
    expect(overrides['--jin-accent']).toBeDefined()
    expect(overrides['--jin-focus-ring-color']).toBeDefined()
    expect(overrides['--jin-bg']).toBeUndefined()
    expect(overrides['--jin-text']).toBeUndefined()
    expect(overrides['--jin-elevation-1']).toBeUndefined()
  })

  it('returns nothing for none participation or a missing anchor', () => {
    expect(computeRecolor(BASE, 40, 'none').overrides).toEqual({})
    expect(computeRecolor({ '--jin-bg': '#131b28' }, 40, 'full').overrides).toEqual({})
  })

  it('clamps a failing text pair back over AA', () => {
    const low: Record<string, string> = {
      ...BASE,
      '--jin-text': '#6b7684', // deliberately below 4.5:1 on the raised surface
    }
    const before = contrastRatio(low['--jin-text']!, low['--jin-surface-raised']!)
    expect(before).toBeLessThan(4.5)
    const { overrides, validation } = computeRecolor(low, 40, 'full')
    const textPairs = validation.pairs.filter((pair) => pair.token === '--jin-text')
    for (const pair of textPairs) {
      expect(pair.pass, `${pair.against} = ${pair.ratio.toFixed(2)}`).toBe(true)
    }
    expect(overrides['--jin-text']).toBeDefined()
    expect(contrastRatio(overrides['--jin-text']!, low['--jin-surface-raised']!)).toBeGreaterThan(4.5)
  })

  it('reports semantic pairs the rotation cannot repair', () => {
    const broken: Record<string, string> = {
      ...BASE,
      '--jin-danger-bg': 'rgba(190, 150, 40, 0.15)',
      '--jin-danger-text': '#4b5563',
    }
    const { validation } = computeRecolor(broken, 40, 'full')
    expect(validation.warnings.length).toBeGreaterThan(0)
    expect(validation.warnings.some((w) => w.includes('--jin-danger-text'))).toBe(true)
  })

  it('measures translucent status tints against the ground they sit on', () => {
    expect(contrastRatio('#ffffff', 'rgba(0, 0, 0, 0.5)')).toBeGreaterThan(3.5)
    expect(contrastRatio('#000000', '#000000')).toBe(1)
  })
})
