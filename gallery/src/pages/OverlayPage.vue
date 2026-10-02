<script setup lang="ts">
/**
 * Overlay catalogue: modal, drawer, popover, tooltip, popconfirm.
 *
 * Every demo opens the real control, so the focus trap, Escape handling and
 * focus return can be verified by hand. The status line under each group
 * reports what the control just told the application.
 *
 * Option labels derived from strings are `computed`: a language switch has to
 * reach the open dialog and the select that is already on screen.
 */
import { computed, ref } from 'vue'
import {
  JinAlert,
  JinButton,
  JinDivider,
  JinDrawer,
  JinField,
  JinIcon,
  JinModal,
  JinPopconfirm,
  JinPopover,
  JinSelect,
  JinSwitch,
  JinTextField,
  JinTooltip,
} from '@bythid/jin'
import { DemoPage, DemoSection } from '../demo/DemoSection'
import { useI18n } from '../i18n'

defineProps<{ section?: string | null }>()

const { t } = useI18n()

const log = ref<string[]>([])
function record(message: string): void {
  log.value = [`${new Date().toLocaleTimeString()} — ${message}`, ...log.value].slice(0, 6)
}

// ------------------------------------------------------------------- modal
const modalOpen = ref(false)
const modalSize = ref<'sm' | 'md' | 'lg' | 'xl' | 'full'>('md')
const modalBusy = ref(false)
const modalNoEsc = ref(false)
const modalNoOutside = ref(false)
const modalHideClose = ref(false)

const sizeOptions = computed(() => [
  { value: 'sm', label: t('overlays.size.sm') },
  { value: 'md', label: t('overlays.size.md') },
  { value: 'lg', label: t('overlays.size.lg') },
  { value: 'xl', label: t('overlays.size.xl') },
  { value: 'full', label: t('overlays.size.full') },
])

/**
 * A control that opens an overlay of its own, from inside a dialog: a select's
 * listbox is a `dropdown` (a lower layer than the `modal` hosting it). The
 * gallery's other selects all sit on the page, where that nesting cannot be
 * seen — this one is the checkpoint for it.
 */
const modalChannel = ref('stable')
const modalChannelOptions = computed(() => [
  { value: 'stable', label: t('overlays.modal.channelStable') },
  { value: 'beta', label: t('overlays.modal.channelBeta') },
  { value: 'nightly', label: t('overlays.modal.channelNightly') },
])

async function simulateSave(): Promise<void> {
  modalBusy.value = true
  await new Promise((resolve) => setTimeout(resolve, 1400))
  modalBusy.value = false
  modalOpen.value = false
  record(t('overlays.modal.logSaved'))
}

// ------------------------------------------------------------------ drawer
const drawerOpen = ref(false)
const drawerSide = ref<'left' | 'right' | 'top' | 'bottom'>('right')
const drawerSize = ref<'sm' | 'md' | 'lg' | 'xl'>('md')

const sideOptions = computed(() => [
  { value: 'left', label: t('overlays.side.left') },
  { value: 'right', label: t('overlays.side.right') },
  { value: 'top', label: t('overlays.side.top') },
  { value: 'bottom', label: t('overlays.side.bottom') },
])
const drawerSizeOptions = computed(() => [
  { value: 'sm', label: t('overlays.drawerSize.sm') },
  { value: 'md', label: t('overlays.drawerSize.md') },
  { value: 'lg', label: t('overlays.drawerSize.lg') },
  { value: 'xl', label: t('overlays.drawerSize.xl') },
])

// ------------------------------------------------------------------ popover
const popoverOpen = ref(false)
const popoverPlacement = ref<'bottom-start' | 'bottom' | 'right' | 'top-end'>('bottom-start')
// Placement values are API terms — they are what the `placement` prop takes,
// so they stay as they are in every language.
const popoverPlacements = [
  { value: 'bottom-start', label: 'bottom-start' },
  { value: 'bottom', label: 'bottom' },
  { value: 'right', label: 'right' },
  { value: 'top-end', label: 'top-end' },
]

// ---------------------------------------------------------------- popconfirm
const confirmDanger = ref(false)
const confirmBasic = ref(false)
const popconfirmTone = computed(() => (confirmDanger.value ? 'danger' : 'neutral'))

// ------------------------------------------------------------------- misc
const nestedModal = ref(false)
const outerModal = ref(false)
</script>

<template>
  <DemoPage :title="t('overlays.title')" :lead="t('overlays.lead')">
    <DemoSection :title="t('overlays.modal.title')" :note="t('overlays.modal.note')" stacked>
      <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-4); align-items: flex-end">
        <JinSelect
          v-model="modalSize"
          :options="sizeOptions"
          :block="false"
          :aria-label="t('overlays.modal.sizeAria')"
          style="min-width: 200px"
        />
        <label style="display: inline-flex; align-items: center; gap: var(--jin-space-2)">
          <JinSwitch v-model="modalNoEsc" size="sm" :label="t('overlays.modal.escapeDisabled')" />
        </label>
        <label style="display: inline-flex; align-items: center; gap: var(--jin-space-2)">
          <JinSwitch v-model="modalNoOutside" size="sm" :label="t('overlays.modal.scrimDisabled')" />
        </label>
        <label style="display: inline-flex; align-items: center; gap: var(--jin-space-2)">
          <JinSwitch v-model="modalHideClose" size="sm" :label="t('overlays.modal.hideClose')" />
        </label>
        <JinButton variant="primary" @click="modalOpen = true">
          <template #icon><JinIcon name="external" /></template>
          {{ t('overlays.modal.open') }}
        </JinButton>
      </div>

      <JinAlert
        v-if="log.length > 0"
        tone="neutral"
        :title="t('overlays.modal.reportedTitle')"
        :description="log.join(' · ')"
      />
    </DemoSection>

    <JinModal
      v-model="modalOpen"
      :size="modalSize"
      :title="t('overlays.modal.dialogTitle')"
      :description="t('overlays.modal.dialogDescription')"
      :close-on-esc="!modalNoEsc"
      :close-on-outside="!modalNoOutside"
      :hide-close="modalHideClose"
      :busy="modalBusy"
    >
      <div class="gallery-grid">
        <JinAlert
          tone="info"
          :title="t('overlays.modal.tryKeyboardTitle')"
          :description="t('overlays.modal.tryKeyboardDescription')"
        />
        <JinField
          :label="t('overlays.modal.noteLabel')"
          :hint="t('overlays.modal.noteHint')"
          required
        >
          <template #default="{ field }">
            <JinTextField :id="field.controlId" :placeholder="t('overlays.modal.notePlaceholder')" />
          </template>
        </JinField>
        <JinField :label="t('overlays.modal.notifyLabel')">
          <JinSwitch :label="t('overlays.modal.notifySwitch')" />
        </JinField>
        <JinField :label="t('overlays.modal.channelLabel')" :hint="t('overlays.modal.channelHint')">
          <JinSelect v-model="modalChannel" :options="modalChannelOptions" />
        </JinField>
      </div>

      <template #footer>
        <JinButton variant="ghost" :disabled="modalBusy" @click="modalOpen = false">
          {{ t('common.cancel') }}
        </JinButton>
        <JinButton variant="primary" :loading="modalBusy" @click="simulateSave">
          {{ modalBusy ? t('overlays.modal.publishing') : t('overlays.modal.publish') }}
        </JinButton>
      </template>
    </JinModal>

    <DemoSection :title="t('overlays.nested.title')" :note="t('overlays.nested.note')">
      <JinButton variant="secondary" @click="outerModal = true">
        {{ t('overlays.nested.openOuter') }}
      </JinButton>
      <JinButton variant="primary" @click="nestedModal = true">
        {{ t('overlays.nested.openSecond') }}
      </JinButton>
      <span class="gallery-muted">{{ t('overlays.nested.bothOpen') }}</span>
    </DemoSection>

    <JinModal
      v-model="outerModal"
      :title="t('overlays.nested.outerTitle')"
      :description="t('overlays.nested.outerDescription')"
    >
      <div class="gallery-grid">
        <p>{{ t('overlays.nested.outerBody') }}</p>
        <JinButton variant="secondary" @click="nestedModal = true">
          {{ t('overlays.nested.openAnother') }}
        </JinButton>
      </div>
      <template #footer>
        <JinButton @click="outerModal = false">{{ t('common.close') }}</JinButton>
      </template>
    </JinModal>

    <JinModal
      v-model="nestedModal"
      :title="t('overlays.nested.secondTitle')"
      :description="t('overlays.nested.secondDescription')"
      no-scrim
    >
      <p>{{ t('overlays.nested.secondBody') }}</p>
      <template #footer>
        <JinButton variant="primary" @click="nestedModal = false">
          {{ t('overlays.nested.closeThisOne') }}
        </JinButton>
      </template>
    </JinModal>

    <DemoSection :title="t('overlays.drawer.title')" :note="t('overlays.drawer.note')" stacked>
      <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-3); align-items: flex-end">
        <JinSelect
          v-model="drawerSide"
          :options="sideOptions"
          :block="false"
          :aria-label="t('overlays.drawer.sideAria')"
          style="min-width: 140px"
        />
        <JinSelect
          v-model="drawerSize"
          :options="drawerSizeOptions"
          :block="false"
          :aria-label="t('overlays.drawer.sizeAria')"
          style="min-width: 180px"
        />
        <JinButton variant="primary" @click="drawerOpen = true">
          <template #icon><JinIcon name="folder" /></template>
          {{ t('overlays.drawer.open') }}
        </JinButton>
        <JinButton variant="secondary" @click="() => { drawerSide = 'bottom'; drawerOpen = true }">
          {{ t('overlays.drawer.bottomSheet') }}
        </JinButton>
        <JinButton variant="secondary" @click="() => { drawerSide = 'top'; drawerOpen = true }">
          {{ t('overlays.drawer.topSheet') }}
        </JinButton>
      </div>
    </DemoSection>

    <JinDrawer
      v-model="drawerOpen"
      :title="t('overlays.drawer.panelTitle')"
      :description="t('overlays.drawer.panelDescription')"
      :side="drawerSide"
      :size="drawerSize"
    >
      <div class="gallery-grid">
        <JinField :label="t('overlays.drawer.kind')">
          <JinSelect
            :options="[
              { value: 'any', label: t('overlays.drawer.kindAny') },
              { value: 'folded', label: t('overlays.drawer.kindFolded') },
              { value: 'hidden', label: t('overlays.drawer.kindHidden') },
            ]"
            model-value="any"
          />
        </JinField>
        <JinField :label="t('overlays.drawer.nameContains')">
          <JinTextField :placeholder="t('overlays.drawer.namePlaceholder')" clearable />
        </JinField>
        <JinDivider />
        <JinSwitch :label="t('overlays.drawer.includeNested')" />
        <JinSwitch :label="t('overlays.drawer.onlyChanged')" />
      </div>
      <template #footer>
        <JinButton variant="ghost" @click="drawerOpen = false">{{ t('common.cancel') }}</JinButton>
        <JinButton variant="primary" @click="drawerOpen = false">{{ t('common.apply') }}</JinButton>
      </template>
    </JinDrawer>

    <DemoSection :title="t('overlays.popover.title')" :note="t('overlays.popover.note')" stacked>
      <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-3); align-items: center">
        <JinSelect
          v-model="popoverPlacement"
          :options="popoverPlacements"
          :block="false"
          :aria-label="t('overlays.popover.placementAria')"
          style="min-width: 180px"
        />
        <JinPopover
          :model-value="popoverOpen"
          :placement="popoverPlacement"
          arrow
          :aria-label="t('overlays.popover.anchorAria')"
          @update:model-value="(value: boolean) => (popoverOpen = value)"
        >
          <template #anchor="{ open, toggle }">
            <JinButton variant="secondary" @click="toggle()">
              <template #icon><JinIcon name="filter" /></template>
              {{ open ? t('overlays.popover.hide') : t('overlays.popover.show') }}
            </JinButton>
          </template>

          <div style="padding: var(--jin-space-4); width: 260px">
            <p style="margin: 0 0 var(--jin-space-2); font-weight: var(--jin-font-weight-medium)">
              {{ t('overlays.popover.heading') }}
            </p>
            <p class="gallery-muted" style="margin: 0 0 var(--jin-space-3)">
              {{ t('overlays.popover.body') }}
            </p>
            <JinButton size="sm" variant="primary" @click="popoverOpen = false">
              {{ t('overlays.popover.done') }}
            </JinButton>
          </div>
        </JinPopover>

        <span class="gallery-muted">{{ t('overlays.popover.resizeHint') }}</span>
      </div>
    </DemoSection>

    <DemoSection :title="t('overlays.tooltip.title')" :note="t('overlays.tooltip.note')">
      <JinTooltip :content="t('overlays.tooltip.saved')" placement="top">
        <JinButton variant="ghost" size="sm">
          <template #icon><JinIcon name="clock" /></template>
          {{ t('overlays.tooltip.hoverMe') }}
        </JinButton>
      </JinTooltip>

      <JinTooltip :content="t('overlays.tooltip.noDelayContent')" :open-delay="0" placement="top">
        <JinButton variant="ghost" size="sm">{{ t('overlays.tooltip.noDelay') }}</JinButton>
      </JinTooltip>

      <JinTooltip :content="t('overlays.tooltip.lingeringContent')" :close-delay="1000" placement="bottom">
        <JinButton variant="ghost" size="sm">{{ t('overlays.tooltip.lingering') }}</JinButton>
      </JinTooltip>

      <JinTooltip :content="t('overlays.tooltip.disabledContent')" placement="right">
        <JinButton variant="ghost" size="sm" disabled>{{ t('overlays.tooltip.disabledControl') }}</JinButton>
      </JinTooltip>

      <JinTooltip placement="top">
        <JinButton variant="ghost" size="sm">
          <template #icon><JinIcon name="info" /></template>
          {{ t('overlays.tooltip.rich') }}
        </JinButton>
        <template #content>
          <span>{{ t('overlays.tooltip.richBody') }}</span>
        </template>
      </JinTooltip>
    </DemoSection>

    <DemoSection :title="t('overlays.popconfirm.title')" :note="t('overlays.popconfirm.note')" stacked>
      <div style="display: flex; flex-wrap: wrap; gap: var(--jin-space-3)">
        <JinPopconfirm
          :title="t('overlays.popconfirm.removeTitle')"
          :description="t('overlays.popconfirm.removeDescription')"
          :tone="popconfirmTone"
          placement="top"
          @confirm="record(t('overlays.popconfirm.logConfirmed'))"
          @cancel="record(t('overlays.popconfirm.logCancelled'))"
        >
          <template #anchor="{ toggle }">
            <JinButton :variant="popconfirmTone === 'danger' ? 'danger' : 'secondary'" @click="toggle()">
              <template #icon><JinIcon name="trash" /></template>
              {{ t('overlays.popconfirm.deleteFilter') }}
            </JinButton>
          </template>
        </JinPopconfirm>

        <JinPopconfirm
          v-model="confirmBasic"
          :title="t('overlays.popconfirm.overwriteTitle')"
          :confirm-label="t('overlays.popconfirm.overwrite')"
          :cancel-label="t('overlays.popconfirm.keepBoth')"
          placement="bottom"
          @confirm="record(t('overlays.popconfirm.logOverwritten'))"
        >
          <template #anchor="{ toggle }">
            <JinButton variant="secondary" @click="toggle()">
              {{ t('overlays.popconfirm.overwriteTrigger') }}
            </JinButton>
          </template>
        </JinPopconfirm>

        <JinButton variant="ghost" @click="confirmDanger = !confirmDanger">
          {{ t('overlays.popconfirm.toggleDanger', { state: t(confirmDanger ? 'common.on' : 'common.off') }) }}
        </JinButton>
      </div>

      <JinAlert
        v-if="log.length > 0"
        tone="neutral"
        :title="t('overlays.popconfirm.reportedTitle')"
        :description="log.join(' · ')"
      />
    </DemoSection>

    <DemoSection :title="t('overlays.boundary.title')" :note="t('overlays.boundary.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinAlert
          tone="success"
          :title="t('overlays.boundary.positioningTitle')"
          :description="t('overlays.boundary.positioningDescription')"
        />
        <JinAlert
          tone="success"
          :title="t('overlays.boundary.focusTitle')"
          :description="t('overlays.boundary.focusDescription')"
        />
        <JinAlert
          tone="success"
          :title="t('overlays.boundary.dismissalTitle')"
          :description="t('overlays.boundary.dismissalDescription')"
        />
        <JinAlert
          tone="success"
          :title="t('overlays.boundary.portalTitle')"
          :description="t('overlays.boundary.portalDescription')"
        />
      </div>
    </DemoSection>
  </DemoPage>
</template>
