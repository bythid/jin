// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
// The sheet as a string, through the same pipeline that ships it.
import stylesheetSource from '../src/styles/jin.css?raw'
import { createOverlayController } from '../src/composables/useOverlay'

/*
 * The portal contract (see docs/architecture.md): the container is anchored to
 * the viewport, and the controller adds no inline layout of its own. jsdom has
 * no layout engine, so no behavioural test can catch a violation — the elements
 * would still exist and answer events from below the fold. Each half is pinned
 * where it lives instead: the element's inline style here, the stylesheet rule
 * below.
 */

function rule(selector: string): Record<string, string> {
  const source = stylesheetSource.replace(/\/\*[\s\S]*?\*\//g, '')
  const start = source.indexOf(`${selector} {`)
  if (start === -1) return {}
  const end = source.indexOf('}', start)
  const declarations: Record<string, string> = {}
  for (const part of source.slice(start + selector.length + 2, end).split(';')) {
    const colon = part.indexOf(':')
    if (colon !== -1) declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim()
  }
  return declarations
}

describe('the portal contract', () => {
  afterEach(() => {
    document.querySelectorAll('.jin-portal').forEach((node) => node.remove())
  })

  it('builds the portal without inline layout', () => {
    createOverlayController({ eager: true })
    const portal = document.querySelector<HTMLElement>('.jin-portal')
    expect(portal?.parentElement).toBe(document.body)
    // Inline styles win over the stylesheet, and an inline `position: relative`
    // would replace the anchoring rule and drag every overlay below the fold of
    // a viewport-filling host.
    expect(portal?.getAttribute('style')).toBeNull()
  })

  it('anchors the portal to the viewport', () => {
    expect(rule('.jin-portal')).toMatchObject({
      position: 'fixed',
      inset: '0',
      'pointer-events': 'none',
    })
  })

  it('hands pointer events back to each overlay', () => {
    expect(rule('.jin-portal > *')['pointer-events']).toBe('auto')
  })
})
