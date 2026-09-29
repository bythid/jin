<script setup lang="ts">
/**
 * JinField — the label / hint / error / required container every other form
 * control composes. It owns the id wiring and publishes it through field
 * context, so a control placed in the default slot gets its aria attributes
 * right without the application passing ids around.
 */
import { computed, provide, useId } from 'vue'
import JinIcon from './JinIcon.vue'
import { fieldContextKey, joinIds, type FieldContext } from './field-context'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    required?: boolean
    /** Shows an "(optional)" tag; only meaningful when not required. */
    optional?: boolean
    optionalLabel?: string
    /** Overrides the generated id of the control the label points at. */
    labelFor?: string
    /** Detaches the label from any control (composite controls). */
    noLabelFor?: boolean
    /** Keeps the message line's height so error text does not shift layout. */
    reserveMessageSpace?: boolean
  }>(),
  {
    label: '',
    hint: '',
    error: '',
    required: false,
    optional: false,
    optionalLabel: '',
    labelFor: '',
    noLabelFor: false,
    reserveMessageSpace: false,
  },
)

const generated = useId()
const generatedControlId = `jin-field-control-${generated}`
const labelId = `jin-field-label-${generated}`
const hintId = `jin-field-hint-${generated}`
const errorId = `jin-field-error-${generated}`

const controlId = computed(() => props.labelFor || generatedControlId)
const invalid = computed(() => props.error.length > 0)
const describedBy = computed(() => joinIds(props.hint ? hintId : undefined, invalid.value ? errorId : undefined))

const context = {
  labelId,
  hintId,
  errorId,
  controlId: controlId.value,
  describedBy,
  invalid,
  required: computed(() => props.required),
} satisfies FieldContext

provide(fieldContextKey, context)
</script>

<template>
  <div class="jin-field" :class="{ 'jin-field--invalid': invalid, 'jin-field--required': props.required }">
    <label v-if="props.label" :id="labelId" class="jin-field__label" :for="props.noLabelFor ? undefined : controlId">
      <span>{{ props.label }}</span>
      <span v-if="props.required" class="jin-field__required" aria-hidden="true">*</span>
      <span v-else-if="props.optional" class="jin-field__optional">{{ props.optionalLabel || '(optional)' }}</span>
    </label>

    <div class="jin-field__control">
      <slot :field="context" />
    </div>

    <p v-if="invalid" :id="errorId" class="jin-field__error" role="alert">
      <JinIcon name="warning" class="jin-field__error-icon" />
      <span>{{ props.error }}</span>
    </p>
    <p v-else-if="props.hint" :id="hintId" class="jin-field__hint">{{ props.hint }}</p>
    <p v-else-if="props.reserveMessageSpace" class="jin-field__hint" aria-hidden="true">&nbsp;</p>
  </div>
</template>
