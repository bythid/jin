/**
 * Whole-stack offsets for the feedback regions. A region pins itself to a
 * viewport corner; an offset shifts the entire sequence — every message in
 * it — by a signed amount. The direction is physical and absolute (+x right,
 * +y down) regardless of which corner anchors the region, and there is no RTL
 * mirroring: the values are explicit coordinates, not flow-relative ones.
 *
 * Percentages resolve against the viewport (the region's fixed containing
 * block). An offset may push messages off-screen; the queue neither reflows
 * around offset messages nor clamps them — the caller owns the values.
 */
import type { QueuePosition } from './queue'

export interface RegionOffset {
  x?: number
  y?: number
  /** `px` (default) or `percent` of the viewport width / height. */
  unit?: 'px' | 'percent'
}

/** The two regions that center themselves with translateX(-50%). */
const CENTERED: readonly QueuePosition[] = ['top', 'bottom']

/**
 * The inline transform a region carries for `offset`, or undefined when the
 * offset is empty — an absent style keeps the stylesheet's positioning.
 * The centered regions center themselves through translateX(-50%); an inline
 * transform replaces the stylesheet's, so it has to carry the centering.
 */
export function regionTransform(position: QueuePosition, offset: RegionOffset | undefined): string | undefined {
  if (!offset) return undefined
  const x = offset.x ?? 0
  const y = offset.y ?? 0
  if (x === 0 && y === 0) return undefined
  const ux = offset.unit === 'percent' ? 'vw' : 'px'
  const uy = offset.unit === 'percent' ? 'vh' : 'px'
  if (CENTERED.includes(position)) {
    return `translateX(calc(-50% + ${x}${ux})) translateY(${y}${uy})`
  }
  return `translate(${x}${ux}, ${y}${uy})`
}
