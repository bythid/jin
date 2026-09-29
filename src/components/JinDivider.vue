<script setup lang="ts">
/**
 * JinDivider — structural rule. Offers a labelled variant (a heading between
 * two rules), which is why it is a flex container rather than a bare <hr>.
 */
withDefaults(
  defineProps<{
    orientation?: 'horizontal' | 'vertical'
    /** Adds vertical margin. */
    spaced?: boolean
    label?: string
  }>(),
  { orientation: 'horizontal', spaced: false, label: '' },
)
</script>

<template>
  <div
    v-if="label || $slots.default"
    class="jin-divider jin-divider--labeled"
    :class="{ 'jin-divider--spaced': spaced }"
    role="separator"
    :aria-label="label || undefined"
  >
    <slot>{{ label }}</slot>
  </div>
  <hr
    v-else
    class="jin-divider"
    :class="[`jin-divider--${orientation}`, { 'jin-divider--spaced': spaced }]"
    :aria-orientation="orientation === 'vertical' ? 'vertical' : undefined"
  />
</template>
