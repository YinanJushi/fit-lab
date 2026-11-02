import type { Adaptations, FitInput, Flexibility, Goal } from '../engine/types'
import type { BikeType } from '../data/bikes'
import type { Key } from '../i18n'

export type FieldKey =
  | 'height' | 'inseam' | 'torso' | 'arm' | 'shoulderWidth'
  | 'stack' | 'reach' | 'hta' | 'sta'
export type CurKey = 'saddleHeight' | 'stemLength' | 'stemAngle' | 'spacers' | 'barReach' | 'crankLength'

/** Plausible ranges used only to prompt a re-measure, never to block. */
export const RANGES: Record<FieldKey, [number, number]> = {
  height: [1400, 2100],
  inseam: [600, 1000],
  torso: [400, 700],
  arm: [450, 800],
  shoulderWidth: [300, 550],
  stack: [440, 720],
  reach: [320, 470],
  hta: [66, 77],
  sta: [70, 77],
}

export const BODY_FIELDS: FieldKey[] = ['height', 'inseam', 'torso', 'arm', 'shoulderWidth']
export const FRAME_FIELDS: FieldKey[] = ['stack', 'reach', 'hta', 'sta']
export const CUR_FIELDS: CurKey[] = ['saddleHeight', 'stemLength', 'stemAngle', 'spacers', 'barReach', 'crankLength']
export const isAngle = (k: FieldKey) => k === 'hta' || k === 'sta'

export interface CustomBike {
  id: string
  name: string
  type: BikeType
  stack: number
  reach: number
  hta: number
  sta: number
}

export interface AdaptForm {
  legDiff: string
  flexion: boolean
  back: boolean
  upper: boolean
  prosthesis: boolean
  stability: boolean
}

export const EMPTY_ADAPT: AdaptForm = { legDiff: '', flexion: false, back: false, upper: false, prosthesis: false, stability: false }

export function adaptFrom(a: AdaptForm): Adaptations | undefined {
  const diff = num(a.legDiff) ?? 0
  const out: Adaptations = {
    legLengthDiff: diff > 0 ? diff : undefined,
    limitedFlexion: a.flexion || undefined,
    uprightBack: a.back || undefined,
    reducedUpperLimb: a.upper || undefined,
    prosthesis: a.prosthesis || undefined,
    stability: a.stability || undefined,
  }
  return Object.values(out).some((x) => x !== undefined) ? out : undefined
}

export interface Form {
  lang: 'zh' | 'en'
  step: number
  v: Record<FieldKey, string>
  cur: Record<CurKey, string>
  flex: Flexibility | null
  goal: Goal | null
  bike: { type: BikeType; brand: string; model: string; size: string; year?: number }
  customBikes: CustomBike[]
  adapt: AdaptForm
}

const blank = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, ''])) as Record<K, string>

export const EMPTY_FORM: Form = {
  lang: 'en',
  step: 0,
  v: blank([...BODY_FIELDS, ...FRAME_FIELDS]),
  cur: blank(CUR_FIELDS),
  flex: null,
  goal: null,
  bike: { type: 'road', brand: '', model: '', size: '' },
  customBikes: [],
  adapt: EMPTY_ADAPT,
}

export const EXAMPLE: Pick<Form, 'v' | 'flex' | 'goal'> = {
  v: { height: '1750', inseam: '810', torso: '520', arm: '600', shoulderWidth: '400', stack: '560', reach: '385', hta: '73', sta: '73.5' },
  flex: 2,
  goal: 'endurance',
}

export const num = (s: string): number | null => {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export type FieldStatus = { kind: 'empty' } | { kind: 'range'; min: number; max: number } | { kind: 'ok' }

export function status(k: FieldKey, s: string): FieldStatus {
  const n = num(s)
  if (n === null) return { kind: 'empty' }
  const [min, max] = RANGES[k]
  return n < min || n > max ? { kind: 'range', min, max } : { kind: 'ok' }
}

export const complete = (f: Form, keys: FieldKey[]) => keys.every((k) => num(f.v[k]) !== null)

export function toInput(f: Form): FitInput | null {
  const g = (k: FieldKey) => num(f.v[k])
  const vals = [g('height'), g('inseam'), g('torso'), g('arm'), g('shoulderWidth'), g('stack'), g('reach'), g('hta'), g('sta')]
  if (vals.some((x) => x === null) || f.flex === null || f.goal === null) return null
  const [height, inseam, torso, arm, shoulderWidth, stack, reach, hta, sta] = vals as number[]
  const c = (k: CurKey) => num(f.cur[k]) ?? undefined
  const current = {
    saddleHeight: c('saddleHeight'), stemLength: c('stemLength'), stemAngle: c('stemAngle'),
    spacers: c('spacers'), barReach: c('barReach'), crankLength: c('crankLength'),
  }
  const any = Object.values(current).some((x) => x !== undefined)
  return {
    body: { height, inseam, torso, arm, shoulderWidth, flexibility: f.flex },
    goal: f.goal,
    frame: { stack, reach, hta, sta },
    current: any ? current : undefined,
    adapt: adaptFrom(f.adapt ?? EMPTY_ADAPT),
  }
}

export const fieldLabel = (k: FieldKey): Key => `f.${k}`
export const fieldHow = (k: FieldKey): Key => `f.${k}.how` as Key
