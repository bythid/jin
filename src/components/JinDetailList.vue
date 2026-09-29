<script setup lang="ts">
/**
 * JinDetailList — a key/value table, the shape a properties panel needs.
 * It renders a real <dl>, so the label/value relationship survives without
 * any aria plumbing.
 */
export interface DetailItem {
  key: string
  label: string
  /** Plain value; ignored when the #value slot handles this key. */
  value?: string | number | null
  /** Hides the row entirely (e.g. a permission the user lacks). */
  hidden?: boolean
}

withDefaults(
  defineProps<{
    items: DetailItem[]
    /** Bordered container with alternating rows. */
    bordered?: boolean
    striped?: boolean
    /** Tighter padding for a side panel. */
    compact?: boolean
    /** Placeholder for null / undefined values. */
    emptyText?: string
  }>(),
  { bordered: true, striped: false, compact: false, emptyText: '—' },
)

function display(value: DetailItem['value'], emptyText: string): string {
  if (value === null || value === undefined || value === '') return emptyText
  return String(value)
}
</script>

<template>
  <dl
    class="jin-detail-list"
    :class="{
      'jin-detail-list--bordered': bordered,
      'jin-detail-list--striped': striped,
      'jin-detail-list--compact': compact,
    }"
  >
    <template v-for="item in items" :key="item.key">
      <div v-if="!item.hidden" class="jin-detail-list__row" style="display: contents">
        <dt class="jin-detail-list__term">{{ item.label }}</dt>
        <dd class="jin-detail-list__value">
          <slot name="value" :item="item">{{ display(item.value, emptyText) }}</slot>
        </dd>
      </div>
    </template>
  </dl>
</template>
