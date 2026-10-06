/**
 * Shared demo state for the feedback regions: the app shell's
 * JinToastRegion / JinNotificationRegion follow this offset, and the feedback
 * page edits it, so the whole-sequence shift can be tried live against real
 * messages.
 */
import { ref } from 'vue'
import type { RegionOffset } from '@bythid/jin'

export interface RegionOffsetState {
  x: number
  y: number
  unit: 'px' | 'percent'
}

// 56px clears the gallery's sticky header (~55px) with a breath of gap. The
// feedback page's controls edit this state from there — zero it to watch the
// overlap come back.
export const regionOffset = ref<RegionOffsetState>({ x: 0, y: 56, unit: 'px' })
