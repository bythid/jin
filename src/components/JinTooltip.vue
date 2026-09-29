<script setup lang="ts">
/**
 * JinTooltip — hover/focus triggered hint with open/close delays.
 *
 * Non-interactive by design (no focusable content inside), so it must never be
 * the only place a piece of information exists. Touch input reaches it on focus.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useOverlay } from '../composables/useOverlay'
import { usePositioning } from '../composables/usePositioning'
import { createId } from '../core/id'
import type { Placement } from '../core/types'

const props = withDefaults(
  defineProps<{
    content?: string
    placement?: Placement
    /** Delay before showing, in ms. */
    openDelay?: number
    /** Delay before hiding, in ms. */
    closeDelay?: number
    disabled?: boolean
    offset?: number
    /** Accessible name when the tooltip only repeats the control's label. */
    ariaLabel?: string
  }>(),
  {
    content: '',
    placement: 'top',
    openDelay: 300,
    closeDelay: 80,
    disabled: false,
    offset: 6,
    ariaLabel: '',
  },
)

const overlay = useOverlay()
const anchorElement = ref<HTMLElement | null>(null)
const floating = ref<HTMLElement | null>(null)
const visible = ref(false)
const overlayId = ref<string | null>(null)
const instanceId = createId('tip')
const tooltipId = `jin-tooltip-${instanceId}`

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

const portalTarget = computed(() => overlay.root.value)

const { position, floatingStyle, scheduleUpdate } = usePositioning({
  floating,
  anchor: anchorElement,
  placement: () => props.placement,
  offset: () => props.offset,
  immediate: false,
  autoUpdate: () => visible.value,
})

const style = computed(() => {
  const z = overlay.entryZIndex(overlayId.value)
  return z === null ? { ...floatingStyle.value } : { ...floatingStyle.value, zIndex: String(z) }
})

function clearTimers(): void {
  if (openTimer !== null) clearTimeout(openTimer)
  if (closeTimer !== null) clearTimeout(closeTimer)
  openTimer = null
  closeTimer = null
}

function show(): void {
  if (props.disabled) return
  clearTimers()
  const delay = props.openDelay
  if (delay <= 0) {
    commitOpen()
    return
  }
  openTimer = setTimeout(commitOpen, delay)
}

function commitOpen(): void {
  if (visible.value) return
  visible.value = true
  const entry = overlay.register({
    id: `jin-tooltip-${instanceId}`,
    layer: 'tooltip',
    dismissOnEsc: true,
    dismissOnOutside: true,
    onDismiss: () => commitHide(),
  })
  overlayId.value = entry.id
  scheduleUpdate()
  // A second pass once the content has laid out.
  requestAnimationFrame(() => scheduleUpdate())
}

function hide(): void {
  clearTimers()
  const delay = props.closeDelay
  if (delay <= 0) {
    commitHide()
    return
  }
  closeTimer = setTimeout(commitHide, delay)
}

function commitHide(): void {
  clearTimers()
  visible.value = false
  if (overlayId.value) {
    overlay.unregister(overlayId.value)
    overlayId.value = null
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') commitHide()
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) commitHide()
  },
)

onBeforeUnmount(() => {
  clearTimers()
  if (overlayId.value) overlay.unregister(overlayId.value)
})
</script>

<template>
  <span
    ref="anchorElement"
    class="jin-tooltip-anchor"
    :aria-describedby="visible && content ? tooltipId : undefined"
    @pointerenter="show"
    @pointerleave="hide"
    @focusin="show"
    @focusout="hide"
    @keydown="onKeydown"
    @pointerdown="commitHide"
  >
    <slot />
  </span>

  <Teleport v-if="portalTarget" :to="portalTarget">
    <div
      v-show="visible"
      :id="tooltipId"
      ref="floating"
      class="jin-tooltip"
      :style="style"
      :data-placement="position.placement"
      role="tooltip"
      :aria-label="props.ariaLabel || undefined"
    >
      <slot name="content">{{ props.content }}</slot>
      <span
        v-if="position.arrow"
        class="jin-tooltip__arrow"
        :style="{ left: `${position.arrow.x}px`, top: `${position.arrow.y}px`, margin: '-4px' }"
        aria-hidden="true"
      />
    </div>
  </Teleport>
</template>
