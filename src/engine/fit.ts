import {
  BAR_WIDTH_MAX,
  BAR_WIDTH_MIN,
  BAR_WIDTH_STEP,
  CRANK_INSEAM_RATIO,
  CRANK_SIZES,
  DEFAULT_BAR_REACH,
  INSEAM_RATIO_RANGE,
  LEGDIFF_IGNORE,
  LEGDIFF_LARGE,
  SADDLE_STEP_LIMIT,
  SHORT_CRANK_RATIO,
  SHORT_CRANK_SIZES,
  STABILITY_SADDLE_DROP,
} from './constants'
import { classifyMismatch, handPosition, headTop, solveCockpit, stemClampPoint } from './cockpit'
import { PROFILES } from './profiles'
import { riderPose } from './rider'
import { saddleHeight, saddlePosition } from './saddle'
import type { Comparison, FitInput, FitResult, FitWarning } from './types'

const snap = (v: number, step: number) => Math.round(v / step) * step

export function recommendCrank(inseam: number, short = false): number {
  const raw = (short ? SHORT_CRANK_RATIO : CRANK_INSEAM_RATIO) * inseam
  const sizes = short ? SHORT_CRANK_SIZES : CRANK_SIZES
  return sizes.reduce((best, c) => (Math.abs(c - raw) < Math.abs(best - raw) ? c : best))
}

export function recommendBarWidth(shoulderWidth: number, narrowing: number): number {
  const w = snap(shoulderWidth - narrowing, BAR_WIDTH_STEP)
  return Math.min(BAR_WIDTH_MAX, Math.max(BAR_WIDTH_MIN, w))
}

export function computeFit(input: FitInput): FitResult {
  const { body, goal, frame, current, adapt } = input
  const warnings: FitWarning[] = []
  const notes: string[] = []

  const ratio = body.inseam / body.height
  if (ratio < INSEAM_RATIO_RANGE[0] || ratio > INSEAM_RATIO_RANGE[1]) {
    warnings.push({ code: 'inseam_ratio', params: { ratio: Number(ratio.toFixed(3)) } })
  }

  // 1. saddle height (uses the crank the rider actually has; default = formula's crank)
  // a rider with limited bend gets the shorter crank, and the saddle formula follows the crank
  const crankLength = recommendCrank(body.inseam, !!adapt?.limitedFlexion)
  const crankForSaddle = current?.crankLength ?? (adapt?.limitedFlexion ? crankLength : undefined)
  let height = saddleHeight(body.inseam, crankForSaddle)
  if (adapt?.stability) {
    height -= STABILITY_SADDLE_DROP
    warnings.push({ code: 'adapt_stability', params: { n: STABILITY_SADDLE_DROP } })
  }
  if (current?.saddleHeight !== undefined) {
    const change = height - current.saddleHeight
    if (Math.abs(change) > SADDLE_STEP_LIMIT) {
      warnings.push({ code: 'saddle_change_large', params: { change: Math.abs(Math.round(change)) } })
    }
  }
  notes.push('saddle_starting_value')

  // 2. saddle fore/aft
  const saddle = saddlePosition(height, goal, frame.sta)
  if (saddle.railOutOfRange) {
    warnings.push({ code: 'rail_out_of_range', params: { rail: Math.abs(Math.round(saddle.railOffset)) } })
  }

  // 3. target hands
  const pose = riderPose(body, goal, saddle.point, adapt)
  if (pose.flexibilityLimited) {
    warnings.push({ code: 'flexibility_limited', params: { torsoAngle: pose.torsoAngle } })
  }

  // 4. cockpit solve
  const barReach = current?.barReach ?? DEFAULT_BAR_REACH
  const sol = solveCockpit(pose.hands, frame, barReach, undefined, PROFILES[goal])
  const frameMismatch = classifyMismatch(sol)
  if (frameMismatch === 'too_large') warnings.push({ code: 'frame_too_large' })
  if (frameMismatch === 'too_small') warnings.push({ code: 'frame_too_small' })

  if (pose.adaptRaised) warnings.push({ code: 'adapt_upright', params: { torsoAngle: pose.torsoAngle } })

  // leg length difference: saddle follows the longer leg (inseam is for it), shim the shorter
  const diff = adapt?.legLengthDiff ?? 0
  const shim = diff >= LEGDIFF_IGNORE ? Math.round(diff) : 0
  if (diff > LEGDIFF_LARGE) warnings.push({ code: 'legdiff_large', params: { mm: Math.round(diff) } })

  // 5. other
  notes.push('crank_reference_only')
  if (adapt?.limitedFlexion) notes.push('adapt_flexion')
  if (adapt?.uprightBack) notes.push('adapt_back')
  if (adapt?.reducedUpperLimb) notes.push('adapt_upper')
  if (adapt?.prosthesis) notes.push('adapt_prosthesis')
  if (adapt?.stability) notes.push('adapt_stability')
  const barWidth = recommendBarWidth(body.shoulderWidth, PROFILES[goal].barNarrowing)

  const result: FitResult = {
    saddleHeight: Math.round(height * 10) / 10,
    saddleSetback: saddle.setback,
    seatpostSetback: saddle.seatpostSetback,
    railOffset: saddle.railOffset,
    stemLength: sol.stemLength,
    stemAngle: sol.stemAngle,
    spacers: sol.spacers,
    barWidth,
    crankLength,
    frameMismatch,
    cockpitError: Math.round(sol.error * 10) / 10,
    shim,
    torsoAngle: pose.torsoAngle,
    warnings,
    notes,
    comparison: [],
    geometry: {
      saddle: saddle.point,
      hip: pose.hip,
      shoulder: pose.shoulder,
      targetHands: pose.hands,
      hands: handPosition(frame, sol, barReach),
      stemClamp: stemClampPoint(frame, sol),
      headTop: headTop(frame),
    },
  }

  if (current) {
    const rows: [string, number | undefined, number][] = [
      ['saddleHeight', current.saddleHeight, result.saddleHeight],
      ['stemLength', current.stemLength, result.stemLength],
      ['stemAngle', current.stemAngle, result.stemAngle],
      ['spacers', current.spacers, result.spacers],
      ['crankLength', current.crankLength, result.crankLength],
    ]
    result.comparison = rows
      .filter((r): r is [string, number, number] => r[1] !== undefined)
      .map<Comparison>(([key, cur, rec]) => ({ key, current: cur, recommended: rec, delta: rec - cur }))
  }
  return result
}
