/**
 * The plugin. `app.use(JinUI, options)` wires the four injection points
 * (translation, capabilities, theme, overlay stack) in one place.
 *
 * Components are NOT registered globally: applications import what they use,
 * which keeps tree-shaking honest and the naming discipline visible.
 */
import type { App, ObjectPlugin } from 'vue'
import { createTranslation, provideTranslation, type TranslateFn } from './strings'
import { provideOverlay, createOverlayController, type OverlayController } from '../composables/useOverlay'
import { provideCapabilities, resolveCapabilities } from './provide-capabilities'
import { createTheme, provideTheme, type ThemeOptions } from './theme'
import { provideFeedbackStores } from '../composables/useFeedback'
import { warnIfStylesheetMissing } from './stylesheet'
import type { JinCapabilities } from './capabilities'

export interface JinUIOptions {
  /** Translation function; omit to use the library's readable English defaults. */
  t?: TranslateFn
  /** Host capabilities; omit for graceful degradation. */
  capabilities?: JinCapabilities
  /** Theme defaults / persistence hook. */
  theme?: ThemeOptions
  /** Share one overlay controller across apps (tests, micro-frontends). */
  overlay?: OverlayController
}

export type JinUIPlugin = ObjectPlugin<[options?: JinUIOptions]> & {
  /** The overlay controller created for the installed app. */
  overlay: OverlayController | null
}

const plugin: JinUIPlugin = {
  overlay: null,
  install(app: App, options: JinUIOptions = {}): void {
    provideTranslation(app, createTranslation(options.t))
    provideCapabilities(app, resolveCapabilities(options.capabilities))
    const controller = options.overlay ?? createOverlayController({ eager: true })
    provideOverlay(app, controller)
    provideTheme(app, createTheme(options.theme ?? {}))
    provideFeedbackStores(app)
    plugin.overlay = controller
    warnIfStylesheetMissing(controller.root.value)
  },
}

/** Exported as default and named, so either import style works. */
export default plugin
export const JinUI = plugin
