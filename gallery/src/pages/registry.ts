/**
 * The catalogue registry: which pages exist, in which order, and which
 * sections each page has. The navigation in App.vue is generated from this
 * list, so adding a page is a one-file change.
 *
 * Labels are dictionary keys, not sentences: the registry is data, and the
 * sidebar is translated like everything else.
 */
import type { Component } from 'vue'
import type { IconName } from '@bythid/jin'

import FeedbackPage from './FeedbackPage.vue'
import OverlayPage from './OverlayPage.vue'
import FormPage from './FormPage.vue'
import NavigationPage from './NavigationPage.vue'
import DataPage from './DataPage.vue'
import TreePage from './TreePage.vue'
import SamplesPage from './SamplesPage.vue'

export interface PageChild {
  id: string
  labelKey: string
}

export interface PageEntry {
  id: string
  labelKey: string
  icon: IconName
  component: Component
  children?: PageChild[]
}

export const PAGES: PageEntry[] = [
  {
    id: 'feedback',
    labelKey: 'nav.feedback',
    icon: 'bell',
    component: FeedbackPage,
    children: [
      { id: 'spinner', labelKey: 'nav.feedback.spinner' },
      { id: 'progress', labelKey: 'nav.feedback.progress' },
      { id: 'skeleton', labelKey: 'nav.feedback.skeleton' },
      { id: 'alert', labelKey: 'nav.feedback.alert' },
      { id: 'toast', labelKey: 'nav.feedback.toast' },
      { id: 'notification', labelKey: 'nav.feedback.notification' },
      { id: 'result', labelKey: 'nav.feedback.result' },
    ],
  },
  {
    id: 'overlays',
    labelKey: 'nav.overlays',
    icon: 'copy',
    component: OverlayPage,
    children: [
      { id: 'modal', labelKey: 'nav.overlays.modal' },
      { id: 'drawer', labelKey: 'nav.overlays.drawer' },
      { id: 'popover', labelKey: 'nav.overlays.popover' },
      { id: 'tooltip', labelKey: 'nav.overlays.tooltip' },
      { id: 'popconfirm', labelKey: 'nav.overlays.popconfirm' },
    ],
  },
  {
    id: 'forms',
    labelKey: 'nav.forms',
    icon: 'settings',
    component: FormPage,
    children: [
      { id: 'field', labelKey: 'nav.forms.field' },
      { id: 'text-field', labelKey: 'nav.forms.textField' },
      { id: 'search-field', labelKey: 'nav.forms.searchField' },
      { id: 'select', labelKey: 'nav.forms.select' },
      { id: 'checkbox', labelKey: 'nav.forms.checkbox' },
      { id: 'radio', labelKey: 'nav.forms.radio' },
      { id: 'switch', labelKey: 'nav.forms.switch' },
      { id: 'hotkey', labelKey: 'nav.forms.hotkey' },
    ],
  },
  {
    id: 'navigation',
    labelKey: 'nav.navigation',
    icon: 'menu',
    component: NavigationPage,
    children: [
      { id: 'tabs', labelKey: 'nav.navigation.tabs' },
      { id: 'menu', labelKey: 'nav.navigation.menu' },
      { id: 'dropdown', labelKey: 'nav.navigation.dropdown' },
      { id: 'context-menu', labelKey: 'nav.navigation.contextMenu' },
      { id: 'breadcrumb', labelKey: 'nav.navigation.breadcrumb' },
      { id: 'divider', labelKey: 'nav.navigation.divider' },
      { id: 'card', labelKey: 'nav.navigation.card' },
      { id: 'toolbar', labelKey: 'nav.navigation.toolbar' },
      { id: 'nav', labelKey: 'nav.navigation.nav' },
    ],
  },
  {
    id: 'tree',
    labelKey: 'nav.tree',
    icon: 'database',
    component: TreePage,
    children: [
      { id: 'basic', labelKey: 'nav.tree.basics' },
      { id: 'selection', labelKey: 'nav.tree.selection' },
      { id: 'lazy', labelKey: 'nav.tree.lazy' },
      { id: 'failure', labelKey: 'nav.tree.failure' },
      { id: 'slots', labelKey: 'nav.tree.slots' },
      { id: 'keyboard', labelKey: 'nav.tree.keyboard' },
    ],
  },
  {
    id: 'data',
    labelKey: 'nav.data',
    icon: 'file',
    component: DataPage,
    children: [
      { id: 'badge', labelKey: 'nav.data.badge' },
      { id: 'tag', labelKey: 'nav.data.tag' },
      { id: 'detail-list', labelKey: 'nav.data.detailList' },
      { id: 'link', labelKey: 'nav.data.link' },
      { id: 'icon', labelKey: 'nav.data.icon' },
    ],
  },
  {
    id: 'samples',
    labelKey: 'nav.samples',
    icon: 'home',
    component: SamplesPage,
    children: [
      { id: 'list-detail', labelKey: 'nav.samples.listDetail' },
      { id: 'form', labelKey: 'nav.samples.form' },
      { id: 'flow', labelKey: 'nav.samples.flow' },
      { id: 'states', labelKey: 'nav.samples.states' },
      { id: 'rtl', labelKey: 'nav.samples.rtl' },
    ],
  },
]
