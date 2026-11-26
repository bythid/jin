<script setup lang="ts">
/**
 * JinSegmentedControl — a single-select pill group.
 *
 * Built over native radio inputs in one group, so screen readers announce real
 * radio buttons and the browser keeps the group to one tab stop. Arrow keys
 * move and select, skipping disabled segments. The raised pill behind the
 * selected label is one layer whose width and offset are percentages of the
 * inner track, so the number of segments is open.
 */
import { computed, ref, useId } from 'vue'
import { nextRovingIndex, type RovingKey } from '../core/roving'
import type { Size } from '../core/types'

export interface SegmentedItem {
  value: string
  label: string
  disabled?: boolean
  /** Native tooltip; the accessible name stays the label. */
  tooltip?: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    items?: SegmentedItem[]
    size?: Size
    disabled?: boolean
    name?: string
    ariaLabel?: string
  }>(),
  {
    modelValue: null,
    items: () => [],
    size: 'md',
    disabled: false,
    name: '',
    ariaLabel: '',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

const generated = useId()
const groupName = computed(() => props.name || `jin-segmented-${generated}`)
const root = ref<HTMLElement | null>(null)

const checkedIndex = computed(() => props.items.findIndex((item) => item.value === props.modelValue))

const enabledIndexes = computed(() =>
  props.items.map((item, index) => (item.disabled ? -1 : index)).filter((index) => index >= 0),
)

/* With nothing selected the first enabled segment owns the tab stop; a model
   that points at a disabled segment must not hide the group from the keyboard. */
const tabStopIndex = computed(() => {
  if (checkedIndex.value >= 0 && !props.items[checkedIndex.value]?.disabled) return checkedIndex.value
  return enabledIndexes.value[0] ?? -1
})

const segmentWidth = computed(() => (props.items.length > 0 ? 100 / props.items.length : 100))

const thumbStyle = computed(() => ({
  width: `${segmentWidth.value}%`,
  transform: `translateX(${Math.max(checkedIndex.value, 0) * 100}%)`,
}))

function inputs(): HTMLInputElement[] {
  const element = root.value
  if (!element) return []
  return Array.from(element.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
}

function select(index: number, focus = false): void {
  const item = props.items[index]
  if (!item || item.disabled || props.disabled) return
  emit('update:modelValue', item.value)
  emit('change', item.value)
  if (focus) inputs()[index]?.focus()
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const usable = enabledIndexes.value
  const position = usable.indexOf(index)
  if (position < 0) return
  /* horizontal+vertical: left/right are the expected pair, up/down work too. */
  const next = nextRovingIndex(event.key as RovingKey, position, usable.length, {
    orientation: 'both',
    loop: true,
  })
  if (next === null) return
  event.preventDefault()
  const target = usable[next]
  if (target === undefined) return
  select(target, true)
}
</script>

<template>
  <div
    ref="root"
    class="jin-segmented"
    :class="[`jin-segmented--${props.size}`, { 'jin-segmented--disabled': props.disabled }]"
    role="radiogroup"
    :aria-label="props.ariaLabel || undefined"
    :aria-disabled="props.disabled ? 'true' : undefined"
  >
    <div class="jin-segmented__inner">
      <span
        v-if="checkedIndex >= 0"
        class="jin-segmented__thumb"
        :style="thumbStyle"
        aria-hidden="true"
      />
      <label
        v-for="(item, index) in props.items"
        :key="item.value"
        class="jin-segmented__segment"
        :class="{
          'jin-segmented__segment--checked': item.value === props.modelValue,
          'jin-segmented__segment--disabled': item.disabled || props.disabled,
        }"
        :title="item.tooltip || undefined"
      >
        <input
          class="jin-segmented__input"
          type="radio"
          :name="groupName"
          :value="item.value"
          :checked="item.value === props.modelValue"
          :disabled="item.disabled || props.disabled"
          :tabindex="index === tabStopIndex ? 0 : -1"
          @change="select(index)"
          @keydown="onKeydown($event, index)"
        />
        <span class="jin-segmented__text">{{ item.label }}</span>
      </label>
    </div>
  </div>
</template>
