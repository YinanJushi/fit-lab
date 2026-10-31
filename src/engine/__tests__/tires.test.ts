import { describe, expect, it } from 'vitest'
import { recommendTires } from '../tires'

describe('tire advice', () => {
  it('gravel gets wider tires than road for the same goal', () => {
    expect(recommendTires('gravel', 'endurance').min).toBeGreaterThan(recommendTires('road', 'endurance').max)
  })
  it('faster goals never get wider tires than comfort', () => {
    for (const kind of ['road', 'gravel'] as const) {
      expect(recommendTires(kind, 'aero').max).toBeLessThanOrEqual(recommendTires(kind, 'comfort').max)
    }
  })
  it('caps the range at the frame clearance', () => {
    const a = recommendTires('road', 'comfort', 32)
    expect(a.max).toBe(32)
    expect(a.min).toBeLessThanOrEqual(a.max)
    expect(a.frameLimited).toBe(false)
  })
  it('flags a frame too narrow for the usual range', () => {
    const a = recommendTires('road', 'comfort', 28)
    expect(a.frameLimited).toBe(true)
    expect(a.max).toBe(28)
  })
  it('works without frame data', () => {
    expect(recommendTires('road', 'race')).toEqual({ min: 28, max: 30, frameMax: null, frameLimited: false })
  })
})
