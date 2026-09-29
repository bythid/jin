/**
 * Gallery i18n checks.
 *
 * The Gallery's own typecheck already forces `zh.ts` to cover every key of
 * `en.ts` and `library.ts` to cover every key of `contracts/strings.json`. The
 * two failures it cannot see are checked here because both are silent in a
 * browser: a page calling `t()` with a key nobody defined renders the key's
 * last segment and merely looks odd, and a translation that quietly went empty
 * looks like a styling bug.
 *
 * These run in Node, like the rest of the pure checks. Gallery sources arrive
 * through Vite's `?raw` (the route portal.spec.ts takes to the stylesheet)
 * rather than Node's filesystem, so the library typecheck needs no Node types.
 */
import { describe, expect, it } from 'vitest'

import { EN_MESSAGES } from '../gallery/src/i18n/locales/en'
import { ZH_MESSAGES } from '../gallery/src/i18n/locales/zh'
import { LIBRARY_STRINGS_ZH } from '../gallery/src/i18n/library'
import contract from '../contracts/strings.json'

// The dictionaries define keys; only the files that consume them are scanned.
const GALLERY_SOURCES = import.meta.glob(
  ['../gallery/src/**/*.{ts,vue}', '!../gallery/src/i18n/**'],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>

/** Every key the Gallery asks for as a literal: `t('x')`, `t("x")`, or a template with no hole. */
function requestedKeys(): Map<string, string> {
  const requested = new Map<string, string>()
  const pattern = /\bt\(\s*(?:'([^']+)'|"([^"]+)"|`([^`$]*)`)/g
  for (const [path, text] of Object.entries(GALLERY_SOURCES)) {
    for (const match of text.matchAll(pattern)) {
      const key = match[1] ?? match[2] ?? match[3]
      if (key) requested.set(key, path)
    }
  }
  return requested
}

describe('gallery i18n', () => {
  it('covers every source file it claims to', () => {
    // A guard on the test itself: an empty glob would make the check below pass
    // by saying nothing.
    expect(Object.keys(GALLERY_SOURCES).length).toBeGreaterThan(10)
  })

  it('translates every English key', () => {
    expect(Object.keys(ZH_MESSAGES).sort()).toEqual(Object.keys(EN_MESSAGES).sort())
  })

  it('has no empty strings on either side', () => {
    const empty = (dictionary: Record<string, string>) =>
      Object.entries(dictionary)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => key)
    expect(empty(EN_MESSAGES)).toEqual([])
    expect(empty(ZH_MESSAGES)).toEqual([])
  })

  it('only asks for keys it defines', () => {
    const unknown = [...requestedKeys()]
      .filter(([key]) => !(key in EN_MESSAGES))
      .map(([key, file]) => `${file}: ${key}`)
    expect(unknown).toEqual([])
  })

  it('covers every key of the library string contract', () => {
    const declared = Object.keys((contract as { keys: Record<string, unknown> }).keys).sort()
    expect(Object.keys(LIBRARY_STRINGS_ZH).sort()).toEqual(declared)
  })

  it('leaves the library English defaults alone', () => {
    // The bridge falls through to `defaultTranslate` for English, so a `jin.*`
    // entry would be a second, silently divergent copy of the library's own
    // wording.
    expect(Object.keys(EN_MESSAGES).filter((key) => key.startsWith('jin.'))).toEqual([])
  })
})
