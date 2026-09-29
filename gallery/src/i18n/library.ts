/**
 * The library's own strings.
 *
 * `contracts/strings.json` declares every key the library may ask for, and this
 * file is the Gallery's answer to them — the mapping `docs/consuming.md`
 * describes, written the way an application whose dictionary is already keyed
 * by key would write it.
 *
 * Only Chinese is listed. English needs no entry because the library's
 * readable default *is* the English text: the bridge in `./index.ts` falls back
 * to `defaultTranslate`, so the English Gallery keeps showing the default path
 * and only a locale that genuinely translates overrides anything.
 *
 * The type is `Record<LibraryKey, string>`, not a partial: if the library adds
 * a key to the contract, `npm run typecheck` in the gallery fails here until it
 * is translated.
 */
import defaults from '@bythid/jin/contracts/strings.json'

export type LibraryKey = keyof (typeof defaults)['keys']

export const LIBRARY_STRINGS_ZH: Record<LibraryKey, string> = {
  'a11y.close': '关闭',
  'a11y.dismiss': '忽略',
  'a11y.expand': '展开',
  'a11y.collapse': '折叠',
  'a11y.expandAll': '全部展开',
  'a11y.collapseAll': '全部折叠',
  'a11y.loading': '加载中',
  'a11y.clear': '清除',
  'a11y.remove': '移除',
  'a11y.search': '搜索',
  'a11y.menu': '菜单',
  'a11y.moreActions': '更多操作',
  'a11y.selected': '已选中',
  'a11y.breadcrumb': '面包屑导航',
  'a11y.toolbar': '工具栏',
  'a11y.navigation': '导航',
  'a11y.tabs': '标签页',
  'a11y.toasts': '通知与消息',
  'a11y.notifications': '通知',
  'a11y.confirm': '确认',
  'a11y.cancel': '取消',
  'empty.noData': '暂无数据',
  'select.noOptions': '无选项',
  'tree.empty': '暂无条目',
  'tree.loadFailed': '加载失败',
}
