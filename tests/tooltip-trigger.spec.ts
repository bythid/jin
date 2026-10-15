import { describe, expect, it, vi } from 'vitest'
import { createTooltipTrigger, type TriggerMachine, type TriggerState } from '../src/core/tooltip-trigger'

function machine(delays: { open?: number; close?: number; disabled?: () => boolean } = {}): TriggerMachine {
  return createTooltipTrigger({
    openDelay: () => delays.open ?? 300,
    closeDelay: () => delays.close ?? 80,
    disabled: delays.disabled ?? (() => false),
  })
}

function openByHover(m: TriggerMachine): void {
  m.event('hover-enter')
  m.event('open-due')
}

describe('overview, hover channel', () => {
  it('does not open for a swipe-through: leaving cancels the pending open', () => {
    const m = machine()
    m.event('hover-enter')
    expect(m.state().phase).toBe('open-pending')
    m.event('hover-leave')
    expect(m.state().phase).toBe('closed')
  })

  it('commits on open-due and closes lingering through close-pending', () => {
    const m = machine()
    m.event('hover-enter')
    m.event('open-due')
    expect(m.state().phase).toBe('open')
    m.event('hover-leave')
    expect(m.state().phase).toBe('close-pending')
    m.event('close-due')
    expect(m.state().phase).toBe('closed')
  })

  it('a zero open delay commits immediately, a zero close delay closes immediately', () => {
    const m = machine({ open: 0 })
    m.event('hover-enter')
    expect(m.state().phase).toBe('open')

    const fast = machine({ open: 0, close: 0 })
    openByHover(fast)
    fast.event('hover-leave')
    expect(fast.state().phase).toBe('closed')
  })

  it('re-entering during the close linger keeps it open without a fresh open delay', () => {
    const m = machine()
    openByHover(m)
    m.event('hover-leave')
    expect(m.state().phase).toBe('close-pending')
    m.event('hover-enter')
    expect(m.state().phase).toBe('open')
  })

  it('an open-due whose intent already left closes instead of opening', () => {
    const m = machine()
    m.event('hover-enter')
    m.event('hover-leave') // the host cleared the timer; the event still races in
    m.event('open-due')
    expect(m.state().phase).toBe('closed')
  })
})

describe('two intents', () => {
  it('hover keeps the tooltip open after focus leaves', () => {
    const m = machine()
    openByHover(m)
    m.event('focus-enter')
    m.event('focus-leave')
    expect(m.state().phase).toBe('open')
    m.event('hover-leave')
    expect(m.state().phase).toBe('close-pending')
  })

  it('focus opens it for keyboard users, same delays, same commits', () => {
    const m = machine()
    m.event('focus-enter')
    expect(m.state().phase).toBe('open-pending')
    m.event('open-due')
    expect(m.state().phase).toBe('open')
  })
})

describe('press and escape suppression', () => {
  it('a press closes at once and the click focus does not re-open it', () => {
    const m = machine()
    openByHover(m)
    m.event('press')
    expect(m.state().phase).toBe('closed')
    // The click moves focus into the anchor: intent arrives while suppressed.
    m.event('focus-enter')
    m.event('open-due')
    expect(m.state().phase).toBe('closed')
  })

  it('suppression ends at the next leave; a later enter opens again', () => {
    const m = machine()
    openByHover(m)
    m.event('press')
    m.event('hover-leave')
    expect(m.state().phase).toBe('closed')
    m.event('hover-enter')
    expect(m.state().phase).toBe('open-pending')
  })

  it('an escape stays suppressed while focus remains inside the anchor', () => {
    const m = machine()
    openByHover(m)
    m.event('escape')
    expect(m.state().phase).toBe('closed')
    // Focus is still on the inner control; a passive presence must not undo
    // the escape — only a fresh boundary may.
    m.event('open-due')
    expect(m.state().phase).toBe('closed')
    m.event('focus-leave')
    m.event('focus-enter')
    expect(m.state().phase).toBe('open-pending')
  })

  it('a press on a hovering-closed anchor keeps it closed until re-enter', () => {
    const m = machine()
    m.event('press')
    m.event('hover-leave')
    m.event('hover-enter')
    expect(m.state().phase).toBe('open-pending')
  })
})

describe('external events', () => {
  it('dismiss closes an open tooltip without a linger', () => {
    const m = machine()
    openByHover(m)
    m.event('dismiss')
    expect(m.state().phase).toBe('closed')
  })

  it('reset clears intents, suppression and phase', () => {
    const m = machine()
    openByHover(m)
    m.event('dismiss')
    m.event('reset')
    expect(m.state()).toEqual({ hovering: false, focused: false, phase: 'closed', suppressed: false })
  })
})

describe('disabled', () => {
  it('never opens and resets through the disabled watch', () => {
    let disabled = true
    const m = machine({ disabled: () => disabled })
    m.event('hover-enter')
    m.event('open-due')
    expect(m.state().phase).toBe('closed')

    disabled = false
    m.event('reset')
    m.event('hover-enter')
    expect(m.state().phase).toBe('open-pending')
  })
})

describe('subscribers', () => {
  it('notifies on changes only, with a snapshot', () => {
    const m = machine()
    const listener = vi.fn()
    m.subscribe(listener)
    m.event('hover-enter')
    expect(listener).toHaveBeenCalledTimes(1)
    const snap = m.state()
    m.event('hover-enter')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(snap.hovering).toBe(true)
  })

  it('an unsubscribe stops the notifications', () => {
    const m = machine()
    const listener = vi.fn()
    const stop = m.subscribe(listener)
    stop()
    m.event('hover-enter')
    expect(listener).not.toHaveBeenCalled()
  })

  it('the snapshot is a copy, not the live state', () => {
    const m = machine()
    const snap = m.state() as TriggerState
    m.event('hover-enter')
    expect(snap.hovering).toBe(false)
  })
})
