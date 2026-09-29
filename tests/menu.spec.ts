import { describe, expect, it } from 'vitest'
import { createTypeaheadBuffer, nextRovingIndex } from '../src/core/roving'
import { flattenMenu, menuNavigate, nextRowId, typeaheadRowId, isMenuEntrySelectable } from '../src/core/menu'
import type { MenuEntry } from '../src/core/menu'

describe('nextRovingIndex', () => {
  it('moves vertically and horizontally in both orientations', () => {
    expect(nextRovingIndex('ArrowDown', 1, 3, { orientation: 'vertical' })).toBe(2)
    expect(nextRovingIndex('ArrowDown', 1, 3, { orientation: 'horizontal' })).toBeNull()
    expect(nextRovingIndex('ArrowRight', 1, 3, { orientation: 'horizontal' })).toBe(2)
    expect(nextRovingIndex('ArrowUp', 1, 3, { orientation: 'vertical' })).toBe(0)
  })

  it('wraps by default and clamps when loop is off', () => {
    expect(nextRovingIndex('ArrowDown', 2, 3, { loop: true })).toBe(0)
    expect(nextRovingIndex('ArrowDown', 2, 3, { loop: false })).toBe(2)
    expect(nextRovingIndex('ArrowUp', 0, 3, { loop: true })).toBe(2)
    expect(nextRovingIndex('ArrowUp', 0, 3, { loop: false })).toBe(0)
  })

  it('jumps to the edges', () => {
    expect(nextRovingIndex('Home', 2, 5)).toBe(0)
    expect(nextRovingIndex('End', 2, 5)).toBe(4)
  })

  it('swaps horizontal direction in RTL', () => {
    expect(nextRovingIndex('ArrowRight', 1, 3, { orientation: 'horizontal', rtl: false })).toBe(2)
    expect(nextRovingIndex('ArrowRight', 1, 3, { orientation: 'horizontal', rtl: true })).toBe(0)
    expect(nextRovingIndex('ArrowLeft', 1, 3, { orientation: 'horizontal', rtl: true })).toBe(2)
  })

  it('returns null for an empty group', () => {
    expect(nextRovingIndex('ArrowDown', 0, 0)).toBeNull()
  })

  it('pages without wrapping off the edge', () => {
    expect(nextRovingIndex('PageDown', 0, 20)).toBe(5)
    expect(nextRovingIndex('PageUp', 1, 20)).toBe(0)
  })
})

describe('typeahead buffer', () => {
  it('accumulates consecutive keystrokes', () => {
    const buffer = createTypeaheadBuffer(500, () => 0)
    expect(buffer.push('a')).toBe('a')
    expect(buffer.push('b')).toBe('ab')
  })

  it('resets after the timeout', () => {
    let now = 0
    const buffer = createTypeaheadBuffer(500, () => now)
    buffer.push('a')
    now = 600
    expect(buffer.push('b')).toBe('b')
  })
})

const items: MenuEntry[] = [
  { id: 'open', label: 'Open' },
  { id: 'sep', type: 'separator' },
  { id: 'recent', label: 'Recent', items: [{ id: 'r1', label: 'Report.txt' }, { id: 'r2', label: 'Notes.md' }] },
  { id: 'disabled', label: 'Disabled', disabled: true },
  { id: 'delete', label: 'Delete', danger: true },
]

describe('flattenMenu', () => {
  it('only shows submenu children when the parent is open', () => {
    expect(flattenMenu(items).map((row) => row.id)).toEqual(['open', 'sep', 'recent', 'disabled', 'delete'])
    expect(flattenMenu(items, ['recent']).map((row) => row.id)).toEqual([
      'open',
      'sep',
      'recent',
      'r1',
      'r2',
      'disabled',
      'delete',
    ])
  })

  it('records depth and parentage for children', () => {
    const rows = flattenMenu(items, ['recent'])
    const child = rows.find((row) => row.id === 'r1')
    expect(child?.depth).toBe(1)
    expect(child?.parentId).toBe('recent')
    expect(child?.path).toEqual(['recent'])
  })

  it('marks separators and labels as unselectable', () => {
    expect(isMenuEntrySelectable({ id: 's', type: 'separator' })).toBe(false)
    expect(isMenuEntrySelectable({ id: 'l', type: 'label' })).toBe(false)
    expect(isMenuEntrySelectable({ id: 'i', label: 'x' })).toBe(true)
    expect(isMenuEntrySelectable({ id: 'd', label: 'x', disabled: true })).toBe(false)
  })
})

describe('nextRowId', () => {
  const rows = flattenMenu(items)

  it('skips separators and disabled rows', () => {
    expect(nextRowId(rows, 'open', 1)).toBe('recent')
    expect(nextRowId(rows, 'recent', 1)).toBe('delete')
  })

  it('wraps by default', () => {
    expect(nextRowId(rows, 'delete', 1)).toBe('open')
  })

  it('stays inside a submenu when asked', () => {
    const withSub = flattenMenu(items, ['recent'])
    expect(nextRowId(withSub, 'r2', 1, { withinParent: 'recent' })).toBe('r1')
    expect(nextRowId(withSub, 'r1', -1, { withinParent: 'recent' })).toBe('r2')
  })
})

describe('typeaheadRowId', () => {
  const rows = flattenMenu(items)

  it('matches from the start of a label', () => {
    expect(typeaheadRowId(rows, 'O', null)).toBe('open')
  })

  it('applies the query to the row after the active one, wrapping around', () => {
    // With a single R-match, pressing R again re-selects it rather than
    // getting stuck — the query itself is not consumed, repeating the key
    // cycles through the matches.
    expect(typeaheadRowId(rows, 'R', null)).toBe('recent')
    expect(typeaheadRowId(rows, 'R', 'recent')).toBe('recent')
  })

  it('never matches a disabled row', () => {
    expect(typeaheadRowId(rows, 'D', null)).toBe('delete')
  })
})

describe('menuNavigate', () => {
  it('moves down and up through selectable rows', () => {
    const rows = flattenMenu(items)
    expect(menuNavigate('ArrowDown', rows, 'open')).toEqual({ type: 'move', toId: 'recent' })
    expect(menuNavigate('ArrowUp', rows, 'recent')).toEqual({ type: 'move', toId: 'open' })
  })

  it('opens a submenu with the horizontal arrow and closes it again', () => {
    const rows = flattenMenu(items)
    expect(menuNavigate('ArrowRight', rows, 'recent')).toEqual({ type: 'open-submenu', id: 'recent' })
    const open = flattenMenu(items, ['recent'])
    expect(menuNavigate('ArrowLeft', open, 'recent', ['recent'])).toEqual({ type: 'close-submenu', id: 'recent' })
  })

  it('leaves a submenu from a child with the horizontal arrow', () => {
    const rows = flattenMenu(items, ['recent'])
    expect(menuNavigate('ArrowLeft', rows, 'r1', ['recent'])).toEqual({ type: 'close-submenu', id: 'recent' })
  })

  it('activates a leaf and opens a branch on Enter', () => {
    const rows = flattenMenu(items)
    expect(menuNavigate('Enter', rows, 'open')).toEqual({ type: 'activate', id: 'open' })
    expect(menuNavigate('Enter', rows, 'recent')).toEqual({ type: 'open-submenu', id: 'recent' })
  })

  it('Escape closes the deepest open submenu first, then the menu', () => {
    const open = flattenMenu(items, ['recent'])
    expect(menuNavigate('Escape', open, 'r1', ['recent'])).toEqual({ type: 'close-submenu', id: 'recent' })
    const closed = flattenMenu(items)
    expect(menuNavigate('Escape', closed, 'open', [])).toEqual({ type: 'close-all' })
  })

  it('does nothing for keys it does not own', () => {
    const rows = flattenMenu(items)
    expect(menuNavigate('F5', rows, 'open')).toEqual({ type: 'none' })
  })

  it('ignores Enter on a disabled or separator row', () => {
    const rows = flattenMenu(items)
    expect(menuNavigate('Enter', rows, 'disabled')).toEqual({ type: 'none' })
    expect(menuNavigate('Enter', rows, 'sep')).toEqual({ type: 'none' })
  })

  it('supports Home and End', () => {
    const rows = flattenMenu(items)
    expect(menuNavigate('Home', rows, 'delete')).toEqual({ type: 'move', toId: 'open' })
    expect(menuNavigate('End', rows, 'open')).toEqual({ type: 'move', toId: 'delete' })
  })
})
