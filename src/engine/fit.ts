import {
  BAR_WIDTH_MAX,
  BAR_WIDTH_MIN,
  BAR_WIDTH_STEP,
  CRANK_INSEAM_RATIO,
  CRANK_SIZES,
  DEFAULT_BAR_REACH,
  INSEAM_RATIO_RANGE,
  SADDLE_STEP_LIMIT,
} from './constants'
import { classifyMismatch, handPosition, headTop, solveCockpit, stemClampPoint } from './cockpit'
import { PROFILES } from './profiles'
import { riderPose } from './rider'
import { saddleHeight, saddlePosition } from './saddle'
import type { Comparison, FitInput, FitResult, FitWarning } from './types'

const snap = (v: number, step: number) => Math.round(v / step) * step

export function recommendCrank(inseam: number): number {
  const raw = CRANK_INSEAM_RATIO * inseam
  return CRANK_SIZES.reduce((best, c) => (Math.abs(c - raw) < Math.abs(best - raw) ? c : best))
}

export function recommendBarWidth(shoulderWidth: number, narrowing: number): number {
  const w = snap(shoulderWidth - narrowing, BAR_WIDTH_STEP)
  return Math.min(BAR_WIDTH_MAX, Math.max(BAR_WIDTH_MIN, w))
}

export function computeFit(input: FitInput): FitResult {
  const { body, goal, frame, current } = input
  const warnings: FitWarning[] = []
  const notes: string[] = []

  const ratio = body.inseam / body.height
  if (ratio < INSEAM_RATIO_RANGE[0] || ratio > INSEAM_RATIO_RANGE[1]) {
    warnings.push({ code: 'inseam_ratio', params: { ratio: Number(ratio.toFixed(3)) } })
  }

  // 1. saddle height (uses the crank the rider actually has; default = formula's crank)
  const height = saddleHeight(body.inseam, current?.crankLength)
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
  const pose = riderPose(body, goal, saddle.point)
  if (pose.flexibilityLimited) {
    warnings.push({ code: 'flexibility_limited', params: { torsoAngle: pose.torsoAngle } })
  }

  // 4. cockpit solve
  const barReach = current?.barReach ?? DEFAULT_BAR_REACH
  const sol = solveCockpit(pose.hands, frame, barReach, undefined, PROFILES[goal])
  const frameMismatch = classifyMismatch(sol)
  if (frameMismatch === 'too_large') warnings.push({ code: 'frame_too_large' })
  if (frameMismatch === 'too_small') warnings.push({ code: 'frame_too_small' })

  // 5. other
  const crankLength = recommendCrank(body.inseam)
  notes.push('crank_reference_only')
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
