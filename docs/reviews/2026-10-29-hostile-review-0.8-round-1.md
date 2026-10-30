# Hostile review, round 1 (new series): Nautilus Engine at `f6caeef`

- **Reviewed commit:** main `f6caeef309e56423fea5e32eb717533f33b59cbb` (0.8.0 plus PRs #10, #11 and #13). Tag `v0.8.0` points at `8c46704` (the PR #10 merge); `8c46704..f6caeef` changes documentation only (measured: `git diff --name-only`, see `m3-m4.json`).
- **Date:** 2026-10-29. One hostile reviewer (Claude), in the detached sandbox worktree `<sandbox>` at `f6caeef`. `git status --short` was empty before and after every run (each result JSON records HEAD and status).
- **Judged against:** the owner's purpose (a menu of game UI, wiring, animation, assets and a standardized editor whose assets work together, with a two-way exchange with Tinderbox, Farmyard Commando and AFT-3D) and the new goal: **render assets twice as fast**, for the massive structures now being built. This round prepares that goal; it changes nothing.
- **Labels** (as `docs/design-evaluation.md` asks): **measured** = run here and quoted; **code-reading** = cited source; **estimate** = a prototype or arithmetic, not an implementation; **judgment** = assessment.
- **Rig.** Windows 11 10.0.26200, AMD Ryzen 7 5800X (16 threads), 64 GiB, Node v24.15.0, headless Edge 156.0.4314.50 through Playwright 1.62.1 (the same resolution as `tools/art-review-browser.mjs`, own launcher `lib/browser.mjs`, browser and HTTP server closed in a `finally`). Two ANGLE backends: **D3D11 on an NVIDIA GeForce RTX 3080** and **SwiftShader (Vulkan, Subzero)**. Viewport 1600 × 1100, deviceScaleFactor 1, editor canvas 1056 × 916, renderer pixel ratio 1.
- **Shared machine.** Another session ran a rendering benchmark at the same time (CPU load 40–50 % when sampled). Wall-clock numbers are indicative: each is a median of at least 5 samples (usually 20 or 30) with min–max. A no-change control re-measured the same scene at 15.65 → 13.75 ms, so differences under about ±12 % are noise. Counts (draw calls, meshes, triangles, geometries, materials, programs, exact JS call counts) are load-independent and were identical across runs and across both ANGLE backends.
- **How draw calls were counted.** `renderer.info.autoReset = false`, reset before each frame, `renderer.shadowMap.render` wrapped to isolate the shadow pass, one synchronous `scene.draw()` followed by a 1-pixel `readPixels`. A frame of the shipped editor is three things: the sun shadow pass, the main pass into a half-float target (`LightRenderer`) and a one-quad composite.
- **Evidence:** every script and JSON result is in [`evidence/hostile-review-0.8-round-1/reviewer/`](evidence/hostile-review-0.8-round-1/reviewer/), the reviewer's `artifacts/r08-1/` (index at the end; the scripts expect to sit in a checkout's gitignored `artifacts/r08-1/`). The donor copies and the nine workload maps are left out; `workloads.mjs` in that folder regenerates the maps (identical apart from the random character ids that `openDocument` mints). Paths in them are masked as `<sandbox>`, `<tinderbox>`, `<farmyard>`, `<aft3d>`, `<scratch>`.

## Score

**4 / 10 against the purpose** (unchanged from the 0.5.0 round). **Craftsmanship: 7 / 10.**

What is good is real: all six gates pass (357/357 and 32/32 tests), every documented geometry number reproduces exactly, 22 of 27 targeted mutants are killed (one only by hanging the suite), and the new 0.6–0.8 cores (world, runtime planner, floor controls, progression, rocks) are bounded, explicit about what they do not do, and refuse what they cannot represent.

Against the purpose the engine has not moved where it matters:
- **None of the four must-fixes of the previous round is fixed.** The export still loses buildings, roofs and walls in AFT and Farmyard (M1). The pin problem is worse: Tinderbox's **default branch** now ships Nautilus code from `90054d0`, a commit on no Nautilus release and reachable only from a worker branch (M2). There is still no asset standard, no registration and no way to author an asset (M3, M4).
- **The "massive structures" are not Nautilus assets.** The Tinderbox Exposition landmarks (0.6–1.1 M triangles, 412–1,166 draw calls each) are built and rendered by Tinderbox's own `forms.js`. Nautilus contributes a headless wall-panel helper: **0.01–0.04 % of their build time and none of their draw calls**. The Nautilus editor cannot load them; the most it can open is a bare wall skeleton, one 12.7 m tier at a time.
- **The speed goal has no instrument.** The only draw-call figure the gates record is `drawCalls: 1`. The editor actually issues 1,121 draw calls for a blank map and 4,425–8,657 for the 32-building workloads.
- **Animation is still absent** (an intake proposal, no code). **Game UI has grown a little** (the floor controls are an exported DOM component; the character and rock screens are reference pages).

## MUST-FIX

### MF1 (M1, open). The editor's export still passes silently through AFT and Farmyard, which drop the buildings, roofs and wall runs

**Measured** (`m1-exchange.mjs`, `results/m1-exchange.json`). The probe map has a Gross house, an original house, a sloped roof and a 45° wall run. Its export is plain `version: 2` with no requirement stamp, and `requiredMapFeatures` lists four Nautilus features.
- AFT `parseMap` at the Nautilus pin `781246a` and at AFT `origin/main` `25d0e918` accepts it and keeps the three fields as inert data. No AFT file reads them (`git grep`, 0 files).
- Farmyard `adaptAftSector` at `origin/main` `251bf80` accepts it: `obstacles: 0`, `edges: 0`; the building, roof and wall are gone.
- **Controls** show each consumer can reject: AFT rejects `version: 3`, Farmyard rejects stairs ("unsupported vertical traversal") and its *own* extension with a bad version (`farmyardWindows`, `aft-sector.js:45`). It just never looks at Nautilus's.

**Root cause (code-reading).** No code on the export path changed since `v0.5.0` (`git log v0.5.0..f6caeef` on `editing-document.js`, `document.js`, `persistence.js`, `index.js` is empty). `packages/map-core/editing-document.js:146` writes the plain map; capabilities are checked only in `sendToGame` (`apps/editor/editor.js:24-30`), which needs an adapter no game has.

**Direction.** As before: make required features travel in-band (the stamped `nautilus-save` envelope or a new format id) whenever a map uses them, so a pre-Nautilus loader refuses it; give each game a guard that refuses unknown functional keys.

### MF2 (M2, open and worse). Tinderbox's default branch now depends on an unreleased Nautilus worker commit; saved maps still name an unmerged commit

**Measured** (Git objects only):
- **Tinderbox `origin/master` `dc7f537` imports Nautilus `90054d0`:**
  - `src/art/nautilus-windows.js:1-2`: `packages/window-kit/index.js` and `three.js`;
  - `assets/art/exposition-administration/engine.js:2`, `assets/art/exposition-horticulture/engine.js:2` and `assets/art/horticulture-waterfront/index.js:2`: `packages/map-core/wall-runs.js`.

  In the Nautilus repository, `90054d0` is reachable only from `codex/editor-assets`, is in no tag, and `packages/window-kit/` does not exist on main. In the previous round this dependency lived on Tinderbox worker branches; it is now in Tinderbox production.
- `packages/prefab-core/registry.js:4` still writes `nautilus-gross-original-v1@6693bfa…+ee7c18e…` into every saved map that places an original building. `ee7c18e` is still reachable only from `codex/nautilus-art`, untagged.
- `upstream.json` `tinderboxPrefabs` `6693bfa` is still not on Tinderbox `origin/master`; only `codex/art-assets` contains it.
- **Mitigations since 0.5.0:**
  - release tags `v0.6.0`, `v0.7.0` and `v0.8.0` now exist;
  - Farmyard's (unmerged) Coldwell branch `b2a2c46` vendors Nautilus at `8c46704`, which is `v0.8.0`, the right practice;
  - Tinderbox's vendored `wall-runs.js` is byte-identical to main's (blob `b8d046b`).

**Direction.**
- Tag `90054d0` and `ee7c18e` today, so the ids already in Tinderbox master and in saved maps stay resolvable.
- Integrate the window kit into a release, or retire it, and re-pin Tinderbox master to that tag.
- Re-pin the Gross snapshot to a Tinderbox master commit, keeping a compatibility alias for the old catalogue id.
- Add a "pin vs donor default branch" report to weekly scouting.

### MF3 (M3 and M4, open). The massive structures cannot enter the editor: there is no asset standard, no registration and no authoring path

**Measured** (`landmark-editor-load.mjs`, `m3-m4.mjs`):
- `placeBuilding` rejects `exposition-administration-1893`: "Unknown building asset".
- The building's own `nautilus-assembly.json` (five tiers, each a 240 m, 6-layer `wallRuns` fragment) opens tier by tier through `openDocument` with no validation errors. But each tier is only an **uncut wall skeleton**: 7,968 full panels with no openings, floors, glazing, ornament or dome. Tiers 1–4 lose their 10.6–42.4 m vertical offsets, so they would render at ground level.
- The agent collections from the previous round are still "Unknown building asset" (`ellis-hospital-two`, `boott-mill-four`, `quincy-market-hall`, `alder-court`, `mercer-courts`). **Controls:** a shipped house places, and a known house in a blocked spot fails with a different message.
- `registry.js:1-7` still imports exactly two collections, `catalogueForAssets` is still binary (`provider==='original'`), and there is no registration function.
- `schemas/` has no building or part schema, and no editor code saves an asset.
- The functional-parts project (PR #13) is a plan: `v0.8.0..f6caeef` touches only documentation.
- None of the eight art branches (`measured`, `h-plan`, `fort-apache`, `fort-era-variants`, `frontier-stockade`, `bathroom`, `missile-silo`, `nautilus-art`) is an ancestor of main.

**Hurts:** the assets pillar and the "standardized editor" at once. The structures agents are proudest of live outside the engine, with their own renderer, materials and LOD policy. So the rendering goal cannot reach them through Nautilus code at all (see the landmark table below).

**Direction.** Start the standard from what exists. The Tinderbox factories already share one contract: `createXBuilding(T,{materials,textures,quarterTurns,position})` returning `{root,bounds,metadata,diagnostics,dispose}`, plus a versioned `tinderbox-nautilus-building-assembly` record. Define the provider-registration API and manifest (id, version, units, origin, bounds, levels, openings, materials, required capability) around that contract and the 48 originals. Then let the editor place a registered provider and save an assembly as one.

### MF4 (new). The rendering goal has no valid instrument: the only recorded draw-call figure is 1

**Measured.**
- `tools/review-engine-integration.mjs:108` stores `renderer.info.render.calls` after the frame, with `autoReset` on. That is the last pass, the composite quad, so this round's gate log again records `"drawCalls": 1` (`gates/review-integration.log`). The previous series flagged the same field (N1).
- Counted per pass, the same editor issues **1,121** calls for a blank map (554 shadow + 566 main + 1 composite) and **4,425–8,657** for the 32-building workloads below.
- No workload, baseline or budget for rendering is in the tree. `docs/building-prefabs.md:74` says the 32-house limit "is a provisional authoring bound, not a measured frame-rate guarantee". `docs/engine-blueprint.md:190` requires recorded draw calls and a frame-time distribution, with budgets set from a first baseline.

**Hurts:** a "2× faster" claim cannot be verified or protected from regression, and "the same pixels" cannot be shown.

**Direction.** Before the speed work lands:
- Commit the nine workloads (or `workloads.mjs`) and the census method (`census-editor.mjs`: autoReset off, shadow pass isolated).
- Gate on the **exact** draw-call count per workload. Counts are deterministic: w2 issued 4,480 in every run, on both backends.
- Gate on the per-design geometry fingerprints (`census-original.mjs`; catalogue fingerprint `d990f694…`; the negative control shows that a 1e-6 change in one float fails it).
- Gate on a full-canvas pixel comparison with a no-change control (0 differing pixels in this round).
- Run timings with no inspector attached (NIT N2).

## SHOULD-FIX

| # | Finding | Evidence | Direction |
| --- | --- | --- | --- |
| SF1 | **Door leaves are 57 % of all original-building meshes**, and every mesh is a draw call in each pass. | **Measured:** 1,128 of 1,981 game-LOD meshes; 46–60 % of the prefab meshes in the workloads. **Code-reading:** each door is its own `Surfaces` and pivot, with one or two meshes (`packages/building-catalog/three.js:74`). | Instance leaves that have identical geometry (prototype: 982 leaves → 72 `InstancedMesh`es; w2 4,480 → 2,683 calls, −27 to −31 % frame time, **0 pixels changed**). See ranked opportunity 1 for its risks. |
| SF2 | **The sun shadow pass repeats every building draw.** | **Measured:** the shadow pass is 49–51 % of all calls in every workload; removing building meshes from it cuts w3 by 37 % of calls and 25 % of frame time. That is an upper bound and changes 42,115 pixels. **Code-reading:** the vendored `DaylightRig.update` runs every frame and sets `castShadow` on every standard-material mesh unless `userData.noShadow` is set. `building-catalog/three.js:26`, `prefab-batches.js:32` and `roof-core/three.js:66` already set it on every mesh, including interiors, floors and door leaves. | A shadow-only merged proxy per placed building (one shadow draw instead of 37–100), marking the originals `noShadow`. Prove pixel identity per view, including cutaways. |
| SF3 | **Repeated designs are cloned, not instanced, and the public facade does not even share templates.** | **Measured:** w1 (32 copies) has 1,472 prefab meshes from a 46-mesh template; the instancing prototype cuts calls by 71 % and frame time by 66 %, but **365 pixels change** (363 with glass left un-instanced, so the cause is not sort order). `loadBuildingAssets().create()` (`packages/assets/three.js:11`) rebuilds each instance: 32 copies take **6.08 s and 1,472 geometries**, versus 0.13 s and 46 for template plus clone. It also returns Gross houses unbatched: 691–1,489 meshes per house, versus about 129 in the editor. | In the facade, share a template per design and reuse the editor's `batchPrefab`. Instance repeated templates in the editor only after the pixel differences are explained. |
| SF4 | **Free-angle wall runs fragment into one draw group per distinct cut width**, and every edit rebuilds all of them. | **Measured:** 2,400 free-angle runs (25,977 panels) become 2,402 `InstancedMesh`es and 5,916 calls; 38,400 axis-aligned panels need 3 meshes and 1,127 calls. `rebuildWalls()` takes 17.6 ms (38,400 panels) and 26.0 ms (25,977) on every `rebuild()`. **Code-reading:** `apps/editor/wall-scene.js:24` creates a geometry per `width.toFixed(6)`; `:35` makes an `InstancedMesh` per width and material; `:20` disposes them all. | One `InstancedMesh` per material and layer state with a per-instance width attribute, keeping the per-metre UVs exact (upper-bound prototype: −81 % calls, −77 % frame, not pixel-identical because its UVs stretch). Rebuild only runs that changed. |
| SF5 | **Building geometry is generated through allocation-heavy vector helpers.** | **Measured:** building all 48 game designs makes **66.3 M** JS calls (exact count). The top callees are the `.map` and `.reduce` closures inside `add/sub/mul/lerp/dot` (`three.js:4`, 13.5 M and 13.4 M calls). `batch()` builds a string key per triangle (`:11`, 763,402 calls), and `tri()` computes the cross product twice (`:13`). Clean timing is 2.27 s for 48 game builds (median 44 ms, maximum 189 ms). In the editor, `building-catalog/three.js` is 26–40 % of a cold open of w3 or w7. | Scalar arithmetic, preallocated typed arrays and a per-channel batch cache. **Estimate:** 3–5× faster builds. To keep the bytes identical, keep the floating-point operation order, the `0 +` that `reduce` starts from (it turns −0 into +0) and `Math.hypot`, then prove it with the fingerprints. |
| SF6 | **Four documented claims have no test that can fail** (real survivors; `survivors.mjs` shows each claim holds on the clean tree and breaks under its mutant). | **W3:** "same-floor links reject" (`world-core/state.js`, the `INVALID_TRAVERSAL` check). **Q4:** "`linksFrom` respects direction" (`queries.js`, its filter). **L3:** "handles may export only their declared services" (`runtime-core/lifecycle.js`). **X1:** the history entry bound in `apps/editor/extended-world-document.js`: the test sets both limits, and the byte limit binds first. W6 is an equivalent mutant: the landing check is redundant with the support check. | Add four falsifiers and assert codes. Re-run each mutant after writing its test. |
| SF7 | **A lifecycle mutant hangs the suite instead of failing it, and CI would wait six hours.** | **Measured:** with L4 (`stop()` made non-idempotent) the `runtime-modules` test process never finished; I stopped it by PID after about 3–4 minutes. `.github/workflows/check.yml`: the `map-workshop` job has no `timeout-minutes` (the default is 360), and `npm test` has no `--test-timeout`. | Add `--test-timeout` to `npm test` and a job timeout. |
| SF8 | **AFT's vocabulary still drifts under the same schema id (previous S1, open).** | **Measured** (`s1-vocabulary.json`): AFT main accepts `bull`, `bear`, `rabbit` and `dog` guards. Nautilus rejects each with "Use at most 46 guards (50 characters including the squad)". The control `horse` passes both. | Version the content vocabulary as a capability and report unknown species precisely. The bear plan (PR #11) is the moment to do it. |

## NIT

- **N1.** `materialsFor` (`building-catalog/three.js:28`) creates 20 materials per building, of which 5–12 are used: 960 across the 48 designs. Sharing them across the 32 templates of w2 collapses 300 materials to 4 with **identical pixels but no frame gain** (21.6 → 22.6 ms, within the control's noise). This is memory and compile hygiene, not speed.
- **N2. Method trap for the speed session.** In the process that had the V8 inspector attached (precise call-count coverage, then the sampling profiler), the same 48 game builds took 11,987 ms (sum of medians, including 52 ms of compile) instead of 2,273 ms in a clean process: about 5× slower. Benchmark with no inspector attached and profile in a separate run.
- **N3.** The extended-world overview draws the first 1,600 bodies, working floor first and then input order (`apps/editor/extended-world-view.js:71`). A 25,600-body world shows an arbitrary 1,600, disclosed in the count line ("1600 / 25600 bodies in overview"). Rendering stays bounded: 40–70 ms per event-driven render.
- **N4.** The Gross artist gives floors `receiveShadow` only (`vendor/tinderbox-prefabs/…/gross-housing.js:106`), but `batchPrefab` (`prefab-batches.js:32`) and `DaylightRig` both force `castShadow`.
- **N5.** The rock model (`packages/item-visuals/rock.js`) is one 54-triangle mesh with no geometry shared between instances. That is negligible today, but it is the same pattern as SF3.
- **N6. Tinderbox side, informational:** the Administration factory's batch count depends on placement. It has 412 nodes and 229 batches at the origin, and 415 and 233 at `[120,0,100]` (measured). The likely cause, from reading `forms.js` `box()` and not verified, is that facade UV origins enter its geometry cache key. Keep this in mind for any "same output" comparison across placements.

## Rendering of assets

### Paths that turn assets into renderables

| Path | What it does | Draw-call structure (code-reading, confirmed by the census) |
| --- | --- | --- |
| `packages/building-catalog/three.js` `createBuildingModel` (public `buildings/three`) | Procedural geometry for the 48 originals; non-indexed `BufferGeometry` per (material, kind, level) batch; each door its own pivot and `Surfaces` | 11–100 meshes per design (median 34), one call each per pass; LOD changes triangles, not meshes |
| `packages/prefab-core/provider-original.js` | `createBuildingModel` at game LOD with the shared atlas; clones floor materials with polygon offset per template | Same meshes, plus 1–2 cloned floor materials per template |
| `packages/assets/three.js` `loadBuildingAssets` (public facade) | `create()` builds a **new** model for every instance; Gross houses unbatched | N instances = N full builds; 691–1,489 meshes per Gross house |
| `apps/editor/prefab-scene.js` `PrefabLayer` | One template per design, `root.clone(true)` per instance (shared geometry and materials); `setView` copies visibility to clones by node index | Instances × template meshes |
| `apps/editor/prefab-batches.js` | Bakes Gross native meshes per (scope, wall flag, material) | About 129 meshes per Gross house (1,678 for the 13 designs) |
| `apps/editor/wall-scene.js` | Wall panels as `InstancedMesh` per (cut width, material); full rebuild on every `rebuild()` | 3 meshes for any number of full panels; one more per distinct cut width |
| `apps/editor/roof-scene.js` + `packages/roof-core/three.js` | One mesh per roof, multi-material groups; per-roof materials with a program per atlas tile | 3 draw groups per roof per pass |
| Vendored AFT `editor-3d-scene.js`, `daylight-rig.js`, `light-renderer.js` | Ground, biomes and scenery chunked 16 × 16 m; sun shadow 2048²; render into a half-float target and composite; extra full passes per 4 lamps | 1,121 calls for a blank map (fixed floor under every workload) |
| Vendored Tinderbox `gross-housing.js` | Many small box meshes; double-sided materials; wall clipping planes for cutaways | Raw: 691–1,489 meshes per house |
| `apps/editor/extended-world-view.js` | SVG polygons of authored AABBs, drawing limit 1,600 | No WebGL; 17 ms for the fifteen-story world |
| `packages/render-effects`, `packages/item-visuals/rock.js` | Halo effect not enabled in the editor; one rock mesh | Not on the building path |

### Baseline: scene workloads in the built editor (`census-editor.mjs`, `results/census-editor-*.json`)

Workloads come from `workloads.mjs`, built through the public map API. Each map fills the 32-building limit and is validated by `openDocument`.
- w1: 32 copies of the largest design (`dockside-warehouse`, 42,822 triangles);
- w2, w3: the 32 distinct designs with the most meshes or triangles;
- w4: 32 Gross houses (13 designs, cycled);
- w5a, w5b: dense wall runs on all six layers;
- w6: 144 roofs;
- w7: all 13 Gross designs plus the 19 largest originals.

Overview view (span 250 m, everything in frustum). Frame times are medians of 20 frames (min–max).

| Workload | Draw calls / frame (shadow + main + composite) | Triangles / frame | Frame ms, RTX 3080, shadows on | Frame ms, shadows off | Frame ms, SwiftShader | Cold open ms (5 reps) | Level-0 cutaway calls | Geometries / materials / programs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| w0-blank | 1,121 (554 + 566 + 1) | 2,541,974 | 6.25 (4.5–11.8) | 3.25 (2.6–4) | 959 (953–966) | 1,222 (1,074–1,271) | 1,121 | 90 / 32 / 19 |
| w1-32x-largest | 4,155 (2,026 + 2,128 + 1) | 5,307,446 | 14.9 (11.8–18.1) | 9.85 (8.3–11.7) | 1,376 (1,354–1,427) | 1,402 (1,343–1,643) | 1,948 | 136 / 41 / 23 |
| w2-32-distinct-most-meshes | 4,480 (2,209 + 2,270 + 1) | 3,766,342 | 25.55 (21.2–30) | 16.3 (13.6–19.4) | 1,146 (1,140–1,161) | 2,789 (2,747–2,972) | 2,596 | 1,745 / 332 / 23 |
| w3-32-distinct-most-triangles | 4,425 (2,176 + 2,248 + 1) | 3,788,864 | 24.65 (18.2–29.5) | 14.95 (13–16.2) | 1,173 (1,131–1,181) | 2,910 (2,672–3,030) | 2,546 | 1,712 / 324 / 23 |
| w4-32-gross | 8,657 (4,353 + 4,303 + 1) | 3,370,761 | 30.65 (28.1–35.9) | 19.35 (16.4–22.4) | 1,139 (1,137–1,155) | 1,636 (1,471–1,754) | 4,486 | 1,768 / 266 / 21 |
| w5a-walls-axis (38,400 panels) | 1,127 (557 + 569 + 1) | 3,463,574 | 7.1 (5–12.4) | 3.45 (2.9–4.8) | 1,486 (1,480–1,594) | 1,299 (1,168–1,391) | 1,127 | 91 / 35 / 19 |
| w5b-walls-free-angle (25,977 panels) | 5,916 (2,956 + 2,959 + 1) | 3,165,242 | 28.55 (24.8–34.9) | 16.8 (15.5–19.4) | 1,384 (1,378–1,451) | 1,438 (1,377–1,478) | 1,920 | 2,490 / 35 / 19 |
| w6-roofs-144 | 1,985 (986 + 998 + 1) | 2,546,966 | 11.85 (9.6–13.7) | 8.3 (7.1–12.2) | 1,040 (1,017–1,050) | 1,199 (1,159–1,485) | 1,121 | 234 / 464 / 25 |
| w7-mixed-13-gross-19-largest | 6,542 (3,246 + 3,295 + 1) | 3,758,312 | 29.4 (25.1–33) | 19.25 (15.8–23.4) | 1,143 (1,132–1,182) | 2,710 (2,606–2,930) | 3,366 | 2,907 / 450 / 24 |

Where the meshes come from:

| Workload | Inherited AFT meshes | Prefab meshes drawn | Distinct template meshes | Wall InstancedMeshes (instances) | Roof meshes (draw groups) |
| --- | --- | --- | --- | --- | --- |
| w1 | 567 | 1,472 | 46 | — | — |
| w2 | 567 | 1,655 | 1,655 | — | — |
| w3 | 567 | 1,622 | 1,622 | — | — |
| w4 | 567 | 3,799 | 1,678 | — | — |
| w5a | 567 | — | — | 3 (38,400) | — |
| w5b | 567 | — | — | 2,402 (25,977) | — |
| w6 | 567 | — | — | — | 144 (432) |
| w7 | 567 | 2,692 | 2,817 | — | — |

Read with care:
- On the RTX 3080, frame time tracks draw calls at about 3.5–5.7 µs per call. Per-frame JS is dominated by three's `renderBufferDirect`, `setProgram`, `renderObject` and `projectObject` plus native GL calls (`frameProfile` in the D3D11 JSON). The vendored `DaylightRig` scene traversal is 0.5–1 %, not worth optimising.
- On SwiftShader the frame is software rasterisation: 96 % of profile samples sit in `readPixels`. Its times say nothing about draw-call cost.
- w1 issues as many calls as w2 but runs 1.7× faster. It shares 136 geometries where w2 has 1,745. Material sharing alone recovered none of that (N1).

### Baseline: the 48 original designs (`census-original.mjs`, `time-original.mjs`)

| LOD | Meshes (= draw calls per pass) | Door-leaf meshes | Door pivots | Triangles | Vertices | Attribute MiB | Materials created | Exact JS calls for all 48 | Build, sum of medians |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| game | 1,981 | 1,128 (57 %) | 573 | 763,402 | 2,290,206 | 69.889 | 960 | 66,261,040 | 2,273 ms |
| authoring | 1,981 | 1,128 (57 %) | 573 | 1,358,208 | 4,074,624 | 124.348 | 960 | 126,110,701 | 4,006 ms |

The documented figures reproduce exactly (`docs/building-catalog.md`): 763,402 and 1,358,208 triangles, 6,226–42,822 per game model, 69.89 MiB. `compileBuilding` costs 52 ms for all 48.

Ten designs with the most meshes (game LOD; build medians of 7 runs, no inspector):

| Design | Meshes | Door-leaf meshes | Triangles game / authoring | Build ms game (spread) / authoring | Materials used of 20 | Glass meshes |
| --- | --- | --- | --- | --- | --- | --- |
| marlow-courtyard-flats | 100 | 74 | 41,048 / 65,672 | 111.6 (47 %) / 174.6 | 10 | 3 |
| narrow-court | 85 | 58 | 22,908 / 39,950 | 60.0 (42 %) / 121.6 | 8 | 3 |
| coach-yard-inn | 81 | 58 | 31,974 / 58,676 | 84.9 (52 %) / 153.4 | 11 | 2 |
| willow-pair | 75 | 52 | 19,228 / 35,058 | 53.0 (52 %) / 90.0 | 10 | 2 |
| rowan-family | 72 | 45 | 17,692 / 31,920 | 44.2 (7 %) / 85.6 | 12 | 4 |
| elm-cross-gable | 66 | 38 | 18,346 / 34,144 | 46.2 (16 %) / 104.2 | 11 | 3 |
| violet-bay-house | 66 | 38 | 18,950 / 34,546 | 47.8 (46 %) / 98.7 | 11 | 3 |
| red-crest-barn | 64 | 45 | 24,810 / 44,926 | 75.1 (50 %) / 127.4 | 9 | 2 |
| juniper-suite | 63 | 40 | 19,434 / 31,464 | 52.5 (27 %) / 87.3 | 10 | 2 |
| fennel-mansard | 63 | 38 | 15,724 / 26,418 | 39.6 (39 %) / 79.5 | 10 | 4 |

**Build hot spots** (exact calls, V8 precise coverage):
- the `.map` closures of the vector helpers: 13.47 M and 13.42 M calls;
- `lerp` 4.60 M; `sub` 4.47 M; `local` (UV clamp) 3.38 M; `length` 2.32 M; clip `inside` 2.26 M; `cross` 1.84 M; `uv` 1.69 M;
- `tri` 798 K and `batch` 763 K, one per triangle.

By sampled self time: `tri` 15.5 %, `batch` 14.8 %, the helper closures 11.3 %, `quad` 10.3 %, `sub` 7.2 %, `lerp` 6.5 %, GC 4.6 %. `building-catalog/three.js` is 86.7 % of the build and three.core 5.4 %. Per-design `perDesign[].game.fingerprint` and `catalogueFingerprint` are the byte-identity baseline.

### The massive structures being built now: Tinderbox landmarks (`landmarks.mjs`, `results/landmarks.json`)

Closures were copied from Tinderbox Git objects and built in Node with Nautilus's vendored three r180.

| Landmark @ commit | Mesh nodes (= calls per pass) | InstancedMesh batches | Drawn instances | Triangles | Geometries | Materials | Build ms, Node, median (min–max) | Calls inside Nautilus `wall-runs.js` | Time in `wall-runs.js` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Administration @ 43337a3 (same at 988b4ac) | 412 | 229 | 36,397 | 614,274 | 411 | 9 | 3,840 (3,628–4,600) | 1,542 of 14,363,986 | 0.03 % |
| Horticultural @ 988b4ac / a019fcf | 504 | 173 | 46,285 | 971,732 | 503 | 13 | 4,340 (4,156–5,140) | 959 of 23,563,542 | 0.04 % |
| Fisheries @ f75499a | 1,166 | 689 | 35,242 | 1,078,034 | 1,144 | 14 | 4,460 (4,060–8,350) | 2,185 of 91,986,583 | 0.01 % |

- The intake's "412 mesh nodes, 229 instance batches, 411 retained geometries, 614,274 triangles" reproduces exactly. Its "ten materials" are the ten appearance slots the factory creates (code-reading); nine are used by meshes (measured).
- **What passes through Nautilus code:** only `measureWallRun`, `wallPanels`, `wallRunErrors` and `WALL_KIT` (headless panel placement at build time). That is 0.01–0.04 % of build time and none of the draw cost. Meshes, instancing (`forms.js` `finalize`), materials and shaders are Tinderbox's.
- **Rendered by the Nautilus editor's renderer** (prototype `admin-in-editor`, built in page): a blank map goes from 1,121 to 1,951 calls (+830, about 2 × 415) and from 10.6 to 12.75 ms on the RTX 3080. It would fit the editor's frame budget. The editor cannot load it (MF3).

### In-page prototypes: estimated gains (`prototypes.mjs`, `prototypes2.mjs`, `prototype-combined.mjs`; RTX 3080; not implementations)

| Prototype | Draw calls | Frame ms (median) | Pixels changed of 967,296 (max channel delta) |
| --- | --- | --- | --- |
| control: no change (w1) | 4,155 → 4,155 | 15.65 → 13.75 | **0** |
| doors-w2: instance identical door leaves (982 → 72 meshes) | 4,480 → 2,683 (−40 %) | 24.0 → 17.6 (−27 %); 22.5 → 15.55 (−31 %) in the combined run | **0** |
| doors + building meshes out of the shadow pass (w2) | 4,480 → 1,938 (−57 %) | 22.5 → 13.0 (**−42 %, 1.73×**) | not identical (shadow removal) |
| inst-w1: one `InstancedMesh` per template mesh | 4,155 → 1,216 (−71 %) | 16.2 → 5.55 (−66 %) | 365 (60) |
| inst-opaque-w1: same, glass left as clones | 4,155 → 1,495 (−64 %) | 16.6 → 8.4 (−49 %) | 363 (60): not glass sort |
| share-w2: share identical materials (300 → 4) | 4,480 → 4,480 | 21.55 → 22.55 (no gain) | **0** |
| noshadow-w3: building meshes out of the shadow pass | 4,425 → 2,803 (−37 %) | 22.1 → 16.65 (−25 %) | 42,115 (upper bound) |
| walls-w5b: one `InstancedMesh` per material, unit geometry scaled | 5,916 → 1,127 (−81 %) | 28.7 → 6.7 (−77 %) | 96,706 (upper bound; UVs stretch) |

Edit and view-change latency (`scene.rebuild()`, 6 samples) is 113–147 ms in every workload; the inherited AFT rebuild dominates. `rebuildWalls()` adds 17.6 ms (w5a) and 26.0 ms (w5b).

### What "2× faster" means here (estimate, from the tables)

- **Every frame carries a fixed floor.** The inherited AFT scene issues 1,121 calls and takes about 6.3 ms on this GPU, and its bytes are vendored.
- **w2 as the example.** For the whole w2 frame (25.55 ms) to halve, the building share (about 19 ms) must drop by about two-thirds.
- **The two levers that do not depend on repeated designs** reached 1.73× together: door instancing (pixel-identical) plus taking buildings out of the shadow pass (an upper bound).
- **A third lever is needed for 2×.** One option is merging the remaining ~670 non-door meshes per (material, kind, level) across placed buildings, using batched or multi-draw rendering to keep per-group visibility. The other is touching the inherited scene. Estimate: about 2.5× with all three.
- **Repeated designs** (Gross districts, settlements) also gain from instancing, which reached −66 % on its own for w1.
- **Build time ("open the massive map")** has its own 2× path: SF5 plus template sharing in the facade (SF3).

### Ranked opportunities (gains are estimates unless marked measured)

| Rank | Change | Gain | Output identity | Risks to name |
| --- | --- | --- | --- | --- |
| 1 | Instance door leaves with identical geometry (per design and across designs) | **Measured prototype:** −40 % calls, −27 to −31 % frame on w2 | 0 pixels changed at the overview | `doorRoots` / `setDoorsOpen` / `userData` API and hinge pivots; per-instance door state in games; glTF export keeps door nodes (`check:buildings` compares exports with recipes); picking; disposal of a leaf geometry shared by several buildings; `setView` level and cutaway visibility per instance |
| 2 | Shadow pass: one merged shadow-only proxy per placed building; originals `noShadow` | Up to −37 % calls, −25 % frame (upper bound measured by removal) | Must be proven: merged world-space depth differs in rounding | `DaylightRig` re-asserts `castShadow` every frame; cutaway / `maxLevel` must hide proxy parts too; `castShadow` on every mesh today, including interiors; shadow bias and acne; dimmed layers |
| 3 | Instance repeated templates (`PrefabLayer`), share templates in the facade | **Measured prototype:** −71 % calls, −66 % frame on w1; facade 6.08 s → 0.13 s and 32× fewer geometries for 32 copies | 365 pixels changed even without glass: explain before shipping | Transparent glass sorting (per `InstancedMesh`, not per clone); frustum culling coarsens; `setView` is per template and already shared; per-instance doors; polygon-offset floor material clones are per template; ownership: template disposal while clones or instances live |
| 4 | Free-angle walls: one `InstancedMesh` per material and layer state with a per-instance width; rebuild only changed runs | Up to −81 % calls, −77 % frame on w5b (non-identical prototype); 26 ms per edit | Likely exact (code-based estimate, unproven): a unit box scaled by width in the shader reproduces `BoxGeometry(width)` positions in float32, and UV = u × width | The depth and shadow materials need the same patch; dimmed per-layer materials; the 1 m UV-per-metre contract (art audit) |
| 5 | Scalar rewrite of the geometry helpers, typed arrays, batch cache | 3–5× faster builds; w3 cold open about −25 % | Byte-identical if operation order and ±0 are kept; prove with the fingerprints | `dot` reduces from `0`; `unit` multiplies by a reciprocal; `Math.hypot`; Float32 conversion |
| 6 | Batch Gross houses in the public facade (reuse `batchPrefab`) | About 8× fewer meshes per Gross house for consumers | Same as the editor today | Gross clipping-plane cutaways (wall materials own `clippingPlanes`); `setView` per instance |
| — | Not worth it now | Material sharing (no gain measured); `DaylightRig` traversal (≈1 %); roofs (3 calls per roof; 144 roofs = 864 calls, worth it only at that density) | | |

## Previous round's must-fixes, re-checked on `f6caeef`

| Finding | Probe on this tree | Control that can fail | Status |
| --- | --- | --- | --- |
| M1 | `m1-exchange.mjs`: export accepted by AFT pin `781246a`, AFT main `25d0e918` (fields inert) and Farmyard main `251bf80` (0 obstacles, 0 edges) | AFT rejects `version: 3`; Farmyard rejects stairs and its own bad `farmyardWindows` version | **Open**; export path unchanged since v0.5.0 |
| M2 | Git ancestry: `90054d0` and `ee7c18e` on no Nautilus tag or main; Tinderbox master imports `90054d0`; `6693bfa` not on Tinderbox master | Same checks find `781246a`, `b2f2b6b`, `7db49df`, `279d2d3` and `8a84056` on their donors' default branches | **Open, worse**: the unreleased Nautilus dependency is now in Tinderbox production. Release tags v0.6.0–v0.8.0 are a partial mitigation |
| M3 | `m3-m4.mjs`: five agent-built ids and `exposition-administration-1893` are "Unknown building asset"; registry imports two collections; no registration function; art branches unmerged | `albany-cottage` places; a blocked known house fails with a different message | **Open** |
| M4 | `m3-m4.mjs`: no building or part schema in `schemas/`; no save-as-asset code in `apps/` or `packages/`; blocks still reject prefabs; PR #13 is docs-only | Same file-scan helper finds the existing schemas | **Open** (planned in `docs/projects/functional-editor-parts.md`) |

## Mutation results on the 0.6–0.8 surface (`mutate.mjs`, `results/mutation-results.json`)

27 targeted mutants. The harness refuses a dirty tree, asserts each needle occurs exactly once, restores the file in a `finally` and verifies its SHA-256. A survivor counts only after it also passes the **full** suite. The tree was clean afterwards.

- **Killed by assertions (21):**
  - World validation and queries: W1, W2, W4, W5, Q1–Q3.
  - Lifecycle: L1, L2.
  - Floor controls: F1–F5, including the 180 ms boundary and the five-label window.
  - Progression constants: P1–P3. Tests spell 15 points, 100 × level and 1,000 out.
  - Rock hearing priority and radius: R1–R3.
  - History eviction order: X2.
- **Killed by a hang (1):** L4, see SF7. The JSON records it as `killed` with 2 failures only because I stopped the hung test process (PID-verified as the harness's own grandchild; `results/mutation-l4-hang.json`); left alone it would have run until the harness's 15-minute timeout.
- **Real survivors (4):** W3, Q4, L3 and X1, see SF6.
- **Equivalent (1):** W6.

## Gate results on `f6caeef` (`gates.mjs`, logs in `gates/`)

| Gate | Result | Time |
| --- | --- | --- |
| `npm run check -- --tracked` | pass (exit 0) | 7.8 s |
| `npm test` | pass: 357 tests, 357 pass, 0 fail, 0 cancelled | 59.5 s |
| `npm run test:upstream` | pass: 32 tests, 32 pass | 5.5 s |
| `npm run build` | pass: 11 recorded deployment patches, 382 module paths | 28.1 s |
| `npm run test:package` | pass: core, assets and installed-consumer proofs | 10.4 s |
| `npm run review:integration` | pass (SwiftShader). Its record contains `drawCalls: 1` (MF4) | 66.2 s |

## What holds up (verified here)

- Every gate passes on a clean tree.
- The documented geometry numbers reproduce exactly, and the actor-height intake's landmark numbers reproduce exactly.
- Counts are deterministic across runs and across both ANGLE backends.
- **The cores are bounded and honest:**
  - the extended-world loader rejects what it cannot represent, with codes;
  - legacy export is an explicit refusal (`ok:false`);
  - the world `LIMITS` constants and the 65,536-entry array bound match the documentation;
  - the SVG view discloses its truncation.
- **The tests mostly bite:** 22 of 27 mutants die, 21 of them on an assertion.
- Farmyard's (unmerged) Coldwell branch pins a tagged mainline Nautilus commit, the practice MF2 asks for.
- The editor already reaches near-zero marginal cost for axis-aligned wall runs: 38,400 panels in 3 draw groups.

## Not verified

- Physical phones, other GPUs and GPU timer queries. Frame times are CPU plus sync wall time on one desktop GPU and on SwiftShader.
- **Pixel identity, beyond these checks:** it was checked at one view (the overview), one frame, D3D11, default time of day. Not checked: cutaways, other camera presets, shadows at other sun angles, SwiftShader.
- The prototypes are estimates on live scenes, not implementations. The changes were not combined beyond the doors + shadow pair. `setView` was not re-run during the prototypes.
- Not read: the other session's benchmark branch (`claude/asset-render-speed`) and the gallery app (`apps/buildings`).
- Exploration-access (6 MB fragments) and Fisheries/Horticulture were not rendered in a browser; Fisheries and Horticulture have only the Node census.
- Not run: AFT's own editor re-saving a Nautilus map, Farmyard's Coldwell runtime, `review:buildings`, `review:materials`, `review:floors`, `review:world`, `review:rocks`, `review:progression`, `build:buildings`, `check:buildings` beyond `npm run check`.
- GitHub CI state (no network fetches were made).
- Licensing of the copied donor closures. `donor/` is for local reproduction only: **do not commit it**; the scripts recreate it from Git objects.

## Evidence index (`artifacts/r08-1/`)

| Script | Result | Supports |
| --- | --- | --- |
| `gates.mjs` | `gates/*.log`, `results/gates-*.json` | Gate table, MF4 |
| `workloads.mjs` | `maps/*.json` (regenerable), `results/workloads.json` | Workloads |
| `census-editor.mjs` | `results/census-editor-d3d11.json`, `-swiftshader.json` and `.log` | Scene baseline, MF4, SF2 |
| `census-original.mjs` | `results/census-original.json` (counts, fingerprints, profiles; its timings are inspector-perturbed, N2) | Design baseline, SF1, SF5 |
| `time-original.mjs` | `results/time-original.json` | Clean build timing, SF3 facade, SF5 |
| `landmarks.mjs` | `results/landmarks.json`, `donor/tinderbox-*` (do not commit) | Landmark table |
| `landmark-editor-load.mjs` | `results/landmark-editor-load.json` | MF3 |
| `prototypes.mjs`, `prototypes2.mjs`, `prototype-combined.mjs` | `results/prototypes-d3d11.json` (and `-run1`, under heavier load), `prototypes2-d3d11.json`, `prototype-combined-d3d11.json` | Estimates, ranking, SF1–SF4 |
| `world-view.mjs` | `results/world-view.json` | N3 |
| `m1-exchange.mjs` | `results/m1-exchange.json`, `donor/aft3d-*`, `donor/farmyard-*` | MF1 |
| `m3-m4.mjs` | `results/m3-m4.json` | MF3, M3 and M4 status |
| `s1-vocabulary.mjs` | `results/s1-vocabulary.json` | SF8 |
| `mutate.mjs`, `survivors.mjs`, `mutation-l4-note.mjs` | `results/mutation-results.json`, `mutation.log`, `survivor-probes.json`, `mutation-l4-hang.json` | SF6, SF7 |
| `tables.mjs` | `results/tables.md` | Tables transcribed by code |
| `lib/common.mjs`, `lib/browser.mjs`, `lib/closure.mjs` | `results/browser-receipts.jsonl` (9 browser runs, each with its browser PID and port; all `browserExited` and `httpClosed` true) | Method, masking, cleanup |

**Reproduce**, from a checkout of `f6caeef`. Requirements: Node ≥22, Playwright resolved as `tools/art-review-browser.mjs` does, and donor clones in `R08_TINDERBOX`, `R08_FARMYARD` and `R08_AFT3D` (read through Git objects only). Run in this order:
1. `npm run build`
2. `node artifacts/r08-1/workloads.mjs`
3. `census-original.mjs`, `time-original.mjs`, `landmarks.mjs`
4. `m1-exchange.mjs`, then `s1-vocabulary.mjs` (it reuses the AFT closure)
5. `m3-m4.mjs`, `landmark-editor-load.mjs`
6. `census-editor.mjs`, with `ANGLE=d3d11` for a hardware GPU
7. `prototypes.mjs`, `prototypes2.mjs`, `prototype-combined.mjs`, `world-view.mjs`
8. `mutate.mjs`, then `survivors.mjs` (both need a clean tree)
9. `tables.mjs`

## The answer to round 1, measured

The owner's goal was to render the massive structures twice as fast. The answer is branch `claude/asset-render-speed`, stacked on this record:

| Commit | Answers | Change |
| --- | --- | --- |
| `a68cefd` | SF5 | The building generator in scalar arithmetic and float32 buffers, byte-identical; its reviewed output pinned instead of its source text |
| `8ed66db` | SF1–SF3 (editor) | Display batches: one draw per material per view for original buildings, at most two for Gross houses |
| `af06303` | SF4 | Wall panels as one width-scaled instance set per material |
| `e6ae2a4` | SF3 (facade) | One template per original design in `assets/three` |
| `0ba89e0` | MF4 | `tools/bench-asset-rendering.mjs` and [its method](../asset-rendering-benchmark.md); `review:integration` counts a whole frame |
| `aaa77e4` | (its own regression) | Wall instances written straight into typed buffers; `af06303` had made the wall rebuild slower than main |

**Rig and method.**
- One machine: Windows 11, Ryzen 7 5800X, RTX 3080 (ANGLE D3D11) for timing, and SwiftShader for pixels.
- Headless Edge at 1600 × 1100: 156.0.4314.50 for the GPU run; the browser updated itself to .56 before the SwiftShader and later runs.
- The frame and pixel measurements ran on `0ba89e0` with a clean tree, against main `f6caeef`.
- `aaa77e4` changes only how the wall layer fills its buffers. For both wall workloads its instance matrices, widths and unit geometry hash the same as `0ba89e0`'s (`wall-buffers-equal.mjs`), so those frames and pixels carry over.
- Other agents were working on the machine. Both trees run as two pages of one browser, with A B B A blocks per map and view, so their load falls on both arms. The blank map runs identical code in both arms and gives the noise floor.

### Frame time in the built editor (RTX 3080)

Each cell is main's frame time divided by the answer's: the median over 6 paired runs, with the range across runs. "Assets" subtracts, in each arm and view, the blank map's frame time. That removes the inherited scene's fixed cost: 1,121 calls and about 5.9 ms in the overview.

| Workload | Draw calls, overview (main → this) | Frame, overview | Frame, close | Frame, cutaway | Assets, overview | Assets, close | Assets, cutaway |
| --- | --- | --- | --- | --- | --- | --- | --- |
| w0 blank (null control) | 1,121 → 1,121 | ×1.00 (0.93–1.05) | ×0.97 (0.84–1.02) | ×0.98 (0.89–1.03) | — | — | — |
| w1 32 copies of one design | 4,155 → 1,919 | ×1.65 (1.55–1.92) | ×1.51 (1.40–1.87) | ×1.26 (1.03–1.37) | ×2.61 | ×2.67 | ×1.88 |
| w2 32 distinct, most meshes | 4,480 → 1,877 | ×2.10 (1.90–2.48) | ×2.32 (2.20–3.06) | ×1.89 (1.79–2.02) | ×3.15 | ×4.68 | ×3.91 |
| w3 32 distinct, most triangles | 4,425 → 1,863 | ×2.26 (1.98–2.35) | ×2.38 (2.15–2.63) | ×1.92 (1.51–2.07) | ×3.16 | ×4.18 | ×3.52 |
| w4 32 Gross houses | 8,657 → 1,941 | ×3.76 (3.42–4.08) | ×3.77 (3.38–4.34) | ×2.05 (1.92–2.14) | ×7.80 | ×7.94 | ×3.14 |
| w5a 38,400 axis-aligned panels | 1,127 → 1,127 | ×1.04 (0.54–1.12) | ×1.03 (0.94–1.13) | ×0.98 (0.93–1.05) | ≈1 ms, noise | | |
| w5b 2,400 free-angle runs | 5,916 → 1,127 | ×5.19 (4.76–5.60) | ×2.97 (2.80–3.28) | ×1.80 (1.65–1.98) | ×36 | ×10.8 | ×16.5 |
| w6 144 roofs (code unchanged) | 1,985 → 1,985 | ×1.03 (0.86–1.08) | ×0.99 (0.91–1.04) | ×0.96 (0.89–1.08) | ×0.98 | ×1.06 | sub-ms, noise |
| w7 13 Gross + 19 largest | 6,542 → 1,940 | ×2.79 (2.40–2.93) | ×2.83 (1.97–2.99) | ×2.12 (1.89–2.42) | ×4.15 | ×4.84 | ×3.14 |

Absolute medians, for example: w2 at the overview, 27.9 → 12.8 ms; w5b, 37.5 → 6.70 ms. The draw counts are identical in every run and on both backends. Every count and both arms' milliseconds are in [`answer/tables.md`](evidence/hostile-review-0.8-round-1/answer/tables.md).

**Against the 2× goal:**
- **Assets' own frame time:** at least twice as fast for every building and free-angle-wall workload in every view but one, at ×2.6–36. The exception is w1, 32 copies of one design, in the level-0 cutaway (×1.88).
- **Whole editor frames at the overview:** at least twice as fast for the same workloads (×2.10–5.19), except w1 (×1.65). The cutaways of w2, w3 and w5b come in at ×1.80–1.92, because the inherited scene is most of a cutaway frame.
- **Placed copies of one design are the weak case:** each copy still issues one draw per material. Instancing the copies would close the gap, at the cost of a few edge pixels of precision; round 1's prototype changed 365 pixels.
- **Unchanged, as expected:** roofs, and axis-aligned walls, which were already one draw per material.

### Build, open and edit times

| Measure | main | this | Speedup |
| --- | --- | --- | --- |
| Generator, all 48 designs, game LOD (Node, 8 paired runs) | 2,579 ms (2,442–2,813) | 746 ms (676–846) | ×3.46 |
| Generator, authoring LOD | 4,642 ms (4,552–4,747) | 1,354 ms (1,287–1,426) | ×3.43 |
| Facade, 32 copies of the largest design (Node, 4 paired runs) | 4,696 ms, 1,472 geometries | 87.5 ms, 46 geometries | ×54 |
| Editor open w2, assets' share (6 paired runs) | 1,863 ms (whole open 3,202) | 932 ms (2,274) | ×2.0 (whole ×1.42, range 1.26–1.54) |
| Editor open w3, assets' share | 1,838 ms (3,177) | 789 ms (2,130) | ×2.3 (whole ×1.49) |
| Editor open w7, assets' share | 2,067 ms (3,406) | 1,014 ms (2,356) | ×2.0 (whole ×1.47) |
| Wall rebuild per edit, w5a (editor, 40 paired samples, `aaa77e4`) | 21.5 ms | 10.9 ms | ×1.97 |
| Wall rebuild per edit, w5b | 29.8 ms | 9.7 ms | ×3.07 |

"Open" is `window.nautilus.open()` of the workload after a blank map. It includes the inherited scene's rebuild, about 1.34 s here, with ±15% run-to-run variation. The open of w1 and w4, and of the wall and roof maps, sits within that noise. On `0ba89e0` the w5a wall rebuild was 46.1 ms; `aaa77e4` fixed that regression, found by the paired measurement in `wall-rebuild-0ba89e0.json`.

### Identity

- **Geometry:** all 96 design × LOD outputs of `createBuildingModel` match digests recorded with the reviewed ee7c18e renderer. The Node A/B compares every design's digest against main's again before it times them (48/48 per LOD). `npm run build:buildings` regenerates all 144 export files byte-identical. `catalogue.json` changes in one line (the renderer's hash) and the generated registry in two.
- **Drawn triangles:** for every original design in every editor view (250 views) and every Gross house (168 views), the batches draw exactly the source's visible triangles, keyed by material (`tests/prefab-display-batches.test.mjs`).
- **Walls:** a float32 emulation of the vertex shader reproduces `BoxGeometry(width)` positions and UVs bit for bit, for every vertex at 11 widths (`tests/editor-wall-scene.test.mjs`).
- **Pixels.** SwiftShader editor captures of all 27 workload views (`answer/editor-swiftshader.json`):

  | Views | Pixels that differ from main | Cause |
  | --- | --- | --- |
  | 21 of 27 | none | — |
  | w2 close; w5b overview and cutaway | 7, 1,021 and 76 of 967,296 (max delta 14, 63, 53) | depth ties: every one changes when the frame is redrawn with strict `<` instead of `<=` |
  | w1, w3 and w7 cutaways | 8, 3 and 3 (max delta 1) | baked door leaves |

  The door attribution comes from a control build of `0ba89e0` with door leaves left as separate meshes (`control-doors-unbaked.json`). It is byte-identical to main in all 12 views of w1, w3 and w7. Leaving the leaves unbaked would keep 57% of the building meshes as separate draws.
- **Repeats:** a repeat of main's arm was byte-identical in every view, so SwiftShader is deterministic here. Main ordered same-material meshes by camera distance; a merged buffer has one order, which is why the ties can resolve differently.
- **Integration captures:** in `review:integration`, four of the six captures are byte-identical to main's. The Gross preview and the mobile library differ in 3 and 2 pixels (max delta 10), at the Gross wall seams.

### Gates

| Commit | Gates |
| --- | --- |
| `0ba89e0` | build, `check --tracked`, test, `test:upstream`, `test:package`, `review:integration` |
| `aaa77e4` | all again, with 366/366 tests (main has 357) |

`review:integration` now records a whole frame: `{frame: 1143, shadowPass: 636}`, where main recorded `drawCalls: 1`.

### Behaviour changes

- **Provenance gate.** `tools/prefab-original-catalog.mjs` no longer pins the renderer's source bytes and the catalogue's bytes to ee7c18e. It pins the reviewed geometry, and the catalogue's content apart from the renderer-hash line. The other four input fingerprints are unchanged.
- **Facade.** `loadBuildingAssets` shares one template per original design. Instances share geometry and materials, documented as read-only, and keep independent views.
- **Editor internals and the integration record:**
  - the wall layer has no per-width geometry cache;
  - original-building templates release their opaque source arrays once merged;
  - `review:integration`'s `drawCalls` is now `{frame, shadowPass, view}`.

### Not done, or not verified

- **Roofs:** unchanged. 144 roofs still cost 3 draw groups each per pass (w6). Merging them needs `roof-core`'s per-roof materials reworked.
- **The inherited AFT scene:** a fixed cost in every frame and every open (vendored bytes). The whole-frame speedups are smaller than the assets' own.
- **Placed copies of one design:** still clones that share batch geometry, not instances.
- **Hardware:** phones and other GPUs were not measured.
- **Gross houses in the facade:** still one unbatched model per instance.
- **Other findings:** MF1–MF3 and SF6–SF8 are the architect's and are untouched.
