<script setup lang="ts">
/**
 * Form catalogue: field, text field, search field, select, combobox, checkbox,
 * radio, switch, hotkey recorder.
 *
 * Every control demonstrates its states, including the ones that are easy to
 * forget: disabled, read-only, invalid, long text, and inside a field wrapper.
 *
 * Two kinds of text live here and they behave differently on purpose. Option
 * lists and hints are interface copy, so they are `computed` and follow the
 * language switcher. Values already typed into a field, and the burst of
 * past events under the recorder, are state: the first is the user's, and the
 * second is a record of what happened, so both keep their words.
 */
import { computed, ref } from 'vue'
import {
  JinAlert,
  JinButton,
  JinCheckbox,
  JinCombobox,
  JinDivider,
  JinField,
  JinHotkeyRecorder,
  JinIcon,
  JinRadioGroup,
  JinSearchField,
  JinSelect,
  JinSwitch,
  JinTag,
  JinTextField,
  serializeHotkey,
  type HotkeyBinding,
  type HotkeyParts,
  type TranslateVars,
} from '@bythid/jin'
import { DemoPage, DemoSection } from '../demo/DemoSection'
import { useI18n } from '../i18n'

defineProps<{ section?: string | null }>()

const { t } = useI18n()

// ------------------------------------------------------------- form model
const basicText = ref('')
const withValue = ref(t('forms.text.initialValue'))
const longValue = ref(t('forms.text.longValueContent'))
const invalidText = ref('not-an-address')
const search = ref('')
const searchResult = ref<{ key: string; vars?: TranslateVars } | null>(null)
const selectValue = ref<string | null>('fold')
const nativeSelectValue = ref<string | null>('fold')
const richSelectValue = ref<string | null>('md')
const comboboxValue = ref<string | null>('cerulean')
const freeComboboxValue = ref<string | null>(null)
const richComboboxValue = ref<string | null>('amber-glow')
const largeComboboxValue = ref<string | null>(null)
const checked = ref(true)
const unchecked = ref(false)
const indeterminate = ref(false)
const radio = ref<string | null>('normal')
const radioEmpty = ref<string | null>(null)
const toggledOn = ref(true)
const toggledOff = ref(false)
const bio = ref('')
const counter = ref('')

const selectOptions = computed(() => [
  { value: 'normal', label: t('forms.select.optionNormal') },
  { value: 'fold', label: t('forms.select.optionFolded') },
  { value: 'hide', label: t('forms.select.optionHidden') },
  { value: 'archived', label: t('forms.select.optionArchived'), disabled: true },
])

const richOptions = computed(() => [
  { value: 'sm', label: t('forms.select.optionSmall') },
  { value: 'md', label: t('forms.select.optionMedium') },
  { value: 'lg', label: t('forms.select.optionLarge') },
])

// Static on purpose: filterable lists usually arrive from the application
// (colour swatches here, a fetched list elsewhere), so the labels do not
// follow the language switcher.
const comboboxOptions = [
  { value: 'amber', label: 'Amber' },
  { value: 'amber-glow', label: 'Amber Glow' },
  { value: 'burgundy', label: 'Burgundy', disabled: true },
  { value: 'burnt-orange', label: 'Burnt Orange' },
  { value: 'cardinal', label: 'Cardinal' },
  { value: 'cerulean', label: 'Cerulean' },
  { value: 'chartreuse', label: 'Chartreuse' },
  { value: 'coral', label: 'Coral' },
]

// The large-list demo: a filterable list long enough to judge how the popup
// renders it in full.
const largeComboboxOptions = computed(() =>
  Array.from({ length: 500 }, (_, index) => ({
    value: `preset-${index + 1}`,
    label: `${t('forms.combobox.largeOption')} ${String(index + 1).padStart(3, '0')}`,
  })),
)

const radioOptions = computed(() => [
  { value: 'normal', label: t('forms.radio.optionNormal'), hint: t('forms.radio.optionNormalHint') },
  { value: 'fold', label: t('forms.radio.optionFolded'), hint: t('forms.radio.optionFoldedHint') },
  { value: 'hide', label: t('forms.radio.optionHidden'), hint: t('forms.radio.optionHiddenHint') },
  { value: 'inherit', label: t('forms.radio.optionInherit'), disabled: true },
])

// ------------------------------------------------------------ hotkey demo
const recorded = ref('Ctrl+Shift+K')
const events = ref<{ key: string; vars?: TranslateVars }[]>([])
const eventText = computed(() => events.value.map((entry) => t(entry.key, entry.vars)).join(' · '))

const bindings: HotkeyBinding[] = [
  { id: 'save', hotkey: { ctrl: true, alt: false, shift: false, meta: false, key: 'S' } },
  { id: 'open', hotkey: { ctrl: true, alt: false, shift: false, meta: false, key: 'O' } },
]
const recordedParts = computed<HotkeyParts | null>(() => (recorded.value ? parse(recorded.value) : null))

function parse(value: string): HotkeyParts | null {
  const tokens = value.split('+')
  const parts: HotkeyParts = { ctrl: false, alt: false, shift: false, meta: false, key: '' }
  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (lower === 'ctrl' || lower === 'control') parts.ctrl = true
    else if (lower === 'alt') parts.alt = true
    else if (lower === 'shift') parts.shift = true
    else if (lower === 'meta' || lower === 'cmd') parts.meta = true
    else parts.key = token
  }
  return parts.key ? parts : null
}

function pushEvent(entry: { key: string; vars?: TranslateVars }): void {
  events.value = [entry, ...events.value].slice(0, 4)
}

function onRecord(serialized: string, parts: HotkeyParts): void {
  pushEvent({ key: 'forms.hotkey.recorded', vars: { keys: serialized, spoken: spoken(parts) } })
}

function onConflict(ids: string[]): void {
  pushEvent({ key: 'forms.hotkey.conflict', vars: { ids: ids.join(', ') } })
}

function onInvalid(parts: HotkeyParts): void {
  pushEvent({ key: 'forms.hotkey.rejected', vars: { spoken: spoken(parts) } })
}

function spoken(parts: HotkeyParts): string {
  return serializeHotkey(parts)
}

function submitDemo(): void {
  pushEvent({ key: 'forms.complete.submitted' })
}

const modifiers = computed(() => {
  const parts = recordedParts.value
  if (!parts) return t('forms.hotkey.noModifiers')
  const names = [
    parts.ctrl && 'Ctrl',
    parts.alt && 'Alt',
    parts.shift && 'Shift',
    parts.meta && 'Meta',
  ].filter(Boolean) as string[]
  return names.join('+') || t('forms.hotkey.noModifiers')
})

const searchHint = computed(() =>
  searchResult.value ? t(searchResult.value.key, searchResult.value.vars) : t('forms.search.debouncedHint'),
)
</script>

<template>
  <DemoPage :title="t('forms.title')" :lead="t('forms.lead')">
    <DemoSection id="field" :title="t('forms.field.title')" :note="t('forms.field.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinField :label="t('forms.field.plainLabel')">
          <JinTextField :placeholder="t('forms.field.noHintPlaceholder')" />
        </JinField>

        <JinField :label="t('forms.field.withHint')" :hint="t('forms.field.hintText')">
          <JinTextField :placeholder="t('forms.field.focusMe')" />
        </JinField>

        <JinField :label="t('forms.field.required')" required>
          <JinTextField :placeholder="t('forms.field.requiredPlaceholder')" />
        </JinField>

        <JinField
          :label="t('forms.field.optional')"
          optional
          :optional-label="t('forms.field.optionalLabel')"
        >
          <JinTextField />
        </JinField>

        <JinField :label="t('forms.field.withError')" :error="t('forms.field.errorText')">
          <JinTextField :model-value="t('forms.field.taken')" />
        </JinField>

        <JinField
          :label="t('forms.field.reservedSpace')"
          :hint="t('forms.field.reservedSpaceHint')"
          reserve-message-space
        >
          <JinTextField />
        </JinField>

        <JinField :label="t('forms.field.disabledControl')" :hint="t('forms.field.disabledHint')">
          <JinTextField disabled :model-value="t('forms.field.readOnlyContent')" />
        </JinField>

        <JinField
          :label="t('forms.field.composite')"
          :no-label-for="true"
          :hint="t('forms.field.compositeHint')"
        >
          <JinSwitch :label="t('forms.field.nestedSwitch')" />
        </JinField>
      </div>
    </DemoSection>

    <DemoSection id="text-field" :title="t('forms.text.title')" :note="t('forms.text.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinField :label="t('forms.text.emptyWithPlaceholder')">
          <JinTextField v-model="basicText" :placeholder="t('forms.text.typeSomething')" clearable />
        </JinField>

        <JinField :label="t('forms.text.withValue')">
          <JinTextField v-model="withValue" clearable />
        </JinField>

        <JinField :label="t('forms.text.longValue')">
          <JinTextField v-model="longValue" clearable />
        </JinField>

        <JinField :label="t('forms.text.invalid')" :error="t('forms.text.invalidError')">
          <JinTextField v-model="invalidText" invalid />
        </JinField>

        <JinField :label="t('forms.text.readOnly')">
          <JinTextField :model-value="t('forms.text.setBySystem')" readonly />
        </JinField>

        <JinField :label="t('forms.text.disabled')">
          <JinTextField :model-value="t('forms.text.unavailable')" disabled />
        </JinField>

        <JinField :label="t('forms.text.small')">
          <JinTextField size="sm" placeholder="sm" />
        </JinField>

        <JinField :label="t('forms.text.large')">
          <JinTextField size="lg" placeholder="lg" />
        </JinField>

        <JinField :label="t('forms.text.affixes')">
          <JinTextField :placeholder="t('forms.text.affixPlaceholder')">
            <template #prefix><span class="gallery-muted">https://</span></template>
            <template #suffix><JinIcon name="external" /></template>
          </JinTextField>
        </JinField>

        <JinField :label="t('forms.text.password')">
          <JinTextField type="password" model-value="hunter2" />
        </JinField>

        <JinField :label="t('forms.text.counter')" :hint="t('forms.text.counterHint')">
          <JinTextField v-model="counter" :maxlength="24" show-count />
        </JinField>

        <JinField :label="t('forms.text.textarea')">
          <JinTextField v-model="bio" multiline :rows="4" :placeholder="t('forms.text.textareaPlaceholder')" />
        </JinField>

        <JinField :label="t('forms.text.autosize')" :hint="t('forms.text.autosizeHint')">
          <JinTextField
            multiline
            autosize
            :rows="2"
            :max-rows="6"
            :placeholder="t('forms.text.autosizePlaceholder')"
          />
        </JinField>
      </div>
    </DemoSection>

    <DemoSection id="search-field" :title="t('forms.search.title')" :note="t('forms.search.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinField :label="t('forms.search.debounced')" :hint="searchHint">
          <JinSearchField
            v-model="search"
            :placeholder="t('forms.search.placeholder')"
            @search="(value: string) => (searchResult = value ? { key: 'forms.search.searched', vars: { value } } : { key: 'forms.search.cleared' })"
          />
        </JinField>

        <JinField :label="t('forms.search.immediate')">
          <JinSearchField :debounce="0" :placeholder="t('forms.search.immediateHint')" />
        </JinField>

        <JinField :label="t('forms.text.disabled')">
          <JinSearchField disabled :placeholder="t('forms.search.disabledHint')" />
        </JinField>

        <JinField :label="t('forms.text.large')">
          <JinSearchField size="lg" placeholder="lg" />
        </JinField>
      </div>
    </DemoSection>

    <DemoSection id="select" :title="t('forms.select.title')" :note="t('forms.select.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinField :label="t('forms.select.custom')" :hint="t('forms.select.customHint')">
          <JinSelect v-model="selectValue" :options="selectOptions" />
        </JinField>

        <JinField :label="t('forms.select.native')" :hint="t('forms.select.nativeHint')">
          <JinSelect v-model="nativeSelectValue" :options="selectOptions" native />
        </JinField>

        <JinField :label="t('forms.select.richRows')" :hint="t('forms.select.richHint')">
          <JinSelect v-model="richSelectValue" :options="richOptions">
            <template #option="{ option }">
              <span style="display: inline-flex; align-items: center; gap: var(--jin-space-2)">
                <JinIcon name="sparkle" :size="0.9" />
                {{ option.label }}
                <JinTag v-if="option.value === 'lg'" :label="t('forms.select.popular')" />
              </span>
            </template>
          </JinSelect>
        </JinField>

        <JinField :label="t('forms.select.placeholderField')">
          <JinSelect :options="selectOptions" :placeholder="t('forms.select.chooseState')" />
        </JinField>

        <JinField :label="t('forms.select.invalid')" :error="t('forms.select.invalidError')">
          <JinSelect :options="selectOptions" :placeholder="t('forms.select.choose')" invalid />
        </JinField>

        <JinField :label="t('forms.select.disabled')">
          <JinSelect :options="selectOptions" model-value="fold" disabled />
        </JinField>

        <JinField :label="t('forms.select.emptyList')">
          <JinSelect :options="[]" :placeholder="t('forms.select.noOptionsAvailable')" />
        </JinField>

        <JinField :label="t('forms.select.sizes')" :hint="t('forms.select.sizesHint')">
          <div style="display: flex; gap: var(--jin-space-2)">
            <JinSelect v-model="selectValue" size="sm" :options="selectOptions" />
            <JinSelect v-model="selectValue" size="lg" :options="selectOptions" />
          </div>
        </JinField>
      </div>
    </DemoSection>

    <DemoSection id="combobox" :title="t('forms.combobox.title')" :note="t('forms.combobox.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinField :label="t('forms.combobox.filter')" :hint="t('forms.combobox.filterHint')">
          <JinCombobox v-model="comboboxValue" :options="comboboxOptions" />
        </JinField>

        <JinField :label="t('forms.combobox.freeEntry')" :hint="t('forms.combobox.freeHint')">
          <JinCombobox v-model="freeComboboxValue" :options="comboboxOptions" free-entry />
        </JinField>

        <JinField :label="t('forms.combobox.richRows')" :hint="t('forms.combobox.richHint')">
          <JinCombobox v-model="richComboboxValue" :options="comboboxOptions.slice(0, 4)">
            <template #option="{ option, selected }">
              <span style="display: inline-flex; align-items: center; gap: var(--jin-space-2)">
                <JinIcon name="sparkle" :size="0.9" />
                {{ option.label }}
                <JinTag v-if="selected" :label="t('forms.combobox.chosen')" />
              </span>
            </template>
          </JinCombobox>
        </JinField>

        <JinField :label="t('forms.combobox.largeList')" :hint="t('forms.combobox.largeHint')">
          <JinCombobox
            v-model="largeComboboxValue"
            :options="largeComboboxOptions"
            :placeholder="t('forms.combobox.largePlaceholder')"
          />
        </JinField>
      </div>
    </DemoSection>

    <DemoSection id="checkbox" :title="t('forms.checkbox.title')" :note="t('forms.checkbox.note')">
      <div style="display: flex; flex-direction: column; gap: var(--jin-space-3)">
        <JinCheckbox v-model="checked" :label="t('forms.checkbox.checked')" />
        <JinCheckbox v-model="unchecked" :label="t('forms.checkbox.unchecked')" />
        <JinCheckbox :model-value="false" :indeterminate="true" :label="t('forms.checkbox.indeterminate')" />
        <JinCheckbox
          v-model="checked"
          :label="t('forms.checkbox.withHint')"
          :hint="t('forms.checkbox.hintText')"
        />
        <JinCheckbox :model-value="false" disabled :label="t('forms.checkbox.disabled')" />
        <JinCheckbox :model-value="true" disabled :label="t('forms.checkbox.disabledChecked')" />
        <JinCheckbox :model-value="false" invalid :label="t('forms.checkbox.invalid')" />
        <JinCheckbox :model-value="false" :label="t('forms.checkbox.longLabel')" />
      </div>
    </DemoSection>

    <DemoSection id="radio" :title="t('forms.radio.title')" :note="t('forms.radio.note')">
      <div class="gallery-grid gallery-grid--two">
        <JinRadioGroup
          v-model="radio"
          :options="radioOptions"
          :label="t('forms.radio.displayState')"
          required
        />
        <JinRadioGroup
          v-model="radioEmpty"
          :options="radioOptions"
          :label="t('forms.radio.nothingSelected')"
          :hint="t('forms.radio.firstEnabledHint')"
        />
        <JinRadioGroup
          v-model="radio"
          :options="radioOptions.slice(0, 3)"
          :label="t('forms.radio.horizontal')"
          orientation="horizontal"
        />
        <JinRadioGroup
          :options="radioOptions"
          :label="t('forms.radio.disabledGroup')"
          disabled
          model-value="normal"
        />
        <JinRadioGroup
          :options="radioOptions"
          :label="t('forms.radio.withError')"
          :error="t('forms.radio.errorText')"
          model-value="normal"
        />
      </div>
    </DemoSection>

    <DemoSection id="switch" :title="t('forms.switch.title')" :note="t('forms.switch.note')">
      <div style="display: flex; flex-direction: column; gap: var(--jin-space-3)">
        <JinSwitch v-model="toggledOn" :label="t('forms.switch.enabled')" />
        <JinSwitch v-model="toggledOff" :label="t('forms.switch.offState')" />
        <JinSwitch :model-value="true" disabled :label="t('forms.switch.disabledOn')" />
        <JinSwitch :model-value="false" disabled :label="t('forms.switch.disabledOff')" />
        <JinSwitch v-model="toggledOn" size="sm" :label="t('forms.switch.small')" />
        <JinSwitch :model-value="false" :aria-label="t('forms.switch.screenReaderOnly')" />
      </div>
    </DemoSection>

    <DemoSection id="hotkey" :title="t('forms.hotkey.title')" :note="t('forms.hotkey.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinField :label="t('forms.hotkey.shortcut')" :hint="t('forms.hotkey.shortcutHint')">
          <JinHotkeyRecorder
            v-model="recorded"
            :bindings="bindings"
            :placeholder="t('forms.hotkey.placeholder')"
            @record="onRecord"
            @conflict="onConflict"
            @invalid="onInvalid"
          />
        </JinField>

        <JinField
          :label="t('forms.hotkey.conflictsRejected')"
          :hint="t('forms.hotkey.conflictsHint')"
        >
          <JinHotkeyRecorder
            model-value=""
            :bindings="bindings"
            :reject-conflicts="true"
            :placeholder="t('forms.hotkey.tryCtrlS')"
            @record="onRecord"
            @conflict="onConflict"
            @invalid="onInvalid"
          />
        </JinField>

        <JinField :label="t('forms.hotkey.disabled')">
          <JinHotkeyRecorder model-value="Ctrl+Alt+D" disabled />
        </JinField>

        <JinField :label="t('forms.hotkey.bareKeys')" :hint="t('forms.hotkey.bareKeysHint')">
          <JinHotkeyRecorder
            model-value=""
            allow-bare-keys
            :placeholder="t('forms.hotkey.pressAnyKey')"
            @record="onRecord"
            @invalid="onInvalid"
          />
        </JinField>
      </div>

      <JinAlert
        v-if="events.length > 0"
        tone="neutral"
        :title="t('forms.hotkey.eventsTitle')"
        :description="eventText"
      />
      <p v-if="recordedParts" class="gallery-mono">
        {{
          t('forms.hotkey.currentValue', {
            value: recorded,
            key: recordedParts.key,
            modifiers,
          })
        }}
      </p>
    </DemoSection>

    <DemoSection :title="t('forms.complete.title')" :note="t('forms.complete.note')" stacked>
      <form style="width: min(560px, 100%); display: grid; gap: var(--jin-space-4)" @submit.prevent="submitDemo">
        <JinField :label="t('forms.complete.name')" :hint="t('forms.complete.nameHint')" required>
          <JinTextField model-value="" :placeholder="t('forms.complete.namePlaceholder')" />
        </JinField>

        <JinField :label="t('forms.complete.kind')">
          <JinSelect v-model="selectValue" :options="selectOptions" />
        </JinField>

        <JinField :label="t('forms.complete.notes')" :optional="true">
          <JinTextField
            multiline
            autosize
            :rows="2"
            :max-rows="5"
            :placeholder="t('forms.complete.notesPlaceholder')"
          />
        </JinField>

        <JinRadioGroup
          v-model="radio"
          :options="radioOptions.slice(0, 3)"
          :label="t('forms.complete.visibility')"
        />

        <JinDivider />

        <div style="display: flex; gap: var(--jin-space-2)">
          <JinButton type="submit" variant="primary">{{ t('common.save') }}</JinButton>
          <JinButton type="reset" variant="ghost">{{ t('common.reset') }}</JinButton>
        </div>
      </form>

      <JinAlert v-if="events.length > 0" tone="success" :title="eventText" />
    </DemoSection>
  </DemoPage>
</template>
