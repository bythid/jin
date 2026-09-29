/**
 * Anchored positioning, DOM side. The geometry lives in core/positioning.ts;
 * this composable only measures, schedules (requestAnimationFrame) and listens
 * with passive + throttled handlers.
 */
import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import {
  computePosition,
  type PositionOptions,
  type PositionResult,
  type Rect,
  type Size2D,
} from '../core/positioning'

export type AnchorTarget = HTMLElement | null | undefined

export interface UsePositioningOptions {
  /** The floating element. Its measured size decides the coordinates. */
  floating: Ref<HTMLElement | null>
  /** The anchor element. */
  anchor: Ref<AnchorTarget> | MaybeRefOrGetter<AnchorTarget>
  /** Preferred placement. Default 'bottom'. */
  placement?: MaybeRefOrGetter<PositionOptions['placement']>
  offset?: MaybeRefOrGetter<number | undefined>
  flip?: MaybeRefOrGetter<boolean | undefined>
  shift?: MaybeRefOrGetter<boolean | undefined>
  padding?: MaybeRefOrGetter<number | undefined>
  arrow?: MaybeRefOrGetter<Size2D | null | undefined>
  /** Teleported floating elements: subtract the offset parent's origin. */
  offsetParent?: Ref<HTMLElement | null>
  /** Keep following scroll/resize. Default true. */
  autoUpdate?: MaybeRefOrGetter<boolean | undefined>
  /** Run the first placement immediately on setup. Default true. */
  immediate?: boolean
}

export interface UsePositioningReturn {
  position: Ref<PositionResult>
  update: () => void
  scheduleUpdate: () => void
  /** Style object to bind on the floating element. */
  floatingStyle: Ref<Record<string, string>>
}

const EMPTY: PositionResult = {
  x: 0,
  y: 0,
  placement: 'bottom',
  side: 'bottom',
  align: 'center',
  arrow: null,
  flipped: false,
  shifted: false,
}

function measure(element: HTMLElement | null | undefined): Rect | null {
  if (!element) return null
  const rect = element.getBoundingClientRect()
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

export function usePositioning(options: UsePositioningOptions): UsePositioningReturn {
  const position = ref<PositionResult>(EMPTY)
  const floatingStyle = ref<Record<string, string>>({})
  let frame = 0
  let listenersAttached = false
  let lastRun = 0

  function boundary(): Size2D {
    if (typeof window === 'undefined') return { width: 0, height: 0 }
    return { width: window.innerWidth, height: window.innerHeight }
  }

  function compute(): void {
    const anchorRect = measure(toValue(options.anchor))
    const floatingRect = measure(options.floating.value)
    if (!anchorRect || !floatingRect) return

    const result = computePosition(anchorRect, floatingRect, {
      placement: toValue(options.placement) ?? 'bottom',
      offset: toValue(options.offset) ?? 8,
      flip: toValue(options.flip) ?? true,
      shift: toValue(options.shift) ?? true,
      padding: toValue(options.padding) ?? 8,
      arrow: toValue(options.arrow) ?? null,
      boundary: boundary(),
    })

    const parent = options.offsetParent?.value ?? null
    let dx = 0
    let dy = 0
    if (parent) {
      // A teleported node is positioned against the viewport; subtract the
      // offset parent's own origin so coordinates live in its space.
      const parentRect = parent.getBoundingClientRect()
      dx = -parentRect.left + parent.scrollLeft
      dy = -parentRect.top + parent.scrollTop
    }

    position.value = {
      ...result,
      x: result.x + dx,
      y: result.y + dy,
    }
    floatingStyle.value = {
      position: 'absolute',
      left: `${Math.round(position.value.x)}px`,
      top: `${Math.round(position.value.y)}px`,
    }
  }

  function update(): void {
    frame = 0
    lastRun = Date.now()
    compute()
  }

  function scheduleUpdate(): void {
    if (typeof window === 'undefined') {
      compute()
      return
    }
    if (frame) return
    // Positioning runs inside rAF.
    frame = window.requestAnimationFrame(update)
  }

  function onScroll(): void {
    // Passive listeners + one-frame throttle.
    if (Date.now() - lastRun < 16) return
    scheduleUpdate()
  }

  function attach(): void {
    if (listenersAttached || typeof window === 'undefined') return
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    window.addEventListener('resize', onScroll, { passive: true })
    listenersAttached = true
  }

  function detach(): void {
    if (!listenersAttached || typeof window === 'undefined') return
    window.removeEventListener('scroll', onScroll, { capture: true })
    window.removeEventListener('resize', onScroll)
    listenersAttached = false
  }

  watch(
    () => toValue(options.autoUpdate) !== false,
    (enabled) => (enabled ? attach() : detach()),
    { immediate: true },
  )

  if (options.immediate !== false) scheduleUpdate()

  watch(
    [options.anchor, options.floating, () => toValue(options.placement), () => toValue(options.arrow)],
    () => scheduleUpdate(),
    // After the DOM update: when the anchor arrives with the open flag (an
    // external anchor handed over at open time), a pre-flush re-measure would
    // still read the previous anchor or a not-yet-laid-out element.
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    detach()
    if (frame && typeof window !== 'undefined') window.cancelAnimationFrame(frame)
  })

  return { position, update, scheduleUpdate, floatingStyle }
}
