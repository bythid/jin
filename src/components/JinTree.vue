<script setup lang="ts">
/**
 * JinTree — the most demanding component in the set, and the one with the
 * strictest boundary between library and application.
 *
 * What the library owns: nesting, expansion, selection, keyboard navigation,
 * aria-level/setsize/posinset, the inline loading state on the row that is
 * loading, and the failure contract:
 *   (a) a failed load returns the row to "not loaded",
 *   (b) `load-error` carries { node, error } so the application can roll back
 *       its own state,
 *   (c) the error is never swallowed — this component re-emits and also leaves
 *       a visible marker on the row until it is retried.
 *
 * What the application owns: what a node means, why it failed, and any
 * decoration beyond the generic `tone` + `#item` slot routes.
 */
import { computed, nextTick, ref, watch } from 'vue'
import JinIcon from './JinIcon.vue'
import JinSpinner from './JinSpinner.vue'
import {
  applyLoadFailure,
  applyLoadStart,
  applyLoadSuccess,
  createTreeState,
  expandableIds,
  flattenTree,
  navigateTree,
  shouldLoad,
  typeaheadTreeRowId,
  type FlatTreeRow,
  type TreeNavKey,
  type TreeNode,
} from '../core/tree'
import { createTypeaheadBuffer } from '../core/roving'
import { useT } from '../composables/useT'
import type { TreeTone } from '../core/types'

const props = withDefaults(
  defineProps<{
    nodes: TreeNode[]
    /** Lazy loader for branches without `children`. */
    load?: (node: TreeNode) => Promise<TreeNode[]>
    /** Controlled expansion. */
    expanded?: string[]
    /** Controlled selection. */
    selected?: string | null
    /** Single or multiple selection. */
    selectionMode?: 'none' | 'single' | 'multiple'
    ariaLabel?: string
    /** Indent step per level, in space-token multiples. */
    indent?: number
    loadingLabel?: string
    emptyLabel?: string
  }>(),
  {
    load: undefined,
    expanded: undefined,
    selected: undefined,
    selectionMode: 'single',
    ariaLabel: '',
    indent: 1,
    loadingLabel: '',
    emptyLabel: '',
  },
)

const emit = defineEmits<{
  (event: 'update:expanded', value: string[]): void
  (event: 'update:selected', value: string | null): void
  (event: 'update:selectedMany', value: string[]): void
  (event: 'activate', node: TreeNode): void
  (event: 'toggle', node: TreeNode, expanded: boolean): void
  (event: 'load-start', node: TreeNode): void
  (event: 'load', node: TreeNode, children: TreeNode[]): void
  (event: 'load-error', payload: { node: TreeNode; error: unknown }): void
}>()

const { t } = useT()
const root = ref<HTMLElement | null>(null)
const activeId = ref<string | null>(null)
const buffer = createTypeaheadBuffer()

const state = ref(createTreeState({ expanded: props.expanded ? [...props.expanded] : [] }))
const internalSelection = ref<string[]>([])

const isExpandedControlled = computed(() => props.expanded !== undefined)
const isSelectedControlled = computed(() => props.selected !== undefined)

watch(
  () => props.expanded,
  (next) => {
    if (next === undefined) return
    state.value = { ...state.value, expanded: [...next] }
  },
)

const rows = computed(() => flattenTree(props.nodes, state.value))

const selectedSet = computed(() => {
  if (isSelectedControlled.value) return new Set(props.selected ? [props.selected] : [])
  return new Set(internalSelection.value)
})

function isSelected(row: FlatTreeRow): boolean {
  return selectedSet.value.has(row.id)
}

// ---------------------------------------------------------------- expansion

function setExpanded(ids: string[], toggled?: { node: TreeNode; expanded: boolean }): void {
  state.value = { ...state.value, expanded: [...ids] }
  emit('update:expanded', [...ids])
  if (toggled) emit('toggle', toggled.node, toggled.expanded)
}

function expand(row: FlatTreeRow): void {
  if (!row.hasChildren || row.expanded) return
  // Only the state changes here. The watcher on `expanded` is the single place
  // that starts a load, so one expansion never fires two requests.
  setExpanded([...state.value.expanded, row.id], { node: row.node, expanded: true })
}

function collapse(row: FlatTreeRow): void {
  if (!row.expanded) return
  setExpanded(
    state.value.expanded.filter((id) => id !== row.id),
    { node: row.node, expanded: false },
  )
}

function toggle(row: FlatTreeRow): void {
  if (!row.hasChildren) return
  if (row.expanded) collapse(row)
  else expand(row)
}

// -------------------------------------------------------------- lazy loading

async function runLoad(node: TreeNode): Promise<void> {
  const loader = props.load
  if (!loader) return
  state.value = applyLoadStart(state.value, node.id)
  emit('load-start', node)
  try {
    const children = await loader(node)
    state.value = applyLoadSuccess(state.value, node.id, Array.isArray(children) ? children : [])
    emit('load', node, Array.isArray(children) ? children : [])
  } catch (error) {
    // (a) back to "not loaded" so a retry is a fresh attempt, (b) tell the
    // application, (c) never swallow.
    state.value = applyLoadFailure(state.value, node.id)
    emit('load-error', { node, error })
  }
}

function retry(node: TreeNode): void {
  if (state.value.loading.includes(node.id)) return
  void runLoad(node)
}

// --------------------------------------------------------------- selection

function select(row: FlatTreeRow): void {
  if (row.disabled || props.selectionMode === 'none') return
  if (props.selectionMode === 'single') {
    if (!isSelectedControlled.value) internalSelection.value = [row.id]
    emit('update:selected', row.id)
  } else {
    const next = new Set(selectedSet.value)
    if (next.has(row.id)) next.delete(row.id)
    else next.add(row.id)
    internalSelection.value = [...next]
    emit('update:selectedMany', [...next])
  }
  emit('update:selected', row.id)
}

// -------------------------------------------------------------- interaction

function onRowClick(row: FlatTreeRow): void {
  activeId.value = row.id
  select(row)
  emit('activate', row.node)
}

function onTwistyClick(row: FlatTreeRow, event: MouseEvent): void {
  event.stopPropagation()
  activeId.value = row.id
  toggle(row)
}

function onKeydown(event: KeyboardEvent): void {
  const key = event.key
  if (key === 'Enter') {
    const row = rows.value.find((candidate) => candidate.id === activeId.value)
    if (row) {
      event.preventDefault()
      select(row)
      emit('activate', row.node)
    }
    return
  }
  if (key === ' ') {
    const row = rows.value.find((candidate) => candidate.id === activeId.value)
    if (row) {
      event.preventDefault()
      toggle(row)
    }
    return
  }
  if (key === 'Escape') {
    // Collapse the deepest expansions one level at a time, then close the
    // active row's highlight. This mirrors how menus handle Escape.
    const activeRow = rows.value.find((candidate) => candidate.id === activeId.value)
    if (activeRow?.parentId) {
      const parent = rows.value.find((candidate) => candidate.id === activeRow.parentId)
      if (parent) {
        event.preventDefault()
        collapse(parent)
        activeId.value = parent.id
      }
    }
    return
  }
  if (key === '*') {
    event.preventDefault()
    const all = expandableIds(props.nodes, state.value)
    setExpanded(all)
    return
  }

  const isNav =
    key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End'

  if (!isNav) {
    if (key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const query = buffer.push(key)
      const match = typeaheadTreeRowId(rows.value, query, activeId.value)
      if (match) {
        event.preventDefault()
        activeId.value = match
        void nextTick(() => focusRow(match))
      }
    }
    return
  }

  event.preventDefault()
  const result = navigateTree(key as TreeNavKey, rows.value, activeId.value)
  activeId.value = result.activeId
  const target = rows.value.find((row) => row.id === result.activeId) ?? null
  if (result.toggle && target) {
    if (result.toggle.expanded) expand(target)
    else collapse(target)
  }
  void nextTick(() => result.activeId && focusRow(result.activeId))
}

function focusRow(id: string): void {
  const nodes = root.value?.querySelectorAll<HTMLElement>('[data-jin-node-id]')
  nodes?.forEach((node) => {
    if (node.dataset["jinNodeId"] === id) node.focus()
  })
}

function isActive(row: FlatTreeRow): boolean {
  return activeId.value === row.id
}

function toneClass(row: FlatTreeRow): string | null {
  const tone: TreeTone = row.node.tone ?? 'default'
  return tone === 'default' ? null : `jin-tree__row--tone-${tone}`
}

function rowPadding(depth: number): string {
  return `calc(var(--jin-space-2, 8px) + ${depth} * ${props.indent} * var(--jin-space-4, 16px))`
}

// Expansion requested by the application (v-model:expanded) must also trigger
// lazy loads, otherwise a programmatic expand would show an empty branch.
watch(
  () => state.value.expanded,
  (ids) => {
    if (!props.load) return
    for (const id of ids) {
      const row = rows.value.find((candidate) => candidate.id === id)
      if (row && shouldLoad(row.node, state.value)) void runLoad(row.node)
    }
  },
)

// The roving tab stop lives on the active row, so one must exist whenever the
// tree has a selectable row: a null or stale id leaves every row at
// tabindex="-1" and the tree with no tab stop at all. Re-anchor only when the
// current row is gone (application replaced `nodes`, or mutated the array in
// place), and never reset a row that is still in the list.
watch(
  rows,
  (next) => {
    const current = activeId.value
    if (current !== null && next.some((row) => row.id === current)) return
    activeId.value = next.find((row) => !row.disabled)?.id ?? null
  },
  { immediate: true },
)

defineExpose({ rows, retry, expand, collapse })
</script>

<template>
  <div class="jin-tree" :aria-label="ariaLabel || undefined">
    <p v-if="rows.length === 0" class="jin-tree__empty">{{ emptyLabel || t('tree.empty') }}</p>

    <ul
      v-else
      ref="root"
      class="jin-tree__list"
      role="tree"
      tabindex="-1"
      :aria-label="ariaLabel || undefined"
      :aria-activedescendant="activeId ? `jin-tree-node-${activeId}` : undefined"
      :aria-multiselectable="selectionMode === 'multiple' ? 'true' : undefined"
      @keydown="onKeydown"
    >
      <li
        v-for="row in rows"
        :key="row.id"
        :id="`jin-tree-node-${row.id}`"
        :data-jin-node-id="row.id"
        class="jin-tree__row"
        :class="[
          toneClass(row),
          {
            'jin-tree__row--selected': isSelected(row),
            'jin-tree__row--active': isActive(row),
            'jin-tree__row--disabled': row.disabled,
            'jin-tree__row--failed': row.failed,
          },
        ]"
        :style="{ paddingLeft: rowPadding(row.depth) }"
        role="treeitem"
        :tabindex="isActive(row) ? 0 : -1"
        :aria-level="row.level"
        :aria-setsize="row.setsize"
        :aria-posinset="row.posinset"
        :aria-expanded="row.hasChildren ? (row.expanded ? 'true' : 'false') : undefined"
        :aria-selected="selectionMode === 'none' ? undefined : isSelected(row) ? 'true' : 'false'"
        :aria-busy="row.loading ? 'true' : undefined"
        :aria-disabled="row.disabled ? 'true' : undefined"
        @click="onRowClick(row)"
        @focus="activeId = row.id"
      >
        <!-- Twisty: shown when the row has (or may have) children. -->
        <button
          v-if="row.hasChildren"
          type="button"
          class="jin-tree__twisty"
          :class="{ 'jin-tree__twisty--expanded': row.expanded }"
          :tabindex="-1"
          :aria-label="row.expanded ? t('a11y.collapse') : t('a11y.expand')"
          :disabled="row.loading"
          @click="onTwistyClick(row, $event)"
        >
          <JinIcon name="chevron-right" :size="0.85" />
        </button>
        <span v-else class="jin-tree__twisty jin-tree__twisty--placeholder" aria-hidden="true" />

        <!-- The inline loading indicator appears on the row that is loading. -->
        <span v-if="row.loading" class="jin-tree__spinner" role="status" :aria-label="loadingLabel || t('a11y.loading')">
          <JinSpinner size="sm" />
        </span>

        <slot
          name="item"
          :node="row.node"
          :row="row"
          :depth="row.depth"
          :expanded="row.expanded"
          :loading="row.loading"
          :failed="row.failed"
          :selected="isSelected(row)"
        >
          <span class="jin-tree__label">{{ row.node.label }}</span>
        </slot>

        <span v-if="row.failed" class="jin-tree__error">
          <JinIcon name="warning" :size="0.85" />
          <span>{{ t('tree.loadFailed') }}</span>
          <button
            type="button"
            class="jin-button jin-button--link jin-button--sm jin-focus-ring"
            :disabled="row.loading"
            @click.stop="retry(row.node)"
          >
            <JinIcon name="refresh" :size="0.85" />
          </button>
        </span>
      </li>
    </ul>
  </div>
</template>
