// Everything inside the app (form values, engine, saved bikes) stays in millimetres. This module
// only converts at the edges: what the user types and what we print.
import { createContext, useContext, useState, type InputHTMLAttributes } from 'react'

export type Units = 'mm' | 'in'
const MM_PER_IN = 25.4

const round = (n: number, d: number) => {
  const p = 10 ** d
  return Math.round(n * p) / p
}

export interface UnitFmt {
  units: Units
  label: string
  /** mm -> number text in the chosen unit, no label */
  num: (mm: number) => string
  /** mm -> number text plus unit label */
  len: (mm: number) => string
}

export function makeUnits(units: Units, label: string): UnitFmt {
  const num = (mm: number) => String(units === 'in' ? round(mm / MM_PER_IN, 2) : round(mm, 1))
  return { units, label, num, len: (mm) => `${num(mm)} ${label}` }
}

export const UnitsContext = createContext<UnitFmt>(makeUnits('mm', 'mm'))
export const useUnits = () => useContext(UnitsContext)

/** Pure helper for tests: text typed in `units` -> mm text ('' stays '', junk stays as typed). */
export function typedToMm(text: string, units: Units): string {
  if (units === 'mm' || text.trim() === '') return text
  const n = Number(text)
  return Number.isFinite(n) ? String(round(n * MM_PER_IN, 2)) : text
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  /** millimetres, as text */
  value: string
  onValue: (mm: string) => void
}

/**
 * Number input holding a millimetre value. In inches it shows the converted value and keeps
 * what the user is typing as a draft, so "3." or "28.1" are not rewritten mid-keystroke.
 */
export function LenInput({ value, onValue, onBlur, ...rest }: Props) {
  const u = useUnits()
  const [draft, setDraft] = useState<string | null>(null)
  const n = value.trim() === '' ? null : Number(value)
  const shown = u.units === 'mm' ? value : draft ?? (n === null || !Number.isFinite(n) ? value : u.num(n))
  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      value={shown}
      onChange={(e) => {
        if (u.units === 'in') setDraft(e.target.value)
        onValue(typedToMm(e.target.value, u.units))
      }}
      onBlur={(e) => {
        setDraft(null)
        onBlur?.(e)
      }}
    />
  )
}
