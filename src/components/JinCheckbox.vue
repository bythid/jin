<script setup lang="ts">
/**
 * JinCheckbox — with indeterminate support (a mixed state that is announced,
 * not merely drawn as a dash).
 */
import { computed, useId } from 'vue'
import JinIcon from './JinIcon.vue'
import { useFieldContext } from './field-context'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    /** Overrides the visual state independently of v-model. */
    indeterminate?: boolean
    label?: string
    hint?: string
    disabled?: boolean
    invalid?: boolean
    /** Value used when several checkboxes feed one array model. */
    value?: string
    name?: string
  }>(),
  {
    modelValue: false,
    indeterminate: false,
    label: '',
    hint: '',
    disabled: false,
    invalid: false,
    value: '',
    name: '',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'change', value: boolean): void
}>()

const field = useFieldContext()
const generated = useId()
const controlId = computed(() => field?.controlId ?? `jin-checkbox-${generated}`)
const isInvalid = computed(() => props.invalid || Boolean(field?.invalid.value))

const checked = computed(() => props.modelValue === true)

function onChange(event: Event): void {
  const next = (event.target as HTMLInputElement).checked
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <label
    class="jin-checkbox"
    :class="{
      'jin-checkbox--checked': checked,
      'jin-checkbox--indeterminate': props.indeterminate && !checked,
      'jin-checkbox--disabled': props.disabled,
      'jin-checkbox--invalid': isInvalid,
    }"
  >
    <input
      :id="controlId"
      class="jin-checkbox__input"
      type="checkbox"
      :checked="checked"
      :disabled="props.disabled"
      :name="props.name || undefined"
      :value="props.value || undefined"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="field?.describedBy.value"
      :aria-checked="props.indeterminate && !checked ? 'mixed' : undefined"
      @change="onChange"
    />
    <span class="jin-checkbox__box" aria-hidden="true">
      <JinIcon v-if="props.indeterminate && !checked" name="minus" :size="0.85" />
      <JinIcon v-else-if="checked" name="check" :size="0.85" />
    </span>
    <span v-if="props.label || props.hint || $slots.default" class="jin-checkbox__content">
      <span class="jin-checkbox__label"><slot>{{ props.label }}</slot></span>
      <span v-if="props.hint" class="jin-checkbox__hint">{{ props.hint }}</span>
    </span>
  </label>
</template>
