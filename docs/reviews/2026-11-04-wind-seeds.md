# Averaging gust seeds into a bake: pre-registration and record

The question. The [baked-bearing record](2026-11-04-wind-bearings-smoke.md) found that a bake carries the seed of its gusts.

- Two gust seeds at the same bearing gave mean winds aloft 6–15 % apart in speed after 12 flow-throughs.
- Their plumes barely drew together with longer averaging: the separation at 12 flow-throughs was 0.76–0.88 of that at 3, measured at two bearings.
- The record named a likely cause (a hypothesis: a few of the 32 synthetic gust modes slower than the window) and an untested remedy, averaging several seeds.

So: does a bake that averages S gust seeds remove that bias at a fixed solver budget, where a longer single-seed average does not? And should the library's default bake average seeds?

This file was committed **before** any solver run for this question. The code under test is commit `0608fda` (the `seeds` option of `bakeWindBearings` and `averageWindFields`), and the instrument is `tools/wind-seeds-measure.mjs` at commit `48ef4bd`. Results are appended under [Results](#results); the sections above them do not change after the run. Any departure from the protocol is listed under [Deviations](#deviations).

Three things preceded this registration, and the predictions rest on them (see [what the predictions rest on](#what-the-predictions-rest-on)):

1. The instrument's `--phase forcing`, which runs the gusts alone with no solver. It is a code-based estimate, not a measurement of anything registered here.
2. A re-reading of the baked-bearing record's committed diagnostics (`evidence/wind-bearings-smoke/diagnostics.json`, `veer`).
3. Plumbing runs with `--dry`, which shrink every flow-through count 60-fold. Their numbers mean nothing and were not used.

## Protocol

**Sites, wind, sources and plume.** These are as in the baked-bearing record:

- the page's `single` (Rowan family house) and `street` (four buildings) layouts at 1 m cells, with equal margins;
- 6 m/s at 10 m, z0 = 0.25 m, surface-layer gusts at gain 1, length scale 20 m, 32 modes;
- pressure tolerance 2e-4, MacCormack advection;
- the sources `single/roof`, `street/roof` and `street/street`;
- 400 puffs released together, walking with smoke seed 1 in every arm, blocked by each field's own solid cells, stepped at the solver's dt.

The plume path is the ensemble centroid.

**Runs.**

- At each site, the 8 bearings 22.5° + 45k (the record's targets).
- At each bearing, gust seeds 1 to 8: 128 runs.
- Each run warms up for 1 flow-through, then averages for 12. The running mean is kept at a = 1, 1.5, 2.25, 3, 10/3, 4, 5.5, 6 and 12 flow-throughs of averaging.
- A snapshot at a is the bake `bakeWindBearings` returns for that seed with `warmup` 1 and `average` a. The record showed this for one seed; the library control below checks it for four seeds averaged at once.

A flow-through is 10.67 s (house) or 12.5 s (street).

**Bakes.** An arm "S × a" bakes S seeds, each warmed for 1 flow-through and averaged for a, and keeps their mean (`averageWindFields`). It costs S (1 + a) flow-throughs.

| Budget | Arms | Cost each, in flow-throughs |
| --- | --- | --- |
| Fixed total | 1 × 12, 2 × 5.5, 3 × 10/3, 4 × 9/4 | 13. The step counts are 1,034–1,036 (house) and 1,200–1,201 (street). |
| Fixed averaging (12) | 1 × 12, 3 × 4, 4 × 3 | 13, 15, 16. The extra warm-ups are not charged. |
| The default bake | 1 × 3 (today's default), 2 × 1 | 4 |
| One seed, other windows | 1 × 1, 1 × 1.5, 1 × 6 | 2, 2.5, 7 |

**Seed noise.** Two bakes of one arm never share a seed. Seeds 1–8 split into consecutive groups of S, and the groups pair up in order. That gives 4 pairs per bearing for S = 1, 2 for S = 2, and 1 for S = 3 (seeds 1–3 against 4–6) and S = 4 (1–4 against 5–8).

- An arm's seed noise is the separation of its pairs' plumes, D = |C_A(T_end) − C_B(T_end)|, in metres.
- Medians pool every pair over the three sources and eight bearings: 96 pairs for S = 1, 48 for S = 2, and 24 for S = 3 and 4.

**Window.** T_end is the last step before the reference plume's centroid comes within 2 m of a horizontal side or the lid, capped at 20 s. The reference field is the mean of all 8 seeds at 12 flow-throughs, 96 flow-throughs of averaging in all.

**Field.** The along-wind speed aloft is the mean of the velocity along the wind over air cells centred in the top 40 % of the domain. The along-wind speed low is the same over the bottom 40 %.

- Both are linear in the field, so an S-seed bake's value is exactly the mean of its seeds' values.
- s(a) is the standard deviation across the 8 seeds at one bearing, pooled over the 16 site–bearing cells (112 degrees of freedom).
- Because the seeds are independent runs, an arm's field noise is s(a)/√S.
- The convergence exponent is p = ln(s²(3)/s²(12)) / ln 4. It is 1 for a time mean that converges as 1/√T, and 0 for a bias that no window removes.
- An arm's field ratio is its s(a)/√S over the comparator's.

**Transient.** A short window per seed could keep what is left of the warm-up. That bias is shared by every seed, so pair separations cannot see it. For a = 1 and 9/4, the check compares two plumes:

- one in the 8-seed mean of the early window (flow-throughs 1 to 1 + a of every run);
- one in the 8-seed mean of the rest of the runs (1 + a to 13), taken from the two running means.

**Controls.**

- **Null.** The reference against a bit-identical copy gives D = 0.
- **Positive.** The 1 × 1 arm's pooled median D exceeds the 1 × 12 arm's.
- **Non-finite.** No centroid is non-finite.
- **Library.** `bakeWindBearings({seeds: [1, 2, 3, 4], warmup: 1, average: 2.25})` at the house at 22.5° equals the instrument's mean of the same seeds' snapshots, value for value.
- **Reproduction.** Seeds 1 and 2 at 22.5° and 202.5° reproduce all 24 of the baked-bearing record's noise-floor rows (D_end at 1.5, 3, 6 and 12 flow-throughs, three sources) to the 4 decimals stored. They use that record's window rule (truth = seed 1 at 12 flow-throughs). This checks the site builder, the sources, the runs and the plume metric against the committed record.
- **Convergence.** Every run's unconverged pressure solves are counted.

**Timing.** Not part of the test suite, and not a gate. The rig is an AMD Ryzen 7 5800X (16 threads), Node 24.15.0, Windows 11.

- Each run's wall time is recorded with the machine's load, sampled every 15 s: the share of the 16 threads busy, and the share this process used.
- E7: `averageWindFields` for 2, 4 and 8 house fields.
- E8: one seed's solver setup.
- E9: one solver step, for scale.

## What the predictions rest on

**1. The forcing alone** (`--phase forcing`, 200 seeds at 4 bearings per site; [evidence](evidence/wind-seeds/forcing.json)). It takes the along-wind gust as `turbulence.js` samples it, frozen-convected through the aloft box with no solver, and averages it over each window after 1 flow-through of warm-up.

| Averaging window, flow-throughs | 1 | 1.5 | 2.25 | 3 | 10/3 | 4 | 5.5 | 6 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| House: s(a), m/s | 0.397 | 0.331 | 0.284 | 0.246 | 0.234 | 0.216 | 0.185 | 0.178 | 0.131 |
| Street: s(a), m/s | 0.370 | 0.315 | 0.260 | 0.224 | 0.214 | 0.196 | 0.161 | 0.152 | 0.108 |

Its convergence exponent p(3 → 12) is 0.91 (house) and 1.05 (street): the time mean of the inflow converges about as 1/√T. Splitting a fixed budget among seeds then leaves its noise where it was, or raises it a little, because each seed's warm-up takes averaging away.

**2. The record's four seed pairs.** The record's diagnostics give the speed aloft of seeds 1 and 2 at 22.5° and 202.5° at both sites.

- Their differences at 12 flow-throughs are 0.44, 0.14, 1.12 and 0.27 m/s (RMS 0.62).
- At 3 flow-throughs they are 0.63, 0.28, 1.70 and 0.00 (RMS 0.92).
- Per seed, that is about 0.44 m/s at 12 flow-throughs: 3.3–4.1 times the forcing's level. Most of the seed noise must come from the solved flow, not from the inflow's own time mean.
- Fitting s²(a) = c + d/a to these pairs splits the noise in two. One part does not average: √c ≈ 0.34 m/s per seed. The other does: 0.28 m/s at 12 flow-throughs. The fit gives p = 0.57.
- Four pairs make this a weak fit, and it treats the magnitude of the mean wind as the along-wind speed.

**3. Arithmetic.** The field noise of an S-seed arm is s(a)/√S, because the seeds are independent runs.

Three readings follow, with their field ratios (each arm's noise over the comparator's):

| Ratio | H_seed: a per-seed bias, p ≈ 0 (the record's reading) | H_time: the forcing's reading, p ≈ 0.91–1.05 | H_mix: the four-pair fit, p ≈ 0.57 |
| --- | --- | --- | --- |
| 2 × 5.5 / 1 × 12 | 0.71 | 1.00–1.05 | 0.86 |
| 3 × 10/3 / 1 × 12 | 0.58 | 1.03–1.15 | 0.82 |
| 4 × 9/4 / 1 × 12 | 0.50 | 1.08–1.20 | 0.83 |
| 3 × 4 / 1 × 12 | 0.58 | 0.95–1.05 | 0.77 |
| 4 × 3 / 1 × 12 | 0.50 | 0.94–1.04 | 0.74 |
| 1 × 12 / 1 × 3 | 1.00 | 0.48–0.53 | 0.67 |
| 2 × 1 / 1 × 3 | 0.71 | 1.14–1.17 | 1.11 |

A roof plume's error lies mostly along its path (the record), so its separation should scale with the speed error aloft. The street fire forks, and its separations need not follow the field.

## Predictions

| | Prediction | Confidence |
| --- | --- | --- |
| S1 | **The core claim, as put to this test.** At the fixed 13-flow-through budget, averaging seeds shrinks the seed noise about as 1/√S: the pooled median D of 3 × 10/3 and of 4 × 9/4 is at most 0.70 of 1 × 12's (1/√S gives 0.58 and 0.50). | Low. My central expectation is H_mix, 0.82–0.83: a real but partial gain. The forcing alone predicts none. |
| S2 | **A longer single-seed average barely helps.** D(1 × 12) / D(1 × 3) is at least 0.70. The record measured 0.76–0.88 at two bearings. | Low. H_mix gives 0.67 and H_time 0.48–0.53. |
| S3 | **At fixed averaging (12), seeds help.** 3 × 4 and 4 × 3 are at most 0.85 of 1 × 12. | Medium-low. H_mix gives 0.77 and 0.74; H_time gives 0.95–1.05 and 0.94–1.04. |
| S4 | **The field.** s(12) aloft is 0.15–0.50 m/s, and p(3 → 12) aloft is below 0.8. | Medium. The forcing alone gives 0.11–0.13 m/s and 0.91–1.05; the four pairs about 0.44 m/s and 0.57. |
| S5 | **Roof plumes follow the field.** For each multi-seed arm at 12–13 flow-throughs (2 × 5.5, 3 × 10/3, 4 × 9/4, 3 × 4, 4 × 3), the two roof sources' pooled ratio to 1 × 12 lies within ±0.15 of the arm's field ratio. | Medium |
| S6 | **Seeds do not pay at the default budget.** 2 × 1 is no better than 1 × 3: the plume ratio is at least 0.90. | Medium. H_mix gives 1.11 and H_time 1.14–1.17; H_seed gives 0.71. |
| S7 | **No warm-up leftover.** The early-against-late separation (pooled median) is at most its arm's pair median: 4 × 9/4 for a = 9/4, and 2 × 1 for a = 1. Seed noise alone would put it near 0.4–0.7 of that median. | Medium |

## Decision rules

- **R5, how to spend a 13-flow-through budget.**
  - Take the multi-seed arm with the lowest pooled median D among 2 × 5.5, 3 × 10/3 and 4 × 9/4.
  - Recommend it over 1 × 12 if its plume ratio is at most 0.85 **and** its field ratio is at most 0.90.
  - Otherwise recommend a longer single-seed average.
  - The plume ratio is the delivered quantity, but at most 24 pairs make it. The field ratio rests on every seed at every bearing (112 degrees of freedom), so it guards against a plume ratio that wins by noise.
- **R6, the library default.**
  - `bakeWindBearings` keeps one seed by default, byte-identical to today, with no new keys in its output.
  - That changes only if 2 × 1 beats 1 × 3 by the same two bars (plume at most 0.85, field at most 0.90) and S7 holds, both parts. Then the defaults become `seeds` 2 with `average` 1, which costs the same 4 flow-throughs.
- **R7, the wind document.**
  - If S2 fails, `docs/wind-field.md` stops saying that longer averaging barely helps, and states what this measurement found.
  - If S1 fails, it no longer calls seed averaging the remedy without saying how much it gives.

## Results

## Deviations
