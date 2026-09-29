/**
 * Hotkey recording and conflict detection. Pure string/key math:
 * the recorder component only forwards KeyboardEvent fields.
 */

export interface HotkeyParts {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  /** Normalized key name, e.g. 'K', 'ArrowUp', 'F5', '/'. */
  key: string
}

export const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Dead'] as const

export function isModifierKey(key: string): boolean {
  return (MODIFIER_KEYS as readonly string[]).includes(key)
}

const KEY_ALIASES: Record<string, string> = {
  esc: 'Escape',
  escape: 'Escape',
  return: 'Enter',
  enter: 'Enter',
  space: 'Space',
  spacebar: 'Space',
  ' ': 'Space',
  tab: 'Tab',
  del: 'Delete',
  delete: 'Delete',
  backspace: 'Backspace',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  plus: '+',
  minus: '-',
  comma: ',',
  period: '.',
  slash: '/',
  backslash: '\\',
  semicolon: ';',
  quote: "'",
  backquote: '`',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  home: 'Home',
  end: 'End',
  insert: 'Insert',
  capslock: 'CapsLock',
  ctrl: 'Control',
  control: 'Control',
  opt: 'Alt',
  option: 'Alt',
  alt: 'Alt',
  shift: 'Shift',
  cmd: 'Meta',
  command: 'Meta',
  meta: 'Meta',
  super: 'Meta',
  win: 'Meta',
}

/** Canonical spelling for a key name coming from a KeyboardEvent or from text. */
export function normalizeKeyName(input: string): string {
  if (input.length === 0) return ''
  const alias = KEY_ALIASES[input.toLowerCase()]
  if (alias) return alias
  if (/^f\d{1,2}$/i.test(input)) return input.toUpperCase()
  if (input.length === 1) return input.toUpperCase()
  // 'KeyA' / 'Digit1' style code fallbacks
  const codeMatch = /^(?:Key|Digit|Numpad)(.+)$/.exec(input)
  if (codeMatch?.[1]) return normalizeKeyName(codeMatch[1])
  return input.charAt(0).toUpperCase() + input.slice(1)
}

export function fromKeyboardEvent(event: {
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}): HotkeyParts {
  return {
    ctrl: event.ctrlKey,
    alt: event.altKey,
    shift: event.shiftKey,
    meta: event.metaKey,
    key: normalizeKeyName(event.key),
  }
}

const MOD_ORDER: (keyof Omit<HotkeyParts, 'key'>)[] = ['ctrl', 'alt', 'shift', 'meta']

const MOD_LABEL: Record<string, { text: string; symbol: string; native: string }> = {
  ctrl: { text: 'Ctrl', symbol: '⌃', native: 'Ctrl' },
  alt: { text: 'Alt', symbol: '⌥', native: 'Alt' },
  shift: { text: 'Shift', symbol: '⇧', native: 'Shift' },
  meta: { text: 'Meta', symbol: '⌘', native: 'Cmd' },
}

export type HotkeyFormat = 'text' | 'symbol' | 'native'

export function serializeHotkey(parts: HotkeyParts, format: HotkeyFormat = 'text'): string {
  const pieces: string[] = []
  for (const modifier of MOD_ORDER) {
    if (parts[modifier]) pieces.push(MOD_LABEL[modifier]?.[format] ?? modifier)
  }
  const label = parts.key === 'Space' ? 'Space' : parts.key
  pieces.push(label)
  return format === 'symbol' ? pieces.join('') : pieces.join('+')
}

export function parseHotkey(text: string): HotkeyParts | null {
  const raw = text.trim()
  if (!raw) return null
  const tokens = raw
    .split(/[+\-]/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
  // 'A-B' style chords are rare; treat everything after the first modifier run as one key.
  const parts: HotkeyParts = { ctrl: false, alt: false, shift: false, meta: false, key: '' }
  for (const token of tokens) {
    const normalized = normalizeKeyName(token)
    switch (normalized) {
      case 'Control':
        parts.ctrl = true
        break
      case 'Alt':
        parts.alt = true
        break
      case 'Shift':
        parts.shift = true
        break
      case 'Meta':
        parts.meta = true
        break
      default:
        parts.key = normalized
    }
  }
  if (!parts.key) return null
  return parts
}

export function hotkeysEqual(a: HotkeyParts, b: HotkeyParts): boolean {
  return a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta && a.key === b.key
}

export interface HotkeyBinding {
  id: string
  hotkey: HotkeyParts
}

/** Ids of bindings that would fire on the same combination. */
export function findHotkeyConflicts(bindings: readonly HotkeyBinding[], candidate: HotkeyParts): string[] {
  return bindings.filter((binding) => hotkeysEqual(binding.hotkey, candidate)).map((binding) => binding.id)
}

/**
 * A bare key with no modifier is only usable when it is a function key or an
 * editing key — otherwise recording a single letter would swallow typing.
 */
export function isRecordableHotkey(parts: HotkeyParts): boolean {
  if (isModifierKey(parts.key)) return false
  const hasModifier = parts.ctrl || parts.alt || parts.meta
  if (hasModifier) return true
  if (/^F\d{1,2}$/.test(parts.key)) return true
  if (parts.shift && parts.key.length === 1) return true
  return ['Escape', 'Delete', 'Backspace', 'Enter', 'Tab', 'Home', 'End', 'PageUp', 'PageDown', 'Insert'].includes(parts.key)
}

/** Human readable form for screen readers, e.g. "Control plus Shift plus K". */
export function describeHotkey(parts: HotkeyParts): string {
  const words: string[] = []
  if (parts.ctrl) words.push('Control')
  if (parts.alt) words.push('Alt')
  if (parts.shift) words.push('Shift')
  if (parts.meta) words.push('Meta')
  words.push(parts.key === 'Space' ? 'Space' : parts.key)
  return words.join(' plus ')
}
