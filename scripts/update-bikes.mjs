// Collects bike geometry from bikeinsights.com (public pages, robots.txt allows it) and merges
// it into src/data/bikes.json. Safe to re-run: it only overwrites entries it re-reads successfully,
// rejects anything that fails sanity checks, and refuses to write if the result looks broken.
//
//   node scripts/update-bikes.mjs                       # all brands in scripts/brands.json
//   node scripts/update-bikes.mjs --brands=giant,trek   # only some brands (matched on the key)
//   node scripts/update-bikes.mjs --max-families=40 --delay=700
//
// Every entry stays `verified: false`: the numbers come from a third-party site, not the makers.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'src/data/bikes.json')
const BRANDS = JSON.parse(readFileSync(join(ROOT, 'scripts/brands.json'), 'utf8'))
const SITE = 'https://bikeinsights.com'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)
const MAX_FAMILIES = Number(args['max-families'] ?? 40)
const DELAY = Number(args.delay ?? 700)
const WORKERS = Number(args.workers ?? 2)
const ONLY = args.brands ? String(args.brands).split(',') : null
const SHARD = args.shard ? String(args.shard).split('/').map(Number) : null // e.g. --shard=1/3
const OUT = args.out ? String(args.out) : DATA

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const text = (s) => decode(s.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

async function get(path, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(SITE + path, {
        headers: { 'user-agent': 'FitLabBikeData/1.0 (+https://github.com/YinanJushi/fit-lab)' },
        signal: AbortSignal.timeout(30000),
      })
      if (res.ok) return await res.text()
      if (res.status === 404) return null
    } catch {
      // retry
    }
    await sleep(1500 * (i + 1))
  }
  return null
}

/** Map the site's category sentence to one of our bike types, or null to skip. */
function typeFromCategory(c) {
  const s = c.toLowerCase()
  if (/triathlon|track|fixed|kids|city|fitness|hybrid|commuter|comfort|folding|mini-velo|cargo|bmx|polo|mountain|e-bike|ebike|low-trail/.test(s)) return null
  if (/cyclocross/.test(s)) return 'cyclocross'
  if (/touring/.test(s)) return 'touring'
  if (/gravel|all-road/.test(s)) return 'gravel'
  if (/performance road|endurance road|^road/.test(s)) return 'road'
  return null
}

const RANGE = { stack: [400, 800], reach: [300, 520], hta: [65, 78], sta: [68, 80] }

/** Parse one bike page into an entry, or null when anything looks wrong. */
export function parsePage(html, brand, url) {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/s)
  if (!h1) return null
  const title = text(h1[1])
  const m = title.match(/^(\d{4})\s+(.*)$/)
  if (!m) return null
  const year = Number(m[1])
  let model = m[2]
  const label = brand.label.toLowerCase()
  if (model.toLowerCase().startsWith(label)) model = model.slice(brand.label.length).trim()
  model = model.replace(/\s+(Base|all)$/i, '').trim()
  if (!model) return null

  const cat = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/)?.[1] ?? ''
  const type = typeFromCategory(decode(cat).split(' bike with')[0])
  if (!type) return null

  const rows = [...html.matchAll(/<tr>(.*?)<\/tr>/gs)].map((r) => r[1])
  const byTitle = {}
  let sizes = null
  for (const row of rows) {
    const t = row.match(/<td class="title"><div>([^<]+)/)
    const cells = [...row.matchAll(/<td class="gc[^"]*">(.*?)<\/td>/gs)].map((c) => c[1])
    if (!t) {
      if (!sizes && cells.length >= 3 && cells.every((c) => /<span class="value"><strong>/.test(c))) sizes = cells.map((c) => text(c))
      continue
    }
    const name = t[1].trim()
    if (['Stack', 'Reach', 'Head Tube Angle', 'Seat Tube Angle'].includes(name)) {
      byTitle[name] = cells.map((c) => {
        const v = c.match(/<span class="value">([^<]*)<\/span>/)
        const n = v ? Number(v[1].replace(/[^0-9.]/g, '')) : NaN
        return Number.isFinite(n) && n > 0 ? n : NaN
      })
    }
  }
  if (!sizes || !byTitle.Stack || !byTitle.Reach || !byTitle['Head Tube Angle'] || !byTitle['Seat Tube Angle']) return null

  // columns -> sizes; a size shown twice with different numbers is dropped, never guessed
  const groups = new Map()
  sizes.forEach((label, i) => {
    const rec = [byTitle.Stack[i], byTitle.Reach[i], byTitle['Head Tube Angle'][i], byTitle['Seat Tube Angle'][i]]
    if (rec.some((x) => !Number.isFinite(x))) return
    const list = groups.get(label) ?? []
    list.push(rec)
    groups.set(label, list)
  })
  let out = []
  for (const [label, list] of groups) {
    if (list.some((r) => r.join() !== list[0].join())) continue
    const [stack, reach, hta, sta] = list[0]
    if (stack < RANGE.stack[0] || stack > RANGE.stack[1] || reach < RANGE.reach[0] || reach > RANGE.reach[1]) continue
    if (hta < RANGE.hta[0] || hta > RANGE.hta[1] || sta < RANGE.sta[0] || sta > RANGE.sta[1]) continue
    out.push({ label: label.slice(0, 12), stack: Math.round(stack * 10) / 10, reach: Math.round(reach * 10) / 10, hta, sta })
  }
  out.sort((a, b) => a.stack - b.stack)
  if (out.length < 3) return null
  for (let i = 1; i < out.length; i++) if (!(out[i].stack > out[i - 1].stack && out[i].reach > out[i - 1].reach)) return null

  return { brand: brand.display, model, type, year, source: SITE + url, verified: false, sizes: out }
}

/** From a brand page: families with their version/build links. */
export function parseBrandPage(html) {
  const fam = new Map()
  for (const m of html.matchAll(/href="(\/bikes\/[^"?]+)(\?[^"]*)?"/g)) {
    const path = m[1]
    const q = new URLSearchParams(decode(m[2] ?? '').replace(/^\?/, ''))
    const f = fam.get(path) ?? { path, versions: new Set(), builds: new Map() }
    const v = q.get('version')
    if (v && /^\d{4}$/.test(v)) {
      f.versions.add(Number(v))
      const b = q.get('build')
      if (b) f.builds.set(Number(v), [...(f.builds.get(Number(v)) ?? []), b])
    }
    fam.set(path, f)
  }
  return [...fam.values()].filter((f) => f.versions.size > 0 || true)
}

function targetsFor(f) {
  const versions = [...f.versions].sort((a, b) => b - a)
  const urls = []
  if (versions.length === 0) return [f.path]
  urls.push(`${f.path}?version=${versions[0]}`)
  for (const b of [...new Set(f.builds.get(versions[0]) ?? [])].slice(0, 3)) urls.push(`${f.path}?version=${versions[0]}&build=${b}`)
  if (versions[1]) urls.push(`${f.path}?version=${versions[1]}`)
  return urls
}

async function pool(items, worker) {
  let i = 0
  const run = async () => {
    while (i < items.length) {
      const item = items[i++]
      await worker(item)
      await sleep(DELAY)
    }
  }
  await Promise.all(Array.from({ length: WORKERS }, run))
}

/** Drop entries that repeat another entry (same brand, year and sizes under a longer name like "X Base"). */
export function dedupe(bikes) {
  const sig = (b) => `${norm(b.brand)}|${b.year}|${JSON.stringify(b.sizes)}`
  const groups = new Map()
  for (const b of bikes) groups.set(sig(b), [...(groups.get(sig(b)) ?? []), b])
  const drop = new Set()
  for (const list of groups.values()) {
    for (const b of list) {
      const n = norm(b.model.replace(/\s*\(\d+\)$/, ''))
      if (list.some((o) => o !== b && !drop.has(o) && (n === norm(o.model) + ' base' || (n.startsWith(norm(o.model) + ' ') && /^(base|all)$/.test(n.slice(norm(o.model).length + 1)))))) drop.add(b)
    }
    // identical sizes under the exact same model name: keep one
    const seen = new Set()
    for (const b of list) {
      const k = norm(b.model)
      if (seen.has(k)) drop.add(b)
      seen.add(k)
    }
  }
  return bikes.filter((b) => !drop.has(b))
}


/** Merge crawled entries into the existing list. Crawled entries replace older ones with the same
 *  brand/model/year; hand-added fields such as maxTire are kept. */
export function mergeFound(existingBikes, found) {
  const key = (e) => `${norm(e.brand)}|${norm(e.model)}|${e.year}`
  const merged = new Map(existingBikes.map((e) => [key(e), e]))
  let added = 0
  let updated = 0
  const seen = new Set()
  for (const e of found) {
    let k = key(e)
    if (seen.has(k)) {
      const prev = merged.get(k)
      if (prev && JSON.stringify(prev.sizes) === JSON.stringify(e.sizes)) continue
      let n = 2
      while (seen.has(`${k}#${n}`)) n++
      e.model = `${e.model} (${n})`
      k = `${k}#${n}`
    }
    seen.add(k)
    const prev = merged.get(k)
    if (prev) {
      updated += JSON.stringify(prev.sizes) === JSON.stringify(e.sizes) ? 0 : 1
      if (prev.maxTire && !e.maxTire) e.maxTire = prev.maxTire
    } else added++
    merged.set(k, e)
  }
  const bikes = dedupe([...merged.values()]).sort(
    (a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model) || b.year - a.year,
  )
  return { bikes, added, updated }
}

async function main() {
  const existing = JSON.parse(readFileSync(DATA, 'utf8'))
  const found = []
  const brands = BRANDS.filter((b) => !ONLY || ONLY.some((o) => b.key.includes(o.toLowerCase()))).filter(
    (_, i) => !SHARD || i % SHARD[1] === SHARD[0] - 1,
  )
  for (const brand of brands) {
    const page = await get(`/brands/${brand.path}`)
    if (!page) {
      console.log(`[${brand.display}] brand page failed, skipped`)
      continue
    }
    const families = parseBrandPage(page).slice(0, MAX_FAMILIES * 3)
    const urls = families.flatMap(targetsFor)
    console.log(`[${brand.display}] ${families.length} families, ${urls.length} pages`)
    let ok = 0
    await pool(urls, async (u) => {
      const html = await get(u)
      const e = html && parsePage(html, brand, u)
      if (e) {
        found.push(e)
        ok++
      }
    })
    console.log(`[${brand.display}] kept ${ok}`)
  }

  const { bikes, added, updated } = mergeFound(existing.bikes, found)

  // safety net: never publish a data set that shrank a lot
  if (bikes.length < existing.bikes.length * 0.9) {
    console.error(`Refusing to write: ${bikes.length} entries vs ${existing.bikes.length} before.`)
    process.exit(1)
  }
  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), bikes }))
  console.log(`Done. ${bikes.length} entries (${added} new, ${updated} changed).`)
}

async function mergeShards() {
  const d = JSON.parse(readFileSync(DATA, 'utf8'))
  let bikes = d.bikes
  for (const f of String(args.merge).split(',')) {
    const part = JSON.parse(readFileSync(f, 'utf8'))
    bikes = mergeFound(bikes, part.bikes).bikes
    console.log(`merged ${f}: ${bikes.length} entries`)
  }
  if (bikes.length < d.bikes.length * 0.9) {
    console.error('Refusing to write: result is much smaller than before.')
    process.exit(1)
  }
  writeFileSync(DATA, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), bikes }))
  console.log(`Done. ${bikes.length} entries (was ${d.bikes.length}).`)
}

async function cleanupOnly() {
  const d = JSON.parse(readFileSync(DATA, 'utf8'))
  const before = d.bikes.length
  d.bikes = dedupe(d.bikes)
  writeFileSync(DATA, JSON.stringify(d))
  console.log(`Cleanup: ${before} -> ${d.bikes.length} entries.`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) args.merge ? mergeShards() : args.cleanup ? cleanupOnly() : main()
