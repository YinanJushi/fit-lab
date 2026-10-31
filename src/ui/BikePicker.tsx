import { brandsFor, findBike, modelsFor } from '../data/bikes'
import { useT } from '../i18n'
import type { Form } from './form'

export function BikePicker({ form, set }: { form: Form; set: (p: Partial<Form>) => void }) {
  const t = useT()
  const { type, brand, model, size } = form.bike
  const brands = brandsFor(type)
  const models = brand ? modelsFor(type, brand) : []
  const bike = model ? findBike(type, brand, model) : undefined
  const chosen = bike?.sizes.find((s) => s.label === size)

  const setBike = (patch: Partial<Form['bike']>) => set({ bike: { ...form.bike, ...patch } })
  const pickSize = (label: string) => {
    const s = bike?.sizes.find((x) => x.label === label)
    if (!s) return
    set({
      bike: { ...form.bike, size: label },
      v: { ...form.v, stack: String(s.stack), reach: String(s.reach), hta: String(s.hta), sta: String(s.sta) },
    })
  }

  return (
    <section className="picker">
      <h2>{t('bike.title')}</h2>
      <p className="muted">{t('bike.hint')}</p>
      <div className="chips" role="group">
        {(['road', 'gravel'] as const).map((k) => (
          <button key={k} className={`chip ${type === k ? 'on' : ''}`} aria-pressed={type === k}
            onClick={() => setBike({ type: k, brand: '', model: '', size: '' })}>
            {t(`bike.type.${k}`)}
          </button>
        ))}
      </div>

      {brands.length === 0 ? (
        <p className="tip">{t('bike.none')}</p>
      ) : (
        <>
          <label className="field">
            <span className="lbl">{t('bike.brand')}</span>
            <select value={brand} onChange={(e) => setBike({ brand: e.target.value, model: '', size: '' })}>
              <option value="">{t('bike.choose')}</option>
              {brands.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          {brand && (
            <label className="field">
              <span className="lbl">{t('bike.model')}</span>
              <select value={model} onChange={(e) => setBike({ model: e.target.value, size: '' })}>
                <option value="">{t('bike.choose')}</option>
                {models.map((m) => <option key={m.model} value={m.model}>{m.model} ({m.year})</option>)}
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
        </>
      )}
      <h3 className="manual">{t('bike.manual')}</h3>
    </section>
  )
}
