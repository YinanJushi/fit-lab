// Rank every size of a bike (and many bikes) against one rider. The rider's target hand
// position does not depend on the frame, so it is computed once and only the cockpit
// solver runs per size.
import { DEFAULT_BAR_REACH, MISMATCH_ERROR } from './constants'
import { classifyMismatch, solveCockpit } from './cockpit'
import { computeFit } from './fit'
import { PROFILES } from './profiles'
import type { FitInput, FrameGeometry, FrameMismatch, Point } from './types'

export type SizeVerdict = 'best' | 'good' | 'stretch' | 'too_small' | 'too_large'

export interface SizeRow {
  label: string
  stack: number
  reach: number
  error: number
  verdict: SizeVerdict
  mismatch: FrameMismatch
}

export type LabelledFrame = FrameGeometry & { label: string }
export type RiderInput = Omit<FitInput, 'frame'>

/** Hands the rider wants, from the same maths computeFit uses. */
export function targetHands(rider: RiderInput, anyFrame: FrameGeometry): Point {
  return computeFit({ ...rider, frame: anyFrame }).geometry.targetHands
}

function rate(target: Point, f: LabelledFrame, rider: RiderInput): SizeRow {
  const barReach = rider.current?.barReach ?? DEFAULT_BAR_REACH
  const sol = solveCockpit(target, f, barReach, undefined, PROFILES[rider.goal])
  const mismatch = classifyMismatch(sol)
  let verdict: SizeVerdict
  if (sol.error > MISMATCH_ERROR) verdict = mismatch === 'too_small' ? 'too_small' : 'too_large'
  else verdict = mismatch === null ? 'good' : 'stretch'
  return { label: f.label, stack: f.stack, reach: f.reach, error: Math.round(sol.error * 10) / 10, verdict, mismatch }
}

const score = (r: SizeRow) => r.error + (r.verdict === 'stretch' ? 10 : 0)
const usable = (r: SizeRow) => r.verdict === 'good' || r.verdict === 'stretch'

/** Rate each size; the lowest-score usable one is marked `best`. Order follows the input. */
export function evaluateSizes(frames: LabelledFrame[], rider: RiderInput): SizeRow[] {
  if (frames.length === 0) return []
  const target = targetHands(rider, frames[0])
  const rows = frames.map((f) => rate(target, f, rider))
  const ok = rows.filter(usable)
  if (ok.length > 0) {
    const best = ok.reduce((a, b) => (score(b) < score(a) ? b : a))
    best.verdict = 'best'
  }
  return rows
}

export interface BikeMatch<B> {
  bike: B
  size: SizeRow
}

/** Best size of each bike for this rider; bikes with no usable size are dropped. Best first. */
export function matchBikes<B extends { sizes: LabelledFrame[] }>(
  bikes: B[],
  rider: RiderInput,
  limit = 30,
): BikeMatch<B>[] {
  if (bikes.length === 0) return []
  const target = targetHands(rider, bikes[0].sizes[0])
  const out: BikeMatch<B>[] = []
  for (const bike of bikes) {
    let best: SizeRow | null = null
    for (const f of bike.sizes) {
      const row = rate(target, f, rider)
      if (usable(row) && (best === null || score(row) < score(best))) best = row
    }
    if (best) {
      best.verdict = 'best'
      out.push({ bike, size: best })
    }
  }
  return out.sort((a, b) => score(a.size) - score(b.size)).slice(0, limit)
}
