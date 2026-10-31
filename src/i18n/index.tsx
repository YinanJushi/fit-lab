import { createContext, useContext } from 'react'
import { dict, type Key, type Lang } from './dict'

export type { Key, Lang }

export type T = (key: Key, params?: Record<string, string | number>) => string

export function makeT(lang: Lang): T {
  return (key, params) => {
    let s = dict[lang][key]
    if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}

export const LangContext = createContext<T>(makeT('en'))
export const useT = () => useContext(LangContext)
