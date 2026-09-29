/**
 * Roving tabindex, DOM side. The index math is core/roving.ts; this composable
 * keeps the "one tab stop for the whole group" invariant and moves focus.
 */
import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { createTypeaheadBuffer, nextRovingIndex, type RovingOptions } from '../core/roving'

export interface UseRovingTabindexOptions {
  /** Items in document order. */
  items: Ref<HTMLElement[]>
  /** Enabled predicate; disabled items are skipped when moving. */
  isDisabled?: (element: HTMLElement, index: number) => boolean
  orientation?: RovingOptions['orientation']
  loop?: boolean
  rtl?: Ref<boolean> | boolean
  /** Enable single-character navigation. Default true. */
  typeahead?: boolean
  /** Called after focus moves, so the owner can sync its own state. */
  onActive?: (index: number, element: HTMLElement) => void
}

export interface UseRovingTabindexReturn {
  /** Index that owns tabindex="0". -1 means "first enabled item". */
  activeIndex: Ref<number>
  setActive: (index: number, options?: { focus?: boolean }) => void
  focusIndex: (index: number) => void
  focusNext: (direction?: 1 | -1) => void
  focusEdge: (edge: 'first' | 'last') => void
  /** tabindex for each item; bind with `:tabindex`. */
  tabindexFor: (index: number) => number
  onKeydown: (event: KeyboardEvent, index: number) => boolean
  handleTypeahead: (char: string) => boolean
}

/** Candidates that can hold focus, in order, with their original indexes. */
function usableIndexes(options: UseRovingTabindexOptions): number[] {
  const elements = options.items.value
  const indexes: number[] = []
  elements.forEach((element, index) => {
    if (options.isDisabled?.(element, index)) return
    indexes.push(index)
  })
  return indexes
}

export function useRovingTabindex(options: UseRovingTabindexOptions): UseRovingTabindexReturn {
  const activeIndex = ref(-1)
  const buffer = createTypeaheadBuffer()

  function currentRtl(): boolean {
    const value = options.rtl
    if (value === undefined) return false
    return typeof value === 'object' && 'value' in value ? Boolean(value.value) : Boolean(value)
  }

  function setActive(index: number, config: { focus?: boolean } = {}): void {
    const elements = options.items.value
    const usable = usableIndexes(options)
    if (usable.length === 0) {
      activeIndex.value = -1
      return
    }
    const target = usable.includes(index) ? index : (usable[0] ?? -1)
    activeIndex.value = target
    if (config.focus && target >= 0) {
      const element = elements[target]
      element?.focus()
      options.onActive?.(target, element as HTMLElement)
    }
  }

  function focusIndex(index: number): void {
    setActive(index, { focus: true })
  }

  function step(direction: 1 | -1): void {
    const usable = usableIndexes(options)
    if (usable.length === 0) return
    const position = usable.indexOf(activeIndex.value)
    const nextPosition = nextRovingIndex(
      direction === 1 ? 'ArrowDown' : 'ArrowUp',
      position === -1 ? (direction === 1 ? -1 : usable.length) : position,
      usable.length,
      { orientation: 'vertical', loop: options.loop ?? true },
    )
    if (nextPosition === null) return
    const next = usable[nextPosition]
    if (next === undefined) return
    focusIndex(next)
  }

  function focusNext(direction: 1 | -1 = 1): void {
    step(direction)
  }

  function focusEdge(edge: 'first' | 'last'): void {
    const usable = usableIndexes(options)
    const target = edge === 'first' ? usable[0] : usable[usable.length - 1]
    if (target === undefined) return
    focusIndex(target)
  }

  function onKeydown(event: KeyboardEvent, index: number): boolean {
    const usable = usableIndexes(options)
    const elements = options.items.value
    const count = usable.length
    if (count === 0) return false
    const position = usable.indexOf(index)
    const next = nextRovingIndex(event.key as never, position, count, {
      orientation: options.orientation ?? 'both',
      loop: options.loop ?? true,
      rtl: currentRtl(),
    })
    if (next === null) return false
    event.preventDefault()
    const target = usable[next]
    if (target === undefined) return false
    const element = elements[target]
    element?.focus()
    activeIndex.value = target
    options.onActive?.(target, element as HTMLElement)
    return true
  }

  function handleTypeahead(char: string): boolean {
    if (options.typeahead === false) return false
    if (char.length !== 1 || char.trim() === '') return false
    const query = buffer.push(char)
    const elements = options.items.value
    const usable = usableIndexes(options)
    const activePosition = usable.indexOf(activeIndex.value)
    const ordered = [...usable.slice(activePosition + 1), ...usable.slice(0, activePosition + 1)]
    const match = ordered.find((index) => (elements[index]?.textContent ?? '').trim().toLowerCase().startsWith(query.toLowerCase()))
    if (match === undefined) return false
    focusIndex(match)
    return true
  }

  // Keep exactly one tab stop. If the active item disappears (filtering),
  // fall back to the first usable one.
  watch(
    options.items,
    () => {
      const usable = usableIndexes(options)
      if (usable.length === 0) {
        activeIndex.value = -1
        return
      }
      if (!usable.includes(activeIndex.value)) activeIndex.value = usable[0] ?? -1
    },
    { flush: 'post' },
  )

  void nextTick(() => {
    if (activeIndex.value === -1) setActive(usableIndexes(options)[0] ?? -1)
  })

  onBeforeUnmount(() => buffer.clear())

  return {
    activeIndex,
    setActive,
    focusIndex,
    focusNext,
    focusEdge,
    tabindexFor: (index: number) => (index === activeIndex.value ? 0 : -1),
    onKeydown,
    handleTypeahead,
  }
}
