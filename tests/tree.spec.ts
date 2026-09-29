import { describe, expect, it } from 'vitest'
import {
  applyLoadFailure,
  applyLoadStart,
  applyLoadSuccess,
  childrenOf,
  createTreeState,
  expandableIds,
  flattenTree,
  hasChildrenOf,
  navigateTree,
  shouldLoad,
  typeaheadTreeRowId,
} from '../src/core/tree'
import type { TreeNode } from '../src/core/tree'

const nodes: TreeNode[] = [
  {
    id: 'a',
    label: 'Alpha',
    children: [
      { id: 'a1', label: 'Alpha one' },
      { id: 'a2', label: 'Alpha two', children: [{ id: 'a2x', label: 'Deep' }] },
    ],
  },
  { id: 'b', label: 'Beta', hasChildren: true },
  { id: 'c', label: 'Gamma', disabled: true },
]

describe('flattenTree', () => {
  it('shows only the roots when nothing is expanded', () => {
    const rows = flattenTree(nodes, createTreeState())
    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
  })

  it('descends into expanded branches', () => {
    const rows = flattenTree(nodes, createTreeState({ expanded: ['a'] }))
    expect(rows.map((row) => row.id)).toEqual(['a', 'a1', 'a2', 'b', 'c'])
  })

  it('descends multiple levels', () => {
    const rows = flattenTree(nodes, createTreeState({ expanded: ['a', 'a2'] }))
    expect(rows.map((row) => row.id)).toEqual(['a', 'a1', 'a2', 'a2x', 'b', 'c'])
  })

  it('reports level, setsize and posinset for the a11y attributes', () => {
    const rows = flattenTree(nodes, createTreeState({ expanded: ['a'] }))
    const a2 = rows.find((row) => row.id === 'a2')
    expect(a2?.level).toBe(2)
    expect(a2?.setsize).toBe(2)
    expect(a2?.posinset).toBe(2)
    expect(a2?.depth).toBe(1)
  })

  it('keeps the parent setsize for the root level', () => {
    const rows = flattenTree(nodes, createTreeState())
    expect(rows[0]?.setsize).toBe(3)
    expect(rows[2]?.posinset).toBe(3)
  })

  it('marks loading and failed rows', () => {
    const state = createTreeState({ loading: ['b'], failed: ['a'] })
    const rows = flattenTree(nodes, state)
    expect(rows.find((row) => row.id === 'b')?.loading).toBe(true)
    expect(rows.find((row) => row.id === 'a')?.failed).toBe(true)
  })
})

describe('lazy loading state machine', () => {
  it('identifies a lazy branch that has never been loaded', () => {
    const state = createTreeState()
    expect(shouldLoad(nodes[1] as TreeNode, state)).toBe(true)
    // A node with inline children never needs loading.
    expect(shouldLoad(nodes[0] as TreeNode, state)).toBe(false)
  })

  it('does not re-load while loading or after success', () => {
    const loading = applyLoadStart(createTreeState(), 'b')
    expect(shouldLoad(nodes[1] as TreeNode, loading)).toBe(false)
    const done = applyLoadSuccess(loading, 'b', [{ id: 'b1', label: 'Beta one' }])
    expect(shouldLoad(nodes[1] as TreeNode, done)).toBe(false)
  })

  it('expands the parent on a successful load', () => {
    const done = applyLoadSuccess(applyLoadStart(createTreeState(), 'b'), 'b', [{ id: 'b1', label: 'Beta one' }])
    expect(done.expanded).toContain('b')
    expect(done.loading).not.toContain('b')
    expect(childrenOf(nodes[1] as TreeNode, done)?.map((child) => child.id)).toEqual(['b1'])
  })

  it('rolls back to "not loaded" on failure and records the failure', () => {
    const started = applyLoadStart(createTreeState({ expanded: ['b'] }), 'b')
    const failed = applyLoadFailure(started, 'b')
    expect(failed.expanded).not.toContain('b')
    expect(failed.loading).not.toContain('b')
    expect(failed.failed).toContain('b')
    // Back to a state where a retry is a fresh attempt.
    expect(shouldLoad(nodes[1] as TreeNode, failed)).toBe(true)
  })

  it('clears the failure flag when a retry starts', () => {
    const failed = applyLoadFailure(createTreeState(), 'b')
    const retry = applyLoadStart(failed, 'b')
    expect(retry.failed).not.toContain('b')
  })

  it('loaded children replace inline children for expansion checks', () => {
    const empty = applyLoadSuccess(createTreeState(), 'b', [])
    expect(childrenOf(nodes[1] as TreeNode, empty)).toEqual([])
    expect(hasChildrenOf(nodes[1] as TreeNode, empty)).toBe(false)
  })

  it('prefers application children over a previous load result', () => {
    // `node.children` wins over the load cache: a branch that has been fetched
    // once must still render new children after the application re-scans.
    const loaded = applyLoadSuccess(createTreeState(), 'b', [{ id: 'b1', label: 'Old' }])
    const rescanned: TreeNode = { id: 'b', label: 'Beta', children: [{ id: 'b2', label: 'New' }] }
    expect(childrenOf(rescanned, loaded)?.map((child) => child.id)).toEqual(['b2'])
  })

  it('treats explicit empty children as authoritative', () => {
    // A branch the application has pruned (children: []) is a leaf, not a
    // branch with one more level of cached rows.
    const loaded = applyLoadSuccess(createTreeState(), 'b', [{ id: 'b1', label: 'Old' }])
    const pruned: TreeNode = { id: 'b', label: 'Beta', children: [] }
    expect(childrenOf(pruned, loaded)).toEqual([])
    expect(hasChildrenOf(pruned, loaded)).toBe(false)
  })
})

describe('navigateTree', () => {
  const state = createTreeState({ expanded: ['a'] })
  const rows = flattenTree(nodes, state)

  it('moves down and up, skipping disabled rows', () => {
    expect(navigateTree('ArrowDown', rows, 'a').activeId).toBe('a1')
    expect(navigateTree('ArrowDown', rows, 'a2').activeId).toBe('b')
    expect(navigateTree('ArrowUp', rows, 'b').activeId).toBe('a2')
  })

  it('does not move past the ends', () => {
    // 'b' is the last enabled row; 'c' is disabled and therefore not a stop.
    expect(navigateTree('ArrowDown', rows, 'b').activeId).toBe('b')
    expect(navigateTree('ArrowUp', rows, 'a').activeId).toBe('a')
  })

  it('does not let a disabled row become an arrow-key stop', () => {
    expect(navigateTree('ArrowDown', rows, 'c').activeId).toBe('a')
  })

  it('jumps to the first and last enabled rows', () => {
    expect(navigateTree('Home', rows, 'b').activeId).toBe('a')
    expect(navigateTree('End', rows, 'a').activeId).toBe('b')
  })

  it('expands a collapsed branch with the right arrow', () => {
    const collapsed = flattenTree(nodes, createTreeState())
    expect(navigateTree('ArrowRight', collapsed, 'b')).toEqual({
      activeId: 'b',
      toggle: { id: 'b', expanded: true },
    })
  })

  it('steps into the first child when already expanded', () => {
    expect(navigateTree('ArrowRight', rows, 'a')).toEqual({ activeId: 'a1', toggle: null })
  })

  it('collapses with the left arrow, then moves to the parent', () => {
    expect(navigateTree('ArrowLeft', rows, 'a')).toEqual({
      activeId: 'a',
      toggle: { id: 'a', expanded: false },
    })
    expect(navigateTree('ArrowLeft', rows, 'a1')).toEqual({ activeId: 'a', toggle: null })
  })

  it('does nothing on a leaf with no parent', () => {
    const collapsed = flattenTree(nodes, createTreeState())
    expect(navigateTree('ArrowLeft', collapsed, 'b')).toEqual({ activeId: 'b', toggle: null })
  })

  it('anchors a missing active row at the first selectable row', () => {
    // With no active row, focus alone must still drive the tree: the arrows
    // cannot be no-ops, return a dead first press, or jump to the last row.
    const collapsed = flattenTree(nodes, createTreeState())
    expect(navigateTree('ArrowRight', collapsed, null)).toEqual({
      activeId: 'a',
      toggle: { id: 'a', expanded: true },
    })
    expect(navigateTree('ArrowUp', collapsed, null)).toEqual({ activeId: 'a', toggle: null })
    expect(navigateTree('ArrowDown', collapsed, null)).toEqual({ activeId: 'b', toggle: null })
    // A stale id (the row is gone) behaves like no active row at all.
    expect(navigateTree('ArrowRight', collapsed, 'gone')).toEqual({
      activeId: 'a',
      toggle: { id: 'a', expanded: true },
    })
  })
})

describe('typeahead and expandable ids', () => {
  it('matches by label from the active row', () => {
    const rows = flattenTree(nodes, createTreeState({ expanded: ['a'] }))
    expect(typeaheadTreeRowId(rows, 'B', 'a')).toBe('b')
    expect(typeaheadTreeRowId(rows, 'A', null)).toBe('a')
  })

  it('does not match a disabled row', () => {
    const rows = flattenTree(nodes, createTreeState({ expanded: ['a'] }))
    expect(typeaheadTreeRowId(rows, 'G', null)).toBeNull()
  })

  it('lists every expandable branch', () => {
    const ids = expandableIds(nodes, createTreeState())
    expect(ids).toContain('a')
    expect(ids).toContain('b')
    expect(ids).not.toContain('c')
  })
})
