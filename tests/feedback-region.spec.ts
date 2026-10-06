// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import JinNotificationRegion from '../src/components/JinNotificationRegion.vue'
import JinToastRegion from '../src/components/JinToastRegion.vue'
import { useNotifications, useToasts, type FeedbackStore } from '../src/composables/useFeedback'
import { JinUI } from '../src/index'

/**
 * The region reads its store through injection, so each test mounts a host
 * that captures the injected store and passes the offset through to the
 * region — the same wiring an application has.
 */
function mountRegion(component: typeof JinToastRegion | typeof JinNotificationRegion, offset: unknown) {
  const captured: { store?: FeedbackStore } = {}
  const Host = defineComponent({
    setup() {
      captured.store = component === JinToastRegion ? useToasts() : useNotifications()
      return () => h(component, { offset } as never)
    },
  })
  const wrapper = mount(Host, {
    global: { plugins: [[JinUI, {}]] as never },
    attachTo: document.body,
  })
  return { wrapper, store: captured.store as FeedbackStore }
}

describe('feedback region offset', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  beforeEach(() => {
    document.body.innerHTML = ''
    document.querySelectorAll('.jin-portal').forEach((node) => node.remove())
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('shifts the whole toast sequence with a pixel offset', async () => {
    const mounted = mountRegion(JinToastRegion, { x: 12, y: -8 })
    wrapper = mounted.wrapper
    mounted.store.push({ tone: 'info', title: 'Shifted' })
    await nextTick()
    const region = document.querySelector('.jin-toast-region--top-end') as HTMLElement
    expect(region).not.toBeNull()
    expect(region.style.transform).toBe('translate(12px, -8px)')
    expect(region.style.zIndex).toContain('--jin-z-toast')
    expect(region.textContent).toContain('Shifted')
  })

  it('resolves percent against the viewport and keeps the centered variant centered', async () => {
    const mounted = mountRegion(JinToastRegion, { x: 10, y: 5, unit: 'percent' })
    wrapper = mounted.wrapper
    const top = document.querySelector('.jin-toast-region--top') as HTMLElement
    const end = document.querySelector('.jin-toast-region--top-end') as HTMLElement
    expect(top.style.transform).toBe('translateX(calc(-50% + 10vw)) translateY(5vh)')
    expect(end.style.transform).toBe('translate(10vw, 5vh)')
  })

  it('leaves the inline transform out for an empty offset', async () => {
    const mounted = mountRegion(JinToastRegion, {})
    wrapper = mounted.wrapper
    const region = document.querySelector('.jin-toast-region--top-end') as HTMLElement
    expect(region.style.transform).toBe('')
  })

  it('offsets the notification sequence the same way', async () => {
    const mounted = mountRegion(JinNotificationRegion, { x: -24 })
    wrapper = mounted.wrapper
    mounted.store.push({ tone: 'warning', title: 'Careful' })
    await nextTick()
    const region = document.querySelector('.jin-notification-region--top-end') as HTMLElement
    expect(region.style.transform).toBe('translate(-24px, 0px)')
    expect(region.textContent).toContain('Careful')
  })

  it('tracks offset prop changes reactively', async () => {
    const offset = ref<{ x?: number; y?: number } | undefined>({ x: 0, y: 0 })
    const captured: { store?: FeedbackStore } = {}
    const Host = defineComponent({
      setup() {
        captured.store = useToasts()
        return () => h(JinToastRegion, { offset: offset.value })
      },
    })
    wrapper = mount(Host, { global: { plugins: [[JinUI, {}]] as never }, attachTo: document.body })
    captured.store?.push({ tone: 'info', title: 'Live' })
    await nextTick()
    const region = () => document.querySelector('.jin-toast-region--top-end') as HTMLElement
    expect(region().style.transform).toBe('')
    offset.value = { x: 40 }
    await nextTick()
    expect(region().style.transform).toBe('translate(40px, 0px)')
  })
})
