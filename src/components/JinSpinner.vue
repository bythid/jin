<script setup lang="ts">
/**
 * JinSpinner — indeterminate activity indicator. With `label` it becomes a
 * live region so screen readers announce the wait; without, it is decorative.
 */
import { computed } from 'vue'
import { useT } from '../composables/useT'
import type { Size } from '../core/types'

const props = withDefaults(
  defineProps<{
    size?: Size
    label?: string
  }>(),
  { size: 'md', label: '' },
)

const { t } = useT()
const accessibleLabel = computed(() => props.label || t('a11y.loading'))
const decorative = computed(() => props.label === '')
</script>

<template>
  <span
    class="jin-spinner"
    :class="`jin-spinner--${props.size}`"
    :role="decorative ? undefined : 'status'"
    :aria-hidden="decorative ? 'true' : undefined"
    :aria-label="decorative ? undefined : accessibleLabel"
  >
    <svg class="jin-spinner__svg" viewBox="0 0 24 24" fill="none" focusable="false">
      <circle class="jin-spinner__track" cx="12" cy="12" r="9" stroke-width="3" />
      <path class="jin-spinner__arc" d="M21 12a9 9 0 0 0-9-9" stroke-width="3" stroke-linecap="round" />
    </svg>
    <span v-if="!decorative" class="jin-visually-hidden">{{ accessibleLabel }}</span>
  </span>
</template>
