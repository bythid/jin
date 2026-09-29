// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STYLESHEET_IMPORT, missingStylesheetWarning, warnIfStylesheetMissing } from '../src/injection/stylesheet'

// That `src/styles/jin.css` really declares the marker this module reads is
// checked mechanically by `tools/check_tokens.py`, because it is a contract
// between two files that neither one states on its own.

describe('the missing-stylesheet warning', () => {
  it('says nothing when the stylesheet is loaded', () => {
    expect(missingStylesheetWarning('1')).toBeNull()
  })

  it('names the exact import to add when it is not', () => {
    const message = missingStylesheetWarning('')
    expect(message).toContain(STYLESHEET_IMPORT)
  })

  it('tolerates a marker surrounded by whitespace', () => {
    expect(missingStylesheetWarning('  1\n')).toBeNull()
  })
})

describe('reading the marker off the portal', () => {
  // The install skips this in a test environment, because jsdom renders no
  // stylesheets and the marker is absent there by construction. Unset that
  // signal so the check itself is what runs.
  const asProduction = (): void => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VITEST', '')
  }

  const computedStyle = (marker: string): void => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => marker,
    } as unknown as CSSStyleDeclaration)
  }

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('warns once when the marker never arrived', () => {
    asProduction()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    computedStyle('')

    warnIfStylesheetMissing(document.createElement('div'))

    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain(STYLESHEET_IMPORT)
  })

  it('stays quiet when the marker is there', () => {
    asProduction()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    computedStyle('1')

    warnIfStylesheetMissing(document.createElement('div'))

    expect(warn).not.toHaveBeenCalled()
  })

  it('has nothing to say without a portal', () => {
    asProduction()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    warnIfStylesheetMissing(null)

    expect(warn).not.toHaveBeenCalled()
  })
})
