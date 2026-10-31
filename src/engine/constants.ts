// Every empirical parameter lives here. Items marked UNVERIFIED are 经验值，待验证.
import type { Flexibility } from './types'

/** LeMond coefficient: saddle height = 0.883 * inseam (BB centre -> saddle top, along seat tube). Published formula. */
export const LEMOND_FACTOR = 0.883
/** Crank length the LeMond formula assumes. */
export const REFERENCE_CRANK = 172.5
/** Largest single saddle change before advising staged adjustment. */
export const SADDLE_STEP_LIMIT = 10

// Per-goal values (seat-tube angle, torso angle, shoulder angle, stem/spacer preferences)
// live in profiles.ts.
/** Minimum torso angle allowed by flexibility level. UNVERIFIED placeholder values. */
export const MIN_TORSO_ANGLE_BY_FLEXIBILITY: Record<Flexibility, number> = {
  0: 45,
  1: 38,
  2: 33,
  3: 28,
}
/** Elbow-bend factor on arm length (spec default 0.92, configurable). */
export const ARM_EFFECTIVE_FACTOR = 0.92
/** Hip joint relative to saddle contact point. x default per spec (40 back); y UNVERIFIED. */
export const HIP_OFFSET = { x: -40, y: 0 }

/** Seatpost setback options (mm) and rail adjustment range (spec). */
export const SEATPOST_SETBACKS = [0, 20, 25]
export const RAIL_RANGE = 15

/** Stem clamp: half of the clamp height, added to the spacer stack (spec default 20). */
export const STEM_HALF_CLAMP = 20
/**
 * Hand position on hoods relative to bar clamp, added to bar reach. UNVERIFIED.
 * x is negative because bar "reach" is measured to the hood tip while the grip centre sits
 * about 40 mm behind it. A 0 offset made a typical 175 cm rider look like they needed a
 * 60 mm stem on a 385 Reach frame.
 */
export const HOOD_OFFSET = { x: -40, y: 15 }
/** Bar reach assumed when the user gave none. UNVERIFIED typical road bar. */
export const DEFAULT_BAR_REACH = 80

export const STEM_LENGTHS = [60, 70, 80, 90, 100, 110, 120, 130, 140]
export const STEM_ANGLES = [-17, -10, -6, 0, 6, 10, 17]
export const SPACER_STACKS = [0, 5, 10, 15, 20, 25, 30, 35, 40]
export const STEM_MIN = 60
export const STEM_MAX = 140
export const SPACER_MIN = 0
export const SPACER_MAX = 40

/** Angle limit for tie-breaking (spec); spacer/stem preferences are per profile. */
export const PREFERRED_MAX_ANGLE = 6
/** Solutions within this many mm of the best error count as "similar". UNVERIFIED. */
export const TIE_TOLERANCE = 3
/** Larger best error than this => frame mismatch (spec). */
export const MISMATCH_ERROR = 15

/** Handlebar width: ≈ shoulder width, 20 mm steps within bounds (spec). */
export const BAR_WIDTH_STEP = 20
export const BAR_WIDTH_MIN = 360
export const BAR_WIDTH_MAX = 460

/** Crank length ≈ ratio * inseam, snapped to stock sizes. UNVERIFIED. */
export const CRANK_INSEAM_RATIO = 0.21
export const CRANK_SIZES = [160, 165, 170, 172.5, 175]

/** Sanity range for inseam / height (spec). */
export const INSEAM_RATIO_RANGE: [number, number] = [0.4, 0.52]
