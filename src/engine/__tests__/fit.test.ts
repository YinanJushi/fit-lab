import { describe, expect, it } from 'vitest'
import { handPosition, solveCockpit } from '../cockpit'
import { computeFit } from '../fit'
import { riderPose } from '../rider'
import { saddlePoint } from '../saddle'
import {
  SPACER_STACKS,
  STEM_ANGLES,
  STEM_LENGTHS,
} from '../constants'
import type { BodyData, FitInput, FrameGeometry } from '../types'

const body: BodyData = {
  height: 1750,
  inseam: 810,
  torso: 520,
  arm: 600,
  shoulderWidth: 400,
  flexibility: 2,
}
const frame: FrameGeometry = { stack: 560, reach: 385, hta: 73, sta: 73.5 }
const base: FitInput = { body, goal: 'endurance', frame }

// deterministic PRNG so failures are reproducible
function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
}
const pick = <T,>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)]

describe('geometry round trip', () => {
  it('recovers stem/spacer params from the hand position they produce', () => {
    const r = rng(42)
    for (let i = 0; i < 50; i++) {
      const p = {
        stemLength: pick(STEM_LENGTHS, r),
        stemAngle: pick(STEM_ANGLES, r),
        spacers: pick(SPACER_STACKS, r),
      }
      const target = handPosition(frame, p)
      const sol = solveCockpit(target, frame, undefined, 0.001)
      expect(sol.error).toBeLessThan(1e-6)
      expect({ stemLength: sol.stemLength, stemAngle: sol.stemAngle, spacers: sol.spacers }).toEqual(p)
    }
  })
})

describe('monotonicity', () => {
  it('aero target hands are lower and farther than comfort for the same rider/bike', () => {
    const comfort = computeFit({ ...base, goal: 'comfort' }).geometry.targetHands
    const aero = computeFit({ ...base, goal: 'aero' }).geometry.targetHands
    expect(aero.y).toBeLessThan(comfort.y)
    expect(aero.x).toBeGreaterThan(comfort.x)
  })
  it('holds through all four goals in order', () => {
    const goals = ['comfort', 'endurance', 'race', 'aero'] as const
    const hands = goals.map((goal) => computeFit({ ...base, goal }).geometry.targetHands)
    for (let i = 1; i < hands.length; i++) {
      expect(hands[i].y).toBeLessThan(hands[i - 1].y)
      expect(hands[i].x).toBeGreaterThan(hands[i - 1].x)
    }
  })
})

describe('flexibility', () => {
  it('clamps torso angle and warns for least flexible + aero', () => {
    const res = computeFit({ ...base, goal: 'aero', body: { ...body, flexibility: 0 } })
    expect(res.torsoAngle).toBeGreaterThan(31.5)
    expect(res.warnings.some((w) => w.code === 'flexibility_limited')).toBe(true)
  })
  it('does not warn when flexible enough', () => {
    const res = computeFit({ ...base, goal: 'aero', body: { ...body, flexibility: 3 } })
    expect(res.warnings.some((w) => w.code === 'flexibility_limited')).toBe(false)
  })
  it('limits the pose directly', () => {
    const pose = riderPose({ ...body, flexibility: 0 }, 'aero', saddlePoint(715, 75))
    expect(pose.flexibilityLimited).toBe(true)
  })
})

describe('frame mismatch', () => {
  const small: BodyData = { height: 1600, inseam: 740, torso: 460, arm: 540, shoulderWidth: 360, flexibility: 2 }
  it('flags too_large for a 160cm rider on Reach 420 / Stack 600', () => {
    const res = computeFit({
      body: small,
      goal: 'aero',
      frame: { reach: 420, stack: 600, hta: 73, sta: 73.5 },
    })
    expect(res.frameMismatch).toBe('too_large')
    expect(res.warnings.some((w) => w.code === 'frame_too_large')).toBe(true)
  })
  it('flags too_small for a tall rider on a tiny frame', () => {
    const tall: BodyData = { height: 1950, inseam: 910, torso: 600, arm: 700, shoulderWidth: 460, flexibility: 3 }
    const res = computeFit({ body: tall, goal: 'comfort', frame: { reach: 340, stack: 500, hta: 73, sta: 73.5 } })
    expect(res.frameMismatch).toBe('too_small')
  })
  it('does not flag a well-matched frame', () => {
    expect(computeFit(base).frameMismatch).toBeNull()
  })
})

describe('crank correction', () => {
  it('raises saddle by 7.5 mm going from 172.5 to 165 mm cranks', () => {
    const a = computeFit({ ...base, current: { crankLength: 172.5 } }).saddleHeight
    const b = computeFit({ ...base, current: { crankLength: 165 } }).saddleHeight
    expect(b - a).toBeCloseTo(7.5, 5)
  })
  it('baseline equals 0.883 x inseam', () => {
    expect(computeFit(base).saddleHeight).toBeCloseTo(0.883 * 810, 1)
  })
})

describe('missing optional input', () => {
  it('works without current setup', () => {
    const res = computeFit(base)
    expect(res.comparison).toEqual([])
    expect(Number.isFinite(res.stemLength)).toBe(true)
  })
  it('works with a partial current setup', () => {
    const res = computeFit({ ...base, current: { stemLength: 100 } })
    expect(res.comparison.map((c) => c.key)).toEqual(['stemLength'])
  })
})

describe('other outputs', () => {
  it('warns on an implausible inseam/height ratio', () => {
    const res = computeFit({ ...base, body: { ...body, inseam: 600 } })
    expect(res.warnings.some((w) => w.code === 'inseam_ratio')).toBe(true)
  })
  it('warns when saddle change exceeds 10 mm', () => {
    const res = computeFit({ ...base, current: { saddleHeight: 690 } })
    expect(res.warnings.some((w) => w.code === 'saddle_change_large')).toBe(true)
  })
  it('bar width is a 20 mm step in range, narrower for aero', () => {
    const c = computeFit(base).barWidth
    const a = computeFit({ ...base, goal: 'aero' }).barWidth
    expect(c % 20).toBe(0)
    expect(a).toBeLessThanOrEqual(c)
    expect(c).toBeGreaterThanOrEqual(360)
    expect(c).toBeLessThanOrEqual(460)
  })
  it('crank is a stock size', () => {
    expect([160, 165, 170, 172.5, 175]).toContain(computeFit(base).crankLength)
  })
})

describe('adaptive options', () => {
  it('raises the torso and shortens the crank for limited flexion', () => {
    const plain = computeFit(base)
    const a = computeFit({ ...base, adapt: { limitedFlexion: true } })
    expect(a.torsoAngle).toBeGreaterThanOrEqual(50)
    expect(a.torsoAngle).toBeGreaterThanOrEqual(plain.torsoAngle)
    expect(a.crankLength).toBeLessThan(plain.crankLength)
    // shorter crank -> higher saddle by the same amount
    expect(a.saddleHeight).toBeGreaterThan(plain.saddleHeight)
  })
  it('gives a shim for a leg length difference and warns when large', () => {
    expect(computeFit({ ...base, adapt: { legLengthDiff: 2 } }).shim).toBe(0)
    expect(computeFit({ ...base, adapt: { legLengthDiff: 6 } }).shim).toBe(6)
    const big = computeFit({ ...base, adapt: { legLengthDiff: 14 } })
    expect(big.warnings.some((w) => w.code === 'legdiff_large')).toBe(true)
  })
  it('lowers the saddle for stability first', () => {
    const plain = computeFit(base)
    const s = computeFit({ ...base, adapt: { stability: true } })
    expect(plain.saddleHeight - s.saddleHeight).toBeCloseTo(12, 0)
  })
  it('keeps weight off the hands for reduced upper-limb function', () => {
    const plain = computeFit({ ...base, goal: 'race' })
    const a = computeFit({ ...base, goal: 'race', adapt: { reducedUpperLimb: true } })
    expect(a.torsoAngle).toBeGreaterThan(plain.torsoAngle)
  })
  it('changes nothing when no option is set', () => {
    expect(computeFit({ ...base, adapt: {} })).toEqual(computeFit(base))
  })
})
