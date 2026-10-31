// One entry per rider profile. Everything that differs between "comfortable" and "fast"
// riders lives here, with an evidence grade so we know what still needs real fit data.
//
// Evidence grades:
//   A = peer-reviewed / published formula
//   B = practitioner guidance (fitters, clinics) that several sources agree on
//   C = our own placeholder, not sourced (经验值，待验证)
import type { Goal } from './types'

export type Evidence = 'A' | 'B' | 'C'

export interface Profile {
  /** target effective seat-tube angle range (°); midpoint used. Evidence: C (range from project brief) */
  effectiveSta: [number, number]
  /** torso angle to horizontal (°); midpoint used. Evidence: B (road 30–45° is commonly cited) */
  torsoAngle: [number, number]
  /** angle between torso and arm (°). Evidence: B (clinic brochure: recreational 80–90, road 90–100) */
  shoulderAngle: number
  /** preferred spacer stack and stem length for tie-breaking (mm). Evidence: C */
  preferredSpacers: [number, number]
  preferredStem: [number, number]
  /** how much narrower than shoulder width the bars go (mm). Evidence: B for aero (20–40) */
  barNarrowing: number
  evidence: { saddle: Evidence; position: Evidence; cockpit: Evidence }
}

export const PROFILES: Record<Goal, Profile> = {
  comfort: {
    effectiveSta: [72.5, 73.5],
    torsoAngle: [50, 55],
    shoulderAngle: 85,
    preferredSpacers: [20, 35],
    preferredStem: [70, 100],
    barNarrowing: 0,
    evidence: { saddle: 'A', position: 'B', cockpit: 'C' },
  },
  endurance: {
    effectiveSta: [72.5, 73.5],
    torsoAngle: [42, 48],
    shoulderAngle: 88,
    preferredSpacers: [10, 25],
    preferredStem: [80, 110],
    barNarrowing: 0,
    evidence: { saddle: 'A', position: 'B', cockpit: 'C' },
  },
  race: {
    effectiveSta: [73.5, 74.5],
    torsoAngle: [35, 42],
    shoulderAngle: 92,
    preferredSpacers: [5, 20],
    preferredStem: [90, 120],
    barNarrowing: 0,
    evidence: { saddle: 'A', position: 'B', cockpit: 'C' },
  },
  aero: {
    effectiveSta: [74.5, 75.5],
    torsoAngle: [28, 35],
    shoulderAngle: 95,
    preferredSpacers: [0, 15],
    preferredStem: [100, 130],
    barNarrowing: 30,
    evidence: { saddle: 'A', position: 'B', cockpit: 'C' },
  },
}
