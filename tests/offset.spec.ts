import { describe, expect, it } from 'vitest'

import { regionTransform } from '../src/core/offset'

describe('regionTransform', () => {
  it('returns undefined without an offset or for an empty one', () => {
    expect(regionTransform('top-end', undefined)).toBeUndefined()
    expect(regionTransform('top-end', {})).toBeUndefined()
    expect(regionTransform('top-end', { x: 0, y: 0 })).toBeUndefined()
  })

  it('shifts by signed physical pixels on corner regions', () => {
    expect(regionTransform('top-end', { x: 12, y: -8 })).toBe('translate(12px, -8px)')
    expect(regionTransform('bottom-start', { x: -30, y: 0 })).toBe('translate(-30px, 0px)')
  })

  it('resolves percent against the viewport', () => {
    expect(regionTransform('top-end', { x: 10, y: 5, unit: 'percent' })).toBe('translate(10vw, 5vh)')
    expect(regionTransform('bottom-start', { x: -2.5, y: 1.25, unit: 'percent' })).toBe('translate(-2.5vw, 1.25vh)')
  })

  it('keeps the centering on the centered regions', () => {
    expect(regionTransform('top', { x: 12, y: -8 })).toBe('translateX(calc(-50% + 12px)) translateY(-8px)')
    expect(regionTransform('bottom', { x: 0, y: 24 })).toBe('translateX(calc(-50% + 0px)) translateY(24px)')
    expect(regionTransform('bottom', { x: 10, y: 0, unit: 'percent' })).toBe(
      'translateX(calc(-50% + 10vw)) translateY(0vh)',
    )
  })

  it('treats a missing axis as zero', () => {
    expect(regionTransform('top-start', { x: 8 })).toBe('translate(8px, 0px)')
    expect(regionTransform('top-start', { y: -8 })).toBe('translate(0px, -8px)')
  })
})
