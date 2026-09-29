<script setup lang="ts">
/**
 * JinModal — centred dialog: focus trap, Esc, scrim-click behaviour, focus return
 * to the trigger. Registered in the shared overlay stack so z-index
 * and dismissal route through one place.
 *
 * Content is teleported into the library's single portal container. The scrim
 * is that stack's shared element, so stacked modals never double-darken.
 */
import { computed, onBeforeUnmount, ref, useSlots, watch, type CSSProperties } from 'vue'
import JinIcon from './JinIcon.vue'
import { createId } from '../core/id'
import { useT } from '../composables/useT'
import { useOverlay } from '../composables/useOverlay'
import { useDismissable } from '../composables/useDismissable'
import { useFocusTrap } from '../composables/useFocusTrap'
import { isRtl } from '../composables/dom'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    /** Optional title; can also come from the #header slot. */
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    /** Esc closes. Default true. */
    closeOnEsc?: boolean
    /** Clicking the scrim closes. Default true. */
    closeOnOutside?: boolean
    /** Hides the corner close button. */
    hideClose?: boolean
    /** Blocks Escape / outside dismissal (e.g. while saving). */
    busy?: boolean
    /** Accessible name when there is neither title nor header slot. */
    ariaLabel?: string
    /** Skip the shared scrim (a nested dialog that must not re-darken). */
    noScrim?: boolean
  }>(),
  {
    title: '',
    description: '',
    size: 'md',
    closeOnEsc: true,
    closeOnOutside: true,
    hideClose: false,
    busy: false,
    ariaLabel: '',
    noScrim: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'open'): void
  (event: 'close'): void
  (event: 'afterClose'): void
}>()

const slots = useSlots()
const { t } = useT()
const overlay = useOverlay()
const panel = ref<HTMLElement | null>(null)
const overlayId = ref<string | null>(null)
const instanceId = createId('m')
const titleId = `jin-modal-title-${instanceId}`
const descriptionId = `jin-modal-desc-${instanceId}`

const isOpen = computed(() => props.modelValue)
const portalTarget = computed(() => overlay.root.value)
const labelledBy = computed(() => (props.title || slots.header ? titleId : undefined))
const describedBy = computed(() => (props.description ? descriptionId : undefined))
const role = computed(() => (props.busy ? 'alertdialog' : 'dialog'))
const rtl = ref(false)

function requestClose(): void {
  if (props.busy) return
  emit('update:modelValue', false)
  emit('close')
}

const trap = useFocusTrap({
  container: panel,
  active: isOpen,
  initialFocus: 'container',
  initialFocusElement: panel,
})

useDismissable({
  overlayId,
  element: panel,
  closeOnEsc: computed(() => props.closeOnEsc),
  closeOnOutside: computed(() => props.closeOnOutside),
  disabled: computed(() => props.busy),
  onDismiss: () => requestClose(),
})

watch(
  isOpen,
  (open) => {
    if (open) {
      // Capture the trigger before focus moves into the dialog.
      trap.captureTrigger()
      const entry = overlay.register({
        id: `jin-modal-${instanceId}`,
        layer: 'modal',
        modal: true,
        // Esc / outside are owned by useDismissable so `busy` is honoured.
        dismissOnEsc: false,
        dismissOnOutside: false,
      })
      overlayId.value = entry.id
      if (!props.noScrim) overlay.showScrim(entry.zIndex)
      rtl.value = typeof document !== 'undefined' && isRtl(document.documentElement)
      emit('open')
    } else if (overlayId.value) {
      overlay.unregister(overlayId.value)
      overlayId.value = null
      if (!props.noScrim) overlay.hideScrim()
      emit('afterClose')
    }
  },
  { immediate: true },
)

/*
 * A host that renders the dialog behind `v-if` unmounts it while it is still
 * open: the watch above never sees the closing edge, so its scrim would stay up
 * and swallow every pointer event in the host. Same cleanup as a normal close.
 * Guarded on overlayId so a dialog that already closed normally cannot hide the
 * scrim of another one that is still open.
 */
onBeforeUnmount(() => {
  if (!overlayId.value) return
  overlay.unregister(overlayId.value)
  overlayId.value = null
  if (!props.noScrim) overlay.hideScrim()
})

const style = computed<CSSProperties>(() => {
  const z = overlay.entryZIndex(overlayId.value)
  return z === null ? {} : { zIndex: String(z) }
})

defineExpose({ focus: () => panel.value?.focus() })
</script>

<template>
  <Teleport v-if="portalTarget" :to="portalTarget">
    <div
      v-if="isOpen"
      class="jin-modal"
      :style="style"
      :dir="rtl ? 'rtl' : undefined"
      @pointerdown.self="props.closeOnOutside && !props.busy ? requestClose() : undefined"
    >
      <div
        ref="panel"
        class="jin-modal__panel"
        :class="`jin-modal__panel--${props.size}`"
        :role="role"
        aria-modal="true"
        :aria-labelledby="labelledBy"
        :aria-describedby="describedBy"
        :aria-label="!labelledBy ? props.ariaLabel || undefined : undefined"
        :aria-busy="props.busy ? 'true' : undefined"
        tabindex="-1"
      >
        <slot name="header">
          <header v-if="props.title || props.description" class="jin-modal__header">
            <div class="jin-modal__heading">
              <h2 :id="titleId" class="jin-modal__title">{{ props.title }}</h2>
              <p v-if="props.description" :id="descriptionId" class="jin-modal__description">
                {{ props.description }}
              </p>
            </div>
          </header>
        </slot>

        <div class="jin-modal__body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="jin-modal__footer">
          <slot name="footer" />
        </footer>

        <button
          v-if="!props.hideClose"
          type="button"
          class="jin-modal__close jin-button jin-button--ghost jin-button--icon jin-button--sm jin-focus-ring"
          :aria-label="t('a11y.close')"
          :disabled="props.busy"
          @click="requestClose"
        >
          <JinIcon name="close" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
