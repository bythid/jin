<script setup lang="ts">
/**
 * JinNotificationRegion — the notification host.
 *
 * Difference from toast: a notification never disappears
 * on its own, carries a title + description + optional actions, and is the
 * right container for anything the user must act on.
 */
import { computed } from 'vue'
import JinIcon from './JinIcon.vue'
import type { IconName } from './icon-paths'
import { useNotifications, type FeedbackEntry } from '../composables/useFeedback'
import { useT } from '../composables/useT'
import { useOverlay } from '../composables/useOverlay'
import type { Tone } from '../core/types'
import type { QueuePosition } from '../core/queue'

const props = withDefaults(
  defineProps<{
    positions?: QueuePosition[]
    label?: string
  }>(),
  { positions: undefined, label: '' },
)

const ALL: QueuePosition[] = ['top-start', 'top', 'top-end', 'bottom-start', 'bottom', 'bottom-end']

const TONE_ICON: Record<Tone, IconName> = {
  neutral: 'bell',
  accent: 'sparkle',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

const store = useNotifications()
const overlay = useOverlay()
const { t } = useT()

const active = computed(() => (props.positions && props.positions.length > 0 ? props.positions : ALL))
const portalTarget = computed(() => overlay.root.value)
// `byPosition` lives on a plain object; lift it into a top-level computed so
// the template sees the unwrapped value.
const buckets = computed(() => store.byPosition.value)

function entriesAt(position: QueuePosition): FeedbackEntry[] {
  return buckets.value[position] ?? []
}

function iconFor(entry: FeedbackEntry): IconName {
  return TONE_ICON[entry.tone] ?? 'bell'
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
      class="jin-notification-region"
      :class="`jin-notification-region--${position}`"
      :style="{ zIndex: 'var(--jin-z-toast, 1400)' }"
      role="region"
      :aria-label="props.label || t('a11y.notifications')"
    >
      <div
        v-for="entry in entriesAt(position)"
        :key="entry.id"
        class="jin-notification"
        role="alertdialog"
        :aria-labelledby="entry.title ? `jin-notification-${entry.id}-title` : undefined"
      >
        <span class="jin-notification__icon">
          <slot name="icon" :entry="entry">
            <JinIcon :name="iconFor(entry)" :size="1.25" />
          </slot>
        </span>
        <div class="jin-notification__content">
          <p v-if="entry.title" :id="`jin-notification-${entry.id}-title`" class="jin-notification__title">
            {{ entry.title }}
          </p>
          <p v-if="entry.description" class="jin-notification__description">{{ entry.description }}</p>
          <div v-if="entry.actions.length > 0" class="jin-notification__actions">
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
          class="jin-notification__close jin-button jin-button--ghost jin-button--icon jin-button--sm jin-focus-ring"
          :aria-label="t('a11y.close')"
          @click="store.dismiss(entry.id)"
        >
          <JinIcon name="close" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
