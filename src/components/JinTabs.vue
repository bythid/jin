<script setup lang="ts">
/**
 * JinTabs — tab list + panels with roving tabindex, automatic/manual
 * activation, and both orientations. Panel wiring is done by id, so the
 * application keeps control of where panels live.
 */
import { computed, nextTick, ref, useId, watch } from 'vue'
import { nextRovingIndex } from '../core/roving'
import { useT } from '../composables/useT'
import type { Orientation } from '../core/types'

export interface TabItem {
  value: string
  label: string
  disabled?: boolean
  /** Optional badge text, drawn but also announced. */
  badge?: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    items: TabItem[]
    orientation?: Orientation
    /** Arrow keys activate immediately. When false, Enter/Space activates. */
    activation?: 'automatic' | 'manual'
    ariaLabel?: string
    /** Grow tabs to fill the list. */
    grow?: boolean
  }>(),
  { modelValue: null, orientation: 'horizontal', activation: 'automatic', ariaLabel: '', grow: false },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

const { t } = useT()
const generated = useId()
const activeIndex = ref(-1)
const tabNodes = ref<HTMLElement[]>([])

const enabled = computed(() => props.items.filter((item) => !item.disabled))
const currentValue = computed(() => props.modelValue)

function valueAt(index: number): string | null {
  return props.items[index]?.value ?? null
}

function select(index: number, focus = false): void {
  const item = props.items[index]
  if (!item || item.disabled) return
  activeIndex.value = index
  emit('update:modelValue', item.value)
  emit('change', item.value)
  if (focus) void nextTick(() => tabNodes.value[index]?.focus())
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const usable = props.items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0)
  const position = usable.indexOf(index)
  let next: number | null = null

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    select(index, true)
    return
  }

  if (props.orientation === 'vertical') {
    next = nextRovingIndex(event.key as never, position, usable.length, { orientation: 'vertical', loop: true })
  } else {
    next = nextRovingIndex(event.key as never, position, usable.length, { orientation: 'horizontal', loop: true })
  }
  if (next === null) return
  event.preventDefault()
  const target = usable[next]
  if (target === undefined) return
  activeIndex.value = target
  if (props.activation === 'automatic') {
    select(target, true)
  } else {
    void nextTick(() => tabNodes.value[target]?.focus())
  }
}

// Keep the active index in step with the model, including when the host
// changes the value from outside.
watch(
  [() => props.modelValue, () => props.items],
  () => {
    const index = props.items.findIndex((item) => item.value === props.modelValue)
    activeIndex.value = index >= 0 ? index : props.items.findIndex((item) => !item.disabled)
  },
  { immediate: true, deep: true },
)

function tabId(value: string): string {
  return `jin-tab-${generated}-${value}`
}

function panelId(value: string): string {
  return `jin-tabpanel-${generated}-${value}`
}

defineExpose({ tabId, panelId })
</script>

<template>
  <div
    class="jin-tabs"
    :class="{ 'jin-tabs--vertical': props.orientation === 'vertical', 'jin-tabs--grow': props.grow }"
  >
    <div
      class="jin-tabs__list"
      role="tablist"
      :aria-orientation="props.orientation"
      :aria-label="props.ariaLabel || t('a11y.tabs')"
    >
      <button
        v-for="(item, index) in props.items"
        :id="tabId(item.value)"
        :key="item.value"
        ref="tabNodes"
        type="button"
        class="jin-tabs__tab"
        :class="{ 'jin-tabs__tab--selected': item.value === currentValue }"
        role="tab"
        :aria-selected="item.value === currentValue ? 'true' : 'false'"
        :aria-controls="panelId(item.value)"
        :tabindex="index === activeIndex ? 0 : -1"
        :disabled="item.disabled"
        @click="select(index)"
        @keydown="onKeydown($event, index)"
      >
        <slot name="tab" :item="item" :selected="item.value === currentValue">
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="jin-badge jin-badge--neutral">{{ item.badge }}</span>
        </slot>
      </button>
    </div>

    <div
      v-for="item in props.items"
      v-show="item.value === currentValue"
      :id="panelId(item.value)"
      :key="item.value"
      class="jin-tabs__panel"
      role="tabpanel"
      :aria-labelledby="tabId(item.value)"
      tabindex="0"
    >
      <slot :name="item.value" :item="item">
        <slot name="panel" :item="item" />
      </slot>
    </div>
  </div>
</template>
