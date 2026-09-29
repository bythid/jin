/**
 * The single portal container + z-index manager for the whole library.
 * Positioning and focus have exactly one implementation each, and this is
 * where every layered component registers.
 */
import { getCurrentInstance, onBeforeUnmount, readonly, ref, type App, type InjectionKey } from 'vue'
import { createOverlayStack, type DismissReason, type OverlayEntry, type OverlayEntryInput, type OverlayStack } from '../core/overlay-stack'
import { readNumericToken, type Layer } from '../core/layer'

export const PORTAL_CLASS = 'jin-portal'

export interface OverlayController {
  stack: OverlayStack
  /** The portal root every overlay teleports into. Created on first use. */
  root: { value: HTMLElement | null }
  /** The scrim element, shared by modal-like overlays. */
  scrim: { value: HTMLElement | null }
  register(input: OverlayEntryInput): OverlayEntry
  unregister(id: string, reason?: DismissReason): void
  /** Adds the shared scrim behind the given entry and reports its z-index. */
  showScrim(zIndex: number): void
  hideScrim(): void
  /** Current z-index of a registered overlay, or null when it is gone. */
  entryZIndex(id: string | null): number | null
}

export const overlayKey: InjectionKey<OverlayController> = Symbol('jin-overlay')

function readToken(token: string): string | null {
  if (typeof document === 'undefined') return null
  return readNumericToken(document.documentElement, token) === null
    ? null
    : String(readNumericToken(document.documentElement, token))
}

export interface CreateOverlayControllerOptions {
  /**
   * Create the portal container immediately instead of on first registration.
   * The plugin sets this so hosts that only ever mount a toast region — and
   * never open a popover — still have somewhere to teleport into.
   */
  eager?: boolean
}

export function createOverlayController(options: CreateOverlayControllerOptions = {}): OverlayController {
  const stack = createOverlayStack({ readToken })
  const root = ref<HTMLElement | null>(null)
  const scrim = ref<HTMLElement | null>(null)

  function ensureRoot(): HTMLElement | null {
    if (typeof document === 'undefined') return null
    if (root.value?.isConnected) return root.value
    const existing = document.querySelector<HTMLElement>(`.${PORTAL_CLASS}`)
    if (existing) {
      root.value = existing
      return existing
    }
    const element = document.createElement('div')
    element.className = PORTAL_CLASS
    element.setAttribute('data-jin-portal', '')
    // Layout belongs to the stylesheet (see .jin-portal): it anchors the box to
    // the viewport, which is the space every overlay inside measures in. An
    // inline position here wins over that rule and drags the whole subtree down
    // to wherever the host's flow ends.
    document.body.appendChild(element)
    root.value = element
    return element
  }

  function ensureScrim(): HTMLElement | null {
    const container = ensureRoot()
    if (!container) return null
    if (scrim.value?.isConnected) return scrim.value
    const element = document.createElement('div')
    element.className = 'jin-scrim'
    element.setAttribute('data-jin-scrim', '')
    element.setAttribute('aria-hidden', 'true')
    container.appendChild(element)
    scrim.value = element
    return element
  }

  if (options.eager) ensureRoot()

  return {
    stack,
    root,
    scrim,
    register(input) {
      ensureRoot()
      return stack.open(input)
    },
    unregister(id, reason = 'programmatic') {
      stack.close(id, reason)
    },
    showScrim(zIndex) {
      const element = ensureScrim()
      if (!element) return
      element.style.zIndex = String(zIndex - 1)
      element.style.display = 'block'
      element.setAttribute('data-jin-visible', '')
    },
    hideScrim() {
      if (!scrim.value) return
      scrim.value.style.display = 'none'
      scrim.value.removeAttribute('data-jin-visible')
    },
    entryZIndex(id) {
      if (!id) return null
      return stack.entries().find((entry) => entry.id === id)?.zIndex ?? null
    },
  }
}

export function provideOverlay(app: App, controller: OverlayController): void {
  app.provide(overlayKey, controller)
}

export function useOverlay(): OverlayController {
  const instance = getCurrentInstance()
  const injected = instance?.appContext.provides[overlayKey as unknown as string] as OverlayController | undefined
  if (injected) return injected
  // Standalone usage (tests / no plugin): a private controller still behaves.
  return createOverlayController()
}

/**
 * Register one overlay with the shared stack for as long as the component is
 * alive. Handles the "unregister on unmount" rule in one place.
 */
export function useOverlayEntry(input: () => OverlayEntryInput, controller = useOverlay()): {
  entry: Readonly<{ value: OverlayEntry | null }>
  close: (reason?: DismissReason) => void
} {
  const entry = ref<OverlayEntry | null>(null)
  let handle: OverlayEntry | null = null

  function open(): void {
    if (handle) return
    handle = controller.register(input())
    entry.value = handle
  }

  function close(reason: DismissReason = 'programmatic'): void {
    if (!handle) return
    controller.unregister(handle.id, reason)
    handle = null
    entry.value = null
  }

  open()
  onBeforeUnmount(() => close('programmatic'))

  return { entry: readonly(entry) as Readonly<{ value: OverlayEntry | null }>, close }
}
