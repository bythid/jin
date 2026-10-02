import { describe, expect, it } from 'vitest'
import { closeButtonSide } from '../src/core/platform'

const mac =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)'
const iphone =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)'
const windows =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const linux =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

describe('closeButtonSide', () => {
  it('keeps the close at the top-left on Apple platforms', () => {
    expect(closeButtonSide(mac)).toBe('left')
    expect(closeButtonSide(iphone)).toBe('left')
  })

  it('keeps the close at the top-right on Windows and Linux', () => {
    expect(closeButtonSide(windows)).toBe('right')
    expect(closeButtonSide(linux)).toBe('right')
  })

  it('falls back to the right for an unknown agent', () => {
    expect(closeButtonSide('')).toBe('right')
    expect(closeButtonSide('weird-but-not-apple')).toBe('right')
  })
})
