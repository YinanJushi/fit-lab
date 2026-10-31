import type { Goal } from './types'

export type BikeKind = 'road' | 'gravel' | 'cyclocross' | 'touring'

/**
 * Suggested tire width range (mm) by bike type and goal. Grade C: general guidance, not
 * from a fit study (经验值，待验证). Gravel tires are wider; faster goals go narrower.
 */
export const TIRE_WIDTH_RANGE: Record<BikeKind, Record<Goal, [number, number]>> = {
  road: {
    comfort: [32, 35],
    endurance: [30, 32],
    race: [28, 30],
    aero: [25, 28],
  },
  gravel: {
    comfort: [40, 45],
    endurance: [38, 42],
    race: [35, 40],
    aero: [35, 38],
  },
  // cyclocross racing is capped at 33 mm by UCI rules; leisure riders usually go wider
  cyclocross: {
    comfort: [38, 42],
    endurance: [35, 40],
    race: [33, 35],
    aero: [33, 33],
  },
  touring: {
    comfort: [38, 47],
    endurance: [35, 42],
    race: [32, 35],
    aero: [28, 32],
  },
}

export interface TireAdvice {
  min: number
  max: number
  /** the frame's max clearance if known, which capped the range */
  frameMax: number | null
  /** true when the frame cannot take any width in the usual range for this goal */
  frameLimited: boolean
}

export function recommendTires(kind: BikeKind, goal: Goal, frameMax?: number): TireAdvice {
  const [lo, hi] = TIRE_WIDTH_RANGE[kind][goal]
  if (frameMax === undefined) return { min: lo, max: hi, frameMax: null, frameLimited: false }
  const max = Math.min(hi, frameMax)
  const min = Math.min(lo, max)
  return { min, max, frameMax, frameLimited: frameMax < lo }
}
