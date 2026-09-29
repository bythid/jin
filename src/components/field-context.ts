/**
 * Field context: how a form control learns the label / hint / error ids that a
 * surrounding `<JinField>` created, without the application wiring them by hand.
 *
 * A control used inside a field picks these up automatically; used standalone it
 * falls back to its own generated ids.
 */
import { inject, type InjectionKey, type Ref } from 'vue'

export interface FieldContext {
  labelId: string
  hintId: string
  errorId: string
  controlId: string
  /** Ready-made aria-describedby value (hint + error, whichever exist). */
  describedBy: Ref<string | undefined>
  invalid: Ref<boolean>
  required: Ref<boolean>
}

export const fieldContextKey: InjectionKey<FieldContext> = Symbol('jin-field')

export function useFieldContext(): FieldContext | null {
  return inject(fieldContextKey, null)
}

export function joinIds(...ids: (string | undefined | null | false)[]): string | undefined {
  const list = ids.filter((id): id is string => Boolean(id))
  return list.length > 0 ? list.join(' ') : undefined
}
