import { beforeEach, describe, expect, it } from 'vitest'
import { createOverlayStack } from '../src/core/overlay-stack'
import { decideDismiss } from '../src/core/dismissable'
import { stepIndex, resolveInitialFocusIndex, resolveFocusReturn } from '../src/core/focus'

describe('overlay stack', () => {
  let stack: ReturnType<typeof createOverlayStack>

  beforeEach(() => {
    stack = createOverlayStack({ readToken: () => '1000' })
  })

  it('assigns increasing z-index within a layer', () => {
    const first = stack.open({ layer: 'dropdown' })
    const second = stack.open({ layer: 'dropdown' })
    expect(second.zIndex).toBeGreaterThan(first.zIndex)
  })

  it('layers modal above dropdown regardless of open order', () => {
    const dropdown = stack.open({ layer: 'dropdown' })
    const modal = stack.open({ layer: 'modal' })
    expect(modal.zIndex).toBeGreaterThan(dropdown.zIndex)
  })

  it('reports the topmost entry', () => {
    stack.open({ layer: 'dropdown', id: 'a' })
    stack.open({ layer: 'modal', id: 'b' })
    expect(stack.topmost()?.id).toBe('b')
    expect(stack.isTopmost('a')).toBe(false)
    expect(stack.isTopmost('b')).toBe(true)
  })

  it('routes Escape to the topmost overlay only', () => {
    const closed: string[] = []
    stack.open({ layer: 'dropdown', id: 'a', onDismiss: () => closed.push('a') })
    stack.open({ layer: 'modal', id: 'b', onDismiss: () => closed.push('b') })

    expect(stack.handleEscape()).toBe(true)
    expect(closed).toEqual(['b'])
    expect(stack.count()).toBe(1)

    stack.handleEscape()
    expect(closed).toEqual(['b', 'a'])
    expect(stack.count()).toBe(0)
  })

  it('swallows Escape for an overlay that opted out', () => {
    const closed: string[] = []
    stack.open({ layer: 'dropdown', id: 'a', onDismiss: () => closed.push('a') })
    stack.open({ layer: 'modal', id: 'b', dismissOnEsc: false, onDismiss: () => closed.push('b') })

    expect(stack.handleEscape()).toBe(true)
    expect(closed).toEqual([])
    expect(stack.count()).toBe(2)
  })

  it('returns false when nothing is open', () => {
    expect(stack.handleEscape()).toBe(false)
  })

  it('chooses the topmost outside-clickable overlay', () => {
    stack.open({ layer: 'dropdown', id: 'a' })
    stack.open({ layer: 'dropdown', id: 'b' })
    const target = stack.handleOutside((id) => id === 'b', {})
    // The click landed inside b, so nothing closes.
    expect(target).toBeNull()
    expect(stack.handleOutside((id) => id === 'a', {})).toBe('b')
  })

  it('tracks modal presence for scroll lock', () => {
    expect(stack.hasModal()).toBe(false)
    stack.open({ layer: 'dropdown' })
    expect(stack.hasModal()).toBe(false)
    stack.open({ layer: 'modal', modal: true })
    expect(stack.hasModal()).toBe(true)
    expect(stack.topmostModalId()).not.toBeNull()
  })

  it('notifies subscribers of every change', () => {
    let count = 0
    const unsubscribe = stack.subscribe(() => {
      count += 1
    })
    const entry = stack.open({ layer: 'dropdown' })
    stack.close(entry.id)
    unsubscribe()
    stack.open({ layer: 'dropdown' })
    expect(count).toBe(2)
  })

  it('closing a missing id is a no-op', () => {
    expect(stack.close('nope')).toBe(false)
  })
})

describe('dismiss rules', () => {
  const base = { closeOnEsc: true, closeOnOutside: true, isTopmost: true }

  it('dismisses on escape when allowed', () => {
    expect(decideDismiss(base, 'escape')).toBe('dismiss')
  })

  it('ignores escape for a non-topmost overlay', () => {
    expect(decideDismiss({ ...base, isTopmost: false }, 'escape')).toBe('ignore')
  })

  it('ignores everything while disabled', () => {
    expect(decideDismiss({ ...base, disabled: true }, 'escape')).toBe('ignore')
    expect(decideDismiss({ ...base, disabled: true }, 'outside')).toBe('ignore')
  })

  it('honours the individual flags', () => {
    expect(decideDismiss({ ...base, closeOnEsc: false }, 'escape')).toBe('ignore')
    expect(decideDismiss({ ...base, closeOnOutside: false }, 'outside')).toBe('ignore')
  })
})

describe('focus decisions', () => {
  it('steps with wrap-around', () => {
    expect(stepIndex(0, 3, -1, true)).toBe(2)
    expect(stepIndex(2, 3, 1, true)).toBe(0)
    expect(stepIndex(0, 3, -1, false)).toBe(0)
    expect(stepIndex(2, 3, 1, false)).toBe(2)
  })

  it('returns -1 for an empty group', () => {
    expect(stepIndex(0, 0, 1, true)).toBe(-1)
  })

  it('resolves the initial focus target', () => {
    expect(resolveInitialFocusIndex(3, 'first')).toBe(0)
    expect(resolveInitialFocusIndex(3, 'last')).toBe(2)
    expect(resolveInitialFocusIndex(0, 'first')).toBeNull()
    expect(resolveInitialFocusIndex(3, 'container')).toBeNull()
    expect(resolveInitialFocusIndex(3, 'none')).toBeNull()
  })

  it('prefers the trigger and falls back when it is gone', () => {
    expect(resolveFocusReturn({ isConnected: true, isFocusable: true })).toBe('trigger')
    expect(
      resolveFocusReturn({ isConnected: false, isFocusable: false }, { isConnected: true, isFocusable: true }),
    ).toBe('fallback')
    // A trigger that is still on the page but cannot take focus (it became
    // disabled) is worse than a focusable fallback: focusing it would silently
    // drop focus onto <body>.
    expect(
      resolveFocusReturn({ isConnected: true, isFocusable: false }, { isConnected: true, isFocusable: true }),
    ).toBe('fallback')
    expect(resolveFocusReturn(null, null)).toBeNull()
    expect(resolveFocusReturn({ isConnected: false, isFocusable: true }, null)).toBeNull()
  })
})
