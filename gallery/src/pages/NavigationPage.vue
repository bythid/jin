<script setup lang="ts">
/**
 * Navigation and structure catalogue: tabs, menu, dropdown, context menu,
 * breadcrumb, divider, card, toolbar, nav.
 *
 * The demo data below is declared as keys and translated in `computed`s: every
 * one of these lists is rendered by a library control, so a language switch has
 * to reach the items that are already open.
 */
import { computed, ref } from 'vue'
import {
  JinAlert,
  JinBadge,
  JinBreadcrumb,
  JinButton,
  JinCard,
  JinContextMenu,
  JinDivider,
  JinDropdown,
  JinIcon,
  JinMenu,
  JinNav,
  JinSelect,
  JinSwitch,
  JinTabs,
  JinTag,
  JinTextField,
  JinToolbar,
  JinTooltip,
  type MenuEntry,
  type NavItem,
  type TabItem,
  type TranslateVars,
} from '@bythid/jin'
import { DemoPage, DemoSection } from '../demo/DemoSection'
import { useI18n } from '../i18n'

defineProps<{ section?: string | null }>()

const { t } = useI18n()

// ------------------------------------------------------------------- tabs
const tab = ref<string | null>('overview')
const verticalTab = ref<string | null>('a')
const manualTab = ref<string | null>('one')
const nestedTab = ref<string | null>('files')

const tabs = computed<TabItem[]>(() => [
  { value: 'overview', label: t('navigation.tabs.overview') },
  { value: 'activity', label: t('navigation.tabs.activity'), badge: '3' },
  { value: 'settings', label: t('navigation.tabs.settings') },
  { value: 'archived', label: t('navigation.tabs.archived'), disabled: true },
])

const manyTabs = computed<TabItem[]>(() => [
  { value: 'a', label: t('navigation.tabs.alpha') },
  { value: 'b', label: t('navigation.tabs.beta') },
  { value: 'c', label: t('navigation.tabs.gamma') },
  { value: 'd', label: t('navigation.tabs.delta') },
])

const manualTabs = computed<TabItem[]>(() => [
  { value: 'one', label: t('navigation.tabs.first') },
  { value: 'two', label: t('navigation.tabs.second') },
])

const nestedTabs = computed<TabItem[]>(() => [
  { value: 'files', label: t('navigation.tabs.files') },
  { value: 'history', label: t('navigation.tabs.history') },
])

// ------------------------------------------------------------------- menu
const menuItems = computed<MenuEntry[]>(() => [
  { id: 'new', label: t('navigation.menu.newItem'), shortcut: 'Ctrl+N' },
  { id: 'open', label: t('navigation.menu.open'), shortcut: 'Ctrl+O' },
  {
    id: 'recent',
    label: t('navigation.menu.openRecent'),
    items: [
      { id: 'r1', label: 'notes.md' },
      { id: 'r2', label: 'report.csv' },
      { id: 'sep-inner', type: 'separator' },
      { id: 'r-clear', label: t('navigation.menu.clearList'), danger: true },
    ],
  },
  { id: 'sep-1', type: 'separator' },
  { id: 'view', label: t('navigation.menu.showSidebar'), checked: true },
  { id: 'wrap', label: t('navigation.menu.wordWrap'), checked: false },
  { id: 'sep-2', type: 'separator' },
  { id: 'group-export', type: 'label', label: t('navigation.menu.export') },
  { id: 'export-pdf', label: t('navigation.menu.asPdf'), keywords: t('navigation.menu.asPdfKeywords') },
  { id: 'export-csv', label: t('navigation.menu.asCsv'), keywords: t('navigation.menu.asCsvKeywords') },
  { id: 'sep-3', type: 'separator' },
  { id: 'duplicate', label: t('navigation.menu.duplicate'), disabled: true },
  { id: 'delete', label: t('common.delete'), danger: true },
])

const menuEvents = ref<{ key: string; vars?: TranslateVars }[]>([])
const menuEventText = computed(() => menuEvents.value.map((entry) => t(entry.key, entry.vars)).join(' · '))

function pushMenuEvent(entry: { key: string; vars?: TranslateVars }): void {
  menuEvents.value = [entry, ...menuEvents.value].slice(0, 5)
}

function onMenuSelect(entry: MenuEntry): void {
  pushMenuEvent({ key: 'navigation.menu.selected', vars: { label: entry.label ?? entry.id } })
}

// --------------------------------------------------------------- dropdown
const dropdownValue = ref<string | null>('fold')

const dropdownItems = computed<MenuEntry[]>(() => [
  { id: 'fold', label: t('overlays.drawer.kindFolded'), checked: dropdownValue.value === 'fold' },
  { id: 'normal', label: t('forms.radio.optionNormal'), checked: dropdownValue.value === 'normal' },
  { id: 'hide', label: t('overlays.drawer.kindHidden'), checked: dropdownValue.value === 'hide' },
  { id: 'sep', type: 'separator' },
  { id: 'configure', label: t('navigation.dropdown.configure') },
])

function onDropdownSelect(entry: MenuEntry): void {
  if (['fold', 'normal', 'hide'].includes(entry.id)) {
    dropdownValue.value = entry.id
    return
  }
  pushMenuEvent({ key: 'navigation.dropdown.log', vars: { label: entry.label ?? entry.id } })
}

const dropdownDisplay = computed(() => {
  switch (dropdownValue.value) {
    case 'fold':
      return t('overlays.drawer.kindFolded')
    case 'hide':
      return t('overlays.drawer.kindHidden')
    default:
      return t('forms.radio.optionNormal')
  }
})

// ----------------------------------------------------------- context menu
const contextItems = computed<MenuEntry[]>(() => [
  { id: 'rename', label: t('navigation.context.rename'), shortcut: 'F2' },
  { id: 'duplicate', label: t('navigation.menu.duplicate'), shortcut: 'Ctrl+D' },
  { id: 'sep', type: 'separator' },
  { id: 'reveal', label: t('navigation.context.reveal') },
  { id: 'sep-2', type: 'separator' },
  { id: 'remove', label: t('navigation.context.remove'), danger: true },
])

// -------------------------------------------------------------- breadcrumb
const crumbs = computed(() => [
  { label: t('navigation.breadcrumb.home'), onClick: () => undefined },
  { label: t('navigation.breadcrumb.collections'), onClick: () => undefined },
  { label: t('navigation.breadcrumb.fieldNotes'), onClick: () => undefined },
  { label: t('navigation.breadcrumb.currentEntry'), current: true },
])

const crumbsWithHref = computed(() => [
  { label: t('navigation.breadcrumb.projects'), href: '#projects' },
  { label: t('navigation.breadcrumb.alpha'), href: '#alpha' },
  { label: t('navigation.breadcrumb.details') },
])

// -------------------------------------------------------------------- nav
const navItems = computed<NavItem[]>(() => [
  { id: 'home', label: t('navigation.nav.home'), icon: 'home' },
  { id: 'files', label: t('navigation.nav.files'), icon: 'folder', badge: '12' },
  { id: 'search', label: t('navigation.nav.search'), icon: 'search' },
  {
    id: 'settings',
    label: t('navigation.nav.settings'),
    icon: 'settings',
    items: [
      { id: 'appearance', label: t('navigation.nav.appearance') },
      { id: 'shortcuts', label: t('navigation.nav.shortcuts') },
    ],
  },
  { id: 'trash', label: t('navigation.nav.trash'), icon: 'trash', disabled: true },
])
const navCurrent = ref('files')
const navCurrentLabel = computed(
  () => navItems.value.find((item) => item.id === navCurrent.value)?.label ?? navCurrent.value,
)

// ---------------------------------------------------------------- toolbar
const bold = ref(true)
const italic = ref(false)
const toolbarLast = ref('')

function toolbarAction(labelKey: string): void {
  toolbarLast.value = labelKey
}

// ------------------------------------------------------------------- card
const cardClicks = ref(0)
</script>

<template>
  <DemoPage :title="t('navigation.title')" :lead="t('navigation.lead')">
    <DemoSection id="tabs" :title="t('navigation.tabs.title')" :note="t('navigation.tabs.note')" stacked>
      <JinTabs v-model="tab" :items="tabs" :aria-label="t('navigation.tabs.aria')">
        <template #overview>
          <p class="gallery-muted">{{ t('navigation.tabs.overviewPanel') }}</p>
        </template>
        <template #activity>
          <p class="gallery-muted">{{ t('navigation.tabs.activityPanel') }}</p>
        </template>
        <template #settings>
          <p class="gallery-muted">{{ t('navigation.tabs.settingsPanel') }}</p>
        </template>
      </JinTabs>

      <JinDivider spaced />

      <div class="gallery-grid gallery-grid--two">
        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('navigation.tabs.vertical') }}
          </p>
          <JinTabs
            v-model="verticalTab"
            :items="manyTabs"
            orientation="vertical"
            :aria-label="t('navigation.tabs.verticalAria')"
          >
            <template #panel="{ item }">
              <p class="gallery-muted">{{ t('navigation.tabs.contentFor', { label: item.label }) }}</p>
            </template>
          </JinTabs>
        </div>

        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('navigation.tabs.manual') }}
          </p>
          <JinTabs
            v-model="manualTab"
            :items="manualTabs"
            activation="manual"
            :aria-label="t('navigation.tabs.manualAria')"
          >
            <template #panel="{ item }">
              <p class="gallery-muted">{{ t('navigation.tabs.selected', { label: item.label }) }}</p>
            </template>
          </JinTabs>
        </div>

        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('navigation.tabs.growing') }}
          </p>
          <JinTabs
            v-model="nestedTab"
            :items="nestedTabs"
            :grow="true"
            :aria-label="t('navigation.tabs.growingAria')"
          >
            <template #panel="{ item }">
              <p class="gallery-muted">{{ item.label }}</p>
            </template>
          </JinTabs>
        </div>

        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('navigation.tabs.custom') }}
          </p>
          <JinTabs v-model="tab" :items="tabs" :aria-label="t('navigation.tabs.customAria')">
            <template #tab="{ item }">
              <JinIcon :name="item.value === 'overview' ? 'home' : item.value === 'activity' ? 'bell' : 'settings'" />
              <span>{{ item.label }}</span>
              <JinTag v-if="item.badge" :label="item.badge" />
            </template>
          </JinTabs>
        </div>
      </div>
    </DemoSection>

    <DemoSection id="menu" :title="t('navigation.menu.title')" :note="t('navigation.menu.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <div>
          <p class="gallery-muted" style="margin-bottom: var(--jin-space-2)">
            {{ t('navigation.menu.inlineHint') }}
          </p>
          <JinMenu :items="menuItems" :aria-label="t('navigation.menu.aria')" @select="onMenuSelect" />
        </div>

        <div class="gallery-grid">
          <JinAlert
            tone="info"
            :title="t('navigation.menu.keyboardTitle')"
            :description="t('navigation.menu.keyboardDescription')"
          />
          <JinAlert
            v-if="menuEvents.length > 0"
            tone="neutral"
            :title="t('navigation.menu.eventsTitle')"
            :description="menuEventText"
          />
          <JinAlert
            tone="warning"
            :title="t('navigation.menu.disabledTitle')"
            :description="t('navigation.menu.disabledDescription')"
          />
        </div>
      </div>
    </DemoSection>

    <DemoSection id="dropdown" :title="t('navigation.dropdown.title')" :note="t('navigation.dropdown.note')">
      <JinDropdown :items="dropdownItems" :aria-label="t('navigation.dropdown.aria')" @select="onDropdownSelect">
        <template #trigger>
          <JinButton variant="secondary">
            <template #icon><JinIcon name="filter" /></template>
            {{ t('navigation.dropdown.display', { value: dropdownDisplay }) }}
          </JinButton>
        </template>
      </JinDropdown>

      <JinDropdown
        :items="[
          { id: 'copy', label: t('common.copy'), shortcut: 'Ctrl+C' },
          { id: 'cut', label: t('navigation.toolbar.cut'), shortcut: 'Ctrl+X' },
          { id: 'paste', label: t('navigation.toolbar.paste'), shortcut: 'Ctrl+V', disabled: true },
        ]"
        :aria-label="t('navigation.dropdown.moreAria')"
        @select="onMenuSelect"
      >
        <template #trigger>
          <JinButton variant="ghost" icon :label="t('navigation.dropdown.moreAria')">
            <template #icon><JinIcon name="menu" /></template>
          </JinButton>
        </template>
      </JinDropdown>

      <span class="gallery-muted">{{ t('navigation.dropdown.onlyIcon') }}</span>
    </DemoSection>

    <DemoSection id="context-menu" :title="t('navigation.context.title')" :note="t('navigation.context.note')" stacked>
      <JinContextMenu :items="contextItems" :aria-label="t('navigation.context.aria')" @select="onMenuSelect">
        <div
          style="
            padding: var(--jin-space-6);
            border: var(--jin-border-width) var(--jin-border-style) var(--jin-border-color-strong);
            border-radius: var(--jin-radius-md);
            text-align: center;
          "
        >
          <JinIcon name="file" :size="1.6" />
          <p style="margin: var(--jin-space-2) 0 0">{{ t('navigation.context.rightClick') }}</p>
          <p class="gallery-muted" style="margin: 0">{{ t('navigation.context.keyboardRoute') }}</p>
        </div>
      </JinContextMenu>

      <JinAlert v-if="menuEvents.length > 0" tone="neutral" :title="menuEventText" />
    </DemoSection>

    <DemoSection id="breadcrumb" :title="t('navigation.breadcrumb.title')" :note="t('navigation.breadcrumb.note')" stacked>
      <JinBreadcrumb :items="crumbs" />
      <JinBreadcrumb :items="crumbsWithHref" />
      <JinBreadcrumb :items="crumbs.slice(0, 2)" :aria-label="t('navigation.breadcrumb.shortTrail')">
        <template #separator>›</template>
      </JinBreadcrumb>
      <JinBreadcrumb
        :items="[
          { label: t('navigation.breadcrumb.longFirst') },
          { label: t('navigation.breadcrumb.longSecond') },
          { label: t('navigation.breadcrumb.leaf'), current: true },
        ]"
      />
    </DemoSection>

    <DemoSection id="divider" :title="t('navigation.divider.title')" :note="t('navigation.divider.note')" stacked>
      <div style="display: flex; flex-direction: column; gap: var(--jin-space-3); width: 100%">
        <p>{{ t('navigation.divider.above') }}</p>
        <JinDivider />
        <p>{{ t('navigation.divider.belowPlain') }}</p>
        <JinDivider spaced />
        <p>{{ t('navigation.divider.spacedHasMargin') }}</p>
        <JinDivider :label="t('navigation.divider.or')" />
        <p>{{ t('navigation.divider.groupedAfter') }}</p>
        <div style="display: flex; align-items: center; height: 48px">
          <span>{{ t('navigation.divider.left') }}</span>
          <JinDivider orientation="vertical" />
          <span>{{ t('navigation.divider.middle') }}</span>
          <JinDivider orientation="vertical" spaced />
          <span>{{ t('navigation.divider.right') }}</span>
        </div>
      </div>
    </DemoSection>

    <DemoSection id="card" :title="t('navigation.card.title')" :note="t('navigation.card.note')" stacked>
      <div class="gallery-grid gallery-grid--two">
        <JinCard
          :title="t('navigation.card.baseTitle')"
          :description="t('navigation.card.baseDescription')"
        >
          <p class="gallery-muted">{{ t('navigation.card.body') }}</p>
          <template #footer>
            <JinButton size="sm" variant="ghost">{{ t('common.cancel') }}</JinButton>
            <JinButton size="sm" variant="primary">{{ t('common.save') }}</JinButton>
          </template>
        </JinCard>

        <JinCard
          :title="t('navigation.card.raisedTitle')"
          :description="t('navigation.card.raisedDescription')"
          elevation="raised"
        >
          <p class="gallery-muted">{{ t('navigation.card.raisedBody') }}</p>
        </JinCard>

        <JinCard
          :title="t('navigation.card.flatTitle')"
          :description="t('navigation.card.flatDescription')"
          elevation="flat"
        >
          <p class="gallery-muted">{{ t('navigation.card.flatBody') }}</p>
        </JinCard>

        <JinCard
          :title="t('navigation.card.interactiveTitle')"
          :description="t('navigation.card.interactiveDescription')"
          interactive
          @activate="cardClicks += 1"
        >
          <p class="gallery-muted">
            {{
              cardClicks === 1
                ? t('navigation.card.activatedOne', { count: cardClicks })
                : t('navigation.card.activatedOther', { count: cardClicks })
            }}
          </p>
        </JinCard>

        <JinCard>
          <template #header>
            <p class="gallery-muted">{{ t('navigation.card.customHeader') }}</p>
          </template>
          <p class="gallery-muted">{{ t('navigation.card.customBody') }}</p>
        </JinCard>
      </div>
    </DemoSection>

    <DemoSection id="toolbar" :title="t('navigation.toolbar.title')" :note="t('navigation.toolbar.note')">
      <JinToolbar :aria-label="t('navigation.toolbar.aria')">
        <JinTooltip :content="t('navigation.toolbar.bold')" placement="top">
          <JinButton
            :variant="bold ? 'primary' : 'ghost'"
            size="sm"
            icon
            :label="t('navigation.toolbar.bold')"
            @click="bold = !bold; toolbarAction('navigation.toolbar.bold')"
          >
            <template #icon><span style="font-weight: 800">B</span></template>
          </JinButton>
        </JinTooltip>
        <JinTooltip :content="t('navigation.toolbar.italic')" placement="top">
          <JinButton
            :variant="italic ? 'primary' : 'ghost'"
            size="sm"
            icon
            :label="t('navigation.toolbar.italic')"
            @click="italic = !italic; toolbarAction('navigation.toolbar.italic')"
          >
            <template #icon><span style="font-style: italic">I</span></template>
          </JinButton>
        </JinTooltip>
        <JinDivider orientation="vertical" />
        <JinButton size="sm" variant="ghost" @click="toolbarAction('navigation.toolbar.link')">
          <template #icon><JinIcon name="link" /></template>
          {{ t('navigation.toolbar.link') }}
        </JinButton>
        <JinButton size="sm" variant="ghost" @click="toolbarAction('common.copy')">
          <template #icon><JinIcon name="copy" /></template>
          {{ t('common.copy') }}
        </JinButton>
        <JinButton size="sm" variant="ghost" disabled>
          <template #icon><JinIcon name="trash" /></template>
          {{ t('common.delete') }}
        </JinButton>
        <span class="jin-toolbar__spacer" />
        <JinTooltip :content="t('navigation.toolbar.export')" placement="top">
          <JinButton
            size="sm"
            variant="ghost"
            icon
            :label="t('navigation.toolbar.export')"
            @click="toolbarAction('navigation.toolbar.export')"
          >
            <template #icon><JinIcon name="download" /></template>
          </JinButton>
        </JinTooltip>
      </JinToolbar>

      <span v-if="toolbarLast" class="gallery-muted">
        {{ t('navigation.toolbar.lastAction', { action: t(toolbarLast) }) }}
      </span>

      <JinToolbar quiet :aria-label="t('navigation.toolbar.quietAria')">
        <JinBadge tone="info" :label="t('navigation.toolbar.quietBadge')" />
        <JinButton size="sm" variant="ghost">{{ t('navigation.toolbar.noSurface') }}</JinButton>
        <JinSwitch size="sm" :label="t('navigation.toolbar.inlineSwitch')" />
      </JinToolbar>
    </DemoSection>

    <DemoSection
      id="nav"
      :title="t('navigation.nav.title')"
      :note="t('navigation.nav.note')"
      stacked
      :plain="false"
    >
      <div class="gallery-grid gallery-grid--two">
        <JinNav
          :items="navItems"
          :current="navCurrent"
          :aria-label="t('navigation.nav.aria')"
          @select="(item) => (navCurrent = item.id)"
        />

        <div class="gallery-grid">
          <JinAlert
            tone="info"
            :title="t('navigation.nav.presentationalTitle')"
            :description="t('navigation.nav.presentationalDescription')"
          />
          <JinAlert
            v-if="navCurrent"
            tone="neutral"
            :title="t('navigation.nav.current', { id: navCurrentLabel })"
          />
        </div>
      </div>
    </DemoSection>

    <DemoSection :title="t('navigation.compose.title')" :note="t('navigation.compose.note')" stacked>
      <JinCard
        :title="t('navigation.compose.cardTitle')"
        :description="t('navigation.compose.cardDescription')"
      >
        <div class="gallery-grid">
          <JinToolbar quiet :aria-label="t('navigation.compose.panelAria')">
            <JinTextField
              size="sm"
              :placeholder="t('navigation.compose.filterPlaceholder')"
              clearable
              style="max-width: 240px"
            />
            <span class="jin-toolbar__spacer" />
            <JinButton size="sm" variant="ghost" icon :label="t('navigation.compose.refresh')">
              <template #icon><JinIcon name="refresh" /></template>
            </JinButton>
            <JinButton size="sm" variant="primary">{{ t('navigation.compose.addRow') }}</JinButton>
          </JinToolbar>

          <JinDivider />

          <JinTabs v-model="tab" :items="tabs.slice(0, 3)" :aria-label="t('navigation.compose.panelTabsAria')">
            <template #panel="{ item }">
              <JinAlert
                tone="neutral"
                :title="t('navigation.compose.panelTitle', { label: item.label })"
                :description="t('navigation.compose.panelDescription')"
              />
            </template>
          </JinTabs>
        </div>
      </JinCard>

      <JinDivider :label="t('navigation.compose.layoutHelpers')" />

      <div class="gallery-grid gallery-grid--three">
        <JinCard
          :title="t('navigation.compose.stackTitle')"
          :description="t('navigation.compose.stackDescription')"
        >
          <div class="jin-stack">
            <JinBadge tone="success" :label="t('navigation.compose.step', { index: 1 })" />
            <JinBadge tone="info" :label="t('navigation.compose.step', { index: 2 })" />
            <JinBadge tone="neutral" :label="t('navigation.compose.step', { index: 3 })" />
          </div>
        </JinCard>

        <JinCard
          :title="t('navigation.compose.clusterTitle')"
          :description="t('navigation.compose.clusterDescription')"
        >
          <div class="jin-cluster">
            <JinTag :label="t('navigation.compose.one')" removable />
            <JinTag :label="t('navigation.compose.two')" removable />
            <JinTag :label="t('navigation.compose.three')" removable />
            <JinTag :label="t('navigation.compose.four')" removable />
          </div>
        </JinCard>

        <JinCard
          :title="t('navigation.compose.selectionTitle')"
          :description="t('navigation.compose.selectionDescription')"
        >
          <JinSelect
            :options="[
              { value: 'a', label: t('navigation.compose.optionA') },
              { value: 'b', label: t('navigation.compose.optionB') },
            ]"
            model-value="a"
            size="sm"
          />
        </JinCard>
      </div>
    </DemoSection>
  </DemoPage>
</template>
