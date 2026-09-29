<script setup lang="ts">
/**
 * JinDrawer — edge-anchored panel for four sides and four width steps.
 * Same overlay contract as the modal: trap, Esc, scrim, focus return.
 */
import { computed, onBeforeUnmount, ref, useSlots, watch, type CSSProperties } from 'vue'
import JinIcon from './JinIcon.vue'
import { createId } from '../core/id'
import { useT } from '../composables/useT'
import { useOverlay } from '../composables/useOverlay'
import { useDismissable } from '../composables/useDismissable'
import { useFocusTrap } from '../composables/useFocusTrap'
import type { Side } from '../core/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    description?: string
    side?: Side
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closeOnEsc?: boolean
    closeOnOutside?: boolean
    hideClose?: boolean
    busy?: boolean
    ariaLabel?: string
    noScrim?: boolean
  }>(),
  {
    title: '',
    description: '',
    side: 'right',
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
const instanceId = createId('d')
const titleId = `jin-drawer-title-${instanceId}`
const descriptionId = `jin-drawer-desc-${instanceId}`

const isOpen = computed(() => props.modelValue)
const portalTarget = computed(() => overlay.root.value)
const labelledBy = computed(() => (props.title || slots.header ? titleId : undefined))
const describedBy = computed(() => (props.description ? descriptionId : undefined))

function requestClose(): void {
  if (props.busy) return
  emit('update:modelValue', false)
  emit('close')
}

const trap = useFocusTrap({ container: panel, active: isOpen, initialFocus: 'container', initialFocusElement: panel })

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
      trap.captureTrigger()
      const entry = overlay.register({
        id: `jin-drawer-${instanceId}`,
        layer: 'overlay',
        modal: true,
        dismissOnEsc: false,
        dismissOnOutside: false,
      })
      overlayId.value = entry.id
      if (!props.noScrim) overlay.showScrim(entry.zIndex)
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

// See JinModal: a `v-if` host can unmount the drawer while it is open, and the
// watch above would never run its closing branch — leaving the shared scrim up.
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
</script>

<template>
  <Teleport v-if="portalTarget" :to="portalTarget">
    <div
      v-if="isOpen"
      class="jin-drawer"
      :style="style"
      @pointerdown.self="props.closeOnOutside && !props.busy ? requestClose() : undefined"
    >
      <div
        ref="panel"
        class="jin-drawer__panel"
        :class="[`jin-drawer__panel--${props.side}`, `jin-drawer__panel--${props.size}`]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="labelledBy"
        :aria-describedby="describedBy"
        :aria-label="!labelledBy ? props.ariaLabel || undefined : undefined"
        :aria-busy="props.busy ? 'true' : undefined"
        tabindex="-1"
      >
        <slot name="header">
          <header v-if="props.title || props.description" class="jin-drawer__header">
            <div class="jin-drawer__heading">
              <h2 :id="titleId" class="jin-drawer__title">{{ props.title }}</h2>
              <p v-if="props.description" :id="descriptionId" class="jin-drawer__description">
                {{ props.description }}
              </p>
            </div>
          </header>
        </slot>

        <div class="jin-drawer__body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="jin-drawer__footer">
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
