/**
 * Capability injection helpers. Kept next to the plugin so the two halves of
 * `app.use(JinUI, { capabilities })` live together.
 */
import { inject, type App, type InjectionKey } from 'vue'
import { capabilitiesKey, EMPTY_CAPABILITIES, type JinCapabilities } from './capabilities'

export function provideCapabilities(app: App, capabilities: JinCapabilities): void {
  app.provide(capabilitiesKey, capabilities)
}

export function useCapabilities(): JinCapabilities {
  return inject<JinCapabilities>(capabilitiesKey, EMPTY_CAPABILITIES)
}

/** Normalises an optional capability object; absent capabilities degrade. */
export function resolveCapabilities(capabilities?: JinCapabilities | null): JinCapabilities {
  return capabilities ?? EMPTY_CAPABILITIES
}

export { capabilitiesKey }
export type { JinCapabilities }
