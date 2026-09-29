<script setup lang="ts">
/**
 * JinSkeleton — placeholder shapes while content loads. A paragraph of lines
 * is several `text` variants in a row; there is no separate wrapper component.
 */
import { computed, type CSSProperties } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'text' | 'rect' | 'circle'
    width?: string | number
    height?: string | number
    /** Sweep animation. Disabled automatically under reduced motion. */
    animated?: boolean
  }>(),
  { variant: 'text', width: '', height: '', animated: true },
)

function toLength(value: string | number): string | undefined {
  if (value === '' || value === undefined) return undefined
  return typeof value === 'number' ? `${value}px` : value
}

const style = computed<CSSProperties>(() => {
  const next: CSSProperties = {}
  const width = toLength(props.width)
  const height = toLength(props.height)
  if (width) next.width = width
  if (height) next.height = height
  return next
})
</script>

<template>
  <span
    class="jin-skeleton"
    :class="[
      `jin-skeleton--${props.variant}`,
      { 'jin-skeleton--animated': props.animated },
    ]"
    :style="style"
    aria-hidden="true"
  />
</template>
