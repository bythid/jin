/**
 * Jin (锦) — public surface.
 *
 * Three things an application imports:
 *   1. `JinUI` + the composables, from this module
 *   2. the base stylesheet: `import '@bythid/jin/styles.css'`
 *   3. a theme, e.g. `import '@bythid/jin/themes/jin.css'` ('jin' is the default style)
 *
 * The base stylesheet is deliberately NOT imported here. It was, so a consumer
 * could not forget it — but a bare CSS import inside a dependency is one
 * statement away from being tree-shaken: whether it survives depends on the
 * *consumer's* bundler and on this package's `sideEffects` declaration matching
 * module ids that carry a query suffix. When it does not match, the import is
 * dropped and the failure is silent: controls render, unstyled, with nothing
 * reported anywhere. An import the application writes itself cannot be dropped,
 * so the sheet is explicit, and the plugin warns once at install time if it is
 * missing. Themes stay explicit because choosing one is a real decision.
 */

/* ------------------------------------------------------------------ plugin */
export { default as JinUI } from './injection/plugin'
export type { JinUIOptions, JinUIPlugin } from './injection/plugin'

/* --------------------------------------------------------------- injection */
export { useTheme, createTheme, DEFAULT_MODE, DEFAULT_STYLE } from './injection/theme'
export type { JinMode, ThemeController, ThemeOptions, ThemeSnapshot } from './injection/theme'
export { useCapabilities, capabilitiesKey } from './injection/provide-capabilities'
export type { JinCapabilities } from './injection/capabilities'
export { useT, useTranslation } from './composables/useT'
export { createTranslation, defaultTranslate, STRING_KEYS, STRINGS } from './injection/strings'
export type { TranslateFn, TranslateVars, TranslationContext } from './injection/strings'

/* ------------------------------------------------------------- composables */
export { useToasts, useNotifications, createFeedbackStore } from './composables/useFeedback'
export type { FeedbackAction, FeedbackEntry, FeedbackOptions, FeedbackStore } from './composables/useFeedback'
export { useOverlay, useOverlayEntry, createOverlayController, PORTAL_CLASS } from './composables/useOverlay'
export type { OverlayController } from './composables/useOverlay'
export { usePositioning } from './composables/usePositioning'
export { useFocusTrap } from './composables/useFocusTrap'
export { useRovingTabindex } from './composables/useRovingTabindex'
export { useDismissable } from './composables/useDismissable'

/* -------------------------------------------------------------------- core */
export { computePosition, parsePlacement, buildPlacement, OPPOSITE_SIDE, isPlacement } from './core/positioning'
export type { PositionOptions, PositionResult, Placement as PlacementType, Rect } from './core/positioning'
export { createOverlayStack } from './core/overlay-stack'
export type { DismissReason, OverlayEntry, OverlayEntryInput, OverlayStack } from './core/overlay-stack'
export { decideDismiss } from './core/dismissable'
export { stepIndex, resolveInitialFocusIndex, resolveFocusReturn, tabbables } from './core/focus'
export {
  nextRovingIndex,
  typeaheadMatch,
  createTypeaheadBuffer,
  isRovingKey,
} from './core/roving'
export type { RovingOptions, TypeaheadBuffer, TypeaheadEntry } from './core/roving'
export {
  flattenMenu,
  menuNavigate,
  nextRowId,
  firstRowId,
  lastRowId,
  typeaheadRowId,
  isMenuEntrySelectable,
} from './core/menu'
export type { FlatMenuEntry, MenuEntry, MenuEntryType, MenuNavAction } from './core/menu'
export {
  createTreeState,
  flattenTree,
  navigateTree,
  applyLoadStart,
  applyLoadSuccess,
  applyLoadFailure,
  shouldLoad,
  childrenOf,
  hasChildrenOf,
  expandableIds,
  typeaheadTreeRowId,
} from './core/tree'
export type { FlatTreeRow, TreeNode, TreeState, TreeNavResult } from './core/tree'
export {
  fromKeyboardEvent,
  serializeHotkey,
  parseHotkey,
  normalizeKeyName,
  hotkeysEqual,
  findHotkeyConflicts,
  isRecordableHotkey,
  describeHotkey,
  isModifierKey,
} from './core/hotkey'
export type { HotkeyBinding, HotkeyParts, HotkeyFormat } from './core/hotkey'
export { createQueue, QUEUE_POSITIONS } from './core/queue'
export type { QueueEntry, QueueInput, QueuePosition, QueueOptions } from './core/queue'
export { LAYERS, LAYER_TOKEN, layerZIndex, readNumericToken } from './core/layer'
export type { Layer } from './core/layer'
export { createId } from './core/id'
export type {
  Alignment,
  Orientation,
  Placement,
  Side,
  Size,
  Tone,
  TreeTone,
} from './core/types'

/* -------------------------------------------------------------- components */
export { default as JinAlert } from './components/JinAlert.vue'
export { default as JinBadge } from './components/JinBadge.vue'
export { default as JinBreadcrumb } from './components/JinBreadcrumb.vue'
export { default as JinButton } from './components/JinButton.vue'
export { default as JinCard } from './components/JinCard.vue'
export { default as JinCheckbox } from './components/JinCheckbox.vue'
export { default as JinContextMenu } from './components/JinContextMenu.vue'
export { default as JinDetailList } from './components/JinDetailList.vue'
export { default as JinDivider } from './components/JinDivider.vue'
export { default as JinDrawer } from './components/JinDrawer.vue'
export { default as JinDropdown } from './components/JinDropdown.vue'
export { default as JinField } from './components/JinField.vue'
export { default as JinHotkeyRecorder } from './components/JinHotkeyRecorder.vue'
export { default as JinIcon } from './components/JinIcon.vue'
export { default as JinLink } from './components/JinLink.vue'
export { default as JinMenu } from './components/JinMenu.vue'
export { default as JinModal } from './components/JinModal.vue'
export { default as JinNav } from './components/JinNav.vue'
export { default as JinNotificationRegion } from './components/JinNotificationRegion.vue'
export { default as JinPopconfirm } from './components/JinPopconfirm.vue'
export { default as JinPopover } from './components/JinPopover.vue'
export { default as JinProgress } from './components/JinProgress.vue'
export { default as JinRadioGroup } from './components/JinRadioGroup.vue'
export { default as JinResult } from './components/JinResult.vue'
export { default as JinSearchField } from './components/JinSearchField.vue'
export { default as JinSelect } from './components/JinSelect.vue'
export { default as JinSkeleton } from './components/JinSkeleton.vue'
export { default as JinSpinner } from './components/JinSpinner.vue'
export { default as JinSwitch } from './components/JinSwitch.vue'
export { default as JinTabs } from './components/JinTabs.vue'
export { default as JinTag } from './components/JinTag.vue'
export { default as JinTextField } from './components/JinTextField.vue'
export { default as JinToastRegion } from './components/JinToastRegion.vue'
export { default as JinToolbar } from './components/JinToolbar.vue'
export { default as JinTooltip } from './components/JinTooltip.vue'
export { default as JinTree } from './components/JinTree.vue'

/* -------------------------------------------------------- component types */
export type { IconName } from './components/icon-paths'
export { ICON_PATHS } from './components/icon-paths'
export type { SelectOption } from './components/JinSelect.vue'
export type { TabItem } from './components/JinTabs.vue'
export type { NavItem } from './components/JinNav.vue'
export type { RadioOption } from './components/JinRadioGroup.vue'
export type { BreadcrumbItem } from './components/JinBreadcrumb.vue'
export type { DetailItem } from './components/JinDetailList.vue'
export type { ResultStatus } from './components/JinResult.vue'
