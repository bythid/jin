// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { createTheme, type ThemeSnapshot } from '../src/injection/theme'
import { hueOfColor } from '../src/core/recolor'

/** Two fixture "theme files"; the reader hands out the one for the current style. */
const BASES: Record<string, Record<string, string>> = {
  clay: {
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
  },
  poppy: {
    '--jin-bg': '#131b28',
    '--jin-surface': '#182334',
    '--jin-surface-raised': '#1f2c40',
    '--jin-surface-sunken': '#0e1520',
    '--jin-surface-translucent': '#1f2c40',
    '--jin-scrim': 'rgba(8, 12, 22, 0.68)',
    '--jin-text': '#e8effa',
    '--jin-text-muted': '#b3c2d9',
    '--jin-text-subtle': '#92a5bd',
    '--jin-text-on-accent': '#2b1013',
    '--jin-border-color': '#2c3d58',
    '--jin-border-color-strong': '#48618a',
    '--jin-accent': '#f45c9e',
    '--jin-accent-hover': '#ff74b2',
    '--jin-accent-active': '#dd4488',
    '--jin-focus-ring-color': '#5fd4c8',
  },
}

let currentStyle = 'clay'
const tokenReader = (token: string): string | null => BASES[currentStyle]![token] ?? null

function inlineProp(name: string): string {
  return document.documentElement.style.getPropertyValue(name).trim()
}

afterEach(() => {
  document.documentElement.style.cssText = ''
  document.documentElement.removeAttribute('data-jin-style')
  document.documentElement.removeAttribute('data-jin-mode')
  currentStyle = 'clay'
})

describe('createTheme recolor', () => {
  it('writes the rotated family as inline custom properties on the target', () => {
    const theme = createTheme({ defaultStyle: 'clay', tokenReader })
    theme.setAccentHue(40)
    const accent = inlineProp('--jin-accent')
    expect(accent).not.toBe('')
    expect(accent).not.toBe(BASES.clay!['--jin-accent'])
    expect(Math.abs(hueOfColor(accent)! - 40)).toBeLessThan(4)
    // the chromatic ground follows the same anchor
    expect(inlineProp('--jin-bg')).not.toBe('')
    // the semantic families are never written
    expect(inlineProp('--jin-danger')).toBe('')
  })

  it('normalizes the hue into 0-360', () => {
    const theme = createTheme({ defaultStyle: 'clay', tokenReader })
    theme.setAccentHue(400)
    expect(theme.accentHue.value).toBe(40)
    theme.setAccentHue(-20)
    expect(theme.accentHue.value).toBe(340)
  })

  it('carries the hue in snapshot and onChange', () => {
    const seen: ThemeSnapshot[] = []
    const theme = createTheme({ defaultStyle: 'clay', tokenReader, onChange: (s) => seen.push(s) })
    theme.setAccentHue(40)
    expect(theme.snapshot.value.accentHue).toBe(40)
    expect(seen.at(-1)).toEqual({ style: 'clay', mode: 'dark', accentHue: 40 })
  })

  it('re-derives from the newly active theme when the style changes', () => {
    const theme = createTheme({ defaultStyle: 'clay', tokenReader })
    theme.setAccentHue(40)
    currentStyle = 'poppy'
    theme.setStyle('poppy')
    const accent = inlineProp('--jin-accent')
    expect(Math.abs(hueOfColor(accent)! - 40)).toBeLessThan(4)
    // the anchor moved with the theme: poppy's pink rotated, not clay's blue
    expect(accent).not.toBe(inlineProp('--jin-text-on-accent'))
  })

  it('clears exactly its own properties on reset, leaving foreign ones alone', () => {
    document.documentElement.style.setProperty('--jin-z-toast', '1400')
    const theme = createTheme({ defaultStyle: 'clay', tokenReader })
    theme.setAccentHue(40)
    expect(inlineProp('--jin-accent')).not.toBe('')
    theme.setAccentHue(null)
    expect(inlineProp('--jin-accent')).toBe('')
    expect(inlineProp('--jin-bg')).toBe('')
    expect(inlineProp('--jin-z-toast')).toBe('1400')
    expect(theme.validateRecolor()).toBeNull()
  })

  it('applies a restored hue at creation', () => {
    createTheme({ defaultStyle: 'clay', tokenReader, defaultAccentHue: 40 })
    expect(Math.abs(hueOfColor(inlineProp('--jin-accent'))! - 40)).toBeLessThan(4)
  })

  it('writes nothing for a style that does not participate', () => {
    const theme = createTheme({ defaultStyle: 'e-ink-paper', tokenReader })
    theme.setAccentHue(40)
    expect(theme.accentHue.value).toBe(40)
    expect(inlineProp('--jin-accent')).toBe('')
    expect(theme.validateRecolor()).toBeNull()
  })

  it('reports the AA re-measurement of the active recolor', () => {
    const theme = createTheme({ defaultStyle: 'clay', tokenReader })
    expect(theme.validateRecolor()).toBeNull()
    theme.setAccentHue(40)
    const validation = theme.validateRecolor()
    expect(validation).not.toBeNull()
    expect(validation!.pairs.length).toBeGreaterThan(0)
    expect(validation!.warnings).toEqual([])
  })

  it('re-derives when sync() picks up host-written attributes', () => {
    const theme = createTheme({ defaultStyle: 'clay', tokenReader })
    theme.setAccentHue(40)
    const before = inlineProp('--jin-accent')
    expect(before).not.toBe('')
    // the host rewrote the markup behind the controller's back
    currentStyle = 'poppy'
    document.documentElement.setAttribute('data-jin-style', 'poppy')
    theme.sync()
    expect(theme.style.value).toBe('poppy')
    const after = inlineProp('--jin-accent')
    expect(after).not.toBe(before)
    expect(Math.abs(hueOfColor(after)! - 40)).toBeLessThan(4)
  })
})
