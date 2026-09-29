<script setup lang="ts">
/**
 * JinResult — full-region status page: icon + title + description + actions.
 * Variants cover success / failure / empty / 403 / 404 / offline, but each is
 * just a tone plus whatever slots the application fills.
 */
import { computed } from 'vue'
import JinIcon from './JinIcon.vue'
import type { IconName } from './icon-paths'
import { useT } from '../composables/useT'
import type { Tone } from '../core/types'

export type ResultStatus = 'success' | 'danger' | 'warning' | 'info' | 'empty' | 'forbidden' | 'notFound' | 'offline'

const props = withDefaults(
  defineProps<{
    status?: ResultStatus
    title?: string
    description?: string
    /** Overrides the icon implied by `status`. */
    icon?: IconName
  }>(),
  { status: 'info', title: '', description: '', icon: undefined },
)

interface StatusPreset {
  tone: Tone
  icon: IconName
  titleKey: string
}

const PRESETS: Record<ResultStatus, StatusPreset> = {
  success: { tone: 'success', icon: 'success', titleKey: '' },
  danger: { tone: 'danger', icon: 'danger', titleKey: '' },
  warning: { tone: 'warning', icon: 'warning', titleKey: '' },
  info: { tone: 'info', icon: 'info', titleKey: '' },
  empty: { tone: 'neutral', icon: 'database', titleKey: 'empty.noData' },
  forbidden: { tone: 'warning', icon: 'lock', titleKey: '' },
  notFound: { tone: 'neutral', icon: 'search', titleKey: '' },
  offline: { tone: 'danger', icon: 'wifi-off', titleKey: '' },
}

const { t } = useT()
const preset = computed(() => PRESETS[props.status] ?? PRESETS.info)
const resolvedIcon = computed(() => props.icon ?? preset.value.icon)
const resolvedTitle = computed(() => props.title || (preset.value.titleKey ? t(preset.value.titleKey) : ''))
</script>

<template>
  <div class="jin-result" :class="[`jin-result--${preset.tone}`, `jin-result--${props.status}`]">
    <div class="jin-result__icon">
      <slot name="icon">
        <JinIcon :name="resolvedIcon" :size="3" />
      </slot>
    </div>

    <p v-if="resolvedTitle" class="jin-result__title">{{ resolvedTitle }}</p>
    <p v-if="props.description" class="jin-result__description">{{ props.description }}</p>

    <div v-if="$slots.default" class="jin-result__extra">
      <slot />
    </div>

    <div v-if="$slots.actions" class="jin-result__actions">
      <slot name="actions" />
    </div>
  </div>
</template>
