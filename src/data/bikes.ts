// Bike geometry database. The numbers live in bikes.json, which scripts/update-bikes.mjs keeps
// fresh (a GitHub Action runs it every month). They come from third-party listings
// (bikeinsights.com), NOT the manufacturers' own charts, so every entry is `verified: false`.
// Sizes are labels as the brand prints them; angles in degrees, lengths in mm.
import data from './bikes.json'

export type BikeType = 'road' | 'gravel' | 'cyclocross' | 'touring'
export const BIKE_TYPES: BikeType[] = ['road', 'gravel', 'cyclocross', 'touring']

export interface BikeSize {
  label: string
  stack: number
  reach: number
  hta: number
  sta: number
}

export interface Bike {
  brand: string
  model: string
  type: BikeType
  year: number
  source: string
  verified: boolean
  /** true when the source listed only some of the brand's sizes */
  partial?: boolean
  /** frame's maximum tire width in mm. Where sources disagreed, the lowest credible value is used. */
  maxTire?: number
  sizes: BikeSize[]
}

export const BIKES = data.bikes as unknown as Bike[]
/** Date the data file was last refreshed (YYYY-MM-DD). */
export const DATA_UPDATED: string = data.updated

export const brandsFor = (type: BikeType): string[] =>
  [...new Set(BIKES.filter((b) => b.type === type).map((b) => b.brand))].sort()

export const modelsFor = (type: BikeType, brand: string): Bike[] =>
  BIKES.filter((b) => b.type === type && b.brand === brand).sort(
    (a, b) => a.model.localeCompare(b.model) || b.year - a.year,
  )

export const findBike = (type: BikeType, brand: string, model: string, year?: number): Bike | undefined =>
  BIKES.find(
    (b) => b.type === type && b.brand === brand && b.model === model && (year === undefined || b.year === year),
  )

/** Free-text search across brand and model for one bike type. */
export function searchBikes(type: BikeType, query: string, limit = 12): Bike[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return BIKES.filter((b) => {
    if (b.type !== type) return false
    const hay = `${b.brand} ${b.model}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
    .sort((a, b) => b.year - a.year)
    .slice(0, limit)
}
