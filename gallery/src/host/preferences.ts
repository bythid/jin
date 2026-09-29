/**
 * Preference persistence. This belongs to the host application — the library
 * deliberately never touches localStorage.
 */
import type { JinMode } from '@bythid/jin'
import type { GalleryLocale } from '../i18n'

const STYLE_KEY = 'jin-gallery.style'
const MODE_KEY = 'jin-gallery.mode'
const LOCALE_KEY = 'jin-gallery.locale'

/**
 * The catalogue of styles. Labels and notes are dictionary keys rather than
 * sentences, because the switcher is part of the interface and is translated
 * with the rest of it.
 */
export const AVAILABLE_STYLES = [
  {
    id: 'jin',
    labelKey: 'app.style.jin.label',
    noteKey: 'app.style.jin.note',
  },
  {
    id: 'dimensional-layering',
    labelKey: 'app.style.dimensional-layering.label',
    noteKey: 'app.style.dimensional-layering.note',
  },
  {
    id: 'glassmorphism',
    labelKey: 'app.style.glassmorphism.label',
    noteKey: 'app.style.glassmorphism.note',
  },
  {
    id: 'neumorphism',
    labelKey: 'app.style.neumorphism.label',
    noteKey: 'app.style.neumorphism.note',
  },
  {
    id: 'flat-design',
    labelKey: 'app.style.flat-design.label',
    noteKey: 'app.style.flat-design.note',
  },
  {
    id: 'claymorphism',
    labelKey: 'app.style.claymorphism.label',
    noteKey: 'app.style.claymorphism.note',
  },
  {
    id: 'minimalism-and-swiss-style',
    labelKey: 'app.style.minimalism-and-swiss-style.label',
    noteKey: 'app.style.minimalism-and-swiss-style.note',
  },
  {
    id: 'neubrutalism',
    labelKey: 'app.style.neubrutalism.label',
    noteKey: 'app.style.neubrutalism.note',
  },
  {
    id: 'brutalism',
    labelKey: 'app.style.brutalism.label',
    noteKey: 'app.style.brutalism.note',
  },
] as const

export interface Preferences {
  defaultStyle?: string
  defaultMode?: JinMode
}

export function loadPreferences(): Preferences {
  if (typeof localStorage === 'undefined') return {}
  const style = localStorage.getItem(STYLE_KEY)
  const mode = localStorage.getItem(MODE_KEY)
  const preferences: Preferences = {}
  if (style && AVAILABLE_STYLES.some((entry) => entry.id === style)) preferences.defaultStyle = style
  if (mode === 'light' || mode === 'dark') preferences.defaultMode = mode
  return preferences
}

export function savePreferences(snapshot: { style: string; mode: JinMode }): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STYLE_KEY, snapshot.style)
    localStorage.setItem(MODE_KEY, snapshot.mode)
  } catch {
    // A gallery that cannot persist a preference still works; say nothing.
  }
}

/**
 * The stored language, or the browser's when nothing was ever chosen — a
 * Chinese browser should not have to be told twice. `null` means "no opinion",
 * and the caller decides the default.
 */
export function loadLocale(): GalleryLocale | null {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === 'en' || stored === 'zh') return stored
  }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) return 'zh'
  return null
}

export function saveLocale(locale: GalleryLocale): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // Same as above: the choice still applies for this session.
  }
}
