// @vitest-environment jsdom
/**
 * Duplicate module instances must not split the injection surface.
 *
 * The library promises one shared overlay stack (`docs/architecture.md`), one
 * theme controller, one translation context. Every one of those travels on an
 * `InjectionKey`, and a plain `Symbol('jin-overlay')` is unique per evaluation:
 * if a host ends up with two copies of the library — a bundler pre-bundling one
 * and serving the other from source, two versions in a monorepo, a
 * micro-frontend — the plugin provides its controller under copy A's key, a
 * component from copy B looks up copy B's key, misses, and quietly falls back
 * to a private one. Nothing throws; overlays just stop being layered, Escape
 * stops routing to the topmost one, and translations/theme silently revert to
 * the library defaults.
 *
 * `Symbol.for` puts the key in the global registry, where the same string is
 * the same symbol in every copy. These tests re-import the modules to get two
 * real copies in one process, which is the failure the registry entry prevents.
 */
import { createApp } from 'vue'
import { describe, expect, it, vi } from 'vitest'

/** Load the same module twice, as two separate evaluations. */
async function twoCopies<T>(load: () => Promise<T>): Promise<[T, T]> {
  const first = await load()
  vi.resetModules()
  const second = await load()
  return [first, second]
}

describe('injection keys', () => {
  it('keeps one overlay key across module copies', async () => {
    const [a, b] = await twoCopies(() => import('../src/composables/useOverlay'))
    expect(a.overlayKey).toBe(b.overlayKey)
    expect(Symbol.keyFor(a.overlayKey)).toBe('jin.overlay')
  })

  it('keeps every other key in the global registry too', async () => {
    const keys = async () => ({
      field: (await import('../src/components/field-context')).fieldContextKey,
      toasts: (await import('../src/composables/useFeedback')).toastsKey,
      notifications: (await import('../src/composables/useFeedback')).notificationsKey,
      capabilities: (await import('../src/injection/capabilities')).capabilitiesKey,
      translation: (await import('../src/injection/strings')).translationKey,
      theme: (await import('../src/injection/theme')).themeKey,
    })
    const [a, b] = await twoCopies(keys)
    for (const name of Object.keys(a) as (keyof typeof a)[]) {
      expect(Symbol.keyFor(a[name]), `${name} is not in the global registry`).toMatch(/^jin\./)
      expect(a[name], `${name} differs between copies`).toBe(b[name])
    }
  })

  it('lets a component from another copy find the provided controller', async () => {
    const a = await import('../src/composables/useOverlay')
    vi.resetModules()
    const b = await import('../src/composables/useOverlay')

    const provided = a.createOverlayController()
    let seen: unknown = null
    const app = createApp({
      setup() {
        // Copy B's lookup, against an app that copy A provided for.
        seen = b.useOverlay()
        return () => null
      },
    })
    a.provideOverlay(app, provided)
    app.mount(document.createElement('div'))

    expect(seen).toBe(provided)
  })
})
