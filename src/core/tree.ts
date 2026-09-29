/**
 * Tree state machine — the most demanding component in the set.
 *
 * Pure parts: flattening, expansion, keyboard navigation, and the async load
 * transitions including the failure semantics the spec demands:
 *   (a) a failed row returns to "not loaded",
 *   (b) the caller is told through load-error { node, error },
 *   (c) the error is never swallowed.
 */
import type { TreeTone } from './types'
import { typeaheadMatch } from './roving'

export interface TreeNode {
  id: string
  label?: string
  children?: TreeNode[]
  /** Lazy branch: children are fetched through `load` on first expand. */
  hasChildren?: boolean
  disabled?: boolean
  tone?: TreeTone
  /** Library-agnostic decoration; the app decides what it means. */
  icon?: string
  data?: unknown
}

export interface TreeState {
  expanded: string[]
  loading: string[]
  /** Ids whose last load rejected; expanding again retries. */
  failed: string[]
  /** Children returned by `load`, keyed by parent id. */
  loaded: Record<string, TreeNode[]>
}

export interface FlatTreeRow {
  id: string
  node: TreeNode
  depth: number
  level: number
  parentId: string | null
  expanded: boolean
  hasChildren: boolean
  loading: boolean
  failed: boolean
  disabled: boolean
  posinset: number
  setsize: number
}

export function createTreeState(init: Partial<TreeState> = {}): TreeState {
  return {
    expanded: init.expanded ? [...init.expanded] : [],
    loading: init.loading ? [...init.loading] : [],
    failed: init.failed ? [...init.failed] : [],
    loaded: { ...(init.loaded ?? {}) },
  }
}

/**
 * The children to render for a node.
 *
 * `node.children` always wins. The load cache is a memo of what `load`
 * returned, never a replacement for data the application puts in `nodes`: an
 * application that re-scans and hands over new children must see those
 * children, not the previous fetch.
 */
export function childrenOf(node: TreeNode, state?: TreeState): TreeNode[] | undefined {
  if (node.children !== undefined) return node.children
  return state?.loaded[node.id]
}

export function hasChildrenOf(node: TreeNode, state: TreeState): boolean {
  const children = childrenOf(node, state)
  if (children && children.length > 0) return true
  if (children && children.length === 0) return false
  return node.hasChildren === true
}

export function isExpanded(state: TreeState, id: string): boolean {
  return state.expanded.includes(id)
}

/** A lazy branch that has never been loaded and is not currently loading. */
export function shouldLoad(node: TreeNode, state: TreeState): boolean {
  if (!node.hasChildren) return false
  if (state.loading.includes(node.id)) return false
  if (node.children !== undefined) return false
  if (state.loaded[node.id] !== undefined) return false
  return true
}

export function flattenTree(nodes: readonly TreeNode[], state: TreeState): FlatTreeRow[] {
  const rows: FlatTreeRow[] = []
  const walk = (list: readonly TreeNode[], depth: number, parentId: string | null): void => {
    const setsize = list.length
    list.forEach((node, position) => {
      const children = childrenOf(node, state)
      const hasChildren = hasChildrenOf(node, state)
      const expanded = state.expanded.includes(node.id)
      rows.push({
        id: node.id,
        node,
        depth,
        level: depth + 1,
        parentId,
        expanded,
        hasChildren,
        loading: state.loading.includes(node.id),
        failed: state.failed.includes(node.id),
        disabled: node.disabled ?? false,
        posinset: position + 1,
        setsize,
      })
      if (expanded && children && children.length > 0) walk(children, depth + 1, node.id)
    })
  }
  walk(nodes, 0, null)
  return rows
}

export function applyLoadStart(state: TreeState, id: string): TreeState {
  return {
    ...state,
    loading: state.loading.includes(id) ? state.loading : [...state.loading, id],
    failed: state.failed.filter((candidate) => candidate !== id),
  }
}

export function applyLoadSuccess(state: TreeState, id: string, children: TreeNode[]): TreeState {
  return {
    expanded: state.expanded.includes(id) ? state.expanded : [...state.expanded, id],
    loading: state.loading.filter((candidate) => candidate !== id),
    failed: state.failed.filter((candidate) => candidate !== id),
    loaded: { ...state.loaded, [id]: children },
  }
}

/**
 * Failure rollback: the row returns to "not loaded" (collapsed, no loading
 * flag) so the application can roll back its own state and the user can retry.
 */
export function applyLoadFailure(state: TreeState, id: string): TreeState {
  return {
    ...state,
    expanded: state.expanded.filter((candidate) => candidate !== id),
    loading: state.loading.filter((candidate) => candidate !== id),
    failed: state.failed.includes(id) ? state.failed : [...state.failed, id],
  }
}

export type TreeNavKey = 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End'

export interface TreeNavResult {
  activeId: string | null
  /** The press asked for a branch to open/close. */
  toggle: { id: string; expanded: boolean } | null
}

function selectableRows(rows: readonly FlatTreeRow[]): FlatTreeRow[] {
  return rows.filter((row) => !row.disabled)
}

function stepRow(rows: readonly FlatTreeRow[], activeId: string | null, direction: 1 | -1): string | null {
  const usable = selectableRows(rows)
  if (usable.length === 0) return null
  const index = usable.findIndex((row) => row.id === activeId)
  if (index === -1) return (direction === 1 ? usable[0] : usable[usable.length - 1])?.id ?? null
  const next = Math.min(Math.max(index + direction, 0), usable.length - 1)
  return usable[next]?.id ?? null
}

export function navigateTree(
  key: TreeNavKey,
  rows: readonly FlatTreeRow[],
  activeId: string | null,
): TreeNavResult {
  // No active row (a freshly focused tree, or the application replaced the
  // data) anchors at the first selectable row. Leaving `active` null made
  // ArrowLeft/Right do nothing and sent ArrowUp to the last row, which reads
  // as "the keyboard is broken" until the user clicks a row.
  const active = rows.find((row) => row.id === activeId) ?? selectableRows(rows)[0] ?? null
  switch (key) {
    case 'ArrowDown':
      return { activeId: stepRow(rows, active?.id ?? null, 1), toggle: null }
    case 'ArrowUp':
      return { activeId: stepRow(rows, active?.id ?? null, -1), toggle: null }
    case 'Home': {
      const first = selectableRows(rows)[0]
      return { activeId: first?.id ?? null, toggle: null }
    }
    case 'End': {
      const usable = selectableRows(rows)
      return { activeId: usable[usable.length - 1]?.id ?? null, toggle: null }
    }
    case 'ArrowRight': {
      if (!active) return { activeId: null, toggle: null }
      if (active.hasChildren && !active.expanded) {
        return { activeId: active.id, toggle: { id: active.id, expanded: true } }
      }
      if (active.expanded) {
        const firstChild = rows.find((row) => row.parentId === active.id && !row.disabled)
        if (firstChild) return { activeId: firstChild.id, toggle: null }
      }
      return { activeId: active.id, toggle: null }
    }
    case 'ArrowLeft': {
      if (!active) return { activeId: null, toggle: null }
      if (active.expanded && active.hasChildren) {
        return { activeId: active.id, toggle: { id: active.id, expanded: false } }
      }
      if (active.parentId) {
        const parent = rows.find((row) => row.id === active.parentId)
        if (parent && !parent.disabled) return { activeId: parent.id, toggle: null }
      }
      return { activeId: active.id, toggle: null }
    }
  }
}

/** Typeahead over visible row labels, starting after the active row. */
export function typeaheadTreeRowId(rows: readonly FlatTreeRow[], query: string, fromId: string | null): string | null {
  const entries = rows.map((row, index) => ({ index, text: row.node.label ?? '', disabled: row.disabled }))
  const from = fromId === null ? -1 : rows.findIndex((row) => row.id === fromId)
  const match = typeaheadMatch(entries, query, from)
  return match === null ? null : (rows[match]?.id ?? null)
}

/** Ids of every branch currently loaded, useful for "expand all". */
export function expandableIds(nodes: readonly TreeNode[], state: TreeState): string[] {
  const ids: string[] = []
  const walk = (list: readonly TreeNode[]): void => {
    for (const node of list) {
      if (hasChildrenOf(node, state)) {
        ids.push(node.id)
        const children = childrenOf(node, state)
        if (children) walk(children)
      }
    }
  }
  walk(nodes)
  return ids
}
