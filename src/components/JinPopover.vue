<script setup lang="ts">
/**
 * JinPopover — anchored arbitrary content. Uses the one positioning
 * implementation (usePositioning) and the one dismiss implementation
 * (useDismissable + the overlay stack).
 *
 * This is also the substrate for dropdown menus, selects, tooltips and
 * popconfirms: they all render into a popover rather than re-solving anchoring.
 */
import { computed, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'
import { useOverlay } from '../composables/useOverlay'
import { usePositioning } from '../composables/usePositioning'
import { useDismissable } from '../composables/useDismissable'
import { createId } from '../core/id'
import type { Placement } from '../core/types'

const props = withDefaults(
  defineProps<{
    /** Open state, when the parent controls it. */
    modelValue?: boolean
    /** Anchor element. When omitted, the default slot's wrapper is the anchor. */
    anchor?: HTMLElement | null
    placement?: Placement
    offset?: number
    flip?: boolean
    shift?: boolean
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    /** Render the arrow. */
    arrow?: boolean
    /** The anchor is also "inside" (clicks on it do not dismiss). */
    ignoreAnchor?: boolean
    ariaLabel?: string
    role?: string
    /**
     * Declared but not implemented: the panel is always mounted while closed.
     */
    lazy?: boolean
  }>(),
  {
    modelValue: undefined,
    anchor: null,
    placement: 'bottom',
    offset: 8,
    flip: true,
    shift: true,
    closeOnEsc: true,
    closeOnOutside: true,
    arrow: false,
    ignoreAnchor: true,
    ariaLabel: '',
    role: 'dialog',
    lazy: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'open'): void
  (event: 'close'): void
}>()

const overlay = useOverlay()
const floating = ref<HTMLElement | null>(null)
const internalAnchor = ref<HTMLElement | null>(null)
const overlayId = ref<string | null>(null)
const internalOpen = ref(false)
const instanceId = createId('p')

const isControlled = computed(() => props.modelValue !== undefined)
const isOpen = computed(() => (isControlled.value ? Boolean(props.modelValue) : internalOpen.value))
const portalTarget = computed(() => overlay.root.value)
const resolvedAnchor = computed(() => props.anchor ?? internalAnchor.value)

function setOpen(next: boolean): void {
  if (!isControlled.value) internalOpen.value = next
  emit('update:modelValue', next)
  if (next) emit('open')
  else emit('close')
}

const { position, floatingStyle, scheduleUpdate } = usePositioning({
  floating,
  anchor: resolvedAnchor,
  placement: () => props.placement,
  offset: () => props.offset,
  flip: () => props.flip,
  shift: () => props.shift,
  arrow: () => (props.arrow ? { width: 8, height: 8 } : null),
  immediate: false,
  autoUpdate: () => isOpen.value,
})

const arrowStyle = computed<CSSProperties>(() => {
  const arrow = position.value.arrow
  if (!arrow) return { display: 'none' }
  return { left: `${arrow.x}px`, top: `${arrow.y}px`, margin: '-4px' }
})

const style = computed<CSSProperties>(() => {
  const z = overlay.entryZIndex(overlayId.value)
  const base: CSSProperties = { ...floatingStyle.value }
  if (z !== null) base.zIndex = String(z)
  return base
})

useDismissable({
  overlayId,
  element: floating,
  ignore: computed(() => (props.ignoreAnchor && resolvedAnchor.value ? [resolvedAnchor.value] : [])),
  closeOnEsc: computed(() => props.closeOnEsc),
  closeOnOutside: computed(() => props.closeOnOutside),
  onDismiss: () => setOpen(false),
})

watch(isOpen, (open, wasOpen) => {
  if (open) {
    const entry = overlay.register({
      id: `jin-popover-${instanceId}`,
      layer: 'dropdown',
      dismissOnEsc: false,
      dismissOnOutside: false,
    })
    overlayId.value = entry.id
    scheduleUpdate()
  } else if (wasOpen && overlayId.value) {
    overlay.unregister(overlayId.value)
    overlayId.value = null
  }
}, { immediate: true })

// A `v-if` host unmounts an open popover without a closing edge; without this
// the entry would stay in the shared stack and misroute the next Escape.
onBeforeUnmount(() => {
  if (!overlayId.value) return
  overlay.unregister(overlayId.value)
  overlayId.value = null
})

watch([() => props.placement, resolvedAnchor], () => {
  if (isOpen.value) scheduleUpdate()
})

defineExpose({ floating, position, update: scheduleUpdate })
</script>

<template>
  <span v-if="!props.anchor" ref="internalAnchor" class="jin-popover-anchor">
    <slot name="anchor" :open="isOpen" :toggle="() => setOpen(!isOpen)" />
  </span>

  <Teleport v-if="portalTarget" :to="portalTarget">
    <div
      v-show="isOpen"
      ref="floating"
      class="jin-popover"
      :style="style"
      :data-placement="position.placement"
      :role="props.role || undefined"
      :aria-label="props.ariaLabel || undefined"
      tabindex="-1"
    >
      <slot :close="() => setOpen(false)" />
      <span v-if="props.arrow" class="jin-popover__arrow" :style="arrowStyle" aria-hidden="true" />
    </div>
  </Teleport>
</template>
