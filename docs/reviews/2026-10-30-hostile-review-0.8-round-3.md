# Hostile review, round 3 (0.8 series): the answer to round 2 (`claude/asset-render-speed` at `1518afe`)

- **Reviewed commit:** `1518afeb5f51c7d8523c1aa8d569e5b81eceb716`, branch `claude/asset-render-speed`. The answer's formal runs were on `cf2760a`; `1518afe` adds records only (`git diff cf2760a 1518afe` touches `docs/reviews/` alone). Baseline: main 0.10.0 `fb352776b714b097cb1bfb94350f8e18a62bfc52`.
- **Date:** 2026-10-30, 06:50 to 08:35 local. One hostile reviewer (Claude), round 3, in the detached sandbox worktree `<sandbox>` at `1518afe` with `dist/` built. The baseline `<baseline>` (main, `dist/` built) was read only and served as the A arm. Built copies of the candidate with one mutant each lived in `<scratch>`. `git status --porcelain` of the sandbox was empty before and after the mutation runs and the gates (recorded in the mutation JSON and `gates/summary.txt`).
- **Judged against:** the owner's goal, **render assets twice as fast** for the massive structures being built, and round 2's findings (MF-A, SF-1 to SF-6, N1 to N5). MF1 to MF3 (game exchange, pins, asset authoring) are the architect's; they are carried at the end and not scored.
- **Labels:** **measured** = run here and quoted; **code-reading** = cited source; **estimate** = arithmetic on measurements; **judgment** = assessment.
- **Rig.** Windows 11 10.0.26200, AMD Ryzen 7 5800X (16 threads), 64 GB, Node v24.15.0, headless Edge 156.0.4314.56 through the Playwright in the Codex runtime. ANGLE **D3D11 on an RTX 3080** for timing; **SwiftShader** for pixels and for a triangle-bound proxy. Viewport 1600 × 1100, deviceScaleFactor 1; the editor canvas, and so every pixel capture, is 1056 × 916 = 967,296 px.
- **Load.** The nightly job had nothing to sweep and the author ran nothing heavy. The GPU timings of record were taken 07:00–07:23 on a quiet box: CPU load sampled between runs (Win32 `LoadPercentage`, `timing/summary.txt`) was 1–8 %. From about 07:24 another agent's processes started (Codex computer-use servers), and with my own mutation and pixel jobs the load then sat at 90–100 %. So the lamp-lit w5b series (07:23–07:28) is reported with its widened null control, the lamp-lit w6 series (07:28–07:34) is not used for timing, and the SwiftShader proxy (07:57–08:08) is paired but ran on a loaded box. My headless probes (single-threaded, 07:22:23–07:22:57) overlapped the last of the four lamp-lit w4 runs; five of its six view ratios sit inside the other runs' range and the sixth (whole-frame close, ×3.31) is the series maximum. Every timing is paired (two pages of one Edge, blocks A B B A), repeated (4 runs) and given as a median with its range, with the blank map (same code in both arms) as the null control. Draw counts, triangle counts and pixels are load-independent.
- **Concurrency, disclosed.** The pixel probes and the benchmark runs on mutant copies ran while the mutation job edited the sandbox's sources, so those bench records show the sandbox (their A arm) as dirty at that moment. Both only serve `dist/`, built at 06:46 from the clean commit before any mutant; the mutants' needles are present, unmodified, in `dist/app/*.js`. Nothing headless ran in the sandbox during the mutation job except one probe, whose result I discarded and re-ran on a clean archive copy (`f7-mirroring-probe.txt`).
- **An incident, disclosed.** Mutant R4 made a roof test fail on an assertion whose operand is a three.js object; node:test then built the failure message from the whole object graph and the test process grew to about 50 GB (free memory fell to 1.8 of 63.9 GB). At about 07:51 I stopped that process (PID 27088, started by my harness) and ran a watchdog for the rest of the run (`watchdog.ps1`, `mutation/watchdog.log`). See N7.

## Method

1. **The answer's own instrument, re-run on a subset** (`tools/bench-asset-rendering.mjs --editor --assets-only --expect`, GPU, 4 runs, 30 frames × 4 blocks): w0, w1, w4, w5b and w6, main 0.10 against the candidate (`timing/plain-gpu.json`).
2. **Lamp-lit workloads.** `lamp-maps.mjs` adds six fire lamps (three campfires and three standing torches, always lit, point lights with shadows) to six of the benchmark's own maps, on the free tiles nearest six points in the district's lanes. Each map's folder carries the blank map with the same lamps, as its null control and as the reference of the isolation check. Same instrument, 4 runs, 20 frames × 4 blocks (`timing/lamps-*-gpu.json`).
3. **A triangle-bound proxy.** Both trees on SwiftShader (a CPU rasteriser) as two pages of one Edge, paired blocks, with and without lamps (`swift-timing.mjs`). It is not a phone; it shows the direction of a change on a renderer that pays per triangle.
4. **Pixels.** Round 2's own `pixel-probe.mjs` (SwiftShader, strong tie oracle), extended with the answer's pixel classes and with the 8-connected components of the differing pixels (rounding scatters single pixels; a misplaced or missing part makes a blob). Round 2's `cases-lights` for MF-A; the instancing views; lamp-lit copies, walls and roofs; far close views; higher-floor cutaways; a mixed-level roof map. Controls: lamp-lit maps without a repeated design, and a built copy of the candidate with one instance moved by 1 cm (`delta-blobs.mjs` lists the large-delta clusters).
5. **Mutation.** 33 new mutants of instancing, the roof merge, the glass halves, the count tool, the facade switch and the editor's wiring of the layers (`mutate-r3.mjs`), and round 2's 18 survivors with the answer's own harness (copied outside the tracked tree, a null exit now reported as an error) plus one new provenance mutant that needs its refresh hooks (G11). Rules: a dirty tree is refused, every needle occurs exactly once, files are restored in a `finally` and their hashes verified, HEAD and status are recorded, `maxBuffer` is 256 MB, a null exit is an error, a node:test timeout is reported as cancelled. Phase 1 runs the module's tests; every survivor is re-run against the whole suite and `tools/check.mjs`. Five mutants were also built into copies of the candidate to ask what `--expect`, the isolation check and a pixel probe see (`make-trees.mjs`, `browser-checks.sh`).
6. **Differential probes, headless.** The provenance pin re-derived from Git objects (`provenance-r3.mjs`); the public facade and the roof adapter against main 0.10, and merged-roof selection bounds (`api-diff.mjs`); instancing under edits, undo, redo and overlapping updates against a non-instancing layer (`instancing-edits.mjs`); shared-mode glass casters in a host without the editor's daylight rig (`facade-glass-probe.mjs`).
7. **The repository gates** (`gates.sh`) on the clean sandbox after everything else.

## Score

**7 / 10 for the answer**, against the goal and round 2's findings. MF1 to MF3 remain open engine items (unscored; see the end).

What the answer gets right, reproduced here:
- **MF-A is closed.** Round 2's own probe, maps and strong oracle, main 0.10 against the candidate: 13,112 → **0** px (close) and 14,694 → **0** (close cutaway); the overview's 9 px are all strong-oracle ties; both controls 0; the lamp-lit benchmark walls 0.
- **The speed reproduces on the benchmark's own maps.** Its instrument, my subset, assets only: 32 copies ×3.76 / ×2.00 / ×3.29, Gross ×6.88 / ×3.51 / ×3.84, free-angle walls ×18.9 / ×5.75 / ×4.50, roofs ×5.02 / ×1.96; null ×1.00–1.05. `--expect` 40 of 40; no refusal.
- **Round 2's survivors stay dead at the final commit**: 17 of 18 by their module tests, B4 by the count gate in the whole suite, and the provenance pin re-derives from Git objects (96 of 96, with failing controls).
- **The contracts are back and the new layers are correct.** The default facade is identical to main 0.10 for all 48 originals over 125 views; `createRoofGroup` is identical for 720 roof and option combinations; merged roofs are byte-identical in every view I added (lamps, far views, level cuts) and select with identical bounds; instancing keeps the same drawn triangles as a non-instancing layer through rotate, remove, undo, redo, view changes and overlapping updates, and leaks no instance set (64 created, 64 disposed).

What holds the score down:
- **MF-B: lamps turn instancing into a triangle multiplier.** With six fire lamps, 32 copies of one design draw 59.2 M triangles per frame against main's 14.8 M, and the assets' gain falls to ×1.29 (close) and ×1.72 (cutaway) on an RTX 3080. On a renderer that pays per triangle (SwiftShader) the candidate is slower than main in all three lamp-lit views (×0.65, ×0.57, ×0.87), and in the unlit close view too (×0.88). No gate, count or benchmark map has a lamp.
- **SF-A: the gate cannot fail on the editor's wiring or on bounds.** Switching the editor's instancing or roof merge off (E1, E2), or bounding an instance set or the merged roofs wrongly (I1, R1), passes all 595 tests and the check; I1 also passes `--expect`, the isolation check and the benchmark's own pixel views while the copies vanish from a far view; I8 (an instance-buffer leak per update) and F7 (shared copies ignoring the view) pass too.
- **SF-B to SF-E:** CI does have a browser; the documented cost of instancing (close-view triangles, lamp-lit and far-view pixels) is understated; the isolated ratio's bound is conditional; the digest's material key is a subset (G11: an emissive term added to every building material passes the pin and the check).

The answer closed round 2's findings with care, and its numbers reproduce. It is held at 7 because its main new mechanism, instancing, carries an unmeasured cost dimension that the record's headline does not survive, and the gate it built cannot see the editor or culling.

## MUST-FIX

### MF-B (new, measured). Lamps turn instancing into a triangle multiplier: every point-light cube face draws every copy

**Code-reading.**
- `apps/editor/prefab-scene.js:67-69` makes one `InstancedMesh` per batch mesh of a repeated design, holding every copy, and bounds it by the union sphere of all copies (`mesh.computeBoundingSphere()`).
- Every lamp casts point-light shadows. `vendor/aft/…/lighting-scene.js:34` gives every campfire, cooking fire, torch, floor lamp, sconce and streetlight a `PointLight` (a spot for searchlights) with `castShadow = true`, a 512 px map and `far = LIGHT_RANGE` (30 m). A point light renders six cube faces (`three.module.js:8563`), and each face culls each caster **as a whole** against its own frustum (`three.module.js:8741`).
- So every face of every lamp near the district draws **all** copies of every instance set. On main, each copy's meshes were culled per face, and a face drew only the copies within its 30 m.
- The light renderer repeats the main pass as well. `light-renderer.js:6` (`lightPasses`) allows at most 4 lights per pass, fewer when their shadow maps exhaust the texture budget, and each further pass re-renders the scene. With six lamps the overview and the cutaway render the scene twice (4 `render` calls per frame against 2 unlit, measured in both arms).
- Neither instrument can see it. `tools/asset-draw-counts.mjs` models one shadow map (the sun's) and one main pass, and none of the nine benchmark maps has a lamp.

**Reproduction (measured).** `lamp-maps.mjs` adds six fire lamps (three campfires, three standing torches, always lit) to the benchmark's own maps, on the free tiles nearest six points in the district's lanes. Each map's folder holds the blank map with the same lamps, as null control and isolation reference. The answer's instrument, unchanged: `node tools/bench-asset-rendering.mjs --editor --a <baseline> --runs 4 --backend gpu --frames 20 --blocks 4 --opens 1 --assets-only --maps <lamp dir>`. RTX 3080, quiet box (07:06–07:23); the isolation check passed in every run; triangles are load-independent.

| Six fire lamps | Triangles per frame, whole: main → this | Assets only | Assets only: overview / close / cutaway | Whole frame: overview / close / cutaway |
| --- | --- | --- | --- | --- |
| Blank map, same lamps (null) | 6.63 M → 6.63 M | — | ×1.05 / ×1.02 / ×1.00 | ×1.05 / ×1.01 / ×0.96 |
| 32 copies of one design (w1) | 14.77 M → **59.25 M (×4.0)** | 8.15 M → **52.62 M (×6.5)**; close ×8.2; cutaway ×6.8 | ×2.34 (2.24–2.40) / **×1.29 (1.23–1.44)** / **×1.72 (1.58–1.83)** | ×1.81 / ×1.58 / ×1.33 |
| 32 Gross houses of 13 designs (w4) | 9.82 M → 19.68 M (×2.0) | 2.47 M → 12.33 M (×5.0); close ×6.1; cutaway ×5.2 | ×3.63 / ×3.42 / **×1.83 (1.68–2.15)** | ×2.74 / ×2.58 / ×1.49 |
| No repeated design (w7, control) | 11.32 M → 11.72 M (×1.04) | 3.92 M → 4.32 M (×1.10) | ×2.94 / ×3.97 / ×1.91 | ×2.04 / ×2.15 / ×1.44 |
| 2,400 free-angle walls (w5b)¹ | 17.86 M → 19.57 M (×1.10) | 10.45 M → 12.16 M (×1.16) | ×7.33 / ×3.48 / ×3.47 | ×2.98 / ×2.04 / ×1.31 |

¹ Taken 07:23–07:28 as another agent started; its null control widened to ×0.63–1.13 (assets only), but its own per-run ratios stayed within ×6.55–7.34 (overview).

The control isolates the cause. Without a repeated design the triangle load is unchanged and the speedup holds; with one, the asset triangles grow ×5 to ×8 and the assets' gain falls below ×2 in the close and cutaway views, on a desktop RTX 3080. Walls barely change, because main already drew its full panels as one instance set per material.

**A triangle-bound proxy (measured).** Both trees on SwiftShader (a CPU rasteriser), two pages of one Edge, 4 paired blocks of 2 frames, started 07:57 on a loaded box; the lamp-lit blank map's ratio is ×1.00 to ×1.02 per view (blocks 0.96–1.09). The lamp-lit w1 overview takes 3,694 → 5,642 ms per frame, **×0.65** (every block 0.62–0.67): on a renderer that pays per triangle, the candidate is about **1.5 times slower than main**. The lamp-lit close view: 1,506 → 2,625 ms, **×0.57** (blocks 0.57–0.59). The lamp-lit cutaway: 2,610 → 2,986 ms, **×0.87** (blocks 0.86–0.89). Without lamps the same proxy shows where the trade sits: the unlit w1 overview gains nothing (1,337 → 1,343 ms, ×1.00, identical triangles with 2,730 fewer draws), and the unlit close view, which instancing makes draw 2.0 M → 3.3 M triangles, is slower too (607 → 689 ms, ×0.88); the unlit cutaway is level (1,102 → 1,081 ms, ×1.02). The unlit blank map: ×0.99 to ×1.01 per view (`swift-timing.json`). SwiftShader is not a phone (judgment: a phone GPU sits much nearer this end than an RTX 3080 does), but it shows the trade's direction: wherever triangles cost more than draws, lamp-lit repeated designs render slower than on main.

**Why must-fix (judgment).** The record's headline ("at least ×2 in 18 of 20 views") rests on unlit maps, and its "Not done" says w1's overview is "triangle-bound: 2.77 M triangles per frame … unchanged from main". Fires, torches, lamps, sconces and streetlights are ordinary editor props; with six of them the change trades draws for five to eight times the asset triangles, which a GPU-bound device (the phones still to be measured) pays in full. No gate, count or benchmark map would notice.

**Direction.**
- Cull per copy in every shadow camera. three r180's `BatchedMesh` already does this (`onBeforeShadow` culls per instance against the shadow camera, `three.core.js:28506`). Or split each design's instances into spatial sets (per 32 m tile, say), so that a lamp's faces draw only the nearby sets. The answer's groups of 8 along a Z-order curve were measured unlit only, where they could not pay.
- Until then, instance only where it is a net win, for example no instance set wider than a lamp's range.
- Add a lamp-lit workload (this round's maps will do) to the benchmark, the light renderer's pass rule and the point-light faces to the count model, and gate triangles as well as draws.

## SHOULD-FIX

| # | Finding | Evidence | Direction |
| --- | --- | --- | --- |
| SF-A | **The count gate pins the layers as its own tool builds them; the editor's wiring, bounds, lamps and higher views are outside it.** `tools/asset-draw-counts.mjs:63` constructs its own `PrefabLayer` and `RoofLayer` (instancing and merging on by default) and drives them directly. It counts two level states (all levels, the level-0 cutaway), one main pass and one shadow map, and ignores culling by design. | **Mutation** (each passes all 595 tests and `tools/check.mjs`): **E1** (`prefab-scene.js:90`: the editor builds its layer with `instancing:false`) and **E2** (`roof-scene.js:102`: `merge:false`) put the editor back on main's draws; only the manual `--expect` sees them: on a built copy with E1 it refuses w1 (448 + 352 draws against the pinned 200 + 104 at the overview, 224 + 224 against 7 + 7 in the cutaway), and with E2 it refuses w6 (432 + 432 against 5 + 5). **I1** (each instance set bounded by its template node's sphere, near the map origin) and **R1** (the merged roofs bounded by the first roof's sphere) survive too. Built into copies of the candidate, they pass `--expect` (8 of 8 equal; culling is off by design) and the isolation check (both counts cull alike), with no refusal (`browser/bench-I1-*.json`, `bench-R1-*.json`), and I1 is byte-identical in the benchmark's own pixel views (overview, close at the first building). A far close view shows them: **485,300 px** (half the frame; the copies vanish and only their glass hangs in the air) for I1, **257,049 px** for R1 (`browser/pixels-I1.json`, `pixels-R1.json`). **I8** (released instance sets never disposed: one instance buffer leaked per batch mesh per update, that is, per edit or view change) and **F7** (shared-mode copies stop following the design's view) also survive. | Count through the editor's own scene classes (an `InspectionScene` on a headless renderer double), or at least assert the options the editor passes. Pin bounds: every instance's box inside its set's sphere, as `c59466a` does for walls, and every roof inside the merged sphere. Assert one `dispose` per released `InstancedMesh`. Add a lamp-lit workload, the light renderer's pass rule and higher-floor cutaways to the model, and a far view to the pixel set. |
| SF-B | **The reason given for keeping pixels and `--expect` out of CI is wrong.** The record says the comparison "needs Edge through a local Playwright plus SwiftShader, and the repository's CI has neither". | `.github/workflows/check.yml:24-37`: the `browser-workflow` job installs Playwright 1.62.1 and Chromium and runs `review:integration` and eleven other browser reviews in software WebGL (`NAUTILUS_REVIEW_CHANNEL: chromium`; the integration record calls it "Isolated software WebGL"). | Run `--expect` on the candidate alone in that job (`--a` and `--b` may name the same built tree), and compare a few views, one of them far, against committed reference frames. |
| SF-C | **The documented cost of instancing is understated, in triangles and in pixels.** `docs/building-prefabs.md:72` says a close view "can draw somewhat more triangles than before … (round 2 measured +1.1 % … +5.1 %)", figures taken before instancing, for batches; and that repeated designs "differ in at most 215 of 1.76 million pixels (0.012 %)". | Triangles (measured): w1 close, assets 1.37 M → 2.72 M (+98 %), whole close 1.95 M → 3.30 M; w4 close, assets 0.41 M → 0.79 M (+93 %); with lamps ×5 to ×8 (MF-B). Pixels (SwiftShader, main → candidate, strong oracle): the frame is 1056 × 916 = 967,296 px, so 215 px is 0.022 % (the record repeats the 1.76 M at lines 376 and 386). Beside a lamp the same instancing differs in **3,593 px** (w1 close at a lamp) and **5,022 px** (0.52 %, at a far lamp), in blobs of up to 781 px, while the lamp-lit no-repeat control (w7) is **0 px** at both lamps. 91–92 % of those pixels differ by 1–2 levels, and the larger deltas are single pixels and 1-px runs on silhouettes (`delta-blobs.mjs`): still rounding, invisible, but not "a few pixels". The count also grows with distance from the origin, where float32 has fewer bits to spare: unlit, a close view of a copy 150 m out differs in 396 px (335 of them by 1–2 levels) against 128 at the first building. | State the instancing figures, the frame size and the lamp-lit and far-view counts; add one lamp-lit and one far view to the benchmark's pixel set. |
| SF-D | **The isolation check is exact about draws, not about cost, and the lower bound is conditional.** `--assets-only` hides non-asset meshes only inside `lights.render`; the frame's other per-frame work (`draw()` in `editor-3d-scene.js`: foliage focus, biomes, lamp updates, the daylight rig's whole-scene `traverse`, scenery) still runs, so "the fixed passes" are passes plus the inherited scene's CPU updates. They are equal in both arms, so the arithmetic holds, but the bound also needs costs that add. | Lamp-lit w1: frame-minus-blank ×4.09 against isolated ×2.34 (overview) and ×5.73 against ×1.72 (cutaway); lamp-lit w7, which has no instancing: ×2.87 against ×2.94 and ×1.94 against ×1.91. The two agree when the candidate only removes draws and part when it trades draws for triangles, because its extra GPU work then hides behind the inherited scene's CPU work. On a GPU-bound device it cannot hide. | Keep the direct figure, label it "assets alone, this rig", and put the whole frame beside it as the user-visible number (the record does show both). Add GPU timer queries (`EXT_disjoint_timer_query_webgl2`) or a triangle-bound backend to the bench, so a CPU-for-GPU trade shows. |
| SF-E | **The digest's "material settings" are a hand-picked subset.** `tools/building-geometry.mjs` `materialKey` covers type, name, colour, map presence, transparency, opacity, side, roughness, metalness, polygon offset, depth flags and visibility; not emissive, vertex colours, flat shading, alpha test, blending, shadow side or map transforms. The glTF export carries colour, opacity and roughness only. | **G11** (every catalogue material gets `emissive: 0x202020`; exports and registry refreshed as documented) passes: `build-building-assets` and the registry refresh succeed ("Verified 48 original prefab source bindings"), the digest, catalogue, registry, batch and facade tests pass (26 of 26), then all 595 tests, and `tools/check.mjs` exits 0. Every original building would render brighter, by an emissive grey on every material, and nothing would notice. | Digest `material.toJSON()` minus uuids (and texture uuids), so a new setting is covered by default. |

## NIT

- **N1. Shared-mode glass halves cast twice outside the editor.** `display-batches.js:119` marks the back half `userData.noShadow`, which only the editor's daylight rig reads, and `clone()` keeps the source's `castShadow = true`. In a facade host with its own lighting, `shared: true` gives 188 glass casters for 94 panes (`facade-glass-probe.json`): the same shadow, at one extra draw per pane per shadow map. The comment at `display-batches.js:109` ("the back copy casts none") holds only in the editor. Set `castShadow = false` on the back half too.
- **N2. The count tool states a rule it no longer needs and a rule it does not apply.** `passes()` (`asset-draw-counts.mjs:39`) is dead since `bd27cb5`, which left no transparent double-sided material in the asset layers: mutant C1 (one pass always) survives the whole suite and the check, and the record's falsifier "glass single-pass (w1)" for `4b85d8e` no longer fails. Its header (line 7) says casters are counted "per shadow map"; it counts one.
- **N3. CHANGELOG** says the generator is "about 3.5 times faster"; the formal run measured ×3.18 (game LOD) and ×3.42 (authoring).
- **N4. The pixel classes use the weak tie mask.** `edge-attribution.mjs` counts a pixel as a tie when either arm's own mask marks it; round 2's strong oracle is in the evidence. It moves 2 pixels at the w4 overview (16 → 14) and 2 at the w4 cutaway (47 → 45). Not material, but see claim 6a for what the classes can and cannot tell.
- **N5. "The fixed passes (about 0.5 ms)"** also hold the frame's per-frame scene updates, which isolation does not hide (SF-D). The arithmetic stands; the wording does not.
- **N6. `local` is always the identity.** `instance()` multiplies each copy's root by the node's place in its template (`prefab-scene.js:67`), but every instanceable node is a direct child of the batch root at identity (`prefab-providers.js:7` returns `batch.root`). So mutant I2 (drop `local`) is equivalent, and the "instance k sits where its copy would" assertion cannot test that factor. Harmless today; a provider with a nested root would be untested.
- **N7. Roof assertions whose failure can exhaust the machine.** `tests/editor-roofs.test.mjs:237, 242, 257, 263` assert `equal(x, null)` without a message on values that are three.js objects (`first.parent`, `layer.merged`, `edited.parent`, `custom.merged`), and line 269 compares two 2,000-roof triangle lists with `deepEqual` without a message. When such an assertion fails, node:test builds its message from the operands: under R4 the test process reached about 50 GB in five minutes before I stopped it, and under R6 and R8 the file died after 40–50 s with 23 of 40 tests reported (R8 reproduced in a scratch copy: the file fails after 36 s without reporting any of its tests, `mutation/r8-scratch-run.log`). The mutants are still caught, but CI would fail by memory or timeout, not with a message. Pass a message (as lines 235–236 do) or compare plain values.
- **N8. Slot-material names are untested.** RC1 (drop `material.name = 'roof:' + id` in `createRoofMaterial`) passes the whole suite and the check; main named them too, and `api-diff.json` shows the names unchanged, so nothing is broken, but a host that finds roof materials by name has no test.
- **N9. The merge guard checks what the default factory varies, not everything that changes a draw.** `roof-scene.js:59-66` (`mergeable`) checks the shell's shape, matrices, attributes, shadow flags and slot materials (R4 and R6, which drop two of those checks, are killed). It does not check the shell's `drawRange`, morph attributes, its own `visible`, `renderOrder`, `layers` or a group with an infinite count; a factory that set any of them would merge wrongly. The default factory sets none, so nothing breaks today.

## Claims re-checked

| # | Claim (the record's "answer to round 2, measured") | Verdict | Numbers (this round) |
| --- | --- | --- | --- |
| 1 | **MF-A**: wall instances carry a width-patched distance material; round 2's point-light probe gives 0 px | **Holds** | Round 2's own probe, maps and strong oracle, main 0.10 → candidate, reduced motion: p1 close **0** px (round 2: 13,112), p1 close cutaway **0** (14,694), p1 overview 9 px, all strong ties; p2 and p3 controls 0; p4 close 0, p4 cutaway 2 px on door leaves; null 0 (`browser/pixels-lights.json`). Also 0 px for the lamp-lit benchmark walls (w5b at a lamp). |
| 2 | **SF-1**: exact draws per workload and view are pinned in `npm test`, and the headless count equals the browser's (`--expect`, culling off: 108 of 108) | **Partly** | The formal JSON holds 108 of 108 (GPU) and 36 of 36 (SwiftShader), clean tree; my subset 40 of 40. But the gate counts layers its own tool builds, at two level states, unlit and unculled. E1 and E2 (the editor stops instancing or merging) pass all 595 tests and the check, and only the manual `--expect` refuses them; I1 and R1 (wrong bounds) pass the 595 tests, the check, `--expect` and the isolation check, while a far view loses its buildings or roofs; lamps add a second main pass and 36 shadow maps the model does not state (SF-A, MF-B). |
| 3 | **SF-2**: round 2's 16 survivors (plus W2b, W3b) are killed by the whole suite | **Holds** | At `1518afe`, with the answer's own harness (only its null-exit rule changed): 17 of the 18 are killed by their module tests (and the check where it applies); B4 survives those and is killed by the whole suite (594 of 595 pass; the count gate fails) (`mutation/r2rerun-*.json`). The harness's new mutant G11 survives (SF-E). |
| 4 | **SF-3**: extended digest, fixture hash pin, export check, registry split | **Holds**; the material key is a subset | From Git objects (`provenance-r3.json`): the fixture equals `ee7c18e`'s renderer in 96 of 96 under the current digest, and the current renderer gives the same 96; `reviewed.renderer` a6a71831 is `ee7c18e`'s blob; the catalogue-content hash 49ac30… holds for `ee7c18e` and for the tree; the fixture hash 037cc5… is pinned. Controls fail as they must: glass opacity +0.01 changes 96 of 96 digests, a forged entry leaves 95. Gap: G11 (SF-E). |
| 5 | **SF-4**: the facade is independent by default; `shared: true` opts in; an installed proof runs the batching module | **Holds** | The default facade against main 0.10 (`api-diff.json`): 48 of 48 originals identical in every node, transform, user datum, shadow flag, attribute byte and material, over 125 views (the controls see one ulp and a roughness change). `test:grenade-renderer`, which CI runs, includes the installed proof, and it ran in my gates ("Installed renderer building facade: shared copies draw one design from display batches"). Shared mode keeps `castShadow` on the back glass halves (N2). |
| 6a | **Instancing** is not bit-identical; every differing pixel is a tie, an edge, shading of at most 2 levels, or an isolated texel shift; at most 215 px | **Partly**: the counts reproduce, the argument does not discriminate, and the bound does not hold under lamps or far from the origin | Main → candidate (`browser/pixels-instancing.json`): w1 20 / 128 / 11 px, w4 30 / 215 / 54, the no-repeat control 0, exactly the record's counts. With the strong oracle the ties are 2 / 44 / 0 and 14 / 21 / 45 (the answer's weak mask: 16 and 47 for w4). Every differing pixel above 10 levels is a single pixel or a 2–3 px run. **The control:** a built copy with one instance moved by **1 cm** differs in 2,139 px (overview), 104,004 (close) and 1,522 (cutaway), each as **one** blob, and the answer's classes put 97 %, 86 % and 96 % of those pixels into "edge" or "shading". The classes cannot tell a defect from rounding; the count and the blob shape can. Beside a lamp: 3,593 and 5,022 px (SF-C). |
| 6b | **Roof merge** byte-identical; `createRoofMaterial` in `./roofs/three` | **Holds** | Main → candidate, 0 px in every roof view I added: lamp-lit close and overview, a far close view, and a mixed-level map at levels 1 and 2. `createRoofGroup` against main, 144 roofs × 5 option sets: 720 of 720 identical. Merged-roof selection bounds: 144 of 144 identical to unmerged. The tests kill eight of nine merge mutants; R1 (wrong bounds) survives the whole suite and the check (SF-A). |
| 6c | **Glass halves**: two fixed-side copies, byte-identical in 15 of 15 views, same counts | **Holds** (code-reading, counts) | `renderObject` (`three.module.js:16856`) does set `needsUpdate` before each half, so the mechanism is real; the pinned counts pass unedited (`node tools/asset-draw-counts.mjs` in my gates: "Asset draw counts match the pinned fixture"); and the four halves mutants (H1–H4) are all killed by the module tests. Pixels against the parent were not re-captured; main → candidate is 0 px wherever no design repeats (w7 close, lamp-lit w7 at two lamps). |
| 6d | Culling: instances and merged roofs are culled as wholes, so close views draw more triangles | **Holds, understated** | w1 close, assets: 1.37 M → 2.72 M triangles (+98 %); whole close 1.95 M → 3.30 M. `docs/building-prefabs.md:72` still cites round 2's +1.1 % / +5.1 % for batches. With six lamps ×5 to ×8 (MF-B). |
| 7 | **SF-6**: `--assets-only` is exact (it refuses otherwise) and its ratio is a lower bound | **Holds as a desktop measurement; the bound is conditional** | The isolation check refused nothing in 10 series (my subset, five lamp-lit maps, four mutant copies) and refused the instrument mutant X1 (its asset set without the merged roofs) in both runs, so it can fail. The check compares draw sets, not costs (SF-D). Frame-minus-blank and isolated ratios agree when the candidate only removes draws (lamp-lit w7: ×2.87 vs ×2.94 overview, ×1.94 vs ×1.91 cutaway) and part when it trades draws for triangles (lamp-lit w1: ×4.09 vs ×2.34, ×5.73 vs ×1.72). |
| 8 | **The goal**: assets at least ×2 in 18 of 20 views (RTX 3080), whole frames ×1.8–5.8 at the overview | **Holds for the unlit benchmark; fails with lamps** | My subset, assets only (4 runs, 07:00–07:06): w1 ×3.76 / ×2.00 / ×3.29, w4 ×6.88 / ×3.51 / ×3.84, w5b ×18.9 / ×5.75 / ×4.50, w6 ×5.02 / ×1.96 / —; null ×1.00–1.05. All inside the record's per-run ranges except w5b cutaway (×4.50 against ×4.65–5.40; mine 4.29–5.20). Whole frame w1 ×2.49 / ×1.62 / ×1.34. With six lamps: w1 ×2.34 / **×1.29** / **×1.72**, w4 ×3.63 / ×3.42 / **×1.83**, w7 ×2.94 / ×3.97 / **×1.91** (assets only). On the triangle-bound proxy (SwiftShader, whole frame): unlit w1 ×1.00 / **×0.88** / ×1.02, lamp-lit w1 **×0.65 / ×0.57 / ×0.87**; blank maps ×0.99–1.02. Phones were not measured. |

**Judgment on the goal.** On a desktop RTX 3080 and the benchmark's unlit maps, the assets render at least twice as fast, as the record says: my subset reproduces it within the record's ranges (the 32 copies' close view at exactly ×2.00, the roofs' close view at ×1.96), and the whole frame gains ×1.7 to ×5.4 at the overview. With six lamps it still holds at the overviews and in most close views, but not in the cutaways (×1.72, ×1.83 and ×1.91 for w1, w4 and w7) nor in the copies' close view (×1.29), where instancing multiplies the triangles. It does not carry to a renderer that pays per triangle, where repeated designs gain nothing unlit and lose under lamps. What remains: per-copy culling in every camera (MF-B), then phone measurements, then the close views of very large structures (spatial sub-batches, as the record's N5 says).

## Mutation results (`mutation/`)

**This round's 33 mutants** (`mutate-r3.mjs`; phase 1 against the module's tests, then every survivor against the whole suite and `tools/check.mjs`). HEAD `1518afe`, status clean before and after each phase; no invalid needle, no null exit. **21 killed, 12 survive everything.**

| Group | Killed in phase 1 | Survived phase 1, and then the whole suite (595 of 595 pass) and the check |
| --- | --- | --- |
| Instancing (I1–I9) | I3 instances only from 3 copies · I4 copies drawn as well · I5 instance sets always visible · I9 glass instanced | **I1** each set bounded by its template node's sphere · **I8** released sets never disposed · I2 drop the node's place in its template (equivalent, N6) · I6, I7 skip the early release, or leave copies hidden on release (nearly equivalent: `setView()` restores them after every update; only a pending load shows the difference) |
| The editor's wiring (E1, E2) | — | **E1** the editor builds its prefab layer with instancing off · **E2** the editor builds its roof layer with merging off |
| Roof merge (R1–R9, RC1) | R2 sort ignores level · R3 shells never restored · R4 mergeable ignores the matrix* · R5 merged geometry leaks · R6 foreign materials merge* · R7 merged ignores visibility · R8 merged mesh casts nothing* · R9 a reorder keeps the merge | **R1** merged mesh bounded by its first roof · RC1 slot materials unnamed |
| Glass halves (H1–H4) | H1 the back half casts · H2 the front half's shadow one-sided · H3 the material pair not cached · H4 front half first | — |
| Count tool (C1–C6) | C2 casters ignore `noShadow` · C3 hidden nodes counted · C4 instances counted once · C6 the workload one copy short | C1 one pass always (dead since `bd27cb5`, N2) · C5 the rig-rule refusal off (by design: it guards a vendored file) |
| Facade (F6, F7) | F6 shared by default | **F7** shared copies stop following the design's view |

\* Killed through a failing assertion whose message node:test builds from three.js objects (N7): R4's test process reached about 50 GB before I stopped it; R6 and R8 ended their test file with 23 of 40 tests reported.

What the survivors say:
- **The gate never sees the editor or the bounds** (E1, E2, I1, R1; SF-A).
- **Released instance sets are never checked for disposal** (I8): with it, every update (each edit and each view change) leaks one instance buffer per batch mesh of every repeated design.
- **Shared-mode view mirroring is untested** (F7). In shared mode a cutaway on one copy changes 7 of the 15 nodes of every other copy of `dockside-warehouse` (6 glass meshes, 1 batch mesh; `f7-mirroring-probe.txt`, run on a clean archive copy). Under F7 they keep their exterior visibility, so the other copies' upper-floor glass would float in a cutaway (code-reading plus that count; not rendered); the test compares two copies with each other, not with the design, and the installed proof calls `setView` but asserts nothing.

**The bench's own checks, mutated** (`isolation-mutants.sh`: the page probe edited in a built copy of the candidate, GPU, 2 runs). **X1**, the isolation's asset set forgets the merged roofs: the isolation check refuses the overview and close views of both runs (isolated 0 draws against the frame-minus-blank's 10, 5 of them shadow draws; the level-0 cutaway shows no roof), and `--expect`, which counts through the same asset set, refuses too. The check can fail. **X2**, `--expect` stops turning culling off: refused on w2 in both runs (414 main draws against the pinned 416 at the overview, 195 against 196 in the cutaway). Culling changes the count, which is why the check turns it off, and also why it cannot see a culling regression such as I1 or R1.

**Round 2's 18 survivors and G11, with the answer's own harness** (`r2rerun/`, copied outside the tracked tree; a null exit now an error): at `1518afe`, 17 of the 18 die in phase 1: B8, B12, B13 and B14 by the batch tests; W2, W2b, W3, W3b, W4, W6 and W7 by the wall tests; G5c, G7c, G8 and G9 by the tests and the check; D2 and D3 by the digest tests. B4 survives its module tests, as in round 2, and is killed by the whole suite (594 of 595 pass): the count gate is its falsifier. **G11** (new: an emissive term on every catalogue material, exports and registry refreshed) survives the module tests and the check, and then all 595 tests (SF-E). The only change to the harness is that a null exit counts as an error, not a kill; no mutant had one, here or in my own harness.

## Gates on `1518afe` (`gates/summary.txt`, logs in `gates/`)

Run one after another on the clean sandbox (status clean before and after) once the mutation, pixel and proxy jobs had finished, 08:26:37–08:30:05:

| Gate | Exit | Time | Result |
| --- | --- | --- | --- |
| `npm run build` | 0 | 18 s | — |
| `npm run check -- --tracked` | 0 | 8 s | — |
| `npm test` | 0 | 98 s | 595 / 595 pass, 0 fail, 0 cancelled |
| `npm run test:upstream` | 0 | 5 s | 32 / 32 |
| `npm run test:package` | 0 | 8 s | — |
| `npm run test:assets` | 0 | 9 s | — |
| `npm run test:grenade-renderer` | 0 | 4 s | includes the installed building proof ("Installed renderer building facade: …") |
| `npm run check:buildings` | 0 | 3 s | — |
| `node tools/asset-draw-counts.mjs` | 0 | 7 s | Asset draw counts match the pinned fixture. |
| `npm run review:integration` | 0 | 48 s | drawCalls frame 1115, shadowPass 619 |

All gates pass. None of them would fail on MF-B (no lamp anywhere), on E1, E2, I1, R1, I8, F7 or G11 (each passes all 595 tests and the check), or on a pixel change (no pixel gate). `review:integration` asserts only that its frame count covers more than the composite pass.

## Not verified

- **Phones and integrated GPUs.** This machine has one RTX 3080 and no integrated GPU. SwiftShader is a CPU rasteriser, used here only as a triangle-bound proxy; it is not a phone.
- **Spot lights, electric lamps at night, more than six lamps.** The lamp maps use fires (always lit, point lights). Searchlights (spot), floor lamps, sconces and streetlights (lit at night) were not placed; more lamps add passes and faces.
- **Lamp-lit roofs (w6)** were timed while another agent's processes and my mutant-copy builds loaded the box; the null control spread to ×0.43–1.34 in the cutaway, so that series is not used for timing. Its counts are load-independent: the roofs' triangles grow from 0.01 M to 0.10 M per frame with lamps, small beside the copies' growth, and their pixels are byte-identical.
- **Unlit w2, w3, w5a and w7** were not re-timed (the record's numbers stand for them); lamp-lit w7 was.
- **The glass halves' pixels against their parent commit** were not re-captured; main → candidate covers them only together with the rest.
- **Open times and the generator** (`--node`) were not re-measured.
- **Why R6 and R8 ended their roof test file early.** The outcome is recorded (23 of 40 tests reported, exit 1), and R8 reproduces in a scratch copy (the file dies after 36 s without reporting a test), but the child's own error message was not captured.
- **Memory and VRAM** beyond the instance-set lifecycle (64 created and 64 disposed in `instancing-edits.json`).
- **Consumers of `shared: true`** (AFT, Farmyard, Tinderbox) were not read.
- **The editor's own frame loop.** Both benches call `scene.draw` directly; the interactive loop's scheduling was not measured.

## Carried engine items (not scored)

- **MF1** (open): the editor export still passes silently through AFT and Farmyard, which drop buildings, roofs and wall runs.
- **MF2** (open): pins name unreleased commits. `ee7c18e` is now recorded honestly as the reviewed renderer (SF-3 holds), but it is still reachable only from `codex/nautilus-art`.
- **MF3** (open): no asset standard, registration or authoring path. The landmarks cannot enter the editor, so the speed work cannot reach them.

## Evidence index (`artifacts/r08-3/`, copied to [`evidence/hostile-review-0.8-round-3/reviewer/`](evidence/hostile-review-0.8-round-3/reviewer/); local paths masked as `<sandbox>`, `<baseline>`, `<scratch>`; page scripts stored as `.js.txt`, PNG folders and the regenerable lamp maps left out, the GPU results reduced to per-block medians)

| File | What |
| --- | --- |
| `timing.sh`, `timing/summary.txt`, `timing/plain-gpu.json`, `timing/lamps-*-gpu.json` (+ logs), `tables.mjs` | The answer's instrument on a subset and on lamp-lit maps (GPU), with load samples and exit codes |
| `lamp-maps.mjs`, `lamp-maps/<map>/` | Lamp-lit workloads: each map plus the blank map with the same six lamps |
| `swift-timing.mjs`, `swift-timing.json`, `swift-timing.log` | The triangle-bound proxy (SwiftShader), paired |
| `pixel/pixel-probe.mjs`, `pixel/pixel-probe-page.js`, `pixel/probe-maps.mjs`, `pixel/cases-r3-*.json`, `pixel/maps/` | Round 2's pixel probe with this round's classes and components; cases and maps |
| `browser-checks.sh`, `browser/summary.txt`, `browser/pixels-*.json` (+ `-png/`), `browser/bench-*.json`, `pixel-summary.mjs`, `delta-blobs.mjs`, `crop.mjs`, `crop-*.png` | Pixel probes (MF-A, instancing, lamp-lit and far views, mutant copies), large-delta clusters, crops, and the bench on mutant copies |
| `make-trees.mjs` | Built copies of the candidate with one mutant each (I1, R1, E1, E2, I10), in `<scratch>` |
| `mutate-r3.mjs`, `mutation.sh`, `mutation/r3-phase1.json`, `mutation/r3-confirm.json` (+ logs) | This round's 33 mutants, phase 1 and whole-suite confirmation |
| `r2rerun/mutate.mjs`, `r2rerun/regen-fixture.mjs`, `mutation/r2rerun-*.json` (+ logs) | Round 2's survivors and G11 with the answer's harness (a null exit is an error) |
| `watchdog.ps1`, `mutation/watchdog.log` | The memory watchdog and the stop of PID 27088 |
| `provenance-r3.mjs`, `provenance-r3.json` | The provenance pin from Git objects, with controls |
| `api-diff.mjs`, `api-diff.json` | The facade and the roof adapter against main 0.10; merged-roof selection bounds |
| `instancing-edits.mjs`, `instancing-edits.json` | Instancing under edits, undo, redo and overlapping updates |
| `facade-glass-probe.mjs`, `facade-glass-probe.json` | Shared-mode glass casters without the daylight rig |
| `gates.sh`, `gates/` | The repository gates on the clean sandbox |
| `digest-results.mjs` | Prints the mutation, bench, gate and proxy results in one pass |

## The answer to round 3, measured

Evidence paths below (`answer/…`, `reviewer/…`) are relative to [`evidence/hostile-review-0.8-round-3/`](evidence/hostile-review-0.8-round-3/).

Round 3 scored the answer 7/10. It found one must-fix (MF-B: lamps turned instancing into a triangle multiplier), five should-fixes and nine nits. The answer is on the same branch, after `1518afe`:

| Commit | Answers | Change |
| --- | --- | --- |
| `21d7d98` | MF-B; SF-A; N1, N2, N7–N9 | A repeated design's batch meshes draw through `CopyBatch`: each camera culls every copy on its own. The count gate builds the editor's own scene classes. Bounds, disposal, shared-view and roof-guard tests; the back glass half casts no shadow in any host |
| `cf01677` | SF-E | The building digest covers every serialized material setting; `tools/record-building-geometry.mjs` re-records it from the reviewed commit's renderer |
| `62ebfdf` | N6 | A provider that nests its batch meshes, so a copy's place in its template is tested |
| `d62da1b` | (this answer's K7) | A shadow draws the view's run, tested in a cutaway |
| `54ad390` | SF-A, SF-B, SF-D, N4 | The bench: lamp-lit maps, a far view, GPU time, the strong tie oracle, reduced motion on SwiftShader, `--counts-only`, culled counts per rig, and a CI job |
| `f98d4cc` | (survivors) | The count model's three refusals, a pending load, and the level-1 cutaway in the headless count |
| `d7b38bf` | MF-B (beyond) | Each run of consecutive copies in view is one instanced sub-draw: the formal run on `f98d4cc` showed per-copy sub-draws slower than round 3's instancing on the Gross houses |
| `2039b21`, this record | SF-C, N3, N5 | Docs and changelog; this record |

**Rig and method.**
- One machine: Windows 11, Ryzen 7 5800X (16 threads), RTX 3080 (ANGLE D3D11) for timing, SwiftShader for pixels and for the triangle-bound proxy; headless Edge 156, viewport 1600 × 1100, editor canvas 1056 × 916 (967,296 pixels).
- The formal runs (`answer/formal-r3/`, `formal3.sh`) measured `d7b38bf` in a clean worktree (status recorded empty in `load.txt`) against main 0.10.0 `fb35277`. GPU: 11:47–12:19, CPU load 2–3 % before and after, 4 runs, 20 frames × 4 blocks per view, all 18 maps, `--assets-only --expect`. SwiftShader: 12:19–13:02, 3–15 %, 2 runs, 8 maps. The first formal run, on `f98d4cc` (10:27–11:00, 6–7 %), is kept in `answer/formal-r3-f98d4cc/`.
- Both trees run as two pages of one browser, with A B B A blocks per map and view; each map's reference blank (the blank map with its lamps) runs identical code in both arms, so its ratio is that map's noise floor.
- Pilots against intermediate builds are labelled with the build.

### MF-B: copies culled one by one, in every camera

A design placed more than once now draws each batch mesh through a `CopyBatch` (`apps/editor/copy-batch.js`). It is three's `BatchedMesh` on the template's own geometry, with one instance per copy. Each camera that draws it tests every copy's sphere, the one that copy's own mesh would be culled by: the view, the sun's shadow camera, and each face of each lamp's. It draws the rest in one multi-draw per geometry group, so views (the template's groups) still follow the template; since `d7b38bf`, each run of consecutive copies in view is one instanced sub-draw of it (below).

Two traps in three r180 shaped it, both measured:
- **The renderer tests `object.colorTexture`**, which `BatchedMesh` never sets (it keeps `_colorsTexture`). So every `BatchedMesh` draw would re-derive its shader program. `CopyBatch` sets it to `null`, and a test pins the renderer lines it relies on.
- **`BatchedMesh` rewrites its copy table (the indirect texture) for every camera.** On ANGLE/D3D11 each rewrite, between draws that read the table, stalls the frame. A CPU profile of the lamp-lit cutaway showed it: 14.9 ms per frame with the rewrites, 7.2 ms with them disabled. Instead, sub-draw *k* is always copy *k*: the table is the identity, written once, and a culled copy draws no vertices. A test pins that no camera rewrites it.

Pilot, three arms as pages of one Edge (`answer/arms.mjs`, paired blocks, assets only, ms per frame; main 0.10, round 3's instancing build `1518afe`, and `CopyBatch`):

| w1, 32 copies of one design | main 0.10 | `InstancedMesh` | `CopyBatch` |
| --- | --- | --- | --- |
| unlit: overview / close / cutaway | 10.8 / 4.8 / 3.2 | 3.2 / 2.5 / 1.2 | 3.5 / 2.1 / 1.3 |
| six fires: overview / close / cutaway | 23.4 / 8.2 / 6.8 | 10.7 / 6.5 / 3.8 | 7.7 / 3.3 / 3.2 |
| six fires, asset triangles at the overview | 8.15 M | 52.62 M | 8.33 M |

**Runs: one instanced sub-draw per run of consecutive copies in view.** A first formal run on `f98d4cc` (`answer/formal-r3-f98d4cc/`) gave every copy in view a sub-draw of its own. That held round 3's lamp-lit copies above ×2. But on the 32 Gross houses (13 designs, 2–3 copies each) it was slower than round 3's instancing. Assets only: unlit overview ×6.09 against ×7.32; lamp-lit overview / close / cutaway ×2.69 / ×2.17 / ×1.37 against ×3.63 / ×3.42 / ×1.83. My first explanation was that a camera seeing every copy (the view's two light passes, the sun) got one sub-draw per copy, where an `InstancedMesh` issues one instanced draw. So `d7b38bf` makes each run of consecutive copies in view one instanced sub-draw, placed at the run's first copy, and three's batching chunk reads the copy table at `gl_DrawID + gl_InstanceID`. A plain multi-draw has `gl_InstanceID` 0, so any other `BatchedMesh` draws as before. Calls and triangles are unchanged, and both pinned rigs' counts pass unedited. This uses three r180's instanced multi-draw path, deprecated since r174 and removed in r184; the contract test pins it. Without `WEBGL_multi_draw` (where three's instanced fallback sets no draw id) each copy in view is a plain sub-draw again. A pilot with three pages in one Edge (`answer/arms-v2.json`, ms per frame, assets only) seemed to confirm it on the Gross houses:

| | main 0.10 | per-copy sub-draws (`f98d4cc`) | runs (`d7b38bf`) |
| --- | --- | --- | --- |
| l4, Gross, six fires: overview / close / cutaway | 75.9 / 33.4 / 40.4 | 31.0 / 15.0 / 30.5 | 23.0 / 11.0 / 26.0 |
| l1, copies, six fires: overview / close / cutaway | 23.1 / 8.3 / 6.8 | 8.1 / 4.2 / 3.8 | 7.5 / 4.2 / 3.6 |
| w1 unlit: overview / close / cutaway | 8.6 / 3.6 / 2.5 | 2.9 / 1.8 / 1.2 | 2.7 / 1.8 / 1.2 |

The formal runs, two pages per browser as always, did not. Between `f98d4cc` and `d7b38bf` the lit Gross houses are equal within noise: overview 23.6 → 23.2 ms, cutaway 25.8 → 26.0 ms, against main's 61–63 and 35 ms. The third page had loaded the pilot's arms unequally. The runs stay: they are byte-identical, never slower, and one draw where a camera sees every copy. But they are not what the Gross houses needed (see below).

**Formal, on `d7b38bf`** (RTX 3080, assets alone on this rig, median and range over 4 runs; `answer/formal-r3/tables-gpu.md`):

| Six fires | Overview | Close | Far | Cutaway |
| --- | --- | --- | --- | --- |
| 32 copies of one design (l1) | ×3.07 (2.96–3.14) | ×2.07 (1.97–2.13) | ×2.21 (2.12–2.40) | ×2.14 (1.98–2.20) |
| 32 Gross houses, 13 designs (l4) | ×2.62 (2.22–2.89) | ×2.09 (1.65–2.66) | ×1.95 (1.72–2.10) | ×1.34 (1.26–1.47) |
| 2,400 free-angle walls (l5b) | ×6.84 | ×3.27 | ×6.01 | ×3.06 |
| 144 roofs (l6) | ×7.24 | ×1.86 | ×2.05 | nothing drawn |
| No repeated design (l7) | ×2.87 | ×3.53 | ×3.84 | ×1.91 |
| Blank maps with the same fires (null) | ×0.99–1.01 | ×0.96–1.00 | ×1.00 | ×0.98–1.01 |

- **Triangles under lamps.** With six fires, 32 copies draw 8.33 M asset triangles per frame at the overview, against main's 8.15 M and round 3's 52.62 M. Whole frames show the same: 14.95 M against main's 14.77 M (round 3: 59.25 M).
- **The GPU's own time falls too**: 32 copies lit ×4.4–9.2, unlit ×3.4–9.7. It falls in every changed view except the roof maps' close and far views, where it stays under 0.3 ms either way (×0.82–1.06; see SF-C).
- **The Gross houses are slower than round 3's instancing**, unlit (overview ×5.33 against ×7.32) and lit (×2.62 / ×2.09 / ×1.95 / ×1.34 against ×3.63 / ×3.42 / — / ×1.83). Every multi-draw there holds a single run, which is why the runs could not help. A count of setups names the cause (`answer/exp-wasted.js`): per frame, 2,739 of the batches' shadow setups find no copy in their camera, against 1,526 that draw. Each design's 2–3 copies are spread across the district, so the batch's union sphere passes the renderer's test for most lamp faces, and each such setup costs a program and two texture bindings. An `InstancedMesh` paid the same setups but drew in them, which this GPU absorbs. For the 32 dense copies (l1) it is 87 empty against 206.
- **The next step:** batch only copies that neighbour each other (single linkage on their footprints), so sparse repeats draw as per-copy batches and dense ones stay batched.

**The triangle-bound proxy** (SwiftShader, whole frames, paired, 2 runs, reduced motion; `answer/formal-r3/tables-swiftshader.md`):
- Lit by six fires, 32 copies are at parity with main: ×0.96 / ×0.97 / ×0.97 / ×1.00 (overview / close / far / cutaway). Round 3 measured round 2's instancing at ×0.65 / ×0.57 / — / ×0.87.
- Unlit, 32 copies: ×0.97 / ×0.95 / ×0.97 / ×0.98 (round 3: ×1.00 / ×0.88 / — / ×1.02). The remaining few per cent are the batching shader's reads per vertex (the copy table and four matrix texels), which a CPU rasteriser pays per vertex.
- The Gross houses and the mixed district: ×1.01–1.04. The blank maps: ×0.98–1.00.

**Pixels: pre-registered and held, twice.** `CopyBatch` uses the same vertex arithmetic as `InstancedMesh` (view × (copy × vertex)) and draws the copies in the same order, so its frames should be byte-identical to round 3's instancing build. On SwiftShader they are, in all 16 unlit views of w0, w1, w4 and w7 (the far view included), and in the lamp-lit w1 overview and close view. The lamp-lit cutaway differs in 8 tie pixels, exactly as the lamp-lit blank map's two arms do: the fires animated, so lamp-lit frames were not still. The bench now reduces motion on SwiftShader, and a repeat of one arm is byte-identical again. The runs change (`d7b38bf`) should change nothing either: its frames are byte-identical to `f98d4cc`'s in all 20 views of w0, w1, w4, lamp-lit w1 and its blank, with every repeat identical (`answer/pix-v1-vs-v2.json`). Against main, see SF-C.

**Against the goal.** Assets alone on this rig, at least ×2 in 41 of the 46 views this work changes:
- **Unlit: 26 of 27.** The miss is w1's close view, ×1.89 (1.80–2.05), which was ×2.01 on `f98d4cc`.
- **Lit by six fires: 15 of 19.** The misses are the Gross houses' far view (×1.95) and cutaway (×1.34), the roofs' close view (×1.86) and the mixed district's cutaway (×1.91).

In the two lit cutaways the inherited light renderer dominates. A CPU profile of the lit Gross cutaway (`answer/prof-l4-cutaway-main.json`, `answer/prof-l4-cutaway-candidate.json`) shows both arms CPU-bound (main 40.8 ms of CPU in a 41.8 ms frame, the candidate 24.6 in 26.4). Each carries 10–12.6 ms of native time and about 2.4 ms of program re-derivation: the light renderer marks every material changed twice a frame when it needs a second pass, and all 36 lamp shadow faces are re-rendered every frame.

Whole frames, which carry the inherited scene, are ×1.8–5.5 faster at the overview unlit and ×1.7–2.8 lit. The null controls are ×0.98–1.04.

### SF-A: the gate saw neither the editor nor the bounds

- **The editor's own layers.** `tools/asset-draw-counts.mjs` now constructs the editor's scene classes (roofs → prefabs → walls) on a headless stand-in for the inherited AFT scene: during construction the wall scene extends the stand-in instead. Only texture loading is replaced. E1 (the editor's instancing off) and E2 (its roof merge off) fail it, in `npm test`.
- **Bounds.** Each copy's sphere must equal the one its own mesh would be culled by, and every vertex of every copy must lie inside its sphere and the batch's. Every roof vertex must lie inside the merged mesh's sphere and box. These are the analogues of I1 and R1.
- **Disposal and views.** Each released batch is disposed exactly once (I8). After a cutaway, every shared-mode copy is compared with the design, and the cutaway must change the design's visibility (F7). While a building library loads, a dropped copy is gone at once and the rest draw themselves (round 3's I6, I7).
- **Lamps, culling and passes, in the browser.** `tests/fixtures/asset-culled-counts.json` pins every map's asset draws and triangles in every view, as the frames draw them: culled by the view, the sun and each lamp face, through the light renderer's passes. They depend on the rig: the light renderer packs lamps into passes by texture units, and SwiftShader exposes 32 where D3D11 exposes 16. So the fixture keeps one entry per rig, and a rig without one is refused rather than compared. Of 72 map-views, 71 agree across the two rigs. The exception is the lamp-lit w4 far view: D3D11 draws its assets in 2 light passes and SwiftShader in 1 (224 against 112 main draws, the same 1,009 shadow draws). `--counts-only` measures them without rasterising: the WebGL draw entry points are no-ops while three still culls, submits and counts each draw. The headless count also gains the level-1 cutaway.
- **The gate can fail.** Four mutants built into the editor are refused by the CI check (15, 11, 20 and 5 map-views), and the unmutated build passes (see Mutation). The culled counts measured from real frames equal the counts pinned with stubbed draws in all 72 map-views of the formal GPU run (`--expect`), so stubbing changes no count.

### SF-B: CI has a browser

Round 3 was right: the browser-workflow job installs Chromium. A new `asset-counts` job runs `npm run review:asset-counts`: the workloads, then `--counts-only --backend swiftshader --expect` against both fixtures. Locally it takes 161–208 s (18 headless checks and 72 culled checks). Pixels stay a review step, not a gate. Repeated designs round differently from separate meshes, so a pixel gate needs a tolerance, and committed reference frames would pin the CI browser's SwiftShader build. The culled counts already change when a copy or a roof is culled wrongly.

### SF-C: the cost of batching copies, stated

The docs now state batching's costs, measured (`docs/building-prefabs.md`, `docs/sloped-roofs.md`).

- **Pixels against separate meshes** (SwiftShader, `d7b38bf` against main, at the 1056 × 916 canvas, 967,296 pixels):

  | Map | Overview | Close | Far | Cutaway |
  | --- | --- | --- | --- | --- |
  | 32 copies of one design | 20 | 128 | 682 | 11 |
  | 32 Gross houses | 30 | 215 | 1,402 | 54 |

  - The far view, a close view of the last copy, is new; float32 has fewer bits to spare far from the origin.
  - In the close and far views 62–99 % of these pixels differ by one or two colour levels.
  - The rest are strong depth ties and single pixels, or small blobs: at most 81 pixels outside the far views, and up to 385 pixels of one- or two-level shading in them.
  - Lit by six fires, the copies differ just as much in the benchmark's views (20 / 128 / 682 / 12). Round 3 counted 3,593 and 5,022 at its own cameras beside a lamp, where shadow edges move. `CopyBatch` is byte-identical to the build round 3 measured, so those counts stand.
  - Maps without repeats are byte-identical, apart from 1–3 cutaway pixels at baked door leaves; the blank maps, lit or not, are 0 in all 12 views. Every repeat of one arm was byte-identical.
- **Triangles.** Copies are culled one by one again, so a close view draws per-copy triangles: 32 copies 1.37 M → 1.38 M, and lit 3.29 M → 3.37 M, against round 3's 2.72 M and 26.96 M. Every map's culled draws and triangles are pinned.
- **Merged roofs** are culled as one mesh, so each lamp face that sees any roof draws all 144: 0.10 M roof triangles per frame against main's 0.01 M. That is cheap at roof triangle counts, but the lit close view gains only ×1.86.
- **The frame size**: 215 pixels is 0.022 % of the canvas; the record's "1.76 M" was the viewport, not the canvas.

### SF-D: CPU work hidden behind GPU work

Every timed frame now also carries its GPU elapsed time (`EXT_disjoint_timer_query_webgl2`, which headless Edge offers on ANGLE/D3D11 and SwiftShader), so a CPU-for-GPU trade shows. The direct figure is labelled "assets alone, this rig"; the whole frame sits beside it, and the docs say that the isolated frame also carries the frame's per-frame scene updates (N5). The triangle-bound proxy (SwiftShader) is part of the formal run.

GPU elapsed time, assets alone, main → this, median of runs (`answer/formal-r3/tables-gpu.md`):
- 32 copies: 6.45 → 0.70 ms at the overview unlit (×9.7), 19.97 → 4.53 ms lit (×4.4).
- The other changed views: ×2.3–32.
- The exceptions are the roof maps' close and far views, where the GPU spends under 0.3 ms either way (×0.82–1.06); the lit roofs' close view loses 0.08 ms.

So the isolated ratios are not CPU savings bought with GPU time. Where both are known, the GPU gains more than the isolated frame does.

### SF-E: the digest's material key

The key is now `Material.toJSON()` without its uuid, with each texture's own settings in place of the texture's uuid. `tools/record-building-geometry.mjs` re-records the 96 reviewed digests with the reviewed renderer itself: `ee7c18e`'s building-catalog files are read from Git objects, and the run is refused unless its `three.js` hashes to the recorded `a6a71831`.

| Check | Result |
| --- | --- |
| Old key: recorder against the committed fixture (control) | 96 of 96 equal |
| New key: recorder against the old fixture | 96 of 96 differ |
| New key: the current renderer against the re-recorded fixture | 96 of 96 equal |

G11 (an emissive term on every material) now fails the digest test. The test also checks emissive intensity, vertex colours, flat shading, alpha test, blending, shadow side and a texture transform, and that two equal atlases digest alike.

### Nits

| # | Answer |
| --- | --- |
| N1 | The shared-mode back glass half sets `castShadow = false`, for any host |
| N2 | The dead two-pass rule is now a refusal (tested); the count tool's header says one shadow map |
| N3 | The changelog says 3.2 (game) to 3.4 (authoring) times faster |
| N4 | The bench's pixel comparison uses the strong tie oracle, and reports the blobs of what no tie explains |
| N5 | The docs say the isolated frame carries the per-frame scene updates too |
| N6 | A provider that nests its batch meshes; P2 (drop the copy's place in its template) is killed |
| N7 | Identity checks on three.js objects compare plain values, with a message |
| N8 | Slot material names are tested |
| N9 | The merge guard also refuses a draw range, morph attributes, a hidden shell, a non-default render order or layer, and an open-ended group, each tested |

### Mutation (`answer/mutation/`)

**This answer's harness** (`answer/mutate-a3.mjs`) follows round 3's rules:
- a dirty tree is refused, and every needle occurs exactly once;
- files are restored and hash-checked in a `finally`;
- the buffer is 256 MB, and a null exit is an error.

It ran 46 mutants of the new code, in a clean worktree:

| Pass | Mutants | Result |
| --- | --- | --- |
| Phase 1 at `62ebfdf` (module tests) | 35: CopyBatch K1–K12, the prefab layer P1–P6, the roof layer R1, R10–R15, RC1, the count tool C4, C7–C9, the digest G11–G13, the facade F7, N1 | 31 killed. K7 (a shadow ignoring the run) survived because in the exterior the run is the whole geometry; `d62da1b`'s cutaway test kills it. C9 (lamp-lit maps counted headless) survived only until the lamp-lit maps existed: killed at `54ad390`. C7 and C8 (the count model's refusals off) also survived the whole suite and the check, since they refuse what never happens; `f98d4cc` feeds each the case it refuses, and both are killed |
| At `d7b38bf` | 11: the runs (K3–K6 re-aimed, K13–K16), P7 and P8 (round 3's I6, I7), C5b (round 3's C5 after its refactor) | 11 killed |

**Round 3's own harness** (`answer/mutation/mutate-r3.mjs`, copied unchanged), on its 12 survivors:
- 6 killed by their module tests: I8, E1, E2, R1, RC1, F7.
- I6 and I7 survived its phase-1 test list, which predates `tests/editor-copy-batch.test.mjs`. Against the whole suite at `d7b38bf` both are killed (602 of 603 pass).
- I1, I2 and C1 are invalid: the code they mutate is gone. Their analogues K1/K2, P2 and C8 are killed above.
- C5 survived until `f98d4cc`; its analogue C5b is killed.

**The CI gate itself** (`answer/mutation/ci-falsifiers.json`): four mutants built into the editor are each refused by `--counts-only --expect`:

| Mutant | Map-views refused |
| --- | --- |
| K3, no per-copy culling | 15 |
| K2, a batch bounded by its first copy | 11 |
| P1, the editor never batches copies | 20 |
| R1, merged roofs bounded by the first roof | 5 |

The unmutated build passes, on a clean tree.

### Gates

On `2039b21`, the code this record measures (`answer/gates/summary.txt`; the same gates passed on `54ad390`, `answer/gates-54ad390/summary.txt`). Run one after another, 13:08–13:13, every one exited 0:

| Gate | Time | Result |
| --- | --- | --- |
| `npm run build` | 18 s | |
| `npm run check -- --tracked` | 6 s | |
| `npm test` | 59 s | 603 of 603, none cancelled |
| `npm run test:upstream` | 3 s | 32 of 32 |
| `npm run test:package`, `test:assets`, `test:grenade-renderer` | 20 s | the installed building proof included |
| `npm run check:buildings` | 2 s | |
| `node tools/asset-draw-counts.mjs` | 10 s | the pinned counts |
| `npm run review:integration` | 44 s | |
| `npm run review:asset-counts` (the new CI job) | 160 s | 18 headless and 72 culled checks |

### Not done

- **Phones and integrated GPUs** were not measured; this machine has one RTX 3080. SwiftShader is a CPU rasteriser, used here only as a triangle-bound proxy.
- **Spot lights, electric lamps at night, more than six lamps** were not measured. More lamps add light passes and cube faces; added to the maps, the culled counts would pin them per rig.
- **Without `WEBGL_multi_draw`**, three draws a `CopyBatch`'s sub-draws one by one, and a culled copy then still issues an empty draw. Chrome and Edge expose the extension on both rigs here; other browsers were not checked.
- **Batching only neighbouring copies**, the measured cause of the Gross houses' shortfall; and **merged roofs per tile**, so a lamp face draws only nearby roofs.
- **The inherited light renderer**: it re-derives every program twice a frame when it needs a second pass, and re-renders every lamp's six shadow faces every frame; shadow maps could be kept while nothing moves.
- **Spatial sub-batches** (per floor block or tile) for close views of very large structures, and **LOD** for distant copies.
- **MF1–MF3** stay the architect's.
