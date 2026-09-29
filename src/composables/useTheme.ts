/**
 * `useTheme()` / `useCapabilities()` / `useT()` re-exported from one module so
 * applications have a single import site for host integration.
 */
export { useTheme, createTheme, themeKey, DEFAULT_STYLE, DEFAULT_MODE } from '../injection/theme'
export type { JinMode, ThemeController, ThemeOptions, ThemeSnapshot } from '../injection/theme'
export { useCapabilities } from '../injection/provide-capabilities'
export { useT, useTranslation } from './useT'
export type { JinCapabilities } from '../injection/capabilities'
