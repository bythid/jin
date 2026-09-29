/**
 * Roving tabindex navigation — the single implementation behind tabs, menus,
 * toolbars, radio groups, trees and selects. Pure index math: give it a key,
 * the current index and the item count, get the next index.
 */
import type { Orientation } from './types'

export interface RovingOptions {
  orientation?: Orientation | 'both'
  /** Wrap around at the ends. Default true. */
  loop?: boolean
  /** In RTL the horizontal arrows swap meaning. */
  rtl?: boolean
}

export type RovingKey =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'

export function isRovingKey(key: string): key is RovingKey {
  return (
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'Home' ||
    key === 'End' ||
    key === 'PageUp' ||
    key === 'PageDown'
  )
}

function step(current: number, count: number, delta: number, loop: boolean): number {
  if (count <= 0) return -1
  if (delta === 0) return current
  const next = current + delta
  if (next < 0) return loop ? ((next % count) + count) % count : 0
  if (next >= count) return loop ? next % count : count - 1
  return next
}

/**
 * Next index for a navigation key, or null when the key is not a navigation
 * key / the orientation excludes it.
 */
export function nextRovingIndex(
  key: RovingKey,
  current: number,
  count: number,
  options: RovingOptions = {},
): number | null {
  const orientation = options.orientation ?? 'both'
  const loop = options.loop ?? true
  const horizontalAllowed = orientation === 'horizontal' || orientation === 'both'
  const verticalAllowed = orientation === 'vertical' || orientation === 'both'
  if (count <= 0) return null

  switch (key) {
    case 'Home':
      return 0
    case 'End':
      return count - 1
    case 'PageUp':
      return step(current, count, -5, false)
    case 'PageDown':
      return step(current, count, 5, false)
    case 'ArrowUp':
      return verticalAllowed ? step(current, count, -1, loop) : null
    case 'ArrowDown':
      return verticalAllowed ? step(current, count, 1, loop) : null
    case 'ArrowLeft': {
      if (!horizontalAllowed) return null
      const delta = options.rtl ? 1 : -1
      return step(current, count, delta, loop)
    }
    case 'ArrowRight': {
      if (!horizontalAllowed) return null
      const delta = options.rtl ? -1 : 1
      return step(current, count, delta, loop)
    }
  }
}

export interface TypeaheadEntry {
  index: number
  /** Text used for matching. The caller decides what "text" means. */
  text: string
  disabled?: boolean
}

/** First non-disabled entry starting with `query`, searching from `from` forward/backward. */
export function typeaheadMatch(
  entries: readonly TypeaheadEntry[],
  query: string,
  from: number,
  options: { loop?: boolean } = {},
): number | null {
  const needle = query.trim().toLowerCase()
  if (!needle) return null
  const usable = entries.filter((entry) => !entry.disabled)
  if (usable.length === 0) return null
  const ordered = options.loop === false ? usable : usable
  const startPos = ordered.findIndex((entry) => entry.index > from)
  const offset = startPos === -1 ? 0 : startPos
  const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)]
  const exact = rotated.find((entry) => entry.text.toLowerCase().startsWith(needle))
  if (exact) return exact.index
  // Fall back to the first match anywhere, so a single repeat character cycles.
  const anywhere = ordered.find((entry) => entry.text.toLowerCase().startsWith(needle))
  return anywhere ? anywhere.index : null
}

export interface TypeaheadBuffer {
  push(char: string, at?: number): string
  value(at?: number): string
  clear(): void
}

/** Consecutive keystrokes within `timeout` build one search string. */
export function createTypeaheadBuffer(timeout = 500, now: () => number = Date.now): TypeaheadBuffer {
  let buffer = ''
  let lastAt = Number.NEGATIVE_INFINITY
  return {
    push(char, at = now()) {
      if (at - lastAt > timeout) buffer = ''
      buffer += char
      lastAt = at
      return buffer
    },
    value(at = now()) {
      if (at - lastAt > timeout) buffer = ''
      return buffer
    },
    clear() {
      buffer = ''
      lastAt = Number.NEGATIVE_INFINITY
    },
  }
}
