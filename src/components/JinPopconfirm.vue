<script setup lang="ts">
/**
 * JinPopconfirm — inline confirmation bubble with a danger variant.
 * Keyboard reachable: the confirm button receives focus on open, Esc cancels,
 * and focus returns to the trigger.
 */
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import JinIcon from './JinIcon.vue'
import JinButton from './JinButton.vue'
import { useOverlay } from '../composables/useOverlay'
import { usePositioning } from '../composables/usePositioning'
import { useDismissable } from '../composables/useDismissable'
import { useT } from '../composables/useT'
import { createId } from '../core/id'
import type { Placement, Tone } from '../core/types'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    /** Trigger element; when omitted the default slot is the trigger. */
    anchor?: HTMLElement | null
    title?: string
    description?: string
    tone?: Tone
    confirmLabel?: string
    cancelLabel?: string
    placement?: Placement
    /** Disables the confirm action and shows it as busy. */
    loading?: boolean
    closeOnConfirm?: boolean
  }>(),
  {
    modelValue: undefined,
    anchor: null,
    title: '',
    description: '',
    tone: 'neutral',
    confirmLabel: '',
    cancelLabel: '',
    placement: 'top',
    loading: false,
    closeOnConfirm: true,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'confirm'): void
  (event: 'cancel'): void
}>()

const { t } = useT()
const overlay = useOverlay()
const floating = ref<HTMLElement | null>(null)
const internalAnchor = ref<HTMLElement | null>(null)
const overlayId = ref<string | null>(null)
const internalOpen = ref(false)
const instanceId = createId('pc')
const messageId = `jin-popconfirm-${instanceId}`

const isControlled = computed(() => props.modelValue !== undefined)
const isOpen = computed(() => (isControlled.value ? Boolean(props.modelValue) : internalOpen.value))
const portalTarget = computed(() => overlay.root.value)
const resolvedAnchor = computed(() => props.anchor ?? internalAnchor.value)
const danger = computed(() => props.tone === 'danger')
const confirmText = computed(() => props.confirmLabel || t('a11y.confirm'))
const cancelText = computed(() => props.cancelLabel || t('a11y.cancel'))

function setOpen(next: boolean): void {
  if (!isControlled.value) internalOpen.value = next
  emit('update:modelValue', next)
}

function onConfirm(): void {
  emit('confirm')
  if (props.closeOnConfirm) setOpen(false)
}

function onCancel(): void {
  emit('cancel')
  setOpen(false)
}

const { position, floatingStyle, scheduleUpdate } = usePositioning({
  floating,
  anchor: resolvedAnchor,
  placement: () => props.placement,
  offset: () => 8,
  arrow: () => ({ width: 8, height: 8 }),
  immediate: false,
  autoUpdate: () => isOpen.value,
})

const style = computed(() => {
  const z = overlay.entryZIndex(overlayId.value)
  return z === null ? { ...floatingStyle.value } : { ...floatingStyle.value, zIndex: String(z) }
})

useDismissable({
  overlayId,
  element: floating,
  ignore: computed(() => (resolvedAnchor.value ? [resolvedAnchor.value] : [])),
  onDismiss: () => onCancel(),
})

watch(isOpen, (open, wasOpen) => {
  if (open) {
    const entry = overlay.register({
      id: `jin-popconfirm-${instanceId}`,
      layer: 'dropdown',
      dismissOnEsc: false,
      dismissOnOutside: false,
    })
    overlayId.value = entry.id
    scheduleUpdate()
    // The anchor can arrive together with the open flag (an external anchor
    // set at open time). Re-measure once the DOM has been updated, so the
    // first paint uses the real anchor rect instead of the previous or a
    // zero one.
    void nextTick(() => {
      scheduleUpdate()
      requestAnimationFrame(() => scheduleUpdate())
    })
    // Move focus to the confirm button so the keyboard user is not stranded.
    requestAnimationFrame(() => {
      floating.value?.querySelector<HTMLElement>('[data-jin-popconfirm-confirm]')?.focus()
    })
  } else if (wasOpen && overlayId.value) {
    overlay.unregister(overlayId.value)
    overlayId.value = null
  }
}, { immediate: true })

// A `v-if` host unmounts an open popconfirm without a closing edge; without
// this the entry would stay in the shared stack and misroute the next Escape.
onBeforeUnmount(() => {
  if (!overlayId.value) return
  overlay.unregister(overlayId.value)
  overlayId.value = null
})
</script>

<template>
  <span
    v-if="!props.anchor"
    ref="internalAnchor"
    class="jin-popconfirm-anchor"
    @keydown.escape="isOpen && onCancel()"
  >
    <slot name="anchor" :open="isOpen" :toggle="() => setOpen(!isOpen)" />
  </span>

  <Teleport v-if="portalTarget" :to="portalTarget">
    <div
      v-show="isOpen"
      ref="floating"
      class="jin-popover jin-popconfirm"
      :style="style"
      :data-placement="position.placement"
      role="dialog"
      :aria-labelledby="props.title ? messageId : undefined"
      :aria-label="!props.title ? confirmText : undefined"
    >
      <div class="jin-popconfirm__panel">
        <div class="jin-popconfirm__message" :class="{ 'jin-popconfirm__message--danger': danger }">
          <JinIcon :name="danger ? 'warning' : 'info'" :size="1.15" />
          <div class="jin-popconfirm__text">
            <p v-if="props.title" :id="messageId" class="jin-popconfirm__title">{{ props.title }}</p>
            <p v-if="props.description" class="jin-popconfirm__description">{{ props.description }}</p>
            <slot />
          </div>
        </div>
        <div class="jin-popconfirm__actions">
          <JinButton variant="ghost" size="sm" @click="onCancel">{{ cancelText }}</JinButton>
          <JinButton
            :variant="danger ? 'danger' : 'primary'"
            size="sm"
            :loading="props.loading"
            data-jin-popconfirm-confirm
            @click="onConfirm"
          >
            {{ confirmText }}
          </JinButton>
        </div>
      </div>
      <span
        v-if="position.arrow"
        class="jin-popover__arrow"
        :style="{ left: `${position.arrow.x}px`, top: `${position.arrow.y}px`, margin: '-4px' }"
        aria-hidden="true"
      />
    </div>
  </Teleport>
</template>
