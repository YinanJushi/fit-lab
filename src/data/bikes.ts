// Starter bike geometry database. Numbers were read from third-party aggregator pages
// (bikeinsights.com) that cite each manufacturer, NOT from the manufacturers' own charts,
// so every entry is `verified: false` until checked against the official chart.
// Sizes are labels as the brand prints them; angles in degrees, lengths in mm.

export type BikeType = 'road' | 'gravel'

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

const table = (labels: string[], stack: number[], reach: number[], hta: number[], sta: number[]): BikeSize[] =>
  labels.map((label, i) => ({ label, stack: stack[i], reach: reach[i], hta: hta[i], sta: sta[i] }))

export const BIKES: Bike[] = [
  {
    brand: 'Specialized',
    model: 'Tarmac SL8',
    maxTire: 32,
    type: 'road',
    year: 2025,
    source: 'https://bikeinsights.com/bikes/6850bdb5a0f4c2001a532a11-specialized-bicycles-tarmac-sl8',
    verified: false,
    sizes: table(
      ['44', '49', '52', '54', '56', '58', '61'],
      [501, 514, 527, 544, 565, 591, 612],
      [366, 375, 380, 384, 395, 402, 408],
      [70.5, 71.75, 72.5, 73, 73.5, 73.5, 74],
      [75.5, 75.5, 74, 74, 73.5, 73.5, 73],
    ),
  },
  {
    brand: 'Giant',
    model: 'TCR Advanced 0',
    maxTire: 32,
    type: 'road',
    year: 2026,
    source: 'https://bikeinsights.com/bikes/5ec58ac612391b00171718bd-giant-bicycles-tcr-advanced',
    verified: false,
    sizes: table(
      ['XS', 'S', 'M', 'ML', 'L', 'XL'],
      [517, 528, 545, 562, 581, 596],
      [376, 383, 388, 393, 402, 412],
      [71, 72.3, 73, 73, 73, 73],
      [74.5, 74, 73.5, 73, 73, 72.5],
    ),
  },
  {
    brand: 'Merida',
    model: 'Scultura 4000',
    type: 'road',
    year: 2026,
    source: 'https://bikeinsights.com/bikes/6a0adf1f44a505001ab0b77e-merida-scultura',
    verified: false,
    sizes: table(
      ['3XS', 'XXS', 'XS', 'S', 'M', 'L', 'XL'],
      [512, 517, 529, 542, 557, 571, 593],
      [373, 377, 384, 390, 395, 400, 409],
      [70.5, 70.5, 72, 72.5, 73.5, 73.5, 74],
      [75.5, 74.5, 74, 74, 73.5, 73, 73],
    ),
  },
  {
    brand: 'Trek',
    model: 'Domane SL 6 Gen 3',
    maxTire: 38,
    type: 'road',
    year: 2023,
    source: 'https://bikeinsights.com/bikes/5afb4f314cb7640014ce45f2-trek-bikes-domane?build=sl-6-gen-3&version=2023',
    verified: false,
    sizes: table(
      ['47', '50', '52', '54', '56', '58', '60', '62'],
      [527, 546, 561, 575, 591, 611, 632, 656],
      [364, 368, 371, 374, 377, 380, 383, 386],
      [71, 71.1, 71.3, 71.3, 71.9, 72, 72.1, 72.1],
      [74.6, 74.6, 74.2, 73.7, 73.3, 73, 72.8, 72.5],
    ),
  },
  {
    brand: 'Trek',
    model: 'Checkpoint ALR 5',
    maxTire: 45,
    type: 'gravel',
    year: 2023,
    source: 'https://bikeinsights.com/bikes/5afb51844cb7640014ce4612-trek-bikes-checkpoint?build=sl5&version=2023',
    verified: false,
    sizes: table(
      ['49', '52', '54', '56', '58', '61'],
      [538, 553, 571, 592, 609, 639],
      [393, 399, 403, 407, 411, 417],
      [71.2, 71.6, 71.8, 72.2, 72.3, 72.6],
      [74.1, 73.7, 73.2, 72.8, 72.5, 72.1],
    ),
  },
  {
    brand: 'Specialized',
    model: 'Diverge Comp Carbon',
    maxTire: 50,
    type: 'gravel',
    year: 2025,
    source: 'https://bikeinsights.com/bikes/677ef3df5beedc00205e0660-specialized-bicycles-diverge?build=comp-carbon&version=2025',
    verified: false,
    sizes: table(
      ['49', '52', '54', '56', '58', '61'],
      [571, 577, 592, 610, 634, 659],
      [365, 374, 383, 392, 401, 410],
      [70, 70.5, 71.25, 71.75, 71.75, 71.75],
      [74, 73.75, 73.5, 73.5, 73.5, 73.5],
    ),
  },
  {
    brand: 'Giant',
    model: 'Revolt Advanced',
    maxTire: 45,
    type: 'gravel',
    year: 2024,
    source: 'https://bikeinsights.com/bikes/5d40cc4486fb150017418dc8-giant-bicycles-revolt-advanced',
    verified: false,
    sizes: table(
      ['S', 'M', 'ML', 'L', 'XL'],
      [570, 586, 602, 616, 630],
      [381, 387, 391, 397, 407],
      [71, 71.5, 72, 72, 72],
      [73.5, 73.5, 73, 73, 73],
    ),
  },
  {
    brand: 'Merida',
    model: 'Silex 4000',
    maxTire: 45,
    type: 'gravel',
    year: 2024,
    source: 'https://bikeinsights.com/bikes/5d60906a04c1cd001759173f-merida-bikes-silex?build=4000&version=2024',
    verified: false,
    sizes: table(
      ['XS', 'S', 'M', 'L', 'XL'],
      [570, 588, 607, 626, 645],
      [392, 402, 412, 426, 441],
      [69.5, 69.5, 69.5, 69.5, 69.5],
      [74.5, 74.5, 74.5, 74.5, 74.5],
    ),
  },
  {
    brand: 'Cannondale',
    model: 'SuperSix EVO',
    maxTire: 32,
    type: 'road',
    year: 2026,
    source: 'https://bikeinsights.com/bikes/5b48e33f73697a0014037051-cannondale-bikes-supersix-evo',
    verified: false,
    sizes: table(
      ['44', '48', '50', '52', '54', '56', '58', '61'],
      [495, 508, 520, 532, 545, 565, 585, 615],
      [373, 376, 379, 383, 387, 393, 398, 406],
      [70.9, 71.2, 71.2, 71.2, 71.2, 73, 73, 73],
      [74.5, 74, 74, 74, 74, 73.5, 73, 72.5],
    ),
  },
  {
    brand: 'Cannondale',
    model: 'Topstone Carbon 1 Lefty',
    type: 'gravel',
    year: 2025,
    source: 'https://bikeinsights.com/bikes/5d2a87ba41846700179c8f83-cannondale-bikes-topstone-carbon',
    verified: false,
    sizes: table(
      ['47', '51', '54', '56', '58', '61'],
      [554, 561, 579, 597, 615, 646],
      [364, 373, 378, 383, 389, 397],
      [69.9, 70.7, 70.7, 70.7, 70.7, 70.7],
      [73.1, 73.1, 73.1, 73.1, 73.1, 73.1],
    ),
  },
  {
    brand: 'Canyon',
    model: 'Grizl CF SL 6',
    maxTire: 45,
    type: 'gravel',
    year: 2022,
    source: 'https://bikeinsights.com/bikes/609a678f9fed2b001c027a44-canyon-bicycles-grizl?build=cf-sl-6&version=2022',
    verified: false,
    partial: true,
    sizes: table(['M', 'L', 'XL'], [579, 605, 626], [402, 409, 427], [72.25, 72.5, 72.75], [73.5, 73.5, 73.5]),
  },
]

export const brandsFor = (type: BikeType): string[] =>
  [...new Set(BIKES.filter((b) => b.type === type).map((b) => b.brand))].sort()

export const modelsFor = (type: BikeType, brand: string): Bike[] =>
  BIKES.filter((b) => b.type === type && b.brand === brand)

export const findBike = (type: BikeType, brand: string, model: string): Bike | undefined =>
  BIKES.find((b) => b.type === type && b.brand === brand && b.model === model)
