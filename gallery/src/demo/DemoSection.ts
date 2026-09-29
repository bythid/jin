/**
 * Shared demo scaffolding. Every catalogue page is built from these two
 * components, so all pages look alike and the page files stay about the
 * controls themselves.
 */
import { defineComponent, h, type PropType, type Slots } from 'vue'

export const DemoSection = defineComponent({
  name: 'DemoSection',
  props: {
    title: { type: String, required: true },
    note: { type: String, default: '' },
    stacked: { type: Boolean, default: false },
    plain: { type: Boolean, default: false },
  },
  setup(props: { title: string; note: string; stacked: boolean; plain: boolean }, { slots }: { slots: Slots }) {
    return () =>
      h('section', { class: 'gallery-section' }, [
        h('h2', { class: 'gallery-section__title' }, props.title),
        props.note ? h('p', { class: 'gallery-section__note' }, props.note) : null,
        h(
          'div',
          {
            class: [
              'gallery-demo',
              { 'gallery-demo--stack': props.stacked, 'gallery-demo--plain': props.plain },
            ],
          },
          slots.default?.(),
        ),
      ])
  },
})

export const DemoPage = defineComponent({
  name: 'DemoPage',
  props: {
    title: { type: String, required: true },
    lead: { type: String, default: '' },
  },
  setup(props: { title: string; lead: string }, { slots }: { slots: Slots }) {
    return () =>
      h('article', { class: 'gallery-page' }, [
        h('h1', { class: 'gallery-page__title' }, props.title),
        props.lead ? h('p', { class: 'gallery-page__lead' }, props.lead) : null,
        slots.default?.(),
      ])
  },
})

export const StateGrid = defineComponent({
  name: 'StateGrid',
  props: {
    columns: { type: Number as PropType<number>, default: 3 },
  },
  setup(props: { columns: number }, { slots }: { slots: Slots }) {
    const cls = props.columns === 2 ? 'gallery-grid gallery-grid--two' : 'gallery-grid gallery-grid--three'
    return () => h('div', { class: cls }, slots.default?.())
  },
})
