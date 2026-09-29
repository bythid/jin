<script setup lang="ts">
/**
 * JinLink — an inline anchor that can hand navigation to the host instead of
 * the browser (desktop shells usually want `openExternal`).
 */
import JinIcon from './JinIcon.vue'
import { useCapabilities } from '../injection/provide-capabilities'

const props = withDefaults(
  defineProps<{
    href?: string
    /** Opens through the host's openExternal capability when available. */
    external?: boolean
    /** De-emphasised link. */
    muted?: boolean
    disabled?: boolean
  }>(),
  { href: '', external: false, muted: false, disabled: false },
)

const capabilities = useCapabilities()

async function onClick(event: MouseEvent): Promise<void> {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  if (!props.external) return
  const open = capabilities.openExternal
  if (!open || !props.href) return
  event.preventDefault()
  await open(props.href)
}
</script>

<template>
  <a
    class="jin-link"
    :class="{ 'jin-link--muted': props.muted, 'jin-link--external': props.external }"
    :href="props.href || undefined"
    :target="props.external && !capabilities.openExternal ? '_blank' : undefined"
    :rel="props.external ? 'noreferrer noopener' : undefined"
    :aria-disabled="props.disabled ? 'true' : undefined"
    :tabindex="props.disabled ? -1 : undefined"
    @click="onClick"
  >
    <slot />
    <JinIcon v-if="props.external" class="jin-link__icon" name="external" :size="0.85" />
  </a>
</template>
