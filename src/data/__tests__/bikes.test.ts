import { describe, expect, it } from 'vitest'
// same limits the data collector enforces
const RANGES = { stack: [400, 800], reach: [300, 520], hta: [65, 78], sta: [68, 80] } as const
import { BIKES } from '../bikes'

describe('bike database', () => {
  it('has unique brand/model/year entries', () => {
    const keys = BIKES.map((b) => `${b.brand}|${b.model}|${b.year}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
  it('only uses known bike types', () => {
    for (const b of BIKES) expect(['road', 'gravel', 'cyclocross', 'touring']).toContain(b.type)
  })
  it('keeps every size inside the app plausibility ranges', () => {
    for (const b of BIKES)
      for (const s of b.sizes)
        for (const k of ['stack', 'reach', 'hta', 'sta'] as const) {
          const [min, max] = RANGES[k]
          expect(s[k], `${b.brand} ${b.model} ${s.label} ${k}`).toBeGreaterThanOrEqual(min)
          expect(s[k], `${b.brand} ${b.model} ${s.label} ${k}`).toBeLessThanOrEqual(max)
        }
  })
  it('grows stack and reach with size', () => {
    for (const b of BIKES)
      for (let i = 1; i < b.sizes.length; i++) {
        expect(b.sizes[i].stack).toBeGreaterThan(b.sizes[i - 1].stack)
        expect(b.sizes[i].reach).toBeGreaterThan(b.sizes[i - 1].reach)
      }
  })
  it('links a source for every entry', () => {
    for (const b of BIKES) expect(b.source).toMatch(/^https:\/\//)
  })
})
