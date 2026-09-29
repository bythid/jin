/**
 * Menu model shared by dropdown menus, context menus and submenus.
 * Flattening and keyboard navigation are pure.
 */
import { typeaheadMatch, type TypeaheadEntry } from './roving'

export type MenuEntryType = 'item' | 'separator' | 'label'

export interface MenuEntry {
  id: string
  label?: string
  type?: MenuEntryType
  disabled?: boolean
  danger?: boolean
  /** Rendered as a checkbox / radio row; the library only draws the state. */
  checked?: boolean
  /** Submenu contents. */
  items?: MenuEntry[]
  /** Extra words that should match typeahead. */
  keywords?: string
  /** Display-only accelerator hint. */
  shortcut?: string
}

export interface FlatMenuEntry {
  id: string
  entry: MenuEntry
  depth: number
  /** Ancestor ids, outermost first. Non-empty means the row is inside a submenu. */
  path: string[]
  parentId: string | null
  hasSubmenu: boolean
  type: MenuEntryType
  disabled: boolean
}

export function isMenuEntrySelectable(entry: MenuEntry): boolean {
  if (entry.type === 'separator' || entry.type === 'label') return false
  return !entry.disabled
}

/**
 * Flatten the visible rows: a submenu's children appear only when its id is in
 * `openPath`. Rows are returned in visual order, which is also keyboard order.
 */
export function flattenMenu(items: readonly MenuEntry[], openPath: readonly string[] = []): FlatMenuEntry[] {
  const rows: FlatMenuEntry[] = []
  const walk = (list: readonly MenuEntry[], depth: number, path: string[], parentId: string | null): void => {
    for (const entry of list) {
      const hasSubmenu = Array.isArray(entry.items) && entry.items.length > 0
      rows.push({
        id: entry.id,
        entry,
        depth,
        path,
        parentId,
        hasSubmenu,
        type: entry.type ?? 'item',
        disabled: entry.disabled ?? false,
      })
      if (hasSubmenu && openPath.includes(entry.id)) {
        walk(entry.items ?? [], depth + 1, [...path, entry.id], entry.id)
      }
    }
  }
  walk(items, 0, [], null)
  return rows
}

export function selectableRows(rows: readonly FlatMenuEntry[]): FlatMenuEntry[] {
  return rows.filter((row) => isMenuEntrySelectable(row.entry))
}

function indexOfRow(rows: readonly FlatMenuEntry[], id: string | null): number {
  if (id === null) return -1
  return rows.findIndex((row) => row.id === id)
}

/** Next selectable row in visual order, optionally staying inside one submenu. */
export function nextRowId(
  rows: readonly FlatMenuEntry[],
  currentId: string | null,
  direction: 1 | -1,
  options: { loop?: boolean; withinParent?: string | null } = {},
): string | null {
  const loop = options.loop ?? true
  const withinParent = options.withinParent ?? null
  const candidates = rows.filter((row) => isMenuEntrySelectable(row.entry) && row.parentId === withinParent)
  if (candidates.length === 0) return null
  const currentIndex = candidates.findIndex((row) => row.id === currentId)
  const nextIndex =
    currentIndex === -1 ? (direction === 1 ? 0 : candidates.length - 1) : currentIndex + direction
  if (nextIndex < 0) return loop ? (candidates[candidates.length - 1]?.id ?? null) : (candidates[0]?.id ?? null)
  if (nextIndex >= candidates.length) return loop ? (candidates[0]?.id ?? null) : (candidates[candidates.length - 1]?.id ?? null)
  return candidates[nextIndex]?.id ?? null
}

export function firstRowId(rows: readonly FlatMenuEntry[], withinParent: string | null = null): string | null {
  return rows.find((row) => isMenuEntrySelectable(row.entry) && row.parentId === withinParent)?.id ?? null
}

export function lastRowId(rows: readonly FlatMenuEntry[], withinParent: string | null = null): string | null {
  return (
    [...rows].reverse().find((row) => isMenuEntrySelectable(row.entry) && row.parentId === withinParent)?.id ?? null
  )
}

export function typeaheadRowId(rows: readonly FlatMenuEntry[], query: string, fromId: string | null): string | null {
  const candidates: TypeaheadEntry[] = rows
    .map((row, index) => ({
      index,
      text: `${row.entry.label ?? ''} ${row.entry.keywords ?? ''}`.trim(),
      disabled: !isMenuEntrySelectable(row.entry),
    }))
    .filter((entry) => entry.text.length > 0)
  const from = indexOfRow(rows, fromId)
  const match = typeaheadMatch(candidates, query, from)
  return match === null ? null : (rows[match]?.id ?? null)
}

export type MenuNavAction =
  | { type: 'move'; toId: string }
  | { type: 'open-submenu'; id: string }
  | { type: 'close-submenu'; id: string }
  | { type: 'activate'; id: string }
  | { type: 'close-all' }
  | { type: 'none' }

/**
 * Keyboard behaviour for one key press.
 *
 * Vertical arrows move through the *visible* rows (including into an open
 * submenu); horizontal arrows enter/leave submenus; Escape closes the deepest
 * open submenu first, then the whole menu.
 */
export function menuNavigate(
  key: string,
  rows: readonly FlatMenuEntry[],
  activeId: string | null,
  openPath: readonly string[] = [],
  options: { rtl?: boolean } = {},
): MenuNavAction {
  const active = rows.find((row) => row.id === activeId) ?? null
  const activeParent = active?.parentId ?? null

  switch (key) {
    case 'ArrowDown': {
      const to = nextRowId(rows, activeId, 1, { withinParent: activeParent })
      return to ? { type: 'move', toId: to } : { type: 'none' }
    }
    case 'ArrowUp': {
      const to = nextRowId(rows, activeId, -1, { withinParent: activeParent })
      return to ? { type: 'move', toId: to } : { type: 'none' }
    }
    case 'Home': {
      const to = firstRowId(rows, activeParent)
      return to ? { type: 'move', toId: to } : { type: 'none' }
    }
    case 'End': {
      const to = lastRowId(rows, activeParent)
      return to ? { type: 'move', toId: to } : { type: 'none' }
    }
    case 'ArrowRight': {
      if (options.rtl) return leaveSubmenu(active, openPath)
      if (active?.hasSubmenu) return { type: 'open-submenu', id: active.id }
      return { type: 'none' }
    }
    case 'ArrowLeft': {
      if (options.rtl) {
        if (active?.hasSubmenu) return { type: 'open-submenu', id: active.id }
        return { type: 'none' }
      }
      return leaveSubmenu(active, openPath)
    }
    case 'Enter':
    case ' ': {
      if (!active) return { type: 'none' }
      if (!isMenuEntrySelectable(active.entry)) return { type: 'none' }
      if (active.hasSubmenu) return { type: 'open-submenu', id: active.id }
      return { type: 'activate', id: active.id }
    }
    case 'Escape': {
      const deepest = [...openPath].reverse().find((id) => rows.some((row) => row.id === id))
      if (deepest) return { type: 'close-submenu', id: deepest }
      return { type: 'close-all' }
    }
    default:
      return { type: 'none' }
  }
}

function leaveSubmenu(active: FlatMenuEntry | null, openPath: readonly string[]): MenuNavAction {
  if (!active) return { type: 'none' }
  if (openPath.includes(active.id)) return { type: 'close-submenu', id: active.id }
  if (active.parentId) return { type: 'close-submenu', id: active.parentId }
  return { type: 'none' }
}

/** Rows that must stay mounted, given the currently open submenu path. */
export function visibleRowIds(rows: readonly FlatMenuEntry[]): string[] {
  return rows.map((row) => row.id)
}
