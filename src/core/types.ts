/**
 * Shared vocabulary. Pure types only — no Vue, no DOM.
 */

/** Semantic tone used by feedback components. */
export type Tone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'

/** Visual tone a tree row may carry. The library only translates it, never interprets it. */
export type TreeTone = 'default' | 'muted' | 'warning' | 'danger'

export type Size = 'sm' | 'md' | 'lg'

export type Orientation = 'horizontal' | 'vertical'

export type Side = 'top' | 'right' | 'bottom' | 'left'

export type Alignment = 'start' | 'center' | 'end'

export type Placement = Side | `${Side}-${Alignment}`

export type { Layer } from './layer'

export interface Identifiable {
  id: string
}
