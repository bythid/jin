/**
 * Tauri bridge. Everything native lives behind this module so the browser
 * build never imports a plugin that cannot work.
 */
import type { GalleryCapabilities } from './capabilities'

export function detectTauri(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as Record<string, unknown>
  return '__TAURI_INTERNALS__' in w || '__TAURI__' in w
}

/**
 * Capabilities for the desktop shell. `@tauri-apps/plugin-dialog` is imported
 * lazily: in a browser the dynamic import is never reached.
 */
export function tauriCapabilities(): GalleryCapabilities {
  if (!detectTauri()) {
    return {
      isDesktop: false,
      source: 'browser (no native capabilities; "Browse…" stays hidden)',
    }
  }

  const bridge: GalleryCapabilities = {
    isDesktop: true,
    source: 'tauri (dialog + clipboard plugins)',
    pickFolder: async (options) => {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        directory: true,
        multiple: false,
        title: options?.title,
        defaultPath: options?.defaultPath,
      })
      if (typeof selected === 'string') return selected
      return null
    },
    openExternal: async (url) => {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(url)
    },
  }

  return bridge
}
