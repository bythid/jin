<script setup lang="ts">
/**
 * JinCombobox — a text input whose value filters a listbox of options, the
 * WAI-ARIA combobox pattern with optional free-form entry.
 *
 * The input is the trigger and keeps focus while the popup is open; the
 * active option travels through `aria-activedescendant`, not focus. Two value
 * modes, set with `freeEntry`:
 *   - restricted (default): the committed value is always one of `options`;
 *     typed text that matches nothing shows a "no matches" state and reverts
 *     on blur.
 *   - freeEntry: the committed value may be anything typed, whether or not it
 *     is listed; an empty filtered list offers committing the typed value.
 *
 * The popup is a JinPopover, so anchoring, the shared overlay stack, Escape
 * routing and dismissal are the library's one implementation, not this file's.
 */
import { computed, nextTick, ref, useId, watch } from 'vue'
import JinIcon from './JinIcon.vue'
import JinPopover from './JinPopover.vue'
import { useFieldContext } from './field-context'
import { useT } from '../composables/useT'
import { filterIndices, foldText, matchSegments } from '../core/filter'
import { nextRovingIndex } from '../core/roving'
import type { SelectOption } from './JinSelect.vue'
import type { Size } from '../core/types'

interface ComboboxRow {
  /** Position in `options`, so ids and `change` stay stable while filtering. */
  index: number
  option: SelectOption
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    options?: SelectOption[]
    /** Accept a committed value that is not in `options` (free-form entry). */
    freeEntry?: boolean
    /** Open the popup when the input receives focus, not only when typing. */
    openOnFocus?: boolean
    size?: Size
    placeholder?: string
    disabled?: boolean
    invalid?: boolean
    block?: boolean
    ariaLabel?: string
  }>(),
  {
    modelValue: null,
    options: () => [],
    freeEntry: false,
    openOnFocus: true,
    size: 'md',
    placeholder: '',
    disabled: false,
    invalid: false,
    block: true,
    ariaLabel: '',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | null): void
  (event: 'change', value: string | null, option: SelectOption | null): void
}>()

const field = useFieldContext()
const { t } = useT()
const generated = useId()
const controlId = computed(() => field?.controlId ?? `jin-combobox-${generated}`)
const describedBy = computed(() => field?.describedBy.value)
const isInvalid = computed(() => props.invalid || Boolean(field?.invalid.value))
const isRequired = computed(() => Boolean(field?.required.value))

const input = ref<HTMLInputElement | null>(null)
const listbox = ref<HTMLElement | null>(null)
const open = ref(false)
const editing = ref(false)
const draft = ref('')
const active = ref<number | 'typed' | null>(null)
// `draft` starts as a copy of the committed value; it only becomes a filter
// query once the user types, so opening shows the whole list with the current
// value highlighted rather than a list pre-narrowed to itself.
const filtering = ref(false)

const selected = computed(() => props.options.find((option) => option.value === props.modelValue) ?? null)
const committedText = computed(() => selected.value?.label ?? props.modelValue ?? '')
const text = computed(() => (editing.value ? draft.value : committedText.value))

const filtered = computed<ComboboxRow[]>(() =>
  filterIndices(
    props.options.map((option) => option.label),
    filtering.value ? draft.value : '',
  ).flatMap((index) => {
    const option = props.options[index]
    return option ? [{ index, option }] : []
  }),
)

const offerTyped = computed(
  () => props.freeEntry && open.value && filtering.value && filtered.value.length === 0 && draft.value.trim() !== '',
)

const activeDescendant = computed(() => {
  if (!open.value || active.value === null) return undefined
  if (active.value === 'typed') return `${controlId.value}-option-typed`
  const row = filtered.value[active.value]
  return row ? `${controlId.value}-option-${row.index}` : undefined
})

function isDisabledAt(position: number): boolean {
  return filtered.value[position]?.option.disabled === true
}

function openPopup(): void {
  if (props.disabled) return
  open.value = true
  retarget()
}

function closePopup(): void {
  open.value = false
  active.value = null
}

/** Park the active option where a screen reader user expects it: on the
 *  committed value when it survives the filter, else on the first enabled row
 *  — or on the commit-typed-value affordance when free entry has nothing. */
function retarget(): void {
  const rows = filtered.value
  if (rows.length === 0) {
    active.value = offerTyped.value ? 'typed' : null
    return
  }
  const committed = rows.findIndex((row) => row.option.value === props.modelValue && !row.option.disabled)
  if (committed >= 0) {
    active.value = committed
    return
  }
  const firstEnabled = rows.findIndex((row) => !row.option.disabled)
  active.value = firstEnabled >= 0 ? firstEnabled : null
}

function move(direction: 1 | -1 | 'first' | 'last'): void {
  const count = filtered.value.length
  if (count === 0) return
  const key = direction === 'first' ? 'Home' : direction === 'last' ? 'End' : direction === 1 ? 'ArrowDown' : 'ArrowUp'
  let cursor = typeof active.value === 'number' && active.value >= 0 ? active.value : -1
  let next: number | null = null
  // Skip disabled options by stepping until an enabled one appears.
  for (let guard = 0; guard < count; guard += 1) {
    const candidate = nextRovingIndex(key, cursor, count, { orientation: 'vertical', loop: true })
    if (candidate === null) break
    cursor = candidate
    if (!isDisabledAt(candidate)) {
      next = candidate
      break
    }
  }
  if (next !== null) active.value = next
}

function commitOption(row: ComboboxRow): void {
  if (row.option.disabled) return
  emit('update:modelValue', row.option.value)
  emit('change', row.option.value, row.option)
  filtering.value = false
  draft.value = row.option.label
  closePopup()
}

/**
 * Commit the draft under the mode's rules: a typed text that names a listed
 * option commits that option (so `change` carries it); in free entry the text
 * itself commits; restricted and unmatched reverts with no event. Runs on
 * Enter with no active option and on blur.
 */
function commitDraft(): void {
  if (draft.value === committedText.value) return
  const folded = foldText(draft.value.trim())
  const exact = folded
    ? props.options.find((option) => !option.disabled && foldText(option.label) === folded)
    : undefined
  if (exact) {
    emit('update:modelValue', exact.value)
    emit('change', exact.value, exact)
    filtering.value = false
    draft.value = exact.label
    return
  }
  if (props.freeEntry) {
    const value = draft.value.trim()
    if (value) {
      emit('update:modelValue', value)
      emit('change', value, null)
      filtering.value = false
      draft.value = value
    }
  }
}

/** Commit from the list itself — the typed-value affordance row, or Enter
 *  when no option is active. A commit from an open popup closes it. */
function commitTyped(): void {
  commitDraft()
  closePopup()
}

function onFocus(): void {
  editing.value = true
  draft.value = committedText.value
  filtering.value = false
  if (props.openOnFocus) openPopup()
  // Selecting the committed text means the first keystroke replaces it.
  void nextTick(() => input.value?.select())
}

function onInput(event: Event): void {
  draft.value = (event.target as HTMLInputElement).value
  filtering.value = true
  if (open.value) retarget()
  else openPopup()
}

function onBlur(): void {
  commitDraft()
  editing.value = false
  closePopup()
}

function onEscape(event: KeyboardEvent): void {
  // While the popup is open the shared dismissal closes it before this runs —
  // Escape closes the popup first, and clears only after. Stopping here keeps
  // the clear from also dismissing an overlay the combobox sits in.
  if (open.value) return
  if (props.modelValue === null && draft.value === '') return
  event.preventDefault()
  event.stopPropagation()
  emit('update:modelValue', null)
  emit('change', null, null)
  draft.value = ''
  filtering.value = false
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      if (open.value) move(1)
      else openPopup()
      return
    case 'ArrowUp':
      event.preventDefault()
      if (open.value) move(-1)
      else openPopup()
      return
    case 'Home':
    case 'End':
      // Open, the keys address the list; closed, they stay caret keys.
      if (open.value) {
        event.preventDefault()
        move(event.key === 'Home' ? 'first' : 'last')
      }
      return
    case 'Enter':
      event.preventDefault()
      if (typeof active.value === 'number' && open.value && active.value >= 0) {
        const row = filtered.value[active.value]
        if (row) commitOption(row)
      } else {
        commitTyped()
      }
      return
    case 'Escape':
      onEscape(event)
      return
  }
}

function onPopoverToggle(value: boolean): void {
  open.value = value
  if (!value) active.value = null
}

function segmentsOf(label: string): { text: string; matched: boolean }[] {
  return matchSegments(label, filtering.value ? draft.value : '') ?? [{ text: label, matched: false }]
}

// Keep the active row scrolled into view while navigating.
watch(active, () => {
  void nextTick(() => {
    const rows = listbox.value?.querySelectorAll<HTMLElement>('[data-jin-combobox-option]')
    if (!rows) return
    const target = active.value === 'typed' ? rows.length - 1 : active.value
    if (target === null || target < 0) return
    rows[target]?.scrollIntoView({ block: 'nearest' })
  })
})

// Options may arrive after the popup opened; re-anchor the active row.
watch(
  () => props.options,
  () => {
    if (open.value) retarget()
  },
)

function focus(): void {
  input.value?.focus()
}

defineExpose({ focus, open: openPopup, close: closePopup })
</script>

<template>
  <div
    class="jin-combobox"
    :class="[
      `jin-combobox--${props.size}`,
      {
        'jin-combobox--invalid': isInvalid,
        'jin-combobox--disabled': props.disabled,
        'jin-combobox--block': props.block,
      },
    ]"
  >
    <input
      :id="controlId"
      ref="input"
      type="text"
      class="jin-combobox__input jin-focus-ring"
      role="combobox"
      :value="text"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      aria-haspopup="listbox"
      aria-autocomplete="list"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="open ? `${controlId}-listbox` : undefined"
      :aria-activedescendant="activeDescendant"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="describedBy"
      :aria-required="isRequired ? 'true' : undefined"
      :aria-label="props.ariaLabel || undefined"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
      @keydown="onKeydown"
      @click="!props.disabled && !open && openPopup()"
    />

    <!-- role="" keeps the popover wrapper presentational: the listbox itself is
         what aria-controls names. -->
    <JinPopover
      :model-value="open"
      :anchor="input"
      placement="bottom-start"
      :offset="4"
      :flip="true"
      role=""
      @update:model-value="onPopoverToggle"
    >
      <ul
        :id="`${controlId}-listbox`"
        ref="listbox"
        class="jin-combobox__listbox"
        role="listbox"
        :aria-label="props.ariaLabel || undefined"
      >
        <li v-if="filtered.length === 0 && !offerTyped" class="jin-combobox__empty">
          {{ props.options.length === 0 ? t('select.noOptions') : t('combobox.noMatches') }}
        </li>
        <li
          v-for="(row, position) in filtered"
          :id="`${controlId}-option-${row.index}`"
          :key="row.option.value"
          data-jin-combobox-option
          class="jin-combobox__option"
          :class="{
            'jin-combobox__option--active': active === position,
            'jin-combobox__option--selected': row.option.value === props.modelValue,
            'jin-combobox__option--disabled': row.option.disabled,
          }"
          role="option"
          :aria-selected="row.option.value === props.modelValue ? 'true' : 'false'"
          :aria-disabled="row.option.disabled ? 'true' : undefined"
          @pointerdown.prevent
          @click="commitOption(row)"
          @pointermove="!row.option.disabled && (active = position)"
        >
          <span class="jin-combobox__option-label">
            <slot name="option" :option="row.option" :selected="row.option.value === props.modelValue">
              <template v-for="(segment, segmentIndex) in segmentsOf(row.option.label)" :key="segmentIndex">
                <span v-if="segment.matched" class="jin-combobox__option-match">{{ segment.text }}</span>
                <template v-else>{{ segment.text }}</template>
              </template>
            </slot>
          </span>
          <JinIcon v-if="row.option.value === props.modelValue" name="check" />
        </li>
        <li
          v-if="offerTyped"
          :id="`${controlId}-option-typed`"
          data-jin-combobox-option
          class="jin-combobox__option jin-combobox__option--typed"
          :class="{ 'jin-combobox__option--active': active === 'typed' }"
          role="option"
          aria-selected="false"
          @pointerdown.prevent
          @click="commitTyped"
          @pointermove="active = 'typed'"
        >
          {{ t('combobox.useTypedValue', { value: draft.trim() }) }}
        </li>
      </ul>
    </JinPopover>
  </div>
</template>
