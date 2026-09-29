<script setup lang="ts">
/**
 * JinToastRegion — the toast host. Place it once per application; it renders
 * every queued toast in six possible positions using the shared portal.
 *
 * Difference from notification: a toast disappears by
 * itself and must never carry information the user cannot retrieve later.
 */
import { computed } from 'vue'
import JinIcon from './JinIcon.vue'
import type { IconName } from './icon-paths'
import { useToasts, type FeedbackEntry } from '../composables/useFeedback'
import { useT } from '../composables/useT'
import { useOverlay } from '../composables/useOverlay'
import type { Tone } from '../core/types'
import type { QueuePosition } from '../core/queue'

const props = withDefaults(
  defineProps<{
    /** Which positions to render. Default: all six. */
    positions?: QueuePosition[]
    /** Accessible label for the live region. */
    label?: string
  }>(),
  { positions: undefined, label: '' },
)

const ALL: QueuePosition[] = ['top-start', 'top', 'top-end', 'bottom-start', 'bottom', 'bottom-end']

const TONE_ICON: Record<Tone, IconName> = {
  neutral: 'info',
  accent: 'sparkle',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

const store = useToasts()
const overlay = useOverlay()
const { t } = useT()

const active = computed(() => (props.positions && props.positions.length > 0 ? props.positions : ALL))
const portalTarget = computed(() => overlay.root.value)
// `items` / `byPosition` live on a plain object, so template auto-unwrapping
// does not apply; lift them into top-level computeds.
const buckets = computed(() => store.byPosition.value)
const allItems = computed(() => store.items.value)

function itemsAt(position: QueuePosition): FeedbackEntry[] {
  return allItems.value.filter((item) => item.position === position)
}

function pauseAll(position: QueuePosition): void {
  for (const item of itemsAt(position)) store.pause(item.id)
}

function resumeAll(position: QueuePosition): void {
  for (const item of itemsAt(position)) store.resume(item.id)
}

function entriesAt(position: QueuePosition): FeedbackEntry[] {
  return buckets.value[position] ?? []
}

function iconFor(entry: FeedbackEntry): IconName {
  return TONE_ICON[entry.tone] ?? 'info'
}

function onAction(entry: FeedbackEntry, actionIndex: number): void {
  const action = entry.actions[actionIndex]
  if (!action) return
  action.handler()
  if (!action.keepOpen) store.dismiss(entry.id)
}
</script>

<template>
  <Teleport v-if="portalTarget" :to="portalTarget">
    <div
      v-for="position in active"
      :key="position"
      class="jin-toast-region"
      :class="`jin-toast-region--${position}`"
      :style="{ zIndex: 'var(--jin-z-toast, 1400)' }"
      role="region"
      :aria-label="props.label || t('a11y.toasts')"
      @mouseenter="pauseAll(position)"
      @mouseleave="resumeAll(position)"
      @focusin="pauseAll(position)"
      @focusout="resumeAll(position)"
    >
      <div
        v-for="entry in entriesAt(position)"
        :key="entry.id"
        class="jin-toast"
        :class="`jin-toast--${entry.tone}`"
        role="status"
        aria-live="polite"
      >
        <span class="jin-toast__icon">
          <slot name="icon" :entry="entry">
            <JinIcon :name="iconFor(entry)" :size="1.15" />
          </slot>
        </span>
        <div class="jin-toast__content">
          <p v-if="entry.title" class="jin-toast__title">{{ entry.title }}</p>
          <p v-if="entry.description" class="jin-toast__description">{{ entry.description }}</p>
          <div v-if="entry.actions.length > 0" class="jin-toast__actions">
            <button
              v-for="(action, index) in entry.actions"
              :key="index"
              type="button"
              class="jin-button jin-button--sm jin-focus-ring"
              :class="action.primary ? 'jin-button--primary' : 'jin-button--secondary'"
              @click="onAction(entry, index)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <button
          v-if="entry.closable"
          type="button"
          class="jin-toast__close jin-button jin-button--ghost jin-button--icon jin-button--sm jin-focus-ring"
          :aria-label="t('a11y.dismiss')"
          @click="store.dismiss(entry.id)"
        >
          <JinIcon name="close" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
