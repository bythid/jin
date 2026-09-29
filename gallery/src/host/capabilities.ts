/**
 * Host capability wiring.
 *
 * Under Tauri the folder picker and clipboard come from the native plugins.
 * In a plain browser those capabilities are simply absent, and the library
 * degrades: the "Browse…" button is not rendered at all.
 */
import { detectTauri, tauriCapabilities } from './tauri'

export interface GalleryCapabilities {
  pickFolder?: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>
  openExternal?: (url: string) => Promise<void>
  writeClipboard?: (text: string) => Promise<void>
  readClipboard?: () => Promise<string | null>
  /** True when running inside the desktop shell. */
  isDesktop: boolean
  /** Human-readable description of where capabilities came from. */
  source: string
}

let installed: GalleryCapabilities = { isDesktop: false, source: 'browser' }

export function installCapabilities(): GalleryCapabilities {
  installed = tauriCapabilities()
  return installed
}

export function getCapabilities(): GalleryCapabilities {
  return installed
}

export { detectTauri }
