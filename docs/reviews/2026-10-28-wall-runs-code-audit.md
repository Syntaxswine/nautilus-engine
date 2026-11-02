# Wall-run code audit: NE-cc52f89-wall-runs

Reviewed 2026-10-28 in the existing Nautilus coder worktree. The architect assigned the headless wall API, portable extension, geometry, transforms, document transactions and generation. The existing implementation was audited and repaired; it was not recreated. Shared editor/build/package integration and the combined halo/wall acceptance remain with the architect and UI helper.

## Fixed source and provenance

Source: Nautilus commit **`cc52f89de6333a1d94e2dfe45d47d1317369fac0`**, parent **`d3c577fbf78974dc0a20660d46748a83758fd51f`**, on `codex/diagonal-walls` in [Syntaxswine/nautilus-engine](https://github.com/Syntaxswine/nautilus-engine/commit/cc52f89de6333a1d94e2dfe45d47d1317369fac0). The coder fetched that exact Git object from the architect's read-only source repository and fast-forwarded the clean `codex/engine-coder` branch to it. No donor or worker worktree was modified. The scout context is commit `38f63ca4ae70846e2e75177895d4d8bea0f22303`, candidate `NE-cc52f89-wall-runs`.

SHA-256 values below were computed from the source commit's Git blobs, before these repairs. They agree with the scout evidence for the corresponding files.

| Source path | SHA-256 at cc52f89 |
| --- | --- |
| `packages/map-core/wall-runs.js` | `fc148cf133b790afe9d53deb9f4eb915d2dc5e509f46e3a74706f3eb3fe1b186` |
| `packages/map-core/maps.js` | `152ab5b8850df86c97852af44c6d9fae0ad13c3f90ddeadf79ce1bd7db36dd63` |
| `packages/map-core/blocks.js` | `5cf2a331dbe69682d539532a01e3edfde26b50a0648bb88b6ac544445da29630` |
| `packages/map-core/document.js` | `2838ac80b70aa3ea1284116b3942a8a662529f3e9c8d4ddc2b4f1c90b55c302e` |
| `packages/map-core/generator.js` | `09a5c499c537f102eb93bc3fabff3aa4180f77cb0d362a787e47387902879b48` |
| `tests/wall-runs.test.mjs` | `088b41bbb3d7ea138736bbae2229858b593cbdb6e1f70be9f09fde376b39effe` |

All original AFT/Farmyard snapshot bytes, notices and `upstream.json` pins remain unchanged. No WIP house catalogue, skin or other new art was imported. The additional tower-entry and placeholder helpers are already inside the pinned AFT dependency closure.

## Findings and repairs

The original 11 wall tests passed. Ten newly added regression cases failed against the contribution before repairs; further focused cases cover the additional acceptance boundaries below.

| Finding | Result after repair |
| --- | --- |
| Capability checks could accept unknown extension versions, including an empty future version. Direct geometry queries could silently interpret a missing segments array as no walls. | Extension shape/version checks reject explicitly. Capability checks validate wall data before negotiating support. Sparse endpoint arrays and invalid declared layers also fail validation. |
| Endpoint snapping returned early before checking invalid snap settings, start coordinates, anchors or radius. | All settings are checked before endpoint priority is applied. Valid endpoint, grid, free and angle behavior remains covered. |
| Block opening, capture, rotation and placement shared nested extension metadata with their source. | Returned runs and extension metadata are copied. Mutating a returned block/map cannot mutate its source. |
| Placing a block with conflicting document-level extension metadata discarded one value. Deleting the final run discarded its metadata. | Compatible/nonconflicting fields are preserved; conflicting fields reject with a metadata error before mutation. Empty extensions retain their metadata through erase/save/reload/rotation. This is an explicit rejection policy until a richer metadata merge contract is defined. |
| Four quarter turns could introduce floating-point residue into authored free-angle endpoints. | Rotated complements use the existing six-decimal authoring precision. Four turns restore tested six-decimal coordinates and preserve all run metadata. |
| Adding a sector prefix or a collision suffix could exceed the 96-character ID limit. | Remapping bounds the complete ID, including collision suffixes, and deterministically resolves collisions. Per-run metadata is preserved. |
| The direct placement API could return walls intersecting squad starts. Upper stair landings, roof-climb landings and patrol waypoints were absent from wall occupancy checks. | Block validation/placement validate the wall-aware candidate. Both traversal landings and authored patrol points participate in validation. Failed edits/imports/replacements/boundary placements preserve the blueprint, undo, redo, revision and changed flag. |
| In-place block assembly could mutate terrain/resources before discovering wall overflow or invalid translations. | Wall-bearing assembly stages a candidate and checks offsets, combined segment/panel limits and metadata before committing. The no-extension assembly path remains inherited. The assembly primitive expects a validated block catalog and final map validation after setting the spawn; it does not validate temporary squad positions during generation. |
| Wall-aware reachability treated locked doors differently from inherited authoring validation and omitted tower lookouts. | Authoring traversal clears locks only on its validation view, matching the inherited policy. Public runtime neighbors still respect actual locks. Tower targets use the inherited tower entry. |
| The wrapper rejected supported legacy sector-placeholder recipes before the inherited expansion could run. | The same pinned expansion runs before wall-aware validation. Recipes with wall data reject rather than dropping it during expansion. Generated character UUIDs remain governed by the inherited identity policy. |
| Generator refusal checked only endpoints. An inset centerline could still put the wall's thickness across a seam. | The full oriented rectangular wall footprint must remain strictly inside each generated block. Endpoint and body seam cases reject explicitly; catalog inputs remain unchanged. |

The seeded solver and random draw order remain inherited. Byte-equivalent no-run generation was checked against the pinned original using an unpopulated two-block library at seeds `0`, `7`, `54` and `4294967295`, in addition to the existing no-feature/generation regressions. Wall-bearing generation remains repeatable, retains translated metadata and unique IDs, and validates its assembled output.

## Accuracy, efficiency and narrative

**Accuracy.** Favor measured oriented runs over stair-step walls for Tinderbox's angled authoring. Their local-frame slab geometry describes the straight boundary, native thickness, height and floor gaps more faithfully than a world-axis box. Retain the grid-edge model for square tactical maps. The inherited 1 m panels, 2 m height, 0.16 m thickness and 2.12 m floor spacing are compatibility dimensions, not evidence of historical-building accuracy.

Ray tests and actor movement are separate contracts. A regression demonstrates a point outside the rounded corner of a radius-expanded wall that still hits the conservatively padded local box. Nonzero `radius` pads rectangular slabs, including height; it is not an exact swept-disc or sliding solver. Prefer an oriented adapter preserving Tinderbox's rounded actor-clearance behavior before consumer adoption. `wallRunsBlockStep` uses a representative point ray 0.8 m above each layer; it does not establish full-body clearance. Floors, roofs, windows, doors, fire material physics and full building reconstruction remain separate work.

**Efficiency.** Code-based assessment, not a CPU/GPU benchmark: arbitrary-run queries scan runs, and wall-aware reachability multiplies that work by visited cells/links. Wall-bearing assembly now copies candidate map state for atomicity; generation validates the catalog once rather than running a complete map validation on every copied block. The legacy no-feature assembly path is retained. The 4,096-run and 50,000-panel limits are bounds, not a frame-time guarantee. Prefer cheap grid queries for square tactical layouts and optional runs where angled architecture matters. Measure dense representative maps before deciding on spatial indexing or tighter budgets. Test durations are not a performance comparison.

**Narrative.** Subjective preference: measured bays and angled rooms better serve Tinderbox's traced plans and building-focused experience; the existing square tool remains convenient for tactical authoring. Preserving metadata and refusing unsupported seams keeps the author's intent visible. The coder browser smoke confirms basic authoring and recovery, not architectural authenticity, texture/art acceptance or a combined halo aesthetic. Artist/UI review and the architect's combined fixture own those visual decisions.

**Recommendation and adoption status.** Accept the repaired contribution as the optional shared authoring foundation, subject to the architect's combined integration acceptance. Retain legacy square maps and explicit capability negotiation. Keep generated angled seams unsupported. This audit does not integrate Tinderbox movement, LOS, projectile collision or fire, change a consumer pin, publish a Site, or import the uncommitted housing catalogue.

## Validation and integration handoff

Windows, Node `v24.15.0`, npm `11.12.1`:

- `npm run check`: passed; 534 pinned files, source integrity, dependency closure and headless map/rules imports.
- `npm test`: **52 passed**, including **29 wall tests** (the original 11 plus 18 added regression/acceptance cases).
- `npm run test:upstream`: **32 passed**.
- `npm run build`: passed, with the source contribution's nine recorded deployment patches.
- `git diff --check`: passed.

Focused browser smoke on the locally built editor: placed a 4.24 m / 45-degree / two-story brick run; undo removed it and redo restored it; an out-of-bounds exact update rejected without removing the run. Browser save, page reload, explicit saved-design recovery, JSON export and JSON import retained feature version 1, one run, endpoints `[7.5,7.5]`/`[10.5,10.5]`, two stories and brick material. The imported run was confirmed in the actual wall list. No warning/error console entries were recorded. This is not the UI helper's complete pointer/mobile/asynchronous host suite. The legacy-placeholder smoke is the headless open/export comparison against the pinned controller, with newly generated character IDs normalized for comparison.

The disposable preview had PID/creation-time ownership recorded, a private stop marker and an actual 30-minute expiry. It exited through the stop marker; port 4527 was verified released, and the temporary browser tab was closed. No helper was retained.

Owned repair paths are the five assigned map-core modules, `tests/wall-runs.test.mjs` and this review. No public-index, package, build or editor file was edited by the audit. Integrate this repair commit **after cc52f89**; preserve the contribution's public exports and guarded build imports when reconciling halo changes.

Architect/UI follow-up: on initial open/reload/import, the count header omits the wall-run count even though the wall list and portable export retain the geometry. The source build adapter updates the refresh expression using `documentModel.map`; the initial open expression uses `next.map`. This is a display-only integration finding in `tools/editor-wall-adapter.mjs`/editor delivery, outside the coder's owned paths. The UI helper owns full async host/capability, pointer, mobile and save-flow acceptance. Public documentation should also state conservative radius padding, six-decimal transform precision, metadata-conflict rejection and full-thickness seam refusal.
