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

**When and how.**

- The 128 runs and the library bake ran on 2026-11-04 from 19:22 to 20:40, with `48ef4bd`'s runner and 8 workers.
- Compare ran from 20:41 to 20:50 and timing at 20:52, both at `d11a7b3`. Its `packages/` is identical to `0608fda`'s; see [Deviations](#deviations).
- Rig: AMD Ryzen 7 5800X (16 threads), Node 24.15.0, Windows 11.
- Other sessions kept the machine busy throughout. The median share of the 16 threads busy was 1.0; this sweep's own share was 0.41 and the others' 0.59 (at most 0.93). Nothing in a run depends on time.
- The numbers are in `evidence/wind-seeds/`:
  - `results.json`, `runs.json` and `timing.json` for what was registered;
  - `diagnostics.json` for what was not;
  - `proofs.json` for the runner.

**Integrity.**

- No run, and not the library bake, had an unconverged pressure solve.
- **Library.** The library's 4-seed bake equals the instrument's mean of the same seeds' snapshots, value for value: 297,600 values.
- **Reproduction.** All 24 of the baked-bearing record's noise-floor rows were reproduced to the 4 decimals stored.
- **Null control.** 0 at all three sources.
- **Positive control.** 1 × 1 pools to 7.06 m, against 2.97 m for 1 × 12.
- No centroid was non-finite.

### The answer

**The typical case barely moves.** At a fixed budget of 13 flow-throughs, averaging three or four seeds lowers the typical seed noise of a plume by 7–14 %: a pooled median separation of 2.75 and 2.56 m, against 2.97 m for one seed. That is far from 1/√S.

**The tail drops.** Not registered: the 90th percentile falls from 10.7 m to 5.6–6.4 m, and the largest separation from 22.6 m to 7.0–7.7 m. Pairs more than 10 m apart fall from 12 of 96 to none of 24 in each arm. All 12 of those pairs are on the street site: 8 street-fire and 4 street-roof plumes.

**A longer single-seed average helps more than the record thought.** From 3 to 12 flow-throughs, the median falls to 0.62.

**What the registered rules decide.**

- A 13 flow-through budget is better spent on one longer average than split among seeds (R5).
- One seed stays the default, unchanged (R6).

| Arm | Cost | Pairs | Pooled median D, m | House roof | Street roof | Street fire | Against 1 × 12 | Against 1 × 3 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 × 12 | 13 | 96 | 2.97 | 1.79 | 2.35 | 6.75 | 1.00 | 0.62 |
| 2 × 5.5 | 13 | 48 | 2.71 | 2.05 | 2.59 | 5.51 | 0.91 | 0.56 |
| 3 × 10/3 | 13 | 24 | 2.75 | 2.10 | 2.41 | 4.68 | 0.93 | 0.57 |
| 4 × 9/4 | 13 | 24 | 2.56 | 2.61 | 1.97 | 3.44 | 0.86 | 0.53 |
| 3 × 4 | 15 | 24 | 3.00 | 1.74 | 2.81 | 4.39 | 1.01 | 0.63 |
| 4 × 3 | 16 | 24 | 1.99 | 1.84 | 1.58 | 3.04 | 0.67 | 0.41 |
| 1 × 3 | 4 | 96 | 4.80 | 3.90 | 3.94 | 8.17 | 1.62 | 1.00 |
| 2 × 1 | 4 | 48 | 4.58 | 3.80 | 4.55 | 7.55 | 1.54 | 0.96 |
| 1 × 1 | 2 | 96 | 7.06 | 6.79 | 5.34 | 10.26 | 2.38 | 1.47 |
| 1 × 1.5 | 2.5 | 96 | 6.28 | 5.82 | 5.26 | 11.65 | 2.12 | 1.31 |
| 1 × 6 | 7 | 96 | 3.64 | 3.16 | 3.02 | 5.46 | 1.23 | 0.76 |

**How sure these ratios are.** Not registered. A cluster bootstrap resamples the 24 source–bearing cells, each keeping its pairs, 2,000 times. Its 90 % intervals are wide:

| Ratio | 90 % interval |
| --- | --- |
| 2 × 5.5 against 1 × 12 | 0.76–1.24 |
| 3 × 10/3 against 1 × 12 | 0.69–1.26 |
| 4 × 9/4 against 1 × 12 | 0.62–1.16 |
| 4 × 3 against 1 × 12 | 0.50–0.95 |
| 1 × 3 against 1 × 12 | 1.19–2.13, so 1 × 12 against 1 × 3 is 0.47–0.84 |

The field numbers below rest on all 8 seeds at every cell and are much tighter, so they are the better guide to how the noise scales.

### Predictions

| | Outcome | Measured |
| --- | --- | --- |
| S1 | **Failed** | 3 × 10/3 is 0.93 of 1 × 12 and 4 × 9/4 is 0.86 (bar 0.70; 1/√S gives 0.58 and 0.50). 2 × 5.5 is 0.91. That lies between H_mix (0.82–0.83) and H_time (1.03–1.20); the field ratios are 0.88 and 0.94. |
| S2 | **Failed** | D(1 × 12) / D(1 × 3) = 0.62, and the field's is 0.63. A longer single-seed average helps, though less than 1/√T (0.50). The record's 0.76–0.88 came from two bearings. |
| S3 | **Failed** | 3 × 4 is 1.01 and 4 × 3 is 0.67 (bar 0.85 for both). Their field ratios agree, at 0.85 and 0.79; the plume medians of 24 pairs cannot tell them apart. |
| S4 | **Held** | s(12) aloft is 0.21 m/s, inside 0.15–0.50. p(3 → 12) aloft is 0.66, below 0.8. |
| S5 | **Failed** | The roof plume ratios are 1.18, 1.21, 1.13, 1.34 and 0.92, against field ratios of 0.97, 0.88, 0.94, 0.85 and 0.79. |
| S6 | **Held** | 2 × 1 is 0.96 of 1 × 3 (bar: at least 0.90). Its field noise is 1.13 times 1 × 3's. |
| S7 | **Held** | At a = 9/4: 2.02 m against 4 × 9/4's 2.56 m (0.79). At a = 1: 3.16 m against 2 × 1's 4.58 m (0.69). |

### Decision rules

- **R5: a longer single-seed average.** The best split at 13 flow-throughs is 4 × 9/4. Its plume ratio is 0.86 (bar 0.85) and its field ratio 0.94 (bar 0.90), so it meets neither bar.
- **R6: one seed stays the default, byte-identical.** 2 × 1 against 1 × 3 gives a plume ratio of 0.96 and a field ratio of 1.13.
- **R7: the wording changes.**
  - S2 failed, so `docs/wind-field.md` no longer says that longer averaging barely helps.
  - S1 failed, so it describes seed averaging by the partial gain measured.

### What the misses say

1. **The seed bias is real but small, and it is not the inflow's slow modes (S2, S4).** This item rests on a fit, which was not registered.
   - Fitting s²(a) = c + d/a to the measured s(3) and s(12) reproduces the other seven windows within 0.023 m/s, under 10 % (`diagnostics.json`, `fit`).
   - The part no window removes, √c, is 0.15 m/s per seed, both aloft and near the ground. That is 2 % of the 7.2 m/s aloft.
   - At 12 flow-throughs, that part is half of the seed variance aloft and two-thirds of it near the ground.
   - The forcing alone leaves no such part (p 0.91–1.05), so it comes from the solved flow. The mechanism is not identified.
   - The record's 6–15 % came from two bearings. Over 16 site–bearing cells, the seed noise of the speed aloft at 12 flow-throughs is 0.21 m/s per seed, about 3 %.
2. **Seeds cut the tail, not the middle (S1, S3, S5).** The distribution beyond the median was not registered.
   - One seed's error is heavy-tailed. Most bakes sit close, but a few send smoke another way out of the street, up to 22.6 m.
   - Averaging seeds cuts those few. The RMS falls from 6.53 m to 3.36–4.86 m, and the 90th percentile from 10.7 m to 5.6–8.7 m, while the median moves little.
   - The rules were registered on the median, which sees the middle.
   - With 24 pairs per arm, the tail result is suggestive, not settled. None of 24 bounds the rate only below about 12 % (the rule of three), and one seed had 12 of 96 (12.5 %).
3. **A plume's separation does not scale with the field error (S5).**
   - The registered expectation was that a roof plume's separation follows the speed error aloft.
   - The street roof's plume forks too: 22.6 m at 112.5° and 17.2 m at 22.5°, with one seed.
   - The median of a heavy-tailed separation does not move in proportion to the field's RMS.
4. **Seeds do not pay at the default budget (S6).** Two seeds of 1 flow-through each are noisier in the field than one seed of 3 (1.13), and about equal in plumes (0.96).
5. **No warm-up leftover beyond the bar (S7).** At a = 9/4, though, the ratio of 0.79 sits a little above the 0.4–0.7 that seed noise alone would give.

### Smoke tunnelling

This audit was not registered.

**Why it was added.** An architect's review of the smoke component found that `createSmoke` tests only where a step ends, so a puff could pass through a wall within one step. These plumes step at the solver's dt (0.134 s). That is about 0.8–1 m per step aloft, against 1 m cells.

**What it measured.** Compare audited every plume the registered metrics use: 1,464 plumes and 41.3 million puff steps.

- 14,602 steps (0.035 %) cross a solid cell while both ends are in air.
- None passes through 1 m or more of solid. The deepest goes 0.86 m, and 97 % stay under 0.5 m.
- So these are cuts across the corners and edges of solid cells: the voxel staircase of a roof at the house, and building corners for the street fire. No step passed through a wall.
- The audit's self-check measures those depths on 8 known cases.

| Source | Plumes with any | Steps | Share of steps | Under 0.25 m inside | 0.25–0.5 m | 0.5–1 m | Deepest, m |
| --- | --- | --- | --- | --- | --- | --- | --- |
| House roof | 292 of 488 | 4,332 | 0.046 % | 2,653 | 1,541 | 138 | 0.86 |
| Street roof | 1 of 488 | 1 | 0.000 % | 1 | 0 | 0 | 0.16 |
| Street fire | 375 of 488 | 10,269 | 0.044 % | 7,377 | 2,617 | 275 | 0.84 |

**Limits.** How much these cuts move the plume metric was not measured. They are a limit of the metric and of `createSmoke`. The fix belongs to the smoke component: test the step's swept path, or split a step until it covers less than half a cell. Corners can then no longer be cut. #41's `8aa72f7` has since done the first; the [re-run](#later-re-run-on-the-fixed-sampler-and-swept-smoke-2026-11-05) measures what it changes.

### Tables

**Field.** s(a) is the standard deviation across 8 seeds of the along-wind speed, pooled over 16 site–bearing cells.

| Averaging per seed, flow-throughs | 1 | 1.5 | 2.25 | 3 | 10/3 | 4 | 5.5 | 6 | 12 | p(3 → 12) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Aloft: s(a), m/s | 0.531 | 0.464 | 0.393 | 0.332 | 0.318 | 0.308 | 0.286 | 0.269 | 0.210 | 0.66 |
| Low: s(a), m/s | 0.395 | 0.359 | 0.286 | 0.262 | 0.246 | 0.218 | 0.204 | 0.205 | 0.187 | 0.49 |

**Field ratios.** Each is an arm's s(a)/√S over the comparator's.

| Arm | Aloft | Low |
| --- | --- | --- |
| 2 × 5.5 against 1 × 12 | 0.97 | 0.77 |
| 3 × 10/3 against 1 × 12 | 0.88 | 0.76 |
| 4 × 9/4 against 1 × 12 | 0.94 | 0.77 |
| 3 × 4 against 1 × 12 | 0.85 | 0.67 |
| 4 × 3 against 1 × 12 | 0.79 | 0.70 |
| 2 × 1 against 1 × 3 | 1.13 | 1.07 |

**The pairs beyond the median.** Not registered.

| Arm | Pairs | Quartiles, m | 90th percentile | Largest | Over 10 m | RMS |
| --- | --- | --- | --- | --- | --- | --- |
| 1 × 12 | 96 | 1.56, 2.97, 6.56 | 10.71 | 22.63 | 12 | 6.53 |
| 2 × 5.5 | 48 | 1.97, 2.71, 5.49 | 8.70 | 13.21 | 1 | 4.86 |
| 3 × 10/3 | 24 | 2.05, 2.75, 3.87 | 6.39 | 7.74 | 0 | 3.71 |
| 4 × 9/4 | 24 | 1.84, 2.56, 3.54 | 5.55 | 6.98 | 0 | 3.36 |
| 3 × 4 | 24 | 1.92, 3.00, 3.75 | 5.58 | 8.27 | 0 | 3.75 |
| 4 × 3 | 24 | 1.49, 1.99, 2.99 | 4.92 | 7.97 | 0 | 3.13 |
| 1 × 3 | 96 | 2.80, 4.80, 7.81 | 11.65 | 24.34 | 14 | 7.68 |
| 2 × 1 | 48 | 2.75, 4.58, 7.54 | 9.96 | 15.75 | 4 | 6.49 |
| 1 × 1 | 96 | 4.95, 7.06, 10.25 | 15.63 | 30.82 | 27 | 10.72 |
| 1 × 1.5 | 96 | 4.09, 6.28, 10.32 | 14.92 | 31.27 | 25 | 9.97 |
| 1 × 6 | 96 | 2.26, 3.64, 5.50 | 12.73 | 19.30 | 15 | 6.58 |

By source, the tail is mostly the street:

| Source | Arm | Median, m | 90th percentile, m | Pairs over 10 m |
| --- | --- | --- | --- | --- |
| House roof | 1 × 12 | 1.79 | 3.75 | 0 of 32 |
| House roof | 4 × 9/4 | 2.61 | 3.95 | 0 of 8 |
| Street roof | 1 × 12 | 2.35 | 10.54 | 4 of 32 |
| Street roof | 4 × 9/4 | 1.97 | 3.44 | 0 of 8 |
| Street fire | 1 × 12 | 6.75 | 13.34 | 8 of 32 |
| Street fire | 3 × 10/3 | 4.68 | 7.17 | 0 of 8 |
| Street fire | 4 × 9/4 | 3.44 | 6.28 | 0 of 8 |

**Windows.** T_end and L_end are medians over the 8 bearings, with their ranges:

| Source | T_end | L_end |
| --- | --- | --- |
| House roof | 6.4 s (5.5–7.4) | 32.0 m (31.7–32.6) |
| Street roof | 5.1 s (3.8–8.5) | 30.4 m (22.7–51.8) |
| Street fire | 17.9 s (9.1–20.0) | 32.3 m (22.9–41.5) |

**Cost.** The machine was fully busy throughout.

- **Runs.** 64 house runs of 1,034 steps took a median of 235 s (227 ms a step; range 203–321 s). 64 street runs of 1,201 steps took 309 s (258 ms a step; range 227–540 s). That was with 8 workers and the others' load at a median of 0.59. On a quiet thread the record measured 89 and 133 ms a step.
- **E7.** `averageWindFields` takes 6.6, 7.2 and 9.2 ms for 2, 4 and 8 house fields of 99,200 cells.
- **E8.** One seed's solver setup takes 284 ms, about one solver step: E9 was 220 ms at that moment. Win32 load read 100 % before and after this phase; the 15 s meter took no sample in it.
- So at equal steps, an S-seed bake costs S − 1 extra setups, under 0.5 % at 13 flow-throughs, plus one mean. The seeds of a bearing are independent runs, so they can bake in parallel. That last point is an estimate, not measured here.

### Design evaluation

1. **Alternatives and context.**
   - The subsystem is how a bake spends its solver budget: `bakeWindBearings`, for the smoke of Tinderbox, Farmyard Commando and AFT-3D.
   - The behaviour that matters is how far baked smoke lands from where the site's mean wind would take it, and whether that depends on an arbitrary gust seed.
   - The options:
     - (a) one seed with a longer average (today's default is 1 + 3 flow-throughs);
     - (b) several seeds averaged, each with its own warm-up (`seeds`, this branch);
     - (c) seeds chained in one run without the extra warm-ups (not built);
     - (d) a bake without gusts. That has no seed noise, but a different mean: without gusts the solver's cube wake is about twice as long (see the wind document's verification).
2. **Accuracy.**
   - Every bake carries seed noise. At 12 flow-throughs it is 0.21 m/s per seed in the speed aloft, of which 0.15 m/s no longer window removes.
   - Two 12-flow-through bakes with different seeds put a plume 3.0 m apart (pooled median) after about 30 m of travel. That is about the same as the error of blending between bearings (3.4–6.3 m in the record).
   - A longer average lowers it (0.62 from 3 to 12 flow-throughs).
   - At the same cost, three or four seeds lower the typical plume's noise by only 7–14 % and the field's by 6–12 % aloft and 23–24 % near the ground. They do lower the occasional large miss, the street smoke that leaves by another way, which one seed's bake makes in about one pair in eight.
   - What none of the options touches is the solver's own limits (see the solver record) and the meander of live smoke.
3. **Efficiency** (measured). At equal steps the options cost the same, to within S − 1 solver setups (under 0.5 %) and one mean (under 10 ms). (b) can bake the seeds of a bearing in parallel; (a) cannot.
4. **Narrative** (subjective).
   - A bake whose smoke depends on an arbitrary seed is a quiet hazard for level design. Re-baking a map with another seed moves street smoke by metres, and occasionally sends it down another street.
   - Seeds make that rarer more than they make the usual case tighter.
   - For chimney smoke above roofs the difference is invisible beside live smoke's 9–13 m of meander.
5. **Recommendation** (provisional).
   - Keep one seed by default (R6).
   - Spend a larger budget on a longer single-seed average (R5); this is the registered result for the typical plume.
   - Where smoke sits low among buildings and a wrong street would matter, as in a Tinderbox street fire, averaging 3 or 4 seeds at the same cost is reasonable on the tail evidence. That evidence is unregistered and rests on 24 pairs.
   - The observation that would settle it: a registered tail metric, such as the share of pairs more than 10 m apart, with at least 96 pairs per arm.
6. **Adoption status.**
   - `seeds` is implemented, opt-in, and byte-identical when unused. The library default is unchanged.
   - Source-only, as the rest of the wind core; no consumer pin, game or page changes.

## Deviations

1. **The runner was redesigned mid-sweep, at the user's request.** None of the measured runs used the new runner.
   - The registered runner (`48ef4bd`, 8 fresh workers) made all 128 runs and the library bake. It was the machine's main load: 41 % of all CPU in one sample, and 1.19 GB.
   - `ebdf61e` is the replacement:
     - below-normal priority and 4 jobs by default;
     - a wait for other load before each run;
     - persistent workers that load the wind core alone, with sites built once in the main thread;
     - a STOP file and a progress file.
   - It was proven against the registered runner by byte-compares (`proofs.json`):
     - the dry pass: all 128 runs and the library bake, 1,282 data files;
     - full scale: `single` b22.5-s1 and the 4-seed library bake, against the registered sweep's own files;
     - a stop and resume (642 files);
     - the forcing phase.
   - The registered sweep was left to finish, so these proofs are its only use here.
2. **Compare gained the tunnelling audit, not registered** (`ebdf61e`, `d11a7b3`). It only reads positions. On the dry data, compare at `d11a7b3` reported all 4,764 registered values exactly as the registered compare (`48ef4bd`) did, with only wall-clock seconds set aside.
3. **The code that ran.**
   - The runs used `48ef4bd`. Compare and timing used `d11a7b3`.
   - `packages/` is identical in both to `0608fda`, the code under test. Nothing from later wind-field commits was merged first: not #39's change that makes `sampleWindField` read zero inside solid cells (`14827fd`), nor #41's swept smoke test (`8aa72f7`). The [re-run](#later-re-run-on-the-fixed-sampler-and-swept-smoke-2026-11-05) measures both.
4. **Verdicts.** The instrument scored the predictions and rules with its own code, unchanged since `48ef4bd`. The cluster bootstrap, the c + d/a fit and the distribution beyond the median are diagnostics added after the results.
## Later: re-run on the fixed sampler and swept smoke (2026-11-05)

To resolve its conflicts with #41, this branch merged #41's head `4ef13e7`. That brings #39's sampler fix (`14827fd`: zero anywhere inside a solid cell) and the swept smoke collision (`8aa72f7`). Neither changes how a bake is solved: on the merged code, `single` b22.5-s1 and the 4-seed library bake were baked again and match the registered files byte for byte (12 data files, 12.1 MB; `proofs.json`, `afterMerge`). So compare ran again on the registered runs (`evidence/wind-seeds/results-after-merge.json`).

| Quantity | Registered code | Merged code |
| --- | --- | --- |
| Pooled median, 1 × 12 | 2.97 m | 3.05 m |
| S1: 3 × 10/3 and 4 × 9/4 against 1 × 12 | 0.93, 0.86 | 0.90, 0.84 |
| S2: 1 × 12 against 1 × 3 | 0.62 | 0.64 |
| S3: 3 × 4 and 4 × 3 against 1 × 12 | 1.01, 0.67 | 0.98, 0.67 |
| R5: 4 × 9/4's plume and field ratios (bars 0.85 and 0.90) | 0.86, 0.94 | 0.84, 0.94 |
| 90th percentile: 1 × 12, 3 × 10/3, 4 × 9/4 | 10.7, 6.4, 5.6 m | 10.7, 6.5, 5.4 m |
| Pairs over 10 m: 1 × 12; 3 × 10/3 and 4 × 9/4 | 12 of 96; none of 24 | 12 of 96; none of 24 |
| Puff steps crossing a solid (the audit) | 14,602 of 41.3 M | none |
| #41's noise rows reproduced | 24 of 24 of its registered rows | 24 of 24 of its re-measured rows |

- Every prediction keeps its verdict, and both rules keep their decisions. 339 of 672 pair separations moved, the largest by 0.46 m, and no pooled median by more than 0.08 m.
- **R5 now rests on its field bar.** 4 × 9/4's plume ratio, 0.84, is inside its bar. Its field ratio is not: the field functional reads the baked values in air cells, not a sampler, so it stays 0.94. This is the case the field bar was registered for, a plume ratio from 24 pairs crossing its bar on a small change.
- At the same cost, three or four seeds now narrow the typical plume by 10–16 %, against 7–14 % on the registered code.
- **The swept test holds in real plumes.** The audit, an independent cell walk, finds no puff step crossing a solid, where the endpoint test let 14,602 through.
- **The two instruments still agree.** The 24 reproduction rows equal #41's re-measured rows (`evidence/wind-bearings-smoke/results-after-review.json`) exactly; 10 of 24 still equal its registered rows.
- The tables above stand as measured on the registered code.
