/**
 * Focus trap + focus return, DOM side. The decisions live in core/focus.ts.
 * Opens: focus moves into the overlay. Closes: focus returns to the element
 * that opened it, never to <body>.
 */
import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'
import {
  collectCandidates,
  elementFocusState,
  firstTabbable,
  resolveFocusReturn,
  stepIndex,
  type InitialFocusStrategy,
} from '../core/focus'

export interface UseFocusTrapOptions {
  /** Element containing the trapped focusables. */
  container: Ref<HTMLElement | null>
  active: Ref<boolean>
  /** Where focus lands when opening. Default 'first'. */
  initialFocus?: Ref<InitialFocusStrategy> | InitialFocusStrategy
  /** Element to prefer when opening (e.g. the dialog itself or a primary button). */
  initialFocusElement?: Ref<HTMLElement | null>
  /** Element that should regain focus on close. Defaults to the captured trigger. */
  trigger?: Ref<HTMLElement | null>
  /** Also prevent Tab from leaving. Default true. */
  trapTab?: boolean
}

export interface UseFocusTrapReturn {
  /** Call before opening so focus can be restored later. */
  captureTrigger: () => void
  focusFirst: () => void
  restoreFocus: () => void
}

function resolveStrategy(value: Ref<InitialFocusStrategy> | InitialFocusStrategy | undefined): InitialFocusStrategy {
  return (value && typeof value === 'object' && 'value' in value ? value.value : value) ?? 'first'
}

export function useFocusTrap(options: UseFocusTrapOptions): UseFocusTrapReturn {
  let previouslyFocused: HTMLElement | null = null

  function captureTrigger(): void {
    if (typeof document === 'undefined') return
    previouslyFocused = (document.activeElement as HTMLElement | null) ?? null
    if (previouslyFocused === document.body) previouslyFocused = null
  }

  function focusables(): HTMLElement[] {
    const container = options.container.value
    if (!container) return []
    return collectCandidates(container)
  }

  function focusFirst(): void {
    const explicit = options.initialFocusElement?.value ?? null
    if (explicit) {
      explicit.focus()
      return
    }
    const strategy = resolveStrategy(options.initialFocus)
    const container = options.container.value
    const candidates = focusables()
    if (strategy === 'container' || candidates.length === 0) {
      const target = container ?? null
      if (!target) return
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus()
      return
    }
    if (strategy === 'last') {
      candidates[candidates.length - 1]?.focus()
      return
    }
    const first = firstTabbable(container ?? document.body)
    ;(first ?? candidates[0])?.focus()
  }

  function restoreFocus(): void {
    const trigger =
      options.trigger?.value !== undefined ? options.trigger.value : previouslyFocused
    const decision = resolveFocusReturn(elementFocusState(trigger ?? null), null)
    if (decision === 'trigger' && trigger) {
      trigger.focus()
      return
    }
    if (decision === 'fallback' && previouslyFocused) previouslyFocused.focus()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!options.active.value) return
    if (event.key !== 'Tab') return
    if (options.trapTab === false) return

    const candidates = focusables()
    if (candidates.length === 0) {
      event.preventDefault()
      return
    }
    const activeElement = document.activeElement as HTMLElement | null
    const currentIndex = activeElement ? candidates.indexOf(activeElement) : -1
    const direction = event.shiftKey ? -1 : 1
    const nextIndex = stepIndex(currentIndex, candidates.length, direction, true)
    if (nextIndex === -1) return

    const next = candidates[nextIndex]
    // Only intervene when focus would actually leave the container.
    if (currentIndex === -1 || (direction === 1 && nextIndex === 0) || (direction === -1 && nextIndex === candidates.length - 1)) {
      event.preventDefault()
      next?.focus()
    }
  }

  function attach(): void {
    if (typeof document === 'undefined') return
    document.addEventListener('keydown', onKeydown, true)
  }

  function detach(): void {
    if (typeof document === 'undefined') return
    document.removeEventListener('keydown', onKeydown, true)
  }

  watch(
    options.active,
    (isActive) => {
      if (isActive) {
        attach()
        void nextTick(() => focusFirst())
      } else {
        detach()
        void nextTick(() => restoreFocus())
      }
    },
    { flush: 'post' },
  )

  if (options.active.value) {
    attach()
    void nextTick(() => focusFirst())
  }

  onBeforeUnmount(() => detach())

  return { captureTrigger, focusFirst, restoreFocus }
}
