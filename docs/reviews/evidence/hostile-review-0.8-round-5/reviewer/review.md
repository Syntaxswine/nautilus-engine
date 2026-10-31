# Hostile review, round 5 (0.8 series): the answer to round 4 (`claude/asset-render-speed` at `059e71a`)

- **Reviewed commit:** `059e71a98d098987a75e6bd7b7d18d5d03865f81` (the record, 19:33:59 local). The code the record's formal runs measured is `1d2edb1`; `b9bdd05` added a test and the bench's open wait; `059e71a` is docs, changelog and record. Baseline: main 0.10.0 `fb352776b714b097cb1bfb94350f8e18a62bfc52`.
- **Date:** 2026-10-30, 19:37 to 22:55 local. One hostile reviewer (Claude), round 5, in the detached sandbox `<sandbox>` at `059e71a` (`dist/` built 19:35 from the clean commit; `git status --porcelain` empty before and after every series). The baseline `<baseline>` (main, `dist/` built) was read only and served as the A arm. Built copies of one commit with one edit each (`make-tree.mjs`, the answer's; a stamp names the commit) lived in `<scratch>`: the candidate's per-copy build (`instancing: false`), copy spheres at half radius (the pixel control), Q5, F1 and F3 for the CI gate, and the digest probes S1–S8 with G11 (control) and round 4's Q7 (reproduction). The per-copy build's `dist/` differs from the sandbox's in exactly `app/prefab-scene.js` (`diff -rq`). The 27 benchmark maps regenerated from `059e71a`'s `workloads.mjs` equal the sandbox's byte for byte.
- **Judged against:** the owner's goal, **render assets twice as fast** for the massive structures being built, and round 4's findings (MF-C, SF-F to SF-I, N1 to N7). MF1 to MF3 are the architect's: carried at the end, not scored.
- **Labels:** **measured** = run here and quoted; **code-reading** = cited source; **estimate** = arithmetic on measurements; **judgment** = assessment.
- **Rig.** Windows 11 10.0.26200, AMD Ryzen 7 5800X (16 threads), 64 GB, Node v24.15.0, Playwright 1.62.1 (the Codex runtime's), headless Edge 156.0.4314.56. ANGLE **D3D11 on an RTX 3080** for timing (`{"canvas":[1056,916],"multiDraw":true,"gpuTimer":true,"maxTextures":16,"maxCombinedTextures":32,"maxVertexTextures":16}`); **SwiftShader** for pixels. Viewport 1600 × 1100, deviceScaleFactor 1; the editor canvas is 1056 × 916 = 967,296 px.
- **Load.** The GPU series ran alone, one after another, 19:50:59 to 20:52:02 (`timing/load.txt`: CPU load 2 % at the start, then 7 %, 14 %, 11 % and 6 % at the ends of the four parts, 44.7–45.2 GB free; the bench's own browser is part of those figures). Every timing is paired (two pages of one Edge, blocks A B B A), repeated (4 runs, 20 frames × 4 blocks, the answer's formal options) and given as a median with its range, with each map's blank (same code in both arms) as its null control. One run of the lit copies (`l1`, run 3) had a slow B block (close view 7.30 ms against 3.20–3.85 ms in the other runs); it widens that map's ranges and leaves the medians. Pixels, counts, audits and mutation verdicts are load-independent; they ran after the timings, from 20:52.

## Method

1. **The answer's instrument against main 0.10** (`tools/bench-asset-rendering.mjs --editor --assets-only --expect`, GPU, 4 runs, its formal options) on a subset, unlit and lamp-lit: w1, w4, w8 (+ w0), l1, l4, l8, l4n (+ their blanks) (`timing/main-vs-candidate.json`, `-tables.md`).
2. **The densest cluster the editor allows**, built here as the bench builds its maps (`massive-maps.mjs`; `MAX_BUILDINGS` is 32 per map, `packages/prefab-core/index.js:10`): 32 copies of one Gross design (grossdale-hip) on 12 × 19 m lots, one cluster (`g1`), and the same ringed by 12 electric lamps at 22:00 (`n1`, with its blank). Main against the candidate (`timing/main-vs-candidate-grid.json`).
3. **Per copy against batched**, the record's MF-C pairing: the candidate's own `instancing: false` build (A) against the candidate (B) on every map that batches (w1, w8, l1, l8, g1, n1; `timing/percopy-vs-candidate.json`), and the CopyBatch setups per frame at the bench's cameras (`setups.mjs`, the answer's `exp-setups.js` driven by Playwright, D3D11, GL draws stubbed).
4. **The cluster rule**: how the editor's layer clusters the benchmark maps (`clusters.mjs`) and rows, turns, grids and one-metre moves placed through `placeBuilding` (`cluster-rule.mjs`).
5. **Regressions where copies change** (`layer-invariants.mjs`): the editor's own scene classes on the count tool's drive, through open, `setOptions` (both cutaways), move away and back, delete, undo, turns, two overlapping edits, a view change while a library load is pending, the library's `setView` override and an edit under it. After each step an audit checks that every node of every copy is drawn exactly as often as its template's (by itself or by a visible CopyBatch, never both), that each CopyBatch matrix and sphere is the copy's, and that no CopyBatch is stale; three controls must fail it. **Undo and redo through the UI** (`undo-check.mjs`: `editor3d.apply` removes a copy of a batched cluster, then the toolbar's Undo, Redo, Undo; SwiftShader). **The building library's preview scene** batched and per copy, through its floor control's override (`preview-check.mjs`). **Edit and view-toggle latency**, main against the candidate, paired (round 4's `edit-timing.mjs`; w8, w1, g1).
6. **Pixels** (SwiftShader, reduced motion; round 4's `pixels.mjs`/`compare-px.mjs` with the bench's `capture()` and strong tie oracle): the candidate, the candidate again on its own page (the repeat control), its per-copy build, main 0.10, and copy spheres at half radius (the must-differ control) on w1, w8, g1, l8 and n1, in five views (overview, close, far, level-0 and level-1 cutaway).
7. **Mutation** (`mutate-r5.mjs`, round 4's rules): 17 mutants of the new code and the paths around it that the answer's harness did not try, two controls, and the answer's three Q5 mutants as reproductions (22 in all); survivors against the whole suite and `tools/check.mjs`; Q5, F1, F3 and B3 built into copies and run through the CI gate (`review:asset-counts`).
8. **The digest** (`refresh-check.sh`): eight settings and hooks the key does not see (S1–S8), each in a built copy taken through the documented refresh (exports, then the registry, which re-verifies every digest), then the check, the digest/catalogue tests and the suite; G11 as the control the refresh must refuse and round 4's Q7 as the reproduction. Each refreshed copy's editor is then photographed against the candidate's (`pixels-mutants/`).
9. **The record's own numbers** re-derived from its formal JSON (`formal-check.mjs`: N1's counts, the `own` flags, SF-I's triangles; its SwiftShader and pilot tables).
10. **The repository gates** (`gates.sh`) on the clean sandbox after everything else.

## Score

**8.0 / 10 for the answer**, against the goal and round 4's findings. MF1 to MF3 remain open engine items (unscored; see the end).

What the answer gets right, reproduced here:
- **MF-C is closed.** Spread copies draw per copy, and the lit Gross houses are ×4.59 / ×4.94 / ×3.73 / ×2.21 against main (record ×4.45 / ×5.13 / ×4.00 / ×2.10), ×5.01 / ×3.81 / ×4.03 / ×2.21 under twelve night lamps. Its per-copy table, its setup counts and its quoted draw counts reproduce to the setup and the draw. The densest structure the editor can hold, 32 copies of one Gross design in a grid, is ×7.1–10.5 against main unlit and ×4.4–8.7 under twelve night lamps, and batched it beats per copy in every view, lamps included (×1.30–2.37), which supports "keep eight" beyond the record's own evidence.
- **Nothing regresses where copies change.** An 18-step audit of place, move, delete, undo, turns, overlapping edits, a held library load and the library override finds every copy drawn exactly once (its three controls fail it); Undo and Redo through the toolbar restore frames byte for byte; edits and toggles are no slower than main; the per-copy path is byte-identical to main in 24 of 25 views, and batched against per copy differs only by float rounding (≤ 0.10 %), as the docs say.
- **SF-F is closed for the views the gate counts**: Q5 and its edit- and open-path analogues die, the drive object's own mutants die (D6, D10), and the CI gate refuses Q5 in 19 checks (6 headless, 13 culled), as the record says.
- **SF-H, SF-I and N1 hold**: the `own` flag and the docs' wording, the lamp-lit triangle figures and the ×2 counts re-derive exactly from the record's JSON and reproduce in my runs.

What holds the score down:
- **SF-G is not closed as a class (SF-J).** Seven one-edit changes that alter reviewed buildings in the editor (up to 490,672 of 967,296 pixels) pass the documented refresh, the check and all 608 tests; the most natural, S1b, drops the painted atlas from every exterior surface, because every pinned digest is recorded without an atlas.
- **SF-F's class remains for the options the gate never sets (SF-K).** The Roofs and Walls toggles and the library's floor control are driven by nothing: F1–F4 pass every test and the check, and F1 and F3 pass the CI gate built into copies too (20 headless and 108 culled counts equal).
- Nits: the bench's `own` flag is untested and has no margin, and the code's threshold comment quotes the pilot, not the formal run.

The answer met the must-fix with a rule that is right where it was measured and where I could stress it, and it reproduces; the goal stands met on this rig for buildings and walls. It is held at 8.0 because, for the second round, the digest's and the gate's fixes covered the cases a reviewer named rather than the class those cases stood for.

## MUST-FIX

None.

## SHOULD-FIX

| # | Finding | Evidence | Direction |
| --- | --- | --- | --- |
| SF-J | **The digest still misses what the renderer is given** (SF-G, partly). Every pinned digest is recorded without an atlas (`tools/building-geometry.mjs:67-70`, `tools/record-building-geometry.mjs`), runs `onBeforeCompile` with a null renderer and a five-field stub (`:34-37`), refuses only own hooks (`:30`, `:45`), and has no morph targets, bounding volumes or provider-side material changes in its lines. | S1b, S2, S2b, S3, S4, S6 and S7 (the table under "The answer's SF-G, re-measured") pass the documented refresh, `tools/check.mjs`, the digest and catalogue tests and the suite (608 of 608), and change 976 to 490,672 editor pixels; G11 and Q7 are refused by the same pipeline, S8 is killed by the provider test. S1, the atlas dropped everywhere, survives everything but one TypeError. | Digest what the editor draws: record the reviewed digests with a named stub atlas (and the provider's `create` output, floor materials included) as well as without; run each hook with a renderer double and the renderer's own parameters (or refuse every hook but the default); refuse a hook found anywhere on the prototype chain below `Material`/`Object3D`; key `morphAttributes`, `morphTargetInfluences` and geometry bounds. A byte-exact SwiftShader frame per original design against the reviewed renderer would cover the class at once. Until then, say "every own setting, untextured". |
| SF-K | **The editor paths the count does not drive are tested by nothing** (SF-F, partly). The count drives the exterior and two cutaways, all with Roofs and Walls on (`tools/asset-draw-counts.mjs:31`); no test or gate sets Roofs off, Walls off, or the library's floor-control override. | F1 (`apps/editor/prefab-scene.js:120`: Roofs off no longer cuts), F2 (`packages/prefab-core/provider-original.js:21`: Walls off keeps original walls), F3 (`prefab-scene.js:133`: the rebuild passes walls on, Q5's analogue) and F4 (`prefab-scene.js:122`: the override ignored, which `apps/editor/buildings.js:79` uses) pass the module tests, the suite (608 of 608) and the check (`mutation/confirm.json`). Each is visible: under F1 Roofs off draws the exterior (65,626 pixels, 742 draws against 380), under F2/F3 Walls off does (24,842 pixels, 742 against 407), under F4 the preview's floor control changes nothing (0 pixels against 14,431) (`options-pixels.json`, `preview-check-f4.json`). F1 and F3 also pass the CI gate built into copies (20 headless and 108 culled counts equal, `ci-gate/`). | Add a Roofs-off and a Walls-off view to `VIEWS` (and so to both fixtures), or a drive test per toolbar option asserting its effect on the counts; drive the preview's override in `tests/building-library-lifecycle.test.mjs` and assert the drawn groups change. |

## NIT

- **N8. The `own` flag has no margin and no test.** g1's overview sets it for a 0.50 ms span against a 0.49 ms submit (`timing/main-vs-candidate-grid-tables.md`); B1 (`own` always true) passes the suite and the check. "Only then is it the GPU's own time" (`docs/asset-rendering-benchmark.md:37`) overstates: an `own` span still includes the frame's idle gaps, so it is an upper bound (span − submit is a lower one). Require a margin (say 10 % and 0.1 ms) and pin the flag on a stub result.
- **N9. The threshold comment quotes the pilot.** `apps/editor/prefab-scene.js:20-22` gives "of 6 to 8, x1.13-1.20 and x0.90-1.03" (two runs, blanks ×0.87–1.16); the formal run, which the docs quote, measured ×1.00–1.30 and ×0.82–1.03.
- **N10. "Loses in close and far views under lamps" is stated as general** (`docs/building-prefabs.md:72`, the record's Not done). It holds for the two clusters measured; the 32-copy grid gains there under night lamps (×1.30 close and far). State it per cluster, with copies per camera as the cause.
- **N11. The cluster rule turns on a metre** (`cluster-rule.json`): eight copies in a row batch at 20 m and draw per copy at 21 m; turning every other copy, or moving one by 1 m, splits the cluster below eight. Correct, and pixel-equivalent, but the assets' time steps by up to ×2.4 under an author's hand; worth a sentence in the docs.
- **N12. The bench's waits are untested.** B2 (no wait after `open`) and B3 (the cutaway's wait dropped) pass the suite and the check; B3 also passes the CI gate built into a copy (20 headless and 108 culled counts equal, `ci-gate/b3.log`): with every library loaded the update ends in microtasks before the next `evaluate`, so the waits are belt and braces. They guard a timing the gate does not exercise.
- **N13. Two documented bounds read slightly low.** "At most 19 pixels outside the far views" reads 20 (w8 cutaway) here; the night-lamp triangle range "+18–31 %" is +34 % in the dense grid's far view (both per map; neither changes a verdict).

## Claims re-checked ("The answer to round 4, measured")

| # | Claim | Verdict | Numbers (this round) |
| --- | --- | --- | --- |
| 1 | MF-C rule: spheres of each building's extent overlap, single linkage (a row or grid is one cluster), sort-and-sweep along x; ≥ `BATCHED` = 8 batches, every other copy draws its own batches | **Holds** | Code as stated (`prefab-scene.js:23-42,97-115`); the answer's brute-force test plus C1–C4, C7 killed here. Benchmark: w1 one cluster (union spheres 115–126 m), w8 24 of 32 batched (octagons 6 + 2), w2/w3/w4/w7 none. |
| 2 | The Gross houses now draw per copy; the 32 copies of the largest design stay one cluster | **Holds** | `clusters.json`. |
| 3 | Lit Gross ×2.10–5.13 against main (six fires ×4.45 / 5.13 / 4.00 / 2.10; 18 fires, night lamps, spots ×2.19–5.23) | **Holds** | l4 ×4.59 / 4.94 / 3.73 / 2.21; l4n ×5.01 / 3.81 / 4.03 / 2.21; blanks ×0.92–1.07. |
| 4 | The threshold measured: pilots at 3, 6–8, 16 (2 runs); formal against per copy at 8 and 32 | **Holds** (the pilots' figures match their JSON) | The pilots' blanks range ×0.87–1.16, so their lit ×0.93 at eight was within noise of the formal ×0.82. Formal per-copy table reproduced: l8 ×0.96 / 0.82 / 0.89 / 1.05, l1 ×1.02 / 0.88 / 0.87 / 1.36, w1 ×1.25 / 1.08 / 1.08 / 2.05, w8 ×1.08 / 1.01 / 1.01 / 1.25. |
| 5 | Batched clusters stay slower than per copy in lit close and far views (×0.82–0.91), the setup count the cause; "keep eight" provisional | **Partly** | The two clusters measured: holds, and the setups reproduce exactly (218 / 174 / 615 / 2.82 at l8's lit close view). The grid of 32: faster batched in every view, lamps included (×1.30–1.72; 5.1–6.2 copies per drawing setup), so the loss is not general (N10). Eight: supported. |
| 6 | The runs dropped at no cost; no patched chunk; no deprecation warning | **Holds** (warning and chunk); cost not re-timed | No warning on 5 pages × 25 views; the test asserts the unpatched chunk; the answer's no-runs pilot ×0.94–1.05 against nulls ×0.89–1.07. |
| 7 | Both arms draw the same triangles; batching cuts the calls (w1 798 → 304, l1 2,129 → 980) | **Holds** | 24 of 24 map-views equal, w1 and l1's calls exact; g1 704 → 22, n1 3,141 → 503. |
| 8 | Pixels: batched differs from separate meshes by float rounding (20 / 128 / 682 / 11 and 11 / 25 / 978 / 29; ≤ 0.10 %); per copy byte-identical apart from door-leaf cutaway pixels | **Holds** (one bound reads 20, not 19: N13) | Batched against per copy and main: the same figures exactly; per copy = main in 24 of 25 views (w1 cutaway 8 px, 1 level); repeat 0 px in 25 of 25; half-radius control differs in 16 of 25. |
| 9 | The lit cutaways' cause restated: display batches draw one draw per material however much the cut hides (18,532 → 2,588 and 8,180 → 2,330 asset draws) | **Holds** | The counts exact in my run. |
| 10 | SF-F: the count opens and sets each view with `setOptions`, awaiting `pending`; `checkDrivePath` refuses a changed AFT scene; Q5 and its analogues die; the CI gate refuses Q5 in 19 checks | **Holds for the counted views** | Q5, Q5b, Q5c, D6, D10 killed; the CI gate built into a copy refuses Q5 in 19 checks (6 headless, 13 culled). The paths outside the three views fail nothing (SF-K). |
| 11 | Every pinned headless count unchanged by the new path | **Holds** | The headless fixture is byte-identical from `f1c162f` (the clusters) through `059e71a`. |
| 12 | SF-G: the key is every own setting, the compiled shader, a program key and the node's order, layers, culling, draw range and custom depth; other hooks refused; Q7, Q8, Q10 refused by the refresh | **Partly** | Q7 and G11 refused here (the answer's logs: Q8, Q10). Seven other edits pass everything and change up to 490,672 editor pixels; inherited hooks are not refused (S3) (SF-J). |
| 13 | SF-H: `own` per arm; only walls exceed the submit; the record's GPU claim withdrawn; the lit Gross district in the proxy (×1.06 / 1.02 / 1.03 / 1.02) | **Holds** (N8) | Re-derived from the formal JSON exactly; no `own` on my 12 subset maps; the flag flips at 0.50 against 0.49 ms; untested (B1). Proxy not re-run. |
| 14 | SF-I: the docs state the lamp-lit triangles (+8–20 % six fires, +15–25 % 18 fires, +18–31 % night lamps, +1–15 % spots; unlit to +5.5 %, +10.1 %) | **Holds** | Equal to the formal counts and to mine; the dense grid +18–34 % under night lamps (N13). |
| 15 | N1: 63 of 66 views at ×2 by median, 61 in every run | **Holds** | Exactly, from the formal JSON; my subset 28 of 28 by median, 22 of 28 in every run. |
| 16 | N2–N7 | **Holds** | N3's line prints; N4's stamp names the copy; N5 no warning; N6 maps; N7 the looking-away camera. |
| 17 | Mutation: 39 mutants, all killed but D5 (equivalent) and W1 (by design); M7, M8 killed by a new extent test | **Reproduced in part** | The controls (K0a, K0b), Q5–Q5c and C1 (the extent's frame, killed by the new extent test) die here; 9 of my 17 new mutants survive the suite and the check, 2 of them equivalent (Mutation). |
| 18 | Gates on `b9bdd05`: all pass; the CI job 20 headless and 108 culled counts equal | **Holds** (on `059e71a`) | |
| 19 | Browser: the rows draw in rows; the cutaway cuts every house; the library preview draws; the console stays empty | **Holds** | Pixel run's cutaways; the preview check (batched and per copy, through the override); only "GPU stall due to ReadPixels" driver messages. |

## The answer's MF-C, re-measured

**The rule is what the record says** (code-reading, `apps/editor/prefab-scene.js:23-42,97-115`; measured with `clusters.mjs`). Spheres of each building's extent, single linkage, sort-and-sweep along x; a cluster of at least `BATCHED` = 8 batches. On the benchmark: w1's 32 copies are one cluster (8 CopyBatches, union spheres 115–126 m, the whole district); w8 batches 24 of 32 (three clusters of 8; the octagons split 6 + 2); w2, w3, w4 and w7 batch nothing. The layout generator (`generateBuildingLayout`, `packages/prefab-core/index.js:144`) puts lots `maxSpan + 2 × clearance + 4` apart (27 m for the Gross houses), beyond any two Gross spheres' reach (20–24 m), so generated districts always draw per copy.

**Against main (measured, 19:51–20:19, assets alone, median of 4 runs and range):**

| Workload | Overview | Close | Far | Cutaway | Whole frame (o / c / f / cut) |
| --- | --- | --- | --- | --- | --- |
| w1, 32 copies of one design | ×3.79 (3.72–3.84) | ×2.02 (1.95–2.43) | ×2.39 (2.11–2.47) | ×3.14 (3.00–3.30) | ×2.38 / 1.75 / 1.78 / 1.34 |
| w4, 32 Gross houses | ×6.54 (5.89–6.87) | ×4.68 (4.39–4.95) | ×4.26 (3.63–6.63) | ×3.15 (2.58–3.26) | ×3.82 / 3.32 / 3.44 / 2.13 |
| w8, Gross rows of eight | ×6.72 (6.46–8.22) | ×3.72 (3.68–4.42) | ×3.96 (3.61–4.07) | ×4.04 (3.15–5.00) | ×3.52 / 2.65 / 2.90 / 2.07 |
| l1, 32 copies, six fires | ×3.02 (2.63–3.58) | ×2.18 (1.13–2.60) | ×2.19 (1.60–2.47) | ×2.06 (1.98–2.15) | ×1.71 / 1.49 / 1.57 / 1.23 |
| l4, Gross, six fires | ×4.59 (4.21–4.74) | ×4.94 (4.70–5.07) | ×3.73 (3.52–4.00) | ×2.21 (1.89–2.39) | ×2.47 / 2.74 / 2.40 / 1.62 |
| l8, rows of eight, six fires | ×5.40 (4.55–5.92) | ×3.71 (3.42–3.91) | ×4.21 (4.04–4.32) | ×2.53 (2.21–3.02) | ×2.44 / 2.27 / 2.49 / 1.61 |
| l4n, Gross, 12 electric lamps at 22:00 | ×5.01 (4.07–5.40) | ×3.81 (3.26–4.30) | ×4.03 (3.74–4.35) | ×2.21 (1.96–2.52) | ×2.58 / 2.27 / 2.36 / 1.61 |
| g1, 32 copies of one Gross design, one cluster (new) | ×10.50 (9.51–11.32) | ×7.05 (6.69–8.00) | ×7.12 (6.41–8.39) | ×8.16 (4.58–8.98) | ×3.86 / 3.15 / 2.88 / 2.47 |
| n1, the same ringed by 12 night lamps (new) | ×8.70 (7.55–9.31) | ×5.90 (5.21–6.77) | ×5.25 (4.84–5.46) | ×4.36 (3.83–4.92) | ×2.72 / 2.36 / 2.22 / 1.81 |
| Blank maps, with and without lamps (null) | ×0.95–1.04 | ×0.92–1.09 | ×1.00–1.08 | ×0.95–1.03 | ×0.95–1.07 |

Every one of the record's formal medians on these maps is within 10 % of mine (l4 ×4.45 / 5.13 / 4.00 / 2.10 there, ×4.59 / 4.94 / 3.73 / 2.21 here; w8 cutaway ×4.04 both). `--expect`: 32 headless and 48 culled counts equal, none refused; culled triangles equal the record's to the triangle. The Gross houses are no longer batched, so the lit Gross gain is the per-copy display batches' (round 2's), as the record says.

**Per copy against batched (measured, 20:31–20:50; A = the candidate's `instancing: false` build, B = the candidate; above 1, batching is faster):**

| Map | Overview | Close | Far | Cutaway | Draws per copy → batched (overview) |
| --- | --- | --- | --- | --- | --- |
| w1, 32 copies (one cluster) | ×1.25 (1.16–1.28) | ×1.08 (1.06–1.17) | ×1.08 (1.07–1.19) | ×2.05 (1.94–2.13) | 798 → 304 |
| w8, rows of eight | ×1.08 (1.00–1.09) | ×1.01 (0.94–1.14) | ×1.01 (0.99–1.05) | ×1.25 (1.19–1.44) | 771 → 267 |
| l1, 32 copies, six fires | ×1.02 (0.99–1.09) | **×0.88 (0.82–0.90)** | **×0.87 (0.83–0.90)** | ×1.36 (1.25–1.44) | 2,129 → 980 |
| l8, rows of eight, six fires | ×0.96 (0.89–1.08) | **×0.82 (0.78–0.89)** | **×0.89 (0.85–0.99)** | ×1.05 (0.89–1.14) | 2,390 → 1,133 |
| g1, 32 Gross copies, one cluster | ×1.80 (1.73–1.89) | ×1.62 (1.50–1.65) | ×1.50 (1.43–1.70) | ×2.37 (2.18–2.39) | 704 → 22 |
| n1, the same, 12 night lamps | ×1.58 (1.45–1.63) | ×1.30 (1.28–1.46) | ×1.30 (1.24–1.39) | ×1.72 (1.52–1.88) | 3,141 → 503 |
| Blank maps (null) | ×0.96–1.01 | ×0.94–1.00 | ×0.93–1.02 | ×0.93–1.01 | |

The record's per-copy table reproduces within noise (its l8 ×0.97 / 0.82 / 0.91 / 1.03, l1 ×1.04 / 0.88 / 0.86 / 1.21, w1 ×1.26 / 1.07 / 1.08 / 2.06, w8 ×1.13 / 1.00 / 1.12 / 1.30). Both arms draw the same triangles in all 24 map-views (the record: 16 of 16), and the draw counts it quotes (798 → 304, 2,129 → 980) are exact. Its cause, counted, reproduces to the setup (`setups.json`, D3D11): rows of eight lit close 218 drawing setups, 174 empty, 615 sub-draws, 2.82 per drawing setup; lit overview 491 / 363 / 1,748 / 3.56; the copies lit close 115 / 45 / 535 / 4.65.

**What the new grid adds (measured; judgment).** The densest cluster the editor allows is faster batched in every view, lamps included: ×1.30–1.72 under 12 night lamps, ×1.50–2.37 unlit, where its lamp faces set up 5.1–6.2 copies per drawing setup (390 drawing and 268 empty setups in the close view). So the record's "batched clusters stay slower than per-copy in lit close and far views (×0.82–0.91)" holds for the two clusters it measured (rows of eight, and 32 copies of the largest original, whose 86 k triangles per copy are 3.6 times a Gross house's) and not for clusters in general: a dense grid gains under lamps. "Keep eight" is supported: at eight the trade is level on average, and the clusters the editor can hold beyond it (up to 32 copies) gain more. What decides the trade is copies per camera per setup, which a copy count only proxies; the record says why a per-camera choice is not open in three (`three.module.js:8737`: the shadow pass tests the view camera's layers before any hook; code-reading confirms).

**The rule is sensitive to a metre (measured, `cluster-rule.json`; judgment).** Eight grossdale-hip copies in a row batch at 20 m apart and draw per copy at 21 m; turning every other copy of the 20 m row (a quarter or a half) splits it into [2,2,2,1,1]; moving the middle copy 1 m splits it into [4,4]; a grid whose lanes are one tile wider (lots 12 × 21 m) splits into four clusters of eight. Each flip changes the assets' time by up to the per-copy table's factors (×1.0–2.4) and never the pixels beyond float rounding (below), so it is a performance step under an author's hand, not a defect (N11). Heights do not arise: every copy's root sits at y 0 (`prefab-scene.js:89`).

**Pixels and counts, batched against per copy (measured, SwiftShader, `pixels/`).** The repeat control is byte-identical in 25 of 25 views; the per-copy build is byte-identical to main in 24 of 25 (w1's cutaway: 8 px, one level, the baked door leaves the docs name). Batched against per copy, the frames differ only by float rounding: 11–32 px in overviews, 25–164 in close views, 603–981 (at most 0.10 %) in far views, 12–30 in cutaways, 8–17 one floor up; 580–940 of the far views' pixels differ by one or two levels, and every unexplained blob outside the far views is at most 43 px (g1's close view), inside them at most 283. Against main (separate meshes) the docs' figures (32 copies 20 / 128 / 682 / 11, rows of eight 11 / 25 / 978 / 29) reproduce exactly, and against per copy they are the same but for w1's cutaway (17); "at most 19 pixels outside the far views" reads 20 (w8's cutaway) here and 43 on the new grid. The control can fail: copy spheres at half radius differ in 16 of 25 views (up to 8,960 px; every view of the two lamp-lit maps). Triangles: equal per copy and batched in all 25 views.

**Regressions where copies change (measured).**
- The layer audit passes all 18 steps (open; both cutaways; n0 moved away, which drops the cluster to seven and every copy draws itself, and back; a delete that splits the row three and four; its undo; turns; two overlapping edits; a view change while a Gross library load is held pending; the load's end; the library override and an edit under it). Its three controls fail it as they must (a batched copy also drawing itself; a CopyBatch matrix moved 1 m; a stale CopyBatch). `layer-invariants.json`.
- Undo and redo through the UI: removing one copy of a batched cluster of eight on w8 takes 53 CopyBatches to 35; Undo restores the first frame byte for byte with the same culled draws (127 + 140, 809,812 triangles), Redo the second, Undo again the first; the removal's frame differs (the control). `undo-check.json`.
- The library's preview scene, eight neighbouring warehouses: 8 CopyBatches batched, none per copy; 90 against 202 draws in the exterior and 16 against 114 through the floor control's override, the same triangles, 7 and 3 differing pixels of 400,000; the override changes 14,431 pixels (its control); no diagnostics, no console error or warning. `preview-check.json`.
- Edit latency, paired (A B B A blocks of 10, a move of one copy through `scene.update` plus one frame; 20:49–20:52): w8 191 → 174 ms, toggle 119 → 103 ms; w1 201 → 188 ms, 107 → 109 ms; g1 179 → 169 ms, 106 → 100 ms. Open times (bench, 4 runs): the candidate's are 0.85–1.09 times main's on every map (the slowest, g1, 1,347 against 1,232 ms; the blanks 0.96–1.08).
- No deprecation warning in the editor's console (five pages, 25 views; only the driver's "GPU stall due to ReadPixels" from the captures).
- `./assets/three`, `./roofs/three`, the roof layer, the preview scene and the library UI are unchanged since `cb720d8` (`git diff --stat` over `packages/assets`, `packages/roof-core`, `apps/editor/roof-scene.js`, `prefab-preview.js`, `buildings.js`: empty); `test:package` passes.

## The answer's SF-F, re-measured

**The drive path holds where the count drives it (measured).** Round 4's Q5 and the answer's two analogues on the edit and open paths die by the count's drive test in 14–15 s (`mutation/phase1.json`), and so do a stand-in whose `open` does not rebuild (D6), a count that no longer marks the roof atlas loaded (D10: by an assertion, not a hang), stale copy matrices (C2), an off-by-one threshold (C3), a broken union (C4), glass batched (C6) and unturned cluster spheres (C7). Built into a copy, the CI gate refuses Q5 in 19 checks, the cutaway of every map with buildings (6 headless, 13 culled), exactly as the record says (`ci-gate/q5.log`). The headless count's fixture is unchanged by the drive path (`d076c0b` and every later commit carry `f1c162f`'s pin).

**What the drive does not reach (measured).** The count drives three views (`tools/asset-draw-counts.mjs:31`), all with Roofs and Walls ticked; nothing drives the toolbar's other two options or the library's floor control. Four mutants of those paths pass the module tests, the whole suite (608 of 608) and `tools/check.mjs` (`mutation/confirm.json`):

| Mutant | Line | What the editor would do |
| --- | --- | --- |
| F1 | `apps/editor/prefab-scene.js:120` (`cut=!showAllLevels\|\|!roofs` → `cut=!showAllLevels`) | unticking Roofs no longer shows the buildings' cutaway |
| F2 | `packages/prefab-core/provider-original.js:21` (the walls-off rule removed) | unticking Walls leaves every original building's walls |
| F3 | `apps/editor/prefab-scene.js:133` (the rebuild passes `walls:true`; Q5's analogue for Walls) | the same through the editor's own rebuild |
| F4 | `apps/editor/prefab-scene.js:122` (the `setView` override ignored) | the building library's Inspect floor control (`apps/editor/buildings.js:79`) stops changing the preview |

None is equivalent (measured, `options-pixels.json`, SwiftShader, w3 overview, each copy's editor driven through `setOptions`): in the candidate, Walls off changes 24,842 pixels and Roofs off 65,626 (the control); under F1, Roofs off draws the exterior again (65,626 pixels from the candidate's Roofs-off frame; culled asset draws 408 + 334 and 1.25 M triangles where the candidate draws 190 + 190 and 0.26 M); under F2 and F3, Walls off draws the exterior again (24,842 pixels; 408 + 334 draws against 210 + 197); under F4 the library preview's floor control leaves the frame as it was (0 pixels, against 14,431 in the candidate; `preview-check-f4.json`). Each would fail a count of its view at once; no count has the view. F1 and F3 also pass the CI gate built into copies (20 headless and 108 culled counts equal, exit 0; `ci-gate/f1.log`, `ci-gate/f3.log`). The floor control the editor fires after `open` (`setOptions({level})` from the vendored `editor-3d.js`) is not modelled by the stand-in's `open`; that is equivalent on the benchmark maps, whose starts are on level 0, and the bench's wait for it (B2) and its cutaway wait (B3) can both be dropped with every test, the check and (B3) the CI gate still passing. D7 (the stand-in's `update` does not rebuild) survives too; it is equivalent for the gate, which never calls `update` while counting, but it means the drive test's edit step covers the prefab layer only. C5 (released copies show every node during a load) is equivalent: a batch mesh its template hides has no geometry groups (`display-batches.js:51-58`), and three draws no group of a material array.

## The answer's SF-G, re-measured

**Round 4's cases are closed (measured).** Round 4's Q7 through the documented refresh is now refused by the registry (`Original building geometry differs from reviewed commit ee7c18e…: bramble-ranch`), the check, the digest tests and the suite (605 of 608), as is G11, the control (604 of 608); the answer's own logs show the same for Q8 and Q10. `node tools/record-building-geometry.mjs` re-derives the fixture from `ee7c18e`'s renderer, and the fixture hashes to its pin (`179c8e70…`, `tools/prefab-original-catalog.mjs:18`).

**The class is not (measured, `refreshed/`, `pixels-mutants/`, `pixels-s1b/`).** Seven one-edit changes to how a reviewed building is drawn in the editor pass the documented refresh (the exports, then the registry, which re-verifies every digest), `tools/check.mjs`, the digest and catalogue tests and the whole suite (608 of 608), and every one changes the editor's pixels (SwiftShader, of 967,296; overview / close / level-0 cutaway of the 32 distinct originals, w3, unless noted):

| Probe | The edit, in a built copy | Why the key cannot see it | Pixels changed in the editor |
| --- | --- | --- | --- |
| S1b | `packages/building-catalog/three.js:76`: only the interior material keeps the atlas | every pinned digest is made without an atlas (`buildingDigests` calls `createBuildingModel(T, id, {lod})`, `tools/building-geometry.mjs:67-70`; the recorder likewise), so `map` is `null` in the reviewed key whatever a material does with the atlas the editor passes; the provider test checks `map` only on meshes that have one (`tests/prefab-providers.test.mjs:49`) | 61,102 / 490,672 / 24,882, up to 194 levels: every exterior surface unpainted |
| S2 | an `onBeforeCompile` that halves the colour when it is given a renderer | the key runs each hook with `null` for the renderer (`tools/building-geometry.mjs:37`) | 57,604 / 487,401 / 18,522 |
| S2b | the same hook keyed on `shader.numPointLights > 0` | the key hands a five-field stub where the renderer hands its parameters (whose `shaderName` is the material's name, `three.module.js:6960`, not its type) | none unlit; under six fires (l7) 36,318 / 477,187 / 11,689 |
| S3 | an `onBeforeRender` inherited from the material's prototype, setting an emissive term at draw time (round 3's G11, applied while drawing) | the refusal checks own keys only (`tools/building-geometry.mjs:30`); three calls `material.onBeforeRender` on every draw (`three.module.js:16854`) | 57,589 / 487,341 / 18,509 |
| S4 | the glass geometry's bounding sphere at 1 % of its radius | bounding volumes are not keyed; the renderer culls glass by them (and the clusters size their extent by them) | 0 / 976 / 0: glass panes vanish at the screen edge (711 → 697 draws); 1,109 under lamps |
| S6 | a morph target lifting the glass 1 m, at influence 1 | `geometry.morphAttributes` and `morphTargetInfluences` are in no line | 11,060 / 26,398 / 0 |
| S7 | the provider's floor polygon offset with its sign flipped (`packages/prefab-core/provider-original.js:16`) | the provider's material changes lie outside the digest; the provider test checks `polygonOffset === true` only (`tests/prefab-providers.test.mjs:50`) | 3,962 / 2,101 / 18,974: floors sink under the ground |

Controls and limits: S8 (the provider's atlas colour space) is killed by the provider test's colour-space assertion. S1, the atlas removed from every material, passes the refresh and the check and dies only by a TypeError in the digest test's texture check (`material(b).map.repeat`, `tests/building-geometry.test.mjs:65`), which S1b's narrower edit avoids: no assertion stands behind it. So the code's claim "Equal digests mean the renderer drew the same model, whatever its source text" (`tools/building-geometry.mjs:7-8`), the record's "Any other hook, on a material or a node, is refused rather than left out", and the CHANGELOG's "an unlisted setting such as an emissive term or a shader patch cannot change a reviewed building unseen" do not hold: S3 is an emissive term and S2 a shader patch, and S1b changes half of every frame. As in round 4, the fix keyed the cases named and not the class: what the renderer is given (the atlas, itself, its parameters, inherited hooks, morphs, bounds, the provider's own changes).

## The answer's SF-H, SF-I and N1, re-measured

- **SF-H holds as written, with two loose ends.** The bench writes `own` per arm (`tools/bench-asset-rendering.mjs:286`), the docs say a span is the feed's unless it exceeds the submit time (`docs/asset-rendering-benchmark.md:37`), and the record's "the GPU's own time falls ×4.4–9.7" is withdrawn. Re-derived from the formal JSON (`formal-check-answer.json`), `own` is set only on walls (w5a both arms, w5b and l5b the candidate), as the record says; in my runs it is set nowhere on the 12 subset maps. Loose ends: (a) the flag has no margin: on g1's overview the candidate's span is 0.50 ms against 0.49 ms of submit, and the flag calls that the GPU's own time; (b) "only then is it the GPU's own time" overstates it: a span that exceeds the submit still includes the idle gaps before the GPU fell behind, so it bounds the GPU's own time from above (and from below by span − submit). No test reads the flag: B1 (`own` always true) passes the suite and the check. The lit Gross district is in the SwiftShader proxy (`tables-swiftshader.md`: ×1.06 / 1.02 / 1.03 / 1.02), with the record's numbers; I did not re-run the proxy.
- **SF-I holds.** The docs' lamp-lit triangle figures (`docs/building-prefabs.md:72`) equal the formal run's culled counts (re-derived: six fires +7.8–19.8 % over l4 and l8, mixed +10.0–14.2 %, copies +2.2–4.0 %, walls +13.6–17.4 %; 18 fires +15.3–25.2 %; night lamps +18.4–30.8 %; spot lights +1.3–15.3 %; unlit up to +5.5 %, the Gross far view +10.1 %, walls +13.6 %), and my runs reproduce those counts to the triangle on every shared map. The new grid under night lamps draws +18.3 / 26.4 / 33.9 / 18.3 % (n1), past the documented +18–31 % for night lamps; batching adds none there either.
- **N1 holds.** From the formal JSON: 66 views, 63 at ×2 by median, 61 in every run, the misses exactly as stated. My subset (28 changed views): 28 by median, 22 in every run (the lowest runs: l1's close ×1.13 and far ×1.60 from the one slow run; l4's and l4n's cutaways ×1.89 and ×1.96; w1's close ×1.95).
- **N2–N7 hold** (read, and measured where marked): N2's test is present; N3's line prints ("--expect compared 32 headless and 48 culled counts, all equal."); N4: the per-copy copy is named by its stamp (`059e71a [extracted archive (git archive + 1 edit(s) from percopy.json)]`); N5: no deprecation warning in 25 views; N6: the lamp maps are in the benchmark; N7: the shadow helper passes a camera that looks away (`tests/editor-copy-batch.test.mjs:32-35`).

## The goal

**Against main 0.10 on this rig (measured above):** assets alone reach ×2 by median in every changed view I measured (28 of 28: unlit ×2.02–6.72, lit ×2.06–5.40), and in 22 of 28 in every run; the record's 63 of 66 (61 in every run) reproduces from its own data. The densest structure the editor allows, 32 copies of one design, gains most: ×7.1–10.5 unlit and ×4.4–8.7 under 12 night lamps. Whole frames, what an author sees, are ×1.71–3.86 at the overview and ×1.23–2.47 in cutaways. So on a desktop GPU fed by the CPU, **the goal is met for buildings (measured here) and wall runs (the record's ×3.2–18.9, not re-measured), lit and unlit, in every view**, with three medians within a tenth of ×2 (w1's close view ×2.02, l1's cutaway ×2.06, the record's lit copies' cutaway ×2.03).

**What remains (judgment, from the measurements):**
- **Roofs.** Their close and far views stay under ×2 (record: ×1.59–1.95), untouched by this answer; the merged roof mesh is culled whole, so its culled triangles grow ×3–16 against main's separate roofs (formal JSON; at most 0.10 M triangles).
- **Lit cutaways** are the weakest asset views (×2.06–2.53 here) and **whole lit cutaways** stay ×1.23–1.81, held by the inherited light renderer, which this work does not touch.
- **GPU-bound devices.** The SwiftShader proxy is at parity (×0.93–1.06), and lamp-lit display batches draw +8–34 % more triangles than main; a phone or integrated GPU would gain little until batches split per floor block or tile (the record's "next step"). Not measured on such a device.
- **Batched clusters under lamps** lose to per copy in the close and far views of rows and of large designs (×0.82–0.89), and win in a dense grid; neither threatens ×2 against main.

## Mutation results (`mutation/`)

`mutate-r5.mjs` in place on the sandbox (round 4's rules: a dirty tree refused, every needle once, each file restored byte for byte in a `finally` and hash-checked, HEAD and status recorded before and after every mutant, children's output streamed, a null exit an error, the cancelled count reported, a memory watchdog that stops only its own child). HEAD `059e71a`, status clean before and after every mutant and phase; no invalid needle, no null exit, no cancelled test, no kill by cancellation alone; free memory never below 40 GB. Phase 1 21:24–21:32 (each mutant against its module tests); the survivors and the bench's three mutants then against the whole suite (608 tests) and `tools/check.mjs`, 21:32–21:41.

| Mutant | What it does | Phase 1 | Suite + check |
| --- | --- | --- | --- |
| K0a, K0b (controls) | never batch; no per-copy culling | killed (the drive test; the camera test) | — |
| R-Q5, R-Q5b, R-Q5c (the answer's) | the rebuild, the edit, the open path ask for the wrong levels | killed (the drive test, 14–15 s) | — |
| C1 | the extent in the template's world frame, not its root's | killed (the extent test) | — |
| C2 | copies' world matrices not refreshed before clustering | killed (the drive test) | — |
| C3 | a cluster of exactly eight drawn per copy | killed (the drive test) | — |
| C4 | union-find links a node, not its root | killed (the pinned counts) | — |
| C5 | released copies show every node during a load | survived | survived (608 of 608, check 0): **equivalent** (a hidden batch mesh has no groups) |
| C6 | glass batched too | killed (the pinned counts) | — |
| C7 | cluster spheres moved with the copy but not turned | killed (the camera test) | — |
| D6 | the stand-in's `open` does not rebuild | killed (the pinned counts) | — |
| D7 | the stand-in's `update` does not rebuild | survived | survived: equivalent for the gate, which never updates while counting |
| D10 | the roof atlas not marked loaded | killed (the pinned counts, by assertion) | — |
| F1 | Roofs off no longer cuts the buildings | survived | **survived** (SF-K) |
| F2 | Walls off keeps original buildings' walls | survived | **survived** (SF-K) |
| F3 | the rebuild passes Walls on | survived | **survived** (SF-K) |
| F4 | the library's view override ignored | survived | **survived** (SF-K) |
| B1 | the bench's `own` always true | (no module test) | **survived** (N8) |
| B2 | the bench's wait after `open` dropped | (no module test) | survived (N12) |
| B3 | the bench's cutaway wait dropped | (no module test) | survived (N12); the CI gate built in: all equal |

Through the documented refresh (`refreshed/`, 21:42–22:20): G11 and Q7 refused; S8 killed by the suite (1 of 608); S1 killed by one TypeError only; **S1b, S2, S2b, S3, S4, S6, S7 survive everything** (SF-J).

## Gates on `059e71a` (`gates/summary.txt`, logs in `gates/`)

Run one after another on the clean sandbox (`git status --porcelain` empty before and after), 22:42:22–22:50:38, load 42 % at the start (the gates' own test runs):

| Gate | Exit | Time | Result |
| --- | --- | --- | --- |
| `node tools/build.mjs` | 0 | 20 s | |
| `npm run check -- --tracked` | 0 | 7 s | |
| `npm test` | 0 | 67 s | 608 of 608, none cancelled |
| `npm run test:upstream` | 0 | 4 s | 32 of 32 |
| `npm run test:package`, `test:assets`, `test:grenade-renderer` | 0 | 25 s | |
| `npm run check:buildings` | 0 | 2 s | |
| `node tools/asset-draw-counts.mjs` | 0 | 15 s | Asset draw counts match the pinned fixture. |
| `node tools/record-building-geometry.mjs` | 0 | 7 s | The fixture equals the reviewed renderer's digests. |
| `npm run review:integration` | 0 | 45 s | drawCalls frame 1141, shadow pass 632 |
| `npm run review:asset-counts` (the CI job) | 0 | 300 s | "--expect compared 20 headless and 108 culled counts, all equal." |

All gates pass. None of them fails on F1–F4, B1–B3, or, after the documented refresh, S1b, S2, S2b, S3, S4, S6 and S7 (each passes the 608 tests and the check; F1, F3 and B3 also the CI job built in), nor on the lit batched clusters' close and far views (no timing gate, by design).

## Not verified

- **Phones and integrated GPUs.** One RTX 3080 here; the GPU-side evidence is the triangle counts and the record's SwiftShader proxy, which I did not re-run.
- **Wall runs and roofs** were not re-timed (the record's ×1.6–18.9); their counts equal the pinned ones in the gates.
- **The runs' removal cost** (the answer's pilot only) and the D3D11 copy-table stall (code-reading only).
- **Other browsers and devices without `WEBGL_multi_draw`**: not run (round 4 emulated the fallback in Edge).
- **The layout generator's preview with a batched cluster**: the preview scene was driven with eight neighbouring copies directly; the generator itself never links copies (its lot pitch), so it was not run through the dialog.
- **Codex processes** were present on the box throughout (idle in the process list at 19:37); I did not watch them during the timings. The load samples around the GPU series were 2–14 %, the bench's own browser included, and one run of one map had a slow block (Load).

## Carried engine items (not scored)

- **MF1** (open): the editor export still passes silently through AFT and Farmyard, which drop buildings, roofs and wall runs (not re-verified).
- **MF2** (open): `ee7c18e`, the reviewed renderer, is reachable only from `codex/nautilus-art` (re-checked: `git branch -a --contains`; not an ancestor of main `fb35277` or of `059e71a`).
- **MF3** (open): no asset standard, registration or authoring path (not re-verified).

## Evidence index (`artifacts/r08-5/`; local paths masked as `<sandbox>`, `<baseline>`, `<scratch>` in anything copied out)

| File | What |
| --- | --- |
| `gpu-chain.sh`, `timing/load.txt` | The GPU series and their load samples |
| `timing/main-vs-candidate.json` (+ `.log`, `-tables.md`, `-check.json`) | Main 0.10 against the candidate, the answer's instrument, 12 maps |
| `massive-maps.mjs`, `maps-massive/`, `maps-all/`, `timing/main-vs-candidate-grid.json` (+ tables) | The 32-copy Gross grid, unlit and under 12 night lamps, against main |
| `timing/percopy-vs-candidate.json` (+ tables), `setups.mjs`, `setups.json` | Per copy against batched; the CopyBatch setups per frame |
| `edit-timing.mjs`, `timing/edit-*.json` | Edit and toggle latency, paired |
| `clusters.mjs`, `clusters.json`, `cluster-rule.mjs`, `cluster-rule.json`, `extents.mjs` | How the layer clusters the maps; rows, turns, grids, one-metre moves |
| `layer-invariants.mjs`, `layer-invariants.json` | The 18-step audit with its three controls |
| `undo-check.mjs`, `undo-check.json`; `preview-check.mjs`, `preview-check*.json` | Undo/redo through the toolbar; the library preview batched, per copy and under F4 |
| `pixels.mjs`, `compare-px.mjs`, `pixels/` | Candidate, repeat, per copy, main, half-radius control: 5 maps × 5 views |
| `mutate-r5.mjs`, `mutation/phase1.*`, `mutation/confirm.*` | 22 mutants (17 new, 2 controls, 3 reproductions), phase 1 and confirmation |
| `options-pixels.mjs`, `options-pixels.json` | F1–F3 under Walls off and Roofs off |
| `edits/`, `make-tree.mjs` (the answer's), `refresh-check.sh`, `refreshed/`, `pixels-mutants/`, `pixels-s1b/` | The digest probes through the documented refresh, and photographed |
| `ci-gate/` | The CI gate built into Q5, F1, F3 and B3 |
| `formal-check.mjs`, `formal-check-answer.json` | The record's numbers re-derived from its own JSON |
| `gates.sh`, `gates/` | The repository gates on the clean sandbox |
