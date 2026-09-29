<script setup lang="ts">
/**
 * JinToolbar — a horizontal action strip with roving tabindex between its
 * controls (one tab stop for the whole bar, arrows to move within it).
 */
import { computed, onMounted, ref, useId } from 'vue'
import { collectCandidates } from '../core/focus'
import { nextRovingIndex } from '../core/roving'
import { useT } from '../composables/useT'

withDefaults(
  defineProps<{
    ariaLabel?: string
    /** Drops the surface so the bar can sit inside a card header. */
    quiet?: boolean
  }>(),
  { ariaLabel: '', quiet: false },
)

const { t } = useT()
const generated = useId()
const root = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

const controls = computed(() => (root.value ? collectCandidates(root.value) : []))

function onKeydown(event: KeyboardEvent): void {
  const items = controls.value
  if (items.length === 0) return
  const current = items.findIndex((item) => item === document.activeElement)
  const next = nextRovingIndex(event.key as never, current === -1 ? 0 : current, items.length, {
    orientation: 'horizontal',
    loop: true,
  })
  if (next === null) return
  event.preventDefault()
  activeIndex.value = next
  items[next]?.focus()
}

onMounted(() => {
  // The bar is one tab stop; children are reached with the arrow keys.
  controls.value.forEach((control, index) => {
    control.tabIndex = index === activeIndex.value ? 0 : -1
  })
})

function onFocusIn(event: FocusEvent): void {
  const items = controls.value
  const index = items.findIndex((item) => item === event.target)
  if (index === -1) return
  activeIndex.value = index
  items.forEach((item, position) => {
    item.tabIndex = position === index ? 0 : -1
  })
}
</script>

<template>
  <div
    :id="generated"
    ref="root"
    class="jin-toolbar"
    :class="{ 'jin-toolbar--quiet': quiet }"
    role="toolbar"
    :aria-label="ariaLabel || t('a11y.toolbar')"
    :aria-orientation="'horizontal'"
    @keydown="onKeydown"
    @focusin="onFocusIn"
  >
    <slot />
  </div>
</template>
