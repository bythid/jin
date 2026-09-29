<script setup lang="ts">
/**
 * JinHotkeyRecorder — records a keyboard shortcut.
 *
 * All the logic lives in core/hotkey.ts: normalization, conflict
 * detection, recordability rules. This component only routes key presses.
 * Recording state is announced, and a conflict is reported as text, not colour.
 */
import { computed, ref, useId } from 'vue'
import JinIcon from './JinIcon.vue'
import {
  describeHotkey,
  findHotkeyConflicts,
  fromKeyboardEvent,
  isModifierKey,
  isRecordableHotkey,
  serializeHotkey,
  type HotkeyBinding,
  type HotkeyParts,
} from '../core/hotkey'
import type { TranslateFn } from '../injection/strings'

const props = withDefaults(
  defineProps<{
    /** Serialized value, e.g. "Ctrl+Shift+K". Empty string means unset. */
    modelValue?: string
    /** Other bindings to check against; conflicts are reported, not blocked by default. */
    bindings?: HotkeyBinding[]
    disabled?: boolean
    /** Reject a conflicting combination outright. */
    rejectConflicts?: boolean
    /** Allow single keys without a modifier (function keys always allowed). */
    allowBareKeys?: boolean
    placeholder?: string
    ariaLabel?: string
    /** Injected so the component stays free of application i18n. */
    messages?: {
      idle?: string
      recording?: string
      conflict?: string
      invalid?: string
    }
    t?: TranslateFn
  }>(),
  {
    modelValue: '',
    bindings: () => [],
    disabled: false,
    rejectConflicts: false,
    allowBareKeys: false,
    placeholder: '',
    ariaLabel: '',
    messages: () => ({}),
    t: undefined,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'record', serialized: string, parts: HotkeyParts): void
  (event: 'clear'): void
  (event: 'conflict', ids: string[], parts: HotkeyParts): void
  (event: 'invalid', parts: HotkeyParts): void
}>()

const generated = useId()
const recording = ref(false)
const control = ref<HTMLButtonElement | null>(null)
const feedback = ref<{ kind: 'conflict' | 'invalid'; ids: string[] } | null>(null)

const serialized = computed(() => props.modelValue ?? '')
const conflictIds = computed(() => feedback.value?.ids ?? [])

function message(key: 'idle' | 'recording' | 'conflict' | 'invalid'): string {
  const table = props.messages ?? {}
  const explicit = table[key]
  if (explicit) return explicit
  if (props.t) return props.t(`hotkey.${key}`)
  const fallback: Record<typeof key, string> = {
    idle: 'Click to record',
    recording: 'Press a key combination…',
    conflict: 'Already used by another action',
    invalid: 'That combination cannot be used',
  }
  return fallback[key]
}

function start(): void {
  if (props.disabled) return
  recording.value = true
  feedback.value = null
  control.value?.focus()
}

function stop(): void {
  recording.value = false
}

function clear(): void {
  emit('update:modelValue', '')
  emit('clear')
  feedback.value = null
}

function onKeydown(event: KeyboardEvent): void {
  if (!recording.value) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      start()
    }
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (event.key === 'Escape') {
    stop()
    return
  }
  if (event.key === 'Tab') {
    stop()
    return
  }
  if (isModifierKey(event.key)) return

  const parts = fromKeyboardEvent(event)
  const allowed = props.allowBareKeys || isRecordableHotkey(parts)
  if (!allowed) {
    feedback.value = { kind: 'invalid', ids: [] }
    emit('invalid', parts)
    return
  }

  const conflicts = findHotkeyConflicts(props.bindings, parts)
  if (conflicts.length > 0 && props.rejectConflicts) {
    feedback.value = { kind: 'conflict', ids: conflicts }
    emit('conflict', conflicts, parts)
    return
  }

  const next = serializeHotkey(parts)
  emit('update:modelValue', next)
  emit('record', next, parts)
  if (conflicts.length > 0) {
    feedback.value = { kind: 'conflict', ids: conflicts }
    emit('conflict', conflicts, parts)
  } else {
    feedback.value = null
  }
  stop()
}

const displayValue = computed(() => serialized.value)
const describedBy = computed(() => (feedback.value ? `${generated}-feedback` : undefined))
const spokenValue = computed(() => {
  if (!serialized.value) return ''
  const parts = serialized.value.split('+')
  return parts.join(' plus ')
})
</script>

<template>
  <div class="jin-hotkey-recorder" :class="{ 'jin-hotkey-recorder--recording': recording }">
    <button
      :id="generated"
      ref="control"
      type="button"
      class="jin-hotkey-recorder__control jin-focus-ring"
      :disabled="props.disabled"
      :aria-label="props.ariaLabel || message('idle')"
      :aria-describedby="describedBy"
      :aria-pressed="recording ? 'true' : undefined"
      @click="recording ? stop() : start()"
      @keydown="onKeydown"
      @blur="stop"
    >
      <JinIcon name="settings" aria-hidden="true" />
      <span v-if="recording" class="jin-hotkey-recorder__placeholder">{{ message('recording') }}</span>
      <span v-else-if="displayValue" class="jin-hotkey-recorder__value">
        <span aria-hidden="true">{{ displayValue }}</span>
        <span class="jin-visually-hidden">{{ spokenValue }}</span>
      </span>
      <span v-else class="jin-hotkey-recorder__placeholder">
        {{ props.placeholder || message('idle') }}
      </span>
      <JinIcon v-if="displayValue && !recording" name="close" aria-hidden="true" @click.stop="clear" />
    </button>

    <p
      v-if="feedback"
      :id="`${generated}-feedback`"
      class="jin-hotkey-recorder__status jin-hotkey-recorder__status--error"
      role="status"
    >
      {{ feedback.kind === 'conflict' ? message('conflict') : message('invalid') }}
      <span v-if="conflictIds.length > 0" class="jin-visually-hidden">({{ conflictIds.join(', ') }})</span>
    </p>
  </div>
</template>
