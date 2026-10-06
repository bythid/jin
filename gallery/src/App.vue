<script setup lang="ts">
/**
 * The Gallery shell.
 *
 * Requirement 1 is that the Gallery is built from the library's own components:
 * the navigation, the three switchers, the dropdown, the modals, the tooltips
 * and every message on this page come from `@bythid/jin`. Where a native
 * element would have been easier, the library component is used on purpose —
 * this is the strongest test the library has.
 *
 * Every string here comes from the dictionary, and the language switcher is
 * what makes the library's own strings follow: the translation passed to
 * `JinUI` is the same dictionary (see src/i18n).
 */
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  JinAlert,
  JinButton,
  JinDivider,
  JinDrawer,
  JinDropdown,
  JinIcon,
  JinNav,
  JinNotificationRegion,
  JinSelect,
  JinSwitch,
  JinToastRegion,
  JinTooltip,
  useNotifications,
  useTheme,
  useToasts,
  type MenuEntry,
  type NavItem,
} from '@bythid/jin'
import { AVAILABLE_STYLES } from './host/preferences'
import { getCapabilities } from './host/capabilities'
import { LOCALES, useI18n, type GalleryLocale } from './i18n'
import TokenPanel from './panels/TokenPanel.vue'
import { PAGES } from './pages/registry'

const i18n = useI18n()
const t = i18n.t
const theme = useTheme()
const toasts = useToasts()
const notifications = useNotifications()
const capabilities = getCapabilities()

// The top nav lists pages only. A page's sections appear in the section list
// below it, so they are not repeated as nested rows here.
const navItems = computed<NavItem[]>(() => [
  { id: 'tokens', label: t('app.nav.tokens'), icon: 'sparkle', badge: t('app.nav.live') },
  ...PAGES.map<NavItem>((page) => ({
    id: page.id,
    label: t(page.labelKey),
    icon: page.icon,
  })),
])

const current = ref<string>('tokens')
const currentPage = computed(() => PAGES.find((page) => page.id === current.value) ?? null)
// Which section of the current page is highlighted, if any.
const activeChild = ref<string | null>(null)

function selectItem(item: { id: string }): void {
  activeChild.value = null
  current.value = item.id
}

function selectChild(pageId: string, childId: string): void {
  current.value = pageId
  activeChild.value = childId
  // The section rows are jump links: bring the tagged section into view. On a
  // page switch the section mounts with the new page, so the lookup waits a
  // tick for the DOM to settle.
  //
  // Scrolled directly on the main column, never via the target's
  // scrollIntoView(): that walks every ancestor scroll container, and this
  // shell has one — .gallery-root is overflow:hidden but carries thousands of
  // pixels of scrollable overflow from the page content, so scrollIntoView
  // scrolled the header row out of view (fixed only by the clamping that
  // happens on the next page switch).
  void nextTick(() => {
    const main = document.querySelector('.gallery-main')
    const target = document.getElementById(childId)
    if (!main || !target) return
    const delta = target.getBoundingClientRect().top - main.getBoundingClientRect().top
    const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    main.scrollTo({ top: main.scrollTop + delta - margin, behavior: reduced ? 'auto' : 'smooth' })
  })
}

const styleOptions = computed(() =>
  AVAILABLE_STYLES.map((entry) => ({ value: entry.id, label: t(entry.labelKey) })),
)
const styleNote = computed(() => {
  const entry = AVAILABLE_STYLES.find((candidate) => candidate.id === theme.style.value)
  return entry ? t(entry.noteKey) : ''
})

const languageOptions = LOCALES.map((entry) => ({ value: entry.id, label: entry.label }))

const aboutOpen = ref(false)
const shortcutsOpen = ref(false)

const headerMenu = computed<MenuEntry[]>(() => [
  { id: 'about', label: t('app.menu.about'), keywords: t('app.menu.aboutKeywords') },
  { id: 'shortcuts', label: t('app.menu.shortcuts'), shortcut: '?' },
  { id: 'sep-1', type: 'separator' },
  { id: 'tokens', label: t('app.nav.tokens'), disabled: current.value === 'tokens' },
  {
    id: 'theme-toggle',
    label: t(theme.mode.value === 'dark' ? 'app.menu.switchToLight' : 'app.menu.switchToDark'),
  },
  { id: 'sep-2', type: 'separator' },
  { id: 'reset-demo', label: t('app.menu.reset'), danger: true },
])

function onHeaderMenu(entry: MenuEntry): void {
  switch (entry.id) {
    case 'about':
      aboutOpen.value = true
      return
    case 'shortcuts':
      shortcutsOpen.value = true
      return
    case 'tokens':
      current.value = 'tokens'
      return
    case 'theme-toggle':
      theme.toggleMode()
      return
    case 'reset-demo':
      resetDemo()
      return
  }
}

function resetDemo(): void {
  toasts.clear()
  notifications.clear()
  theme.setStyle('jin')
  theme.setMode('dark')
  toasts.push({
    tone: 'success',
    title: t('app.toast.resetTitle'),
    description: t('app.toast.resetDescription'),
  })
}

// Keyboard notation is not translated: the keys on a keyboard are the same
// everywhere, and a reader maps this column to their own hands.
const shortcuts = computed(() => [
  { keys: 'Tab / Shift+Tab', what: t('app.shortcuts.moveBetween') },
  { keys: '← → ↑ ↓', what: t('app.shortcuts.moveInside') },
  { keys: 'Home / End', what: t('app.shortcuts.homeEnd') },
  { keys: 'Enter / Space', what: t('app.shortcuts.activate') },
  { keys: 'Esc', what: t('app.shortcuts.escape') },
  { keys: 'Type-ahead', what: t('app.shortcuts.typeahead') },
  { keys: 'Shift+F10 / Menu', what: t('app.shortcuts.contextMenu') },
  { keys: 'Tab', what: t('app.shortcuts.tabInDialog') },
])

function announceStyle(): void {
  const entry = AVAILABLE_STYLES.find((candidate) => candidate.id === theme.style.value)
  const label = entry ? t(entry.labelKey) : theme.style.value
  toasts.push({
    tone: 'info',
    title: `${label} · ${t(theme.mode.value === 'dark' ? 'app.mode.dark' : 'app.mode.light')}`,
    duration: 2200,
  })
}

const portalHint = computed(() =>
  capabilities.isDesktop ? t('app.toast.folderPickerAvailable') : t('app.toast.folderPickerUnavailable'),
)

onMounted(() => {
  if (!capabilities.isDesktop) return
  toasts.push({
    tone: 'neutral',
    title: t('app.toast.desktopTitle'),
    description: portalHint.value,
    duration: 3500,
  })
})
</script>

<template>
  <div class="gallery-root">
    <div class="gallery-shell">
      <header class="gallery-header">
        <div class="gallery-brand">
          <span class="gallery-brand__name">Jin · 锦</span>
          <span class="gallery-brand__sub">{{ t('app.brand.sub') }}</span>
        </div>

        <div class="gallery-header__spacer" />

        <div class="gallery-header__controls">
          <div class="gallery-control">
            <span class="gallery-control__label">{{ t('app.control.style') }}</span>
            <JinSelect
              :model-value="theme.style.value"
              :options="styleOptions"
              size="sm"
              :block="false"
              :aria-label="t('app.control.styleAria')"
              @update:model-value="(value: string | null) => { theme.setStyle(value ?? 'jin'); announceStyle() }"
            />
          </div>

          <div class="gallery-control">
            <span class="gallery-control__label">{{ t('app.control.mode') }}</span>
            <JinSwitch
              :model-value="theme.mode.value === 'dark'"
              size="sm"
              :aria-label="t('app.control.modeAria')"
              @update:model-value="(value: boolean) => { theme.setMode(value ? 'dark' : 'light'); announceStyle() }"
            />
          </div>

          <div class="gallery-control">
            <span class="gallery-control__label">{{ t('app.control.language') }}</span>
            <JinSelect
              :model-value="i18n.locale.value"
              :options="languageOptions"
              size="sm"
              :block="false"
              :aria-label="t('app.control.languageAria')"
              @update:model-value="(value: string | null) => i18n.setLocale((value ?? 'en') as GalleryLocale)"
            />
          </div>

          <JinTooltip :content="t('app.control.resetTooltip')" placement="bottom">
            <JinButton variant="ghost" size="sm" icon :label="t('app.control.reset')" @click="resetDemo">
              <template #icon><JinIcon name="refresh" /></template>
            </JinButton>
          </JinTooltip>

          <JinDropdown :items="headerMenu" :aria-label="t('app.control.menuAria')" @select="onHeaderMenu">
            <template #trigger>
              <JinButton variant="secondary" size="sm">
                <template #icon><JinIcon name="menu" /></template>
                {{ t('app.control.menu') }}
              </JinButton>
            </template>
          </JinDropdown>
        </div>
      </header>

      <aside class="gallery-sidebar">
        <JinNav :items="navItems" :current="current" :aria-label="t('app.nav.aria')" @select="selectItem" />

        <template v-if="currentPage?.children">
          <JinDivider spaced />
          <p class="gallery-sidebar__group-title">
            {{ t('app.nav.sections', { page: t(currentPage.labelKey) }) }}
          </p>
          <JinNav
            :items="currentPage.children.map((child) => ({ id: child.id, label: t(child.labelKey) }))"
            :current="activeChild"
            :aria-label="t('app.nav.sections', { page: t(currentPage.labelKey) })"
            @select="(item) => selectChild(currentPage!.id, item.id)"
          />
        </template>
      </aside>

      <main class="gallery-main">
        <TokenPanel v-if="current === 'tokens'" />
        <component
          :is="currentPage!.component"
          v-else-if="currentPage"
          :key="currentPage.id"
          :section="activeChild"
        />
      </main>
    </div>

    <!-- Both regions are part of the page, not of any single control. -->
    <JinToastRegion />
    <JinNotificationRegion />

    <JinDrawer v-model="aboutOpen" :title="t('app.menu.about')" side="right" size="md">
      <div class="gallery-grid">
        <p>{{ t('app.about.p1') }}</p>
        <p>{{ t('app.about.p2') }}</p>
        <JinDivider :label="t('app.about.contract')" />
        <ul class="gallery-mono">
          <li>
            {{ t('app.about.contract.tokens') }} <code>--jin-*</code> ·
            {{ t('app.about.contract.classes') }} <code>jin-*</code> ·
            {{ t('app.about.contract.components') }} <code>Jin*</code>
          </li>
          <li>
            {{ t('app.about.contract.styleAxis') }} <code>data-jin-style</code> ·
            {{ t('app.about.contract.modeAxis') }} <code>data-jin-mode</code>
          </li>
          <li>{{ t('app.about.contract.portal') }}</li>
        </ul>
      </div>
    </JinDrawer>

    <JinDrawer v-model="shortcutsOpen" :title="t('app.shortcuts.title')" side="right" size="lg">
      <div class="gallery-grid">
        <JinAlert
          tone="info"
          :title="t('app.shortcuts.alertTitle')"
          :description="t('app.shortcuts.alertDescription')"
        />
        <div class="gallery-grid">
          <div v-for="entry in shortcuts" :key="entry.keys" class="gallery-list-row">
            <span class="gallery-mono" style="min-width: 160px">{{ entry.keys }}</span>
            <span class="gallery-muted">{{ entry.what }}</span>
          </div>
        </div>
        <JinDivider :label="t('app.shortcuts.focus')" />
        <p>{{ t('app.shortcuts.focusText') }}</p>
      </div>
    </JinDrawer>
  </div>
</template>
