/**
 * The one way to declare an injection key in this library.
 *
 * `Symbol.for` puts the key in the global registry, where the same string is the
 * same symbol everywhere — including in a second copy of this library. A plain
 * `Symbol('jin-overlay')` is unique per evaluation, so a host that loads two
 * copies (a bundler pre-bundling one and serving the other from source, two
 * versions in a monorepo, a micro-frontend) ends up with two keys that merely
 * look alike: the plugin provides its controller under one, a component from the
 * other copy looks up the second, misses, and silently falls back to a private
 * one. Nothing throws — overlays stop being layered, Escape stops routing to the
 * topmost overlay, translations and theme revert to the library defaults.
 *
 * Applications are not affected by the registry being shared: `app.provide` is
 * still per app, so two Vue apps on one page keep their own controllers.
 */
import type { InjectionKey } from 'vue'

export function injectionKey<T>(name: string): InjectionKey<T> {
  return Symbol.for(`jin.${name}`) as InjectionKey<T>
}
