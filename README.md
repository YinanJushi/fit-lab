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

`src/data/bikes.ts`: 745 road and gravel models from 31 brands (Trek, Specialized, Giant, Canyon, Cannondale, Merida, Scott, BMC, Cervélo, Pinarello, Bianchi, Colnago, Orbea, Ridley, Cube, Factor, Wilier, Look, Santa Cruz, Fuji, Felt, Kona, Salsa, Focus, Niner, Marin, Surly, All-City, Basso, De Rosa, Lapierre). Numbers come from third-party listings (bikeinsights.com), not the manufacturers, and every entry is marked `verified: false` with a source link. Gravel bikes currently use the road fit rules. Riders whose bike is not listed can type its geometry and save it as a custom bike (stored only in their browser, shown under "My bikes").

## 3D view and camera measuring

- **3D view** (results page): `src/ui/Rider3D.tsx` draws the rider on the recommended bike with three.js from the numbers the fit engine already computed, with pedalling legs (`src/engine/ik.ts`). It loads only when opened.
- **Camera measuring** (body step, beta): `src/ui/CameraMeasure.tsx` takes one standing photo (camera with a timer, or an uploaded photo) and runs Google's open-source MediaPipe pose model **inside the browser**. Nothing is uploaded. `src/engine/bodyFromPose.ts` turns the landmarks into inseam, torso, arm and shoulder width, scaled from the height the user typed. They are estimates (about 2–3 cm); the correction factors in `POSE_FACTORS` are unverified.
- Files: the model is `public/models/pose_landmarker_full.task` (from Google's MediaPipe model bucket); the WebAssembly runtime is copied from `node_modules` into `public/mediapipe` before `dev` and `build` by `scripts/copy-mediapipe.mjs`.

## Riders whose bodies work differently

Optional panel on the goal step ("Does your body need anything special?"), all in `src/engine/` and marked unverified (grade C):

| Option | Effect |
|---|---|
| One leg shorter | Saddle follows the longer leg (enter its inseam); shows a cleat/pedal shim for the shorter side; warns above 10 mm |
| Limited knee or hip bend | Shorter crank (0.19 × inseam, down to 145 mm), saddle height follows it, torso at least 50° |
| Back, neck or trunk limits | Torso at least 50° |
| Reduced grip, arm or hand function | Torso at least 50° and shoulder angle capped at 80° to take weight off the hands, plus brake and bar notes |
| Prosthesis | Notes only (set saddle with it on, socket pressure, cleat/foot angle) |
| Stability first | Saddle 12 mm lower so a foot reaches the ground; notes on wider tires and step-through frames |

These are general starting points, not medical advice; the app says so. A physiotherapist, prosthetist or fitter who knows the rider should confirm them.

## Size finder and bike matcher

`src/engine/sizes.ts`: rates every size of the chosen model for the rider (best / works / at the limit / too small / too large), and ranks the newest version of every model in a bike type by its best size. The rider's target hands do not depend on the frame, so they are computed once and only the cockpit solver runs per size.

## Automatic data updates

`scripts/update-bikes.mjs` reads the public bikeinsights.com brand and bike pages (robots.txt allows it, it waits between requests) and merges what it finds into `src/data/bikes.json`. It only keeps pages that pass sanity checks (at least 3 sizes, stack and reach rising with size, plausible angles) and refuses to write if the data set would shrink by more than 10%.

The GitHub Action in `.github/workflows/deploy.yml` runs it on the 1st of every month (or by hand: Actions → Deploy to GitHub Pages → Run workflow), keeps the result only if the tests still pass, commits `Refresh bike data`, and republishes the site. Brands to crawl are listed in `scripts/brands.json`. To run it yourself: `node scripts/update-bikes.mjs --brands=giant,trek`.

## Other

- `ios/` is a Capacitor wrapper for a future App Store release (needs Xcode and a paid Apple Developer account). `npm run ios:sync` copies a fresh build into it.
- `resources/icon.svg` is the app icon source.
