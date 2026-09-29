/**
 * Toast / notification queue. Both are the same queue with
 * different lifetimes: a toast has a duration and disappears by itself, a
 * notification has duration 0 and stays until the user deals with it.
 *
 * Timers are not created here: `due(now)` reports what should expire, and the
 * host component drives the clock. That keeps the whole thing synchronous and
 * testable.
 */
import { createId } from './id'

export type QueuePosition = 'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'

export const QUEUE_POSITIONS: readonly QueuePosition[] = [
  'top-start',
  'top',
  'top-end',
  'bottom-start',
  'bottom',
  'bottom-end',
]

export interface QueueEntry {
  id: string
  position: QueuePosition
  /** Auto-dismiss delay in ms. 0 means "until dismissed" (notification). */
  duration: number
  createdAt: number
  /** Milliseconds left when paused; null while running. */
  remaining: number | null
  startedAt: number
  paused: boolean
  /** Higher priority entries are never evicted before lower ones. */
  priority: number
}

export interface QueueInput {
  id?: string
  position?: QueuePosition
  duration?: number
  priority?: number
}

/** Keys a caller may add on top of the queue bookkeeping. */
export type QueuePayload<T extends QueueEntry> = Omit<T, keyof QueueEntry>

export interface QueueOptions {
  now?: () => number
  /** Visible cap per position; overflowing entries are evicted oldest-first. */
  maxVisible?: number | Partial<Record<QueuePosition, number>>
  defaultDuration?: number
  createId?: () => string
}

export interface QueuePushResult<T extends QueueEntry> {
  entry: T
  evicted: T[]
}

export interface Queue<T extends QueueEntry> {
  push(input: QueueInput & Partial<QueuePayload<T>>): QueuePushResult<T>
  update(id: string, patch: QueueInput & Partial<QueuePayload<T>>): T | null
  dismiss(id: string): T | null
  clear(position?: QueuePosition): T[]
  list(position?: QueuePosition): T[]
  count(position?: QueuePosition): number
  /** Ids whose auto-dismiss delay has elapsed. */
  due(at?: number): string[]
  pause(id: string, at?: number): void
  resume(id: string, at?: number): void
  isPaused(id: string): boolean
  subscribe(listener: () => void): () => void
}

function resolveLimit(
  maxVisible: QueueOptions['maxVisible'],
  position: QueuePosition,
  fallback: number,
): number {
  if (maxVisible === undefined) return fallback
  if (typeof maxVisible === 'number') return maxVisible
  return maxVisible[position] ?? fallback
}

export function createQueue<T extends QueueEntry = QueueEntry>(options: QueueOptions = {}): Queue<T> {
  const now = options.now ?? (() => Date.now())
  const nextId = options.createId ?? (() => createId('jin-toast'))
  const defaultDuration = options.defaultDuration ?? 5000
  const defaultLimit = 5
  let entries: T[] = []
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of [...listeners]) listener()
  }

  function positionEntries(position: QueuePosition): T[] {
    return entries.filter((entry) => entry.position === position)
  }

  function evictOverflow(keep: T): T[] {
    const limit = resolveLimit(options.maxVisible, keep.position, defaultLimit)
    const evicted: T[] = []
    let bucket = positionEntries(keep.position)
    while (bucket.length > limit) {
      const candidates = bucket.filter((entry) => entry.id !== keep.id)
      // Prefer the oldest auto-dismissing entry: killing a notification the
      // user still has to deal with would lose information permanently.
      const autoDismissing = candidates
        .filter((entry) => entry.duration > 0)
        .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt)
      const victim = autoDismissing[0]
      if (!victim) {
        // Everything already showing is permanent and the cap is reached, so
        // the incoming entry is the one that has to go.
        entries = entries.filter((entry) => entry.id !== keep.id)
        return [keep]
      }
      evicted.push(victim)
      bucket = bucket.filter((entry) => entry.id !== victim.id)
    }
    if (evicted.length > 0) {
      const ids = new Set(evicted.map((entry) => entry.id))
      entries = entries.filter((entry) => !ids.has(entry.id))
    }
    return evicted
  }

  return {
    push(input) {
      const at = now()
      const entry = {
        ...input,
        id: input.id ?? nextId(),
        position: input.position ?? 'top-end',
        duration: input.duration ?? defaultDuration,
        priority: input.priority ?? 0,
        createdAt: at,
        startedAt: at,
        remaining: null,
        paused: false,
      } as unknown as T
      entries = [...entries, entry]
      const evicted = evictOverflow(entry)
      notify()
      return { entry, evicted }
    },

    update(id, patch) {
      let updated: T | null = null
      entries = entries.map((entry) => {
        if (entry.id !== id) return entry
        const next = { ...entry, ...patch } as T
        if (patch.duration !== undefined && !entry.paused) {
          next.startedAt = now()
          next.remaining = null
        }
        updated = next
        return next
      })
      if (updated) notify()
      return updated
    },

    dismiss(id) {
      const entry = entries.find((candidate) => candidate.id === id) ?? null
      if (!entry) return null
      entries = entries.filter((candidate) => candidate.id !== id)
      notify()
      return entry
    },

    clear(position) {
      const removed = position ? entries.filter((entry) => entry.position === position) : [...entries]
      const ids = new Set(removed.map((entry) => entry.id))
      entries = entries.filter((entry) => !ids.has(entry.id))
      if (removed.length > 0) notify()
      return removed
    },

    list(position) {
      const bucket = position ? positionEntries(position) : [...entries]
      return [...bucket].sort((a, b) => a.createdAt - b.createdAt)
    },

    count(position) {
      return position ? positionEntries(position).length : entries.length
    },

    due(at = now()) {
      return entries
        .filter((entry) => {
          if (entry.duration <= 0 || entry.paused) return false
          const elapsed = at - entry.startedAt
          return elapsed >= entry.duration
        })
        .map((entry) => entry.id)
    },

    pause(id, at = now()) {
      entries = entries.map((entry) => {
        if (entry.id !== id || entry.paused || entry.duration <= 0) return entry
        const elapsed = at - entry.startedAt
        return { ...entry, paused: true, remaining: Math.max(entry.duration - elapsed, 0) }
      })
      notify()
    },

    resume(id, at = now()) {
      entries = entries.map((entry) => {
        if (entry.id !== id || !entry.paused) return entry
        const remaining = entry.remaining ?? entry.duration
        return { ...entry, paused: false, remaining: null, duration: remaining, startedAt: at }
      })
      notify()
    },

    isPaused(id) {
      return entries.find((entry) => entry.id === id)?.paused ?? false
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
