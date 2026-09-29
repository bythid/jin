<script setup lang="ts">
/**
 * The library's tiny icon set. There is no standalone Icon component in the
 * public API on purpose: every control that needs a glyph accepts a slot, and
 * this component is the default drawing used when the application passes
 * nothing. Sizes are in `em` so icons follow the surrounding font size.
 */
import { computed, type CSSProperties } from 'vue'
import { ICON_PATHS, type IconName } from './icon-paths'

const props = withDefaults(
  defineProps<{
    name: IconName
    /** Rendered size in em; follows the surrounding font size by default. */
    size?: number
    /** Accessible label. Omit for a decorative icon. */
    label?: string
  }>(),
  { size: 1, label: '' },
)

const path = computed(() => ICON_PATHS[props.name] ?? ICON_PATHS.info)
const style = computed<CSSProperties>(() => ({ width: `${props.size}em`, height: `${props.size}em` }))
const decorative = computed(() => props.label.length === 0)
</script>

<template>
  <svg
    class="jin-icon"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    :style="style"
    :aria-hidden="decorative ? 'true' : undefined"
    :role="decorative ? undefined : 'img'"
    v-bind="$attrs"
  >
    <title v-if="!decorative">{{ label }}</title>
    <path :d="path" />
  </svg>
</template>

<style>
.jin-icon {
  display: inline-block;
  flex: none;
  vertical-align: -0.125em;
  overflow: visible;
}
</style>
