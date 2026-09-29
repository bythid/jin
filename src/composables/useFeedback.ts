/**
 * Toast and notification stores.
 *
 * Toast and notification are the same queue (core/queue.ts) with different
 * lifetimes — that is the documented difference:
 *   - toast:        auto-dismisses, non-blocking
 *   - notification: stays until the user deals with it (duration 0)
 *
 * The store owns the clock through a single interval so every component that
 * uses it shares one timeline.
 */
import { computed, getCurrentInstance, onBeforeUnmount, readonly, ref, type App, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { createQueue, type QueueEntry, type QueuePosition } from '../core/queue'
import type { Tone } from '../core/types'
import { createId } from '../core/id'

export interface FeedbackAction {
  /** Visible label; the host supplies the text. */
  label: string
  /** Handled by the host. */
  handler: () => void
  /** Renders as a strong action. */
  primary?: boolean
  /** Keeps the message open after the action runs. */
  keepOpen?: boolean
}

export interface FeedbackOptions {
  id?: string
  tone?: Tone
  title?: string
  description?: string
  /** Auto-dismiss delay in ms. 0 means "until dismissed" (notification). */
  duration?: number
  position?: QueuePosition
  /** Closable by the user. Default true. */
  closable?: boolean
  actions?: FeedbackAction[]
  priority?: number
}

export interface FeedbackEntry extends QueueEntry {
  tone: Tone
  title: string
  description: string
  closable: boolean
  actions: FeedbackAction[]
}

export interface FeedbackStore {
  items: Readonly<Ref<FeedbackEntry[]>>
  byPosition: ComputedRef<Record<QueuePosition, FeedbackEntry[]>>
  push: (options: FeedbackOptions) => string
  update: (id: string, patch: FeedbackOptions) => void
  dismiss: (id: string) => void
  clear: (position?: QueuePosition) => void
  /** Pause the auto-dismiss countdown (pointer over the message). */
  pause: (id: string) => void
  resume: (id: string) => void
  subscribe: (listener: () => void) => () => void
  /** Stop the shared clock; called on unmount. */
  dispose: () => void
}

export interface CreateFeedbackStoreOptions {
  defaultDuration?: number
  maxVisible?: number | Partial<Record<QueuePosition, number>>
}

function normalize(entry: QueueEntry): FeedbackEntry {
  const raw = entry as QueueEntry & Partial<FeedbackEntry>
  return {
    ...raw,
    tone: raw.tone ?? 'neutral',
    title: typeof raw.title === 'string' ? raw.title : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    closable: raw.closable !== false,
    actions: Array.isArray(raw.actions) ? raw.actions : [],
  }
}

export function createFeedbackStore(options: CreateFeedbackStoreOptions = {}): FeedbackStore {
  const queue = createQueue<FeedbackEntry>({
    defaultDuration: options.defaultDuration ?? 5000,
    ...(options.maxVisible !== undefined ? { maxVisible: options.maxVisible } : {}),
  })
  const items = ref<FeedbackEntry[]>([])
  let timer: ReturnType<typeof setInterval> | null = null

  function sync(): void {
    items.value = queue.list().map(normalize)
  }

  queue.subscribe(sync)
  sync()

  function ensureClock(): void {
    if (timer !== null) return
    if (typeof window === 'undefined') return
    timer = setInterval(() => {
      for (const id of queue.due()) queue.dismiss(id)
    }, 250)
  }

  ensureClock()

  onScopeCleanup(() => {
    if (timer !== null) clearInterval(timer)
    timer = null
  })

  return {
    items: readonly(items) as Readonly<Ref<FeedbackEntry[]>>,
    byPosition: computed(() => {
      const buckets = {} as Record<QueuePosition, FeedbackEntry[]>
      for (const position of ['top-start', 'top', 'top-end', 'bottom-start', 'bottom', 'bottom-end'] as QueuePosition[]) {
        buckets[position] = []
      }
      for (const item of items.value) {
        ;(buckets[item.position] ??= []).push(item)
      }
      return buckets
    }),
    push(options_) {
      const { entry } = queue.push({
        ...options_,
        id: options_.id ?? createId('jin-feedback'),
      })
      sync()
      return entry.id
    },
    update(id, patch) {
      queue.update(id, patch)
      sync()
    },
    dismiss(id) {
      queue.dismiss(id)
      sync()
    },
    clear(position) {
      queue.clear(position)
      sync()
    },
    pause(id) {
      queue.pause(id)
      sync()
    },
    resume(id) {
      queue.resume(id)
      sync()
    },
    subscribe(listener) {
      return queue.subscribe(listener)
    },
    dispose() {
      if (timer !== null) clearInterval(timer)
      timer = null
    },
  }
}

/** Detach from the current effect scope when there is one (component setup). */
function onScopeCleanup(cleanup: () => void): void {
  const instance = getCurrentInstance()
  if (instance) onBeforeUnmount(cleanup)
}

export const toastsKey: InjectionKey<FeedbackStore> = Symbol('jin-toasts')
export const notificationsKey: InjectionKey<FeedbackStore> = Symbol('jin-notifications')

export function provideFeedbackStores(app: App): void {
  app.provide(toastsKey, createFeedbackStore({ defaultDuration: 5000, maxVisible: 5 }))
  app.provide(notificationsKey, createFeedbackStore({ defaultDuration: 0, maxVisible: 4 }))
}

/** Toast = auto-dismissing, non-blocking. */
export function useToasts(): FeedbackStore {
  const instance = getCurrentInstance()
  const injected = instance?.appContext.provides[toastsKey as unknown as string] as FeedbackStore | undefined
  return injected ?? createFeedbackStore({ defaultDuration: 5000 })
}

/** Notification = stays until the user deals with it. */
export function useNotifications(): FeedbackStore {
  const instance = getCurrentInstance()
  const injected = instance?.appContext.provides[notificationsKey as unknown as string] as FeedbackStore | undefined
  return injected ?? createFeedbackStore({ defaultDuration: 0 })
}
