<script setup lang="ts">
/**
 * JinCard — surface container: heading, body, footer, and an optional
 * interactive (clickable) variant that keeps full keyboard semantics.
 */
withDefaults(
  defineProps<{
    title?: string
    description?: string
    /** `raised` lifts the surface, `flat` removes the shadow. */
    elevation?: 'flat' | 'base' | 'raised'
    /** Whole card becomes an actionable, focusable surface. */
    interactive?: boolean
    ariaLabel?: string
  }>(),
  { title: '', description: '', elevation: 'base', interactive: false, ariaLabel: '' },
)

const emit = defineEmits<{ (event: 'activate'): void }>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('activate')
  }
}
</script>

<template>
  <div
    class="jin-card"
    :class="[`jin-card--${elevation}`, { 'jin-card--interactive': interactive }]"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="interactive ? ariaLabel || title || undefined : undefined"
    @click="interactive && emit('activate')"
    @keydown="interactive && onKeydown($event)"
  >
    <header v-if="title || description || $slots.header" class="jin-card__header">
      <div class="jin-card__heading">
        <slot name="header">
          <p v-if="title" class="jin-card__title">{{ title }}</p>
          <p v-if="description" class="jin-card__description">{{ description }}</p>
        </slot>
      </div>
      <slot name="actions" />
    </header>

    <div v-if="$slots.default" class="jin-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="jin-card__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>
