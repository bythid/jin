/**
 * Icon geometry, kept out of the component file so other modules (e.g. the
 * Gallery's token panel) can reference the name union without pulling in the
 * SFC.
 */

export type IconName =
  | 'check'
  | 'close'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-up'
  | 'search'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'minus'
  | 'plus'
  | 'trash'
  | 'download'
  | 'folder'
  | 'external'
  | 'copy'
  | 'menu'
  | 'drag'
  | 'refresh'
  | 'eye-off'
  | 'wifi-off'
  | 'lock'
  | 'file'
  | 'bell'
  | 'clock'
  | 'star'
  | 'user'
  | 'settings'
  | 'home'
  | 'database'
  | 'sparkle'
  | 'filter'
  | 'sort'
  | 'link'
  | 'play'
  | 'pause'
  | 'stop'

/** Single-path 16×16 glyphs; stroke-based so `currentColor` drives them. */
export const ICON_PATHS: Record<IconName, string> = {
  check: 'M4 8.5 6.5 11 12 5',
  close: 'M4 4l8 8M12 4l-8 8',
  'chevron-down': 'M4 6.5 8 10.5 12 6.5',
  'chevron-up': 'M4 9.5 8 5.5 12 9.5',
  'chevron-right': 'M6.5 4 10.5 8 6.5 12',
  'chevron-left': 'M9.5 4 5.5 8 9.5 12',
  search: 'M7.5 13a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM11.5 11.5 14.5 14.5',
  info: 'M8 7.5v5M8 4.6v.1M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8Z',
  success: 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8ZM5.4 8.2 7.2 10l3.4-3.6',
  warning: 'M8 2.2 14.4 13H1.6L8 2.2ZM8 6.4v3M8 11.2v.1',
  danger: 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8ZM5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8',
  minus: 'M3.5 8h9',
  plus: 'M8 3.5v9M3.5 8h9',
  trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9M6.8 7v4M9.2 7v4',
  download: 'M8 2.5v7.5M5 7.5 8 10.5l3-3M3 12.5h10',
  folder: 'M2 4h4l1.2 1.6H14V13H2V4Z',
  external: 'M9 3h4v4M13 3 7.5 8.5M11.5 9.5V13H3V4.5h3.5',
  copy: 'M5.5 5.5h8v8h-8v-8ZM2.5 10.5v-8h8',
  menu: 'M3 4.5h10M3 8h10M3 11.5h10',
  drag: 'M6 4.5h.1M10 4.5h.1M6 8h.1M10 8h.1M6 11.5h.1M10 11.5h.1',
  refresh: 'M13 8a5 5 0 1 1-1.6-3.7M13 2.5V6h-3.5',
  'eye-off': 'M3 3l10 10M6.3 6.4A5.6 5.6 0 0 0 2.5 8s2.2 3.5 5.5 3.5c.8 0 1.5-.2 2.1-.5M13.5 8s-.7-1.1-1.9-2.1M6.9 4.8A6 6 0 0 1 8 4.5c3.3 0 5.5 3.5 5.5 3.5',
  'wifi-off': 'M3 3l10 10M5.5 9.5a3.5 3.5 0 0 1 4-.6M2.5 6.5a8 8 0 0 1 3-1.6M13.5 6.5a8 8 0 0 0-4.6-1.9M8 12.7v.1',
  lock: 'M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7M3.5 7h9v6h-9V7Z',
  file: 'M4 2.5h5l3.5 3.5V13.5H4V2.5ZM9 2.5V6h3.5',
  bell: 'M8 2.5a4 4 0 0 0-4 4v3l-1 1.5h10L12 9.5v-3a4 4 0 0 0-4-4ZM6.5 11a1.5 1.5 0 0 0 3 0',
  clock: 'M8 1.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 8 1.8ZM8 4.8V8l2.3 1.4',
  star: 'M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.5l4-.6L8 2.2Z',
  user: 'M8 8.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM3 13.5c0-2.2 2.2-3.5 5-3.5s5 1.3 5 3.5',
  settings:
    'M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12.6 10.2l1.2.9-1.2 2-1.4-.5a4.6 4.6 0 0 1-1.2.7l-.2 1.5H7.2L7 13.3a4.6 4.6 0 0 1-1.2-.7l-1.4.5-1.2-2 1.2-.9a4.6 4.6 0 0 1 0-1.4l-1.2-.9 1.2-2 1.4.5a4.6 4.6 0 0 1 1.2-.7l.2-1.5h2.6l.2 1.5c.4.2.8.4 1.2.7l1.4-.5 1.2 2-1.2.9c.1.5.1 1 0 1.4Z',
  home: 'M2.5 7.5 8 3l5.5 4.5V13.5h-4v-3.5h-3v3.5h-4V7.5Z',
  database: 'M8 2.2c3 0 5 1 5 2s-2 2-5 2-5-1-5-2 2-2 5-2ZM3 4.2v7.6c0 1 2 2 5 2s5-1 5-2V4.2M3 8c0 1 2 2 5 2s5-1 5-2',
  sparkle:
    'M8 2.2 9.2 6l3.8 1.2L9.2 8.4 8 12.2 6.8 8.4 3 7.2 6.8 6 8 2.2ZM12.8 11.2l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5Z',
  filter: 'M2.5 3.5h11L9.3 8.6v4.2L6.7 11V8.6L2.5 3.5Z',
  sort: 'M4.5 3.5v9M4.5 12.5 2.5 10.5M11.5 12.5v-9M11.5 3.5l2 2',
  link: 'M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2.1-2.1a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.4 6.6a2.6 2.6 0 0 0-3.7 0L3.6 8.7a2.6 2.6 0 0 0 3.7 3.7l.8-.8',
  play: 'M5 3.5 12 8l-7 4.5v-9Z',
  pause: 'M5.5 3.5v9M10.5 3.5v9',
  stop: 'M4.5 4.5h7v7h-7v-7Z',
}
