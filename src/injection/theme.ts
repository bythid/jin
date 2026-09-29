/**
 * Theme state. The library never touches localStorage and never
 * requests anything: it reads/writes the two axes on <html> and tells the host
 * about changes so the host can persist them.
 */
import { computed, inject, ref, type App, type ComputedRef, type InjectionKey, type Ref } from 'vue'

export const JIN_STYLE_ATTRIBUTE = 'data-jin-style'
export const JIN_MODE_ATTRIBUTE = 'data-jin-mode'

export type JinMode = 'light' | 'dark'

export interface ThemeSnapshot {
  style: string
  mode: JinMode
}

export interface ThemeController {
  style: Ref<string>
  mode: Ref<JinMode>
  snapshot: ComputedRef<ThemeSnapshot>
  setStyle(next: string): void
  setMode(next: JinMode): void
  toggleMode(): void
  /** Re-read the attributes from the DOM (used when the host owns the markup). */
  sync(target?: HTMLElement | null): void
}

export const themeKey: InjectionKey<ThemeController> = Symbol('jin-theme')

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
  /** Called whenever style or mode changes, so the host can persist it. */
  onChange?: (snapshot: ThemeSnapshot) => void
}

function isJinMode(value: string | null | undefined): value is JinMode {
  return value === 'light' || value === 'dark'
}

function domTarget(explicit?: HTMLElement | null): HTMLElement | null {
  if (explicit) return explicit
  if (typeof document === 'undefined') return null
  return document.documentElement
}

export function createTheme(options: ThemeOptions = {}): ThemeController {
  const target = domTarget(options.target)
  const initialStyle = target?.getAttribute(JIN_STYLE_ATTRIBUTE) ?? options.defaultStyle ?? DEFAULT_STYLE
  const rawMode = target?.getAttribute(JIN_MODE_ATTRIBUTE) ?? null
  const initialMode: JinMode = isJinMode(rawMode) ? rawMode : (options.defaultMode ?? DEFAULT_MODE)

  const style = ref(initialStyle)
  const mode = ref<JinMode>(initialMode)

  function apply(): void {
    target?.setAttribute(JIN_STYLE_ATTRIBUTE, style.value)
    target?.setAttribute(JIN_MODE_ATTRIBUTE, mode.value)
    options.onChange?.({ style: style.value, mode: mode.value })
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

  return {
    style,
    mode,
    snapshot: computed(() => ({ style: style.value, mode: mode.value })),
    setStyle,
    setMode,
    toggleMode: () => setMode(mode.value === 'dark' ? 'light' : 'dark'),
    sync(element) {
      const next = domTarget(element ?? target)
      const nextStyle = next?.getAttribute(JIN_STYLE_ATTRIBUTE)
      const nextMode = next?.getAttribute(JIN_MODE_ATTRIBUTE)
      if (nextStyle) style.value = nextStyle
      if (isJinMode(nextMode)) mode.value = nextMode as JinMode
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
