<script setup lang="ts">
/**
 * JinMenu — a flat, keyboard-driven row list. One implementation serves the
 * dropdown menu, the context menu, and submenus: those two components wrap it
 * in a popover, they do not re-solve navigation.
 *
 * All navigation decisions come from core/menu.ts.
 */
import { computed, nextTick, ref, watch } from 'vue'
import JinIcon from './JinIcon.vue'
import {
  flattenMenu,
  menuNavigate,
  typeaheadRowId,
  type FlatMenuEntry,
  type MenuEntry,
} from '../core/menu'
import { createTypeaheadBuffer } from '../core/roving'

const props = withDefaults(
  defineProps<{
    items: MenuEntry[]
    ariaLabel?: string
    /** Autofocus the menu when it appears. */
    autofocus?: boolean
    /** Close the whole menu after an item activates. */
    closeOnSelect?: boolean
    /** RTL flips the submenu arrow keys. */
    rtl?: boolean
  }>(),
  { ariaLabel: '', autofocus: true, closeOnSelect: true, rtl: false },
)

const emit = defineEmits<{
  (event: 'select', entry: MenuEntry): void
  (event: 'open-change', entry: MenuEntry, open: boolean): void
  (event: 'close'): void
}>()

const openPath = ref<string[]>([])
const activeId = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)
const buffer = createTypeaheadBuffer()

const rows = computed(() => flattenMenu(props.items, openPath.value))
const idPrefix = ref(`jin-menu-${Math.random().toString(36).slice(2, 8)}`)
const activedescendant = computed(() => (activeId.value ? `${idPrefix.value}-${activeId.value}` : undefined))

function firstSelectable(): string | null {
  return rows.value.find((row) => !row.disabled && row.type === 'item')?.id ?? null
}

function focusActive(): void {
  void nextTick(() => {
    const id = activeId.value
    if (!id) return
    // Find by dataset instead of a CSS selector, so ids need no escaping.
    const nodes = root.value?.querySelectorAll<HTMLElement>('[data-jin-row-id]')
    nodes?.forEach((node) => {
      if (node.dataset["jinRowId"] === id) node.focus()
    })
  })
}

watch(
  rows,
  () => {
    if (activeId.value && !rows.value.some((row) => row.id === activeId.value)) {
      activeId.value = firstSelectable()
    }
  },
  { flush: 'post' },
)

function onKeydown(event: KeyboardEvent): void {
  const action = menuNavigate(event.key, rows.value, activeId.value, openPath.value, { rtl: props.rtl })
  switch (action.type) {
    case 'move':
      event.preventDefault()
      activeId.value = action.toId
      focusActive()
      return
    case 'open-submenu': {
      event.preventDefault()
      openSubmenu(action.id)
      return
    }
    case 'close-submenu': {
      event.preventDefault()
      closeSubmenu(action.id)
      return
    }
    case 'activate': {
      event.preventDefault()
      activate(action.id)
      return
    }
    case 'close-all': {
      event.preventDefault()
      if (openPath.value.length > 0) {
        closeSubmenu(openPath.value[openPath.value.length - 1] ?? '')
      } else {
        emit('close')
      }
      return
    }
    default:
      break
  }

  if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
    const query = buffer.push(event.key)
    const match = typeaheadRowId(rows.value, query, activeId.value)
    if (match) {
      event.preventDefault()
      activeId.value = match
      focusActive()
    }
  }
}

function openSubmenu(id: string): void {
  if (openPath.value.includes(id)) return
  openPath.value = [...openPath.value, id]
  const entry = rows.value.find((row) => row.id === id)?.entry
  if (entry) emit('open-change', entry, true)
  const child = rows.value.find((row) => row.parentId === id && !row.disabled && row.type === 'item')
  if (child) {
    activeId.value = child.id
    focusActive()
  }
}

function closeSubmenu(id: string): void {
  const index = openPath.value.indexOf(id)
  if (index === -1) return
  const entry = rows.value.find((row) => row.id === id)?.entry
  openPath.value = openPath.value.slice(0, index)
  if (entry) emit('open-change', entry, false)
  activeId.value = id
  focusActive()
}

function activate(id: string): void {
  const row: FlatMenuEntry | undefined = rows.value.find((candidate) => candidate.id === id)
  if (!row || row.disabled || row.type !== 'item') return
  emit('select', row.entry)
  if (props.closeOnSelect) emit('close')
}

function onPointerEnter(row: FlatMenuEntry): void {
  if (row.disabled) return
  activeId.value = row.id
}

function rowClasses(row: FlatMenuEntry): Record<string, boolean> {
  return {
    'jin-menu__row--active': row.id === activeId.value,
    'jin-menu__row--disabled': row.disabled,
    'jin-menu__row--danger': row.entry.danger === true,
  }
}

if (props.autofocus) {
  activeId.value = firstSelectable()
  void nextTick(() => root.value?.focus())
}

defineExpose({ focusFirst: () => { activeId.value = firstSelectable(); root.value?.focus() }, rows })
</script>

<template>
  <ul
    ref="root"
    class="jin-menu"
    :class="{ 'jin-menu--rtl': props.rtl }"
    role="menu"
    tabindex="-1"
    :aria-label="props.ariaLabel || undefined"
    :aria-activedescendant="activedescendant"
    @keydown="onKeydown"
  >
    <template v-for="row in rows" :key="row.id">
      <li v-if="row.type === 'separator'" class="jin-menu__separator" role="separator" />
      <li v-else-if="row.type === 'label'" class="jin-menu__group-label" role="presentation">
        {{ row.entry.label }}
      </li>
      <li
        v-else
        :id="`${idPrefix}-${row.id}`"
        :data-jin-row-id="row.id"
        class="jin-menu__row"
        :class="rowClasses(row)"
        :style="{ paddingLeft: `calc(var(--jin-space-3, 12px) + ${row.depth} * var(--jin-space-4, 16px))` }"
        role="menuitem"
        :tabindex="row.id === activeId ? 0 : -1"
        :aria-disabled="row.disabled ? 'true' : undefined"
        :aria-haspopup="row.hasSubmenu ? 'menu' : undefined"
        :aria-expanded="row.hasSubmenu ? (openPath.includes(row.id) ? 'true' : 'false') : undefined"
        :aria-checked="row.entry.checked === undefined ? undefined : row.entry.checked ? 'true' : 'false'"
        :aria-keyshortcuts="row.entry.shortcut || undefined"
        @pointerenter="onPointerEnter(row)"
        @click="activate(row.id)"
      >
        <span v-if="row.entry.checked !== undefined" class="jin-menu__check" aria-hidden="true">
          <JinIcon v-if="row.entry.checked" name="check" :size="0.9" />
        </span>
        <slot name="item" :entry="row.entry" :row="row">
          <span class="jin-menu__label">{{ row.entry.label }}</span>
        </slot>
        <span v-if="row.entry.shortcut" class="jin-menu__shortcut" aria-hidden="true">{{ row.entry.shortcut }}</span>
        <JinIcon
          v-if="row.hasSubmenu"
          name="chevron-right"
          class="jin-menu__submenu-indicator"
          :class="{ 'jin-menu__submenu-indicator--rtl': props.rtl }"
          aria-hidden="true"
        />
      </li>
    </template>
  </ul>
</template>
