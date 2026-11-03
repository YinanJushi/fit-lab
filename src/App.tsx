import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { Flexibility, Goal } from './engine/types'
import { analyticsOn, trackEvent } from './analytics'
import { LangContext, makeT, type Key } from './i18n'
import { BikePicker, SaveBike } from './ui/BikePicker'
import { AdaptPanel } from './ui/Extras'
import { LenInput, makeUnits, UnitsContext, useUnits } from './ui/units'
import type { Bike, BikeSize } from './data/bikes'
import { computeFit } from './engine/fit'
import { findBike } from './data/bikes'
import { BodyDiagram, FrameDiagram, PostureIcon, ResultDiagram } from './ui/Diagrams'
import {
  BODY_FIELDS, CUR_FIELDS, EMPTY_FORM, EXAMPLE, FRAME_FIELDS, RANGES, complete, fieldHow, fieldLabel,
  exampleForm, isAngle, num, status, toInput, validField, type FieldKey, type Form,
} from './ui/form'
import { Result } from './ui/Result'
import type { PoseMeasurements } from './engine/bodyFromPose'

const CameraMeasure = lazy(() => import('./ui/CameraMeasure'))
import { load, save } from './ui/storage'

const STORAGE_KEY = 'fitlab.v1'

// Real computed example used for the welcome illustration.
const DEMO = (() => {
  const input = toInput({ ...EMPTY_FORM, ...EXAMPLE })!
  return { input, result: computeFit(input) }
})()
const STEPS: Key[] = ['step.body', 'step.flex', 'step.goal', 'step.frame', 'step.result']
const GOALS: Goal[] = ['comfort', 'endurance', 'race', 'aero']
const FLEX: Flexibility[] = [0, 1, 2, 3]

export default function App() {
  const [form, setForm] = useState<Form>(() => load(STORAGE_KEY, EMPTY_FORM))
  const [focus, setFocus] = useState<FieldKey | undefined>()
  const [camOpen, setCamOpen] = useState(false)
  const t = useMemo(() => makeT(form.lang), [form.lang])
  const units = useMemo(() => makeUnits(form.units, t(form.units === 'in' ? 'unit.in' : 'unit.mm')), [form.units, t])

  useEffect(() => save(STORAGE_KEY, form), [form])
  useEffect(() => {
    if (form.step === 5) trackEvent('fit-result')
  }, [form.step])
  useEffect(() => {
    document.documentElement.lang = form.lang === 'zh' ? 'zh-CN' : 'en'
    window.scrollTo(0, 0)
  }, [form.lang, form.step])

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const go = (step: number) => set({ step })
  const step = Math.min(Math.max(form.step, 0), STEPS.length)
  const input = useMemo(() => toInput(form), [form])

  const chosenBike = form.bike.model && form.bike.brand
    ? findBike(form.bike.type, form.bike.brand, form.bike.model, form.bike.year)
    : undefined
  const pickBike = (b: Bike, s: BikeSize) =>
    set({
      bike: { type: b.type, brand: b.brand, model: b.model, year: b.year, size: s.label },
      v: { ...form.v, stack: String(s.stack), reach: String(s.reach), hta: String(s.hta), sta: String(s.sta) },
    })

  const canNext =
    step === 1 ? complete(form, BODY_FIELDS)
    : step === 2 ? form.flex !== null
    : step === 3 ? form.goal !== null
    : step === 4 ? complete(form, FRAME_FIELDS)
    : true

  return (
    <LangContext.Provider value={t}>
      <UnitsContext.Provider value={units}>
      <div className="app">
        <header className="topbar">
          <span className="brand">{t('app.title')}</span>
          <span className="top-actions">
            <button
              className="ghost-btn" aria-label={t('units.switch')}
              onClick={() => set({ units: form.units === 'mm' ? 'in' : 'mm' })}
            >
              {t(form.units === 'mm' ? 'units.to_in' : 'units.to_mm')}
            </button>
            <button className="ghost-btn" onClick={() => set({ lang: form.lang === 'zh' ? 'en' : 'zh' })}>
              {t('lang.switch')}
            </button>
          </span>
        </header>

        {step > 0 && (
          <nav className="progress" aria-label={t('step.of', { n: step, total: STEPS.length })}>
            <div className="bar"><div style={{ width: `${(step / STEPS.length) * 100}%` }} /></div>
            <p>
              <span>{t('step.of', { n: step, total: STEPS.length })}</span>
              <strong>{t(STEPS[step - 1])}</strong>
            </p>
          </nav>
        )}

        <main className="screen" key={step}>
          {step === 0 && (
            <section className="intro">
              <div className="hero">
                <p className="kicker">{t('hero.kicker')}</p>
                <h1>{t('app.tagline')}</h1>
                <div className="hero-art"><ResultDiagram input={DEMO.input} result={DEMO.result} compact /></div>
                <ul className="perks">
                  <li>{t('perk.time')}</li><li>{t('perk.private')}</li><li>{t('perk.offline')}</li>
                </ul>
              </div>
              <p className="lede">{t('intro.body')}</p>
              <button className="primary" onClick={() => go(1)}>{t('start')}</button>
              <button
                className="secondary"
                onClick={() => setForm(exampleForm(form))}
              >
                {t('example')}
              </button>
              <h2 className="how-title">{t('how.title')}</h2>
              <ol className="how">
                {[1, 2, 3].map((n) => (
                  <li key={n}>
                    <span className="num">{n}</span>
                    <strong>{t(`how.${n}.t` as Key)}</strong>
                    <p>{t(`how.${n}.d` as Key)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {step === 1 && (
            <FieldsStep
              form={form} set={set} keys={BODY_FIELDS} focus={focus} setFocus={setFocus}
              visual={<BodyDiagram active={focus ?? 'height'} />} tip
              extra={
                <>
                  <button className="secondary measure-btn" onClick={() => setCamOpen(true)} disabled={!validField('height', form.v.height)}>
                    {t('cam.open')}
                  </button>
                  {!validField('height', form.v.height) && <p className="muted small">{t('cam.need')}</p>}
                </>
              }
            />
          )}

          {step === 2 && (
            <section>
              <h2>{t('flex.title')}</h2>
              <p className="muted">{t('flex.how')}</p>
              <div className="choices">
                {FLEX.map((f) => (
                  <button key={f} className={`choice ${form.flex === f ? 'sel' : ''}`} aria-pressed={form.flex === f}
                    onClick={() => set({ flex: f })}>
                    <span className="dots" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= f ? 'on' : ''} />)}</span>
                    {t(`flex.${f}` as Key)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h2>{t('goal.title')}</h2>
              <div className="choices">
                {GOALS.map((g) => (
                  <button key={g} className={`choice goal ${form.goal === g ? 'sel' : ''}`} aria-pressed={form.goal === g}
                    onClick={() => set({ goal: g })}>
                    <PostureIcon goal={g} />
                    <strong>{t(`goal.${g}` as Key)}</strong>
                    <span>{t(`goal.${g}.d` as Key)}</span>
                  </button>
                ))}
              </div>
              <AdaptPanel value={form.adapt} onChange={(adapt) => set({ adapt })} />
            </section>
          )}

          {step === 4 && (
            <div className="frame-step">
              <BikePicker form={form} set={set} />
              <div className="frame-fields">
              <FieldsStep
                form={form} set={set} keys={FRAME_FIELDS} focus={focus} setFocus={setFocus}
                visual={<FrameDiagram active={focus ?? 'stack'} />}
              />
              <SaveBike form={form} set={set} />
              <details className="optional">
                <summary>{t('cur.title')}<small>{t('cur.opt')}</small></summary>
                {CUR_FIELDS.map((k) => (
                  <label className="field" key={k}>
                    <span className="lbl">{t(`cur.${k}` as Key)}</span>
                    <span className="inp">
                      {k === 'stemAngle' ? (
                        <input type="number" inputMode="decimal" value={form.cur[k]}
                          onChange={(e) => set({ cur: { ...form.cur, [k]: e.target.value } })} />
                      ) : (
                        <LenInput value={form.cur[k]} onValue={(v) => set({ cur: { ...form.cur, [k]: v } })} />
                      )}
                      <i>{k === 'stemAngle' ? '°' : units.label}</i>
                    </span>
                  </label>
                ))}
              </details>
              </div>
            </div>
          )}

          {step === 5 && (input ? (
            <Result
              input={input}
              kind={form.bike.type}
              maxTire={chosenBike?.maxTire}
              bike={chosenBike}
              size={form.bike.size}
              onPick={pickBike}
            />
          ) : <p>{t('err.empty')}</p>)}
        </main>

        <div className="bottom">
        {step > 0 && (
          <div className="actions">
            <button className="secondary" onClick={() => go(step - 1)}>{t('back')}</button>
            {step < STEPS.length ? (
              <button className="primary" disabled={!canNext} onClick={() => go(step + 1)}>{t('next')}</button>
            ) : (
              <button className="primary" onClick={() => go(0)}>{t('restart')}</button>
            )}
          </div>
        )}

        {camOpen && (
          <Suspense fallback={null}>
            <CameraMeasure
              heightMm={num(form.v.height) ?? 1750}
              onClose={() => setCamOpen(false)}
              onApply={(m: PoseMeasurements) =>
                set({
                  v: {
                    ...form.v,
                    inseam: String(m.inseam),
                    torso: String(m.torso),
                    shoulderWidth: String(m.shoulderWidth),
                    ...(m.arm > 0 ? { arm: String(m.arm) } : {}),
                  },
                })
              }
            />
          </Suspense>
        )}
        <footer className="disclaimer">
          {t('disclaimer')}
          {analyticsOn() && <span className="count-note"> {t('analytics.note')}</span>}
        </footer>
        </div>
      </div>
      </UnitsContext.Provider>
    </LangContext.Provider>
  )
}

function FieldsStep(props: {
  form: Form
  set: (p: Partial<Form>) => void
  keys: FieldKey[]
  focus?: FieldKey
  setFocus: (k: FieldKey | undefined) => void
  visual: React.ReactNode
  title?: string
  intro?: string
  tip?: boolean
  extra?: React.ReactNode
}) {
  const { form, set, keys, setFocus } = props
  const t = useMemo(() => makeT(form.lang), [form.lang])
  const u = useUnits()
  return (
    <section className="fields-step">
      {props.title && <h2>{props.title}</h2>}
      {props.intro && <p className="muted">{props.intro}</p>}
      {props.tip && <p className="tip">{t('measure.tip')}</p>}
      {props.extra}
      <div className="visual">{props.visual}</div>
      {keys.map((k) => {
        const st = status(k, form.v[k])
        const [min, max] = RANGES[k]
        return (
          <label className={`field ${st.kind === 'range' || st.kind === 'invalid' ? 'warn' : ''}`} key={k}>
            <span className="lbl">{t(fieldLabel(k))}</span>
            <span className="how">{t(fieldHow(k))}</span>
            <span className="inp">
              {(() => {
                const common = {
                  placeholder: isAngle(k) ? String(Math.round((min + max) / 2)) : u.num(Math.round((min + max) / 2)),
                  'aria-invalid': st.kind === 'invalid',
                  'aria-describedby': st.kind === 'invalid' || st.kind === 'range' ? `error-${k}` : undefined,
                  onFocus: () => setFocus(k),
                }
                const change = (v: string) => set({
                  v: { ...form.v, [k]: v },
                  ...(FRAME_FIELDS.includes(k) ? { bike: { type: form.bike.type, brand: '', model: '', size: '' } } : {}),
                })
                return isAngle(k) ? (
                  <input {...common} type="number" inputMode="decimal" step={0.5} value={form.v[k]}
                    onChange={(e) => change(e.target.value)} />
                ) : (
                  <LenInput {...common} step={u.units === 'in' ? 0.1 : 1} value={form.v[k]} onValue={change} />
                )
              })()}
              <i>{isAngle(k) ? '°' : u.label}</i>
            </span>
            {st.kind === 'invalid' && <span className="msg" id={`error-${k}`} role="alert">{t(isAngle(k) ? 'err.angle' : 'err.positive')}</span>}
            {st.kind === 'range' && <span className="msg" id={`error-${k}`}>{t('err.range', isAngle(k) ? { min: st.min, max: st.max } : { min: u.num(st.min), max: `${u.num(st.max)} ${u.label}` })}</span>}
          </label>
        )
      })}
    </section>
  )
}
