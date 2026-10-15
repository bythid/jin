/**
 * Tooltip trigger — the decision of when a hover/focus-triggered hint opens
 * and closes, separated from both the listeners and the clock.
 *
 * Hover and focus are two independent *intents*; either one may open the
 * tooltip and the tooltip stays open while at least one intent is live. Each
 * intent arms its own delay on entry and is cancelled by leaving, so a quick
 * swipe never opens and a pending open never opens after its owner left.
 *
 * The machine never owns a timer: a pending phase is a state the DOM host
 * reads from the snapshot, schedules with its own setTimeout and commits back
 * with 'open-due' / 'close-due'. That keeps the whole thing synchronous and
 * testable.
 *
 * 'press' and 'escape' close immediately and set `suppressed`: re-showing
 * requires a real boundary crossing (leave) first — a click focuses the
 * anchor's control and would otherwise re-open the hint the mouse is still
 * standing in, and an Escape while focus stays inside would undo itself on any
 * refocus.
 */
export type TriggerEvent =
  | 'hover-enter'
  | 'hover-leave'
  | 'focus-enter'
  | 'focus-leave'
  | 'press'
  | 'escape'
  | 'open-due'
  | 'close-due'
  | 'dismiss'
  | 'reset'

/** 'open-pending' / 'close-pending' are read by the host and drove by timers. */
export type TriggerPhase = 'closed' | 'open-pending' | 'open' | 'close-pending'

export interface TriggerState {
  /** Pointer is inside the anchor (or at least one of its descendants). */
  hovering: boolean
  /** Focus is inside the anchor. */
  focused: boolean
  phase: TriggerPhase
  /** A press or Escape pinned it closed until a leave of either channel. */
  suppressed: boolean
}

export interface TriggerMachineOptions {
  /** ms from the first entering event until the open commits. */
  openDelay: () => number
  /** ms from the last leaving event until the close commits. */
  closeDelay: () => number
  /** While true no phase may leave 'closed'. */
  disabled: () => boolean
}

export interface TriggerMachine {
  event(event: TriggerEvent): void
  state(): Readonly<TriggerState>
  subscribe(listener: () => void): () => void
}

interface InternalState {
  hovering: boolean
  focused: boolean
  phase: TriggerPhase
  suppressed: boolean
}

const CLOSED: InternalState = { hovering: false, focused: false, phase: 'closed', suppressed: false }

export function createTooltipTrigger(options: TriggerMachineOptions): TriggerMachine {
  let state: InternalState = { ...CLOSED }
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of [...listeners]) listener()
  }

  function step(next: InternalState): void {
    if (
      next.hovering === state.hovering &&
      next.focused === state.focused &&
      next.phase === state.phase &&
      next.suppressed === state.suppressed
    ) {
      return
    }
    state = next
    notify()
  }

  /**
   * An intent entering arms the open; a delay of 0 commits immediately, so a
   * pending phase always stands for one scheduled timer — the host never has
   * to guess a delay from its config.
   */
  function armOpen(current: InternalState): InternalState {
    if (options.disabled()) return { ...current, phase: 'closed' }
    const delay = Math.max(options.openDelay(), 0)
    return delay <= 0 ? { ...current, phase: 'open' } : { ...current, phase: 'open-pending' }
  }

  function armClose(current: InternalState): InternalState {
    const delay = Math.max(options.closeDelay(), 0)
    return delay <= 0 ? { ...current, phase: 'closed' } : { ...current, phase: 'close-pending' }
  }

  return {
    event(event) {
      const {
        hovering,
        focused,
        suppressed,
      } = state

      switch (event) {
        case 'hover-enter':
        case 'focus-enter': {
          const isHover = event === 'hover-enter'
          const next = { ...state, hovering: isHover || hovering, focused: !isHover || focused }
          // A press/Escape pinned this cycle closed: only a leave of either
          // channel (a real boundary crossing) may re-open.
          if (suppressed || options.disabled()) {
            step(next)
            return
          }
          if (next.phase === 'close-pending') {
            // Re-entered before the close committed: it was already open,
            // keep it open without a fresh open delay.
            step({ ...next, phase: 'open' })
            return
          }
          if (next.phase === 'closed') step(armOpen(next))
          return
        }

        case 'hover-leave':
        case 'focus-leave': {
          const wasHover = event === 'hover-leave'
          const next = { ...state, hovering: wasHover ? false : hovering, focused: wasHover ? focused : false }
          // The leave is itself the reset a suppressed cycle waits for.
          if (suppressed) {
            step({ ...next, phase: 'closed', suppressed: false })
            return
          }
          if (next.hovering || next.focused) return // stay open for the live intent
          if (state.phase === 'open-pending') step({ ...next, phase: 'closed' }) // left before it opened
          else if (state.phase === 'open') step(armClose(next))
          return
        }

        case 'press':
        case 'escape': {
          // Close at once and pin the cycle: a click puts focus inside the
          // anchor and the following focus would immediately undo the close.
          if (!suppressed && state.phase !== 'closed') step({ ...CLOSED, suppressed: true })
          else if (!suppressed) step({ ...state, suppressed: true, hovering: false, focused: false })
          return
        }

        case 'open-due': {
          if (state.phase !== 'open-pending') return
          if (options.disabled() || suppressed || !(state.hovering || state.focused)) {
            step({ ...state, phase: 'closed' })
            return
          }
          step({ ...state, phase: 'open' })
          return
        }

        case 'close-due': {
          if (state.phase !== 'close-pending') return
          if (!options.disabled() && !suppressed && (state.hovering || state.focused)) {
            step({ ...state, phase: 'open' })
            return
          }
          step({ ...state, phase: 'closed' })
          return
        }

        case 'dismiss': {
          // External close (shared stack, host). No close delay: the dismissal
          // reason is already a decision someone else made.
          if (state.phase !== 'closed') step({ ...state, phase: 'closed' })
          return
        }

        case 'reset': {
          step({ ...CLOSED })
          return
        }
      }
    },

    state() {
      return { ...state }
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
