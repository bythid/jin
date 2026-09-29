<script setup lang="ts">
/**
 * Tree catalogue — the component with the strictest contract.
 *
 * Every section here corresponds to a clause of that contract: nesting and
 * aria, selection modes, lazy loading with an inline indicator on the loading
 * row, the failure semantics (roll back, report, never swallow), the two
 * decoration routes (generic tone and the #item slot), and keyboard navigation.
 *
 * The node trees are `computed` because their labels are interface copy. A
 * branch that has already been fetched through `load` keeps the labels it
 * arrived with, the way a real remote response would.
 */
import { computed, ref } from 'vue'
import {
  JinAlert,
  JinBadge,
  JinButton,
  JinIcon,
  JinTag,
  JinTextField,
  JinTree,
  type TreeNode,
  type TranslateVars,
} from '@bythid/jin'
import { DemoPage, DemoSection } from '../demo/DemoSection'
import { useI18n } from '../i18n'

defineProps<{ section?: string | null }>()

const { t } = useI18n()

// ------------------------------------------------------------------ basics
const basicNodes = computed<TreeNode[]>(() => [
  {
    id: 'src',
    label: t('tree.nodes.src'),
    children: [
      {
        id: 'components',
        label: t('tree.nodes.components'),
        children: [
          { id: 'button', label: t('tree.nodes.button') },
          { id: 'dialog', label: t('tree.nodes.dialog') },
        ],
      },
      {
        id: 'styles',
        label: t('tree.nodes.styles'),
        children: [{ id: 'tokens', label: t('tree.nodes.tokens') }],
      },
      { id: 'main', label: t('tree.nodes.main') },
    ],
  },
  {
    id: 'tests',
    label: t('tree.nodes.tests'),
    children: [{ id: 'unit', label: t('tree.nodes.unit') }],
  },
  { id: 'readme', label: t('tree.nodes.readme') },
])

const expandedBasic = ref<string[]>(['src', 'components'])
const selectedBasic = ref<string | null>('button')

// --------------------------------------------------------------- selection
const multiNodes = computed<TreeNode[]>(() => [
  {
    id: 'g1',
    label: t('tree.nodes.groupOne'),
    children: [
      { id: 'i1', label: t('tree.nodes.itemOne') },
      { id: 'i2', label: t('tree.nodes.itemTwo') },
      { id: 'i3', label: t('tree.nodes.itemThree'), disabled: true },
    ],
  },
  {
    id: 'g2',
    label: t('tree.nodes.groupTwo'),
    children: [{ id: 'i4', label: t('tree.nodes.itemFour') }],
  },
])
const selectedMany = ref<string[]>(['i1'])
const noSelection = ref<string | null>(null)

// ------------------------------------------------------------ lazy loading
/** A fake remote: each branch resolves after a short delay. */
const lazyNodes = computed<TreeNode[]>(() => [
  { id: 'root-a', label: t('tree.nodes.remoteA'), hasChildren: true },
  { id: 'root-b', label: t('tree.nodes.remoteB'), hasChildren: true },
  { id: 'leaf', label: t('tree.nodes.plainLeaf') },
])

const lazyExpanded = ref<string[]>([])
const lazyLog = ref<{ key: string; vars?: TranslateVars }[]>([])
const lazyLogText = computed(() => lazyLog.value.map((entry) => t(entry.key, entry.vars)).join(' · '))

function pushLazyLog(entry: { key: string; vars?: TranslateVars }): void {
  lazyLog.value = [entry, ...lazyLog.value].slice(0, 5)
}

function loadChildren(node: TreeNode): Promise<TreeNode[]> {
  pushLazyLog({ key: 'tree.lazy.loadStarted', vars: { id: node.id } })
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: `${node.id}-1`,
          label: t('tree.nodes.fetchedChild', { index: 1 }),
          children: [{ id: `${node.id}-1a`, label: t('tree.nodes.deeper') }],
        },
        { id: `${node.id}-2`, label: t('tree.nodes.fetchedChild', { index: 2 }) },
      ])
    }, 900)
  })
}

// ---------------------------------------------------------------- failure
/** Fails on the first attempt and succeeds on the retry. */
const failingNodes = computed<TreeNode[]>(() => [
  { id: 'flaky', label: t('tree.nodes.flaky'), hasChildren: true },
  { id: 'always', label: t('tree.nodes.alwaysFails'), hasChildren: true },
])

const failureLog = ref<{ key: string; vars?: TranslateVars }[]>([])
const failureLogText = computed(() => failureLog.value.map((entry) => t(entry.key, entry.vars)).join(' · '))
const attempts = ref<Record<string, number>>({})

function loadUnreliable(node: TreeNode): Promise<TreeNode[]> {
  const attempt = (attempts.value[node.id] ?? 0) + 1
  attempts.value = { ...attempts.value, [node.id]: attempt }

  if (node.id === 'always' || attempt === 1) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(t('tree.nodes.requestFailed', { attempt }))), 700)
    })
  }
  return new Promise((resolve) => {
    setTimeout(
      () => resolve([{ id: `${node.id}-ok`, label: t('tree.nodes.loadedOnAttempt', { attempt }) }]),
      500,
    )
  })
}

function onLoadError(payload: { node: TreeNode; error: unknown }): void {
  const message = payload.error instanceof Error ? payload.error.message : String(payload.error)
  failureLog.value = [
    {
      key: 'tree.failure.reportsDescription',
      vars: { node: payload.node.label ?? payload.node.id, error: message },
    },
    ...failureLog.value,
  ].slice(0, 5)
}

// ------------------------------------------------------------------- tone
const toneNodes = computed<TreeNode[]>(() => [
  { id: 't-normal', label: t('tree.nodes.toneDefault'), tone: 'default' },
  { id: 't-muted', label: t('tree.nodes.toneMuted'), tone: 'muted' },
  { id: 't-warning', label: t('tree.nodes.toneWarning'), tone: 'warning' },
  { id: 't-danger', label: t('tree.nodes.toneDanger'), tone: 'danger' },
  { id: 't-icon', label: t('tree.nodes.toneIcon'), icon: 'database' },
])

/**
 * The slot route: the application renders its own badge. Note what the markup
 * contains — the library supplies `node`, `depth`, `expanded`, `loading` and
 * `failed`, and the application decides what any of it means.
 */
const slotNodes = computed<TreeNode[]>(() => [
  { id: 's1', label: t('tree.nodes.records'), data: { badge: '12', state: 'ok' } },
  { id: 's2', label: t('tree.nodes.drafts'), data: { badge: '3', state: 'attention' } },
  { id: 's3', label: t('tree.nodes.legacy'), data: { badge: '—', state: 'muted' } },
  { id: 's4', label: t('tree.nodes.restricted'), data: { badge: '!', state: 'blocked' } },
])

function nodeState(node: TreeNode): string {
  return (node.data as { state?: string } | undefined)?.state ?? 'ok'
}

function nodeBadge(node: TreeNode): string {
  return (node.data as { badge?: string } | undefined)?.badge ?? ''
}

function stateTone(state: string): 'neutral' | 'accent' | 'success' | 'warning' | 'danger' {
  if (state === 'ok') return 'success'
  if (state === 'attention') return 'warning'
  if (state === 'blocked') return 'danger'
  return 'neutral'
}

/** Turns an application state into one of the library's generic icon names. */
function stateIcon(state: string): 'check' | 'warning' | 'lock' | 'file' {
  if (state === 'ok') return 'check'
  if (state === 'attention') return 'warning'
  if (state === 'blocked') return 'lock'
  return 'file'
}

// ---------------------------------------------------------------- keyboard
const filter = ref('')
const filterableNodes = computed<TreeNode[]>(() => {
  const needle = filter.value.trim().toLowerCase()
  // The labels stay Latin on purpose: this section is about type-ahead, and
  // the letters a reader types have to match the letters on screen.
  const all: TreeNode[] = [
    { id: 'k1', label: t('tree.nodes.alpha'), children: [{ id: 'k1a', label: t('tree.nodes.alphaChild') }] },
    { id: 'k2', label: t('tree.nodes.beta') },
    { id: 'k3', label: t('tree.nodes.gamma'), children: [{ id: 'k3a', label: t('tree.nodes.gammaChild') }] },
    { id: 'k4', label: t('tree.nodes.delta') },
  ]
  if (!needle) return all
  return all.filter((node) => (node.label ?? '').toLowerCase().includes(needle))
})

const keyboardLog = ref<{ key: string; vars?: TranslateVars }[]>([])
const keyboardLogText = computed(() => keyboardLog.value.map((entry) => t(entry.key, entry.vars)).join(' · '))

function pushKeyboardLog(entry: { key: string; vars?: TranslateVars }): void {
  keyboardLog.value = [entry, ...keyboardLog.value].slice(0, 5)
}

function onActivate(node: TreeNode): void {
  pushKeyboardLog({ key: 'tree.keyboard.activated', vars: { label: node.label ?? node.id } })
}

function onToggle(node: TreeNode, expanded: boolean): void {
  pushKeyboardLog({
    key: expanded ? 'tree.keyboard.expanded' : 'tree.keyboard.collapsed',
    vars: { label: node.label ?? node.id },
  })
}
</script>

<template>
  <DemoPage :title="t('tree.title')" :lead="t('tree.lead')">
    <!-- ------------------------------------------------------------ basics -->
    <DemoSection id="basic" :title="t('tree.basics.title')" :note="t('tree.basics.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinTree
          v-model:expanded="expandedBasic"
          v-model:selected="selectedBasic"
          :nodes="basicNodes"
          :aria-label="t('tree.basics.filesAria')"
        />
        <div class="gallery-grid">
          <JinAlert
            tone="neutral"
            :title="t('tree.basics.selectionTitle')"
            :description="t('tree.basics.selectionDescription', { value: selectedBasic ?? t('common.none') })"
          />
          <JinAlert
            tone="neutral"
            :title="t('tree.basics.expansionTitle')"
            :description="t('tree.basics.expansionDescription', { value: expandedBasic.join(', ') || t('common.none') })"
          />
          <JinAlert
            tone="info"
            :title="t('tree.basics.controlledTitle')"
            :description="t('tree.basics.controlledDescription')"
          />
          <p class="gallery-muted">{{ t('tree.basics.noVocabulary') }}</p>
        </div>
      </div>
    </DemoSection>

    <!-- --------------------------------------------------------- selection -->
    <DemoSection id="selection" :title="t('tree.selection.title')" :note="t('tree.selection.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('tree.selection.multiple') }}
          </p>
          <JinTree
            :nodes="multiNodes"
            selection-mode="multiple"
            :expanded="['g1', 'g2']"
            :aria-label="t('tree.selection.multipleAria')"
            @update:selected-many="(value: string[]) => (selectedMany = value)"
          />
          <p class="gallery-muted" style="margin-top: var(--jin-space-2)">
            {{ t('tree.selection.selected', { value: selectedMany.join(', ') || t('common.none') }) }}
          </p>
        </div>

        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('tree.selection.disabledTitle') }}
          </p>
          <JinTree
            :nodes="multiNodes"
            selection-mode="none"
            :expanded="['g1']"
            :aria-label="t('tree.selection.disabledAria')"
            @activate="onActivate"
          />
          <p class="gallery-muted" style="margin-top: var(--jin-space-2)">
            {{ t('tree.selection.activatable') }}
          </p>
        </div>
      </div>

      <JinAlert
        tone="warning"
        :title="t('tree.selection.disabledRowsTitle')"
        :description="t('tree.selection.disabledRowsDescription')"
      />
    </DemoSection>

    <!-- ------------------------------------------------------ lazy loading -->
    <DemoSection id="lazy" :title="t('tree.lazy.title')" :note="t('tree.lazy.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinTree
          :nodes="lazyNodes"
          :load="loadChildren"
          :aria-label="t('tree.lazy.aria')"
          @toggle="onToggle"
        />
        <div class="gallery-grid">
          <JinAlert
            tone="info"
            :title="t('tree.lazy.stateMachineTitle')"
            :description="t('tree.lazy.stateMachineDescription')"
          />
          <JinAlert
            v-if="lazyLog.length > 0"
            tone="neutral"
            :title="t('tree.lazy.activityTitle')"
            :description="lazyLogText"
          />
          <p class="gallery-muted">{{ t('tree.lazy.programmatic') }}</p>
        </div>
      </div>
    </DemoSection>

    <!-- ---------------------------------------------------- failure/retry -->
    <DemoSection id="failure" :title="t('tree.failure.title')" :note="t('tree.failure.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinTree
          :nodes="failingNodes"
          :load="loadUnreliable"
          :aria-label="t('tree.failure.aria')"
          :loading-label="t('tree.failure.fetching')"
          @load-error="onLoadError"
        />

        <div class="gallery-grid">
          <JinAlert
            tone="warning"
            :title="t('tree.failure.tryTitle')"
            :description="t('tree.failure.tryDescription')"
          />
          <JinAlert
            v-if="failureLog.length > 0"
            tone="danger"
            :title="t('tree.failure.reportsTitle')"
            :description="failureLogText"
          />
          <p class="gallery-muted">{{ t('tree.failure.freeToIgnore') }}</p>
        </div>
      </div>
    </DemoSection>

    <!-- ------------------------------------------------- slots and tone  -->
    <DemoSection id="slots" :title="t('tree.slots.title')" :note="t('tree.slots.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('tree.slots.toneRoute') }}
          </p>
          <JinTree :nodes="toneNodes" :aria-label="t('tree.slots.toneAria')" />
          <p class="gallery-muted" style="margin-top: var(--jin-space-2)">
            {{ t('tree.slots.toneNote') }}
          </p>
        </div>

        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('tree.slots.slotRoute') }}
          </p>
          <JinTree :nodes="slotNodes" :aria-label="t('tree.slots.slotAria')">
            <template #item="{ node, selected, loading }">
              <span
                style="
                  display: flex;
                  align-items: center;
                  gap: var(--jin-space-2);
                  flex: 1 1 auto;
                  min-width: 0;
                "
              >
                <JinIcon :name="stateIcon(nodeState(node))" />
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ node.label }}</span>
                <JinBadge :tone="stateTone(nodeState(node))" :label="nodeBadge(node)" dot />
                <JinTag v-if="selected" :label="t('tree.slots.selected')" tone="accent" />
                <span v-if="loading" class="gallery-muted">…</span>
              </span>
            </template>
          </JinTree>
          <p class="gallery-muted" style="margin-top: var(--jin-space-2)">
            {{ t('tree.slots.slotNote') }}
          </p>
        </div>
      </div>
    </DemoSection>

    <!-- ------------------------------------------------------- keyboard  -->
    <DemoSection id="keyboard" :title="t('tree.keyboard.title')" :note="t('tree.keyboard.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <div class="gallery-grid">
          <JinTextField v-model="filter" :placeholder="t('tree.keyboard.filterPlaceholder')" clearable />
          <JinTree
            :nodes="filterableNodes"
            :aria-label="t('tree.keyboard.aria')"
            @activate="onActivate"
            @toggle="onToggle"
          />
        </div>

        <div class="gallery-grid">
          <JinAlert
            tone="info"
            :title="t('tree.keyboard.rovingTitle')"
            :description="t('tree.keyboard.rovingDescription')"
          />
          <JinAlert
            v-if="keyboardLog.length > 0"
            tone="neutral"
            :title="t('tree.keyboard.eventsTitle')"
            :description="keyboardLogText"
          />
          <p class="gallery-muted">{{ t('tree.keyboard.filterNote') }}</p>
        </div>
      </div>
    </DemoSection>

    <DemoSection :title="t('tree.boundary.title')" :note="t('tree.boundary.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinAlert
          tone="success"
          :title="t('tree.boundary.libraryTitle')"
          :description="t('tree.boundary.libraryDescription')"
        />
        <JinAlert
          tone="danger"
          :title="t('tree.boundary.appTitle')"
          :description="t('tree.boundary.appDescription')"
        />
      </div>
      <JinButton variant="secondary" @click="() => (failureLog = [])">
        <template #icon><JinIcon name="refresh" /></template>
        {{ t('tree.failure.clearLog') }}
      </JinButton>
    </DemoSection>
  </DemoPage>
</template>
