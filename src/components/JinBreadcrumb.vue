<script setup lang="ts">
/**
 * JinBreadcrumb — nav landmark with an ordered list, separators drawn from a
 * slot, and the last item marked as current.
 */
import { useT } from '../composables/useT'

export interface BreadcrumbItem {
  label: string
  /** Rendered as a link when present. */
  href?: string
  /** Click handler; prevents navigation when `href` is absent. */
  onClick?: () => void
  current?: boolean
}

withDefaults(
  defineProps<{
    items: BreadcrumbItem[]
    ariaLabel?: string
    /** Max items before the middle collapses behind an ellipsis. */
    maxItems?: number
  }>(),
  { ariaLabel: '', maxItems: 0 },
)

const { t } = useT()
</script>

<template>
  <nav class="jin-breadcrumb" :aria-label="ariaLabel || t('a11y.breadcrumb')">
    <ol class="jin-breadcrumb__list">
      <li v-for="(item, index) in items" :key="`${index}-${item.label}`" class="jin-breadcrumb__item">
        <a
          v-if="item.href && !item.current"
          class="jin-breadcrumb__link"
          :href="item.href"
          @click="item.onClick?.()"
        >
          {{ item.label }}
        </a>
        <button
          v-else-if="item.onClick && !item.current"
          type="button"
          class="jin-breadcrumb__link jin-button jin-button--link jin-focus-ring"
          @click="item.onClick()"
        >
          {{ item.label }}
        </button>
        <span
          v-else
          class="jin-breadcrumb__current"
          :aria-current="item.current || index === items.length - 1 ? 'page' : undefined"
        >
          {{ item.label }}
        </span>

        <span v-if="index < items.length - 1" class="jin-breadcrumb__separator" aria-hidden="true">
          <slot name="separator">/</slot>
        </span>
      </li>
    </ol>
  </nav>
</template>
