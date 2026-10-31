import {
  DEFAULT_BAR_REACH,
  HOOD_OFFSET,
  MISMATCH_ERROR,
  PREFERRED_MAX_ANGLE,
  SPACER_MAX,
  SPACER_MIN,
  SPACER_STACKS,
  STEM_ANGLES,
  STEM_HALF_CLAMP,
  STEM_LENGTHS,
  STEM_MAX,
  STEM_MIN,
  TIE_TOLERANCE,
} from './constants'
import { PROFILES, type Profile } from './profiles'
import type { CockpitParams, CockpitSolution, FrameGeometry, FrameMismatch, Point } from './types'

const rad = (deg: number) => (deg * Math.PI) / 180

export function headTop(frame: FrameGeometry): Point {
  return { x: frame.reach, y: frame.stack }
}

export function stemClampPoint(frame: FrameGeometry, p: CockpitParams): Point {
  const hta = rad(frame.hta)
  const u = { x: -Math.cos(hta), y: Math.sin(hta) } // steering axis, pointing up
  const along = p.spacers + STEM_HALF_CLAMP
  const top = headTop(frame)
  const centre = { x: top.x + along * u.x, y: top.y + along * u.y }
  const phi = rad(90 - frame.hta + p.stemAngle)
  return { x: centre.x + p.stemLength * Math.cos(phi), y: centre.y + p.stemLength * Math.sin(phi) }
}

/** Forward kinematics: parameters -> hand position on the hoods. */
export function handPosition(
  frame: FrameGeometry,
  p: CockpitParams,
  barReach: number = DEFAULT_BAR_REACH,
): Point {
  const c = stemClampPoint(frame, p)
  return { x: c.x + barReach + HOOD_OFFSET.x, y: c.y + HOOD_OFFSET.y }
}

/** Lower is better; used only to break near-ties. */
function comfortPenalty(p: CockpitParams, prefs: Pick<Profile, 'preferredSpacers' | 'preferredStem'>): number {
  let pen = 0
  if (p.spacers < prefs.preferredSpacers[0] || p.spacers > prefs.preferredSpacers[1]) pen += 1
  if (p.stemLength < prefs.preferredStem[0] || p.stemLength > prefs.preferredStem[1]) pen += 1
  if (Math.abs(p.stemAngle) > PREFERRED_MAX_ANGLE) pen += 1
  return pen
}

export function solveCockpit(
  target: Point,
  frame: FrameGeometry,
  barReach: number = DEFAULT_BAR_REACH,
  tieTolerance: number = TIE_TOLERANCE,
  prefs: Pick<Profile, 'preferredSpacers' | 'preferredStem'> = PROFILES.endurance,
): CockpitSolution {
  interface Candidate {
    p: CockpitParams
    hands: Point
    err: number
  }
  const all: Candidate[] = []
  for (const stemLength of STEM_LENGTHS)
    for (const stemAngle of STEM_ANGLES)
      for (const spacers of SPACER_STACKS) {
        const p = { stemLength, stemAngle, spacers }
        const hands = handPosition(frame, p, barReach)
        all.push({ p, hands, err: Math.hypot(target.x - hands.x, target.y - hands.y) })
      }
  const bestErr = Math.min(...all.map((c) => c.err))
  const near = all.filter((c) => c.err <= bestErr + tieTolerance)
  near.sort((a, b) => comfortPenalty(a.p, prefs) - comfortPenalty(b.p, prefs) || a.err - b.err)
  const chosen = near[0]
  const { stemLength, spacers } = chosen.p
  return {
    ...chosen.p,
    hands: chosen.hands,
    error: chosen.err,
    residual: { x: target.x - chosen.hands.x, y: target.y - chosen.hands.y },
    hitBoundary:
      stemLength === STEM_MIN || stemLength === STEM_MAX || spacers === SPACER_MIN || spacers === SPACER_MAX,
  }
}

/**
 * Decide whether the frame is the problem. Large error -> direction from the dominant
 * residual axis (target behind/below what the frame can reach = frame too large).
 * Boundary use with small error -> direction from which boundary was hit.
 */
export function classifyMismatch(s: CockpitSolution): FrameMismatch {
  if (s.error > MISMATCH_ERROR) {
    const { x, y } = s.residual
    const v = Math.abs(x) >= Math.abs(y) ? x : y
    return v < 0 ? 'too_large' : 'too_small'
  }
  if (s.stemLength === STEM_MIN || s.spacers === SPACER_MIN) return 'too_large'
  if (s.stemLength === STEM_MAX || s.spacers === SPACER_MAX) return 'too_small'
  return null
}
