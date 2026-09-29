<script setup lang="ts">
/**
 * JinTag — a removable chip. Removable tags put their remove button in the tab
 * order, because a keyboard user must be able to take a tag off.
 */
import JinIcon from './JinIcon.vue'
import { useT } from '../composables/useT'
import type { Tone } from '../core/types'

const props = withDefaults(
  defineProps<{
    tone?: Tone
    label?: string
    removable?: boolean
    removeLabel?: string
    disabled?: boolean
  }>(),
  { tone: 'neutral', label: '', removable: false, removeLabel: '', disabled: false },
)

const emit = defineEmits<{ (event: 'remove'): void }>()
const { t } = useT()
</script>

<template>
  <span class="jin-tag" :class="`jin-tag--${props.tone}`">
    <slot>{{ props.label }}</slot>
    <button
      v-if="props.removable"
      type="button"
      class="jin-tag__remove jin-focus-ring"
      :aria-label="props.removeLabel || `${t('a11y.remove')}: ${props.label}`"
      :disabled="props.disabled"
      @click="emit('remove')"
    >
      <JinIcon name="close" :size="0.8" />
    </button>
  </span>
</template>
