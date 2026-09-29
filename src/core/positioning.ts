/**
 * Anchor positioning: placement, flip, shift, arrow. Pure geometry — the
 * anchor and floating rects are plain numbers, so this module is unit-testable
 * without a browser. The composable in usePositioning.ts is the
 * only place that reads real DOM rects and schedules updates.
 */
import type { Alignment, Placement, Side } from './types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size2D {
  width: number
  height: number
}

export interface PositionOptions {
  /** Preferred placement. Default 'bottom'. */
  placement?: Placement
  /** Gap between anchor and floating element, in px. */
  offset?: number
  /** Flip to the opposite side when the preferred one overflows. Default true. */
  flip?: boolean
  /** Slide along the cross axis to stay inside the boundary. Default true. */
  shift?: boolean
  /** Minimum distance kept from the boundary edge. Default 8. */
  padding?: number
  /** Arrow box, when the floating element renders one. */
  arrow?: Size2D | null
  /** Viewport-ish boundary. Defaults to a 0x0 boundary, i.e. no overflow checks. */
  boundary?: Size2D
}

export interface PositionArrow {
  /** Anchor point of the arrow inside the floating box; center the arrow on it. */
  x: number
  y: number
}

export interface PositionResult {
  x: number
  y: number
  placement: Placement
  side: Side
  align: Alignment
  arrow: PositionArrow | null
  flipped: boolean
  shifted: boolean
}

export const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left']
export const ALIGNMENTS: readonly Alignment[] = ['start', 'center', 'end']

export function isSide(value: string): value is Side {
  return (SIDES as readonly string[]).includes(value)
}

export function isPlacement(value: string): value is Placement {
  const [side, align] = value.split('-')
  if (!side || !isSide(side)) return false
  return align === undefined || (ALIGNMENTS as readonly string[]).includes(align)
}

export function parsePlacement(placement: Placement): { side: Side; align: Alignment } {
  const [rawSide, rawAlign] = placement.split('-')
  const side: Side = isSide(rawSide ?? '') ? (rawSide as Side) : 'bottom'
  const align: Alignment =
    rawAlign && (ALIGNMENTS as readonly string[]).includes(rawAlign) ? (rawAlign as Alignment) : 'center'
  return { side, align }
}

export type { Placement } from './types'

export function buildPlacement(side: Side, align: Alignment): Placement {
  return align === 'center' ? side : (`${side}-${align}` as Placement)
}

export function toRect(rect: { top: number; left: number; width: number; height: number }): Rect {
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function crossAxisStart(side: Side, align: Alignment, anchor: Rect, floating: Rect): number {
  const horizontal = side === 'top' || side === 'bottom'
  const anchorStart = horizontal ? anchor.x : anchor.y
  const anchorSize = horizontal ? anchor.width : anchor.height
  const floatingSize = horizontal ? floating.width : floating.height
  if (align === 'start') return anchorStart
  if (align === 'end') return anchorStart + anchorSize - floatingSize
  return anchorStart + anchorSize / 2 - floatingSize / 2
}

function coordinatesFor(side: Side, align: Alignment, anchor: Rect, floating: Rect, offset: number): { x: number; y: number } {
  const cross = crossAxisStart(side, align, anchor, floating)
  switch (side) {
    case 'top':
      return { x: cross, y: anchor.y - floating.height - offset }
    case 'bottom':
      return { x: cross, y: anchor.y + anchor.height + offset }
    case 'left':
      return { x: anchor.x - floating.width - offset, y: cross }
    case 'right':
      return { x: anchor.x + anchor.width + offset, y: cross }
  }
}

function mainAxisOverflow(side: Side, coord: { x: number; y: number }, floating: Rect, boundary: Size2D, padding: number): number {
  switch (side) {
    case 'top':
      return padding - coord.y
    case 'bottom':
      return coord.y + floating.height - (boundary.height - padding)
    case 'left':
      return padding - coord.x
    case 'right':
      return coord.x + floating.width - (boundary.width - padding)
  }
}

function crossAxisOverflow(side: Side, coord: { x: number; y: number }, floating: Rect, boundary: Size2D, padding: number): number {
  const horizontal = side === 'top' || side === 'bottom'
  if (horizontal) {
    return Math.max(padding - coord.x, coord.x + floating.width - (boundary.width - padding))
  }
  return Math.max(padding - coord.y, coord.y + floating.height - (boundary.height - padding))
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

/**
 * Compute the floating element's viewport-relative position.
 *
 * Order of operations mirrors what every mature overlay library does:
 * preferred side -> flip when it overflows -> shift along the cross axis.
 */
export function computePosition(anchor: Rect, floating: Rect, options: PositionOptions = {}): PositionResult {
  const placement = options.placement ?? 'bottom'
  const offset = options.offset ?? 8
  const flip = options.flip ?? true
  const shift = options.shift ?? true
  const padding = options.padding ?? 8
  const arrow = options.arrow ?? null
  const boundary: Size2D = options.boundary ?? { width: 0, height: 0 }
  const hasBoundary = boundary.width > 0 && boundary.height > 0

  const preferred = parsePlacement(placement)
  const sides: Side[] = [preferred.side]
  if (flip && isSide(OPPOSITE_SIDE[preferred.side])) sides.push(OPPOSITE_SIDE[preferred.side])

  let chosenSide = preferred.side
  let coords = coordinatesFor(preferred.side, preferred.align, anchor, floating, offset)
  let flipped = false

  if (hasBoundary) {
    // Flip only when the preferred side does not fit. Picking the side with
    // the most slack instead would move a bubble to the opposite side of its
    // anchor even when the preferred side fits — a `top` popconfirm on an
    // upper-half row would open below it because the bottom has more room.
    const preferredOverflow = mainAxisOverflow(preferred.side, coords, floating, boundary, padding)
    if (preferredOverflow > 0) {
      let bestOverflow = preferredOverflow
      for (const candidate of sides.slice(1)) {
        const candidateCoords = coordinatesFor(candidate, preferred.align, anchor, floating, offset)
        const overflow = mainAxisOverflow(candidate, candidateCoords, floating, boundary, padding)
        if (overflow < bestOverflow) {
          bestOverflow = overflow
          chosenSide = candidate
          coords = candidateCoords
          flipped = true
        }
      }
    }
  }

  const align = preferred.align
  let shifted = false

  if (shift && hasBoundary) {
    const horizontal = chosenSide === 'top' || chosenSide === 'bottom'
    if (horizontal) {
      const maxX = boundary.width - floating.width - padding
      const nextX = clamp(coords.x, padding, maxX)
      shifted = nextX !== coords.x
      coords = { x: nextX, y: coords.y }
    } else {
      const maxY = boundary.height - floating.height - padding
      const nextY = clamp(coords.y, padding, maxY)
      shifted = nextY !== coords.y
      coords = { x: coords.x, y: nextY }
    }
  }

  let arrowPosition: PositionArrow | null = null
  if (arrow) {
    const horizontal = chosenSide === 'top' || chosenSide === 'bottom'
    const anchorCenter = horizontal ? anchor.x + anchor.width / 2 : anchor.y + anchor.height / 2
    const floatingStart = horizontal ? coords.x : coords.y
    const floatingSize = horizontal ? floating.width : floating.height
    const arrowSize = horizontal ? arrow.width : arrow.height
    const min = arrowSize / 2
    const max = floatingSize - arrowSize / 2
    const cross = clamp(anchorCenter - floatingStart, min, max)
    if (horizontal) {
      arrowPosition = { x: cross, y: chosenSide === 'top' ? floating.height : 0 }
    } else {
      arrowPosition = { x: chosenSide === 'left' ? floating.width : 0, y: cross }
    }
  }

  return {
    x: coords.x,
    y: coords.y,
    placement: buildPlacement(chosenSide, align),
    side: chosenSide,
    align,
    arrow: arrowPosition,
    flipped,
    shifted,
  }
}
