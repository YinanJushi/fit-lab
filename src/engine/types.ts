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

export interface FitInput {
  body: BodyData
  goal: Goal
  frame: FrameGeometry
  current?: CurrentSetup
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
