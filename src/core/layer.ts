/**
 * Stacking layers. One overlay container for the whole library,
 * so z-index never becomes an arms race: each layer maps to a contract token
 * and the stack adds a small offset for ordering within a layer.
 */
export type Layer = 'dropdown' | 'sticky' | 'overlay' | 'modal' | 'toast' | 'tooltip'

export const LAYERS: readonly Layer[] = ['dropdown', 'sticky', 'overlay', 'modal', 'toast', 'tooltip']

export const LAYER_TOKEN: Record<Layer, string> = {
  dropdown: '--jin-z-dropdown',
  sticky: '--jin-z-sticky',
  overlay: '--jin-z-overlay',
  modal: '--jin-z-modal',
  toast: '--jin-z-toast',
  tooltip: '--jin-z-tooltip',
}

/** Used when a token is missing or unreadable, so a control keeps working. */
export const FALLBACK_Z: Record<Layer, number> = {
  dropdown: 1000,
  sticky: 900,
  overlay: 1100,
  modal: 1200,
  toast: 1400,
  tooltip: 1500,
}

export type TokenReader = (token: string) => string | null | undefined

/** Read a z-index token off an element (usually <html>). */
export function readNumericToken(element: Element | null, token: string): number | null {
  if (!element || typeof getComputedStyle !== 'function') return null
  const raw = getComputedStyle(element).getPropertyValue(token).trim()
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function layerZIndex(layer: Layer, read: TokenReader): number {
  const raw = read(LAYER_TOKEN[layer])
  const parsed = raw ? Number.parseInt(String(raw), 10) : Number.NaN
  return Number.isFinite(parsed) ? parsed : FALLBACK_Z[layer]
}
