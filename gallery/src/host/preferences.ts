/**
 * Preference persistence. This belongs to the host application — the library
 * deliberately never touches localStorage.
 */
import type { JinMode } from '@bythid/jin'
import type { GalleryLocale } from '../i18n'

const STYLE_KEY = 'jin-gallery.style'
const MODE_KEY = 'jin-gallery.mode'
const LOCALE_KEY = 'jin-gallery.locale'
const HUE_KEY = 'jin-gallery.hue'

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
  {
    id: 'retro-futurism',
    labelKey: 'app.style.retro-futurism.label',
    noteKey: 'app.style.retro-futurism.note',
  },
  {
    id: 'aurora-ui',
    labelKey: 'app.style.aurora-ui.label',
    noteKey: 'app.style.aurora-ui.note',
  },
  {
    id: 'e-ink-paper',
    labelKey: 'app.style.e-ink-paper.label',
    noteKey: 'app.style.e-ink-paper.note',
  },
  {
    id: 'skeuomorphism',
    labelKey: 'app.style.skeuomorphism.label',
    noteKey: 'app.style.skeuomorphism.note',
  },
  {
    id: 'memphis-design',
    labelKey: 'app.style.memphis-design.label',
    noteKey: 'app.style.memphis-design.note',
  },
  {
    id: 'pixel-art',
    labelKey: 'app.style.pixel-art.label',
    noteKey: 'app.style.pixel-art.note',
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
 * The re-anchored accent hue, persisted the same way as the locale: a small
 * number or "no opinion" (null), and the theme controller owns what it means.
 */
export function loadHue(): number | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(HUE_KEY)
  if (raw === null) return null
  const hue = Number(raw)
  return Number.isFinite(hue) ? hue : null
}

export function saveHue(hue: number | null): void {
  if (typeof localStorage === 'undefined') return
  try {
    if (hue === null) localStorage.removeItem(HUE_KEY)
    else localStorage.setItem(HUE_KEY, String(hue))
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
