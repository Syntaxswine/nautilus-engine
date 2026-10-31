# Hostile review, round 4 (0.8 series): the answer to round 3 (`claude/asset-render-speed` at `cb720d8`)

- **Reviewed commit:** `cb720d826d42fd4c79219cffed76c7d8ea3c2c2e` (the record; `git diff d7b38bf cb720d8` touches docs and the changelog only, so the code is the formal runs' `d7b38bf`). Baseline: main 0.10.0 `fb352776b714b097cb1bfb94350f8e18a62bfc52`.
- **Date:** 2026-10-30, 13:20 to 15:45 local. One hostile reviewer (Claude), round 4, in the detached sandbox `<sandbox>` at `cb720d8` (`dist/` built 13:16 from the clean commit). The baseline `<baseline>` (main, `dist/` built) was read only and served as the A arm. Built copies of one commit each, made by `git archive` outside any work tree (`make-tree.mjs`, a stamp names the commit), lived in `<scratch>`: round 3's InstancedMesh build `1518afe`, and `cb720d8` with one edit each (per-copy batches; Q1, Q5, K3 and copy spheres at half radius; Q7, Q8, Q10 and G11 with the documented refresh). Each edited copy's `dist/` differs from the sandbox's in exactly the edited file (`diff -rq`).
- **Judged against:** the owner's goal, **render assets twice as fast** for the massive structures being built, and round 3's findings (MF-B, SF-A to SF-E, N1 to N9). MF1 to MF3 are the architect's: carried at the end, not scored.
- **Labels:** **measured** = run here and quoted; **code-reading** = cited source; **estimate** = arithmetic on measurements; **judgment** = assessment.
- **Rig.** Windows 11 10.0.26200, AMD Ryzen 7 5800X (16 threads), 64 GB, Node v24.15.0, headless Edge 156.0.4314.56 through the Playwright in the Codex runtime. ANGLE **D3D11 on an RTX 3080** for timing (`{"canvas":[1056,916],"multiDraw":true,"gpuTimer":true,"maxTextures":16,"maxCombinedTextures":32,"maxVertexTextures":16}`); **SwiftShader** for pixels and counts. Viewport 1600 × 1100, deviceScaleFactor 1; the editor canvas is 1056 × 916 = 967,296 px.
- **Load.** Every GPU series ran alone, one after another (`timing/load.txt`): 13:31–14:53 and 15:28–15:30, CPU load 2–10 % sampled between series, 46–48 GB free. Codex processes did not run heavy work in that window as far as the samples show. Every timing is paired (two pages of one Edge, blocks A B B A), repeated (4 runs, the beyond-the-record maps 2) and given as a median with its range, with each map's blank (same code in both arms) as its null control. Pixels, counts and mutation verdicts are load-independent; they ran after the timings.

## Method

1. **The answer's own instrument on a subset** (`tools/bench-asset-rendering.mjs --editor --assets-only --expect`, GPU, 4 runs, 20 frames × 4 blocks, its formal options): main 0.10 against the candidate on w1, w4 (unlit, + w0 blank), l1, l4, l7 (six fires, + blanks) (`timing/gpu-subset.json`, `tables.mjs`).
2. **Paired arms the record compared across sessions.** The same instrument, A = round 3's InstancedMesh build (`1518afe`), B = the candidate (`timing/inst-vs-copybatch.json`); and A = the candidate with the editor's own `instancing: false` (per-copy display batches, round 3's E1, the limit of the record's proposed "batch only neighbouring copies" for sparse repeats), B = the candidate (`timing/percopy-vs-copybatch*.json`).
3. **CPU profiles** of the isolated asset frames (the answer's `profile-frames.mjs`, its probe path only changed), InstancedMesh against CopyBatch (`profiles/`).
4. **A control for the GPU timer**: the same frames with the page's CPU throttled ×3 (CDP), so the GPU work is unchanged (`timer-control.mjs`).
5. **Lamp workloads the record did not measure** (`beyond-near-maps.mjs`, built as `workloads.mjs` builds its lamp maps, each with its own blank), all among the 32 Gross houses: 18 fires (three lanes of six); 12 electric lamps (streetlights and floor lamps) at 22:00; 6 spot lights (`lightMode: 'on'`). Main against the candidate, 2 runs (`timing/beyond-near-gpu.json`). A first set put the extra lamps beyond the houses' reach; it is kept (`timing/beyond-gpu.json`), not used.
6. **Pixels** (SwiftShader, reduced motion, `pixels.mjs` with the bench's own `capture()` and strong tie oracle, `compare-px.mjs`): the candidate against round 3's InstancedMesh build (which draws every copy in every camera, so any copy CopyBatch culls wrongly shows), against itself with `WEBGL_multi_draw` hidden before the renderer starts (three's per-sub-draw fallback), and against Q1 (shadows culled by the view camera) as the control that must differ; lamp-lit l1 and l4 and unlit w1 and w4, in five views: overview, close, far, level-0 cutaway and **level-1 cutaway** (new).
7. **Counts.** Culled asset draws from real (unstubbed) SwiftShader frames against the fixture's SwiftShader rig, which was pinned stubbed (`culled-real.mjs`); the headless count's level-1 cutaway, pinned but never checked in a browser, against the real editor (`upper-check.mjs`); the CI job's log on GitHub.
8. **Mutation** (`mutate-r4.mjs`, round 3's rules plus a memory watchdog that stops only its own child): 12 mutants of the new code aimed at what the answer's harness did not try, including the editor's drive path and settings `Material.toJSON` does not serialize; two of the answer's own falsifiers as controls. Survivors against the whole suite and `tools/check.mjs`; those the check stops only as stale exports then through the documented refresh, with G11 as the refresh's control (`refresh-check*.sh`). Q5 and K3 (control) also built into copies and run through the CI gate (`gate-mutants/`), and Q5 through the editor's own `setOptions` path (`drive-path.mjs`).
9. **Memory and the edit path** (`memory-probe.mjs`, `edit-timing.mjs`): GPU resources and the JS heap after 40 edits and 80 view toggles (main, InstancedMesh, CopyBatch), and edit and toggle latency, main against the candidate, paired.
10. **The repository gates** (`gates.sh`) on the clean sandbox after everything else.

## Score

**7.5 / 10 for the answer**, against the goal and round 3's findings. MF1 to MF3 remain open engine items (unscored; see the end).

What the answer gets right, reproduced here:
- **MF-B is closed where it was measured.** With six fires, 32 copies draw 8.33 M asset triangles at the overview, against main's 8.15 M and round 3's InstancedMesh's 52.62 M (paired here: 52.62 M → 8.33 M; close 26.96 M → 3.37 M). Against the editor's own per-copy batches, CopyBatch draws exactly the same triangles in all 16 map-views measured (it culls each copy by the same sphere), with 1.1 to 4 times fewer draws. **And it culls correctly in every camera measured:** on SwiftShader its frames are byte-identical to round 3's InstancedMesh build, which draws every copy in every camera, in 20 of 20 views (lamp-lit and unlit, 32 copies and the 32 Gross houses, overview, close, far, level-0 and level-1 cutaway), and to itself with `WEBGL_multi_draw` hidden (three's per-sub-draw fallback) in 20 of 20. The probe can fail: copy spheres at half radius differ in 7 of 10 views (up to 15,645 px, blobs up to 8,715 px), and shadows culled by the view camera (Q1) in 4 of 20.
- **The speed reproduces against main.** The answer's instrument and options on a subset (13:31–13:51), assets alone: 32 copies lit ×3.08 / ×2.06 / ×2.25 / ×2.09 (overview / close / far / cutaway), Gross lit ×2.68 / ×2.14 / ×1.86 / ×1.39, mixed lit ×2.97 / ×3.54 / ×4.04 / ×1.97, 32 copies unlit ×3.79 / ×2.05 / ×2.39 / ×3.19, Gross unlit ×5.93 / ×3.34 / ×3.23 / ×3.12; nulls ×0.93–1.05. Every one sits inside or beside the record's formal range; `--expect` 24 headless and 36 culled checks equal, none refused.
- **The CI gate is real.** The `asset-counts` job ran on GitHub on `cb720d8` (17:16–17:21 UTC, Linux Chromium, SwiftShader), matched the fixture's SwiftShader rig and passed; its logged counts equal that rig's pinned counts in all 72 map-views. Counts from real frames equal the counts pinned with stubbed draws in 36 of 36 D3D11 map-views (my GPU run) and in 16 of 16 SwiftShader map-views (the CI rig, which the record had pinned stubbed only). The headless count's level-1 cutaway, pinned but never checked in a browser, equals the real editor's in 9 of 9 maps (with the exterior and level-0 cutaway as controls, 27 of 27). The answer's own falsifiers still die here (Q0a, Q0b).
- **The digest now covers every serialized material setting**, G11 dies, and the recorder re-derives the fixture from the reviewed renderer (`node tools/record-building-geometry.mjs`: "The fixture equals the reviewed renderer's digests", in the gates; G11 through the documented refresh is refused by the registry refresh, the check, the digest test and the suite).

What holds the score down:
- **MF-C: batching copies costs more than it saves wherever copies are sparse or a camera sees few of them.** Paired against the editor's own per-copy batches (`instancing: false`), CopyBatch makes the lamp-lit Gross district's assets 1.6 to 2.1 times slower in all four views, and is slower in 8 of the 16 changed views measured (level in 2, faster in 6: the dense copies). That, not the inherited light renderer the record names, is why the lit Gross far view and cutaway miss ×2; with per-copy batches they would clear it (estimate ×3.4 and ×2.3 against main). Unlit, where no setup is empty, CopyBatch is still ×0.78–0.80 of round 3's InstancedMesh on the Gross houses, so the record's diagnosis (setups that find no copy) is half the cause: a CopyBatch draw costs about 2.4 plain draws on this rig.
- **SF-F to SF-I:** the gate still cannot see the editor's own drive path (Q5: every Gross house stays uncut in the editor's cutaway, and every count passes); the digest still misses settings three.js does not serialize (Q7 halves every original building's colour, Q8 cuts every one 3 m up in the editor; both pass the documented refresh, the check and all 603 tests); the bench's GPU time is the command feed (×4.4 with the CPU throttled ×3 and the GPU work unchanged), so "the GPU's own time falls ×4.4–9.7" is not shown; display batches under lamps draw 10 to 31 % more triangles than main, where the docs say 1.1 to 5.1 %.

The answer closed round 3's must-fix with a mechanism that is correct in every camera I could put it in, and turned its gate into a live CI check whose counts reproduce on GitHub, on both rigs, from real frames and through the editor's own classes; round 3's survivors die. It is held at 7.5 because that mechanism costs more than it saves on the sparse, lamp-lit repeats where the remaining misses are (which the code's own option would avoid, and the record attributes elsewhere), and because three of the record's claims do not hold as stated: the GPU's own time, the lit cutaways' cause, and a digest that covers a setting nobody listed.

## MUST-FIX

### MF-C (new, measured). Batching copies costs more than it saves wherever copies are sparse or a camera sees few of them; on the lamp-lit Gross district it holds two views below ×2

**Reproduction (measured).** The answer's instrument and formal options, two pages of one Edge, A B B A blocks, 4 runs, RTX 3080, quiet box (14:05–14:20, load 3–10 %; `timing/percopy-vs-copybatch.json`, `timing/percopy-vs-copybatch-w1.json`). A = the candidate built with one edit, the editor's own `{instancing: false}` at `apps/editor/prefab-scene.js:91` (every copy draws its own display batches, which the renderer culls copy by copy: round 3's E1, and the record's proposed "batch only neighbouring copies" in its limit for sparse repeats); B = the candidate. A's `dist/` differs from the sandbox's in that one file. Assets alone, A/B (above 1: CopyBatch faster), median of runs (range):

| Workload | Overview | Close | Far | Cutaway | Whole frame (o / c / f / cut) |
| --- | --- | --- | --- | --- | --- |
| w1, 32 copies of one design, unlit | ×1.25 (1.23–1.28) | ×1.08 (1.03–1.13) | ×1.14 (1.05–1.19) | ×2.00 (2.00–2.06) | ×1.14 / 1.05 / 1.00 / 1.15 |
| l1, the same, six fires | ×1.04 (1.01–1.08) | **×0.87 (0.84–0.89)** | **×0.93 (0.85–0.95)** | ×1.33 (1.28–1.37) | ×1.01 / 1.02 / 1.05 / 1.08 |
| w4, 32 Gross houses (13 designs), unlit | ×0.98 (0.92–1.13) | **×0.74 (0.73–0.77)** | **×0.75 (0.64–0.85)** | ×1.02 (0.94–1.05) | ×0.99 / 0.77 / 0.80 / 1.02 |
| l4, the same, six fires | **×0.62 (0.57–0.70)** | **×0.47 (0.44–0.51)** | **×0.54 (0.51–0.60)** | **×0.61 (0.56–0.68)** | ×0.82 / 0.73 / 0.71 / 0.83 |
| Blank maps (null) | ×0.95–1.00 | ×0.96–1.00 | ×0.92–1.00 | ×0.92–1.03 | ×0.98–1.04 |

On the lit Gross houses the assets take 13.9 / 5.2 / 9.1 / 16.5 ms per frame with per-copy batches and 23.3 / 11.0 / 16.9 / 26.9 ms with CopyBatch. Both arms draw exactly the same triangles in all 16 map-views (`2.754 M` at the lit Gross overview); CopyBatch issues fewer draws (820 + 1,768 → 336 + 1,526 there; 446 + 352 → 200 + 104 at the w1 overview).

**Why (measured).**
- **A CopyBatch draw costs about 2.4 plain draws here.** At the unlit w4 overview, 820 per-copy draws take the time of 336 CopyBatch draws (×0.98). Against round 3's InstancedMesh build (`1518afe`, paired the same way, `timing/inst-vs-copybatch.json`), with the same 336 draws and no setup that finds nothing (every copy is in the view and in the sun's shadow camera), CopyBatch takes 1.27 times as long: ×0.78–0.80 in all four w4 views, CPU submit 1.27 → 1.86 ms at the overview. CPU profiles of the isolated frames (60 frames each, `profiles/`) put the difference in every setup's own work: binding the batch's own two textures (`bindTexture` native 0.60 ms per frame + three's 0.56 + `activeTexture` 0.44 on lit l4), setting the three batching samplers (`setValue` +0.77, `setOptional` 0.39), CopyBatch's own camera test (`onBeforeRender` 0.32, `setFromProjectionMatrix` 0.31), and the multi-draw call (`multiDrawArraysInstancedWEBGL` 0.99 ms for 1,864 draws, against 0.43 ms for InstancedMesh's 4,603 `drawArraysInstanced`), plus a longer end-of-frame wait for the GPU process (`readPixels` +1.16 ms).
- **Under lamps the union sphere multiplies the setups**, as the record says: at the lit Gross overview 4,601 CopyBatch setups (1,862 that draw, 2,739 that draw nothing) against 2,588 per-copy draws. At about the same cost each, that is the lit gap's size.
- So the record's diagnosis is half the cause, and its attribution of the lit cutaways is wrong for the Gross houses: "In the two lit cutaways the inherited light renderer dominates" — with per-copy batches the same cutaway's assets take 16.5 ms, not 26.9.
- The record's "slower than round 3's instancing" compared ratios against main from different sessions; paired, it holds (lit Gross ×0.74–0.85, unlit ×0.78–0.80; lit copies ×1.24–1.78 the other way), but whole frames of the lit copies are ×0.94–1.04, so on this rig CopyBatch's gain over InstancedMesh is the triangle count, not the frame.

**Against the goal (estimate: the products of two paired series, main → CopyBatch at 13:31–13:51 and CopyBatch → per-copy at 14:05–14:16).** With per-copy batches the lit Gross district would be ×4.3 / ×4.6 / ×3.4 / ×2.3 against main, where CopyBatch gives ×2.68 / ×2.14 / ×1.86 / ×1.39. With more lamps among the same houses the CopyBatch cutaway falls further (18 fires ×1.32, 12 electric lamps at 22:00 ×1.13, main → candidate; the per-copy arm was not timed there). On dense copies the choice reverses: unlit w1 CopyBatch is ×1.08–2.00 faster than per-copy batches.

**Why must-fix (judgment).** It is not a regression against main (CopyBatch is ×1.4–2.7 faster than main on the lit Gross houses). But the answer's headline mechanism is what keeps two of the record's five lit misses below ×2, on one of the benchmark's own massive-structure workloads with ordinary lamps; the code already has the configuration that clears them; and the record names another cause. Its proposed next step points the right way for sparse repeats, unmeasured.

**Direction.**
- Choose per design (better, per camera) between CopyBatch and per-copy batches by the copies a camera is expected to draw per batch; the break-even measured here is about 2.4. The record's single-linkage clusters are one way.
- Cut the per-setup cost: one matrices texture and one copy table shared by every CopyBatch (no texture rebinding between batches), and skip the per-copy loop when the union sphere lies wholly inside the camera.
- Measure each step against `instancing: false` in the same pairing, and re-state the lit cutaways' cause.

## SHOULD-FIX

| # | Finding | Evidence | Direction |
| --- | --- | --- | --- |
| SF-F | **The gates see the editor's layers, not the editor's drive path** (SF-A, partly). The headless count constructs the editor's scene classes (E1/E2 die), but drives `prefabs.update`, `rebuildWalls` and `slopedRoofs.update` itself; the bench's `cutaway()` calls `prefabs.update` itself after `setOptions` (`tools/bench/editor-probe.js:59`). The editor's own path is `setOptions` → `rebuild()` (`editor-3d-scene.js:119`, `apps/editor/prefab-scene.js:92`). | **Q5** (`prefab-scene.js:92`: the editor's `rebuild()` asks the prefab layer for all levels) passes the module tests (38 of 38), the whole suite (603 of 603), `tools/check.mjs`, the headless count, and the CI gate built into a copy (18 headless and 72 culled checks equal, none refused; K3 built the same way is refused in 15 map-views). Not equivalent: through `setOptions` alone, Q5's cutaway draws the exterior, 168 batch groups and 0.83 M asset triangles, where the candidate draws 149 and 0.38 M; through the bench's path both draw 149 and 0.38 M (`drive-path.json`, w4). In the editor every Gross house would stay uncut in a level view, and every gate passes. | Drive the views through the editor's entry points (`setOptions`, then await the layer's pending update) in the bench and the headless count, or test that `InspectionScene.rebuild`/`update`/`open` pass their options unchanged. |
| SF-G | **The digest covers what three.js serializes, not every setting that changes a building** (SF-E, partly). `tools/building-geometry.mjs:8-10` says a material is "every setting three.js serializes (Material.toJSON) … so a setting nobody listed is covered too", and the CHANGELOG that "an unlisted setting such as an emissive term cannot change a reviewed building unseen". `Material.toJSON` (vendored `three.core.js:16865`) does not serialize `onBeforeCompile`, `customProgramCacheKey`, `clippingPlanes`, `clipShadows` or `defines`, and the node line (`building-geometry.mjs:21-25`) has no `renderOrder`, `layers`, `frustumCulled` or custom depth and distance materials. | **Q7** (an `onBeforeCompile` that halves the colour of every original building material), **Q8** (a clipping plane 3 m up on every material: the editor sets `localClippingEnabled`, so every original building would be cut 3 m up in it) and **Q10** (glass batches sorted first) pass the digest, catalogue, facade and batch tests (22 of 22) and the whole suite (603 of 603); `tools/check.mjs` stops them only as stale exports. After the documented refresh, as round 3 ran it for G11 (`build-building-assets`, then `prefab-original-catalog --write`, which re-verifies the digests), all three pass the refresh, the check, the 22 and the 603 (`mutation/refreshed/`). Control: G11 through the same pipeline is refused by the registry refresh, the check, the digest tests and the suite. | Key what the renderer compiles and clips: `customProgramCacheKey()`, the result of running `onBeforeCompile` on a fixed shader stub, and the clipping settings; add `renderOrder`, `layers.mask`, `frustumCulled` and custom depth and distance materials to the node line, each with a mutant in the digest test as for G11; until then say "every serialized setting". |
| SF-H | **The bench's GPU time is the command feed, so "the GPU's own time falls" is not shown** (SF-D, partly). The record: "The GPU's own time falls too: 32 copies lit ×4.4–9.2, unlit ×3.4–9.7 … So the isolated ratios are not CPU savings bought with GPU time." TIME_ELAPSED runs from the frame's first command to its last, idle gaps included (`editor-probe.js:11`), and these frames are CPU-bound. | **Control** (`timer-control.json`, l1 lit overview, the same frames and draws with the page's CPU throttled ×3 by CDP): main's assets-only "GPU time" 23.05 → 100.64 ms (×4.4, CPU submit 25.10 → 110.55 ms), the candidate's 6.14 → 19.36 ms; GPU/CPU stays 0.91–0.94 for main. It does flag a GPU-bound frame (round 3's InstancedMesh, lit l1: GPU 7.61 ms against CPU 5.50 ms), but its ratio between two CPU-bound arms is the ratio of their feeds. What does show parity of GPU work is the triangle count (+2.2 to +4.0 % for the lit copies) and the SwiftShader proxy (×0.96–1.00 lit), both in the record. | Report the timer only where it exceeds the CPU submit, and lean on triangles and the proxy for the GPU side; reword the record and `docs/asset-rendering-benchmark.md`. Add the lit Gross district to the proxy (it is not in the formal SwiftShader set, and its triangles grow most). |
| SF-I | **The documented triangle cost of display batches under lamps is understated** (SF-C, partly). `docs/building-prefabs.md:72` still says a display batch culled whole per copy "can draw somewhat more triangles than separate meshes would (round 2 measured +1.1 % … +5.1 % …)". | Culled asset triangles, main → candidate (real frames, `--assets-only`): lit Gross +11.5 / +16.2 / +19.8 / +10.8 % (six fires), +16 / +22 / +25 / +15 % (18 fires among the houses), +20 / +29 / +31 / +18 % (12 electric lamps at 22:00); the lit district with no repeated design (no CopyBatch at all) +10 to +14 %; unlit Gross far view +10.1 %. CopyBatch adds none (per-copy batches draw the same). On a renderer that pays per triangle this is the part of the asset work that grew. | State the lamp-lit figures; consider splitting a Gross house's batch per floor block, which the docs already name as the next step for close views. |

## NIT

- **N1. "At least ×2 in 41 of the 46 views" counts medians that sit within the null controls' spread of ×2.** The record's blanks range ×0.90–1.06 (`docs/asset-rendering-benchmark.md`), and several medians are within 10 % of ×2 (w1 close ×1.89, l1 close ×2.07, l4 close ×2.09, l4 far ×1.95, l7 cutaway ×1.91). In my subset the medians clear ×2 in 17 of 20 views, the whole ranges in 14 of 20; the record's subset gives 16 of 20. State the count with the ranges.
- **N2. CopyBatch branches no provider reaches.** Q2 (a sub-draw ignores the geometry's draw range), Q3 (an indexed geometry's start in elements, not bytes) and Q4 (the frustum ignores the batch's own transform) survive the whole suite and the check: every display batch is non-indexed and whole, and every CopyBatch sits at the scene root (`copy-batch.js:44-46`). Equivalent today; a provider with indexed or ranged batch geometry would meet these lines untested.
- **N3. The CI job's log never says what it compared.** It prints each map's counts and `[]`; the record's "18 headless and 72 culled checks" is in the JSON artifact only. A run that compared nothing would look the same unless it refuses (it does refuse an empty culled set and a missing rig). Print the number of checks.
- **N4. The bench names an extracted tree by the enclosing work tree's HEAD.** `identity()` (`tools/bench-asset-rendering.mjs:51`) asks `git rev-parse HEAD` first, so a built copy inside a repository is labelled with that repository's commit; the stamp is read only outside one. (This round's and round 3's copies live outside any work tree.)
- **N5. Every page that batches a design logs three's deprecation warning** ("renderMultiDrawInstances has been deprecated and will be removed in r184"), once (`pixels/result.json`). The contract test pins the path; the editor's console carries the warning.
- **N6. No benchmark map has more than six lamps, or electric lamps at night.** Measured here (The goal), 18 fires among the Gross houses take the cutaway gain to ×1.32 and 12 electric lamps at 22:00 to ×1.13, missing ×2 in three of four views. Add one of each to the maps; the culled counts would then pin them per rig, as the record says.
- **N7. Q1 dies by a TypeError, not by an assertion.** The camera test's `shadow()` helper (`tests/editor-copy-batch.test.mjs:31`) passes `null` where the renderer passes the view camera, so any mutant that reads it crashes. A real view camera there would let the lamp assertion decide; as written the test never checks what such a mutant would draw (the pixel probe does catch Q1, on the copies' maps).

## Claims re-checked

| # | Claim (the record's "answer to round 3, measured") | Verdict | Numbers (this round) |
| --- | --- | --- | --- |
| 1 | **MF-B**: every camera (the view, the sun, each lamp face) culls each copy by the sphere its own mesh would have | **Holds** | The headless lamp/sun/view test and its controls die as they should (Q0b, Q1 killed). Triangles equal per-copy display batches' in 16 of 16 map-views; lit copies 8.33 M against round 3's 52.62 M, paired. Pixels: see 4. |
| 2 | The copy table is the identity, written once (the per-camera rewrite stalled D3D11, 14.9 against 7.2 ms) | **Holds** (code, test); the stall not re-measured | `copy-batch.js:35` writes it once; `onBeforeRender` never touches it; the test pins one upload (`_indirectTexture.version === 1`). |
| 3 | `colorTexture = null` avoids a program re-derivation per draw (r180) | **Holds** (code-reading) | `three.module.js:17102` re-derives when `object.colorTexture !== null`; `BatchedMesh` leaves it `undefined`; the test pins both. |
| 4 | Pixels byte-identical to round 3's InstancedMesh build | **Holds, and further than the record measured** | SwiftShader, reduced motion, the bench's cameras (`pixels/result-compare.json`): 0 differing pixels in 20 of 20 views (l1 and l4 lamp-lit, w1 and w4 unlit; overview, close, far, level-0 and **level-1 cutaway**). The record measured lamp-lit identity on the 32 copies' overview and close view only. Controls: copy spheres at half radius differ in 5 of 5 lamp-lit Gross views (169 to 15,645 px) and in the unlit copies' close and far views (82, 8,960 px); Q1 (shadows culled by the view camera) differs in the lit copies' close view (2,969 px, one blob of 2,930), their level-0 and level-1 cutaways (135, 56 px) and the unlit close view (695 px), and not at all on the Gross maps, whose off-screen copies cast nothing into these cameras. |
| 5 | Triangles equal per-copy culling | **Holds** | Equal to per-copy display batches in 16 of 16 map-views; against main's separate meshes +2.2 to +4.0 % (lit copies), +11 to +20 % (lit Gross: SF-I). |
| 6 | Runs: one instanced sub-draw per run of consecutive copies in view, byte-identical to per-copy sub-draws | **Holds** | With `WEBGL_multi_draw` hidden (three's per-sub-draw fallback, `_gl_DrawID` uniform) the frames are byte-identical to the run path in 20 of 20 views; calls rise as stated (lit Gross overview 6,431 → 8,197 whole-frame calls; three logs "WEBGL_multi_draw extension not supported" once). |
| 7 | Without `WEBGL_multi_draw` each copy in view is a plain sub-draw | **Holds** (emulated in Edge only) | As 6. |
| 8 | The lit Gross shortfall: 2,739 setups per frame find no copy; an InstancedMesh "paid the same setups but drew in them, which this GPU absorbs" | **Partly** | Paired: CopyBatch is ×0.74–0.85 of InstancedMesh lit, but also ×0.78–0.80 unlit, where no setup is empty; per-copy batches beat CopyBatch ×1.6–2.1 lit (MF-C). CopyBatch's 4,601 setups cost more than InstancedMesh's 4,603 draws (profiles). |
| 9 | Merged roofs culled as one mesh: 0.10 M against main's 0.01 M roof triangles with six fires; lit close view ×1.86 | **Holds** for the counts (fixture; the CI log: `l6` 10 + 185 draws, 0.10 Mt); the timing not re-measured | |
| 10 | "In the two lit cutaways the inherited light renderer dominates" | **Fails for the Gross houses** | With per-copy batches the lit Gross cutaway's assets take 16.5 ms, with CopyBatch 26.9 ms (MF-C). Not tested for the mixed district (no repeated design, so no CopyBatch). |
| 11 | The next step: batch only neighbouring copies | **Partly** | Its limit for sparse repeats (per-copy batches) is measured ×1.6–2.1 faster lit; it leaves CopyBatch's per-draw cost (×1.27 of InstancedMesh unlit) where copies stay batched. |
| 12 | Formal GPU: assets at least ×2 in 41 of 46 views (unlit 26 of 27, lit 15 of 19) | **Holds within noise** | My subset, the same options: medians clear ×2 in 17 of 20 views (misses: lit Gross far ×1.86 and cutaway ×1.39, lit mixed cutaway ×1.97); the record's same 20 views give 16 (its w1 close ×1.89, mine ×2.05, range 1.98–2.21). Whole ranges clear ×2 in 14 of 20 (N1). |
| 13 | "The GPU's own time falls too": 32 copies lit ×4.4–9.2, unlit ×3.4–9.7 | **Fails as stated** | The timer follows the CPU feed: ×4.4 with the CPU throttled ×3 and the same draws (SF-H). |
| 14 | SwiftShader proxy: lit copies at parity (×0.96–1.00), unlit ×0.95–0.98, Gross and mixed ×1.01–1.04; the rest is "the batching shader's reads per vertex" | **Not re-measured**; the mechanism not isolated | The lit Gross district is not in the proxy set; its triangles grow most (SF-I). |
| 15 | SF-A: the count gate constructs the editor's own scene classes; E1 and E2 fail it | **Holds; the drive path is outside** | Q0a (E1) dies by the count test. Q5 (the editor's `rebuild` never cuts prefabs) passes everything (SF-F). The level-1 cutaway, pinned headless and never checked in a browser, equals the real editor's in 9 of 9 maps (27 of 27 with the exterior and level-0 cutaway). |
| 16 | Bounds, disposal, shared-view, pending-load tests | **Holds** (read; Q0b; the memory probe) | After 40 edits and 80 view toggles (w1): GPU geometries and textures unchanged in all three arms (CopyBatch: 111 and 49, two textures per batch), JS heap +1.1 MB (main +1.0, InstancedMesh +0.9). Edit and view-toggle latency, paired (A B B A blocks of 10, `timing/edit-*.json`, 15:28–15:30): 32 copies edit 181 → 181 ms, toggle 107 → 101 ms; Gross edit 184 → 203 ms (+10 %), toggle 116 → 119 ms. |
| 17 | Culled counts pinned per rig; 71 of 72 agree across rigs; stubbed counts equal real frames in all 72 map-views (GPU) | **Holds** | 71 of 72 in the fixture (`l4` far: 2 against 1 light passes); real D3D11 frames equal the stubbed pins in 36 of 36 map-views (my run), real SwiftShader frames the SwiftShader pins in 16 of 16 (`culled-real.mjs`; the record had no unstubbed check on that rig, the one CI uses). The key (canvas, `WEBGL_multi_draw`, texture units) is what `lightPasses` and the frusta read. |
| 18 | SF-B: a CI job runs `review:asset-counts` (161–208 s locally) | **Holds** | Ran on GitHub on `cb720d8`, bench step 5 min, passed; its logged counts equal the SwiftShader rig in 72 of 72 map-views; K3 is refused by the same gate in 15 map-views here, Q5 is not. |
| 19 | SF-C: the docs state batching's pixel and triangle costs | **Partly** | The pixel figures match the formal JSON (20 / 128 / 682 / 11 and 30 / 215 / 1,402 / 54; 1,402 px = 0.145 %); the display batches' lamp-lit triangle cost is not stated (SF-I). |
| 20 | SF-D: GPU timer queries, the labelled direct figure, the proxy in the formal run | **Partly** | Labels and proxy hold; the timer's reading does not (SF-H). |
| 21 | SF-E: the digest key is `Material.toJSON` with texture settings; re-recorded from the reviewed renderer; G11 dies | **Partly** | The recorder reproduces the fixture from `ee7c18e`'s own renderer (96 digests, in the gates); G11 dies (the control in SF-G); the key misses what `toJSON` does not serialize (Q7, Q8, Q10 survive the documented refresh: SF-G). |
| 22 | N1–N9 answered as listed | **Holds** (read) | N1 `display-batches.js:120`; N2 `single()` refuses and the header says one shadow map; N3 changelog; N4 the strong oracle and blobs in the bench; N5 the benchmark doc; N6 the nested provider test; N7 plain values with messages; N8 names tested; N9 the guard and its seven cases. |
| 23 | Mutation: 46 mutants; the CI gate refuses K3, K2, P1, R1 | **Controls reproduce** | Q0a and Q0b (the answer's P1 and K3) die in phase 1; K3 built in is refused by the CI gate (15 map-views). The answer's harness was not re-run. |
| 24 | Gates pass (on `2039b21`) | **Holds** (on `cb720d8`) | All twelve gates exit 0, `npm test` 603 of 603 (Gates). |

## The goal

**Against main 0.10, the answer's instrument and formal options, RTX 3080** (assets alone on this rig, a lower bound where costs add; median of runs, range; `timing/*-tables.md`):

| Workload | Overview | Close | Far | Cutaway | Whole frame (o / c / f / cut) |
| --- | --- | --- | --- | --- | --- |
| 32 copies, unlit (w1) | ×3.79 (3.59–4.01) | ×2.05 (1.98–2.21) | ×2.39 (2.13–2.71) | ×3.19 (2.97–3.28) | ×2.35 / 1.76 / 1.71 / 1.36 |
| 32 Gross houses, unlit (w4) | ×5.93 (4.52–6.06) | ×3.34 (2.93–4.03) | ×3.23 (2.92–3.95) | ×3.12 (2.45–3.74) | ×3.69 / 2.65 / 2.60 / 2.09 |
| 32 copies, six fires (l1) | ×3.08 (2.86–3.22) | ×2.06 (2.04–2.10) | ×2.25 (2.08–2.34) | ×2.09 (1.84–2.23) | ×1.65 / 1.45 / 1.63 / 1.20 |
| Gross, six fires (l4) | ×2.68 (2.29–2.96) | ×2.14 (1.71–2.55) | **×1.86 (1.62–2.18)** | **×1.39 (1.27–1.55)** | ×2.04 / 1.91 / 1.77 / 1.31 |
| Mixed, no repeats, six fires (l7) | ×2.97 (2.69–3.25) | ×3.54 (3.16–4.10) | ×4.04 (3.43–4.66) | **×1.97 (1.85–2.13)** | ×2.05 / 2.12 / 2.31 / 1.45 |
| Gross, 18 fires among the houses¹ | ×2.92 (2.51–3.33) | ×2.17 (1.86–2.48) | ×2.12 (1.73–2.50) | **×1.32 (1.18–1.45)** | ×2.02 / 1.73 / 1.74 / 1.18 |
| Gross, 12 electric lamps at 22:00¹ | ×2.34 (2.19–2.50) | **×1.76 (1.64–1.87)** | **×1.72 (1.59–1.86)** | **×1.13 (1.08–1.18)** | ×1.79 / 1.50 / 1.48 / 1.09 |
| Gross, 6 spot lights¹ | ×3.59 (3.39–3.80) | ×2.86 (2.58–3.13) | **×1.94 (1.93–1.96)** | ×2.03 (1.95–2.10) | ×2.38 / 2.26 / 1.66 / 1.53 |
| Blank maps with the same lamps (null) | ×0.93–1.09 | ×0.99–1.10 | ×0.95–1.05 | ×0.95–1.05 | ×0.95–1.05 |

¹ Built here (`beyond-near-maps.mjs`), 2 runs, 14:39–14:53. A first set (`beyond-maps/`, `timing/beyond-gpu.json`) put the extra lamps in lanes beyond 30 m of the houses (the houses occupy y 6–28), so they added light passes but no lit faces on the houses; it is kept, not used for the verdict.

**Judgment on the goal.** On a desktop RTX 3080 the assets render at least twice as fast as on main 0.10 in most views: unlit districts in every view, and the lit copies; the record's "41 of 46" reproduces within noise (17 of 20 here). It is **not met** for lamp-lit sparse repeats in close-to-cutaway views: the lit Gross district's far view and cutaway with six fires, its cutaway with 18 fires, and three of four views with electric lamps at night, where the cutaway gains only ×1.13. MF-C says why, and that the code already holds the configuration that would clear the six-fire views (estimate ×3.4 and ×2.3). Whole frames, what a user sees, gain ×1.65–3.69 at the overview and ×1.09–2.09 in cutaways; the candidate's lamp-lit frames still take 8 to 139 ms on this GPU (six fires on the Gross houses 21–50 ms, eighteen 59–139 ms). Phones were not measured: the candidate's GPU work is about main's (triangles +2 to +4 % for copies, +11 to +31 % for lit Gross display batches), so a GPU-bound device gains little where a draw-bound one gains about this much (the record's own SwiftShader proxy: parity, ×0.95–1.04). What remains: MF-C; a GPU-bound measurement (the proxy on the lit Gross district at least); splitting Gross batches per floor block to give back the lamp-lit triangles; and the inherited light renderer where no copy repeats (the lit mixed cutaway, ×1.97).

## Mutation results (`mutation/`)

**This round's 12 mutants** (`mutate-r4.mjs`; phase 1 against the module tests, every survivor then against the whole suite and `tools/check.mjs`). HEAD `cb720d8`, status clean before and after each mutant and phase, every file restored and hash-checked; no invalid needle, no null exit, no cancelled test; the memory watchdog never fired (free memory stayed at or above 37 GB). Phase 1 18:53–19:04 UTC (14:53–15:04 local), the confirmation after it.

| Mutant | What it does | Phase 1 (module tests) | Whole suite + check |
| --- | --- | --- | --- |
| Q0a (control, the answer's P1 / round 3's E1) | the editor builds its prefab layer with `instancing: false` | **killed** (the count gate) | — |
| Q0b (control, the answer's K3) | no per-copy culling | **killed** (the camera test) | — |
| Q1 | a shadow camera culls copies by the view camera | **killed** (the camera test, by a TypeError: N7) | — |
| Q2 | a sub-draw ignores `geometry.drawRange` | survived | survived (603 of 603; check exit 0) |
| Q3 | an indexed geometry's start counted in elements, not bytes | survived | survived (603 of 603; check exit 0) |
| Q4 | the frustum ignores the batch's own transform | survived | survived (603 of 603; check exit 0) |
| Q5 | the editor's `rebuild()` asks the prefab layer for all levels | survived | **survived** (603 of 603; check exit 0); also the CI gate built in (`gate-mutants/q5.json`) |
| Q6 | the editor's local clipping off (pre-existing line; a probe of the gates: Gross cutaways stop clipping their walls) | survived | **survived** (603 of 603; check exit 0) |
| Q7 | an `onBeforeCompile` halves every original building's colour | survived | survived (603 of 603); `tools/check.mjs` stops it only as stale exports. **After the documented refresh: survived** (exports, registry, check, 22 of 22, 603 of 603; `mutation/refreshed/`) |
| Q8 | a clipping plane 3 m up on every original building material | survived | survived (603 of 603); `tools/check.mjs` stops it only as stale exports. **After the documented refresh: survived** (exports, registry, check, 22 of 22, 603 of 603; `mutation/refreshed/`) |
| Q9 | every original batch geometry draws one triangle (`setDrawRange(0, 3)`) | **killed** (`window and door apertures are real holes …`) | — |
| Q10 | glass batches drawn first (`renderOrder -1`) | survived | survived (603 of 603); `tools/check.mjs` stops it only as stale exports. **After the documented refresh: survived** (exports, registry, check, 22 of 22, 603 of 603; `mutation/refreshed/`) |

What the survivors say:
- **Q2, Q3, Q4 are branches no provider reaches** (every display batch is non-indexed, whole, and its CopyBatch sits at the scene root). Equivalent today; they are what a nested or indexed provider would meet first (N2).
- **Q5: the gates see the layer, not the editor's drive path** (SF-F). Q5 also passes the CI gate built into a copy: 18 headless and 72 culled checks equal, none refused (`gate-mutants/q5.json`), where K3 built the same way is refused in 15 map-views (`gate-mutants/k3.json`).
- **Q6: no gate sees a pixel-only change.** Local clipping off leaves every count unchanged (code-reading: clipping planes act per fragment); only a pixel comparison would show it (SF-B's direction from round 3, declined in the record for a reason that holds: a tolerance is needed).
- **Q7, Q8, Q10: the digest covers what three.js serializes, no more** (SF-G).

## Gates on `cb720d8` (`gates/summary.txt`, logs in `gates/`)

Run one after another on the clean sandbox (`git status --porcelain` empty before and after), 15:30:10–15:35:34, load 8 % at the start:

| Gate | Exit | Time | Result |
| --- | --- | --- | --- |
| `node tools/build.mjs` | 0 | 17 s | |
| `npm run check -- --tracked` | 0 | 6 s | |
| `npm test` | 0 | 56 s | 603 of 603, none cancelled |
| `npm run test:upstream` | 0 | 4 s | 32 of 32 |
| `npm run test:package`, `test:assets`, `test:grenade-renderer` | 0 | 20 s | |
| `npm run check:buildings` | 0 | 2 s | |
| `node tools/asset-draw-counts.mjs` | 0 | 10 s | Asset draw counts match the pinned fixture. |
| `node tools/record-building-geometry.mjs` | 0 | 6 s | The fixture equals the reviewed renderer's digests. |
| `npm run review:integration` | 0 | 44 s | drawCalls frame 1115, shadowPass 619 |
| `npm run review:asset-counts` (the CI job) | 0 | 157 s | no refusal |

All gates pass. None of them fails on Q5, Q6 or, after the documented refresh, Q7, Q8 and Q10 (each passes the 603 tests and the check), nor on MF-C (no timing gate, by design).

## Not verified

- **Phones and integrated GPUs.** This machine has one RTX 3080. The GPU-side evidence is the triangle counts (above) and the record's SwiftShader proxy, which I did not re-run; the lit Gross district is not in that proxy set.
- **The per-copy arm under more lamps.** MF-C's per-copy comparison was timed with six fires and unlit; with 18 fires or 12 night lamps among the houses only main → candidate was timed.
- **The D3D11 stall** that set the copy table's design (14.9 against 7.2 ms) was not re-measured: code-reading and the test that pins one upload only.
- **Other browsers, and devices without `WEBGL_multi_draw`.** The fallback was exercised only by hiding the extension in Edge (SwiftShader, 20 views byte-identical); no browser without the extension was run.
- **The building library preview** (`apps/editor/prefab-preview.js`, a second `PrefabLayer` with its own renderer and daylight rig) was read, not driven.
- **Undo and redo through the UI.** Edits went through `scene.update` (the path an edit and an undo take), in the memory and latency probes only.
- **The answer's own 46-mutant harness** was not re-run; its CI falsifiers ran at `54ad390`, before the runs change. K3 was re-run through the CI gate here.
- **The facade (`./assets/three`) and `./roofs/three` against main 0.10.** Round 3's API diff was not re-run; since `1518afe` the facade changed in one line (`display-batches.js:120`, the back glass half's `castShadow`), and the roof change is the editor-only merge guard.
- **Codex processes.** None showed in the load samples; I did not inspect the process list during the timings.

## Carried engine items (not scored)

- **MF1** (open): the editor export still passes silently through AFT and Farmyard, which drop buildings, roofs and wall runs.
- **MF2** (open): pins name unreleased commits; `ee7c18e` is recorded honestly as the reviewed renderer, but is reachable only from `codex/nautilus-art`.
- **MF3** (open): no asset standard, registration or authoring path, so the speed work cannot reach the landmarks.

## Evidence index (`artifacts/r08-4/`, copied to [`evidence/hostile-review-0.8-round-4/reviewer/`](evidence/hostile-review-0.8-round-4/reviewer/); local paths masked as `<sandbox>`, `<baseline>`, `<scratch>`; page scripts stored as `.js.txt`; the pixel captures (`pixels/px/`), PNG folders and the regenerable lamp maps (`beyond-maps/`, `beyond-near-maps/`) left out; the GPU results reduced to per-block medians)

| File | What |
| --- | --- |
| `timing.sh`, `timing/gpu-subset.json` (+ `.log`, `-tables.md`), `tables.mjs`, `timing/load.txt` | The answer's instrument on a subset, main 0.10 against the candidate; tables; load samples |
| `ab-inst.sh`, `timing/inst-vs-copybatch.json` (+ tables) | Round 3's InstancedMesh build against CopyBatch, paired |
| `ab-percopy.sh`, `ab-percopy-w1.sh`, `timing/percopy-vs-copybatch*.json` (+ tables) | Per-copy display batches (`instancing: false`) against CopyBatch, paired (MF-C) |
| `profile-frames.mjs` (the answer's, probe path changed), `compare-profiles.mjs`, `profiles/` | CPU profiles of the isolated frames, InstancedMesh against CopyBatch |
| `timer-control.mjs`, `timing/timer-control.json` | The GPU timer under a ×3 CPU throttle (SF-H) |
| `beyond-near-maps.mjs`, `beyond-near-maps/`, `beyond-near.sh`, `timing/beyond-near-gpu.json` (+ tables) | 18 fires, 12 night lamps and 6 spot lights among the Gross houses, main against the candidate |
| `beyond-maps.mjs`, `beyond-maps/`, `beyond.sh`, `timing/beyond-gpu.json` | The first set, lamps beyond the houses' reach (kept, not used for the verdict) |
| `pixels.mjs`, `compare-px.mjs`, `pixels/result.json`, `pixels/result-compare.json`, `pixels/px/` | SwiftShader captures: candidate, its `WEBGL_multi_draw`-less fallback, round 3's InstancedMesh build, Q1; pairwise comparison with the strong oracle and blobs |
| `pixels-control/` | The must-fail control: copy spheres at half radius |
| `culled-real.mjs` | Real-frame SwiftShader culled counts against the stubbed SwiftShader pins |
| `upper-check.mjs`, `upper-check.json` | The headless level-1 cutaway against the real editor |
| `drive-path.mjs`, `drive-path.json`, `gate-mutants/q5.*`, `gate-mutants/k3.*` | Q5 through the editor's own path and through the CI gate; K3 as the gate's control |
| `mutate-r4.mjs`, `mutation.sh`, `mutation/r4-phase1.*`, `mutation/r4-confirm.*` | This round's 12 mutants, phase 1 and confirmation |
| `refresh-check.sh`, `refresh-check2.sh`, `mutation/refreshed/` | Q7, Q8, Q10 and the G11 control through the documented refresh |
| `make-tree.mjs`, `edits/` | Built copies of one commit with one edit each, in `<scratch>` |
| `memory-probe.mjs`, `timing/memory.json`; `edit-timing.mjs`, `timing/edit-*.json` | GPU resources and heap after 120 updates; edit and toggle latency, paired |
| `ci/asset-counts-job.log` | The `asset-counts` job's log on GitHub for `cb720d8` (read with `gh run view`) |
| `gates.sh`, `gates/` | The repository gates on the clean sandbox |
| `gpu-chain.sh`, `gpu-chain2.sh`, `cpu-chain.sh`, `cpu-chain.txt` | The order the jobs ran in |

## The answer to round 4, measured

Evidence paths below (`answer/…`, `reviewer/…`) are relative to [`evidence/hostile-review-0.8-round-4/`](evidence/hostile-review-0.8-round-4/). Local paths are masked, and bench results are reduced to per-block medians (`reduce-result-r3.mjs`); the two largest are written without indentation.

Round 4 scored the answer 7.5/10. It found one must-fix (MF-C: batching copies costs more than it saves where copies are sparse or a camera sees few of them), four should-fixes and seven nits. The answer is on the same branch, after `cb720d8`:

| Commit | Answers | Change |
| --- | --- | --- |
| `f1c162f` | MF-C; N2, N5, N6, N7 | Only a cluster of eight or more neighbouring copies batches; every other copy draws its own batches. The instanced runs are dropped. Tests for the clusters and for the branches no provider reaches. The threshold map and round 4's lamp maps join the benchmark |
| `d076c0b` | SF-F | The headless count and the bench drive the editor as it drives itself: it opens the map, then `setOptions` sets each view |
| `9ad6a9f` | SF-G | The digest keys every setting a material holds, the shader its `onBeforeCompile` writes, a custom program key, and each node's draw order, layers, culling, draw range and custom depth materials; it refuses a hook it cannot key |
| `a4b2840` | SF-H; N3, N4 | The bench: the GPU span flagged where it is the GPU's own, `--expect` prints what it compared, a copy named by its stamp, still frames on every backend |
| `1d2edb1` | (counts) | The culled draws re-pinned on both rigs |
| `b9bdd05` | (mutation); the bench's open | A test of the building extent the clusters use (M7, M8 survived without it); the bench waits for the prefab update the editor starts after `open` |
| this commit | SF-H, SF-I, N1 | Docs, changelog and this record |

**Rig and method.**
- One machine: Windows 11, Ryzen 7 5800X (16 threads), RTX 3080 (ANGLE D3D11) for timing, SwiftShader for pixels and for the triangle-bound proxy; headless Edge 156, viewport 1600 × 1100, editor canvas 1056 × 916 (967,296 pixels).
- The formal runs (`answer/formal-r4/`, `formal4.sh`) measured `1d2edb1` in a clean worktree (status recorded empty in `load.txt`) against main 0.10.0 `fb35277`, one after another: GPU 16:40–17:41 (every map, 4 runs), per-copy 17:41–17:51 (4 runs), SwiftShader 17:51–18:53 (2 runs). CPU load sampled between the parts was 3–9 %, and nothing else heavy ran.
- Both trees run as two pages of one browser, with A B B A blocks per map and view; each map's reference blank (the blank map with its lamps) runs identical code in both arms, so its ratio is that map's noise floor. Every run reduces motion now (see the bench nit below).
- The threshold pilots ran in the formal instrument's own pairing, with 2 runs instead of 4, against built copies of the working tree (`answer/pilot-*.json`, `make-tree.mjs`, each stamped with its commit and copied files).

### MF-C: only clusters of neighbouring copies are batched

Round 4 was right, and its diagnosis was better than the record's. A `CopyBatch` draw costs about 2.4 plain draws on this rig, and the renderer sets one up wherever the set's sphere meets a camera's frustum. Spread copies made that sphere wide, and a close view or a lamp face sees few copies of any set.

**The rule.** Copies of one design are neighbours when their buildings' spheres overlap (each building's extent, every mesh included; single linkage, so a row or a grid is one cluster; a sort-and-sweep along x). A cluster of `BATCHED` = 8 or more neighbours draws through `CopyBatch`es; every other copy, alone or in a smaller cluster, draws its own batch meshes, which the renderer culls copy by copy. On the benchmark maps the Gross houses (13 designs, 2–3 copies each, spread) now draw per copy, and the 32 copies of the largest design stay one batched cluster.

**Against main** (formal, assets alone on this rig, median and range over 4 runs; `answer/formal-r4/tables-gpu.md`), the lit Gross houses gain most:

| Lit Gross houses | Overview | Close | Far | Cutaway |
| --- | --- | --- | --- | --- |
| Six fires (l4) | ×4.45 (4.36–4.57) | ×5.13 (4.81–5.33) | ×4.00 (3.95–4.23) | ×2.10 (2.08–2.21) |
| Round 3's answer, batched | ×2.62 | ×2.09 | ×1.95 | ×1.34 |
| 18 fires (l4x) | ×5.23 (5.11–5.31) | ×4.06 (3.90–4.17) | ×4.53 (4.45–4.55) | ×2.47 (2.40–2.56) |
| 12 electric lamps at 22:00 (l4n) | ×4.80 (4.58–4.82) | ×3.85 (3.67–3.98) | ×4.00 (3.79–4.24) | ×2.19 (2.14–2.26) |
| Six spot lights (l4s) | ×4.30 (4.22–4.36) | ×4.62 (4.31–4.79) | ×3.22 (2.72–3.31) | ×2.30 (2.27–2.42) |
| Their blank maps (null) | ×0.98–1.05 | ×0.98–1.05 | ×0.98–1.00 | ×1.00–1.04 |

Unlit, the Gross houses are ×6.84 / ×4.86 / ×4.22 / ×2.97 (round 3's answer: ×5.33 / ×3.35 / ×3.12 / ×2.86). The whole table is in `docs/asset-rendering-benchmark.md`.

**The threshold, measured, not assumed.** Round 4's break-even of 2.4 copies per draw comes from the unlit overview, where every copy of a set is in view. The pilots measured clusters of Gross houses side by side against per-copy batches (A: the candidate with `instancing: false`; B: clusters batched at any size; assets alone, 2 runs; above 1, batching is faster; `answer/pilot-percopy-vs-hybrid.json`, `answer/pilot-rows-percopy-vs-hybrid.json`):

| Cluster | Unlit: overview / close / far / cutaway | Six fires: overview / close / far / cutaway |
| --- | --- | --- |
| 3 (rows of three) | ×1.01 / ×0.93 / ×0.90 / ×1.07 | ×0.89 / ×0.81 / ×0.81 / ×0.94 |
| 6–8 (rows of eight) | ×1.14 / ×1.14 / ×1.13 / ×1.20 | ×0.97 / ×0.93 / ×0.90 / ×1.03 |
| 16 (rows of sixteen) | ×1.83 / ×1.38 / ×1.38 / ×2.14 | ×1.17 / ×1.01 / ×1.00 / ×1.30 |
| 32 copies of the largest design | ×1.30 / ×1.08 / ×1.14 / ×2.09 | ×1.07 / ×0.89 / ×0.93 / ×1.24 |
| Blank maps (null) | ×0.87–1.16 (0.4 ms frames) | ×0.89–1.07 |

So three neighbours are not worth batching: level unlit and up to a fifth slower under lamps. In the pilot, from about eight, batching was faster unlit in every view and within a tenth of per-copy under lamps; from sixteen it was faster or level everywhere. `BATCHED` is 8, a layer option (`batched`) so the mechanism's tests keep three copies; the clustering test pins the default. The benchmark's new w8 places Gross houses eight of a design side by side (a shelf row's end splits two of its runs, which then draw per copy), so the threshold's smallest batched case is timed and its counts are pinned.

**Against per-copy batches, formal** (the candidate's own `instancing: false` build, A, against the candidate, B, on the maps that still batch; 4 runs; `answer/formal-r4/percopy-gpu.json`, `tables-percopy.md`):

| Map | Overview | Close | Far | Cutaway |
| --- | --- | --- | --- | --- |
| 32 copies of the largest design (w1) | ×1.26 (1.23–1.28) | ×1.07 (1.05–1.11) | ×1.08 (1.06–1.10) | ×2.06 (1.75–2.06) |
| Gross houses in rows of eight (w8) | ×1.13 (1.11–1.17) | ×1.00 (1.00–1.05) | ×1.12 (0.99–1.20) | ×1.30 (1.23–1.33) |
| Six fires: 32 copies (l1) | ×1.04 (1.02–1.07) | **×0.88** (0.86–0.90) | **×0.86** (0.83–0.89) | ×1.21 (1.07–1.33) |
| Six fires: rows of eight (l8) | ×0.97 (0.93–0.98) | **×0.82** (0.81–0.84) | **×0.91** (0.85–0.94) | ×1.03 (1.02–1.04) |
| Blank maps (null) | ×0.92–0.99 | ×0.93–0.98 | ×0.87–1.00 | ×0.98–1.03 |

Both arms draw the same triangles in all 16 map-views; batching cuts the calls (w1 overview 798 → 304, l1 overview 2,129 → 980).

The formal run finds the lit side at eight worse than the pilot did: the rows of eight's lit close view is ×0.82, not ×0.93. So at eight, batching is a trade, not a free gain: unlit it gains up to ×1.30, lit by six fires it loses down to ×0.82, level on average over the eight views (geometric mean ×1.03). The 32 copies lose the same way lit (×0.86–0.88 close and far), and they would be batched at any threshold up to 32.

**The cause, counted** (`answer/exp-setups.js`, `exp-setups.json`; the built editor in a browser, D3D11 on the same RTX 3080, at the bench's cameras). Per frame:

| Map, view | Setups that draw | Setups that find no copy | Sub-draws | Per drawing setup |
| --- | --- | --- | --- | --- |
| 32 copies, unlit close | 16 | 0 | 241 | 15.1 |
| 32 copies, six fires, close | 115 | 45 | 535 | 4.7 |
| rows of eight, unlit close | 49 | 10 | 245 | 5.0 |
| rows of eight, six fires, close | 218 | 174 | 615 | 2.8 |
| rows of eight, six fires, overview | 491 | 363 | 1,748 | 3.6 |

Unlit, a setup draws many copies. Under lamps each lamp face is a camera that sees a few copies of a cluster: it sets up a draw for 2.8 copies on average in the rows' lit close view, and 174 setups find none, because the cluster's sphere reaches into the face while no copy does. A setup cannot be skipped from a hook: three binds the program and its uniforms before it reads which copies to draw.

**Why eight (judgment).** Sixteen would draw the rows of eight per copy: their lit close view would be 1.22 times faster and their unlit cutaway 1.30 times slower. Eight is where batching stops losing on average in the benchmark's eight views. Whether lit or unlit views matter more for the editor is the owner's call; the per-camera choice that would avoid the trade is not open in three (below). Provisional recommendation: keep eight, since the lit loss is at most ×0.82 against per-copy while every lit view of the batched maps stays at least ×2.03 against main.

**The runs are dropped (N5).** The same pairing, without runs against with them, measured no difference anywhere: assets ×0.94–1.05 on the copies and ×0.96–1.05 on the rows of three, against nulls of ×0.89–1.07 (`answer/pilot-noruns-vs-runs.json`), as round 3's formal run had found on the Gross houses. Each copy in view is again a plain sub-draw: no patched batching chunk (it was a global change to every `BatchedMesh` in the page), no instanced multi-draw (deprecated in r174, removed in r184), and no deprecation warning in the editor's console. Calls and triangles are unchanged; both rigs' culled counts for the copies stayed as pinned.

**What round 4 proposed beyond this, and why not now.**
- *Per camera.* three culls an object against each camera before any per-camera hook runs: `onBeforeRender` and `onBeforeShadow` come after the test, and the shadow pass tests the view camera's layers, not the lamp's. So a representation can be chosen per frame by the view camera at most, and that choice would decide the lamp faces too.
- *Shared textures, and skipping the loop when the set is wholly in view.* Both cut the cost of each setup. The count above shows where that would pay: the lit close and far views of batched clusters, which set up 112–485 draws per frame, not the unlit views (14–78). Neither is measured yet; they are listed under Not done. The per-copy loop and its frustum took 0.63 ms of a 23 ms frame in round 4's worst case, the lit Gross houses, which no longer batch.

**The lit cutaways' cause, restated.** Round 4 was right that the record's "the inherited light renderer dominates the lit cutaways" was wrong for the Gross houses: CopyBatch's empty setups were. Drawn per copy, the lit Gross cutaway is ×2.10 (2.08–2.21), against round 3's ×1.34. It stays the lowest of their lit views for a reason the culled counts show. A display batch draws one draw per material however many of a building's meshes the cut hides, while main's cutaway hides whole meshes. So main draws fewer there, and the batches gain less: 18,532 → 2,588 asset draws at the overview, 8,180 → 2,330 in the cutaway.

### SF-F: the gates drive the editor's own path

- `tools/asset-draw-counts.mjs` opens each map through the editor's `open()` and sets each other view with `setOptions`, whose rebuild starts the prefab update without awaiting it. The layer keeps that update (`pending`); the count awaits it and refuses if the editor is not in the view it counts. A headless drive path stands between the wall scene and the AFT scene while it counts: AFT's `open` and `update` set the document and rebuild, `setOptions` merges and rebuilds. `checkDrivePath` refuses if the pinned AFT scene stops saying so. Only texture loading is replaced, as before (the roof atlas is marked loaded).
- The bench's cutaway now waits for the update `setOptions` started; a tree whose layer keeps none (main 0.10, the A arm) is updated again, as before.
- A test drives a map as the editor does: open, `setOptions` (the cutaway must cut), an edit through `update` (the cutaway must stay), `setOptions` back.
- Every pinned headless count is unchanged by the new path. Q5 and its two analogues on the edit and open paths now die (Mutation). Built into the editor, the CI gate (`answer/ci-gate/`, `ci-falsifiers.sh`) now refuses Q5 in 19 checks, where at `cb720d8` it passed every one: the cutaway of every map with buildings, 6 of them headless and 13 culled. K3 (no per-copy culling), the gate's control, is refused in 14 culled checks, every view in which a batched copy can be culled. The unmutated build passes, with 20 headless and 108 culled counts equal.

### SF-G: the digest keys what the renderer compiles, clips and sorts

The material key is every setting the material holds: each own property, which is what the renderer reads (clipping planes, clip intersection and shadows, defines and precision included), canonical (vectors and colours as arrays, textures by their settings, plain objects sorted), without its uuid and update counter. Beside them, what the renderer compiles that no setting shows: the shader the material's `onBeforeCompile` writes, run on the shader the renderer would hand it (three's library shader for the material's type), and a custom program key (the default key is `onBeforeCompile`'s source text, whose effect is keyed instead). Any other hook, on a material or a node, is refused rather than left out. The node line adds draw order, layers, culling, the draw range and custom depth and distance materials.

The 96 reviewed digests are re-recorded with `ee7c18e`'s own renderer (all change with the key); the fixture's pin and the generated catalogue follow. Q7, Q8 and Q10 now fail the digest test. Through the documented refresh (`answer/refreshed/`, `refresh-check.sh`: the exports, then the registry, which re-verifies every digest), the registry refuses all three, as it refuses round 3's G11: "Original building geometry differs from reviewed commit ee7c18e…: bramble-ranch". After that refusal `tools/check.mjs` fails, the digest and catalogue tests fail 2–3 of 22, and the suite fails 3–4 of 607. At `cb720d8` all three passed every step. The digest test also checks clipped shadows, a define, a custom program key, layers, culling, a draw range and a custom depth material; that a hook whose output equals the default's leaves the digest as it was; and that a material's or a node's own `onBeforeRender` is refused.

### SF-H: the GPU timer read as what it is

Round 4's control was decisive: with the page's CPU throttled ×3 and the same draws, main's assets-only span grew ×4.4. The span runs from a frame's first command to its last, idle gaps included, so in a frame the CPU feeds slower than the GPU draws it, the span follows the feed. The record's "the GPU's own time falls too: ×4.4–9.7" is withdrawn: those were the feed's ratios. Each view's GPU entry now says, per arm, whether the span exceeds the CPU's submit time (`own`), and only such a span is the GPU's own time. In the formal run that happens only on walls: the candidate's free-angle walls (unlit overview 0.20 ms submitted, 0.54 ms on the GPU; lit 1.19 and 4.15 ms) and both arms' axis-aligned walls. In every other view both arms are fed slower than they draw (`answer/formal-r4/tables-gpu.md`).

The GPU side is the triangle count and the SwiftShader proxy, which now includes the lamp-lit Gross district (round 4: it is where triangles grow most). On the proxy (whole frames, 2 runs, `answer/formal-r4/tables-swiftshader.md`):
- The lit Gross district is ×1.06 / ×1.02 / ×1.03 / ×1.02 (overview / close / far / cutaway), although its display batches draw 11–20 % more triangles there (the D3D11 counts); unlit ×1.03–1.05.
- The rows of eight and the mixed district are ×1.01–1.04.
- The 32 copies stay a few per cent slower: ×0.97 / ×0.93 / ×0.96 / ×0.99 lit, ×0.97–0.98 unlit (round 3's answer: ×0.96–1.00 and ×0.95–0.98). That is the batching shader's reads per vertex, which a CPU rasteriser pays per vertex.
- The blank maps are ×0.97–1.01.

### SF-I: display batches under lamps, stated

Round 4 was right. `docs/building-prefabs.md` now states the culled triangles from the formal run's counts:
- Unlit: up to +5.5 % for buildings (+10.1 % in the spread Gross houses' far view) and +13.6 % for free-angle walls.
- With six fires: +2–4 % for 32 copies, +8–20 % for the Gross houses, +10–14 % for the mixed district (which repeats no design) and +14–17 % for free-angle walls.
- The Gross houses with other lamps: +15–25 % with 18 fires, +18–31 % with 12 electric lamps at night, +1–15 % with six spot lights.

Batching copies adds none: per-copy batches draw the same triangles in all 16 map-views measured. The split per floor block that round 4 suggests is not done (Not done). On the proxy, which pays per triangle, the lit Gross district is still ×1.02–1.06 faster than main: the draws saved outweigh the triangles added.

### Nits

- **N1.** The count with its ranges. 63 of the 66 views this work changes reach ×2 by their median, and 61 in every one of the four runs: unlit 30 and 29 of 31, lit 33 and 32 of 35 (`tables-r4.mjs --changed`, without the axis walls, which neither arm changed).
  - Misses by median: the roofs' unlit far view (×1.86) and lit close and far views (×1.95, ×1.59), which this answer does not touch.
  - Also missed in some run: the lit copies' cutaway (×2.03, 1.77–2.12) and the unlit roofs' close view (×2.33, its lowest run just under ×2).
  - Medians within a tenth of ×2: the copies' close views (×2.11 unlit, ×2.15 lit) and lit cutaway (×2.03), and the lit Gross and mixed cutaways (×2.10, ×2.19 at night, ×2.16).
  - The null controls' medians are ×0.93–1.06.
- **N2.** A test drives a `CopyBatch` on indexed geometry with a draw range and moves the batch from the scene root: an index start counts bytes, the draw range clips the group, and the batch's own transform moves its copies. Q2, Q3 and Q4 die.
- **N3.** An `--expect` run prints how many headless and culled counts it compared.
- **N4.** A tree is named by Git only when it is its work tree's top level; an extracted copy inside another repository is named by its stamp.
- **N5.** The runs are dropped (MF-C), and with them the deprecation warning.
- **N6.** The benchmark has round 4's lamp maps among the Gross houses: 18 fires in three lanes, 12 electric lamps at 22:00 and six spot lights switched on, each with its blank, built as round 4 built them; their props equal its maps'. Their culled draws are pinned on both rigs.
- **N7.** The camera test's shadow helper passes a real view camera, one that looks away from every copy, so a shadow pass culled by it fails an assertion; Q1 now dies that way.
- **Bench (motion).** Every run reduces motion, not only SwiftShader: on a lamp-lit map a fire's flame added a main-pass draw (110 triangles) between frames, which `frames()` refuses. Both arms run the same, so ratios stay paired.
- **Bench (open), found while answering.** The editor's `open` resolves before the prefab update that its floor control starts once the scene is open (AFT's `open` fires the control, whose `setOptions` rebuilds; open does not await it). A probe that counted in the same task as `open` found no batch at all (`exp-setups.json`, `firstAttempt`). The bench and the CI gate count in later tasks, after that update's resolved-promise chain has finished. All 108 culled counts equal the pinned ones, and `frames()` refuses a frame whose draws change. The bench now waits for the update wherever the layer keeps it, outside the open time; no number changes.

### Mutation (`answer/mutation/`)

`mutate-a4.mjs` on the measured tree (`1d2edb1`, built), 18:59–19:18, under round 3's rules. Every needle must occur once. Each touched file is restored byte for byte in a `finally` and its hash checked, and the tree is clean after every mutant. A null exit is an error, never a kill. An unmutated baseline of every test file the mutants use passed first (`baseline.log`). Phase 1 runs each mutant against its module's tests; the survivors then ran against the whole suite (607 tests) and `tools/check.mjs` (`phase1.json`, `confirm.json`).

| Group | Mutants | Killed |
| --- | --- | --- |
| Controls: round 3's E1 (never batch) and K3 (no per-copy culling) | 2 | 2 |
| Round 4's Q1–Q5, Q7, Q8, Q10, and Q5 on the edit and open paths | 10 | 10 |
| Clusters: never or always linked, the sweep's bound, strict overlap, small clusters batched, order, the extent (M7, M8), every copy at the first, the threshold at three | 10 | 8, then M7 and M8 by a new test |
| Drive path: no pending update, the stand-in's `setOptions`, the drive check off twice, the count setting options itself | 5 | 4; D5 equivalent |
| Digest: own settings, compiled shader, program key, order/layers/culling, draw range, custom depth, both hook refusals, textures by id, the update counter, and round 3's G11 | 11 | 11 |
| Workloads: the lamp-kinds check off | 1 | 0; by design |

- **M7 and M8**, the building extent without its node transforms or without its plain meshes, passed the whole suite: nothing tested the extent the clusters are built from. A new test checks that every vertex of every mesh lies inside it, on a synthetic building (a moved and turned root, a plain mesh nested under a turned group 50 m out) and on a provider's design. Both mutants now fail that test, and only that one (`recheck-m7-m8.json`; `b9bdd05`).
- **D5** sets the options and updates the layers itself instead of calling `setOptions`. On a correct editor that is equivalent; the point of SF-F is that, with Q5 in the editor, only the editor's own path dies.
- **W1** turns off the workloads' lamp-kinds check, which refuses lamps that `openDocument` would drop. No workload has one, so it guards rather than tests.
- Q1 now dies by its assertion (N7), not by a TypeError.

### Gates

On `b9bdd05`, one after another, 19:25–19:32, with only the docs and this record uncommitted (`answer/gates/summary.txt`, `gates-r4.sh`):

| Gate | Result |
| --- | --- |
| `npm run build` | pass |
| `npm run check -- --tracked` | pass |
| `npm test` | 608 of 608 |
| `npm run test:upstream` | 32 of 32 |
| `test:package`, `test:assets`, `test:grenade-renderer`, `check:buildings` | pass |
| `node tools/asset-draw-counts.mjs` | the pinned headless counts match |
| `node tools/record-building-geometry.mjs` | the fixture equals the reviewed renderer's digests |
| `npm run review:integration` | pass |
| `npm run review:asset-counts` (the CI job, with the bench's open wait) | 20 headless and 108 culled counts equal, 258 s |

The record commit is docs only; `check` and `build` were re-run on it.

### Browser

The built editor at `1d2edb1` in the browser pane (D3D11 on the RTX 3080), on the bench maps:
- The rows of eight draw in rows, and the cutaway cuts every house, batched or not.
- The building library's preview draws a Gross house's exterior and its first-floor cutaway.
- The console stayed empty and the scene reported no diagnostics.

The preview server was stopped afterwards.

### Not done

- **Per-camera representation.** three gives no per-camera choice (MF-C above), so the lit close and far views of a batched cluster stay slower than per-copy: ×0.82–0.91 for the rows of eight, ×0.86–0.88 for the 32 copies.
- **Round 4's shared textures and loop skip.** They would cut the cost of each setup, which is what those lit views pay: 112–485 setups per frame, 22–44 % of which find no copy. They are not built or measured.
- **Per-floor-block batches (SF-I's suggestion).** The lamp-lit triangle growth of display batches stays at +8–31 % for the Gross houses. On the proxy it does not yet cost time.
- **Roofs.** Their close and far views stay under ×2 (×1.59–1.95), as in round 3; this answer does not touch them.
- **Phones and integrated GPUs** were not measured; this machine has one RTX 3080. SwiftShader is a CPU rasteriser, used here only as a triangle-bound proxy.
- **MF1–MF3** are the architect's, carried as round 4 carried them.
