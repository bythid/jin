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

export const regionOffset = ref<RegionOffsetState>({ x: 0, y: 0, unit: 'px' })
