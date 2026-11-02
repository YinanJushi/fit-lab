import { useMemo, useState } from 'react'
import { BIKES, type Bike, type BikeSize, type BikeType } from '../data/bikes'
import { evaluateSizes, matchBikes, type RiderInput, type SizeVerdict } from '../engine/sizes'
import type { FitInput, FitResult } from '../engine/types'
import { useT, type Key } from '../i18n'
import { type AdaptForm } from './form'

const REPO = 'https://github.com/YinanJushi/fit-lab'

/** Optional "my body works differently" panel on the goal step. */
export function AdaptPanel({ value, onChange }: { value: AdaptForm; onChange: (a: AdaptForm) => void }) {
  const t = useT()
  const toggles: { k: 'flexion' | 'back' | 'upper' | 'prosthesis' | 'stability'; label: Key }[] = [
    { k: 'flexion', label: 'adapt.flexion' },
    { k: 'back', label: 'adapt.back' },
    { k: 'upper', label: 'adapt.upper' },
    { k: 'prosthesis', label: 'adapt.prosthesis' },
    { k: 'stability', label: 'adapt.stability' },
  ]
  const active = Object.values(value).some((v) => v === true || (typeof v === 'string' && v !== ''))
  return (
    <details className="optional adapt" open={active}>
      <summary>
        {t('adapt.title')}
        <small>{t('adapt.sub')}</small>
      </summary>
      <label className="field">
        <span className="lbl">{t('adapt.legdiff')}</span>
        <span className="how">{t('adapt.legdiff.how')}</span>
        <span className="inp">
          <input
            type="number" inputMode="decimal" min={0} value={value.legDiff}
            onChange={(e) => onChange({ ...value, legDiff: e.target.value })}
          />
          <i>{t('unit.mm')}</i>
        </span>
      </label>
      {toggles.map(({ k, label }) => (
        <label className="check" key={k}>
          <input type="checkbox" checked={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} />
          <span>{t(label)}</span>
        </label>
      ))}
      <p className="muted small">{t('adapt.disclaimer')}</p>
    </details>
  )
}

const VERDICT_KEY: Record<SizeVerdict, Key> = {
  best: 'sizes.best',
  good: 'sizes.good',
  stretch: 'sizes.stretch',
  too_small: 'sizes.too_small',
  too_large: 'sizes.too_large',
}

/** Every size of the chosen model, rated for this rider. */
export function SizeTable({ bike, rider }: { bike: Bike; rider: RiderInput }) {
  const t = useT()
  const rows = useMemo(() => evaluateSizes(bike.sizes, rider), [bike, rider])
  return (
    <section className="group sizes">
      <h3>{t('sizes.title')}</h3>
      <p className="muted small">{t('sizes.sub', { bike: `${bike.brand} ${bike.model}` })}</p>
      <div className="rows">
        {rows.map((r) => (
          <div className={`row size-row v-${r.verdict}`} key={r.label}>
            <span className="k"><strong>{r.label}</strong> <small>{t('sizes.col.stack')} {r.stack} · {t('sizes.col.reach')} {r.reach}</small></span>
            <span className={`pill ${r.verdict}`}>{t(VERDICT_KEY[r.verdict])}</span>
          </div>
        ))}
      </div>
      <p className="muted small">{t('sizes.tip')}</p>
    </section>
  )
}

/** Newest year of each brand+model, so the list is not full of the same bike. */
function latestOnly(bikes: Bike[]): Bike[] {
  const best = new Map<string, Bike>()
  for (const b of bikes) {
    const k = `${b.brand}|${b.model}`
    const cur = best.get(k)
    if (!cur || b.year > cur.year) best.set(k, b)
  }
  return [...best.values()]
}

const TYPES: BikeType[] = ['road', 'gravel', 'cyclocross', 'touring']

/** Searches the whole database for models whose best size suits this rider. */
export function BikeFinder({
  rider, kind, onPick,
}: {
  rider: RiderInput
  kind: BikeType
  onPick: (bike: Bike, size: BikeSize) => void
}) {
  const t = useT()
  const [type, setType] = useState<BikeType>(kind)
  const [run, setRun] = useState(false)
  const [busy, setBusy] = useState(false)
  const found = useMemo(
    () => (run ? matchBikes(latestOnly(BIKES.filter((b) => b.type === type)), rider, 20) : []),
    [run, type, rider],
  )
  return (
    <section className="group finder">
      <h3>{t('finder.title')}</h3>
      <p className="muted small">{t('finder.sub')}</p>
      <div className="chips" role="group">
        {TYPES.map((k) => (
          <button key={k} className={`chip ${type === k ? 'on' : ''}`} aria-pressed={type === k} onClick={() => setType(k)}>
            {t(`bike.type.${k}` as Key)}
          </button>
        ))}
      </div>
      {!run ? (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            // let the button repaint before the (short) calculation blocks the thread
            setTimeout(() => { setRun(true); setBusy(false) }, 30)
          }}
        >
          {busy ? t('finder.working') : t('finder.btn')}
        </button>
      ) : found.length === 0 ? (
        <p className="muted">{t('finder.none', { type: t(`bike.type.${type}` as Key) })}</p>
      ) : (
        <ol className="found">
          {found.map(({ bike, size }) => (
            <li key={`${bike.brand}${bike.model}${bike.year}`}>
              <div>
                <strong>{bike.brand} {bike.model}</strong> <small>{bike.year}</small>
                <br />
                <small>{t('finder.size', { s: size.label })} · {t('finder.err', { n: size.error })}</small>
              </div>
              <button
                className="chip"
                onClick={() => {
                  const s = bike.sizes.find((x) => x.label === size.label)
                  if (s) onPick(bike, s)
                }}
              >
                {t('finder.use')}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** Copy / print / report buttons. */
export function ShareBar({
  input, result, bike, size,
}: {
  input: FitInput
  result: FitResult
  bike?: Bike
  size?: string
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const name = bike ? `${bike.brand} ${bike.model} ${bike.year}` : ''
  const summary = () =>
    [
      t('share.title'),
      t('share.line.rider', { h: input.body.height, i: input.body.inseam }),
      ...(bike ? [t('share.line.bike', { bike: name, size: size ?? '-' })] : []),
      t('share.line.goal', { goal: t(`goal.${input.goal}` as Key) }),
      `${t('r.saddleHeight')}: ${result.saddleHeight} ${t('unit.mm')}`,
      `${t('r.stem')}: ${result.stemLength} ${t('unit.mm')} / ${result.stemAngle}°`,
      `${t('r.spacers')}: ${result.spacers} ${t('unit.mm')}`,
      `${t('r.barWidth')}: ${result.barWidth} ${t('unit.mm')}`,
      `${t('r.crank')}: ${result.crankLength} ${t('unit.mm')}`,
      ...(result.shim > 0 ? [`${t('r.shim')}: ${t('r.shim.v', { n: result.shim })}`] : []),
      t('share.line.note'),
    ].join('\n')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked: the print button still works
    }
  }
  const issue = `${REPO}/issues/new?title=${encodeURIComponent(`Data check: ${name || 'general'}`)}&body=${encodeURIComponent(
    `Bike: ${name} ${size ?? ''}\nWhat looks wrong:\n`,
  )}`
  return (
    <div className="share-bar no-print">
      <button className="chip" onClick={copy}>{copied ? t('share.copied') : t('share.copy')}</button>
      <button className="chip" onClick={() => window.print()}>{t('share.print')}</button>
      <a className="chip" href={issue} target="_blank" rel="noopener noreferrer">{t('share.wrong')}</a>
    </div>
  )
}
