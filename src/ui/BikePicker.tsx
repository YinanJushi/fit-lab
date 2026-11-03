import { useState } from 'react'
import { BIKE_TYPES, brandsFor, DATA_UPDATED, findBike, modelsFor, searchBikes } from '../data/bikes'
import { useT } from '../i18n'
import { complete, FRAME_FIELDS, num, type CustomBike, type Form } from './form'

export const MINE = '__mine__'

export function BikePicker({ form, set }: { form: Form; set: (p: Partial<Form>) => void }) {
  const t = useT()
  const { type, brand, model, size, year } = form.bike
  const [q, setQ] = useState('')
  const results = q.trim().length >= 2 ? searchBikes(type, q) : []
  const mine = form.customBikes.filter((b) => b.type === type)
  const brands = brandsFor(type)
  const models = brand && brand !== MINE ? modelsFor(type, brand) : []
  const bike = model && brand !== MINE ? findBike(type, brand, model, year) : undefined
  const chosen = bike?.sizes.find((s) => s.label === size)
  const custom = brand === MINE ? mine.find((b) => b.id === model) : undefined

  const setBike = (patch: Partial<Form['bike']>) => set({
    bike: { ...form.bike, ...patch },
    v: { ...form.v, stack: '', reach: '', hta: '', sta: '' },
  })
  const fill = (g: { stack: number; reach: number; hta: number; sta: number }) => ({
    ...form.v,
    stack: String(g.stack),
    reach: String(g.reach),
    hta: String(g.hta),
    sta: String(g.sta),
  })
  const pickSize = (label: string) => {
    const s = bike?.sizes.find((x) => x.label === label)
    if (!s) return
    set({ bike: { ...form.bike, size: label }, v: fill(s) })
  }
  const pickFound = (b: { brand: string; model: string; year: number }) => {
    setQ('')
    setBike({ brand: b.brand, model: b.model, year: b.year, size: '' })
  }
  const pickCustom = (id: string) => {
    const c = mine.find((b) => b.id === id)
    set({ bike: { ...form.bike, model: id, year: undefined, size: '' }, v: c ? fill(c) : { ...form.v, stack: '', reach: '', hta: '', sta: '' } })
  }
  const remove = (id: string) => {
    set({
      customBikes: form.customBikes.filter((b) => b.id !== id),
      bike: { ...form.bike, model: '', size: '' },
    })
  }

  const hasAny = brands.length > 0 || mine.length > 0

  return (
    <section className="picker">
      <h2>{t('bike.title')}</h2>
      <p className="muted">{t('bike.hint')}</p>
      <div className="chips" role="group">
        {BIKE_TYPES.map((k) => (
          <button key={k} className={`chip ${type === k ? 'on' : ''}`} aria-pressed={type === k}
            onClick={() => { setQ(''); setBike({ type: k, brand: '', model: '', year: undefined, size: '' }) }}>
            {t(`bike.type.${k}`)}
          </button>
        ))}
      </div>

      {hasAny && (
        <div className="search">
          <input type="search" value={q} placeholder={t('bike.search')} onChange={(e) => setQ(e.target.value)} />
          {results.length > 0 && (
            <ul className="results">
              {results.map((b) => (
                <li key={`${b.brand}|${b.model}|${b.year}`}>
                  <button onClick={() => pickFound(b)}>
                    <strong>{b.brand}</strong> {b.model} <small>{b.year}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!hasAny ? (
        <p className="tip">{t('bike.none')}</p>
      ) : (
        <>
          <label className="field">
            <span className="lbl">{t('bike.brand')}</span>
            <select value={brand} onChange={(e) => setBike({ brand: e.target.value, model: '', year: undefined, size: '' })}>
              <option value="">{t('bike.choose')}</option>
              {mine.length > 0 && <option value={MINE}>{t('bike.mine')}</option>}
              {brands.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>

          {brand === MINE && (
            <label className="field">
              <span className="lbl">{t('bike.model')}</span>
              <select value={model} onChange={(e) => pickCustom(e.target.value)}>
                <option value="">{t('bike.choose')}</option>
                {mine.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          )}

          {brand && brand !== MINE && (
            <label className="field">
              <span className="lbl">{t('bike.model')}</span>
              <select
                value={model ? `${model}|${year ?? ''}` : ''}
                onChange={(e) => {
                  const [name, y] = e.target.value.split('|')
                  setBike({ model: name, year: y ? Number(y) : undefined, size: '' })
                }}
              >
                <option value="">{t('bike.choose')}</option>
                {models.map((m) => <option key={`${m.model}|${m.year}`} value={`${m.model}|${m.year}`}>{m.model} ({m.year})</option>)}
              </select>
            </label>
          )}

          {bike && (
            <div className="field">
              <span className="lbl">{t('bike.size')}</span>
              {bike.partial && <small className="muted">{t('bike.partial')}</small>}
              <div className="chips">
                {bike.sizes.map((s) => (
                  <button key={s.label} className={`chip ${size === s.label ? 'on' : ''}`} aria-pressed={size === s.label}
                    onClick={() => pickSize(s.label)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {bike && chosen && (
            <div className="filled">
              <strong>{t('bike.filled')}</strong>
              <span>Stack {chosen.stack} · Reach {chosen.reach} · HTA {chosen.hta}° · STA {chosen.sta}°</span>
              {!bike.verified && (
                <small>{t('bike.check')} <a href={bike.source} target="_blank" rel="noreferrer">{t('bike.source')}</a></small>
              )}
            </div>
          )}

          {custom && (
            <div className="filled">
              <strong>{t('bike.filled')}</strong>
              <span>Stack {custom.stack} · Reach {custom.reach} · HTA {custom.hta}° · STA {custom.sta}°</span>
              <small>{t('bike.custom.pick')} · <button className="link" onClick={() => remove(custom.id)}>{t('bike.remove')}</button></small>
            </div>
          )}
        </>
      )}
      <p className="muted small">{t('bike.updated', { date: DATA_UPDATED })}</p>
      <p className="tip">{t('bike.notlisted')}</p>
      <h3 className="manual">{t('bike.manual')}</h3>
    </section>
  )
}

export function SaveBike({ form, set }: { form: Form; set: (p: Partial<Form>) => void }) {
  const t = useT()
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<'' | 'done' | 'need'>('')

  const save = () => {
    const [stack, reach, hta, sta] = ['stack', 'reach', 'hta', 'sta'].map((k) => num(form.v[k as 'stack']))
    if (!complete(form, FRAME_FIELDS) || stack === null || reach === null || hta === null || sta === null) {
      setMsg('need')
      return
    }
    const entry: CustomBike = {
      id: `c${Date.now().toString(36)}`,
      name: name.trim() || `${form.bike.type === 'road' ? t('bike.type.road') : t('bike.type.gravel')} ${stack}/${reach}`,
      type: form.bike.type,
      stack, reach, hta, sta,
    }
    set({ customBikes: [...form.customBikes, entry] })
    setName('')
    setMsg('done')
  }

  return (
    <section className="save-bike">
      <h3>{t('bike.save.title')}</h3>
      <div className="inp-row">
        <input type="text" value={name} placeholder={t('bike.save.name')} maxLength={40}
          onChange={(e) => { setName(e.target.value); setMsg('') }} />
        <button className="secondary" onClick={save}>{t('bike.save.btn')}</button>
      </div>
      {msg === 'done' && <p className="ok">{t('bike.save.done')}</p>}
      {msg === 'need' && <p className="msg-warn">{t('bike.save.need')}</p>}
    </section>
  )
}
