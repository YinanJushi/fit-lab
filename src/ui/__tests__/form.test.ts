import { describe, expect, it } from 'vitest'
import { BODY_FIELDS, EMPTY_FORM, EXAMPLE, FRAME_FIELDS, complete, exampleForm, status, toInput, validField, type Form } from '../form'

const example = (): Form => structuredClone({ ...EMPTY_FORM, ...EXAMPLE })

describe('measurement validation', () => {
  it.each([...BODY_FIELDS, ...FRAME_FIELDS])('rejects zero and negative %s before calculation', (key) => {
    for (const value of ['0', '-1', '', 'Infinity', 'NaN']) {
      const f = example()
      f.v[key] = value
      expect(complete(f, [key])).toBe(false)
      expect(toInput(f)).toBeNull()
    }
    expect(status(key, '0').kind).toBe('invalid')
  })
  it('rejects degenerate frame angles', () => {
    expect(validField('sta', '90')).toBe(false)
    expect(validField('hta', '180')).toBe(false)
  })
  it('keeps unusual positive dimensions as warnings', () => {
    const f = example()
    f.v.height = '1390'
    expect(status('height', f.v.height).kind).toBe('range')
    expect(toInput(f)).not.toBeNull()
  })
})

describe('example data', () => {
  it('clears previous bike, adaptations and current setup while retaining language and saved bikes', () => {
    const f = example()
    f.lang = 'zh'
    f.bike = { type: 'gravel', brand: 'Old', model: 'Old', size: 'L' }
    f.adapt.back = true
    f.cur.crankLength = '180'
    const result = exampleForm(f)
    expect(result.lang).toBe('zh')
    expect(result.customBikes).toEqual(f.customBikes)
    expect(result.bike).toEqual(EMPTY_FORM.bike)
    expect(toInput(result)?.adapt).toBeUndefined()
    expect(toInput(result)?.current).toBeUndefined()
    expect(result.step).toBe(1)
  })
})
