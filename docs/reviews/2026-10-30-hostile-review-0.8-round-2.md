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
