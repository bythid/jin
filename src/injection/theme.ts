/**
 * Theme state. The library never touches localStorage and never
 * requests anything: it reads/writes the two axes on <html> and tells the host
 * about changes so the host can persist them.
 *
 * Recoloring rides the same path: the accent hue is the one axis a host may
 * move, and the controller rewrites the theme's colour tokens as inline
 * custom properties on <html> — re-derived whenever style or mode changes,
 * because the base values come from the newly active theme file.
 */
import { computed, inject, ref, type App, type ComputedRef, type Ref } from 'vue'
import {
  RECOLOR_COLOR_TOKENS,
  computeRecolor,
  hueOfColor,
  participationFor,
  type RecolorValidation,
} from '../core/recolor'
import { injectionKey } from './key'

export const JIN_STYLE_ATTRIBUTE = 'data-jin-style'
export const JIN_MODE_ATTRIBUTE = 'data-jin-mode'

export type JinMode = 'light' | 'dark'

export interface ThemeSnapshot {
  style: string
  mode: JinMode
  accentHue: number | null
  lightnessOffset: number
}

export interface ThemeController {
  style: Ref<string>
  mode: Ref<JinMode>
  /** The re-anchored hue, or null when the theme ships its own palette. */
  accentHue: Ref<number | null>
  /** The applied lightness shift in OKLCH units, 0 when the theme is untouched. */
  lightnessOffset: Ref<number>
  /** The current theme's own ground hue — where "back to original" sits on the wheel. */
  originHue: ComputedRef<number | null>
  snapshot: ComputedRef<ThemeSnapshot>
  setStyle(next: string): void
  setMode(next: JinMode): void
  toggleMode(): void
  /** Re-anchor the current theme's colour family onto `hue`; null clears it. */
  setAccentHue(hue: number | null): void
  /** Shift the family lighter or darker; null resets to the theme's own lightness. */
  setLightnessOffset(delta: number | null): void
  /** The AA re-measurement of the last recolor, or null when none is active. */
  validateRecolor(): RecolorValidation | null
  /** Re-read the attributes from the DOM (used when the host owns the markup). */
  sync(target?: HTMLElement | null): void
}

export const themeKey = injectionKey<ThemeController>('theme')

/**
 * The house style. Jin is the library's own visual identity; the others are
 * alternative treatments an application may choose instead.
 */
export const DEFAULT_STYLE = 'jin'
/** Jin's signature mode is the dark 玄锦; light 素锦 is the alternative. */
export const DEFAULT_MODE: JinMode = 'dark'

export interface ThemeOptions {
  defaultStyle?: string
  defaultMode?: JinMode
  /** Where the two attributes live. Defaults to <html>. */
  target?: HTMLElement | null
  /** Called whenever style, mode or the accent hue changes, so the host can persist it. */
  onChange?: (snapshot: ThemeSnapshot) => void
  /** The hue the host restored from its own persistence, if any. */
  defaultAccentHue?: number | null
  /** The lightness shift the host restored from its own persistence, if any. */
  defaultLightnessOffset?: number
  /**
   * Where the recolor reads the theme's base token values from. Defaults to
   * the computed style of the target; tests inject a fixture here because
   * jsdom computes no stylesheet values.
   */
  tokenReader?: (token: string) => string | null
}

function isJinMode(value: string | null | undefined): value is JinMode {
  return value === 'light' || value === 'dark'
}

function domTarget(explicit?: HTMLElement | null): HTMLElement | null {
  if (explicit) return explicit
  if (typeof document === 'undefined') return null
  return document.documentElement
}

function normalizeHue(hue: number): number {
  return ((Math.round(hue) % 360) + 360) % 360
}

/** How far the lightness axis may push the family from its declared values. */
const MAX_LIGHTNESS_OFFSET = 0.15

function normalizeLightness(delta: number): number {
  const clamped = Math.max(-MAX_LIGHTNESS_OFFSET, Math.min(MAX_LIGHTNESS_OFFSET, delta))
  return Math.round(clamped * 1000) / 1000
}

export function createTheme(options: ThemeOptions = {}): ThemeController {
  const target = domTarget(options.target)
  const initialStyle = target?.getAttribute(JIN_STYLE_ATTRIBUTE) ?? options.defaultStyle ?? DEFAULT_STYLE
  const rawMode = target?.getAttribute(JIN_MODE_ATTRIBUTE) ?? null
  const initialMode: JinMode = isJinMode(rawMode) ? rawMode : (options.defaultMode ?? DEFAULT_MODE)

  const style = ref(initialStyle)
  const mode = ref<JinMode>(initialMode)
  const accentHue = ref<number | null>(
    options.defaultAccentHue == null ? null : normalizeHue(options.defaultAccentHue),
  )
  const lightnessOffset = ref(
    options.defaultLightnessOffset === undefined
      ? 0
      : normalizeLightness(options.defaultLightnessOffset),
  )
  // Where "back to the theme's own colours" sits on the wheel: the active
  // theme's own ground hue, re-read from the base on every apply (the read
  // happens after the recolor's own overrides are cleared, so it is the theme
  // file's value, never a recoloured one).
  const originGroundHue = ref<number | null>(null)

  const readToken =
    options.tokenReader ??
    ((token: string) => {
      if (!target || typeof getComputedStyle !== 'function') return null
      return getComputedStyle(target).getPropertyValue(token).trim() || null
    })

  // The recolor owns exactly the inline properties it wrote last time; every
  // apply() removes them before reading the base, so the computed values are
  // always the theme file's own.
  let lastOverrides: string[] = []
  let lastValidation: RecolorValidation | null = null

  function clearRecolor(): void {
    if (!target) return
    for (const token of lastOverrides) target.style.removeProperty(token)
    lastOverrides = []
    lastValidation = null
  }

  function writeRecolor(): void {
    if (!target) return
    const base: Record<string, string> = {}
    for (const token of RECOLOR_COLOR_TOKENS) {
      const value = readToken(token)
      if (value) base[token] = value
    }
    originGroundHue.value =
      hueOfColor(base['--jin-bg'] ?? '') ?? hueOfColor(base['--jin-accent'] ?? '')
    if (participationFor(style.value) === 'none') return
    const hue = accentHue.value
    const dL = lightnessOffset.value
    if (hue === null && dL === 0) return
    const result = computeRecolor(base, hue, participationFor(style.value), dL)
    for (const [token, value] of Object.entries(result.overrides)) {
      target.style.setProperty(token, value)
    }
    lastOverrides = Object.keys(result.overrides)
    lastValidation = result.validation
  }

  function apply(): void {
    clearRecolor()
    target?.setAttribute(JIN_STYLE_ATTRIBUTE, style.value)
    target?.setAttribute(JIN_MODE_ATTRIBUTE, mode.value)
    writeRecolor()
    options.onChange?.({
      style: style.value,
      mode: mode.value,
      accentHue: accentHue.value,
      lightnessOffset: lightnessOffset.value,
    })
  }

  // Write once on creation so the DOM matches the controller even when the
  // host never set the attributes itself.
  apply()

  function setStyle(next: string): void {
    if (!next || next === style.value) return
    style.value = next
    apply()
  }

  function setMode(next: JinMode): void {
    if (next === mode.value) return
    mode.value = next
    apply()
  }

  function setAccentHue(next: number | null): void {
    const normalized = next === null ? null : normalizeHue(next)
    if (normalized === accentHue.value) return
    accentHue.value = normalized
    apply()
  }

  function setLightnessOffset(next: number | null): void {
    const normalized = next === null ? 0 : normalizeLightness(next)
    if (normalized === lightnessOffset.value) return
    lightnessOffset.value = normalized
    apply()
  }

  return {
    style,
    mode,
    accentHue,
    lightnessOffset,
    originHue: computed(() => originGroundHue.value),
    snapshot: computed(() => ({
      style: style.value,
      mode: mode.value,
      accentHue: accentHue.value,
      lightnessOffset: lightnessOffset.value,
    })),
    setStyle,
    setMode,
    toggleMode: () => setMode(mode.value === 'dark' ? 'light' : 'dark'),
    setAccentHue,
    setLightnessOffset,
    validateRecolor: () => lastValidation,
    sync(element) {
      const next = domTarget(element ?? target)
      const nextStyle = next?.getAttribute(JIN_STYLE_ATTRIBUTE)
      const nextMode = next?.getAttribute(JIN_MODE_ATTRIBUTE)
      const changed =
        (nextStyle !== null && nextStyle !== style.value) ||
        (isJinMode(nextMode) && nextMode !== mode.value)
      if (nextStyle) style.value = nextStyle
      if (isJinMode(nextMode)) mode.value = nextMode as JinMode
      // The markup changed underneath us: re-derive the recolor from it.
      if (changed) apply()
    },
  }
}

export function provideTheme(app: App, controller: ThemeController): void {
  app.provide(themeKey, controller)
}

export function useTheme(): ThemeController {
  const injected = inject(themeKey, null)
  if (injected) return injected
  // Without an installed plugin the composable still works, on a local controller.
  return createTheme()
}
