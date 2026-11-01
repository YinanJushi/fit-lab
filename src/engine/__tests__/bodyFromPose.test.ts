import { describe, expect, it } from 'vitest'
import { LM, measurementsFromPose, type Landmark } from '../bodyFromPose'

/** Builds a front-facing standing figure for a 1750 mm person in a 1000x1500 picture. */
function figure(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  const H = 1750
  const W = 1000
  const Hpx = 1500
  const mmPerPx = 1.2 // 1750 mm tall ≈ 1458 px of the 1500 px picture
  const cx = 500
  const floorY = 1480
  const at = (xmm: number, hmm: number): Landmark => ({
    x: (cx + xmm / mmPerPx) / W,
    y: (floorY - hmm / mmPerPx) / Hpx,
    visibility: 1,
  })
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }))
  lm[LM.nose] = at(0, 0.925 * H)
  lm[LM.lShoulder] = at(-200, 0.82 * H)
  lm[LM.rShoulder] = at(200, 0.82 * H)
  lm[LM.lHip] = at(-90, 0.53 * H)
  lm[LM.rHip] = at(90, 0.53 * H)
  lm[LM.lElbow] = at(-230, 0.82 * H - 290)
  lm[LM.rElbow] = at(230, 0.82 * H - 290)
  lm[LM.lWrist] = at(-240, 0.82 * H - 540)
  lm[LM.rWrist] = at(240, 0.82 * H - 540)
  lm[LM.lHeel] = at(-60, 0)
  lm[LM.rHeel] = at(60, 0)
  for (const [k, v] of Object.entries(overrides)) lm[Number(k)] = { ...lm[Number(k)], ...v }
  return lm
}

describe('measurementsFromPose', () => {
  it('recovers plausible measurements for a 1750 mm person', () => {
    const r = measurementsFromPose(figure(), { width: 1000, height: 1500 }, 1750)
    expect(r.problems).toEqual([])
    const m = r.measurements!
    expect(m.shoulderWidth).toBeGreaterThan(380)
    expect(m.shoulderWidth).toBeLessThan(420)
    expect(m.inseam).toBeGreaterThan(750)
    expect(m.inseam).toBeLessThan(850)
    expect(m.torso).toBeGreaterThan(480)
    expect(m.torso).toBeLessThan(560)
    expect(m.arm).toBeGreaterThan(560)
    expect(m.arm).toBeLessThan(660)
  })
  it('scales with the entered height', () => {
    const a = measurementsFromPose(figure(), { width: 1000, height: 1500 }, 1750).measurements!
    const b = measurementsFromPose(figure(), { width: 1000, height: 1500 }, 1925).measurements!
    expect(b.shoulderWidth).toBeGreaterThan(a.shoulderWidth)
    expect(b.inseam).toBeGreaterThan(a.inseam)
  })
  it('refuses when the feet are not visible', () => {
    const r = measurementsFromPose(
      figure({ [LM.lHeel]: { visibility: 0.1 }, [LM.rHeel]: { visibility: 0.1 } }),
      { width: 1000, height: 1500 },
      1750,
    )
    expect(r.measurements).toBeNull()
    expect(r.problems).toContain('not_full_body')
  })
  it('reports hidden arms and leaning separately', () => {
    const hidden = measurementsFromPose(
      figure({ [LM.lWrist]: { visibility: 0.1 } }),
      { width: 1000, height: 1500 },
      1750,
    )
    expect(hidden.problems).toContain('arms_hidden')
    expect(hidden.measurements!.arm).toBe(0)
    const lean = measurementsFromPose(figure({ [LM.rShoulder]: { y: 0.45 } }), { width: 1000, height: 1500 }, 1750)
    expect(lean.problems).toContain('leaning')
  })
  it('flags a person who fills too little of the picture', () => {
    const small = figure().map((p) => ({ ...p, y: 0.5 + (p.y - 0.5) * 0.4 }))
    const r = measurementsFromPose(small, { width: 1000, height: 1500 }, 1750)
    expect(r.problems).toContain('too_small')
  })
})
