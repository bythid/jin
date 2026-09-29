/**
 * Esc / outside-click wiring. The decision is core/dismissable.ts; the shared
 * stack decides who is topmost so nested overlays close one at a time.
 * Listeners are passive and capture-phase, removed on unmount.
 */
import { onBeforeUnmount, watch, type Ref } from 'vue'
import { decideDismiss } from '../core/dismissable'
import type { DismissReason } from '../core/overlay-stack'
import { PORTAL_CLASS, useOverlay, type OverlayController } from './useOverlay'

export interface UseDismissableOptions {
  /** Registered overlay id, when the element lives in the shared stack. */
  overlayId?: Ref<string | null>
  /** The overlay's own element; clicks inside it never dismiss. */
  element: Ref<HTMLElement | null>
  /** Extra elements that count as "inside" (e.g. the anchored trigger). */
  ignore?: Ref<HTMLElement[]>
  closeOnEsc?: Ref<boolean> | boolean
  closeOnOutside?: Ref<boolean> | boolean
  disabled?: Ref<boolean> | boolean
  onDismiss: (reason: DismissReason) => void
  controller?: OverlayController
}

function resolveFlag(value: Ref<boolean> | boolean | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return typeof value === 'object' && 'value' in value ? Boolean(value.value) : Boolean(value)
}

export function useDismissable(options: UseDismissableOptions): void {
  const controller = options.controller ?? useOverlay()

  function isTopmost(): boolean {
    const id = options.overlayId?.value ?? null
    if (!id) return true
    return controller.stack.isTopmost(id)
  }

  function inside(event: Event): boolean {
    const target = event.target as Node | null
    if (!target) return true
    const element = options.element.value
    if (element?.contains(target)) return true
    for (const extra of options.ignore?.value ?? []) {
      if (extra.contains(target)) return true
    }
    // Overlay content rendered into the shared portal is still "inside" for
    // the purpose of not doubling up dismissals.
    return false
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    const decision = decideDismiss(
      {
        closeOnEsc: resolveFlag(options.closeOnEsc, true),
        closeOnOutside: resolveFlag(options.closeOnOutside, true),
        isTopmost: isTopmost(),
        disabled: resolveFlag(options.disabled, false),
      },
      'escape',
    )
    if (decision !== 'dismiss') return
    event.stopPropagation()
    options.onDismiss('escape')
  }

  function onPointerDown(event: Event): void {
    if (inside(event)) return
    const decision = decideDismiss(
      {
        closeOnEsc: resolveFlag(options.closeOnEsc, true),
        closeOnOutside: resolveFlag(options.closeOnOutside, true),
        isTopmost: isTopmost(),
        disabled: resolveFlag(options.disabled, false),
      },
      'outside',
    )
    if (decision !== 'dismiss') return
    options.onDismiss('outside')
  }

  let attached = false
  function attach(): void {
    if (attached || typeof document === 'undefined') return
    document.addEventListener('keydown', onKeydown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    attached = true
  }

  function detach(): void {
    if (!attached || typeof document === 'undefined') return
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('pointerdown', onPointerDown, true)
    attached = false
  }

  // The overlay only listens while it is actually open.
  const isOpen = () => {
    const id = options.overlayId?.value ?? null
    return id ? controller.stack.isOpen(id) : true
  }

  watch(
    () => (options.overlayId ? options.overlayId.value : true),
    () => (isOpen() ? attach() : detach()),
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(() => detach())
}

/** True when the event target sits inside the shared portal container. */
export function isInPortal(target: Node | null): boolean {
  if (!target || typeof document === 'undefined') return false
  const portal = document.querySelector(`.${PORTAL_CLASS}`)
  if (!portal) return false
  return portal.contains(target)
}
