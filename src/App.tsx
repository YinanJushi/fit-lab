import { useEffect, useMemo, useState } from 'react'
import type { Flexibility, Goal } from './engine/types'
import { LangContext, makeT, type Key } from './i18n'
import { BikePicker } from './ui/BikePicker'
import { BodyDiagram, FrameDiagram } from './ui/Diagrams'
import {
  BODY_FIELDS, CUR_FIELDS, EMPTY_FORM, EXAMPLE, FRAME_FIELDS, RANGES, complete, fieldHow, fieldLabel,
  isAngle, status, toInput, type FieldKey, type Form,
} from './ui/form'
import { Result } from './ui/Result'
import { load, save } from './ui/storage'

const STORAGE_KEY = 'fitlab.v1'
const STEPS: Key[] = ['step.body', 'step.flex', 'step.goal', 'step.frame', 'step.result']
const GOALS: Goal[] = ['comfort', 'endurance', 'race', 'aero']
const FLEX: Flexibility[] = [0, 1, 2, 3]

export default function App() {
  const [form, setForm] = useState<Form>(() => load(STORAGE_KEY, EMPTY_FORM))
  const [focus, setFocus] = useState<FieldKey | undefined>()
  const t = useMemo(() => makeT(form.lang), [form.lang])

  useEffect(() => save(STORAGE_KEY, form), [form])
  useEffect(() => {
    document.documentElement.lang = form.lang === 'zh' ? 'zh-CN' : 'en'
    window.scrollTo(0, 0)
  }, [form.lang, form.step])

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }))
  const go = (step: number) => set({ step })
  const step = Math.min(Math.max(form.step, 0), STEPS.length)
  const input = useMemo(() => toInput(form), [form])

  const canNext =
    step === 1 ? complete(form, BODY_FIELDS)
    : step === 2 ? form.flex !== null
    : step === 3 ? form.goal !== null
    : step === 4 ? complete(form, FRAME_FIELDS)
    : true

  return (
    <LangContext.Provider value={t}>
      <div className="app">
        <header className="topbar">
          <span className="brand">{t('app.title')}</span>
          <button className="ghost-btn" onClick={() => set({ lang: form.lang === 'zh' ? 'en' : 'zh' })}>
            {t('lang.switch')}
          </button>
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
              <h1>{t('app.tagline')}</h1>
              <p>{t('intro.body')}</p>
              <p className="muted">{t('intro.time')}</p>
              <button className="primary" onClick={() => go(1)}>{t('start')}</button>
              <button
                className="secondary"
                onClick={() => set({ ...EXAMPLE, cur: EMPTY_FORM.cur, step: 1 })}
              >
                {t('example')}
              </button>
              <FrameDiagram />
            </section>
          )}

          {step === 1 && (
            <FieldsStep
              form={form} set={set} keys={BODY_FIELDS} focus={focus} setFocus={setFocus}
              visual={<BodyDiagram active={focus ?? 'height'} />} tip
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
                    <strong>{t(`goal.${g}` as Key)}</strong>
                    <span>{t(`goal.${g}.d` as Key)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <>
              <BikePicker form={form} set={set} />
              <FieldsStep
                form={form} set={set} keys={FRAME_FIELDS} focus={focus} setFocus={setFocus}
                visual={<FrameDiagram active={focus ?? 'stack'} />}
              />
              <details className="optional">
                <summary>{t('cur.title')}<small>{t('cur.opt')}</small></summary>
                {CUR_FIELDS.map((k) => (
                  <label className="field" key={k}>
                    <span className="lbl">{t(`cur.${k}` as Key)}</span>
                    <span className="inp">
                      <input type="number" inputMode="decimal" value={form.cur[k]}
                        onChange={(e) => set({ cur: { ...form.cur, [k]: e.target.value } })} />
                      <i>{k === 'stemAngle' ? '°' : t('unit.mm')}</i>
                    </span>
                  </label>
                ))}
              </details>
            </>
          )}

          {step === 5 && (input ? <Result input={input} /> : <p>{t('err.empty')}</p>)}
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

        <footer className="disclaimer">{t('disclaimer')}</footer>
        </div>
      </div>
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
}) {
  const { form, set, keys, setFocus } = props
  const t = useMemo(() => makeT(form.lang), [form.lang])
  return (
    <section>
      {props.title && <h2>{props.title}</h2>}
      {props.intro && <p className="muted">{props.intro}</p>}
      {props.tip && <p className="tip">{t('measure.tip')}</p>}
      <div className="visual">{props.visual}</div>
      {keys.map((k) => {
        const st = status(k, form.v[k])
        const [min, max] = RANGES[k]
        return (
          <label className={`field ${st.kind === 'range' ? 'warn' : ''}`} key={k}>
            <span className="lbl">{t(fieldLabel(k))}</span>
            <span className="how">{t(fieldHow(k))}</span>
            <span className="inp">
              <input
                type="number" inputMode="decimal" step={isAngle(k) ? 0.5 : 1} value={form.v[k]}
                placeholder={String(Math.round((min + max) / 2))}
                onFocus={() => setFocus(k)}
                onChange={(e) => set({ v: { ...form.v, [k]: e.target.value } })}
              />
              <i>{isAngle(k) ? '°' : t('unit.mm')}</i>
            </span>
            {st.kind === 'range' && <span className="msg">{t('err.range', { min: st.min, max: st.max })}</span>}
          </label>
        )
      })}
    </section>
  )
}
