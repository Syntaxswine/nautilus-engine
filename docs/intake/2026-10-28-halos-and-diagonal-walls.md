# Pilot intake: interaction halos and diagonal walls

Observed 2026-10-28. This is a scout report for **Architect, Nautilus Engine**. It recommends two additions and bounded review assignments; it does not import either feature, advance pins, migrate a game or publish the Site. Source hashes and readiness observations are in [the evidence record](2026-10-28-halos-and-diagonal-walls.sources.json).

| Candidate | Recommendation | Readiness and ownership |
| --- | --- | --- |
| `FC-7db49df-search-halo` | Favor an optional, depth-aware contour cue for searchable objects | P1 review; the architect is already integrating this exact Farmyard revision. Extend that assignment, avoiding a second port. |
| `NE-cc52f89-wall-runs` | Favor measured, oriented wall runs for Tinderbox's angled buildings; retain square edge walls | P1 architecture/review; an existing contribution from **Coder Tinderbox** is committed. Review and incorporate it before commissioning overlapping implementation. |

The priorities and effort below are scout estimates. Neither entry claims architect acceptance or a completed consumer integration. Both may proceed independently; a combined occlusion fixture is required when they meet.

## FC-7db49df-search-halo

### Sources and current state

Farmyard Commando, commit **`7db49df29a9ff412d06d205f4bc48f75297bce51`**, builds on `03c9c026f17cab26b81a99af0ecf95c345d5d150`. Exact entry files:

- `sites/tactical-animal/dist/search-halo.js`
- `sites/tactical-animal/tests/search-halo.test.mjs`
- `sites/tactical-animal/search-halo-porting.md`

The committed renderer depends on `dist/aft/tactics/vendor/three.module.js` and `three.core.js`; its game-specific candidate functions import `solo-game.js` and `world-grid.js`. These gameplay imports must stay outside the reusable effect. The guide records the chest as the approved baseline and a 1.75-times wider body profile. The revision is present on the local tracked UI branch, but was not on the observed Farmyard `origin/main` (`fb386a5888d12b6bad409b657e92b3e4cc25eb28`). Farmyard's primary checkout was in an unrelated merge with uncommitted changes; none of those bytes were used.

The scout branch still has the earlier UI-material snapshot (`b2f2b6bd033cc3dbc8b572caa251244d283829c8`). The architect already has a halo extraction in progress from `7db49df`; this report is a review supplement to that work. Do not start another extraction or overwrite its worktree.

### Evaluation and preference

**Accuracy.** A golden search outline is a deliberate interface abstraction; it is not physical emitted light. Depth rejection and masks following the visible sprite, posed mesh or ash representation make its visibility more consistent with the scene. For true-to-life presentation, no artificial cue is preferable. For Farmyard's interaction cue, favor the contour effect over light leaking through walls or highlighting a hidden rig. Keep perception, discovery, line of sight and remaining contents under the game's authority.

**Efficiency.** Code-based counts, not timings: one width bucket uses four render calls; the chest/body pair uses six; no targets uses the ordinary scene render. The general pattern is two base calls plus two per distinct width. The edge shader samples eight directions at three radii, so screen coverage and width buckets matter even with few objects. The source keeps three reusable render targets, downsamples masks/light to 0.75 times CSS dimensions, and caps Farmyard's candidates at 12. A simple marker or no cue is cheaper in expected rendering work. Recommend the halo as an optional effect with a small fixed width set and an off/fallback policy for constrained devices. Reduced motion freezes the animation; it does not remove its passes. No CPU/GPU frame-time or memory improvement has been measured here.

**Narrative.** Subjective preference: a contour around the actual painting makes searchable objects readable while retaining their appearance. The reviewed stills show a restrained chest rim and foreground occlusion. Animated appearance is supported by source timing tests and the owner's browser evidence, not a fresh live animation review by this scout. Favor the approved chest profile and separate wider body profile. Each game decides whether gold fits its visual language; a Tinderbox heat/fire cue must not accidentally become a loot or discovery signal.

**Recommendation.** Continue the architect's existing reusable rendering-effect extraction. Supply eligible visible roots, strength, width profile, presentation time and reduced-motion preference through a consumer adapter. Do not import Farmyard's loot logic, marker meanings, AP, RNG or save behavior. This is rendering code that consumes 2D/skins and animated/3D poses, not a new model or movement asset.

### Suggested bounded review assignments

The architect should reconcile these with work already underway. Estimate: small-to-medium review/integration, not a new feature build.

| Helper | Owned outcome | Interface and acceptance |
| --- | --- | --- |
| Coder | Review effect isolation, renderer-state/resource ownership, unsupported render contexts and provenance | One existing Three.js instance; no gameplay imports in the effect; borrowed rigs/textures never disposed; removed targets retire proxies; failed renders restore state; no simulation/save/RNG writes. |
| UI | Review activation, reduced motion, strength/width presets and fallback | Game owns eligibility and knowledge. Hidden, empty and out-of-window targets produce no cue. Disabling the effect changes no game state. |
| Artist, only if needed | Review representative chest, body, ash and skinned silhouettes | Preserve original painting and pose; keep chest/body widths independent; no new art assignment unless the review identifies an actual defect. |

Acceptance should include all eight source tests, independent-width behavior, alpha/occluder scenes, viewport/DPR changes, repeated enable/remove/dispose cycles, and measured baseline-versus-12-target CPU/GPU cost on a named device. Inspect instanced meshes and unusual materials explicitly: the donor skips instanced meshes and is not a universal material renderer. Retain the Three.js MIT notice and donor provenance; unspecified donor licensing is not resolved merely by hashing files.

## NE-cc52f89-wall-runs

### Sources and current state

This candidate was prompted by Tinderbox's catalogue buildings, but its implementation is **Nautilus code**, not a committed Tinderbox simulation feature. **Coder Tinderbox** was already directed by the user to add it to the shared Nautilus editor. Its isolated Site-source repository has commit **`cc52f89de6333a1d94e2dfe45d47d1317369fac0`**, parent **`d3c577fbf78974dc0a20660d46748a83758fd51f`**. It was clean after the source test run. No Git remote was configured in that isolated repository when observed; a GitHub publication/merge is not asserted. The architect handoff includes its local read-only source location so the fixed Git objects can be reviewed deliberately.

The evidence record inventories all 20 changed files. Principal files:

- `packages/map-core/wall-runs.js`, `maps.js`, `blocks.js`, `document.js`, `generator.js`, `wall-example.js`, `index.js`
- `apps/editor/wall-tools.js`, `wall-scene.js`, plus existing editor JS/CSS
- `tools/editor-wall-adapter.mjs`, `build.mjs`, `check.mjs`
- `tests/wall-runs.test.mjs`, `docs/wall-runs.md`, and the two `docs/reviews/2026-10-28-angled-walls*.md` records

The scout baseline exports the inherited east/south edge model; its `core/maps.js` validates only `e:`/`s:` barrier keys. The contribution adds optional `wallRuns` version 1 and a `nautilus-wall-runs-v1` consumer capability without changing the parent map v2/block v1 names. It supplies 45/15/90-degree and free snapping, exact endpoints, one-to-five stories, transactional editing, portable block transforms and generation of inset runs. Angled continuation across generated block seams remains unsupported and is explicitly rejected.

Related art is still **uncommitted research**, not an import source. Tinderbox artist checkout HEAD is **`2fd15661f1334832d5cf873fcc0c6829b5ff53e7`**; `src/art/gross-housing.js`, `assets/art/gross-housing-v1/`, `art/source/gross-housing-v1/`, and the Gross workbench/checker are untracked additions. HEAD does not contain them. The catalogue explicitly says `nautilusImported: false` and requires interior-floor, door/stair and diagonal gameplay support. The committed `src/content/exterior-kit.js` at that HEAD still requires quarter-turn headings; `src/simulation/geometry.js` uses axis-aligned boxes. Do not describe Tinderbox movement, fire or interiors as integrated by this editor contribution.

### Evaluation and preference

**Accuracy.** Measured oriented walls represent a straight angled boundary and its thickness better than a stair-step approximation. The new shared helper tests rays in wall-local coordinates, avoiding a world-axis bounding box that would block empty space. The retained kit is 1 metre panels, 2 metre wall height, 0.16 metre thickness and 2.12 metre floor spacing. These are compatibility dimensions, not proof of historical building accuracy. Floors, roofs and openings remain separate work.

There are two compatible art constructions: the artist declares a new full sqrt(2)-metre diagonal panel with unit mesh scale; the editor composes native 1-metre panels plus a cut end. Both can represent the same physical run. Favor the endpoint/dimension contract as the shared truth and the editor's native-panel assembly for arbitrary measured runs. Allow a purpose-built diagonal art module when dimensions, seams and texture density agree; do not falsely label the artist's newly constructed geometry as a stretched inherited asset.

The run helper's nonzero `radius` expands local slabs. That is a conservative clearance approximation, not a validated exact swept-disc solver at corners. Tinderbox already has rounded-corner swept-disc checks for its axis-aligned obstacles. Favor preserving that actor-clearance behavior through an oriented adapter before Tinderbox advertises support. Test narrow passages, acute joints and diagonal sliding rather than treating ray tests as proof of correct body movement.

**Efficiency.** Code-based estimates: inherited square edges offer cheap grid queries; arbitrary runs require more intersection work and wall-aware reachability. The contribution scans runs, bounds documents at 4,096 runs/50,000 panels, instances panels by length/material/layer, and rebuilds geometry on edits/view changes. These limits do not prove an acceptable worst-case frame time. The art check's 13,255 meshes/385,423 position vertices cover the whole furnished catalogue and are not the cost of 50 diagonal walls alone. Favor grid walls for square tactical layouts and optional runs where angled architecture matters. Cache orientation/geometry and profile representative dense maps before deciding whether spatial indexing or more aggressive batching is needed.

**Narrative.** Subjective preference: true bays and angled rooms better serve Tinderbox's catalogue-inspired streets and interiors; endpoint joining and exact measurements help the artist trace plans. The inspected desktop evidence shows the angled bay and wall controls within Nautilus's existing UI. It is a generic practice block, not a verified reconstruction. Square tactical maps should keep their convenient existing tool. Reconcile material seams and cut pieces with the artist rather than enforcing a different-looking wall kit in each game.

**Recommendation.** Review the existing `cc52f89` contribution as the preferred shared authoring foundation. Treat gameplay adoption as a separate adapter task. Keep unsupported generated seams explicit; do not silently drop or flatten runs. Hold the uncommitted house/skin package for a later exact reviewed pin. Diagonal geometry is primarily a 3D/architecture addition with 2D material compatibility; it supplies no character movement animations.

### Suggested bounded review assignments

First record the architect's decision and source pin. Estimate: medium review/integration; consumer movement/fire work is additional and should be scoped separately. Reuse the existing contribution rather than asking helpers to recreate it.

| Helper | Owned outcome | Interface and acceptance |
| --- | --- | --- |
| Coder | Audit map-core/API compatibility, portable extension, transforms, geometry, generation and host rejection | Preserve legacy outputs/seeds without runs; Node loads without DOM/storage/renderer; no raw vendor edits; reject unsupported feature versions and consumer capabilities; preserve metadata and transactional failure behavior. Review rounded actor clearance separately from rays. |
| UI | Review the existing angled-wall controls in the combined editor | Pointer and exact editing, endpoint joining, cancel, selection, undo/redo, saves/reload, import/export, mobile access and clear unsupported-seam messages. Verify capability rejection through the actual browser handoff. |
| Artist | Validate the shared dimensions/material mapping against a small committed art fixture | Compare a native straight wall, a 45-degree bay and cut ends; check texture metres, winding, joints, thickness, story gaps and opening anchors. Commit/review the donor art first; the whole 13-house catalogue is not required for this pilot. |

Additional acceptance: rotate a block four times; preserve runs in capture/place/replace and seeded generation; reject boundary-crossing runs without partial edits; verify explicit seam refusal; verify no-feature generation matches the pinned original; inspect spawns/traversal and upper layers; confirm the new package version and build adapters coexist with the architect's halo work. Do not approve a consumer merely because it lists the capability. Its movement, LOS, projectiles and fire must consume consistent oriented geometry, with material physics remaining game-owned.

The source plate manifest records a public-domain mark and hashes, and the generated textures have a creation record. Those are donor claims/evidence, not a fresh rights clearance by this scout. Preserve notices and review the exact eventual import closure, including `Resources`, `asset-scale`, textures and source records. Do not import all historic plates or new skins as a side effect of accepting wall geometry.

## Checks and handoff

Performed by the scout:

- Inspected immutable Farmyard source objects, guide, tests and dependency entry points at `7db49df`; all **8 halo tests passed** in its clean worker checkout.
- Inspected the existing wall contribution and source review; all **11 wall tests passed**. Its source was committed as `cc52f89` during the run and clean afterward.
- Ran the read-only Gross art checker: **13 houses, 29 levels, 147 rooms, 1,684 wall units including 50 diagonals**, native dimensions and resource disposal passed. Four key research-file hashes were unchanged across that run. This does not establish gameplay collision or live visual correctness.
- Inspected the donor chest/foreground-occlusion stills and the wall author's desktop still. No new live browser or performance benchmark was run; source-owner browser claims remain attributed to their records.
- Validated the report's exact commit/file/hash references. Required Nautilus baseline checks, tests, upstream regressions and build are recorded in the delivery commit/CI; they do not test features absent from the scout branch.

**Architect instruction:** Review these candidates, choose what fits Nautilus, and subdivide accepted work into bounded assignments for the appropriate existing coder, artist and UI helpers. Define their interfaces and acceptance checks, then review and integrate their contributions in the architect worktree. Preserve the active halo assignment and the existing diagonal contribution. Record decisions under these candidate IDs and avoid duplicate implementation.

Before any combined release, review a visible searchable object partly hidden by a diagonal wall: the scene depth, gameplay visibility and cue must agree. Both lines of work touch package/build/editor delivery, so combine them in the architect branch and run the full checks there before publishing. This scout report does not publish or modify either source checkout.
