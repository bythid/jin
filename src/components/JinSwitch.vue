<script setup lang="ts">
/**
 * JinSwitch — on/off toggle. `role="switch"` on the native checkbox so the
 * checked state is exposed as on/off rather than true/false.
 */
import { computed, useId } from 'vue'
import { useFieldContext } from './field-context'
import type { Size } from '../core/types'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    label?: string
    /** Rendered after the switch; also the accessible name fallback. */
    disabled?: boolean
    size?: Size
    name?: string
    ariaLabel?: string
  }>(),
  { modelValue: false, label: '', disabled: false, size: 'md', name: '', ariaLabel: '' },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'change', value: boolean): void
}>()

const field = useFieldContext()
const generated = useId()
const controlId = computed(() => field?.controlId ?? `jin-switch-${generated}`)
const checked = computed(() => props.modelValue === true)

function onChange(event: Event): void {
  const next = (event.target as HTMLInputElement).checked
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <label
    class="jin-switch"
    :class="[`jin-switch--${props.size}`, { 'jin-switch--checked': checked, 'jin-switch--disabled': props.disabled }]"
  >
    <input
      :id="controlId"
      class="jin-switch__input"
      type="checkbox"
      role="switch"
      :checked="checked"
      :disabled="props.disabled"
      :name="props.name || undefined"
      :aria-label="!props.label ? props.ariaLabel || undefined : undefined"
      :aria-describedby="field?.describedBy.value"
      @change="onChange"
    />
    <span class="jin-switch__track" aria-hidden="true">
      <span class="jin-switch__thumb" />
    </span>
    <span v-if="props.label || $slots.default" class="jin-switch__label"><slot>{{ props.label }}</slot></span>
  </label>
</template>
