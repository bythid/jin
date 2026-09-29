<script setup lang="ts">
/**
 * JinBadge — a short status marker. `label` is required for screen readers
 * unless the badge is purely decorative; a dot badge always needs a label
 * because colour alone may not carry meaning.
 */
import { computed } from 'vue'
import type { Tone } from '../core/types'

const props = withDefaults(
  defineProps<{
    tone?: Tone
    /** `dot` renders a bare status circle (pair it with a text label nearby). */
    variant?: 'text' | 'dot'
    label?: string
    /** Accessible name when the visible content is only a colour. */
    ariaLabel?: string
  }>(),
  { tone: 'neutral', variant: 'text', label: '', ariaLabel: '' },
)

const accessibleName = computed(() => props.ariaLabel || props.label)
</script>

<template>
  <span
    class="jin-badge"
    :class="[`jin-badge--${props.tone}`, { 'jin-badge--dot': props.variant === 'dot' }]"
    :role="accessibleName ? 'status' : undefined"
    :aria-label="accessibleName || undefined"
  >
    <slot>{{ props.variant === 'text' ? props.label : '' }}</slot>
    <span v-if="props.variant === 'dot' && accessibleName" class="jin-visually-hidden">{{ accessibleName }}</span>
  </span>
</template>
