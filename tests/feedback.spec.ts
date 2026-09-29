import { describe, expect, it } from 'vitest'
import { createQueue, QUEUE_POSITIONS } from '../src/core/queue'
import type { QueueEntry, QueuePosition } from '../src/core/queue'
import {
  fromKeyboardEvent,
  serializeHotkey,
  parseHotkey,
  normalizeKeyName,
  findHotkeyConflicts,
  isRecordableHotkey,
  hotkeysEqual,
  describeHotkey,
} from '../src/core/hotkey'
import { createTypeaheadBuffer } from '../src/core/roving'

describe('feedback queue', () => {
  function makeQueue(now: { value: number }, options: Parameters<typeof createQueue>[0] = {}) {
    return createQueue({ now: () => now.value, createId: (() => {
      let n = 0
      return () => `id-${++n}`
    })(), ...options })
  }

  it('pushes entries with defaults', () => {
    const now = { value: 0 }
    const queue = makeQueue(now)
    const { entry } = queue.push({})
    expect(entry.position).toBe('top-end')
    expect(entry.duration).toBe(5000)
    expect(queue.count()).toBe(1)
  })

  it('keeps duration 0 entries alive forever (notifications)', () => {
    const now = { value: 0 }
    const queue = makeQueue(now, { defaultDuration: 0 })
    queue.push({})
    now.value = 1_000_000
    expect(queue.due()).toEqual([])
  })

  it('reports auto-dismissable entries as due once the delay elapsed', () => {
    const now = { value: 0 }
    const queue = makeQueue(now)
    queue.push({ duration: 1000 })
    now.value = 999
    expect(queue.due()).toEqual([])
    now.value = 1000
    expect(queue.due()).toEqual(['id-1'])
  })

  it('pauses and resumes the countdown', () => {
    const now = { value: 0 }
    const queue = makeQueue(now)
    queue.push({ duration: 1000 })
    now.value = 600
    queue.pause('id-1')
    now.value = 5000
    expect(queue.due()).toEqual([])
    expect(queue.isPaused('id-1')).toBe(true)

    queue.resume('id-1')
    now.value = 5400
    expect(queue.due()).toEqual(['id-1'])
  })

  it('evicts the oldest auto-dismissing entry past the cap', () => {
    const now = { value: 0 }
    const queue = makeQueue(now, { maxVisible: 2 })
    queue.push({ duration: 1000 })
    now.value = 1
    queue.push({ duration: 1000 })
    now.value = 2
    const { evicted } = queue.push({ duration: 1000 })
    expect(evicted.map((entry: QueueEntry) => entry.id)).toEqual(['id-1'])
    expect(queue.count()).toBe(2)
  })

  it('never evicts a permanent notification to make room for a toast', () => {
    const now = { value: 0 }
    const queue = makeQueue(now, { maxVisible: 1 })
    queue.push({ duration: 0 })
    now.value = 1
    const { evicted } = queue.push({ duration: 1000 })
    // The permanent one stays; the incoming toast is the one dropped.
    expect(evicted.map((entry: QueueEntry) => entry.duration)).toEqual([1000])
    const remaining = queue.list()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.duration).toBe(0)
  })

  it('groups by position and sorts by creation time', () => {
    const now = { value: 0 }
    const queue = makeQueue(now)
    queue.push({ position: 'bottom-start' })
    now.value = 1
    queue.push({ position: 'top-end' })
    now.value = 2
    queue.push({ position: 'top-end' })
    expect(queue.list('top-end').map((entry: QueueEntry) => entry.id)).toEqual(['id-2', 'id-3'])
    expect(queue.count('bottom-start')).toBe(1)
  })

  it('clears one position or everything', () => {
    const now = { value: 0 }
    const queue = makeQueue(now)
    queue.push({ position: 'top' as QueuePosition })
    queue.push({ position: 'bottom' as QueuePosition })
    expect(queue.clear('top')).toHaveLength(1)
    expect(queue.count()).toBe(1)
    expect(queue.clear()).toHaveLength(1)
    expect(queue.count()).toBe(0)
  })

  it('dismisses and updates by id', () => {
    const now = { value: 0 }
    const queue = makeQueue(now)
    queue.push({ duration: 1000 })
    queue.update('id-1', { duration: 100 })
    now.value = 100
    expect(queue.due()).toEqual(['id-1'])
    expect(queue.dismiss('id-1')?.id).toBe('id-1')
    expect(queue.dismiss('id-1')).toBeNull()
  })

  it('exposes the six documented positions', () => {
    expect(QUEUE_POSITIONS).toEqual(['top-start', 'top', 'top-end', 'bottom-start', 'bottom', 'bottom-end'])
  })

  it('notifies subscribers', () => {
    const now = { value: 0 }
    const queue = makeQueue(now)
    let calls = 0
    const off = queue.subscribe(() => {
      calls += 1
    })
    queue.push({})
    queue.dismiss('id-1')
    off()
    queue.push({})
    expect(calls).toBe(2)
  })
})

describe('hotkey normalization', () => {
  it('canonicalises key names', () => {
    expect(normalizeKeyName('esc')).toBe('Escape')
    expect(normalizeKeyName('ArrowUp')).toBe('ArrowUp')
    expect(normalizeKeyName('k')).toBe('K')
    expect(normalizeKeyName('f5')).toBe('F5')
    expect(normalizeKeyName('KeyA')).toBe('A')
    expect(normalizeKeyName('Space')).toBe('Space')
  })

  it('builds parts from a keyboard event', () => {
    const parts = fromKeyboardEvent({ key: 'k', ctrlKey: true, altKey: false, shiftKey: true, metaKey: false })
    expect(parts).toEqual({ ctrl: true, alt: false, shift: true, meta: false, key: 'K' })
  })

  it('serializes in a stable modifier order', () => {
    const parts = fromKeyboardEvent({ key: 'k', ctrlKey: true, altKey: true, shiftKey: true, metaKey: true })
    expect(serializeHotkey(parts)).toBe('Ctrl+Alt+Shift+Meta+K')
  })

  it('serializes symbols and native names', () => {
    const parts = { ctrl: true, alt: false, shift: true, meta: false, key: 'K' }
    expect(serializeHotkey(parts, 'symbol')).toBe('⌃⇧K')
    expect(serializeHotkey(parts, 'native')).toBe('Ctrl+Shift+K')
  })

  it('round-trips through parse', () => {
    const parts = parseHotkey('Ctrl+Shift+K')
    expect(parts).not.toBeNull()
    expect(serializeHotkey(parts as never)).toBe('Ctrl+Shift+K')
  })

  it('parses a bare key', () => {
    expect(parseHotkey('F5')).toEqual({ ctrl: false, alt: false, shift: false, meta: false, key: 'F5' })
    expect(parseHotkey('')).toBeNull()
  })

  it('compares combinations', () => {
    const a = { ctrl: true, alt: false, shift: false, meta: false, key: 'K' }
    const b = { ctrl: true, alt: false, shift: false, meta: false, key: 'K' }
    const c = { ctrl: false, alt: false, shift: false, meta: false, key: 'K' }
    expect(hotkeysEqual(a, b)).toBe(true)
    expect(hotkeysEqual(a, c)).toBe(false)
  })

  it('finds conflicts among existing bindings', () => {
    const bindings = [
      { id: 'save', hotkey: { ctrl: true, alt: false, shift: false, meta: false, key: 'S' } },
      { id: 'open', hotkey: { ctrl: true, alt: false, shift: false, meta: false, key: 'O' } },
    ]
    expect(findHotkeyConflicts(bindings, { ctrl: true, alt: false, shift: false, meta: false, key: 'S' })).toEqual(['save'])
    expect(findHotkeyConflicts(bindings, { ctrl: true, alt: false, shift: false, meta: false, key: 'X' })).toEqual([])
  })

  it('rejects combinations that would swallow typing', () => {
    expect(isRecordableHotkey({ ctrl: false, alt: false, shift: false, meta: false, key: 'K' })).toBe(false)
    expect(isRecordableHotkey({ ctrl: false, alt: false, shift: true, meta: false, key: 'K' })).toBe(true)
    expect(isRecordableHotkey({ ctrl: true, alt: false, shift: false, meta: false, key: 'K' })).toBe(true)
    expect(isRecordableHotkey({ ctrl: false, alt: false, shift: false, meta: false, key: 'F5' })).toBe(true)
    expect(isRecordableHotkey({ ctrl: false, alt: false, shift: false, meta: false, key: 'Shift' })).toBe(false)
  })

  it('describes a combination for screen readers', () => {
    expect(describeHotkey({ ctrl: true, alt: false, shift: true, meta: false, key: 'K' })).toBe(
      'Control plus Shift plus K',
    )
  })
})

describe('typeahead buffer timeout', () => {
  it('clears after the window', () => {
    let now = 0
    const buffer = createTypeaheadBuffer(400, () => now)
    expect(buffer.push('a')).toBe('a')
    now = 100
    expect(buffer.push('b')).toBe('ab')
    now = 600
    expect(buffer.value()).toBe('')
  })
})
