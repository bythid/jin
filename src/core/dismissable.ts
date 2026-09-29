/**
 * "Should this overlay close?" — the decision, separated from the listeners.
 * Routing between nested overlays is the stack's job; this module only answers
 * for one overlay given the event and the stack position.
 */
export type DismissEvent = 'escape' | 'outside'

export interface DismissRules {
  closeOnEsc: boolean
  closeOnOutside: boolean
  /** Only the topmost overlay reacts, otherwise an Escape storm closes everything. */
  isTopmost: boolean
  /** While disabled (e.g. a busy dialog) nothing dismisses. */
  disabled?: boolean
}

export type DismissDecision = 'dismiss' | 'ignore'

export function decideDismiss(rules: DismissRules, event: DismissEvent): DismissDecision {
  if (rules.disabled) return 'ignore'
  if (!rules.isTopmost) return 'ignore'
  if (event === 'escape') return rules.closeOnEsc ? 'dismiss' : 'ignore'
  return rules.closeOnOutside ? 'dismiss' : 'ignore'
}
