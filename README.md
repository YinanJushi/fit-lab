# Fit Lab — bike fit calculator

Starting bike-fit numbers from body measurements, a riding goal and frame geometry. Fully client-side (Vite + React + TypeScript). English and Chinese. **A starting reference, not a substitute for a professional fit.**

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run test       # unit tests (engine + bike database)
npm run build      # production build in dist/
npm run preview    # serve the production build
```

## Publish as a website (free)

`npm run build` makes a static `dist/` folder with relative paths, so it works on any static host or sub-folder.
Easiest options: drag `dist/` onto Netlify Drop, or connect the repo to Cloudflare Pages / Vercel (build command `npm run build`, output `dist`).
On an iPhone, open the site in Safari and choose Share → Add to Home Screen to install it like an app.
If your users are in mainland China, a host inside China needs an ICP filing; overseas hosts may load slowly.

## How it works

Coordinates: origin = bottom bracket, x forward, y up, mm and degrees. Code is in `src/engine/` (pure functions).

1. **Saddle height** — `0.883 × inseam` (LeMond), +1 mm per mm of crank shorter than 172.5 mm. A starting value: change by ≤5 mm at a time.
2. **Saddle fore/aft** — target effective seat-tube angle per profile gives a target saddle point; the gap to the frame's own seat-tube line is split between seatpost setback (0/20/25 mm) and rail position (±15 mm).
3. **Target hands** — hip = saddle point + offset; torso angle per profile, raised if flexibility requires it; shoulder from torso length; hands from effective arm length and the profile's shoulder angle.
4. **Cockpit solver** — brute-force search over stem length (60–140), stem angle (−17…+17°) and spacers (0–40 mm) for the combination whose hand position is closest to the target. Near-ties prefer the profile's usual spacer/stem ranges. Error >15 mm or a boundary value flags `frameMismatch` (too large / too small).
5. **Other** — bar width ≈ shoulder width in 20 mm steps (narrower for aero); crank length from inseam, snapped to stock sizes.

Profiles (comfort, endurance, race, aero) live in `src/engine/profiles.ts`.

## Empirical values still to verify (经验值，待验证)

Evidence grades: A published formula, B practitioner guidance, C our placeholder. Sources and notes: `RESEARCH.md`.

| Value | File | Grade |
|---|---|---|
| Saddle height 0.883 × inseam, crank correction | `saddle.ts` | A / B |
| Torso angle range per profile | `profiles.ts` | B / C |
| Shoulder angle per profile (85–95°) | `profiles.ts` | B |
| Effective seat-tube angle per profile | `profiles.ts` | C |
| Stem/spacer preferences per profile | `profiles.ts` | C |
| Flexibility → minimum torso angle (45/38/33/28°) | `constants.ts` | C |
| Hip offset, arm factor 0.92, hood offset (−40, +15) | `constants.ts` | C |
| Crank = 0.21 × inseam | `constants.ts` | C |
| Tie tolerance 3 mm, mismatch error 15 mm | `constants.ts` | C |

The three most worth validating against real fit data: the flexibility table, the hip/hood offsets (they decide stem length), and the seat-tube angle targets.

## Bike database

`src/data/bikes.ts`: road and gravel models from 20 brands (Trek, Specialized, Giant, Canyon, Cannondale, Merida, Scott, BMC, Cervélo, Bianchi, Colnago, Orbea, Ridley, Factor, Wilier, Santa Cruz, Fuji, Felt, Kona, Focus). Numbers come from third-party listings (bikeinsights.com), not the manufacturers, and every entry is marked `verified: false` with a source link. Gravel bikes currently use the road fit rules.

## Other

- `ios/` is a Capacitor wrapper for a future App Store release (needs Xcode and a paid Apple Developer account). `npm run ios:sync` copies a fresh build into it.
- `resources/icon.svg` is the app icon source.
