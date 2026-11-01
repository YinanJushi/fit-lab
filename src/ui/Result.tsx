import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { computeFit } from '../engine/fit'
import { recommendTires, type BikeKind } from '../engine/tires'
import type { FitInput, FitResult, WarningCode } from '../engine/types'
import { useT, type Key } from '../i18n'
import { ResultDiagram } from './Diagrams'

const Rider3D = lazy(() => import('./Rider3D'))

const fmt = (n: number) => (Math.round(n * 10) / 10).toString()
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n))

const CMP_LABEL: Record<string, Key> = {
  saddleHeight: 'r.saddleHeight',
  stemLength: 'r.stem',
  stemAngle: 'r.stemAngle',
  spacers: 'r.spacers',
  crankLength: 'r.crank',
}

function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(value)
      return
    }
    const start = performance.now()
    const from = value * 0.9
    let raf = 0
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 900)
      setShown(from + (value - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{fmt(shown)}</>
}

export function Result({ input, kind, maxTire }: { input: FitInput; kind: BikeKind; maxTire?: number }) {
  const t = useT()
  const r: FitResult = useMemo(() => computeFit(input), [input])
  const tires = recommendTires(kind, input.goal, maxTire)
  const [view, setView] = useState<'2d' | '3d'>('2d')

  const setback = Math.round(r.saddleSetback)
  const rail = Math.round(r.railOffset)
  const warnKey = (c: WarningCode) => `warn.${c}` as Key

  return (
    <div className="result">
      <div className="result-main">
      <section className="hero-card" aria-label={t('result.title')}>
        <p className="eyebrow">{t(`goal.${input.goal}` as Key)}</p>
        <div className="hero-number">
          <span><CountUp value={r.saddleHeight} /></span>
          <small>{t('unit.mm')}</small>
        </div>
        <p className="hero-label">{t('r.saddleHeight')}</p>
        <p className="muted">{t('result.sub')}</p>
      </section>

      {r.warnings.length > 0 && (
        <section className="warnings" aria-label={t('warn.title')}>
          {[...r.warnings].sort((a, b) => Number(b.code.startsWith('frame_')) - Number(a.code.startsWith('frame_'))).map((w) => (
            <div key={w.code} className={`warning ${w.code.startsWith('frame_') ? 'severe' : ''}`} role="note">
              <span className="warn-icon" aria-hidden="true">!</span>
              <p>{t(warnKey(w.code), w.params)}</p>
            </div>
          ))}
        </section>
      )}

      <div className="chips view-toggle" role="group">
        <button className={`chip ${view === '2d' ? 'on' : ''}`} aria-pressed={view === '2d'} onClick={() => setView('2d')}>
          {t('diagram.view2d')}
        </button>
        <button className={`chip ${view === '3d' ? 'on' : ''}`} aria-pressed={view === '3d'} onClick={() => setView('3d')}>
          {t('diagram.view3d')}
        </button>
      </div>
      {view === '2d' ? (
        <ResultDiagram input={input} result={r} />
      ) : (
        <Suspense fallback={<p className="muted">{t('3d.loading')}</p>}>
          <Rider3D input={input} result={r} />
        </Suspense>
      )}
      </div>

      <div className="result-side">
      <Group title={t('result.saddle')}>
        <Row k={t('r.saddleHeight')} v={`${fmt(r.saddleHeight)} ${t('unit.mm')}`} />
        <Row
          k={t('r.setback')}
          v={t(setback >= 0 ? 'r.setback.back' : 'r.setback.fwd', { n: Math.abs(setback) })}
        />
        <Row k={t('r.seatpost')} v={`${r.seatpostSetback} ${t('unit.mm')}`} />
        <Row
          k={t('r.rail')}
          v={rail === 0 ? t('r.rail.mid') : t(rail > 0 ? 'r.rail.back' : 'r.rail.fwd', { n: Math.abs(rail) })}
        />
      </Group>

      <Group title={t('result.cockpit')}>
        <Row k={t('r.stem')} v={`${r.stemLength} ${t('unit.mm')}`} />
        <Row k={t('r.stemAngle')} v={`${r.stemAngle > 0 ? '+' : ''}${r.stemAngle}°`} />
        <Row k={t('r.spacers')} v={`${r.spacers} ${t('unit.mm')}`} />
      </Group>

      <Group title={t('result.other')}>
        <Row k={t('r.barWidth')} v={`${r.barWidth} ${t('unit.mm')}`} />
        <Row k={t('r.crank')} v={`${r.crankLength} ${t('unit.mm')}`} />
        <Row k={t('r.torso')} v={`${fmt(r.torsoAngle)}°`} />
      </Group>

      <Group title={t('result.tires')}>
        <div className="tire-card">
          <strong>{tires.min === tires.max ? t('tire.single', { n: tires.max }) : t('tire.range', { min: tires.min, max: tires.max })}</strong>
          <p>{tires.frameMax !== null ? t('tire.frame', { n: tires.frameMax }) : t('tire.noframe')}</p>
          {tires.frameLimited && <p className="tire-warn">{t('tire.limited')}</p>}
          <small>{t('tire.tip')}</small>
        </div>
      </Group>

      {r.comparison.length > 0 && (
        <Group title={t('cmp.title')}>
          {r.comparison.map((c) => (
            <div className="row cmp" key={c.key}>
              <span className="k">{t(CMP_LABEL[c.key])}</span>
              <span className="v">
                {fmt(c.current)} → <strong>{fmt(c.recommended)}</strong>
                <em className={c.delta === 0 ? 'zero' : ''}>{sign(c.delta)}</em>
              </span>
            </div>
          ))}
        </Group>
      )}

      <ul className="notes">
        {r.notes.map((n) => (
          <li key={n}>{t(`note.${n}` as Key)}</li>
        ))}
      </ul>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="group">
      <h3>{title}</h3>
      <div className="rows">{children}</div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}
