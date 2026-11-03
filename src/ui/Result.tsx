import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { computeFit } from '../engine/fit'
import { recommendTires, type BikeKind } from '../engine/tires'
import type { FitInput, FitResult, WarningCode } from '../engine/types'
import { useT, type Key } from '../i18n'
import { ResultDiagram } from './Diagrams'
import { BikeFinder, ShareBar, SizeTable } from './Extras'
import { useUnits } from './units'
import type { Bike, BikeSize } from '../data/bikes'

const Rider3D = lazy(() => import('./Rider3D'))

const fmt = (n: number) => (Math.round(n * 10) / 10).toString()

/** Warning parameters that are lengths get printed in the rider's unit. */
const LEN_PARAMS: Partial<Record<WarningCode, string[]>> = {
  saddle_change_large: ['change'],
  rail_out_of_range: ['rail'],
  legdiff_large: ['mm'],
  adapt_stability: ['n'],
}
function lenParams(w: { code: WarningCode; params?: Record<string, number | string> }, u: ReturnType<typeof useUnits>) {
  if (!w.params) return undefined
  const keys = LEN_PARAMS[w.code] ?? []
  return Object.fromEntries(Object.entries(w.params).map(([k, v]) => [k, keys.includes(k) ? u.len(Number(v)) : v]))
}

const CMP_LABEL: Record<string, Key> = {
  saddleHeight: 'r.saddleHeight',
  stemLength: 'r.stem',
  stemAngle: 'r.stemAngle',
  spacers: 'r.spacers',
  crankLength: 'r.crank',
}

function CountUp({ value, digits }: { value: number; digits: number }) {
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
  return <>{(Math.round(shown * 10 ** digits) / 10 ** digits).toString()}</>
}

export function Result({
  input, kind, maxTire, bike, size, onPick,
}: {
  input: FitInput
  kind: BikeKind
  maxTire?: number
  bike?: Bike
  size?: string
  onPick: (bike: Bike, size: BikeSize) => void
}) {
  const t = useT()
  const u = useUnits()
  const r: FitResult = useMemo(() => computeFit(input), [input])
  const tires = recommendTires(kind, input.goal, maxTire)
  const { frame: _frame, ...rider } = input
  const [view, setView] = useState<'2d' | '3d'>('2d')

  const setback = Math.round(r.saddleSetback)
  const rail = Math.round(r.railOffset)
  const cv = (key: string, v: number) => (key === 'stemAngle' ? fmt(v) : u.num(v))
  const cvSign = (key: string, v: number) => (v > 0 ? '+' : v < 0 ? '−' : '') + cv(key, Math.abs(v))
  const warnKey = (c: WarningCode) => `warn.${c}` as Key

  return (
    <div className="result">
      <div className="result-main">
      <section className="hero-card" aria-label={t('result.title')}>
        <p className="eyebrow">{t(`goal.${input.goal}` as Key)}</p>
        <div className="hero-number">
          <span><CountUp value={u.units === 'in' ? r.saddleHeight / 25.4 : r.saddleHeight} digits={u.units === 'in' ? 2 : 1} /></span>
          <small>{u.label}</small>
        </div>
        <p className="hero-label">{t('r.saddleHeight')}</p>
        <p className="muted">{t('result.sub')}</p>
      </section>

      {r.warnings.length > 0 && (
        <section className="warnings" aria-label={t('warn.title')}>
          {[...r.warnings].sort((a, b) => Number(b.code.startsWith('frame_')) - Number(a.code.startsWith('frame_'))).map((w) => (
            <div key={w.code} className={`warning ${w.code.startsWith('frame_') ? 'severe' : ''}`} role="note">
              <span className="warn-icon" aria-hidden="true">!</span>
              <p>{t(warnKey(w.code), lenParams(w, u))}</p>
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
        <Row k={t('r.saddleHeight')} v={u.len(r.saddleHeight)} />
        <Row
          k={t('r.setback')}
          v={t(setback >= 0 ? 'r.setback.back' : 'r.setback.fwd', { n: u.len(Math.abs(setback)) })}
        />
        <Row k={t('r.seatpost')} v={u.len(r.seatpostSetback)} />
        <Row
          k={t('r.rail')}
          v={rail === 0 ? t('r.rail.mid') : t(rail > 0 ? 'r.rail.back' : 'r.rail.fwd', { n: u.len(Math.abs(rail)) })}
        />
      </Group>

      <Group title={t('result.cockpit')}>
        <Row k={t('r.stem')} v={u.len(r.stemLength)} />
        <Row k={t('r.stemAngle')} v={`${r.stemAngle > 0 ? '+' : ''}${r.stemAngle}°`} />
        <Row k={t('r.spacers')} v={u.len(r.spacers)} />
      </Group>

      <Group title={t('result.other')}>
        <Row k={t('r.barWidth')} v={u.len(r.barWidth)} />
        <Row k={t('r.crank')} v={u.len(r.crankLength)} />
        {r.shim > 0 && <Row k={t('r.shim')} v={t('r.shim.v', { n: r.shim })} />}
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
                {cv(c.key, c.current)} → <strong>{cv(c.key, c.recommended)}</strong>
                <em className={c.delta === 0 ? 'zero' : ''}>{cvSign(c.key, c.delta)}</em>
              </span>
            </div>
          ))}
        </Group>
      )}

      <ShareBar input={input} result={r} bike={bike} size={size} />
      {bike && <SizeTable bike={bike} rider={rider} />}
      <BikeFinder rider={rider} kind={kind} onPick={onPick} />

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
