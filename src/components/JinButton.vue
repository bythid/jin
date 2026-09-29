<script setup lang="ts">
/**
 * JinButton — the base action control.
 *
 * Renders <button> by default and <a> when `href` is set. Loading and disabled
 * both block activation, but only `disabled` removes it from the tab order;
 * a loading button stays focusable so keyboard users keep their place.
 */
import { computed, useAttrs } from 'vue'
import JinIcon from './JinIcon.vue'
import JinSpinner from './JinSpinner.vue'
import type { Size } from '../core/types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
    size?: Size
    /** Loading blocks activation and swaps the leading icon for a spinner. */
    loading?: boolean
    disabled?: boolean
    /** Icon-only: square, requires `label` for the accessible name. */
    icon?: boolean
    /** Renders an anchor instead of a button. */
    href?: string
    /** Stretch to the container width. */
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    label?: string
  }>(),
  { variant: 'secondary', size: 'md', loading: false, disabled: false, icon: false, block: false, type: 'button', label: '' },
)

defineEmits<{ (event: 'click', payload: MouseEvent): void }>()

const attrs = useAttrs()

const isLink = computed(() => typeof props.href === 'string' && props.href.length > 0)
const tag = computed(() => (isLink.value ? 'a' : 'button'))
const blocked = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'jin-button',
  `jin-button--${props.variant}`,
  `jin-button--${props.size}`,
  {
    'jin-button--loading': props.loading,
    'jin-button--icon': props.icon,
    'jin-button--block': props.block,
    'jin-focus-ring': true,
  },
])

const bindings = computed(() => {
  const base: Record<string, unknown> = { ...attrs, class: [classes.value, attrs.class] }
  if (isLink.value) {
    // An anchor has no disabled attribute: use aria-disabled and drop href.
    if (blocked.value) {
      base['aria-disabled'] = 'true'
      base['tabindex'] = props.disabled ? -1 : 0
      base['href'] = undefined
    } else {
      base['href'] = props.href
    }
    if (props.label) base['aria-label'] = props.label
    return base
  }
  base['type'] = props.type
  base['disabled'] = props.disabled
  if (props.loading) {
    base['aria-busy'] = 'true'
    base['aria-disabled'] = 'true'
  }
  return base
})

const showSpinner = computed(() => props.loading)
/** An icon-only button uses `label` purely as its accessible name. */
const showLabelText = computed(() => !props.icon)
</script>

<template>
  <component :is="tag" v-bind="bindings" @click="!blocked && $emit('click', $event)">
    <JinSpinner v-if="showSpinner" class="jin-button__spinner" size="sm" />
    <slot v-else name="icon" />
    <span v-if="showLabelText && !$slots.default && label" class="jin-button__label">{{ label }}</span>
    <span v-else-if="showLabelText && $slots.default" class="jin-button__label"><slot /></span>
    <!--
      The accessible name for an icon-only button. It is text rather than an
      aria-label on purpose: it is the one mechanism, it works whether or not
      the application passes a #icon slot, and it survives while loading.
    -->
    <span v-else-if="!showLabelText && !isLink && !$slots.default && label" class="jin-visually-hidden">{{ label }}</span>
  </component>
</template>
