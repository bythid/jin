<script setup lang="ts">
/**
 * JinSelect — one API, two implementations:
 *   - `native`: a real <select>, for maximum platform fidelity and mobile UX
 *   - `custom`: a listbox popover, for styled options and rich rows
 *
 * Both share the same props/emits, so an application can flip `native` without
 * touching the call site.
 */
import { computed, nextTick, ref, useId, watch } from 'vue'
import JinIcon from './JinIcon.vue'
import JinPopover from './JinPopover.vue'
import { useFieldContext } from './field-context'
import { useT } from '../composables/useT'
import { createTypeaheadBuffer, nextRovingIndex } from '../core/roving'
import type { Size } from '../core/types'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  /** Anything the #option slot wants to render. */
  data?: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    options?: SelectOption[]
    /** Render the platform <select> instead of the listbox popover. */
    native?: boolean
    size?: Size
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    block?: boolean
    ariaLabel?: string
    /** Custom mode only: keep the listbox open after choosing. */
    keepOpen?: boolean
  }>(),
  {
    modelValue: null,
    options: () => [],
    native: false,
    size: 'md',
    placeholder: '',
    disabled: false,
    invalid: false,
    block: true,
    ariaLabel: '',
    keepOpen: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | null): void
  (event: 'change', value: string | null, option: SelectOption | null): void
}>()

const field = useFieldContext()
const { t } = useT()
const generated = useId()
const controlId = computed(() => field?.controlId ?? `jin-select-${generated}`)
const describedBy = computed(() => field?.describedBy.value)
const isInvalid = computed(() => props.invalid || Boolean(field?.invalid.value))
const isRequired = computed(() => Boolean(field?.required.value))

const open = ref(false)
const activeIndex = ref(-1)
const listbox = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const buffer = createTypeaheadBuffer()

const selected = computed(() => props.options.find((option) => option.value === props.modelValue) ?? null)
const displayLabel = computed(() => selected.value?.label ?? props.placeholder)
const isPlaceholder = computed(() => selected.value === null)

function isDisabledAt(index: number): boolean {
  return props.options[index]?.disabled === true
}

function openList(): void {
  if (props.disabled || props.native) return
  open.value = true
  const selectedIndex = props.options.findIndex((option) => option.value === props.modelValue && !option.disabled)
  activeIndex.value = selectedIndex >= 0 ? selectedIndex : firstEnabled()
  void nextTick(() => listbox.value?.focus())
}

function closeList(): void {
  open.value = false
  trigger.value?.focus()
}

function toggle(): void {
  if (open.value) closeList()
  else openList()
}

function firstEnabled(): number {
  return props.options.findIndex((option) => !option.disabled)
}

function commit(index: number): void {
  const option = props.options[index]
  if (!option || option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value, option)
  if (!props.keepOpen) closeList()
}

function move(direction: 1 | -1 | 'first' | 'last'): void {
  const count = props.options.length
  if (count === 0) return
  const key = direction === 'first' ? 'Home' : direction === 'last' ? 'End' : direction === 1 ? 'ArrowDown' : 'ArrowUp'
  let next: number | null = null
  let cursor = activeIndex.value
  // Skip disabled options by stepping until an enabled one appears.
  for (let guard = 0; guard < count; guard += 1) {
    const candidate = nextRovingIndex(key, cursor, count, { orientation: 'vertical', loop: true })
    if (candidate === null) break
    cursor = candidate
    if (!isDisabledAt(candidate)) {
      next = candidate
      break
    }
  }
  if (next !== null) activeIndex.value = next
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowUp':
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (!open.value) openList()
      else if (event.key === 'Enter' || event.key === ' ') commit(activeIndex.value)
      else move(event.key === 'ArrowDown' ? 1 : -1)
      return
    case 'Home':
    case 'End':
      if (open.value) {
        event.preventDefault()
        move(event.key === 'Home' ? 'first' : 'last')
      }
      return
  }
  if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
    const query = buffer.push(event.key)
    const match = props.options.findIndex(
      (option) => !option.disabled && option.label.toLowerCase().startsWith(query.toLowerCase()),
    )
    if (match >= 0) {
      event.preventDefault()
      if (open.value) activeIndex.value = match
      else commit(match)
    }
  }
}

function onListKeydown(event: KeyboardEvent): void {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      move(-1)
      break
    case 'Home':
      event.preventDefault()
      move('first')
      break
    case 'End':
      event.preventDefault()
      move('last')
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      commit(activeIndex.value)
      break
    case 'Escape':
      event.preventDefault()
      closeList()
      break
    case 'Tab':
      closeList()
      break
  }
}

function onNativeChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  const normalized = value === '' ? null : value
  emit('update:modelValue', normalized)
  emit('change', normalized, props.options.find((option) => option.value === normalized) ?? null)
}

// Keep the active row scrolled into view while navigating.
watch(activeIndex, () => {
  void nextTick(() => {
    const rows = listbox.value?.querySelectorAll<HTMLElement>('[data-jin-select-option]')
    rows?.[activeIndex.value]?.scrollIntoView({ block: 'nearest' })
  })
})

defineExpose({ open: openList, close: closeList })
</script>

<template>
  <!-- Native fallback: one API, platform behaviour. -->
  <select
    v-if="props.native"
    :id="controlId"
    class="jin-select__native"
    :class="{ 'jin-select--block': props.block }"
    :value="props.modelValue ?? ''"
    :disabled="props.disabled"
    :aria-invalid="isInvalid ? 'true' : undefined"
    :aria-describedby="describedBy"
    :aria-required="isRequired ? 'true' : undefined"
    :aria-label="props.ariaLabel || undefined"
    @change="onNativeChange"
  >
    <option v-if="props.placeholder" value="" disabled>{{ props.placeholder }}</option>
    <option v-for="option in props.options" :key="option.value" :value="option.value" :disabled="option.disabled">
      {{ option.label }}
    </option>
  </select>

  <!-- Custom listbox. -->
  <div
    v-else
    class="jin-select"
    :class="[
      `jin-select--${props.size}`,
      { 'jin-select--invalid': isInvalid, 'jin-select--disabled': props.disabled, 'jin-select--block': props.block },
    ]"
  >
    <button
      :id="controlId"
      ref="trigger"
      type="button"
      class="jin-select__trigger jin-focus-ring"
      role="combobox"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="listbox"
      :aria-controls="open ? `${controlId}-listbox` : undefined"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="describedBy"
      :aria-required="isRequired ? 'true' : undefined"
      :aria-label="props.ariaLabel || undefined"
      :disabled="props.disabled"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <span class="jin-select__value" :class="{ 'jin-select__value--placeholder': isPlaceholder }">
        {{ displayLabel || t('select.noOptions') }}
      </span>
      <JinIcon name="chevron-down" class="jin-select__chevron" :class="{ 'jin-select__chevron--open': open }" />
    </button>

    <JinPopover
      :model-value="open"
      :anchor="trigger"
      placement="bottom-start"
      :offset="4"
      :flip="true"
      @update:model-value="(value) => (open = value)"
    >
      <ul
        :id="`${controlId}-listbox`"
        ref="listbox"
        class="jin-select__listbox"
        role="listbox"
        tabindex="-1"
        :aria-label="props.ariaLabel || undefined"
        :aria-activedescendant="activeIndex >= 0 ? `${controlId}-option-${activeIndex}` : undefined"
        @keydown="onListKeydown"
      >
        <li v-if="props.options.length === 0" class="jin-select__empty">{{ t('select.noOptions') }}</li>
        <li
          v-for="(option, index) in props.options"
          :id="`${controlId}-option-${index}`"
          :key="option.value"
          data-jin-select-option
          class="jin-select__option"
          :class="{
            'jin-select__option--active': index === activeIndex,
            'jin-select__option--selected': option.value === props.modelValue,
            'jin-select__option--disabled': option.disabled,
          }"
          role="option"
          :aria-selected="option.value === props.modelValue ? 'true' : 'false'"
          :aria-disabled="option.disabled ? 'true' : undefined"
          @pointerdown.prevent
          @click="commit(index)"
          @pointermove="!option.disabled && (activeIndex = index)"
        >
          <span class="jin-select__option-label">
            <slot name="option" :option="option" :selected="option.value === props.modelValue">{{ option.label }}</slot>
          </span>
          <JinIcon v-if="option.value === props.modelValue" name="check" />
        </li>
      </ul>
    </JinPopover>
  </div>
</template>
