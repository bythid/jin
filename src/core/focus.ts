/**
 * Focus decisions. Which element receives focus, where it goes back to, and
 * how Tab cycles are pure and tested; the DOM plumbing lives in
 * useFocusTrap.ts. The selectors below are JS strings used with
 * querySelectorAll — the isolation rule only constrains stylesheets, so
 * these are fine here.
 */

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

export const TABBABLE_SELECTOR = FOCUSABLE_SELECTOR

export interface FocusCandidate {
  /** Index in the DOM order of the container. */
  index: number
  disabled: boolean
  tabindex: number
  hidden: boolean
}

/** Candidates that participate in sequential Tab order. */
export function tabbables(candidates: readonly FocusCandidate[]): FocusCandidate[] {
  return candidates.filter((candidate) => !candidate.disabled && !candidate.hidden && candidate.tabindex >= 0)
}

export type InitialFocusStrategy = 'first' | 'last' | 'container' | 'none'

/**
 * Index (into the tabbable list) that should receive focus when an overlay
 * opens. `null` means "focus the container itself".
 */
export function resolveInitialFocusIndex(count: number, strategy: InitialFocusStrategy = 'first'): number | null {
  if (strategy === 'none') return null
  if (strategy === 'container') return null
  if (count <= 0) return null
  return strategy === 'last' ? count - 1 : 0
}

/** Wrap-around step used by the focus trap and by roving tabindex. */
export function stepIndex(current: number, count: number, direction: 1 | -1, wrap = true): number {
  if (count <= 0) return -1
  const next = current + direction
  if (next < 0) return wrap ? count - 1 : 0
  if (next >= count) return wrap ? 0 : count - 1
  return next
}

export interface FocusReturnTarget {
  isConnected: boolean
  isFocusable: boolean
}

/**
 * Where focus goes when an overlay closes: the trigger that opened it when it
 * is still around, otherwise the caller-supplied fallback. Never returns a
 * detached node, which is what makes "focus lost to <body>" happen.
 */
export function resolveFocusReturn(trigger: FocusReturnTarget | null, fallback: FocusReturnTarget | null = null): 'trigger' | 'fallback' | null {
  if (trigger && trigger.isConnected && trigger.isFocusable) return 'trigger'
  if (fallback && fallback.isConnected && fallback.isFocusable) return 'fallback'
  if (trigger && trigger.isConnected) return 'trigger'
  if (fallback && fallback.isConnected) return 'fallback'
  return null
}

export function elementFocusState(element: HTMLElement | null): FocusReturnTarget {
  if (!element) return { isConnected: false, isFocusable: false }
  const tabindex = element.getAttribute('tabindex')
  const nativelyFocusable =
    element.tabIndex >= 0 && !element.hasAttribute('disabled') && !element.hasAttribute('aria-hidden')
  return {
    isConnected: element.isConnected,
    isFocusable: nativelyFocusable || tabindex !== null,
  }
}

export function isVisible(element: HTMLElement): boolean {
  if (!element.isConnected) return false
  if (element.hasAttribute('hidden')) return false
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(element) : null
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return false
  return true
}

export function collectCandidates(root: ParentNode): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter((node) => {
    if (!isVisible(node)) return false
    if (node.hasAttribute('inert')) return false
    return node.tabIndex >= 0 || node.getAttribute('contenteditable') !== null
  })
}

export function firstTabbable(root: ParentNode): HTMLElement | null {
  return collectCandidates(root)[0] ?? null
}

export function focusablesIn(root: ParentNode): HTMLElement[] {
  return collectCandidates(root)
}
