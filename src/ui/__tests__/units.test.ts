import { describe, expect, it } from 'vitest'
import { makeUnits, typedToMm } from '../units'

describe('units', () => {
  it('prints millimetres with one decimal and inches with two', () => {
    expect(makeUnits('mm', 'mm').len(715.25)).toBe('715.3 mm')
    expect(makeUnits('in', 'in').len(762)).toBe('30 in')
    expect(makeUnits('in', 'in').num(715.2)).toBe('28.16')
  })
  it('converts typed inches to millimetres and leaves mm and blanks alone', () => {
    expect(typedToMm('30', 'in')).toBe('762')
    expect(typedToMm('28.1', 'in')).toBe('713.74')
    expect(typedToMm('', 'in')).toBe('')
    expect(typedToMm('715', 'mm')).toBe('715')
  })
  it('round-trips a saddle height within rounding', () => {
    const mm = 715.2
    const shown = makeUnits('in', 'in').num(mm)
    expect(Math.abs(Number(typedToMm(shown, 'in')) - mm)).toBeLessThan(0.2)
  })
})
