// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import JinCombobox from '../src/components/JinCombobox.vue'
import JinField from '../src/components/JinField.vue'
import { JinUI } from '../src/index'

function withPlugin(component: unknown, options: Record<string, unknown> = {}) {
  return mount(component as never, {
    global: { plugins: [[JinUI, {}]] as never },
    ...options,
  })
}

const options = [
  { value: 'arial', label: 'Arial' },
  { value: 'cascadia', label: 'Cascadia Code' },
  { value: 'caskaydia', label: 'CaskaydiaCove Nerd Font' },
  { value: 'consolas', label: 'Consolas' },
]

function portalListbox(): HTMLElement | null {
  return document.querySelector('.jin-portal .jin-combobox__listbox')
}

function listboxRows(): HTMLElement[] {
  return [...(portalListbox()?.querySelectorAll<HTMLElement>('[data-jin-combobox-option]') ?? [])]
}

async function type(wrapper: ReturnType<typeof withPlugin>, text: string): Promise<void> {
  const input = wrapper.get('input')
  input.element.value = text
  await input.trigger('input')
}

describe('JinCombobox', () => {
  let wrapper: ReturnType<typeof withPlugin> | null = null

  beforeEach(() => {
    // jsdom measures no layout and ships no scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn()
    document.body.innerHTML = ''
    document.querySelectorAll('.jin-portal').forEach((node) => node.remove())
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('renders a combobox input with popup semantics', () => {
    wrapper = withPlugin(JinCombobox, { props: { options, modelValue: 'arial' } })
    const input = wrapper.get('input')
    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-expanded')).toBe('false')
    expect(input.attributes('aria-autocomplete')).toBe('list')
    expect(input.element.value).toBe('Arial')
  })

  it('opens on focus with the whole list and the committed value active', async () => {
    wrapper = withPlugin(JinCombobox, { props: { options, modelValue: 'cascadia' }, attachTo: document.body })
    await wrapper.get('input').trigger('focus')
    await nextTick()
    const input = wrapper.get('input')
    expect(input.attributes('aria-expanded')).toBe('true')
    expect(input.attributes('aria-controls')).toContain('-listbox')
    const rows = listboxRows()
    expect(rows).toHaveLength(options.length)
    const activeId = input.attributes('aria-activedescendant')
    expect(activeId).toContain('-option-1')
    const active = document.getElementById(activeId ?? '')
    expect(active?.getAttribute('aria-selected')).toBe('true')
  })

  it('filters as the user types and commits the active option on Enter', async () => {
    wrapper = withPlugin(JinCombobox, { props: { options }, attachTo: document.body })
    await wrapper.get('input').trigger('focus')
    await type(wrapper, 'cask')
    await nextTick()
    const rows = listboxRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.textContent).toContain('CaskaydiaCove Nerd Font')
    // The match is highlighted in the default row rendering.
    expect(rows[0]?.querySelector('.jin-combobox__option-match')?.textContent).toBe('Cask')

    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['caskaydia'])
    const change = wrapper.emitted('change')?.at(-1)
    expect(change?.[0]).toBe('caskaydia')
    expect(change?.[1]).toMatchObject({ label: 'CaskaydiaCove Nerd Font' })
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('false')
  })

  it('shows a no-matches state when restricted and the filter matches nothing', async () => {
    wrapper = withPlugin(JinCombobox, { props: { options } , attachTo: document.body })
    await wrapper.get('input').trigger('focus')
    await type(wrapper, 'zzz')
    await nextTick()
    expect(portalListbox()?.textContent).toContain('No matches')
    expect(listboxRows()).toHaveLength(0)

    // Blur reverts instead of committing an unlisted value.
    await wrapper.get('input').trigger('blur')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('input').element.value).toBe('')
  })

  it('commits an unlisted value in free-entry mode when nothing matches', async () => {
    wrapper = withPlugin(JinCombobox, { props: { options, freeEntry: true }, attachTo: document.body })
    await wrapper.get('input').trigger('focus')
    await type(wrapper, 'My Custom Font')
    await nextTick()
    expect(portalListbox()?.textContent).toContain('Use "My Custom Font"')

    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['My Custom Font'])
    const change = wrapper.emitted('change')?.at(-1)
    expect(change?.[0]).toBe('My Custom Font')
    expect(change?.[1]).toBeNull()
  })

  it('commits the typed value on blur in free-entry mode', async () => {
    wrapper = withPlugin(
      {
        components: { JinCombobox },
        template: '<JinCombobox v-model="value" :options="options" free-entry />',
        data: () => ({ value: null as string | null, options }),
      },
      { attachTo: document.body },
    )
    await wrapper.get('input').trigger('focus')
    await type(wrapper as never, '  Somewhere Sans  ')
    await wrapper.get('input').trigger('blur')
    // Surrounding whitespace is trimmed on commit, and the input shows the
    // committed value afterwards.
    expect((wrapper.vm as { value: string | null }).value).toBe('Somewhere Sans')
    expect(wrapper.get('input').element.value).toBe('Somewhere Sans')
  })

  it('commits a listed option named by its label on blur, case-insensitively', async () => {
    wrapper = withPlugin(JinCombobox, { props: { options }, attachTo: document.body })
    await wrapper.get('input').trigger('focus')
    await type(wrapper, 'cascadia code')
    await wrapper.get('input').trigger('blur')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['cascadia'])
  })

  it('closes the popup on the first Escape and clears on the second', async () => {
    wrapper = withPlugin(JinCombobox, { props: { options, modelValue: 'consolas' }, attachTo: document.body })
    await wrapper.get('input').trigger('focus')
    await nextTick()
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('true')

    // While the popup is open the shared dismissal takes the Escape.
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })

  it('navigates with arrows and Home/End while open, skipping disabled rows', async () => {
    const disabled = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta', disabled: true },
      { value: 'c', label: 'Gamma' },
      { value: 'd', label: 'Delta' },
    ]
    wrapper = withPlugin(JinCombobox, { props: { options: disabled }, attachTo: document.body })
    const input = wrapper.get('input')
    await input.trigger('focus')
    await nextTick()
    expect(input.attributes('aria-activedescendant')).toContain('-option-0')

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toContain('-option-2')
    await input.trigger('keydown', { key: 'End' })
    expect(input.attributes('aria-activedescendant')).toContain('-option-3')
    await input.trigger('keydown', { key: 'Home' })
    expect(input.attributes('aria-activedescendant')).toContain('-option-0')
  })

  it('renders the #option slot for rich rows', async () => {
    wrapper = withPlugin(
      {
        components: { JinCombobox },
        template: `
          <JinCombobox v-model="value" :options="options">
            <template #option="{ option, selected }"><em>{{ option.label }}?{{ selected }}</em></template>
          </JinCombobox>`,
        data: () => ({ value: 'arial' as string | null, options }),
      },
      { attachTo: document.body },
    )
    await wrapper.get('input').trigger('focus')
    await nextTick()
    const rows = listboxRows()
    expect(rows[0]?.textContent).toContain('Arial?true')
    expect(rows[1]?.textContent).toContain('Cascadia Code?false')
  })

  it('inherits invalid state and description ids from a surrounding field', () => {
    wrapper = withPlugin({
      components: { JinField, JinCombobox },
      template: `<JinField label="Pick" error="Required"><JinCombobox :options="options" /></JinField>`,
      data: () => ({ options }),
    })
    const input = wrapper.get('input')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBeTruthy()
  })
})
