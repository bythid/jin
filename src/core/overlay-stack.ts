/**
 * The single overlay stack shared by every layered control (popover, tooltip,
 * menu, modal, drawer, toast). Pure bookkeeping + dismissal decisions; no DOM
 * listeners live here, so the whole thing is unit-testable.
 *
 * Responsibilities:
 *  - assign z-index from the layer token, never decreasing along the stack
 *  - answer "who is topmost" for Escape / outside-click routing
 *  - report whether a modal is open (scroll lock, background inert)
 */
import { createId } from './id'
import { FALLBACK_Z, layerZIndex, type Layer, type TokenReader } from './layer'

export type DismissReason = 'escape' | 'outside' | 'programmatic'

export interface OverlayEntryInput {
  id?: string
  layer: Layer
  /** Escape closes this entry. Default true. */
  dismissOnEsc?: boolean
  /** Outside click closes this entry. Default true. */
  dismissOnOutside?: boolean
  /** Blocks the rest of the page (scroll lock + background inert). Default false. */
  modal?: boolean
  onDismiss?: (reason: DismissReason) => void
}

export interface OverlayEntry {
  id: string
  layer: Layer
  zIndex: number
  dismissOnEsc: boolean
  dismissOnOutside: boolean
  modal: boolean
  onDismiss?: (reason: DismissReason) => void
}

export interface OverlayStackOptions {
  readToken?: TokenReader
  createId?: () => string
}

export interface OverlayStack {
  open(input: OverlayEntryInput): OverlayEntry
  close(id: string, reason?: DismissReason): boolean
  update(id: string, patch: Partial<Pick<OverlayEntry, 'dismissOnEsc' | 'dismissOnOutside' | 'modal'>>): void
  isOpen(id: string): boolean
  isTopmost(id: string): boolean
  topmost(): OverlayEntry | null
  /** Entries bottom-to-top. */
  entries(): OverlayEntry[]
  count(): number
  hasModal(): boolean
  topmostModalId(): string | null
  /** Returns true when the keypress was consumed by an overlay. */
  handleEscape(): boolean
  /**
   * Returns the id of the overlay that should close because the event landed
   * outside it, or null when nothing should close.
   */
  handleOutside(isInside: (id: string, target: unknown) => boolean, target: unknown): string | null
  subscribe(listener: () => void): () => void
  reset(): void
}

export function createOverlayStack(options: OverlayStackOptions = {}): OverlayStack {
  const readToken: TokenReader = options.readToken ?? (() => null)
  const nextId = options.createId ?? (() => createId('jin-overlay'))
  let entries: OverlayEntry[] = []
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of [...listeners]) listener()
  }

  /**
   * z-index = the entry's layer base, but never less than the entry below it:
   * opening an overlay always puts it on top of everything already open.
   *
   * The base alone is not enough, because a layer's base is fixed and a nested
   * overlay belongs to a lower-numbered layer than its host — a select inside a
   * modal is a `dropdown` (1000) inside a `modal` (1200). Ranked by base only, it
   * painted behind the dialog that opened it: visible to the DOM, hit-tested onto
   * the dialog, and therefore unclickable. Stack order is what the rest of this
   * module already treats as truth (`topmost()`, Escape, outside-click), so the
   * z-index has to agree with it.
   */
  function reindex(): void {
    let previous = Number.NEGATIVE_INFINITY
    entries = entries.map((entry) => {
      const zIndex = Math.max(layerZIndex(entry.layer, readToken), previous + 1)
      previous = zIndex
      return { ...entry, zIndex }
    })
  }

  return {
    open(input) {
      const entry: OverlayEntry = {
        id: input.id ?? nextId(),
        layer: input.layer,
        zIndex: FALLBACK_Z[input.layer],
        dismissOnEsc: input.dismissOnEsc ?? true,
        dismissOnOutside: input.dismissOnOutside ?? true,
        modal: input.modal ?? false,
        ...(input.onDismiss ? { onDismiss: input.onDismiss } : {}),
      }
      entries = [...entries, entry]
      reindex()
      notify()
      const stored = entries.find((candidate) => candidate.id === entry.id)
      return stored ?? entry
    },

    close(id, reason = 'programmatic') {
      const entry = entries.find((candidate) => candidate.id === id)
      if (!entry) return false
      entries = entries.filter((candidate) => candidate.id !== id)
      reindex()
      entry.onDismiss?.(reason)
      notify()
      return true
    },

    update(id, patch) {
      let changed = false
      entries = entries.map((entry) => {
        if (entry.id !== id) return entry
        changed = true
        return { ...entry, ...patch }
      })
      if (changed) notify()
    },

    isOpen(id) {
      return entries.some((entry) => entry.id === id)
    },

    isTopmost(id) {
      const top = entries[entries.length - 1]
      return top !== undefined && top.id === id
    },

    topmost() {
      return entries[entries.length - 1] ?? null
    },

    entries() {
      return [...entries]
    },

    count() {
      return entries.length
    },

    hasModal() {
      return entries.some((entry) => entry.modal)
    },

    topmostModalId() {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index]
        if (entry?.modal) return entry.id
      }
      return null
    },

    handleEscape() {
      const top = entries[entries.length - 1]
      if (!top) return false
      if (!top.dismissOnEsc) return true // swallowed: the top overlay owns the key
      entries = entries.filter((entry) => entry.id !== top.id)
      reindex()
      top.onDismiss?.('escape')
      notify()
      return true
    },

    handleOutside(isInside, target) {
      const top = entries[entries.length - 1]
      if (!top || !top.dismissOnOutside) return null
      if (isInside(top.id, target)) return null
      return top.id
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    reset() {
      entries = []
      notify()
    },
  }
}
