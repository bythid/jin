/**
 * Host capabilities. The library only declares what it needs and
 * degrades gracefully when a capability is absent: a browser that cannot pick
 * folders simply does not render the "Browse…" affordance.
 */
import type { InjectionKey } from 'vue'

export interface JinCapabilities {
  /** Returns an absolute path, or null when the user cancelled. */
  pickFolder?: (options?: { title?: string; defaultPath?: string }) => Promise<string | null>
  /** Opens a URL in the host's default browser. */
  openExternal?: (url: string) => Promise<void>
  /** Copies text through the host clipboard (the Tauri plugin when present). */
  writeClipboard?: (text: string) => Promise<void>
  /** Reads text through the host clipboard. */
  readClipboard?: () => Promise<string | null>
}

export const capabilitiesKey: InjectionKey<JinCapabilities> = Symbol('jin-capabilities')

export const EMPTY_CAPABILITIES: JinCapabilities = {}

export function canPickFolder(capabilities: JinCapabilities | null | undefined): boolean {
  return typeof capabilities?.pickFolder === 'function'
}

export function canOpenExternal(capabilities: JinCapabilities | null | undefined): boolean {
  return typeof capabilities?.openExternal === 'function'
}
