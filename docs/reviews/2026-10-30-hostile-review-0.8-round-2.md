# Hostile review, round 2 (0.8 series): the answer to round 1 (`claude/asset-render-speed` at `f2a6392`)

- **Reviewed commit:** `f2a63929600abb224ae57443475b056070825def`, branch `claude/asset-render-speed`, stacked on round 1's record `0f0118a`. Baseline: main `f6caeef309e56423fea5e32eb717533f33b59cbb`.
- **Date:** 2026-10-30, 02:19–03:30 local. One hostile reviewer (Claude), round 2, in the detached sandbox worktree `<sandbox>` at `f2a6392`. The baseline `<baseline>` (main, `dist/` built) was read only and served as the A arm. `git status --porcelain` of the sandbox was empty before and after every mutation and gate run (recorded in `mutation-results.json`, `mutation-confirm.json` and `gates.json`).
- **Judged against:** the owner's goal, **render assets twice as fast**, for the massive structures being built, and round 1's rendering findings (MF4, SF1–SF5). MF1–MF3 (game exchange, pins, asset authoring) are the architect's; they are carried below as open engine items and not scored.
- **Labels:** **measured** = run here and quoted; **code-reading** = cited source; **estimate** = arithmetic on measurements; **judgment** = assessment.
- **Rig.** Windows 11 10.0.26200, AMD Ryzen 7 5800X (16 threads), Node v24.15.0, headless Edge 156.0.4314.56 through the Playwright in the Codex runtime. ANGLE **D3D11 on an RTX 3080** for timing; **SwiftShader** (Vulkan, Subzero) for pixels. Viewport 1600 × 1100, deviceScaleFactor 1, editor canvas 1056 × 916 (967,296 pixels).
- **Shared machine.** Other agents were active. Every timing below is paired (two pages of one Edge, blocks A B B A, both arms in the same seconds), repeated (2–8 runs), and reported as a median with its range. The blank map runs identical code in both arms; its ratio, **×0.99 (0.94–1.03)**, is the noise floor. All timings were taken 02:22–02:50, before the 04:00 job. Draw counts, triangle counts, geometry counts and pixel bytes are load-independent; they were identical in every run.
- **Method.**
  1. Re-ran the answer's own instrument (`tools/bench-asset-rendering.mjs --editor`, 4 runs, 7 workloads; `--node`, 8 runs).
  2. Measured the assets' own frame time **directly** with an independent probe (`assets-only.mjs`): every mesh outside the asset layers is hidden at render time, with a hidden list computed once per map, so hiding costs the same in both arms. The answer instead **subtracts** the blank map's frame from each arm.
  3. Built an independent pixel probe (`pixel-probe.mjs`) with a **stronger tie oracle**: a differing pixel counts as a tie only if one arm's `<=` pixel equals the other arm's strict-`<` pixel. It also builds a **door-coverage mask** (the baseline frame with door pivots hidden) and new **point-light maps**.
  4. Re-derived the provenance pins from Git objects (`provenance.mjs`).
  5. Differential fuzz of the generator against the reviewed renderer (`gen-differential.mjs`): 20,000 random unit calls, 240 random recipes, and a stronger digest.
  6. 52 mutants of the new code (`mutate.mjs`): dirty tree refused, unique needles, restore in a `finally`, HEAD and status recorded.
  7. The repository gates (`gates.mjs`).

## Score

**6 / 10 for the answer**, against the goal and round 1's rendering findings. MF1–MF3 remain open engine items (unscored; see the end).

The speed is real and reproduces:
- **Draw calls** fall exactly as claimed: 4,480 → 1,877 (w2), 8,657 → 1,941 (w4), 5,916 → 1,127 (w5b). The counts were the same in every run.
- **Whole editor frames** reproduce within a few percent: ×2.10 (w2), ×3.76 (w4), ×5.88 (w5b) and ×2.89 (w7) at the overview, against a ×0.99 null control.
- **The generator** is ×3.25 faster and bit-identical. That holds for the 96 pinned outputs, for 240 random recipes and for 20,000 random low-level calls, under a digest stronger than the answer's.
- **Every pixel difference the answer reported reproduces** and is explained. The tie differences pass a stricter oracle than the answer's (100 % of 1,104 pixels). The 14 one-level pixels all lie on door leaves, which cover under 0.9 % of each frame.

What holds the score down:
- **A pixel regression the answer missed (MF-A).** Point-light shadows of cut wall panels are cast by full 1 m boxes. 13,112 pixels differ in a close view of free-angle walls beside a campfire; both controls are byte-identical.
- **MF4 is half-closed.** The instrument exists, but nothing gates on it. A frame-count or pixel regression would pass every gate.
- **The new tests cannot fail on the new risk surface.** Mutants that put every wall panel at one transform, make every panel 1 m wide, drop the shadow-depth material, swap or drop the batches' UVs, skip the normal rotation, or leak batch geometry on dispose all pass the suite.
- **The goal is met per asset class, not across the board.** Repeated copies of one design reach ×1.63–1.99 (assets only) and ×1.29–1.68 (whole frame). Roofs stay ×1.0. The public facade that the games use draws exactly as many meshes as before.
- **The provenance gate is weaker than the one it replaced.** It no longer protects the door pose, the view rules, export freshness, or the fixture's own provenance. The registry record now pairs commit `ee7c18e` with two hashes that do not exist at `ee7c18e`.

## MUST-FIX

### MF-A (new, measured). Point-light shadows of cut wall panels are cast by a full-width box

**Code-reading.** `apps/editor/wall-scene.js:65` gives each wall `InstancedMesh` a width-patched `customDepthMaterial` but no `customDistanceMaterial`. The vendored renderer picks the shadow material per light type (`three.module.js:8648`): `light.isPointLight ? object.customDistanceMaterial : object.customDepthMaterial`. Lamps are point or spot lights with `castShadow = true` (`vendor/aft/…/lighting-scene.js:34`): campfire, cooking fire, torches, floor lamps, sconces and streetlights. So in every point-light shadow cube, each panel is drawn by the default distance material, which knows nothing of `wallWidth`, at the unit width of 1 m. On `main` each cut length had its own `BoxGeometry(width)`, which is correct in every shadow map. The answer's claims "bit-identical to `BoxGeometry(width)`" and "a matching depth material for shadows" (`docs/wall-runs.md`) are true only for the sun and spot lights.

**Reproduction** (measured, SwiftShader, reduced motion so the fire does not flicker; every frame repeat-identical; `pixels-lights-still.json`, PNGs in `pixels-lights-still-png/`). The probe maps come from `probe-maps.mjs`; each frame is captured by `pixel-probe.mjs --reduced-motion`.

| Map (close view, 24 m) | Differing pixels | Max delta | Tie (strong oracle) |
| --- | --- | --- | --- |
| p1: 10 free-angle runs (cut final panels) beside a campfire and two torches | **13,112** | 67 | 0 |
| p1, cutaway | **14,694** | 74 | 0 |
| p1, overview (250 m) | 150 | 19 | 9 |
| p2: the same walls, no lamps (control) | 0 | 0 | — |
| p3: the same lamps beside integer-length runs, all panels 1 m (control) | 0 | 0 | — |
| w0 blank (null control) | 0 | 0 | — |

The difference image shows shadow wedges radiating from the light through the ends of the cut panels. That is the extra shadow of a 1 m caster standing in for a shorter panel. Control p3 also shows that the default distance material is exact when the width is 1, which is what the mechanism predicts.

**Direction.**
- Give every wall instance set `customDistanceMaterial = patchWallWidth(new T.MeshDistanceMaterial(), 'nautilus-wall-width-distance-v1')`.
- Assert in `tests/editor-wall-scene.test.mjs` that every wall `InstancedMesh` carries both custom shadow materials and that both are patched. Today the mutants that drop or unpatch the depth material survive (W2, W3).
- Add a point-light map like p1 to the benchmark's pixel set, rendered with reduced motion.

## SHOULD-FIX

| # | Finding | Evidence | Direction |
| --- | --- | --- | --- |
| SF-1 | **MF4 is half-closed: the instrument exists, nothing gates on it.** Round 1 asked to gate on the exact draw-call count per workload and on a full-canvas pixel comparison. `review:integration` now records a whole frame but asserts only `shadowPass>0 && frame>shadowPass+1` (`tools/review-engine-integration.mjs:115`). The benchmark and its pixel comparison are manual, and the door control build's patch is not recorded, so it cannot be rebuilt. | **Measured:** counts are deterministic (identical in 4 GPU runs and on SwiftShader), so exact gates are cheap. **Mutation:** B4 swaps two Gross classes. By code-reading, that puts the roofs between the ground floor and the always-shown parts, so the level-0 cutaway becomes two runs instead of one. It survives the whole suite, because the tests bound runs (≤ 2) rather than pin them. | Commit expected counts per workload and view (e.g. w2 overview: 1,877 calls, 896 of them in the shadow pass) and fail on any change. Add a SwiftShader pixel gate with the strong tie oracle and the door-coverage mask (this round's `pixel-probe.mjs`). Record the door control's patch. |
| SF-2 | **The new tests cannot fail on the new risk surface.** The drawn-triangle oracle compares positions only. The wall tests check counts, the unit geometry in isolation and the shader text, never the instance buffers. Those buffers are exactly what `aaa77e4` rewrote ("straight into typed buffers"). | **Mutation (each survives the whole suite of 366 tests and `tools/check.mjs`):** B12 batch UVs swapped; B13 baked normals not rotated; B14 exact-copy UVs dropped (all zero); B8 batch geometry never disposed (GPU leak per removed design); W6 every panel 1 m wide; W7 every panel at one transform; W2 no shadow-depth material; W3 depth material unpatched; W4 bounds a quarter of the widest panel. | Compare normals, UVs and `grossUV` in `prefab-display-batches.test.mjs`. For walls, emulate the vertex stage per instance: `instanceMatrix × (unit position × wallWidth)` against `BoxGeometry(width)` placed by `matrix.compose`, for every panel of the w5b map. Assert dispose events for batch geometry. |
| SF-3 | **The provenance gate is weaker than what it replaced, and the record now misstates its commit.** | **Measured** (`provenance.json`). The fixture equals the reviewed renderer's output (96/96; a forged entry gives 95/96), and the catalogue content pin equals `ee7c18e`'s. But: (a) The fixture's own hash is pinned nowhere, and its `recordedFrom` block is self-declared. A geometry change, followed by refreshing the renderer hash line, the fixture and the registry but not `build:buildings`, passes every gate with stale exports (**G9**). So does a material change with the hash line and the registry refreshed (**G5c**). (b) The door swing and the view rules are outside both the digest and the exports: **G8** (door swing changed, `build:buildings` and registry refreshed) and **G7c** (cutaway rule changed, same refresh) pass the whole suite and the check. The old byte pin of `three.js` caught each of these. (c) The digest's own test checks bytes, order and names, but not matrices or user data (**D2, D3** survive with a refreshed fixture). (d) `ORIGINAL_BUILDING_SOURCE` (`packages/prefab-core/original-catalogue.js`) names commit `ee7c18e` but records `three.js` 4b01be… and the catalogue as dff6f1…. At `ee7c18e` those files hash a6a718… and ac106f…. | Pin the fixture's sha256 (d4b70f…) in `fixedFiles`. Extend the digest to material parameters, the visibility vector of every view and the open-door transforms (`gen-differential.mjs`'s strong digest shows each is detectable: its controls see a glass-opacity and a view-rule change that the shipped digest misses). Record the renderer separately, e.g. `renderer: {commit, sha256, reviewedOutputOf: 'ee7c18e'}`, so that no hash is filed under a commit that does not contain it. |
| SF-4 | **The public facade (the path games use) renders exactly as before, and its sharing changes what a host can do.** | **Measured** (`facade-probe.json`): 32 copies draw 1,472 meshes per pass in both trees. Geometries 1,472 → 46 and materials 288 → 9 (so the answer's ×54 build-time claim holds). New behaviour: tinting one instance's material recolours all copies, and a host's usual cleanup (`traverse → geometry.dispose()`) of one removed instance disposes the geometry of every other copy. Neither was true on `main`. Only `docs/distribution.md` mentions it ("treat those as read-only"). | Reuse `batchOriginal` in the facade, so games get the draw reduction too. Make sharing safe or explicit: an opt-in `shared: true`, or freeze/guard shared resources, plus a changelog line and a minor version bump. |
| SF-5 | **The goal is not met for repeated copies or roofs.** | **Measured:** w1 (32 copies), assets only: ×1.99 overview, ×1.89 close, **×1.63 cutaway**. Whole frame: ×1.29–1.68. w6 (144 roofs): ×0.98–1.03, 1,985 → 1,985 calls. Massive structures are mostly repetition (bays, towers, wall modules), so w1 is the representative case, not the edge case. | Instance repeated templates per material run (round 1's prototype changed 365 pixels; explain them with the strong oracle before accepting). Merge roof groups across roofs that share materials. |
| SF-6 | **"Assets' own share" overstates its precision.** The answer subtracts the blank map's median frame. For walls the candidate's share is below the blank map's own spread. | **Measured:** w5b cutaway, my 4 runs: the candidate's asset time is 0.21 ms (−0.01 to 0.54 across runs), so the per-run ratio ranges −99 to 169. The record prints ×16.5. Measured directly (assets only): w5b ×23.5 (16.9–30.0) overview, **×7.2** cutaway, against the record's ×36 and ×16.5. w4 overview: ×6.0 directly, against ×7.8. | Report the direct measurement or a lower bound. Label the subtraction an estimate, with a per-run range. |

## NIT

- **N1.** The commit subject of `f2a6392` says "assets render 2-36x faster in the editor". Repeated copies are ×1.3–1.7 (whole frame) and roofs ×1.0. The record itself is honest about both.
- **N2.** `unitWallGeometry(widest)` tightens bounds below 1 m only when every panel of a material is a cut panel: `wallPanels` never exceeds `WALL_KIT.panel` = 1. Harmless, but the comment "so culling never drops a long panel" describes a case that cannot occur.
- **N3.** The `0 +` kept in `quad`'s flip test (`packages/building-catalog/three.js:45`) is unnecessary: only the sign is read, and `-0 < 0` is false (G3 is an equivalent mutant). `Math.hypot` in `emit` is not load-bearing for the 96 shipped outputs either (G4 survives the digest test). Keep both, but the comments overstate their necessity.
- **N4.** The integration captures that differ (Gross preview 3 px, mobile library 2 px, max delta 10) are attributed to "Gross wall seams" without a tie mask. Not verified here.
- **N5.** Culling is coarser. A merged batch, or one instance set per material, is culled as a whole, so close views draw more triangles than before even with far fewer calls. Measured: w2 close 1,263,800 → 1,278,182 triangles (+1.1 %); w5b close 1,416,518 → 1,488,338 (+5.1 %). This is cheap on desktop, but it matters for close views of very large structures, most of which lie off screen. Consider spatial sub-batches (per floor or per 16 m cell) when instancing lands.
- **N6.** Two evidence-hygiene traps for the next round. The fuzz's first view-rule control was vacuous (a one-storey design has no stairs); it was fixed and re-run (`gen-differential-controls.json`). And the lamp probe is not repeatable unless motion is reduced (`pixels-lights.json`, superseded by `pixels-lights-still.json`).

## Claims re-checked

| # | Claim | Verdict | Numbers (this round) |
| --- | --- | --- | --- |
| 1 | Generator byte-identical and about 3× faster | **Holds** | 96/96 fixture digests equal the reviewed renderer's output (re-derived from `ee7c18e`'s blob). Fuzz: 20,000 random calls in 800 sessions (14.6 M triangles) and 240 random recipes (9.46 M triangles) are bit-identical under a stronger digest; the 1-ulp control is detected. Node, 8 paired runs: game 2,592 → 798 ms (**×3.25**; A 2,529–2,740, B 679–922), authoring 4,802 → 1,431 ms (**×3.35**). Max per design 161 → 54 ms. |
| 2 | Provenance gate pins reviewed geometry and catalogue content | **Partly** | Both pins verified against Git objects. Weaker than the byte pin: the door pose, view rules and export freshness are unprotected, the fixture is self-certified, and the registry record is inconsistent (SF-3). Mutants G5c, G7c, G8, G9, D2 and D3 survive the whole suite and the check. G5, G6, G9b and V2 are killed. |
| 3 | Display batching: one draw per material per original view, ≤ 2 for Gross, doors baked, glass separate, arrays released; drawn = visible triangles | **Holds for counts and positions; the oracle is narrow** | Counts reproduce exactly: w2 4,480 → 1,877, w4 8,657 → 1,941, w7 6,542 → 1,940. GPU geometries for w2: 1,755 → 442. Run-structure mutants B1, B3, B5, B6, B7, B9, B10 and P1 are killed. UV, normal and dispose mutants B8, B12, B13 and B14 survive (SF-2). |
| 4 | Pixels: 21/27 identical; 3 at depth ties; 3 cutaways one level in 3–8 px, from baked doors | **Holds** | Re-captured: w2 close 7 px (max 14), w5b overview 1,021 (max 63), w5b cutaway 76 (max 53). **All pass the strong oracle**, so each is exactly the other arm's alternative resolution. Ties are 0.01–0.82 % of a frame, so chance agreement is negligible. w1, w3 and w7 cutaways: 8, 3 and 3 px, max delta 1, not ties, and **all on door-leaf coverage** (0.36–0.88 % of the frame). w2 overview, w4 overview and cutaway, w7 close: 0 px. **Higher floors, new this round** (`pixels-levels.json`): w2 cutaways at levels 1 and 2 and w4 at level 1 are 0 px (calls 3,341 → 1,512, 3,481 → 1,512 and 4,671 → 2,033). One level in under ten pixels is an acceptable price, provided a gate pins it (SF-1). The claim does not cover lamps (MF-A). |
| 5 | Walls: one instance set per material, width in the shader, matching depth material, dim clone keeps the patch, widest bounds; bit-identical to `BoxGeometry(width)` | **Fails for point lights; holds otherwise** | w5b 5,916 → 1,127 calls. Pixels identical except ties in the benchmark set, and in p2 (sun only, 0 px). **Dimmed walls** (cutaway above the ground floor, so the `dim()` clone compiles): w5b level 2 has 347 px, all strong-oracle ties; w5a level 3 has 0 px. Point lights: 13,112 px (MF-A). Rebuild per edit (answer's script, 2 × 40 samples): w5a 20.5–20.9 → 9.7–10.0 ms (×2.1), w5b 29.4–29.8 → 8.6–9.1 ms (×3.3–3.5). Edit plus next frame: w5a 32.7 → 19.7 ms (×1.66), w5b 149.4 → 17.9 ms (**×8.3**). |
| 6 | Facade: one template per original design, independent views, released with the last instance; Gross unchanged | **Holds as stated**; render cost unchanged | Geometries 1,472 → 46; views independent; F1–F5 killed. Draws per pass 1,472 → 1,472. Shared-material side effects (SF-4). |
| 7 | Instrument: nine workloads, A B B A in one Edge, null control, per-pass counts, served digests; whole-frame count in `review:integration` | **Holds as an instrument; not a gate** | Reproduced within the answer's ranges. Served digests: A 44fa64…, the same as the answer's baseline; B 1f9539…. No gate (SF-1). |
| 8 | ≥ 2× for assets, per workload, view and class | **Partly** | Below, by class. |

**Claim 8 by asset class** (measured, RTX 3080; whole frame: answer's tool, 4 runs; assets only: direct probe, 2 runs).

| Workload | Calls, overview | Whole: overview / close / cutaway | Assets only: overview / close / cutaway | ≥ 2× for assets? |
| --- | --- | --- | --- | --- |
| w0 blank (control) | 1,121 → 1,121 | ×0.99 / 1.05 / 1.02 | ×0.97 / 1.00 / 1.04 | — |
| w1 32 copies of one design | 4,155 → 1,919 | ×1.67 / 1.57 / 1.29 | ×1.99 / 1.89 / **1.63** | **No** (borderline at best) |
| w2 32 distinct originals | 4,480 → 1,877 | ×2.10 / 2.34 / 1.92 | ×2.59 / 2.91 / 2.49 | Yes |
| w4 32 Gross houses | 8,657 → 1,941 | ×3.76 / 4.00 / 2.14 | ×6.00 / 4.49 / 2.73 | Yes |
| w5b 2,400 free-angle runs | 5,916 → 1,127 | ×5.88 / 3.11 / 1.87 | ×23.5 / 6.61 / 7.17 | Yes |
| w6 144 roofs | 1,985 → 1,985 | ×0.98 / 1.03 / 0.98 | — | **No** (not addressed) |
| w7 13 Gross + 19 largest | 6,542 → 1,940 | ×2.89 / 2.91 / 1.98 | ×3.98 / 3.65 / 3.02 | Yes |

Opening a workload (blank first, then the map; 4 runs × 3 opens): w2 3,153 → 2,139 ms (×1.49, 1.37–1.62), w7 3,252 → 2,149 ms (×1.54), w4 ×1.19, w1 ×1.06 (noise; blank ×0.95, 0.83–1.14).

**Judgment.** "Render assets twice as fast" is met in the editor for distinct original buildings, Gross houses and free-angle walls, and for mixed districts of them, in every view. It is not met for repeated copies of one design, for roofs, or for any asset drawn through the public facade. The Tinderbox landmarks, the "massive structures" that prompted the goal, still do not render through Nautilus at all (MF3), so this answer cannot speed them up.

## Mutation results (`mutation-results.json`, `mutation-confirm.json`)

**52 mutants** of the answer's code, in two phases.
- **Phase 1** ran 50 mutants against their module's test files, plus `tools/check.mjs` for renderer and provenance mutants.
- **Phase 2** re-ran 14 phase-1 survivors and 2 new compound mutants (G5c, G7c) against the **whole suite (366 tests) and `tools/check.mjs`**.

Rules: the harness refused a dirty tree; every needle occurred exactly once; every touched file was restored in a `finally` and its hash verified; `git status` was clean after every mutant; HEAD stayed `f2a6392`. "Refreshed" means the follow-up a developer would run: the renderer hash line (as `build:buildings` writes it), the fixture re-recorded with the changed tree (`recordedFrom` left as is), the registry `--write`, and, where noted, `build:buildings`.

**Result: 30 killed, 22 survived.** 16 survivors were confirmed against the whole suite and the check. The other 6 are equivalent or expected.

| Group | Killed | Survived |
| --- | --- | --- |
| Batching (B1–B14, P1) | B1 class order ignored · B3 C2 ascending · B5 runs never merge · B6 a hidden piece keeps the run · B7 no release · B9 glass merged · B10 glass always visible · P1 view not forwarded | **B8** batch geometry never disposed* · **B12** UVs swapped* · **B13** baked normals not rotated* · **B14** exact-copy UVs all zero* · **B4** Gross classes swapped (by code-reading, one more run in the level-0 cutaway, within the ≤ 2 bound)* · B11 identity transforms baked (positions unchanged; −0 and normals unchecked) · B2 class order reversed (equivalent: a reversed order keeps every view contiguous) |
| Walls (W1–W10) | W1 no width in shader† · W5 `wallScaleU` inverted · W8 geometry not disposed · W9 no program key · W10 UV unscaled† | **W2** no shadow-depth material* · **W3** depth material unpatched* · **W4** bounds ¼* · **W6** every panel 1 m wide* · **W7** every panel at one transform* |
| Facade (F1–F5) | F1 never release · F2 no refcount · F3 inherits the current view · F4 stale template kept · F5 views shared | — |
| Generator (G1–G10, G5c, G7c) | G1 open batches survive a channel change · G2 normals not grown · G5 glass opacity + `build:buildings` (content pin) · G5b opacity, hash only (registry mismatch) · G6 roughness + `build:buildings` · G7 cutaway rule + `build:buildings` (registry mismatch) · G8b door swing, registry not refreshed · G9b stairs + `build:buildings` (content pin) · G10 stairs, raw | **G8** door swing, exports and registry refreshed* · **G7c** cutaway shows trim, exports and registry refreshed* · **G5c** glass opacity, hash and registry refreshed, exports stale* · **G9** stairs 14 → 13 steps, hash, fixture and registry refreshed, exports stale* · G3 `0 +` removed (equivalent) · G4 `sqrt` for `hypot` (identical on all 96 outputs) |
| Digest (D1–D4) | D1 ignores attribute bytes · D4 sorts lines (both caught by the digest's own controls) | **D2** ignores transforms* · **D3** ignores user data* (fixture refreshed) |
| Provenance pin (V1–V3) | V2 catalogue content edited | V1 the check skips the geometry pin (redundant with the digest test) · V3 content pin disabled + content edited: survives, showing that pin is the **only** guard of the catalogue content (load-bearing, as intended) |

\* confirmed against the whole suite and `tools/check.mjs`. † killed only by matching the shader's source text.

What the survivors say:
- **The batching oracle sees positions only** (B12–B14). Batch disposal is untested (B8).
- **The wall tests never look at an instance**: not its width, transform, shadow material or bounds (W2–W4, W6, W7). That is how MF-A got through.
- **With a refresh, the provenance gate passes changes the old byte pin rejected**: the door pose (G8), view rules (G7c), and materials or geometry with stale exports (G5c, G9). The digest's controls do not cover transforms or user data (D2, D3).

## Gates on `f2a6392` (`gates.json`, logs in `gates/`)

Run one after another on the clean tree (status clean before and after), 03:05–03:07:

| Gate | Exit | Time | Result |
| --- | --- | --- | --- |
| `npm run build` | 0 | 13.1 s | — |
| `npm run check -- --tracked` | 0 | 4.9 s | — |
| `npm test` | 0 | 47.6 s | 366 / 366 pass, 0 cancelled |
| `npm run test:upstream` | 0 | 3.6 s | 32 / 32 |
| `npm run test:package` | 0 | 6.3 s | — |
| `npm run check:buildings` | 0 | 0.9 s | — |
| `npm run review:integration` | 0 | 48.9 s | `drawCalls: {frame: 1143, shadowPass: 636}`, as the answer recorded |

All gates pass. None of them would fail on MF-A, on a draw-count regression within the tests' bounds, or on any mutant listed as surviving above.

## Not verified

- Hardware other than one RTX 3080 and SwiftShader: no phone, no integrated GPU, no other driver. Frame-time ratios on a GPU-bound phone may differ substantially.
- w3 and w5a were not re-timed. w3's cutaway and w5a's level-3 cutaway were re-captured as pixels; their other views rely on the answer's data.
- Pixels of cutaways above level 2, and of every original design at every floor, were not captured. The structural tests cover all designs and floors for positions only (SF-2).
- The door control build was not rebuilt: its patch is not in the evidence. The attribution was checked instead with a door-coverage mask, which independently places all 14 one-level pixels (and p4's 2) on door leaves.
- The integration-capture differences (N4) were not tie-checked.
- Whether any consumer (AFT, Farmyard, Tinderbox) mutates or disposes facade materials or geometry: their repositories were not read this round.
- Memory beyond counts: the evidence has GPU geometry counts (w2: 1,755 → 442), not heap or VRAM bytes.
- Undo, redo, save and export with batched templates beyond what the gates exercise.
- Phase-2 confirmation (whole suite plus `tools/check.mjs`) covered 16 survivors. The 6 equivalent or expected survivors (B2, B11, G3, G4, V1, V3) and all phase-1 kills were run only against their module's test files and, where noted, the check.

## Carried engine items (not scored)

- **MF1** (open): the editor export still passes silently through AFT and Farmyard, which drop buildings, roofs and wall runs.
- **MF2** (open): pins name unreleased commits. This answer leaves `ee7c18e` as the declared commit of a renderer that no longer has its bytes; see SF-3 (d).
- **MF3** (open): no asset standard, registration or authoring path. The landmarks cannot enter the editor, so the speed work cannot reach them.

## Evidence index (`artifacts/r08-2/`, copied to [`evidence/hostile-review-0.8-round-2/reviewer/`](evidence/hostile-review-0.8-round-2/reviewer/))

The repository copy keeps every script, log and result under 400 KB. Page scripts are stored as `.js.txt`, because `docs/` holds no `.js` (the build copies it into `dist/`); restore the extension to run them. Not copied: `bench-editor-gpu.json` (2.1 MB) and `assets-only-gpu.json` (1.2 MB), whose summaries are in `analysis-gpu.json` and the logs; the PNG folders; `maps/` (regenerate with `probe-maps.mjs`); and `gen-diff/` (the two generator versions, from Git objects).

| File | What |
| --- | --- |
| `bench-editor-gpu.json`, `.log`, `analysis-gpu.json`, `analyze-gpu.mjs` | Answer's instrument, editor mode, RTX 3080, 4 runs, 7 workloads; per-run ratios and the subtraction's spread |
| `bench-node.json`, `.log` | Answer's instrument, Node mode, 8 runs, digests 48/48 per LOD |
| `assets-only.mjs`, `assets-only-page.js`, `assets-only-gpu.json`, `.log` | Direct assets-only frame timing, 2 runs |
| `wall-rebuild-r2-run1.json`, `wall-rebuild-r2-run2.json`, `wall-edit.mjs`, `wall-edit.json` | Wall rebuild per edit; edit plus next frame |
| `pixel-probe.mjs`, `pixel-probe-page.js`, `cases-*.json`, `pixels-oracle.json` (+ `-png/`), `pixels-levels.json`, `pixels-lights-still.json` (+ `-png/`), `pixels-lights.json` (flickering, superseded) | SwiftShader captures, strong oracle, door mask, higher-floor cutaways, point-light probe |
| `probe-maps.mjs`, `maps/` | p1–p4 probe maps |
| `gen-differential.mjs`, `gen-differential.json`, `gen-differential-controls.json`, `gen-diff/` | Generator fuzz and controls |
| `provenance.mjs`, `provenance.json` | Pins re-derived from Git objects |
| `facade-probe.mjs`, `facade-probe.json` | Facade draws, sharing and host-visible behaviour |
| `mutate.mjs`, `regen-fixture.mjs`, `mutation-*.json`, `mutation*.log` | Mutation harness and results |
| `gates.mjs`, `gates.json`, `gates/` | Gate logs |
| `mask.mjs` | Masks local paths and the account name in this folder's text evidence |

## The answer to round 2, measured

Evidence paths below (`answer/…`, `reviewer/…`) are relative to [`evidence/hostile-review-0.8-round-2/`](evidence/hostile-review-0.8-round-2/).

Round 2 scored the answer 6/10. It found one must-fix (MF-A, point-light shadows of cut wall panels), six should-fixes and five nits. The answer is on the same branch, after `f2a6392`, with main 0.10.0 (`fb35277`) merged in:

| Commit | Answers | Change |
| --- | --- | --- |
| `23aa59f` | MF-A, SF-2 | Wall instances get a width-patched distance material (point lights) beside the depth material; tests for both materials, every panel's matrix, width and box, the batch oracle's normals and UVs, and dispose-once |
| `c59466a` | SF-2 (W4) | Each wall instance's own bounding sphere is checked, not the loose union |
| `afdf80d` | SF-3 | The reviewed-output pin covers material settings, every view's visibility and the open-door pose; the fixture's own hash is pinned; exports must match the current renderer |
| `23ab5d8` | (main) | Main 0.10.0 merged through the review record |
| `17d2d00` | SF-4 | The public facade gives independent models again by default; `shared: true` opts into display batches. The batching module moves to `packages/prefab-core` so the renderer package ships it; an installed-tarball proof runs it |
| `1cd55da` | SF-5 (copies) | A design placed more than once draws each batch mesh as one `InstancedMesh` |
| `7212242` | SF-5 (roofs) | Roofs merge into one mesh, one draw per slot material; `createRoofMaterial` in `./roofs/three` |
| `4b85d8e` | SF-1 | Exact draw counts per workload and view, pinned in `npm test` and equal to the browser's |
| `ae00916` | SF-6, SF-1 | `--assets-only` (direct, refusing an inexact isolation) and `--expect` in the benchmark |
| `e21caf6` | N2, N3, N5 | Comments that overstated; instancing and culling documented; changelog |
| `59e7b4e` | SF-6 | The close view compared with the blank map at the same camera (the isolation check caught the mismatch) |
| `bd27cb5` | SF-5 (beyond) | Double-sided glass as two fixed-side copies: the same halves without re-deriving shader programs |
| `b945858` | SF-1 | `--expect` counts the asset layers with culling off, as the headless count does |
| `f74332d`, `1101b56`, `cf2760a` | (record) | This record's first half and evidence; docs; the answer's evidence |

**Rig and method.**
- One machine: Windows 11, Ryzen 7 5800X (16 threads), RTX 3080 (ANGLE D3D11) for timing, SwiftShader for pixels; headless Edge, viewport 1600 × 1100.
- The formal run (`answer/formal-r2/`, `formal2.sh`) was on `cf2760a`, a clean tree whose rendering code equals `bd27cb5`'s, against main 0.10.0 `fb35277` (`git archive`, `dist` built).
- The nightly 04:00 job had nothing to sweep tonight (no change since 10-29), so the box was quiet: CPU load 0–12 % just before the run, and nothing else of mine ran during it.
- Both trees run as two pages of one browser, with A B B A blocks per map and view. The blank map runs identical code in both arms; its ratio is the noise floor.
- Pilots and pixel checks against intermediate commits are labelled with their commits.

### Against the goal: main 0.10 → this answer (RTX 3080, 6 paired runs, 30 frames × 4 blocks per view)

**Assets only, measured directly.** Every mesh outside the asset layers is hidden while the frame renders, and the isolation passed its exactness check in every run, map, view and arm. The frame still contains the fixed passes (about 0.5 ms here), so these ratios are a **lower bound**:

| Workload | Overview | Close | Cutaway |
| --- | --- | --- | --- |
| Blank map (null control) | 0.50 → 0.50 ms, ×1.00 (1.00–1.06) | ×1.00 (1.00–1.11) | ×1.06 (0.89–1.19) |
| 32 copies of the largest design | 8.64 → 2.31 ms, **×3.78** (3.29–4.13) | 3.69 → 1.88, **×1.96** (1.62–2.14) | 2.34 → 0.70, **×3.26** (3.07–3.57) |
| 32 distinct originals, most meshes | 13.66 → 3.25, **×4.12** (3.53–4.97) | 5.84 → 1.83, **×3.20** (2.91–3.40) | 5.49 → 1.78, **×3.06** (2.79–3.33) |
| 32 distinct originals, most triangles | 13.44 → 3.26, **×3.88** (3.72–4.75) | 5.80 → 1.85, **×3.07** (2.43–3.67) | 5.36 → 1.74, **×3.02** (2.62–3.37) |
| 32 Gross houses | 18.89 → 2.56, **×7.32** (6.52–8.15) | 10.00 → 2.70, **×3.72** (3.23–4.52) | 9.29 → 2.52, **×3.77** (3.34–3.97) |
| 200 axis-aligned wall runs | 0.90 → 0.87, ×1.00 (0.89–1.25) | ×1.00 (1.00–1.11) | ×1.05 (1.00–1.20) |
| 2,400 free-angle wall runs | 20.81 → 1.17, **×17.8** (15.8–29.0) | 5.50 → 0.91, **×6.04** (5.50–7.03) | 2.73 → 0.54, **×5.07** (4.65–5.40) |
| 144 sloped roofs | 3.24 → 0.66, **×5.10** (4.50–6.29) | 1.32 → 0.70, **×1.93** (1.86–2.00) | nothing drawn (roofs above level 0) |
| 13 Gross + 19 largest originals | 21.09 → 4.14, **×4.97** (4.65–5.44) | 7.70 → 1.98, **×3.89** (3.60–4.49) | 9.21 → 3.17, **×2.85** (2.75–3.00) |

The goal, twice as fast for the assets, holds as a lower bound in 18 of the 20 views where this work changes what is drawn (seven workloads; the roofs draw nothing in the level-0 cutaway). The other two are close views, w1 at ×1.96 and the roofs at ×1.93. Subtracting the same run's all-hidden frame (an estimate: the fixed passes are small, so ranges widen) gives ×2.29 (1.75–2.56) and ×4.12 (3.60–4.57) for those two, and at least ×2.29 in all 20. The axis-aligned walls had nothing to gain: on main they already drew three instance sets, and they still do.

**Whole frames** include the inherited scene, a fixed 1,121 calls and about 4 ms at the overview:

| Workload | Overview | Close | Cutaway |
| --- | --- | --- | --- |
| Blank map (null control) | 4.12 → 4.02 ms, ×1.03 (0.97–1.11) | ×1.03 (0.97–1.10) | ×1.01 (0.91–1.05) |
| 32 copies of the largest design | 12.61 → 5.16, ×2.46 (2.02–2.57) | 5.34 → 3.36, ×1.59 (1.45–1.71) | 5.67 → 4.21, ×1.35 (1.24–1.51) |
| 32 distinct, most meshes | 18.64 → 6.94, ×2.72 (2.20–3.08) | 8.11 → 3.49, ×2.31 (2.00–2.40) | 10.21 → 5.35, ×1.91 (1.63–2.28) |
| 32 distinct, most triangles | 18.14 → 7.14, ×2.58 (2.26–2.75) | 8.15 → 3.25, ×2.53 (2.31–2.65) | 9.86 → 5.35, ×1.83 (1.65–1.96) |
| 32 Gross houses | 23.87 → 5.55, ×4.20 (3.74–4.79) | 12.34 → 3.85, ×3.18 (2.96–3.50) | 14.30 → 5.88, ×2.36 (2.17–2.53) |
| 200 axis-aligned wall runs | 4.20 → 4.30, ×0.98 (0.87–1.03) | ×1.00 (0.97–1.07) | ×1.00 (0.94–1.05) |
| 2,400 free-angle wall runs | 25.11 → 4.30, ×5.84 (5.69–6.29) | 7.71 → 2.92, ×2.62 (2.43–2.81) | 6.81 → 4.24, ×1.61 (1.48–2.01) |
| 144 sloped roofs | 7.64 → 4.32, ×1.77 (1.48–1.80) | 3.09 → 2.63, ×1.21 (1.06–1.29) | ×0.97 (0.88–1.08) |
| 13 Gross + 19 largest | 26.34 → 8.06, ×3.17 (2.83–3.63) | 10.08 → 3.50, ×2.80 (2.60–3.32) | 14.30 → 6.84, ×1.99 (1.91–2.43) |

**What is drawn.** With culling off, the asset layers' draws (main + shadow) fall while the triangles stay identical, workload by workload. `--expect` found the candidate's counts equal to the pinned fixture in all 108 checks:

| Workload | Main 0.10 | This | Triangles (both) |
| --- | --- | --- | --- |
| 32 copies of the largest design | 1,568 + 1,472 | 200 + 104 | 2,766,336 |
| 32 distinct, most meshes | 1,729 + 1,655 | 416 + 342 | 1,224,996 |
| 32 distinct, most triangles | 1,696 + 1,622 | 408 + 334 | 1,247,106 |
| 32 Gross houses | 3,799 + 3,799 | 168 + 168 | 830,576 |
| 200 axis-aligned wall runs | 3 + 3 | 3 + 3 | 921,600 |
| 2,400 free-angle wall runs | 2,402 + 2,402 | 3 + 3 | 623,448 |
| 144 sloped roofs | 432 + 432 | 5 + 5 | 4,992 |
| 13 Gross + 19 largest | 2,743 + 2,692 | 435 + 384 | 1,216,554 |

Opening a district is ×1.4–1.5 faster for 32 distinct or mixed originals, and ×1.0–1.1 otherwise. The blank map's ratio is ×1.00 (0.89–1.13). The full tables, including whole-frame draw calls and the subtraction estimate with its ranges, are in `answer/formal-r2/tables-gpu.md`.

**Pixels against main 0.10** (SwiftShader, the formal run, `answer/formal-r2/`). Each capture is repeat-identical. Classes as for instancing below (`pixel-classes-vs-main.txt`):

| Workload | Overview | Close | Cutaway |
| --- | --- | --- | --- |
| Blank map, axis walls, roofs | 0 | 0 | 0 |
| 32 copies of the largest design | 20 px (max 34): 2 ties, 10 edges, 1 shading, 7 texel | 128 (max 76): 44 ties, 73 edges, 9 shading, 2 texel | 11 (max 7): 6 edges, 1 shading, 4 texel |
| 32 distinct, most meshes | 0 | 7, all ties | 0 |
| 32 distinct, most triangles | 0 | 0 | 3 (max 1), door-leaf edges |
| 32 Gross houses | 30 (max 110): 16 ties, 9 edges, 2 shading, 3 texel | 215 (max 119): 21 ties, 53 edges, 141 shading | 54 (max 131): 47 ties, 7 edges |
| 2,400 free-angle walls | 1,021, all ties | 0 | 76, all ties |
| 13 Gross + 19 largest | 0 | 0 | 3 (max 1), door-leaf edges |

So 16 of 27 views are byte-identical, 3 differ only at depth ties, and 2 cutaways differ by one level at door leaves (round 1's baked doors; its control build proved the cause). The 6 views of the two repeated-design maps carry instancing's rounding, classified above. Round 1 had 21 identical views. The 5 fewer are the instancing views, plus w1's cutaway, which moves from a door-leaf difference to an instancing one.

**The generator** (Node, 8 runs, all 48 originals): game LOD 2,084 → 655 ms, ×3.18 (2,025–2,186 → 568–703); authoring LOD 3,758 → 1,099 ms, ×3.42. All 48 designs are identical in both LODs.

### MF-A: point-light shadows

Point lights draw shadow casters with the renderer's distance material, which knew nothing of `wallWidth`, so every cut panel cast a full 1 m box. Since `23aa59f`, `wallShadowMaterials()` gives every wall instance set a width-patched depth material (sun, spot lights) and distance material (point lights), and the tests require both, patched, on every instance set. Re-measured with round 2's own probe, maps and strong oracle (`pixel-probe.mjs`, `cases-lights.json`, reduced motion), SwiftShader, main 0.10 against the candidate (`answer/pixels-lights-still.json`):

| Case | Round 2 (`f2a6392`) | Now |
| --- | --- | --- |
| p1: free-angle cut walls by a campfire and torches, close | 13,112 px (max 67) | **0** |
| p1, close cutaway | 14,694 px (max 74) | **0** |
| p1, overview | 150 px, 9 ties | 9 px, all 9 strong-oracle ties |
| p2: the same walls, no lamps (control) | 0 | 0 |
| p3: lamps by integer-length runs (control) | 0 | 0 |
| p4: building by a campfire, close | 0 | 0 |
| p4, close cutaway (doors) | 2 px, max 1, on door leaves | 2 px, max 1 (the same door-leaf pixels) |
| w0 blank (null control) | 0 | 0 |

### SF-1: the counts are a gate

`tools/asset-draw-counts.mjs` builds the editor's asset layers headless for every benchmark workload: placed prefabs and their instances, the wall group, and the roof layer with its merge. It counts the draws the renderer issues in the editor's two whole-map views, all levels and the level-0 cutaway. A material array draws each visible group. Any other mesh draws once, whatever its instance count. A transparent double-sided material draws twice in the main pass. Casters follow the daylight rig's own rule, and the tool refuses to count if the pinned rig stops stating it. `tests/asset-draw-counts.test.mjs` pins every count; any change fails until it is re-pinned in a reviewed change.

The headless count is the browser's count. The first cross-check was frame minus the blank map, on SwiftShader (instancing commit `1cd55da`):

| Workload | View | Main draws | Shadow draws | Triangles | Headless = browser |
| --- | --- | --- | --- | --- | --- |
| w1 32 × largest | overview | 200 | 104 | 2,766,336 | yes |
| w1 | cutaway | 7 | 7 | 397,568 | yes |
| w4 32 Gross | overview | 168 | 168 | 830,576 | yes |
| w4 | cutaway | 149 | 149 | 381,110 | yes |
| w7 mixed | overview | 435 | 384 | 1,216,554 | yes |
| w7 | cutaway | 271 | 271 | 315,738 | yes |
| w6 144 roofs | overview | 5 | 5 | — | yes (calls: 1,131 − 1,121 = 10) |

Two rules came out of that cross-check. They are now in the tool. Walls had shown no shadow draws, because the daylight rig, not the layer, sets `castShadow` at run time. And w1 was 96 main draws short, because its glass is transparent and double-sided and draws twice.

Falsifiers, each failing the test: B4 (round 2's survivor, on w4); no prefab instancing (w1); roofs never merge (w6); walls stop casting (w5a); glass single-pass (w1).

The benchmark's `--expect` checks the browser against the same fixture. Its first version compared frame minus blank, and it refused w2, which the first cross-check had not covered. The browser drew 2 fewer main draws (272 triangles) than the count, at the overview, while the shadow draws matched. One small mesh at the overview's edge is culled in the main pass but stays inside the sun's wider shadow camera. The headless count ignores culling by definition. So since `b945858`, `--expect` turns frustum culling off on every asset mesh, counts one isolated frame, and compares that in each level state; the camera can no longer change the check. GPU, all nine workloads, against main 0.10: 18 of 18 equal; the formal run: 108 of 108. Pixels stay a review step, not a CI gate: the comparison needs Edge through a local Playwright plus SwiftShader, and the repository's CI has neither. The door control's patch is now in the evidence (`control-doors-unbaked.patch`).

### SF-2: the risk surface, re-mutated

Round 2 confirmed 16 survivors against the whole suite and `tools/check.mjs` (`mutation-confirm.json`). They were re-run on the answer with round 2's own harness (`answer/mutate-r2-rerun.mjs`), in a clean detached sandbox at `e21caf6`, with `--confirm` (whole suite plus the check). Three changes to the harness, all needed to fit the moved code: the batching module's path, and W2 and W3 re-expressed for `wallShadowMaterials()`. Two new mutants (W2b, W3b) drop or unpatch the new distance material.

| Round 2 survivor | What it did | Now (whole suite + check) |
| --- | --- | --- |
| B4 | Gross class order swapped (one more cutaway run) | killed: the count gate |
| B8 | batch geometry never disposed | killed (3 tests) |
| B12, B13, B14 | batch UVs swapped; baked normals not rotated; exact-copy UVs dropped | killed (2, 2, 1 tests) |
| W2, W3 | depth material dropped; unpatched | killed |
| W2b, W3b (new) | distance material dropped; unpatched | killed |
| W4 | bounds a quarter too small | killed |
| W6, W7 | every panel 1 m wide; every matrix in slot 0 | killed |
| G8 | door swing changed, exports and registry refreshed | killed (tests and check) |
| G5c | glass opacity changed, hash line and registry refreshed | killed (tests and check) |
| G7c | cutaway rule changed, exports and registry refreshed | killed (tests and check) |
| G9 | stairs changed, hash, fixture and registry refreshed, exports stale | killed (tests and check) |
| D2, D3 | digest ignores matrices; ignores user data (fixture refreshed) | killed (tests and check) |

18 of 18 killed (`answer/r2-survivors-rerun.json`); the sandbox was clean after every restore.

The fixes that kill them:
- the batch oracle compares normals and UVs, and dispose-once is checked (B8, B12–B14; `23aa59f`);
- every wall instance's matrix, width, box and own bounding sphere is checked, and both shadow materials must be patched (W2–W7; `23aa59f`, `c59466a`);
- the extended digest and the export check (G*, D*; `afdf80d`);
- the count gate (B4; `4b85d8e`).

### SF-3: the provenance pin

Round 2 found that the geometry pin no longer protected the door pose, the view rules, export freshness or the fixture's own provenance. It also found that the record paired `ee7c18e` with two hashes that do not exist at `ee7c18e`. Since `afdf80d`:

- `buildingDigest` covers each mesh's material settings, the visibility of every node in every view `setView` offers (roofs off, every floor's cutaway, every floor limit) and every door pivot with the doors open, and leaves the model as it found it. The fixture was re-recorded with the reviewed renderer (`a6a71831`, `ee7c18e`'s own file); the rewritten renderer matches all 96 outputs.
- `tools/prefab-original-catalog.mjs` pins the fixture's own sha256, so refreshing it is a deliberate edit.
- `tools/check-building-catalog.mjs` proves every exported mesh carries the current renderer's name and its position, normal and UV bytes. A geometry change with refreshed hashes but stale exports fails.
- The registry files `ee7c18e`'s own fingerprints under `reviewed` and this tree's hashes under `current`.

N3 below changed the generator's bytes, a comment only. `build:buildings` and the registry refresh then moved only the recorded input hash, and the 96 pinned digests still match: the pin follows the output, not the source text. Round 2's six provenance survivors are re-run with the others under SF-2.

### SF-4: the facade

Round 2 measured that the public facade drew exactly as before (32 copies, 1,472 meshes per pass) while its sharing changed what a host can do. Tinting one instance recoloured all copies, and a host's usual cleanup of one instance disposed every copy's geometry. Since `17d2d00` the default is an independent model again, and `shared: true` opts into display batches. Round 2's facade probe, re-run with draws counted per geometry group (`facade-probe-r2.mjs`):

| 32 copies of dockside-warehouse | main 0.10 | candidate, default | candidate, `shared: true` |
| --- | --- | --- | --- |
| Meshes per instance | 46 | 46 | 11 |
| Draws per pass | 1,472 | 1,472 | 352 (×4.2 fewer) |
| Unique geometries / materials | 1,472 / 288 | 1,472 / 288 | 11 / 9 |
| Tinting one instance recolours another | no | no | yes (documented: shared, read-only) |
| One instance's generic cleanup disposes another's geometry | no | no | yes (documented) |
| Views per instance | yes | yes | no: one view per design (documented) |

The batching module moved from `apps/editor` (in no runtime package) to `packages/prefab-core/display-batches.js`, and the editor path re-exports it. A new installed proof (`tests/fixtures/buildings/renderer-package-proof.mjs`, run by `npm run test:grenade-renderer`) loads the renderer root from the offline-installed tarball in shared mode. With `display-batches.js` deleted from the installed package, the proof fails with `ERR_MODULE_NOT_FOUND`, so it runs the tarball's copy. A facade host that draws many copies can instance the shared batch meshes itself, as the editor now does; the facade returns per-instance roots, so it does not.

### SF-5: repeated copies and roofs

**Instancing** (`1cd55da`). Each batch mesh of a design placed two or more times becomes one `InstancedMesh` on the template's geometry and materials. Instance *k*'s matrix is copy *k*'s root matrix times the node's place in its template, which equals the copy's own node matrix after float32 rounding (asserted). Views still follow the template, the copies keep their nodes hidden for bounds, and glass stays per copy so it still sorts. Draws, SwiftShader, overview / close / cutaway: w1 1,919 → 1,425 / 732 → 507 / 1,567 → 1,135; w4 1,941 → 1,457 / 785 → 676 / 1,874 → 1,419.

Instancing is not bit-identical, by construction. A copy's modelView matrix is computed once in float64 and rounded. An instance is transformed on the GPU as view(f32) × (instance(f32) × vertex). Every differing pixel was classified against the parent commit on SwiftShader (`edge-attribution.mjs`). The classes are: a depth tie (the capture's own mask); on an edge (a colour step above 24 levels to a neighbour, in either arm); shading (a delta of at most 2 levels); or neither. Edge pixels are 3–11 % of a frame, the null rate for chance.

| Map, view | Differing pixels (of 1.76 M) | Depth ties | On edges | Shading (≤ 2) | Neither | Edge pixels in the frame |
| --- | --- | --- | --- | --- | --- | --- |
| w1 (32 × largest), overview | 20 (max 34) | 2 | 10 | 1 | 7 | 6.8 % |
| w1, close | 128 (max 76) | 44 | 73 | 9 | 2 | 10.9 % |
| w1, cutaway | 17 (max 7) | 0 | 12 | 1 | 4 | 4.7 % |
| w4 (32 Gross), overview | 30 (max 110) | 16 | 9 | 2 | 3 | 3.3 % |
| w4, close | 215 (max 119) | 21 | 53 | 141 | 0 | 10.4 % |
| w4, cutaway | 54 (max 131) | 47 | 7 | 0 | 0 | 2.9 % |
| w0 blank, w7 (no repeated design): all six views | 0 | — | — | — | — | — |

The blank map and the mixed map, which has no repeated design, are byte-identical: 0 pixels in all six views. The 141 shading pixels of the Gross close-up differ by 1–2 levels. That is the instanced normal transform, which divides by the instance's axis lengths and multiplies by its basis before the normal matrix. The 16 "neither" pixels are isolated single pixels, 3–8 levels apart, on minified textures: a sub-texel UV shift. At most 215 of 1.76 million pixels differ (0.012 %).

**Roofs** (`7212242`). The layer builds every roof with five shared slot materials (`createRoofMaterial`). It then draws them as one mesh, one group per material, whose vertices are exact copies of each roof's own at the same map offset. Sorted by level, a level cut is one draw per material. w6 overview draws 1,985 → 1,131 calls (the roofs' share 864 → 10) and close 701 → 429. **Pixels: byte-identical** in all three views, against the parent commit on SwiftShader. Same vertices, same matrix, same materials: only the order of fragments could change, and no two roofs tie. The tests compare every drawn triangle (slot material, shadow flags, exact world position, normal, UV and colour) with a per-roof layer under five view options. A 17-mutant run was killed in full after two fixes to the harness and three to the tests (see the commit).

**What the pilots showed next** (RTX 3080, paired, 2 runs each; `answer/pilot-*.json`). Instancing, against clones (`17d2d00`), cut w1's overview asset draws from 799 to 305. Asset time moved only ×1.03 (overview) and ×0.94 (close), but ×2.02 in the cutaway. w4: ×1.20, ×0.94, ×1.34. The close views lose a little because an instance set is culled as a whole (w1 close draws 1.38 M → 2.72 M asset triangles). Grouping each design's copies in runs of 8 nearby copies along a Z-order curve was tried and dropped: ×0.98–1.02, and ×0.79 in w1's cutaway. What was left was glass. 288 of w1's 305 asset draws are glass: 96 per-copy panes, each drawn twice in the main pass and once for shadows. Each half costs far more than an ordinary draw, because three.js (`renderObject`) marks a transparent double-sided material changed before each half, so every half re-derives its program.

**Glass halves** (`bd27cb5`). Each double-sided glass copy becomes two fixed-side copies: back (no shadow), then front (casting the double-sided shadow). They have the same geometry, matrix, program variant and uniforms. At equal depth the transparent sort breaks the tie by id, and the back copy is created first, so the halves draw in the same order as before. The draw counts are unchanged: the pinned count test passes unedited. A new test pins the halves, and eight mutants of them are all killed.

| GPU pilot, against `59e7b4e` | Overview | Close | Cutaway |
| --- | --- | --- | --- |
| w1, assets only | ×1.71 (CPU 2.83 → 1.05 ms) | ×1.24 | ×0.97 (glass hidden) |
| w2, assets only | ×1.49 | ×1.16 | ×0.99 |
| w7, assets only | ×1.16 | ×1.11 | ×0.99 |
| w1 / w2 / w7, whole frame | ×1.24 / ×1.24 / ×1.11 | ×1.03 / ×1.10 / ×1.09 | ×1.01 / ×0.96 / ×0.94 (range 0.89–1.02) |

**Pixels: byte-identical** in all 15 views of w0, w1, w2, w3 and w7, against the parent commit on SwiftShader (`answer/glass-halves-swiftshader-vs-59e7b4e.json`). This is what the mechanism predicts: the same program variants, uniforms, vertices and order.

### SF-6: assets measured directly

Round 2 showed that the "assets' own share" (the frame minus the blank map's frame) is not precise: for walls the candidate's share sat below the blank map's own spread (w5b cutaway: per-run ratios −99 to 169, printed ×16.5). Measured directly, by hiding everything else while the frame renders, it was ×7.2.

There was a second fault, which round 2 did not report: round 1's close-view figures compared two cameras. A workload's close view centres on its first building, but the blank map has none, so its close view sits at (50, 50) (round 1's `tables.mjs`). **The close-view "assets' own share" figures in round 1's record are withdrawn.** The instrument found this itself, see below.

`--assets-only` (`ae00916`) ports round 2's direct method into the benchmark. While a frame renders, every mesh outside the asset layers is hidden. That covers the scene-level meshes round 2's probe could not see: the prefab instances and the merged roofs. Such a frame is the asset layers plus the frame's fixed passes, so its ratio is a **lower bound** on the assets' own speedup.

The instrument refuses an inexact isolation. For every run, map, view and arm, the isolated draws minus an all-hidden frame must equal the whole frame minus the blank map at the same camera, exactly, in calls, shadow calls and triangles. Its first smoke run refused the close views of w1 and w4 (candidate w1: 140 isolated draws against 88, and −3 shadow draws). That exposed the camera mismatch. Since `59e7b4e` the blank map is counted at each map's own close camera, and the run passes. With the instances left out of the asset set, it refuses again (288 against 304 draws, `answer/falsify-isolation.log`). A pinned count raised by one draw makes `--expect` refuse too.

Both figures, from the same formal run:

| Workload, view | Subtraction (estimate, per-run range) | Direct (lower bound) |
| --- | --- | --- |
| Free-angle walls, overview | ×111 (39.5 to 3.4 × 10⁸) | ×17.8 (15.8–29.0) |
| Free-angle walls, cutaway | ×6.55 (−128 to 15.3) | ×5.07 (4.65–5.40) |
| 32 copies, cutaway | ×5.47 (2.73 to 3.4 × 10⁷) | ×3.26 (3.07–3.57) |
| 144 roofs, overview | ×10.6 (3.38–66.5) | ×5.10 (4.50–6.29) |
| 32 Gross houses, overview | ×12.1 (8.82–14.6) | ×7.32 (6.52–8.15) |

The candidate's share is often a fraction of a millisecond, below the blank map's own run-to-run spread. The subtraction then divides by noise. The answer reports the direct measurement; the subtraction stays in the results only as a labelled estimate.

### Nits

- **N1.** Erratum for `f2a6392`'s subject, "assets render 2-36x faster in the editor". It overstated the result: at the time, repeated copies were ×1.3–1.7 (whole frame) and roofs ×1.0. The current figures are above.
- **N2.** `unitWallGeometry`'s comment now says what the bound does: panels are at most 1 m, so it only tightens the unit box, when every panel of a material is a cut panel.
- **N3.** The generator's comment now says that the flip test's `0 +` and `Math.hypot` in `emit` are kept for fidelity, not need. The building exports and registry were regenerated for the new file hash; the 96 pinned digests are unchanged.
- **N4.** Withdrawn as an attribution, and re-measured by pixel class. `review:integration` was run on main 0.10 (a detached worktree, `dist` built) and on the candidate, both on SwiftShader. The six captures, compared byte for byte (`answer/png-attribution.mjs`, no tie mask available):

| Capture | Differing pixels | On edges | Shading (≤ 2) | Neither |
| --- | --- | --- | --- | --- |
| editor-desktop | 5 of 1,152,000 (max 61) | 4 | 1 | 0 |
| editor-mobile-library | 2 of 329,160 (max 10) | 1 | 0 | 1 |
| gross-preview | 3 of 1,152,000 (max 10) | 3 | 0 | 0 |
| layout-preview | 2 of 1,152,000 (max 3) | 2 | 0 | 0 |
| original-interior, procedural-roofs | 0 | — | — | — |

Edge pixels are 6.8–15.4 % of these frames, and 10 of the 12 differing pixels are on edges. That fits draw-order and rounding changes at silhouettes, but without a tie mask it is a classification, not a proof. The roofs capture is byte-identical with merged roofs.
- **N5.** Culling is coarser and documented (`docs/building-prefabs.md`, `docs/sloped-roofs.md`). A batch, an instance set or the merged roofs is culled as a whole. Spatial sub-batches per floor block or map tile are the next step if close views of very large structures become triangle-bound.

### Gates

On `cf2760a` (`answer/formal-r2/summary.txt`): `build`, `check --tracked`, `test` (595 tests), `test:upstream`, `test:package`, `test:assets`, `test:grenade-renderer` (with the new installed building proof) and `review:integration` all exit 0. Then the benchmark: GPU `--assets-only --expect` (6 runs, no refusal, 108 of 108 counts equal), SwiftShader `--expect` (2 runs, no refusal), and `--node` (8 runs).

### Not done, or not verified

- **Phones and integrated GPUs** were not measured; only an RTX 3080 and SwiftShader were. w1's overview is now triangle-bound: 2.77 M triangles per frame, main plus shadow, unchanged from main. A GPU-bound device gains less from fewer draws. Distant copies would need a lighter representation (LOD or impostors), which this answer does not add.
- **Close views of repeated designs.** An instance set is culled as a whole, so w1's close view draws 2.72 M asset triangles where clones drew 1.38 M. It is still ×1.96 (lower bound) against main. Per-copy culling, on the CPU per pass or with `BatchedMesh`, is the next step. Grouping copies 8 at a time did not help.
- **The public facade's `shared: true`** batches a design but does not instance it; a host that draws many copies can instance the batch meshes itself.
- **Pixels are not a CI gate.** The comparison needs Edge through a local Playwright plus SwiftShader. The counts are gated in `npm test`; the SwiftShader comparison is the review step for any change to them.
- **N4** is classified, not tie-proven: the integration review has no tie mask.
- The cutaways' one-level door-leaf pixels (round 1) are unchanged. Doors are still baked.
- Memory and VRAM were not measured beyond geometry and draw counts.
- MF1–MF3 remain the architect's: the game exchange, the pins, and the asset standard for the landmarks.
