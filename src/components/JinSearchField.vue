<script setup lang="ts">
/**
 * JinSearchField — a text field specialised for search. Deliberately a thin
 * wrapper: a search icon, a clear button, and a `search` emit that fires on
 * Enter, on clear, and after the debounce.
 */
import { computed, ref, useId, watch } from 'vue'
import JinIcon from './JinIcon.vue'
import JinButton from './JinButton.vue'
import { useFieldContext } from './field-context'
import { useT } from '../composables/useT'
import type { Size } from '../core/types'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    size?: Size
    disabled?: boolean
    /** Emit `search` after this many ms of no typing. 0 disables the debounce. */
    debounce?: number
    /** Show the clear affordance. */
    clearable?: boolean
    /** Submit-like behaviour: emit `search` on Enter. */
    immediate?: boolean
    ariaLabel?: string
    block?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: '',
    size: 'md',
    disabled: false,
    debounce: 300,
    clearable: true,
    immediate: true,
    ariaLabel: '',
    block: true,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'search', value: string): void
  (event: 'clear'): void
}>()

const field = useFieldContext()
const { t } = useT()
const generated = useId()
const input = ref<HTMLInputElement | null>(null)
const controlId = computed(() => field?.controlId ?? `jin-search-${generated}`)
const text = computed(() => props.modelValue ?? '')
const hasText = computed(() => text.value.length > 0)

let timer: ReturnType<typeof setTimeout> | null = null

function clearTimer(): void {
  if (timer !== null) clearTimeout(timer)
  timer = null
}

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  clearTimer()
  if (props.debounce > 0) {
    timer = setTimeout(() => emit('search', value), props.debounce)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && props.immediate) {
    clearTimer()
    emit('search', text.value)
  }
  if (event.key === 'Escape' && hasText.value) {
    event.stopPropagation()
    clearValue()
  }
}

function clearValue(): void {
  clearTimer()
  emit('update:modelValue', '')
  emit('search', '')
  emit('clear')
  input.value?.focus()
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) clearTimer()
  },
)

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div
    class="jin-text-field jin-search-field"
    :class="[
      `jin-text-field--${props.size}`,
      { 'jin-text-field--disabled': props.disabled, 'jin-text-field--block': props.block },
    ]"
  >
    <div class="jin-text-field__box">
      <span class="jin-text-field__icon" aria-hidden="true">
        <JinIcon name="search" />
      </span>
      <input
        :id="controlId"
        ref="input"
        class="jin-text-field__input"
        type="search"
        role="searchbox"
        :value="text"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :aria-label="props.ariaLabel || t('a11y.search')"
        :aria-describedby="field?.describedBy.value"
        @input="onInput"
        @keydown="onKeydown"
      />
      <JinButton
        v-if="props.clearable && hasText"
        variant="ghost"
        size="sm"
        icon
        type="button"
        :label="t('a11y.clear')"
        @click="clearValue"
      >
        <template #icon><JinIcon name="close" /></template>
      </JinButton>
    </div>
  </div>
</template>
