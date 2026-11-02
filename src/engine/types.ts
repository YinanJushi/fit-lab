// All lengths mm, angles degrees. Coordinates: origin = bottom bracket, x forward, y up.

export type Goal = 'comfort' | 'endurance' | 'race' | 'aero'
/** 0 = cannot reach ankles, 1 = touches ankles, 2 = touches toes, 3 = past toes */
export type Flexibility = 0 | 1 | 2 | 3

export interface Point {
  x: number
  y: number
}

export interface BodyData {
  height: number
  inseam: number
  torso: number // greater trochanter -> acromion
  arm: number // acromion -> centre of closed fist
  shoulderWidth: number
  flexibility: Flexibility
}

export interface FrameGeometry {
  stack: number
  reach: number
  hta: number
  sta: number
}

export interface CurrentSetup {
  stemLength?: number
  stemAngle?: number
  spacers?: number
  barReach?: number
  crankLength?: number
  saddleHeight?: number
}

/**
 * Optional adjustments for riders whose body works differently. All grade C: general
 * practitioner guidance (经验值，待验证), not a clinical prescription.
 */
export interface Adaptations {
  /** the shorter leg is this many mm shorter (0 = none) */
  legLengthDiff?: number
  /** limited knee or hip bending: shorter cranks, more upright */
  limitedFlexion?: boolean
  /** back, neck or trunk limits: more upright */
  uprightBack?: boolean
  /** reduced grip, arm or hand function: weight off the hands */
  reducedUpperLimb?: boolean
  /** rides with a prosthesis */
  prosthesis?: boolean
  /** balance or stability comes first */
  stability?: boolean
}

export interface FitInput {
  body: BodyData
  goal: Goal
  frame: FrameGeometry
  current?: CurrentSetup
  adapt?: Adaptations
}

export interface CockpitParams {
  stemLength: number
  stemAngle: number
  spacers: number
}

export type WarningCode =
  | 'frame_too_large'
  | 'frame_too_small'
  | 'flexibility_limited'
  | 'saddle_change_large'
  | 'rail_out_of_range'
  | 'inseam_ratio'
  | 'legdiff_large'
  | 'adapt_upright'
  | 'adapt_stability'

export interface FitWarning {
  code: WarningCode
  params?: Record<string, number | string>
}

export type FrameMismatch = 'too_large' | 'too_small' | null

export interface CockpitSolution extends CockpitParams {
  hands: Point
  error: number
  residual: Point // target - achieved
  hitBoundary: boolean
}

export interface Comparison {
  key: string
  current: number
  recommended: number
  delta: number
}

export interface FitResult {
  saddleHeight: number
  saddleSetback: number // total rearward shift vs. frame seat-tube line (negative = forward)
  seatpostSetback: number // 0 / 20 / 25
  railOffset: number // rearward from rail centre (negative = forward)
  stemLength: number
  stemAngle: number
  spacers: number
  barWidth: number
  crankLength: number
  frameMismatch: FrameMismatch
  /** distance (mm) between the hand position the frame can give and the wanted one */
  cockpitError: number
  /** mm of cleat or pedal shim under the shorter leg (0 = none) */
  shim: number
  torsoAngle: number
  warnings: FitWarning[]
  notes: string[]
  comparison: Comparison[]
  /** joint / contact points for drawing */
  geometry: {
    saddle: Point
    hip: Point
    shoulder: Point
    targetHands: Point
    hands: Point
    stemClamp: Point
    headTop: Point
  }
}
