// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { useFocusTrap } from '../src/composables/useFocusTrap'

// The trap drives focusFirst/restoreFocus through a post-flush watcher that
// schedules one inner nextTick, so every state change waits for two ticks.
async function settle(): Promise<void> {
  await nextTick()
  await nextTick()
}

let active!: Ref<boolean>
let container!: Ref<HTMLElement | null>
let trap!: ReturnType<typeof useFocusTrap>

const Harness = defineComponent({
  setup(_, { expose }) {
    const containerRef = ref<HTMLElement | null>(null)
    const activeRef = ref(false)
    container = containerRef
    active = activeRef
    trap = useFocusTrap({ container: containerRef, active: activeRef })
    expose({})
    return () => h('div', { ref: containerRef, tabindex: -1 })
  },
})

describe('useFocusTrap focus return', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  function mountTrap() {
    return mount(Harness, { attachTo: document.body })
  }

  it('returns focus to the trigger that opened the overlay', async () => {
    const wrapper = mountTrap()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    trap.captureTrigger()
    active.value = true
    await settle()
    expect(document.activeElement).toBe(container.value)

    active.value = false
    await settle()
    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
  })

  it('returns focus to the nearest focusable ancestor when the trigger became unfocusable', async () => {
    const wrapper = mountTrap()
    const region = document.createElement('span')
    region.tabIndex = -1
    const trigger = document.createElement('button')
    region.appendChild(trigger)
    document.body.appendChild(region)
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    trigger.focus()

    trap.captureTrigger()
    active.value = true
    await settle()
    trigger.disabled = true

    active.value = false
    await settle()
    expect(document.activeElement).toBe(region)
    expect(document.activeElement).not.toBe(document.body)
    wrapper.unmount()
  })

  it('moves focus outside the container when the trigger was removed', async () => {
    const wrapper = mountTrap()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)
    trigger.focus()

    trap.captureTrigger()
    active.value = true
    await settle()
    trigger.remove()

    active.value = false
    await settle()
    expect(document.activeElement).toBe(elsewhere)
    wrapper.unmount()
  })

  it('lands on the first outside tabbable when nothing was focused at open', async () => {
    const wrapper = mountTrap()
    const elsewhere = document.createElement('button')
    document.body.appendChild(elsewhere)

    active.value = true
    await settle()
    expect(document.activeElement).toBe(container.value)

    active.value = false
    await settle()
    expect(document.activeElement).toBe(elsewhere)
    expect(document.activeElement).not.toBe(document.body)
    wrapper.unmount()
  })
})
