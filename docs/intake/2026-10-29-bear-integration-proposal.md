# Bear import and character wiring proposal

Commissioned 29 October 2026. Import the existing AFT bear into Nautilus alongside the other animals: searchable discovery, both outfits, equipment, shared presentation, supported editor placement and preserved saves. Workers prepare committed candidates; the architect owns review and integration. This brief does not mark the bear as released.

## Fixed sources

- Engine baseline: released `v0.8.0`, main `8c4670450cb2b38c1e1abd811d633c22de9e2b7c`.
- Bear source: AFT [`4f5f53917990ec03b2f14c65f067e4b99ec8fcaa`](https://github.com/Syntaxswine/animal-factory-tactics-3d/commit/4f5f53917990ec03b2f14c65f067e4b99ec8fcaa), **Wire bear outfits, weapons, and shared animations**. This snapshot includes the earlier model, paintings and accepted tail adjustment.
- Existing Nautilus AFT pin: `781246a668c723d5a4c5463e70534cc04b6a5641`. Preserve its bytes and the current twelve visual rigs.
- Read-only donor repository: `C:/Users/baals/Local Storage/AI/GTP/AnimalFactory3D/game`. Read the full source commit through Git objects; its working branch is not an import source.

Start new worker branches from the engine baseline and preserve existing branches and uncommitted work. Keep the donor and other workers' checkouts read-only. Do not update a game's engine pin or publish a Site as part of this assignment.

## Ownership and sequence

| Owner | Deliverable |
| --- | --- |
| Coder, Nautilus Engine | First record the minimal source/resource closure, notices, public provider contract and appearance compatibility decision. Then prepare the immutable snapshot, optional presentation provider, resource resolver, Three bridge, validation/capability wiring and meaningful lifecycle/package tests. Own source importing and shared APIs; no editor UI implementation. |
| Editor, Nautilus Engine | Consume a fixed reviewed Coder checkpoint. Add bear discovery, outfit/equipment preview, Guard/NPC placement, selection/facing, history and save/import/export workflows. Keep editor changes separate from the importer and shared provider. Fixtures and UI preparation can begin before the provider arrives. |
| Artist, Nautilus Engine | Finish the active Coldwell map handoff first, then review the existing bear model, paintings, cap, equipment contacts and motion at native scale. Provide measured findings and comparable captures; redesign only where an actual defect needs correction. |
| UI, Nautilus Engine | Review the Editor candidate for accessible labels, controls, desktop/phone layout, loading/retry feedback and unsupported-feature explanations. This is a review assignment; Editor retains implementation ownership. |
| Architect, Nautilus Engine | Coordinate fixed checkpoints, review source/compatibility and visual evidence, combine accepted commits, select release metadata and promote the passing result through main. |

Return full commit hashes and reports in each worker's own chat. The architect collects and distributes checkpoints; workers should not depend on a moving branch or another worker's uncommitted files. Queue dependent reviews behind the relevant candidate rather than interrupting current work.

## Builder handoff

Follow the [component handoff standard](../component-handoffs.md) and [guide template](../templates/component-handoff.md). Coder owns the bear provider card and public connection example; Editor adds the concrete authoring checklist; Artist supplies native bounds/socket/motion evidence; UI reviews discovery and instructions. Link the guide from bear discovery metadata and ship it with the relevant package. Explain renderer/resource/clock bindings, appearance capabilities, supported equipment/motions, ownership, saves, failure handling and remaining game policies. Reuse standard semantic bindings rather than requiring every game to copy AFT wiring. The separate UI title/interaction candidate follows the same standard and is not a bear dependency.

## Content and presentation contract

Keep the model identity `bear`, shared discovery identity `people:bear`, and existing outfit values `normal` and `red-hats`. Preserve the existing thirteen equipment choices: hands, knife, pistol, rifle, assault, SMG, HMG, shotgun, sniper, grenade, launcher, RPG and flamethrower. Reuse the source identities instead of adding a new species or weapon naming scheme.

The source entry points include `dist/tactics/bear-worker.js`, `bear-10k-data.json`, `bear-paint.js`, `animal-motion-catalog.js` and the bear paintings under `dist/assets/characters/lowpoly-proof/`. Review the required portions of `horse-light-model.js`, `horse-model-paint.js`, `animal-motion-paint.js`, `red-hat-model.js`, `weapon-models.js`, `armed-idle-motion.js`, `equipment-stow.js` and `idle-fits.js`. These are review roots, not a complete dependency manifest. Include dynamically addressed JSON, cap data, paint and optional portrait resources explicitly.

Archive original bytes and source hashes in a separate immutable bear snapshot with notices. Keep adapted execution modules outside `vendor/`. Use one live host Three namespace and the engine's established resource conventions; another Three runtime or a wholesale AFT editor upgrade is not needed to add this animal. Headless discovery and map/rules imports must not start rendering or asset loads. Keep author meshes, review boards, source tools and fixtures outside runtime packages unless explicitly required.

Preserve the bear's native body, tail, cuffs, eye/sight and hand anchors. Red Hat uses the native outfit painting and `BEAR_PROFILE.redHatFit`; generic uniform repainting must not overwrite it. Measure body, visual and equipped bounds separately. Keep metre scale, foot origin and the native 2.12 m kit interval; fit preview cameras without resizing the model. Test door, ceiling, floor and prone clearance rather than assuming a one-tile reservation proves physical clearance.

Match the presentation coverage already available to other Nautilus animals. Declare coverage for basic poses/movement, aim/fire, crawl, grenade/throw, traversal, casualties/fire, chair and speaking through explicit optional capabilities. Animation playback does not provide world movement, climbing, combat or fire execution. Preserve equipment-specific restrictions, including unarmed chair motion. If a donor family has no Nautilus host surface yet, report that boundary explicitly; unsupported combinations must not fall back to another animal or an unrelated prop.

Replace donor document-relative resource fetch assumptions in the Nautilus adapter with manifest/module-based URLs that work in an installed package. Define exactly-once ownership: library resources, per-instance geometry/material/rig data and borrowed host renderer/textures must have separate lifetimes. Review the donor idle/bear paths that both dispose the skeleton. Stop motion before actor disposal, handle partial and late loads, and restore borrowed weapon carry settings. Concurrent bears with different equipment must not mutate each other or existing animals. The host supplies playback time; asset loading must not take over the game clock.

## Compatibility before placement

The current engine has twelve visual rigs but its pinned portable map validator accepts nine species; bull, rabbit and dog are already preview-only. Adding the bear to a visual catalogue alone cannot make it placeable.

Coder must define a narrow engine-owned appearance/profile extension and machine-readable capability before Editor enables bear placement. Preserve existing `aft-map-v2`, `aft-block-v1` and character-v1 behavior and saved identities. Any additional envelope or schema needs a stable identity, version, validation and golden fixtures. Keep bear species, outfit, weapon, heading, role and authored character data intact through the supported map/block and editor operations. Do not weaken the original validator, substitute another species during export or drop unsupported appearance fields.

Old maps must continue to load without a bear capability. Consumers lacking bear support must receive an actionable compatibility error before accepting a bear document. Verify explicit rejection in the bounded Tinderbox adapter and other relevant unsupported paths. The portable statistics sheet remains species-neutral: no new stats, perks, faction policy, recruitment rules or automatic resource normalization. Existing games retain their production pins until their own adoption review.

A preview-only checkpoint can help review, but it is not completion of this assignment. If a compatibility issue blocks preserved placement, return the concrete proposed representation and failing fixture for architect resolution; do not silently reduce the requested outcome to preview-only.

## Acceptance

1. Verify every imported blob, full source pin, resource dependency and notice. Record imported and packaged bytes; check dynamic resources as well as JavaScript imports. Preserve the older snapshot and existing twelve-rig outputs, including their current placement restrictions.
2. Exercise both outfits across all thirteen declared equipment choices. Inspect cap/eye/cuff/tail paint, hand contacts, HMG/RPG carries, stance changes, floor support and representative motion phases. Record each supported/unsupported family. Seek/replay must restore the same pose without duplicate gameplay events or effects.
3. Test two concurrent bears, equipment changes, partial/failing/cancelled loads, late completion, disposal and reopen. Borrowed textures/renderer survive; owned skeletons/materials/textures release once. Compare source and packaged visual output.
4. Run a deterministic authoring workflow: discover bear, choose outfit/weapon, place and rotate Guard/NPC instances, select/edit, undo/redo, save/reload and export/import. Preserve exact appearance and authored state. Cover supported block capture/placement and reject unsupported documents atomically without damaging the open map or history.
5. Cover desktop and narrow phone controls, rapid preview changes, failed-load retry, close/reopen and metadata when WebGL is unavailable. Preview selection must not edit the map. Include an existing-animal comparison and an unsupported-consumer fixture.
6. Run `npm run check`, `npm test`, `npm run test:upstream` and `npm run build`, plus headless closure, installed-package/resource proof and the affected real-browser checks. Record exact source commits, hashes, runtime/browser, results and temporary-helper cleanup. Follow the helper lifecycle policy; retain no disposable preview after review.

## Design choice

**Accuracy:** prefer the source bear's fitted body, native paintings and weapon anchors over stretching another animal. Accept fixes from measured geometry/contact evidence; biological realism and gameplay collision remain separate questions.

**Efficiency:** prefer a separately pinned, lazy bear provider over replacing the full AFT snapshot or loading every donor study. Measure bytes, draw calls and representative CPU/GPU costs before making performance claims. Skeleton reuse is useful only with correct per-instance ownership and preserved native fits.

**Narrative:** preserve the regular worker and Red Hat appearances for AFT/Farmyard-style scenes. Tinderbox can borrow the visual asset through its own bindings without acquiring AFT's factions, statistics or turn rules. This is the preferred shared-content boundary for all three games.

The donor's existing review is a useful starting point, not Nautilus acceptance. Follow [design evaluation](../design-evaluation.md), [upstream intake](../upstream-updates.md), [editor asset integration](../editor-assets.md) and [release promotion](../releasing.md). Only the architect's passing combined candidate becomes an engine release.
