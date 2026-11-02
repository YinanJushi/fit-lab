# Fit formula sources and evidence grades

A = published formula/study · B = practitioner guidance · C = our placeholder (经验值，待验证)

| Item | Where in code | Grade | What the research found |
|---|---|---|---|
| Saddle height 0.883 × inseam | `saddle.ts` | A | LeMond/ANWB formula. A trained-cyclist study found no significant difference between LeMond and Hamley (109%) (p=0.917). Verify with knee angle 25–35° at the bottom of the stroke (Holmes). Formulas assume a crank/shoe stack, so they are a starting point. [Study record](https://lida.sport-iat.de/twm/Record/4010655?lng=en) |
| Crank correction 1 mm per mm | `saddle.ts` | B | Follows from the formula assuming 172.5 mm cranks. |
| Torso angle per profile | `profiles.ts` | B/C | Road-bike torso angle is commonly cited as about 30–45° to horizontal, but sources define the angle differently and most are forum or coach articles. Endurance/comfort values above 45° are our extension. |
| Shoulder angle per profile | `profiles.ts` | B | One clinic brochure: 90–100° for road cyclists, 80–90° for recreational riders. No controlled study validates it. A 2021 study measured joint angles by a different definition (shoulder 112°), so it is not comparable. |
| Effective seat-tube angle per profile | `profiles.ts` | C | Ranges come from the project brief. Not sourced. |
| Crank = 0.21 × inseam | `constants.ts` | C | The 0.216 rule is an anecdotal rule of thumb; fitter Steve Hogg objects to applying a ratio blindly. Keep "reference only". [Hogg](https://www.stevehoggbikefitting.com/bikefit/2011/06/crank-length-which-one/) |
| Flexibility → min torso angle | `constants.ts` | C | No source found. Highest priority to validate with a real fitter. |
| Hood offset, hip offset, arm factor 0.92 | `constants.ts` | C | Tuned by us. |
| Aero bars 20–40 mm narrower | `profiles.ts` | B | From the brief. |
| Stem/spacer preferences per profile | `profiles.ts` | C | Our design choice. |
| Adaptive options (leg difference, short cranks, upright limits, stability drop) | `constants.ts`, `fit.ts`, `rider.ts` | C | General practitioner guidance only; thresholds (3 mm shim, 10 mm warning, 0.19 crank ratio, 50° torso, 12 mm saddle drop) are our placeholders. Needs review by a physiotherapist or adaptive-cycling fitter. |
