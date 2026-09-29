<script setup lang="ts">
/**
 * Application samples.
 *
 * Isolated controls prove a component works. These four screens prove the set
 * works together: a list/detail layout, a form page, a flow that crosses a
 * modal and a drawer, and the state pages. This is the only way to judge the
 * overall feel, and it is the acceptance surface for "both applications look
 * consistent".
 *
 * The domain here is deliberately generic — a file workspace — because the
 * library must never see a real one.
 *
 * The sample records are stored as keys and translated by a `computed`: this
 * is the page where a language switch is most visible, since the row titles,
 * owners, badges and detail labels are all generated rather than typed.
 */
import { computed, ref } from 'vue'
import {
  JinAlert,
  JinBadge,
  JinBreadcrumb,
  JinButton,
  JinCard,
  JinCheckbox,
  JinDetailList,
  JinDivider,
  JinDrawer,
  JinDropdown,
  JinField,
  JinIcon,
  JinModal,
  JinNav,
  JinProgress,
  JinRadioGroup,
  JinResult,
  JinSearchField,
  JinSelect,
  JinSkeleton,
  JinSwitch,
  JinTabs,
  JinTag,
  JinTextField,
  JinToolbar,
  JinTooltip,
  JinTree,
  type DetailItem,
  type MenuEntry,
  type NavItem,
  type TabItem,
  type TreeNode,
} from '@bythid/jin'
import { DemoPage, DemoSection } from '../demo/DemoSection'
import { useI18n } from '../i18n'

defineProps<{ section?: string | null }>()

const { t } = useI18n()

/* ============================================================ list & detail */

type EntryKind = 'document' | 'spreadsheet' | 'image' | 'archive'
type EntryState = 'ready' | 'processing' | 'blocked'

interface EntrySpec {
  id: string
  titleKey: string
  kind: EntryKind
  ownerKey: string
  updatedKey: string
  size: string
  state: EntryState
  tagKeys: string[]
}

const entrySpecs: EntrySpec[] = [
  {
    id: 'e1',
    titleKey: 'samples.entries.e1.title',
    kind: 'document',
    ownerKey: 'samples.entries.e1.owner',
    updatedKey: 'samples.entries.e1.updated',
    size: '2.4 MB',
    state: 'ready',
    tagKeys: ['samples.entries.tag.finance', 'samples.entries.tag.shared'],
  },
  {
    id: 'e2',
    titleKey: 'samples.entries.e2.title',
    kind: 'spreadsheet',
    ownerKey: 'samples.entries.e2.owner',
    updatedKey: 'samples.entries.e2.updated',
    size: '880 KB',
    state: 'processing',
    tagKeys: ['samples.entries.tag.stock'],
  },
  {
    id: 'e3',
    titleKey: 'samples.entries.e3.title',
    kind: 'image',
    ownerKey: 'samples.entries.e3.owner',
    updatedKey: 'samples.entries.e3.updated',
    size: '6.1 MB',
    state: 'ready',
    tagKeys: ['samples.entries.tag.layout', 'samples.entries.tag.archive'],
  },
  {
    id: 'e4',
    titleKey: 'samples.entries.e4.title',
    kind: 'archive',
    ownerKey: 'samples.entries.e4.owner',
    updatedKey: 'samples.entries.e4.updated',
    size: '44 MB',
    state: 'blocked',
    tagKeys: ['samples.entries.tag.legacy'],
  },
  {
    id: 'e5',
    titleKey: 'samples.entries.e5.title',
    kind: 'document',
    ownerKey: 'samples.entries.e5.owner',
    updatedKey: 'samples.entries.e5.updated',
    size: '12 KB',
    state: 'ready',
    tagKeys: ['samples.entries.tag.notes'],
  },
]

interface Entry {
  id: string
  title: string
  kind: EntryKind
  kindLabel: string
  owner: string
  updated: string
  size: string
  state: EntryState
  stateLabel: string
  tags: string[]
}

/** A reload is a state change, not a rewritten record: the timestamp becomes "just now". */
const refreshed = ref(false)

const entries = computed<Entry[]>(() =>
  entrySpecs.map((spec) => ({
    id: spec.id,
    title: t(spec.titleKey),
    kind: spec.kind,
    kindLabel: t(`samples.kind.${spec.kind}`),
    owner: t(spec.ownerKey),
    updated: refreshed.value ? t('samples.list.justNow') : t(spec.updatedKey),
    size: spec.size,
    state: spec.state,
    stateLabel: t(`samples.state.${spec.state}`),
    tags: spec.tagKeys.map((key) => t(key)),
  })),
)

const selectedId = ref<string | null>('e1')
const query = ref('')
const listLoading = ref(false)
const detailTab = ref<string | null>('properties')

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return entries.value
  return entries.value.filter(
    (entry) => entry.title.toLowerCase().includes(needle) || entry.owner.toLowerCase().includes(needle),
  )
})

const selected = computed(() => entries.value.find((entry) => entry.id === selectedId.value) ?? null)

const detailItems = computed<DetailItem[]>(() => {
  const entry = selected.value
  if (!entry) return []
  return [
    { key: 'kind', label: t('samples.list.detail.kind'), value: entry.kindLabel },
    { key: 'owner', label: t('samples.list.detail.owner'), value: entry.owner },
    { key: 'size', label: t('samples.list.detail.size'), value: entry.size },
    { key: 'updated', label: t('samples.list.detail.updated'), value: entry.updated },
    { key: 'state', label: t('samples.list.detail.state'), value: entry.stateLabel },
    { key: 'tags', label: t('samples.list.detail.tags'), value: entry.tags.join(', ') },
    {
      key: 'path',
      label: t('samples.list.detail.path'),
      value: `/workspace/${entry.id}/${entry.title.replace(/\s+/g, '-').toLowerCase()}`,
    },
  ]
})

const listDetailTabs = computed<TabItem[]>(() => [
  { value: 'properties', label: t('samples.list.properties') },
  { value: 'activity', label: t('samples.list.activity'), badge: '4' },
  { value: 'access', label: t('samples.list.access') },
])

const rowMenu = computed<MenuEntry[]>(() => [
  { id: 'open', label: t('samples.list.open') },
  { id: 'duplicate', label: t('navigation.menu.duplicate') },
  { id: 'sep', type: 'separator' },
  { id: 'remove', label: t('samples.list.remove'), danger: true },
])

const listNav = computed<NavItem[]>(() => [
  { id: 'all', label: t('samples.list.allEntries'), icon: 'database', badge: String(entries.value.length) },
  { id: 'ready', label: t('samples.list.ready'), icon: 'check' },
  { id: 'processing', label: t('samples.list.processing'), icon: 'clock', badge: '1' },
  { id: 'blocked', label: t('samples.list.blocked'), icon: 'lock', badge: '1' },
  { id: 'archive', label: t('samples.list.archive'), icon: 'file', disabled: true },
])
const listFilter = ref('all')

const shown = computed(() => {
  if (listFilter.value === 'all') return filtered.value
  return filtered.value.filter((entry) => entry.state === listFilter.value)
})

function simulateRefresh(): void {
  listLoading.value = true
  setTimeout(() => {
    listLoading.value = false
    refreshed.value = true
  }, 1200)
}

const rowMenuTarget = ref<Entry | null>(null)
const rowMenuOpen = ref(false)

function onRowMenu(entry: Entry): void {
  // Opens the row menu anchored to the pointer through the popover used by
  // dropdown; the sample only records the intent.
  rowMenuTarget.value = entry
  rowMenuOpen.value = true
}

/* ================================================================ form page */

const form = ref({
  name: t('samples.entries.e1.title'),
  kind: 'document',
  owner: t('samples.entries.e1.owner'),
  retention: '90',
  notes: t('samples.form.notesContent'),
  notify: true,
  review: false,
  visibility: 'team',
})

const formErrors = ref<Record<string, string>>({})
const formSaved = ref(false)

const kindOptions = computed(() => [
  { value: 'document', label: t('samples.kind.document') },
  { value: 'spreadsheet', label: t('samples.kind.spreadsheet') },
  { value: 'image', label: t('samples.kind.image') },
  { value: 'archive', label: t('samples.kind.archive') },
])

const retentionOptions = computed(() => [
  { value: '30', label: t('samples.form.retention.30') },
  { value: '90', label: t('samples.form.retention.90') },
  { value: '365', label: t('samples.form.retention.365') },
  { value: '0', label: t('samples.form.retention.0') },
])

const visibilityOptions = computed(() => [
  {
    value: 'private',
    label: t('samples.form.visibility.private'),
    hint: t('samples.form.visibility.privateHint'),
  },
  { value: 'team', label: t('samples.form.visibility.team'), hint: t('samples.form.visibility.teamHint') },
  { value: 'org', label: t('samples.form.visibility.org'), hint: t('samples.form.visibility.orgHint') },
])

function validate(): boolean {
  const next: Record<string, string> = {}
  if (!form.value.name.trim()) next['name'] = t('samples.form.errorNameRequired')
  else if (form.value.name.length > 60) next['name'] = t('samples.form.errorNameLength')
  if (!form.value.owner.trim()) next['owner'] = t('samples.form.errorOwnerRequired')
  formErrors.value = next
  return Object.keys(next).length === 0
}

function saveForm(): void {
  if (!validate()) {
    formSaved.value = false
    return
  }
  formSaved.value = true
}

function resetForm(): void {
  form.value = {
    name: '',
    kind: 'document',
    owner: '',
    retention: '90',
    notes: '',
    notify: false,
    review: false,
    visibility: 'team',
  }
  formErrors.value = {}
  formSaved.value = false
}

/* ============================================================= flow screen */

type Step = 'idle' | 'review' | 'options' | 'running' | 'done'
const step = ref<Step>('idle')
const reviewOpen = ref(false)
const optionsOpen = ref(false)
const progress = ref(0)
const flowOptions = ref({ verbose: true, failFast: false, notify: true })
// No log buffer: the flow visualises its own state instead.

function startFlow(): void {
  step.value = 'review'
  reviewOpen.value = true
}

function confirmReview(): void {
  reviewOpen.value = false
  step.value = 'options'
  optionsOpen.value = true
}

function confirmOptions(): void {
  optionsOpen.value = false
  step.value = 'running'
  progress.value = 0
  const timer = setInterval(() => {
    progress.value = Math.min(100, progress.value + 7)
    if (progress.value >= 100) {
      clearInterval(timer)
      step.value = 'done'
    }
  }, 120)
}

function resetFlow(): void {
  step.value = 'idle'
  progress.value = 0

}

const flowLabel = computed(() => {
  switch (step.value) {
    case 'idle':
      return t('samples.flow.idle')
    case 'review':
      return t('samples.flow.reviewStep')
    case 'options':
      return t('samples.flow.optionsStep')
    case 'running':
      return t('samples.flow.runningStep')
    case 'done':
      return t('samples.flow.doneStep')
  }
})

/**
 * A tiny application-level stepper. A stepper is not in the library's component
 * list and does not need to be — ten lines built from tokens is exactly what the
 * contract expects a host application to do for a one-off screen element.
 */
const flowSteps = ['review', 'options', 'running', 'done'] as const
const STEP_LABEL_KEYS: Record<Step, string> = {
  idle: 'samples.flow.stepIdle',
  review: 'samples.flow.stepReview',
  options: 'samples.flow.stepOptions',
  running: 'samples.flow.stepRunning',
  done: 'samples.flow.stepDone',
}
const stepLabel = computed(() => t(STEP_LABEL_KEYS[step.value]))
const flowStepLabels = computed(() => flowSteps.map((id) => t(STEP_LABEL_KEYS[id])))
const stepIndex = computed(() => flowSteps.indexOf(step.value as (typeof flowSteps)[number]))

function flowStepStyle(index: number): Record<string, string> {
  const current = stepIndex.value
  const state = current === -1 ? 'todo' : index < current ? 'done' : index === current ? 'current' : 'todo'
  return {
    padding: 'var(--jin-space-1) var(--jin-space-3)',
    borderRadius: 'var(--jin-radius-full)',
    border: 'var(--jin-border-width) var(--jin-border-style) var(--jin-border-color)',
    background:
      state === 'current'
        ? 'color-mix(in srgb, var(--jin-accent) 16%, transparent)'
        : state === 'done'
          ? 'var(--jin-success-bg)'
          : 'transparent',
    color: state === 'current' ? 'var(--jin-accent)' : 'var(--jin-text-muted)',
    fontSize: 'var(--jin-font-size-sm)',
  }
}

/* =========================================================== state screens */

const stateNodes = computed<TreeNode[]>(() => [
  { id: 'empty-folder', label: t('samples.states.emptyFolder'), children: [] },
  { id: 'broken', label: t('samples.states.failingBranch'), hasChildren: true },
])
function stateLoad(): Promise<TreeNode[]> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(t('samples.states.unavailable'))), 600),
  )
}
</script>

<template>
  <DemoPage :title="t('samples.title')" :lead="t('samples.lead')">
    <!-- =================================================== list & detail -->
    <DemoSection id="list-detail" :title="t('samples.list.title')" :note="t('samples.list.note')" stacked>
      <div class="gallery-app-frame">
        <div class="gallery-app-frame__chrome">
          <JinBreadcrumb
            :items="[
              { label: t('samples.list.workspace'), onClick: () => undefined },
              { label: t('samples.list.entries'), current: true },
            ]"
          />
          <span style="flex: 1 1 auto" />
          <JinTooltip :content="t('samples.list.reloadTooltip')" placement="bottom">
            <JinButton
              size="sm"
              variant="ghost"
              icon
              :label="t('samples.list.reload')"
              :loading="listLoading"
              @click="simulateRefresh"
            >
              <template #icon><JinIcon name="refresh" /></template>
            </JinButton>
          </JinTooltip>
          <JinButton size="sm" variant="primary">
            <template #icon><JinIcon name="plus" /></template>
            {{ t('samples.list.newEntry') }}
          </JinButton>
        </div>

        <div class="gallery-app-frame__body">
          <div class="gallery-app-frame__col gallery-app-frame__col--alt">
            <JinNav
              :items="listNav"
              :current="listFilter"
              :aria-label="t('samples.list.filtersAria')"
              @select="(item) => (listFilter = item.id)"
            />
            <JinDivider spaced />
            <JinCard :title="t('samples.list.storage')" elevation="flat">
              <JinProgress :value="68" :label="t('samples.list.quota')" size="sm" />
            </JinCard>
          </div>

          <div class="gallery-app-frame__col">
            <div class="jin-stack">
              <JinSearchField v-model="query" :placeholder="t('samples.list.searchPlaceholder')" />

              <div v-if="listLoading" class="jin-stack">
                <JinSkeleton v-for="row in 4" :key="row" variant="rect" height="52px" />
              </div>

              <div v-else-if="shown.length === 0" class="jin-stack">
                <JinResult
                  status="empty"
                  :title="t('samples.list.nothingTitle')"
                  :description="t('samples.list.nothingDescription')"
                >
                  <template #actions>
                    <JinButton size="sm" variant="primary" @click="query = ''; listFilter = 'all'">
                      {{ t('samples.list.clearFilter') }}
                    </JinButton>
                  </template>
                </JinResult>
              </div>

              <div v-else class="jin-stack">
                <div
                  v-for="entry in shown"
                  :key="entry.id"
                  class="gallery-list-row"
                  :class="{ 'gallery-list-row--selected': entry.id === selectedId }"
                  role="button"
                  tabindex="0"
                  @click="selectedId = entry.id"
                  @keydown.enter="selectedId = entry.id"
                  @keydown.space.prevent="selectedId = entry.id"
                >
                  <JinIcon
                    :name="entry.kind === 'image' ? 'star' : entry.kind === 'archive' ? 'folder' : 'file'"
                    :size="1.2"
                  />
                  <span class="gallery-list-row__main">
                    <span class="gallery-list-row__title">{{ entry.title }}</span>
                    <span class="gallery-list-row__meta">
                      {{ entry.owner }} · {{ entry.updated }} · {{ entry.size }}
                    </span>
                  </span>
                  <JinBadge
                    :tone="entry.state === 'ready' ? 'success' : entry.state === 'processing' ? 'warning' : 'danger'"
                    :label="entry.stateLabel"
                  />
                  <JinDropdown :items="rowMenu" :aria-label="t('samples.list.rowMenuAria')" @select="() => onRowMenu(entry)">
                    <template #trigger>
                      <JinButton size="sm" variant="ghost" icon :label="t('samples.list.rowActions')">
                        <template #icon><JinIcon name="menu" /></template>
                      </JinButton>
                    </template>
                  </JinDropdown>
                </div>
              </div>
            </div>
          </div>

          <div class="gallery-app-frame__col gallery-app-frame__col--aside">
            <template v-if="selected">
              <div class="jin-stack">
                <div>
                  <p style="margin: 0; font-size: var(--jin-font-size-lg); font-weight: var(--jin-font-weight-bold)">
                    {{ selected.title }}
                  </p>
                  <p class="gallery-muted" style="margin: var(--jin-space-1) 0 0">
                    {{ selected.kindLabel }} · {{ selected.size }}
                  </p>
                </div>

                <div class="jin-cluster">
                  <JinTag v-for="tag in selected.tags" :key="tag" :label="tag" removable />
                </div>

                <JinDivider />

                <JinTabs v-model="detailTab" :items="listDetailTabs" :aria-label="t('samples.list.detailsAria')">
                  <template #properties>
                    <JinDetailList :items="detailItems" :bordered="false" compact>
                      <template #value="{ item }">
                        <JinBadge
                          v-if="item.key === 'state'"
                          :tone="selected.state === 'ready' ? 'success' : selected.state === 'processing' ? 'warning' : 'danger'"
                          :label="String(item.value)"
                        />
                        <span v-else :class="{ 'gallery-mono': item.key === 'path' }">{{ item.value }}</span>
                      </template>
                    </JinDetailList>
                  </template>
                  <template #activity>
                    <div class="jin-stack">
                      <JinAlert
                        tone="info"
                        :title="t('samples.list.importedTitle')"
                        :description="t('samples.list.importedDescription')"
                      />
                      <JinAlert
                        tone="neutral"
                        :title="t('samples.list.tagsUpdatedTitle')"
                        :description="t('samples.list.tagsUpdatedDescription')"
                      />
                    </div>
                  </template>
                  <template #access>
                    <JinAlert
                      tone="warning"
                      :title="t('samples.list.accessTitle')"
                      :description="t('samples.list.accessDescription')"
                    />
                  </template>
                </JinTabs>
              </div>
            </template>

            <JinResult v-else status="empty" :description="t('samples.list.selectEntry')" />
          </div>
        </div>
      </div>

      <JinModal
        v-model="rowMenuOpen"
        :title="t('samples.list.rowActionTitle')"
        :description="rowMenuTarget ? t('samples.list.rowActionDescription', { title: rowMenuTarget.title }) : ''"
      >
        <p class="gallery-muted">{{ t('samples.list.rowActionBody') }}</p>
        <template #footer>
          <JinButton @click="rowMenuOpen = false">{{ t('common.close') }}</JinButton>
        </template>
      </JinModal>
    </DemoSection>

    <!-- ========================================================= form page -->
    <DemoSection id="form" :title="t('samples.form.title')" :note="t('samples.form.note')" stacked>
      <div class="gallery-app-frame">
        <div class="gallery-app-frame__chrome">
          <span style="font-weight: var(--jin-font-weight-medium)">{{ t('samples.form.chrome') }}</span>
          <span style="flex: 1 1 auto" />
          <JinBadge v-if="formSaved" tone="success" :label="t('samples.form.savedBadge')" />
        </div>

        <div class="gallery-app-frame__body gallery-app-frame__body--form">
          <JinCard
            class="gallery-form-card"
            :title="t('samples.form.cardTitle')"
            :description="t('samples.form.cardDescription')"
          >
            <form class="jin-stack" style="gap: var(--jin-space-4)" @submit.prevent="saveForm">
              <JinField
                :label="t('samples.form.name')"
                :error="formErrors.name"
                :hint="t('samples.form.nameHint')"
                required
              >
                <JinTextField
                  v-model="form.name"
                  :placeholder="t('samples.form.namePlaceholder')"
                  clearable
                  :maxlength="60"
                  show-count
                />
              </JinField>

              <JinField :label="t('samples.form.owner')" :error="formErrors.owner" required>
                <JinTextField v-model="form.owner" :placeholder="t('samples.form.ownerPlaceholder')" />
              </JinField>

              <JinField :label="t('samples.form.kind')">
                <JinSelect v-model="form.kind" :options="kindOptions" />
              </JinField>

              <JinField :label="t('samples.form.retention')" :hint="t('samples.form.retentionHint')">
                <JinSelect v-model="form.retention" :options="retentionOptions" />
              </JinField>

              <JinField :label="t('samples.form.visibility')" :optional="true">
                <JinRadioGroup v-model="form.visibility" :options="visibilityOptions" />
              </JinField>

              <JinField :label="t('samples.form.notes')" :optional="true">
                <JinTextField
                  v-model="form.notes"
                  multiline
                  autosize
                  :rows="3"
                  :max-rows="6"
                  :placeholder="t('samples.form.notesPlaceholder')"
                />
              </JinField>

              <JinDivider />

              <div class="jin-stack" style="gap: var(--jin-space-2)">
                <JinCheckbox
                  v-model="form.notify"
                  :label="t('samples.form.notify')"
                  :hint="t('samples.form.notifyHint')"
                />
                <JinCheckbox v-model="form.review" :label="t('samples.form.review')" />
                <JinSwitch v-model="form.notify" :label="t('samples.form.notifyOnDelete')" />
              </div>

              <div style="display: flex; gap: var(--jin-space-2)">
                <JinButton type="submit" variant="primary">{{ t('common.save') }}</JinButton>
                <JinButton type="button" variant="ghost" @click="resetForm">{{ t('common.reset') }}</JinButton>
              </div>
            </form>
          </JinCard>

          <JinAlert
            v-if="formSaved"
            tone="success"
            :title="t('samples.form.savedTitle')"
            :description="t('samples.form.savedDescription')"
          />
          <JinAlert
            v-else-if="Object.keys(formErrors).length > 0"
            tone="danger"
            :title="t('samples.form.fixFieldsTitle')"
            :description="Object.values(formErrors).join(' ')"
          />
        </div>
      </div>
    </DemoSection>

    <!-- ====================================================== flow screen -->
    <DemoSection id="flow" :title="t('samples.flow.title')" :note="t('samples.flow.note')" stacked>
      <div class="gallery-app-frame">
        <div class="gallery-app-frame__chrome">
          <span style="font-weight: var(--jin-font-weight-medium)">{{ t('samples.flow.chrome') }}</span>
          <span style="flex: 1 1 auto" />
          <JinBadge
            :tone="step === 'done' ? 'success' : step === 'running' ? 'warning' : 'neutral'"
            :label="stepLabel"
          />
        </div>

        <div style="padding: var(--jin-space-6); display: grid; place-items: center; min-height: 260px">
          <div class="jin-stack" style="max-width: 560px; width: 100%; align-items: flex-start">
            <JinAlert tone="info" :title="t('samples.flow.whatThisShows')" :description="flowLabel" />

            <div class="gallery-flow-steps">
              <span
                v-for="(label, index) in flowStepLabels"
                :key="label"
                class="jin-cluster"
                :style="flowStepStyle(index)"
              >
                <span aria-hidden="true">{{ stepIndex > index ? '✓' : index + 1 }}</span>
                <span>{{ label }}</span>
              </span>
            </div>

            <div v-if="step === 'running'" style="width: 100%">
              <JinProgress :value="progress" :label="t('samples.flow.runningLabel')" />
            </div>

            <div v-if="step === 'done'" style="width: 100%">
              <JinResult
                status="success"
                :title="t('samples.flow.finishedTitle')"
                :description="t('samples.flow.finishedDescription')"
                :style="{ padding: 0 }"
              >
                <template #actions>
                  <JinButton variant="primary" size="sm" @click="resetFlow">
                    {{ t('samples.flow.runAgain') }}
                  </JinButton>
                </template>
              </JinResult>
            </div>

            <div v-if="step === 'idle'" style="display: flex; gap: var(--jin-space-2)">
              <JinButton variant="primary" @click="startFlow">
                <template #icon><JinIcon name="play" /></template>
                {{ t('samples.flow.start') }}
              </JinButton>
              <JinButton variant="ghost" @click="resetFlow">{{ t('common.reset') }}</JinButton>
            </div>
          </div>
        </div>
      </div>
    </DemoSection>

    <JinModal
      v-model="reviewOpen"
      :title="t('samples.flow.reviewTitle')"
      :description="t('samples.flow.reviewDescription')"
      size="md"
    >
      <div class="jin-stack">
        <JinAlert
          tone="warning"
          :title="t('samples.flow.archivedWarningTitle')"
          :description="t('samples.flow.archivedWarningDescription')"
        />
        <JinDetailList
          :items="[
            { key: 'scope', label: t('samples.flow.scope'), value: t('samples.flow.scopeValue') },
            { key: 'count', label: t('samples.flow.count'), value: '4' },
            { key: 'reversible', label: t('samples.flow.reversible'), value: t('samples.flow.reversibleValue') },
          ]"
        />
      </div>

      <template #footer>
        <JinButton variant="ghost" @click="reviewOpen = false; step = 'idle'">
          {{ t('common.cancel') }}
        </JinButton>
        <JinButton variant="primary" @click="confirmReview">{{ t('common.continue') }}</JinButton>
      </template>
    </JinModal>

    <JinDrawer
      v-model="optionsOpen"
      :title="t('samples.flow.optionsTitle')"
      :description="t('samples.flow.optionsDescription')"
      side="right"
      size="md"
    >
      <div class="jin-stack">
        <JinSwitch v-model="flowOptions.verbose" :label="t('samples.flow.verbose')" />
        <JinSwitch v-model="flowOptions.failFast" :label="t('samples.flow.failFast')" />
        <JinSwitch v-model="flowOptions.notify" :label="t('samples.flow.notifyOnFinish')" />
        <JinDivider />
        <JinAlert
          tone="info"
          :title="t('samples.flow.drawerAlertTitle')"
          :description="t('samples.flow.drawerAlertDescription')"
        />
      </div>

      <template #footer>
        <JinButton variant="ghost" @click="optionsOpen = false; step = 'review'">
          {{ t('common.back') }}
        </JinButton>
        <JinButton variant="primary" @click="confirmOptions">{{ t('samples.flow.run') }}</JinButton>
      </template>
    </JinDrawer>

    <!-- ==================================================== state screens -->
    <DemoSection id="states" :title="t('samples.states.title')" :note="t('samples.states.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinCard
          :title="t('samples.states.emptyTitle')"
          :description="t('samples.states.emptyDescription')"
        >
          <JinResult
            status="empty"
            :title="t('samples.states.emptyResultTitle')"
            :description="t('samples.states.emptyResultDescription')"
          >
            <template #actions>
              <JinButton variant="primary" size="sm">{{ t('samples.states.importFile') }}</JinButton>
              <JinButton variant="ghost" size="sm">{{ t('samples.states.createManually') }}</JinButton>
            </template>
          </JinResult>
        </JinCard>

        <JinCard
          :title="t('samples.states.errorTitle')"
          :description="t('samples.states.errorDescription')"
        >
          <JinResult
            status="danger"
            :title="t('samples.states.errorResultTitle')"
            :description="t('samples.states.errorResultDescription')"
          >
            <template #actions>
              <JinButton variant="primary" size="sm">
                <template #icon><JinIcon name="refresh" /></template>
                {{ t('common.retry') }}
              </JinButton>
              <JinButton variant="ghost" size="sm">{{ t('samples.states.viewLog') }}</JinButton>
            </template>
          </JinResult>
        </JinCard>

        <JinCard
          :title="t('samples.states.loadingTitle')"
          :description="t('samples.states.loadingDescription')"
        >
          <div class="jin-stack">
            <div style="display: flex; gap: var(--jin-space-3); align-items: center">
              <JinSkeleton variant="circle" width="40px" height="40px" />
              <div style="flex: 1 1 auto; display: grid; gap: var(--jin-space-2)">
                <JinSkeleton variant="text" width="40%" />
                <JinSkeleton variant="text" width="70%" />
              </div>
            </div>
            <JinSkeleton variant="rect" height="80px" />
            <div style="display: grid; gap: var(--jin-space-2)">
              <JinSkeleton variant="text" width="100%" />
              <JinSkeleton variant="text" width="85%" />
            </div>
          </div>
        </JinCard>

        <JinCard
          :title="t('samples.states.partialTitle')"
          :description="t('samples.states.partialDescription')"
        >
          <div class="jin-stack">
            <JinAlert
              tone="danger"
              :title="t('samples.states.partialAlertTitle')"
              :description="t('samples.states.partialAlertDescription')"
            />
            <JinTree :nodes="stateNodes" :load="stateLoad" :aria-label="t('samples.states.treeAria')" />
          </div>
        </JinCard>
      </div>
    </DemoSection>

    <!-- ============================================================== RTL -->
    <DemoSection id="rtl" :title="t('samples.rtl.title')" :note="t('samples.rtl.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinCard :title="t('samples.rtl.formTitle')" :description="t('samples.rtl.formDescription')">
          <div class="gallery-rtl">
            <div class="jin-stack">
              <JinField label="اسم الإدخال" hint="يظهر هذا الاسم في كل القوائم." required>
                <JinTextField model-value="تقرير ربع سنوي" clearable />
              </JinField>
              <JinField label="النوع">
                <JinSelect :options="kindOptions" model-value="document" />
              </JinField>
              <JinToolbar aria-label="شريط الأدوات">
                <JinButton size="sm" variant="ghost">حفظ</JinButton>
                <JinButton size="sm" variant="ghost">إلغاء</JinButton>
                <span class="jin-toolbar__spacer" />
                <JinButton size="sm" variant="primary">إرسال</JinButton>
              </JinToolbar>
              <JinAlert tone="info" title="الاتجاه معكوس" description="مفاتيح الأسهم الأفقية تتبع الاتجاه." />
            </div>
          </div>
        </JinCard>

        <JinCard :title="t('samples.rtl.longTitle')" :description="t('samples.rtl.longDescription')">
          <div class="jin-stack">
            <JinField :label="t('samples.rtl.longLabel')">
              <JinTextField :model-value="t('samples.rtl.longValue')" clearable />
            </JinField>
            <JinDetailList
              :items="[
                { key: 'a', label: t('samples.rtl.detailLabel'), value: t('samples.rtl.detailValue') },
                { key: 'b', label: t('samples.rtl.shortLabel'), value: t('samples.rtl.shortValue') },
              ]"
            />
            <JinTag :label="t('samples.rtl.tagLabel')" />
            <JinAlert
              tone="warning"
              :title="t('samples.rtl.alertTitle')"
              :description="t('samples.rtl.alertDescription')"
            />
          </div>
        </JinCard>
      </div>
    </DemoSection>
  </DemoPage>
</template>
