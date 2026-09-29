/**
 * DOM measurement helpers shared by controls. Kept apart from the pure core so
 * core stays importable without a DOM.
 */

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export function boxOf(element: Element | null): Box | null {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

export function isRtl(element: Element | null): boolean {
  if (!element || typeof getComputedStyle !== 'function') return false
  return getComputedStyle(element).direction === 'rtl'
}

/** Focus an element only when it is actually in the document. */
export function safeFocus(element: HTMLElement | null | undefined): boolean {
  if (!element || !element.isConnected) return false
  element.focus({ preventScroll: true })
  return document.activeElement === element
}

/** Merge ids for aria-describedby / aria-labelledby. */
export function joinIds(...ids: (string | null | undefined | false)[]): string | undefined {
  const list = ids.filter((id): id is string => Boolean(id))
  return list.length > 0 ? list.join(' ') : undefined
}
