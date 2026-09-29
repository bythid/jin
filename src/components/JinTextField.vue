<script setup lang="ts">
/**
 * JinTextField — single-line input and textarea variant.
 *
 * Inside a <JinField> it inherits the label / hint / error wiring; standalone
 * it generates its own ids. Validation state is `aria-invalid` plus the error
 * text itself, never colour alone.
 */
import { computed, ref, useAttrs, useId, useSlots } from 'vue'
import JinIcon from './JinIcon.vue'
import JinButton from './JinButton.vue'
import { useFieldContext } from './field-context'
import { useT } from '../composables/useT'
import type { Size } from '../core/types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    /** Textarea when true, with autosize support. */
    multiline?: boolean
    rows?: number
    autosize?: boolean
    /** Grows up to this many rows, then scrolls. */
    maxRows?: number
    type?: string
    size?: Size
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    /** Shows a clear button when there is content. */
    clearable?: boolean
    /** Shows a character counter; combined with `maxlength` it warns on overflow. */
    showCount?: boolean
    maxlength?: number
    invalid?: boolean
    /** Stretch to the container width. */
    block?: boolean
    ariaLabel?: string
  }>(),
  {
    modelValue: '',
    multiline: false,
    rows: 3,
    autosize: false,
    maxRows: 8,
    type: 'text',
    size: 'md',
    placeholder: '',
    disabled: false,
    readonly: false,
    clearable: false,
    showCount: false,
    maxlength: undefined,
    invalid: false,
    block: true,
    ariaLabel: '',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'input', value: string): void
  (event: 'change', value: string): void
  (event: 'clear'): void
  (event: 'focus', payload: FocusEvent): void
  (event: 'blur', payload: FocusEvent): void
  (event: 'keydown', payload: KeyboardEvent): void
}>()

const attrs = useAttrs()
const slots = useSlots()
const field = useFieldContext()
const { t } = useT()
const generated = useId()
const inputElement = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

const controlId = computed(() => field?.controlId ?? `jin-input-${generated}`)
const describedBy = computed(() => field?.describedBy.value ?? (props.ariaLabel ? undefined : undefined))
const isInvalid = computed(() => props.invalid || Boolean(field?.invalid.value))
const isRequired = computed(() => Boolean(field?.required.value))

const text = computed(() => (props.modelValue === null || props.modelValue === undefined ? '' : String(props.modelValue)))
const length = computed(() => text.value.length)
const overflow = computed(() => props.maxlength !== undefined && length.value > props.maxlength)
const showClear = computed(() => props.clearable && !props.disabled && !props.readonly && text.value.length > 0)

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)
  emit('input', value)
  if (props.multiline && props.autosize) resize()
}

function onChange(event: Event): void {
  emit('change', (event.target as HTMLInputElement).value)
}

function clear(): void {
  const element = inputElement.value
  emit('update:modelValue', '')
  emit('input', '')
  emit('clear')
  element?.focus()
}

function resize(): void {
  const element = inputElement.value
  if (!element || element.tagName !== 'TEXTAREA') return
  const style = typeof getComputedStyle === 'function' ? getComputedStyle(element) : null
  const lineHeight = style ? Number.parseFloat(style.lineHeight) || 20 : 20
  const padding = style ? (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0) : 0
  const border = style ? (Number.parseFloat(style.borderTopWidth) || 0) + (Number.parseFloat(style.borderBottomWidth) || 0) : 0
  element.style.height = 'auto'
  const max = lineHeight * props.maxRows + padding + border
  const next = Math.min(element.scrollHeight + border, max)
  element.style.height = `${next}px`
  element.style.overflowY = element.scrollHeight + border > max ? 'auto' : 'hidden'
}

function focus(): void {
  inputElement.value?.focus()
}

defineExpose({ focus, element: inputElement })
</script>

<template>
  <div
    class="jin-text-field"
    :class="[
      `jin-text-field--${props.size}`,
      {
        'jin-text-field--invalid': isInvalid,
        'jin-text-field--disabled': props.disabled,
        'jin-text-field--readonly': props.readonly,
        'jin-text-field--block': props.block,
        'jin-text-field--multiline': props.multiline,
      },
    ]"
  >
    <div class="jin-text-field__box" :class="{ 'jin-focus-ring': false }">
      <span v-if="slots.prefix" class="jin-text-field__affix"><slot name="prefix" /></span>

      <textarea
        v-if="props.multiline"
        ref="inputElement"
        class="jin-text-field__input jin-text-field__input--textarea"
        :id="controlId"
        :value="text"
        :rows="props.rows"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :maxlength="props.maxlength"
        :aria-invalid="isInvalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        :aria-required="isRequired ? 'true' : undefined"
        :aria-label="props.ariaLabel || undefined"
        v-bind="attrs"
        @input="onInput"
        @change="onChange"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
        @keydown="$emit('keydown', $event)"
      />

      <input
        v-else
        ref="inputElement"
        class="jin-text-field__input"
        :id="controlId"
        :type="props.type"
        :value="text"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :maxlength="props.maxlength"
        :aria-invalid="isInvalid ? 'true' : undefined"
        :aria-describedby="describedBy"
        :aria-required="isRequired ? 'true' : undefined"
        :aria-label="props.ariaLabel || undefined"
        v-bind="attrs"
        @input="onInput"
        @change="onChange"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
        @keydown="$emit('keydown', $event)"
      />

      <span v-if="slots.suffix" class="jin-text-field__affix"><slot name="suffix" /></span>

      <JinButton
        v-if="showClear"
        class="jin-text-field__clear"
        variant="ghost"
        size="sm"
        icon
        type="button"
        :label="t('a11y.clear')"
        @click="clear"
      >
        <template #icon><JinIcon name="close" /></template>
      </JinButton>
    </div>

    <span v-if="props.showCount" class="jin-text-field__count" :class="{ 'jin-text-field__count--overflow': overflow }">
      {{ length }}<template v-if="props.maxlength !== undefined">/{{ props.maxlength }}</template>
    </span>
  </div>
</template>
