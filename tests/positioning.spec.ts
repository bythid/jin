import { describe, expect, it } from 'vitest'
import {
  buildPlacement,
  computePosition,
  isPlacement,
  parsePlacement,
  rectsIntersect,
} from '../src/core/positioning'

const anchor = { x: 100, y: 100, width: 40, height: 20 }
const floating = { x: 0, y: 0, width: 120, height: 60 }
const viewport = { width: 800, height: 600 }

describe('parsePlacement / buildPlacement', () => {
  it('parses a bare side as centred', () => {
    expect(parsePlacement('bottom')).toEqual({ side: 'bottom', align: 'center' })
  })

  it('parses side-align pairs', () => {
    expect(parsePlacement('top-start')).toEqual({ side: 'top', align: 'start' })
    expect(parsePlacement('left-end')).toEqual({ side: 'left', align: 'end' })
  })

  it('falls back to bottom-centre for junk', () => {
    expect(parsePlacement('diagonal' as never)).toEqual({ side: 'bottom', align: 'center' })
  })

  it('round-trips through buildPlacement', () => {
    expect(buildPlacement('right', 'center')).toBe('right')
    expect(buildPlacement('right', 'end')).toBe('right-end')
  })

  it('validates placement strings', () => {
    expect(isPlacement('top')).toBe(true)
    expect(isPlacement('top-start')).toBe(true)
    expect(isPlacement('top-middle')).toBe(false)
    expect(isPlacement('sideways')).toBe(false)
  })
})

describe('computePosition without a boundary', () => {
  it('places below and centred by default', () => {
    const result = computePosition(anchor, floating)
    expect(result.placement).toBe('bottom')
    expect(result.x).toBe(100 + 20 - 60)
    expect(result.y).toBe(100 + 20 + 8)
  })

  it('honours start / end alignment', () => {
    expect(computePosition(anchor, floating, { placement: 'bottom-start' }).x).toBe(100)
    expect(computePosition(anchor, floating, { placement: 'bottom-end' }).x).toBe(140 - 120)
  })

  it('applies the offset', () => {
    expect(computePosition(anchor, floating, { offset: 24 }).y).toBe(120 + 24)
  })

  it('places to the left and right', () => {
    const left = computePosition(anchor, floating, { placement: 'left' })
    expect(left.x).toBe(100 - 120 - 8)
    const right = computePosition(anchor, floating, { placement: 'right' })
    expect(right.x).toBe(140 + 8)
  })
})

describe('flip', () => {
  it('flips up when there is no room below', () => {
    const tallAnchor = { x: 100, y: 560, width: 40, height: 20 }
    const result = computePosition(tallAnchor, floating, { boundary: viewport })
    expect(result.side).toBe('top')
    expect(result.flipped).toBe(true)
    expect(result.y).toBe(560 - 60 - 8)
  })

  it('does not flip when disabled', () => {
    const tallAnchor = { x: 100, y: 560, width: 40, height: 20 }
    const result = computePosition(tallAnchor, floating, { boundary: viewport, flip: false })
    expect(result.side).toBe('bottom')
    expect(result.flipped).toBe(false)
  })

  it('keeps the preferred side when it already fits', () => {
    const result = computePosition(anchor, floating, { boundary: viewport })
    expect(result.side).toBe('bottom')
    expect(result.flipped).toBe(false)
  })

  it('keeps the preferred side when both fit, even with more room opposite', () => {
    // The preferred side wins whenever it fits: choosing the roomier opposite
    // side instead would open a `top` popover below its anchor.
    const upperHalf = { x: 100, y: 343, width: 300, height: 32 }
    const bubble = { x: 0, y: 0, width: 240, height: 111 }
    const result = computePosition(upperHalf, bubble, {
      placement: 'top',
      boundary: { width: 1440, height: 900 },
    })
    expect(result.side).toBe('top')
    expect(result.flipped).toBe(false)
    expect(result.y).toBe(343 - 111 - 8)
  })
})

describe('shift', () => {
  it('slides back inside the right edge and reports it', () => {
    const edgeAnchor = { x: 780, y: 100, width: 20, height: 20 }
    const result = computePosition(edgeAnchor, floating, { boundary: viewport, padding: 8 })
    expect(result.x).toBe(viewport.width - floating.width - 8)
    expect(result.shifted).toBe(true)
  })

  it('slides back inside the left edge', () => {
    const edgeAnchor = { x: 0, y: 100, width: 10, height: 20 }
    const result = computePosition(edgeAnchor, floating, { boundary: viewport, padding: 8 })
    expect(result.x).toBe(8)
    expect(result.shifted).toBe(true)
  })

  it('leaves a fitting placement alone', () => {
    const result = computePosition(anchor, floating, { boundary: viewport })
    expect(result.shifted).toBe(false)
  })
})

describe('arrow', () => {
  it('points at the anchor centre along the main axis', () => {
    const result = computePosition(anchor, floating, { arrow: { width: 8, height: 8 } })
    // Anchor centre at x = 120; floating starts at x = 60, so the arrow centre
    // sits at 60 within the floating box.
    expect(result.arrow?.x).toBe(60)
    expect(result.arrow?.y).toBe(0)
  })

  it('clamps the arrow inside the floating box when shifted', () => {
    const edgeAnchor = { x: 780, y: 100, width: 20, height: 20 }
    const result = computePosition(edgeAnchor, floating, {
      boundary: viewport,
      arrow: { width: 8, height: 8 },
    })
    const x = result.arrow?.x ?? -1
    expect(x).toBeGreaterThanOrEqual(4)
    expect(x).toBeLessThanOrEqual(floating.width - 4)
  })

  it('returns null when no arrow is requested', () => {
    expect(computePosition(anchor, floating).arrow).toBeNull()
  })
})

describe('rectsIntersect', () => {
  it('detects overlap and separation', () => {
    expect(rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true)
    expect(rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 0, width: 10, height: 10 })).toBe(false)
  })
})
