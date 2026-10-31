import {
  LEMOND_FACTOR,
  RAIL_RANGE,
  REFERENCE_CRANK,
  SEATPOST_SETBACKS,
} from './constants'
import { PROFILES } from './profiles'
import type { Goal, Point } from './types'

const rad = (deg: number) => (deg * Math.PI) / 180
const mid = ([a, b]: [number, number]) => (a + b) / 2

/** LeMond height with 1 mm per 1 mm crank correction (shorter crank -> higher saddle). */
export function saddleHeight(inseam: number, crankLength: number = REFERENCE_CRANK): number {
  return LEMOND_FACTOR * inseam + (REFERENCE_CRANK - crankLength)
}

export const targetEffectiveSta = (goal: Goal): number => mid(PROFILES[goal].effectiveSta)

/** Saddle point at height H along an angle `sta` from the BB. */
export function saddlePoint(height: number, staDeg: number): Point {
  return { x: -height * Math.cos(rad(staDeg)), y: height * Math.sin(rad(staDeg)) }
}

export interface SaddlePosition {
  point: Point // target saddle point
  /** rearward shift needed vs. the frame's seat-tube line (negative = forward) */
  setback: number
  seatpostSetback: number
  railOffset: number
  railOutOfRange: boolean
}

export function saddlePosition(height: number, goal: Goal, frameSta: number): SaddlePosition {
  const target = saddlePoint(height, targetEffectiveSta(goal))
  const onFrame = saddlePoint(height, frameSta)
  const setback = onFrame.x - target.x // moving back = more negative x
  // choose the post whose remainder leaves the smallest rail adjustment
  let best = SEATPOST_SETBACKS[0]
  for (const post of SEATPOST_SETBACKS) {
    if (Math.abs(setback - post) < Math.abs(setback - best)) best = post
  }
  const rail = setback - best
  return {
    point: target,
    setback,
    seatpostSetback: best,
    railOffset: rail,
    railOutOfRange: Math.abs(rail) > RAIL_RANGE,
  }
}
