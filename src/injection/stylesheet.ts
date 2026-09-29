/**
 * The one import an application writes by hand is the one it can forget, and
 * forgetting it is silent: every control renders, unstyled, and nothing raises
 * an error. The base stylesheet therefore sets a marker on the portal container
 * (`src/styles/jin.css`) and the plugin reads it back at install time.
 */

/** The custom property the stylesheet sets, and the plugin reads. */
export const STYLESHEET_MARKER = '--jin-stylesheet-loaded'

/** The specifier an application is told to import. */
export const STYLESHEET_IMPORT = '@bythid/jin/styles.css'

/** The message for a marker value, or null when the sheet is loaded. */
export function missingStylesheetWarning(markerValue: string): string | null {
  if (markerValue.trim()) return null
  return (
    '[@bythid/jin] The base stylesheet is not loaded, so every control renders unstyled. ' +
    `Import "${STYLESHEET_IMPORT}" once in your entry file.`
  )
}

/**
 * A test environment renders no stylesheets, so the marker is absent there by
 * construction and the warning would be noise.
 *
 * Read through `globalThis` rather than `import.meta.env`: a consumer's build
 * folds `import.meta.env` away, which would turn a `MODE` check into dead code
 * and warn inside every consumer's jsdom tests as well as our own.
 */
function isTestEnvironment(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
  return env?.NODE_ENV === 'test' || env?.VITEST === 'true'
}

/**
 * Says so, once, when the sheet never arrived — after `load`, because a
 * production build links its CSS rather than inlining it, and a stylesheet that
 * is still downloading must not be mistaken for a missing one.
 */
export function warnIfStylesheetMissing(portal: HTMLElement | null): void {
  if (!portal || typeof window === 'undefined' || isTestEnvironment()) return

  const check = (): void => {
    const marker = getComputedStyle(portal).getPropertyValue(STYLESHEET_MARKER)
    const message = missingStylesheetWarning(marker)
    if (message) console.warn(message)
  }

  if (document.readyState === 'complete') check()
  else window.addEventListener('load', check, { once: true })
}
