import { describe, expect, it } from 'vitest'
import { evaluateSizes, matchBikes } from '../sizes'
import type { BodyData } from '../types'

const body: BodyData = { height: 1750, inseam: 810, torso: 520, arm: 600, shoulderWidth: 400, flexibility: 2 }
const rider = { body, goal: 'endurance' as const }
const sizes = [
  { label: 'XS', stack: 500, reach: 360, hta: 71.5, sta: 74 },
  { label: 'S', stack: 530, reach: 372, hta: 72, sta: 73.5 },
  { label: 'M', stack: 560, reach: 385, hta: 73, sta: 73.5 },
  { label: 'L', stack: 590, reach: 398, hta: 73, sta: 73 },
  { label: 'XL', stack: 620, reach: 410, hta: 73, sta: 73 },
]

describe('size finder', () => {
  it('marks exactly one best size and calls the extremes unsuitable', () => {
    const rows = evaluateSizes(sizes, rider)
    expect(rows.filter((r) => r.verdict === 'best')).toHaveLength(1)
    expect(rows.find((r) => r.verdict === 'best')!.label).toBe('M')
    expect(rows[0].verdict).not.toBe('best')
  })
  it('returns nothing for no sizes', () => {
    expect(evaluateSizes([], rider)).toEqual([])
  })
  it('ranks bikes best first and drops bikes with no usable size', () => {
    const tiny = { id: 'tiny', sizes: [{ label: 'T', stack: 440, reach: 330, hta: 70, sta: 75 }] }
    const fits = { id: 'fits', sizes }
    const res = matchBikes([tiny, fits], rider)
    expect(res.map((r) => r.bike.id)).toEqual(['fits'])
    expect(res[0].size.verdict).toBe('best')
  })
})
