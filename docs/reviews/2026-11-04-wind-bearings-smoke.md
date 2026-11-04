# Baked wind bearings and smoke: pre-registration and record

The question: a game cannot run the wind solver every frame, so it bakes mean fields at a few bearings and blends between them. How far does a chimney plume carried by that blend stray from one carried by the field solved at the exact bearing, and from live smoke in the running solver? And what does a tracer sample cost?

This file was committed **before** any plume path or timing below was measured. The code under test is commit `b295604` (`packages/wind-core/bearings.js` and `smoke.js`). Results are appended under [Results](#results); the sections above them do not change after the run. Any departure from the protocol is listed under [Deviations](#deviations).

## Protocol

**Sites.** The reference page's `single` (Rowan family house) and `street` (four buildings, a canyon about 3.3–5 m wide and 5.5–9.5 m tall) layouts, built as on the page: 1 m cells, `windDomain` with equal margins on every side (3H and 2H, lids 3H and 2.5H, minimum 8 m), so one grid serves every bearing.

**Wind.** 6 m/s at 10 m, z0 = 0.25 m (rough), surface-layer gusts at gain 1 (length scale 20 m, 32 modes, seed 1), pressure tolerance 2e-4, MacCormack advection. Bearings are meteorological (from), as in `docs/wind-field.md`.

**Runs.** One solver run per bearing and seed: 1 flow-through of warm-up (the longer horizontal side over 6 m/s), then 12 flow-throughs of averaging. Snapshots of the running mean after 1.5, 3, 6 and 12 flow-throughs are the bakes `bakeWindBearings` would return for `average` = 1.5, 3, 6 and 12. One run per site is checked bit-for-bit against `bakeWindBearings` itself.

- The 16 bearings 0, 22.5, …, 337.5. Their even members form the **8-set**; all of them form the **16-set**.
- The 8 bearings 11.25 + 45k: the 16-set's midpoints, and quarter points of the 8-set.
- Seed 2 at 22.5° and 202.5°, for the noise floor.
- `single` only: 225° at 3 m/s and at 9 m/s, for speed scaling.

**Sources.** A source is the centre of the first air cell above the highest solid cell in a column.

- `single/roof`: the column at the house's footprint centre.
- `street/roof`: the column at the footprint centre of the market terrace, the page's smoke building.
- `street/street`: 1.5 m above the ground at x = 5 m, midway across the air gap between the two rows. This is a fire in the street.

The page's own street source (0.3 m above the bounding box) lies inside a voxelized roof cell, which is why the protocol defines sources from the solid mask.

**Plume.** The plume is a `createSmoke` ensemble of 400 puffs released together at t = 0. They have jitter 0.15 m, spread 0.12 m²/s, rise 1.1 m/s and riseTime 5 s, the page's settings, from seed 1 in every arm. So the arms share their random numbers. Puffs are blocked by each arm's own solid mask (`windFieldSolid`), and the uniform arm has none. The smoke step equals the solver's step, dt ≈ 0.134 s. The plume path is the ensemble centroid C(t). The centreline, one puff without jitter or spread, is reported as a secondary result.

**Window.** Every arm is compared at the same steps, up to T_end. T_end is the last step before the truth centroid comes within 2 m of a horizontal side or the lid, capped at 20 s. L_end = |C_truth(T_end) − source| is the travel.

**Truth.** The exact-bearing field at 12 flow-throughs, seed 1.

**Arms** (A is the bake's averaging in flow-throughs):

| Arm | Field |
| --- | --- |
| slerp, linear, keep-speed (A = 3, 12) | `blendWindBearings` of the 8-set or 16-set at the target bearing |
| nearest | the 8-set bake counter-clockwise of the target (a midpoint has no nearer one) |
| uniform | the log-law inflow at the target bearing, no buildings: the fallback the wind doc names |
| noise floor | the same bearing, seed 2 against seed 1, at equal A |
| live | the running solver's instantaneous field. Every 1 s of averaging, a batch of 100 puffs (seed 1000 + batch) is released and tracked for 12 s. The live mean path is the mean of the batch centroids; the live scatter is their RMS distance from it. |

**Metrics.** D_end = |C_arm(T_end) − C_truth(T_end)|, in metres, in 3D. The others are D_end / L_end, D_max (the largest separation up to T_end), and the heading error at T_end (the horizontal angle between C − source for the two arms). Medians are over the 8 target bearings of a set, per site and source.

**Controls.**

- Null control: the truth against a bit-identical copy must give D = 0 exactly.
- Positive control: nearest must separate.
- Non-finite centroids are counted and must be zero.

**Timing.** These runs are not part of the test suite.

- Rig: AMD Ryzen 7 5800X, Node 24.15.0, Windows 11. The background load is recorded at run time.
- 10⁶ positions are drawn in the `single` domain, then 3 warm-up passes and 9 timed passes. The result is ns per sample: median, minimum and maximum.
- Arms:
  - E1: `sampleWindField` on a blended field.
  - E2: the two neighbours sampled and blended per call.
  - E3: the uniform log law.
  - E4: the live `solver.sample`.
  - E5: `createSmoke.step` per puff per step, at 1,000 puffs.
  - E6: `blendWindBearings` per call, for each blend.

## Predictions

| | Prediction | Confidence |
| --- | --- | --- |
| P1 | Interpolation beats snapping. Median D_end of nearest-8 is more than 2× slerp-8's (A = 12) for every site and source. | High |
| P2 | Baking beats the uniform fallback. Median D_end of uniform is more than 2× slerp-8's (A = 12) for every site and source. | Medium. Least sure for `single/roof`, whose plume rides mostly free stream. |
| P3 | Restoring the free stream helps. Slerp-8's median D_end is below linear-8's (A = 12) everywhere, and keep-speed is within ±25 % of slerp. | Medium-high |
| P4 | More bearings help. Slerp-16 at its midpoints has a smaller median D_end than slerp-8 at its midpoints (A = 12). | High |
| P5 | Size. Slerp-8 (A = 12) median D_end / L_end is at most 0.05 for roof sources and at most 0.10 for the street source. | Medium |
| P6 | Averaging limits a default bake. The A = 3 noise floor exceeds slerp-8's median D_end at A = 12. The A = 12 noise floor is half the A = 3 floor, ±40 %. | Medium. The gusts' σu ≈ 1.7 m/s and a ~3 s integral time leave about 0.7 m/s in a 3-flow-through mean. |
| P7 | Baked smoke stays within the live plume's meander. \|slerp-8 (A = 3) − live mean\| at T_end is below the live RMS scatter at T_end for at least 7 of the 8 target bearings, per site and source. | Medium |
| P8 | Speed scales. 225° at 3 m/s is exactly half of 6 m/s in every snapshot. At 9 m/s against 1.5 × the 6 m/s bake, D_end is below the A = 12 noise floor. | High; medium |
| E1–E6 | E1: 15–60 ns. E2: 1.7–2.5× E1. E3: below E1. E4: 2–5× E1. E5: 100–500 ns per puff, so 1,000 puffs take under 1 ms a step. E6: linear and slerp 0.2–1.5 ms per 10⁵ cells; keep-speed at most 3× linear. | Medium |

## Decision rules

- **R1, the default blend.** Slerp, unless keep-speed's pooled median D_end (8-set midpoints, A = 12) is more than 10 % lower, or linear's is lower than slerp's.
- **R2, the bearing count.** Recommend 16 if slerp-16's median D_end is under half of slerp-8's and slerp-8's exceeds the A = 12 noise floor. Otherwise recommend 8, with its error stated.
- **R3, the default averaging.** Keep `average` = 3 if the A = 3 noise floor is at most slerp-8's median D_end (A = 12). Otherwise raise it to the smallest of 6 or 12 that is, and state the extra bake time.
- **R4.** Where P2 fails, the record says that for that kind of source the uniform fallback is as good as a bake.

## Results

Not yet run.

## Deviations

None yet.
