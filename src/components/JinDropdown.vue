<script setup lang="ts">
/**
 * JinDropdown — a menu behind a trigger. Keyboard: Enter/Space/ArrowDown opens
 * and moves focus to the first item, Esc closes, focus returns to the trigger.
 */
import { computed, ref } from 'vue'
import JinPopover from './JinPopover.vue'
import JinMenu from './JinMenu.vue'
import type { MenuEntry } from '../core/menu'
import type { Placement } from '../core/types'

const props = withDefaults(
  defineProps<{
    items: MenuEntry[]
    placement?: Placement
    ariaLabel?: string
    disabled?: boolean
    /** Keep the menu open after choosing an item. */
    keepOpen?: boolean
    /** Declared but not implemented — the default trigger draws no chevron yet. */
    chevron?: boolean
  }>(),
  { placement: 'bottom-end', ariaLabel: '', disabled: false, keepOpen: false, chevron: true },
)

const emit = defineEmits<{
  (event: 'select', entry: MenuEntry): void
  (event: 'open'): void
  (event: 'close'): void
}>()

const open = ref(false)
const trigger = ref<HTMLElement | null>(null)
const menu = ref<InstanceType<typeof JinMenu> | null>(null)
const menuId = `jin-dropdown-${Math.random().toString(36).slice(2, 8)}`

function show(): void {
  if (props.disabled) return
  open.value = true
  emit('open')
}

function hide(): void {
  open.value = false
  emit('close')
  trigger.value?.focus()
}

function toggle(): void {
  if (open.value) hide()
  else show()
}

function onTriggerKeydown(event: KeyboardEvent): void {
  if (props.disabled) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!open.value) show()
  } else if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    hide()
  }
}

function onSelect(entry: MenuEntry): void {
  emit('select', entry)
  if (!props.keepOpen) hide()
}

function onClose(): void {
  hide()
}

const triggerAttrs = computed(() => ({
  'aria-haspopup': 'menu' as const,
  'aria-expanded': open.value ? ('true' as const) : ('false' as const),
  'aria-controls': open.value ? menuId : undefined,
}))
</script>

<template>
  <span class="jin-dropdown">
    <span
      ref="trigger"
      class="jin-dropdown__trigger"
      :class="{ 'jin-dropdown__trigger--disabled': props.disabled }"
      tabindex="0"
      v-bind="triggerAttrs"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      <slot name="trigger" :open="open" :toggle="toggle">
        <slot />
      </slot>
    </span>

    <JinPopover
      :model-value="open"
      :anchor="trigger"
      :placement="props.placement"
      :offset="4"
      lazy
      @update:model-value="(value: boolean) => (value ? show() : hide())"
    >
      <JinMenu
        :id="menuId"
        ref="menu"
        :items="props.items"
        :aria-label="props.ariaLabel"
        @select="onSelect"
        @close="onClose"
      />
    </JinPopover>
  </span>
</template>
