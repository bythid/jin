<script setup lang="ts">
/**
 * JinAlert — inline, persistent feedback for a region of the page.
 *
 * Tone is never colour-only: each tone has its own icon, and the title text
 * carries the meaning for screen readers.
 */
import { computed } from 'vue'
import JinIcon from './JinIcon.vue'
import type { IconName } from './icon-paths'
import type { Tone } from '../core/types'
import { useT } from '../composables/useT'

const props = withDefaults(
  defineProps<{
    tone?: Tone
    title?: string
    description?: string
    /** Shows the dismiss affordance and emits `dismiss`. */
    dismissible?: boolean
    /** Accessible name for the dismiss button. */
    dismissLabel?: string
  }>(),
  { tone: 'neutral', title: '', description: '', dismissible: false, dismissLabel: '' },
)

const emit = defineEmits<{ (event: 'dismiss'): void }>()

const TONE_ICON: Record<Tone, IconName> = {
  neutral: 'info',
  accent: 'sparkle',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

const { t } = useT()
const icon = computed(() => TONE_ICON[props.tone] ?? 'info')
const role = computed(() => (props.tone === 'danger' || props.tone === 'warning' ? 'alert' : 'status'))
const closeLabel = computed(() => props.dismissLabel || t('a11y.close'))
</script>

<template>
  <div class="jin-alert" :class="`jin-alert--${props.tone}`" :role="role">
    <span class="jin-alert__icon">
      <slot name="icon">
        <JinIcon :name="icon" :size="1.15" />
      </slot>
    </span>

    <div class="jin-alert__content">
      <p v-if="props.title" class="jin-alert__title">{{ props.title }}</p>
      <p v-if="props.description" class="jin-alert__description">{{ props.description }}</p>
      <slot />
      <div v-if="$slots.actions" class="jin-alert__actions">
        <slot name="actions" />
      </div>
    </div>

    <button
      v-if="props.dismissible"
      type="button"
      class="jin-alert__close jin-button jin-button--ghost jin-button--icon jin-button--sm jin-focus-ring"
      :aria-label="closeLabel"
      @click="emit('dismiss')"
    >
      <JinIcon name="close" />
    </button>
  </div>
</template>
