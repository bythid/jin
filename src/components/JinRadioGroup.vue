<script setup lang="ts">
/**
 * JinRadioGroup (+ JinRadio) — a roving-tabindex radio group.
 *
 * The group owns the value and the arrow-key order; the radio is a thin row.
 * Semantics come from native inputs, so screen readers get real radio buttons.
 */
import { computed, provide, ref, useId, watch } from 'vue'
import { fieldContextKey, useFieldContext, type FieldContext } from './field-context'
import { nextRovingIndex } from '../core/roving'

export interface RadioOption {
  value: string
  label: string
  hint?: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    options?: RadioOption[]
    name?: string
    label?: string
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    orientation?: 'vertical' | 'horizontal'
  }>(),
  {
    modelValue: null,
    options: () => [],
    name: '',
    label: '',
    hint: '',
    error: '',
    required: false,
    disabled: false,
    orientation: 'vertical',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', value: string): void
}>()

const outerField = useFieldContext()
const generated = useId()
const groupName = computed(() => props.name || `jin-radio-${generated}`)
const legendId = `jin-radio-legend-${generated}`
const errorId = `jin-radio-error-${generated}`
const hintId = `jin-radio-hint-${generated}`
const invalid = computed(() => props.error.length > 0 || Boolean(outerField?.invalid.value))
const describedBy = computed(() => {
  if (props.error) return errorId
  if (props.hint) return hintId
  return outerField?.describedBy.value
})

// Publish the same field contract so a wrapping JinField labels the group.
if (!outerField) {
  provide(fieldContextKey, {
    labelId: legendId,
    hintId,
    errorId,
    controlId: `jin-radio-control-${generated}`,
    describedBy: computed(() => describedBy.value),
    invalid: computed(() => invalid.value),
    required: computed(() => props.required),
  } satisfies FieldContext)
}

const groupElement = ref<HTMLElement | null>(null)

function radioInputs(): HTMLInputElement[] {
  const root = groupElement.value
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
}

function focusIndex(index: number): void {
  radioInputs()[index]?.focus()
}

function enabledIndexes(): number[] {
  return props.options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0)
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const usable = enabledIndexes()
  const position = usable.indexOf(index)
  const key = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'ArrowDown' : event.key
  const next = nextRovingIndex(key as never, position, usable.length, {
    orientation: props.orientation === 'horizontal' ? 'horizontal' : 'vertical',
    loop: true,
  })
  if (next === null) return
  const target = usable[next]
  if (target === undefined) return
  event.preventDefault()
  select(target, true)
}

function select(index: number, focus = false): void {
  const option = props.options[index]
  if (!option || option.disabled || props.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  if (focus) focusIndex(index)
}

const checkedIndex = computed(() => props.options.findIndex((option) => option.value === props.modelValue))

// With nothing selected, the first enabled radio owns the tab stop.
watch(
  () => props.modelValue,
  () => {
    const inputs = radioInputs()
    if (props.modelValue === null || checkedIndex.value === -1) return
    inputs.forEach((input, index) => {
      input.tabIndex = index === checkedIndex.value ? 0 : -1
    })
  },
  { flush: 'post' },
)
</script>

<template>
  <fieldset
    ref="groupElement"
    class="jin-radio-group"
    :class="{
      'jin-radio-group--horizontal': props.orientation === 'horizontal',
      'jin-radio-group--invalid': invalid,
      'jin-radio-group--disabled': props.disabled,
    }"
    :aria-required="props.required ? 'true' : undefined"
    :aria-invalid="invalid ? 'true' : undefined"
    :aria-describedby="describedBy"
  >
    <legend v-if="props.label" :id="legendId" class="jin-radio-group__legend">
      {{ props.label }}
      <span v-if="props.required" class="jin-field__required" aria-hidden="true">*</span>
    </legend>

    <div class="jin-radio-group__options">
      <label
        v-for="(option, index) in props.options"
        :key="option.value"
        class="jin-radio"
        :class="{
          'jin-radio--checked': option.value === props.modelValue,
          'jin-radio--disabled': option.disabled || props.disabled,
        }"
      >
        <input
          class="jin-radio__input"
          type="radio"
          :name="groupName"
          :value="option.value"
          :checked="option.value === props.modelValue"
          :disabled="option.disabled || props.disabled"
          :tabindex="checkedIndex === -1 ? (enabledIndexes()[0] === index ? 0 : -1) : option.value === props.modelValue ? 0 : -1"
          @change="select(index)"
          @keydown="onKeydown($event, index)"
        />
        <span class="jin-radio__dot" aria-hidden="true" />
        <span class="jin-radio__content">
          <span class="jin-radio__label">{{ option.label }}</span>
          <span v-if="option.hint" class="jin-checkbox__hint">{{ option.hint }}</span>
        </span>
      </label>
    </div>

    <p v-if="invalid && props.error" :id="errorId" class="jin-field__error" role="alert">{{ props.error }}</p>
    <p v-else-if="props.hint" :id="hintId" class="jin-field__hint">{{ props.hint }}</p>
  </fieldset>
</template>
