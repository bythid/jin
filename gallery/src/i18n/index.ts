/**
 * Gallery i18n.
 *
 * Two jobs, one mechanism. The Gallery translates its own copy, and it
 * demonstrates the documented way an application translates the library's
 * strings: `jin` is passed to `app.use(JinUI, { t })`, so switching the Gallery
 * to Chinese also switches every "Close", "Expand all" and "No data" the
 * controls announce of their own accord.
 *
 * There is no i18n dependency. A locale is a `ref`, a dictionary is a flat map
 * of dotted keys, and `{name}` is the only placeholder syntax — the same one
 * `contracts/strings.json` uses. A key missing from the active locale falls
 * back to English and then to its last segment, so a raw key never reaches the
 * interface.
 *
 * English is the source language, which is why `locales/en.ts` is also the key
 * space: `locales/zh.ts` is typed against it, and a string added without a
 * translation fails the typecheck.
 */
import { inject, ref, type App, type InjectionKey, type Ref } from 'vue'
import { defaultTranslate, type TranslateFn, type TranslateVars } from '@bythid/jin'
import { EN_MESSAGES, type MessageKey } from './locales/en'
import { ZH_MESSAGES } from './locales/zh'
import { LIBRARY_STRINGS_ZH } from './library'

export type GalleryLocale = 'en' | 'zh'

export interface LocaleEntry {
  id: GalleryLocale
  /** The locale's own name: a language switcher is read by people who cannot read the current language. */
  label: string
  /** What goes on <html lang>. It selects the font stack, line breaking and what a screen reader reads out. */
  htmlLang: string
}

export const LOCALES: readonly LocaleEntry[] = [
  { id: 'en', label: 'English', htmlLang: 'en' },
  { id: 'zh', label: '简体中文', htmlLang: 'zh-CN' },
]

const DICTIONARIES: Record<GalleryLocale, Partial<Record<MessageKey, string>>> = {
  en: EN_MESSAGES,
  zh: ZH_MESSAGES,
}

/**
 * The library's keys are their own space, and English needs no entry in it:
 * the library's readable defaults *are* the English text.
 */
const LIBRARY_DICTIONARIES: Record<GalleryLocale, Record<string, string>> = {
  en: {},
  zh: LIBRARY_STRINGS_ZH,
}

export interface GalleryI18n {
  locale: Ref<GalleryLocale>
  /** Gallery copy. */
  t: TranslateFn
  /** The library's own keys (`a11y.close`, `tree.empty`, …), for `app.use(JinUI, { t })`. */
  jin: TranslateFn
  setLocale(next: GalleryLocale): void
}

export const i18nKey: InjectionKey<GalleryI18n> = Symbol('gallery-i18n')

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  )
}

export function localeEntry(locale: GalleryLocale): LocaleEntry {
  return LOCALES.find((entry) => entry.id === locale) ?? { id: 'en', label: 'English', htmlLang: 'en' }
}

export interface GalleryI18nOptions {
  locale?: GalleryLocale
  /** Called on every change, so the host can persist the choice. */
  onChange?: (locale: GalleryLocale) => void
}

export function createGalleryI18n(options: GalleryI18nOptions = {}): GalleryI18n {
  const locale = ref<GalleryLocale>(options.locale ?? 'en')

  const t: TranslateFn = (key, vars) => {
    const template = DICTIONARIES[locale.value][key as MessageKey] ?? EN_MESSAGES[key as MessageKey]
    if (template === undefined) return key.split('.').pop() ?? key
    return interpolate(template, vars)
  }

  // A host that knows a library key overrides it; otherwise the library's own
  // default stands, so a partial dictionary degrades to readable English
  // rather than to a missing string. Vars are interpolated here: the library
  // hands them over with the key, and a dictionary template such as
  // `使用“{value}”` is meaningless without them.
  const jin: TranslateFn = (key, vars) => {
    const template = LIBRARY_DICTIONARIES[locale.value][key]
    return template === undefined ? defaultTranslate(key, vars) : interpolate(template, vars)
  }

  function apply(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = localeEntry(locale.value).htmlLang
      document.title = t('app.documentTitle')
    }
    options.onChange?.(locale.value)
  }

  function setLocale(next: GalleryLocale): void {
    if (next === locale.value) return
    locale.value = next
    apply()
  }

  apply()

  return { locale, t, jin, setLocale }
}

export function provideI18n(app: App, i18n: GalleryI18n): void {
  app.provide(i18nKey, i18n)
}

export function useI18n(): GalleryI18n {
  const i18n = inject(i18nKey, null)
  if (!i18n) throw new Error('useI18n() needs the Gallery i18n: it is provided by app.use() wiring in gallery/src/main.ts')
  return i18n
}
