// Turns pose landmarks from one standing, front-facing photo into body measurements.
// The numbers are ESTIMATES (typically within 2–3 cm): landmarks sit on joints, not on the
// bony points a tape measure uses, so each value is corrected with a typical body proportion.
// The correction factors are 经验值，待验证 and live here in one place.

/** MediaPipe pose landmark indices that we use. */
export const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lAnkle: 27,
  rAnkle: 28,
  lHeel: 29,
  rHeel: 30,
} as const

export interface Landmark {
  x: number // 0..1 across the image width
  y: number // 0..1 down the image height
  visibility?: number
}

export const POSE_FACTORS = {
  /** nose height as a fraction of standing height */
  noseHeight: 0.925,
  /** hip joint centre sits this fraction of height above the crotch (inseam = hip height − this) */
  hipAboveCrotch: 0.08,
  /** extra length from the wrist landmark to the centre of a closed fist (mm) */
  wristToFist: 55,
  /** biacromial width vs. the distance between the shoulder landmarks */
  shoulderWidth: 1.0,
  /** minimum landmark confidence we accept */
  minVisibility: 0.5,
}

export interface PoseMeasurements {
  inseam: number
  torso: number
  arm: number
  shoulderWidth: number
}

export type PoseProblem =
  | 'not_full_body' // head or feet not visible
  | 'arms_hidden'
  | 'leaning' // shoulders clearly not level
  | 'too_small' // person fills too little of the picture to be accurate

export interface PoseResult {
  measurements: PoseMeasurements | null
  problems: PoseProblem[]
}

const round5 = (v: number) => Math.round(v / 5) * 5

export function measurementsFromPose(
  lm: Landmark[],
  image: { width: number; height: number },
  heightMm: number,
): PoseResult {
  const need = [LM.nose, LM.lShoulder, LM.rShoulder, LM.lHip, LM.rHip, LM.lHeel, LM.rHeel]
  const vis = (i: number) => lm[i]?.visibility ?? 1
  const problems: PoseProblem[] = []
  if (lm.length < 33 || need.some((i) => vis(i) < POSE_FACTORS.minVisibility)) {
    return { measurements: null, problems: ['not_full_body'] }
  }
  const arms = [LM.lElbow, LM.rElbow, LM.lWrist, LM.rWrist]
  if (arms.some((i) => vis(i) < POSE_FACTORS.minVisibility)) problems.push('arms_hidden')

  const px = (i: number) => ({ x: lm[i].x * image.width, y: lm[i].y * image.height })
  const dist = (a: number, b: number) => Math.hypot(px(a).x - px(b).x, px(a).y - px(b).y)
  const mid = (a: number, b: number) => ({ x: (px(a).x + px(b).x) / 2, y: (px(a).y + px(b).y) / 2 })

  const heelY = (px(LM.lHeel).y + px(LM.rHeel).y) / 2
  const noseY = px(LM.nose).y
  const bodyPx = heelY - noseY
  if (bodyPx <= 0) return { measurements: null, problems: ['not_full_body'] }
  if (bodyPx < image.height * 0.5) problems.push('too_small')

  const mmPerPx = (POSE_FACTORS.noseHeight * heightMm) / bodyPx
  if (Math.abs(px(LM.lShoulder).y - px(LM.rShoulder).y) > bodyPx * 0.05) problems.push('leaning')

  const hips = mid(LM.lHip, LM.rHip)
  const shoulders = mid(LM.lShoulder, LM.rShoulder)
  const hipHeight = (heelY - hips.y) * mmPerPx
  const inseam = hipHeight - POSE_FACTORS.hipAboveCrotch * heightMm
  const torso = Math.hypot(shoulders.x - hips.x, shoulders.y - hips.y) * mmPerPx
  const shoulderWidth = dist(LM.lShoulder, LM.rShoulder) * mmPerPx * POSE_FACTORS.shoulderWidth

  let arm = 0
  if (!problems.includes('arms_hidden')) {
    const side = (s: number, e: number, w: number) => dist(s, e) + dist(e, w)
    const l = side(LM.lShoulder, LM.lElbow, LM.lWrist) * mmPerPx
    const r = side(LM.rShoulder, LM.rElbow, LM.rWrist) * mmPerPx
    arm = (l + r) / 2 + POSE_FACTORS.wristToFist
  }

  return {
    measurements: {
      inseam: round5(inseam),
      torso: round5(torso),
      arm: arm > 0 ? round5(arm) : 0,
      shoulderWidth: round5(shoulderWidth),
    },
    problems,
  }
}
