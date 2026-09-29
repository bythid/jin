<script setup lang="ts">
/**
 * JinNav — a landmark navigation list.
 * It is deliberately presentational: items describe labels and icons, the
 * application decides what "current" means and what happens on activation.
 *
 * Nested `items` render as an indented sub-list. The template refers to
 * `<JinNav>` for recursion: Vue resolves that to this same component through
 * its filename, so no circular import is needed.
 */
import JinIcon from './JinIcon.vue'
import type { IconName } from './icon-paths'
import { useT } from '../composables/useT'

export interface NavItem {
  id: string
  label: string
  icon?: IconName
  href?: string
  badge?: string
  disabled?: boolean
  /** Nested items; rendered as an indented sub-list. */
  items?: NavItem[]
}

withDefaults(
  defineProps<{
    items: NavItem[]
    /** Id of the current item; marked with aria-current. */
    current?: string | null
    ariaLabel?: string
    orientation?: 'vertical' | 'horizontal'
  }>(),
  { current: null, ariaLabel: '', orientation: 'vertical' },
)

const emit = defineEmits<{
  (event: 'select', item: NavItem): void
}>()

const { t } = useT()

function activate(item: NavItem, event: MouseEvent): void {
  if (item.disabled) {
    event.preventDefault()
    return
  }
  emit('select', item)
}
</script>

<template>
  <nav class="jin-nav" :class="`jin-nav--${orientation}`" :aria-label="ariaLabel || t('a11y.navigation')">
    <ul class="jin-nav__list">
      <li v-for="item in items" :key="item.id">
        <a
          v-if="item.href && !item.disabled"
          class="jin-nav__item"
          :class="{ 'jin-nav__item--current': item.id === current }"
          :href="item.href"
          :aria-current="item.id === current ? 'page' : undefined"
          @click="activate(item, $event)"
        >
          <JinIcon v-if="item.icon" :name="item.icon" />
          <span class="jin-nav__label">{{ item.label }}</span>
          <span v-if="item.badge" class="jin-badge jin-badge--neutral">{{ item.badge }}</span>
        </a>
        <button
          v-else
          type="button"
          class="jin-nav__item"
          :class="{ 'jin-nav__item--current': item.id === current }"
          :aria-current="item.id === current ? 'page' : undefined"
          :disabled="item.disabled"
          @click="activate(item, $event)"
        >
          <JinIcon v-if="item.icon" :name="item.icon" />
          <span class="jin-nav__label">{{ item.label }}</span>
          <span v-if="item.badge" class="jin-badge jin-badge--neutral">{{ item.badge }}</span>
        </button>

        <JinNav
          v-if="item.items && item.items.length > 0"
          class="jin-nav--nested"
          :items="item.items"
          :current="current"
          :aria-label="item.label"
          orientation="vertical"
          @select="emit('select', $event)"
        />
      </li>
    </ul>
  </nav>
</template>
