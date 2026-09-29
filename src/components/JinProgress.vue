<script setup lang="ts">
/**
 * JinProgress — linear bar and circular ring, determinate and indeterminate.
 *
 * Indeterminate mode conveys activity through motion; determinate mode always
 * prints the percentage as text, so the state is never colour-only.
 */
import { computed } from 'vue'
import { useT } from '../composables/useT'
import type { Size } from '../core/types'

const props = withDefaults(
  defineProps<{
    variant?: 'linear' | 'circular'
    /** 0–100. Omit (or set null) for indeterminate. */
    value?: number | null
    max?: number
    size?: Size
    label?: string
    /** Show the numeric percentage next to the bar. */
    showValue?: boolean
    /** Circular only: ring diameter in px. */
    diameter?: number
  }>(),
  {
    variant: 'linear',
    value: null,
    max: 100,
    size: 'md',
    label: '',
    showValue: true,
    diameter: 48,
  },
)

const { t } = useT()

const indeterminate = computed(() => props.value === null || props.value === undefined)
const safeMax = computed(() => (props.max > 0 ? props.max : 100))
const clamped = computed(() => {
  if (indeterminate.value) return 0
  const raw = Number(props.value)
  if (!Number.isFinite(raw)) return 0
  return Math.min(Math.max(raw, 0), safeMax.value)
})
const percent = computed(() => Math.round((clamped.value / safeMax.value) * 100))

const accessibleLabel = computed(() => props.label || t('a11y.loading'))
const ariaValueText = computed(() => (indeterminate.value ? accessibleLabel.value : `${percent.value}%`))

const RADIUS = 20
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dashOffset = computed(() => CIRCUMFERENCE * (1 - percent.value / 100))
const ringStyle = computed(() => ({
  strokeDasharray: `${CIRCUMFERENCE}`,
  strokeDashoffset: `${dashOffset.value}`,
}))
</script>

<template>
  <div
    v-if="props.variant === 'linear'"
    class="jin-progress"
    :class="[`jin-progress--${props.size}`, { 'jin-progress--indeterminate': indeterminate }]"
  >
    <div
      class="jin-progress__track"
      role="progressbar"
      :aria-label="accessibleLabel"
      :aria-valuemin="indeterminate ? undefined : 0"
      :aria-valuemax="indeterminate ? undefined : safeMax"
      :aria-valuenow="indeterminate ? undefined : clamped"
      :aria-valuetext="ariaValueText"
    >
      <div v-if="!indeterminate" class="jin-progress__bar" :style="{ width: `${percent}%` }" />
    </div>
    <div v-if="props.showValue && !indeterminate" class="jin-progress__meta">
      <span v-if="props.label">{{ props.label }}</span>
      <span class="jin-progress__value">{{ percent }}%</span>
    </div>
  </div>

  <div
    v-else
    class="jin-progress jin-progress--circular"
    :style="{ width: `${props.diameter}px`, height: `${props.diameter}px` }"
  >
    <svg
      :viewBox="`0 0 48 48`"
      :width="props.diameter"
      :height="props.diameter"
      role="progressbar"
      :aria-label="accessibleLabel"
      :aria-valuemin="indeterminate ? undefined : 0"
      :aria-valuemax="indeterminate ? undefined : safeMax"
      :aria-valuenow="indeterminate ? undefined : clamped"
      :aria-valuetext="ariaValueText"
    >
      <circle class="jin-progress__ring-track" cx="24" cy="24" :r="RADIUS" fill="none" stroke-width="4" />
      <circle
        class="jin-progress__ring-value"
        cx="24"
        cy="24"
        :r="RADIUS"
        fill="none"
        stroke-width="4"
        stroke-linecap="round"
        :style="ringStyle"
        :transform="`rotate(-90 24 24)`"
      />
    </svg>
    <span v-if="props.showValue && !indeterminate" class="jin-progress__ring-label">{{ percent }}%</span>
  </div>
</template>
