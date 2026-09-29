/**
 * Translation injection. The library ships no strings of its own
 * beyond the readable English defaults declared in contracts/strings.json; an
 * application overrides them with `app.use(JinUI, { t })`.
 */
import type { App, InjectionKey } from 'vue'
import defaults from '../../contracts/strings.json'

export type TranslateVars = Record<string, string | number>

export type TranslateFn = (key: string, vars?: TranslateVars) => string

export interface TranslationContext {
  t: TranslateFn
  /** `false` when the host supplied its own `t` (used by the Gallery to show provenance). */
  usingDefaults: boolean
}

export const STRINGS: Record<string, string> = Object.fromEntries(
  Object.entries((defaults as { keys: Record<string, { default: string }> }).keys).map(([key, value]) => [
    key,
    value.default,
  ]),
)

/** Every key the library may ask for; applications implement exactly these. */
export const STRING_KEYS: string[] = Object.keys(STRINGS).sort()

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  )
}

export function defaultTranslate(key: string, vars?: TranslateVars): string {
  const template = STRINGS[key]
  if (template === undefined) {
    // Never throw and never print a raw key into the UI: show the last segment.
    return key.split('.').pop() ?? key
  }
  return interpolate(template, vars)
}

export function createTranslation(t?: TranslateFn): TranslationContext {
  if (!t) return { t: defaultTranslate, usingDefaults: true }
  return {
    t: (key, vars) => {
      const translated = t(key, vars)
      // A host that does not know a key should not leak the key into the UI.
      if (translated === undefined || translated === null || translated === '') return defaultTranslate(key, vars)
      return translated
    },
    usingDefaults: false,
  }
}

export const translationKey: InjectionKey<TranslationContext> = Symbol('jin-translation')

export function provideTranslation(app: App, translation: TranslationContext): void {
  app.provide(translationKey, translation)
}
