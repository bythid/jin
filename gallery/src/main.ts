/**
 * Gallery entry point.
 *
 * Stylesheet order matters: the library's base sheet first, then the themes,
 * so the token layer is in place before any component paints.
 *
 * Every theme file is loaded up front. Because each one is self-contained —
 * it restates the whole token contract rather than relying on another file —
 * all of them can coexist, and switching a theme is nothing more than changing
 * the two attributes on <html>.
 */
import { createApp } from 'vue'
import { JinUI } from '@bythid/jin'
import '@bythid/jin/styles.css'
import '@bythid/jin/themes/jin.css'
import '@bythid/jin/themes/jin.dark.css'
import '@bythid/jin/themes/dimensional-layering.css'
import '@bythid/jin/themes/dimensional-layering.dark.css'
import '@bythid/jin/themes/brutalism.css'
import '@bythid/jin/themes/brutalism.dark.css'
import '@bythid/jin/themes/glassmorphism.css'
import '@bythid/jin/themes/glassmorphism.dark.css'
import '@bythid/jin/themes/neumorphism.css'
import '@bythid/jin/themes/neumorphism.dark.css'
import '@bythid/jin/themes/flat-design.css'
import '@bythid/jin/themes/flat-design.dark.css'
import '@bythid/jin/themes/claymorphism.css'
import '@bythid/jin/themes/claymorphism.dark.css'
import '@bythid/jin/themes/minimalism-and-swiss-style.css'
import '@bythid/jin/themes/minimalism-and-swiss-style.dark.css'
import '@bythid/jin/themes/neubrutalism.css'
import '@bythid/jin/themes/neubrutalism.dark.css'
import './gallery.css'
import App from './App.vue'
import { installCapabilities } from './host/capabilities'
import { loadLocale, loadPreferences, saveLocale, savePreferences } from './host/preferences'
import { createGalleryI18n, provideI18n } from './i18n'

const app = createApp(App)
const capabilities = installCapabilities()

const i18n = createGalleryI18n({
  // A stored choice wins; with none, a Chinese browser opens in Chinese.
  locale: loadLocale() ?? 'en',
  onChange: (locale) => saveLocale(locale),
})
provideI18n(app, i18n)

app.use(JinUI, {
  // The library's own strings — "Close", "Expand all", "No data" and the rest
  // of contracts/strings.json — come through the same dictionary. English
  // falls through to the library's readable defaults, so the default path the
  // Gallery is meant to demonstrate is still exactly what an English reader
  // gets; see src/i18n/library.ts.
  t: (key, vars) => i18n.jin(key, vars),
  // Capabilities come from the shell when present, and are simply absent in a
  // browser — which is exactly the intended degradation path.
  capabilities,
  theme: {
    // Style and mode survive a reload; this is the application's job, not the
    // library's own job.
    ...loadPreferences(),
    onChange: (snapshot) => savePreferences(snapshot),
  },
})

app.mount('#app')
