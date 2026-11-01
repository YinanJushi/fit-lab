import { describe, expect, it } from 'vitest'
import { pedalPosition, twoBoneJoint } from '../ik'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

describe('two-bone joint', () => {
  it('keeps both bone lengths', () => {
    const root = { x: 0, y: 0 }
    const end = { x: 120, y: -380 }
    const k = twoBoneJoint(root, end, 250, 250, 1)
    expect(dist(root, k)).toBeCloseTo(250, 3)
    expect(dist(k, end)).toBeCloseTo(250, 3)
  })
  it('bends forward for a downward leg when side is 1, backward when -1', () => {
    // for a vector pointing down, the left-hand normal is +x (forward)
    expect(twoBoneJoint({ x: 0, y: 0 }, { x: 0, y: -400 }, 250, 250, 1).x).toBeGreaterThan(0)
    expect(twoBoneJoint({ x: 0, y: 0 }, { x: 0, y: -400 }, 250, 250, -1).x).toBeLessThan(0)
  })
  it('stretches straight when the end is out of reach', () => {
    const k = twoBoneJoint({ x: 0, y: 0 }, { x: 0, y: -900 }, 250, 250, 1)
    expect(k.y).toBeCloseTo(-250, 0)
    expect(Math.abs(k.x)).toBeLessThan(1)
  })
})

describe('pedal position', () => {
  it('is at the bottom at -90° and the front at 0°', () => {
    expect(pedalPosition(170, -90).y).toBeCloseTo(-170, 6)
    expect(pedalPosition(170, 0).x).toBeCloseTo(170, 6)
  })
})
