/**
 * `useT()` — the only way components obtain strings.
 */
import { inject } from 'vue'
import { defaultTranslate, translationKey, type TranslateFn, type TranslationContext, type TranslateVars } from '../injection/strings'

export function useTranslation(): TranslationContext {
  return inject<TranslationContext>(translationKey, { t: defaultTranslate, usingDefaults: true })
}

export function useT(): { t: TranslateFn; usingDefaults: boolean } {
  const context = useTranslation()
  return {
    t: (key: string, vars?: TranslateVars) => context.t(key, vars),
    usingDefaults: context.usingDefaults,
  }
}
