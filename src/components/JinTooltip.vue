<script setup lang="ts">
/**
 * JinTooltip — hover/focus triggered hint with open/close delays.
 *
 * Non-interactive by design (no focusable content inside), so it must never be
 * the only place a piece of information exists. Touch input reaches it on focus.
 *
 * The whole open/close decision — two intents, their delays, press/Escape
 * suppression — lives in core/tooltip-trigger.ts. This component only renders:
 * it forwards DOM events into the machine, schedules the phase it reports and
 * paints the result.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useOverlay } from '../composables/useOverlay'
import { usePositioning } from '../composables/usePositioning'
import { createId } from '../core/id'
import { createTooltipTrigger, type TriggerPhase } from '../core/tooltip-trigger'
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
const overlayId = ref<string | null>(null)
const instanceId = createId('tip')
const tooltipId = `jin-tooltip-${instanceId}`

const trigger = createTooltipTrigger({
  openDelay: () => props.openDelay,
  closeDelay: () => props.closeDelay,
  disabled: () => props.disabled,
})
const phase = ref<TriggerPhase>(trigger.state().phase)
const unsubscribe = trigger.subscribe(() => {
  phase.value = trigger.state().phase
})

let openTimer: ReturnType<typeof setTimeout> | null = null
let closeTimer: ReturnType<typeof setTimeout> | null = null

const portalTarget = computed(() => overlay.root.value)

// The painted windows: committed open, and the linger after a leave.
const visible = computed(() => phase.value === 'open' || phase.value === 'close-pending')

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

function commitOpen(): void {
  if (overlayId.value) return
  const entry = overlay.register({
    id: tooltipId,
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

function commitHide(): void {
  if (!overlayId.value) return
  overlay.unregister(overlayId.value)
  overlayId.value = null
}

watch(
  phase,
  (to, from) => {
    clearTimers()
    if (to === 'open-pending') openTimer = setTimeout(() => trigger.event('open-due'), props.openDelay)
    if (to === 'close-pending') closeTimer = setTimeout(() => trigger.event('close-due'), props.closeDelay)
    if (to === 'open') commitOpen()
    if (to === 'closed' && from !== 'closed') commitHide()
  },
  { flush: 'post' },
)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') trigger.event('escape')
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) trigger.event('reset')
  },
)

onBeforeUnmount(() => {
  unsubscribe()
  clearTimers()
  trigger.event('reset')
  commitHide()
})
</script>

<template>
  <span
    ref="anchorElement"
    class="jin-tooltip-anchor"
    :aria-describedby="visible && content ? tooltipId : undefined"
    @pointerenter="trigger.event('hover-enter')"
    @pointerleave="trigger.event('hover-leave')"
    @focusin="trigger.event('focus-enter')"
    @focusout="trigger.event('focus-leave')"
    @keydown="onKeydown"
    @pointerdown="trigger.event('press')"
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
