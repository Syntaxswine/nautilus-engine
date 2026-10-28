# Editor asset integration

The editor owns asset discovery, visual consistency, preview and placement bindings. Use the existing pinned assets as the baseline; future asset work enters through reviewed commits and the intake process in [upstream-updates.md](upstream-updates.md).

## Current library

The Asset library button opens a searchable catalog derived from the same terrain, prop, edge, character-model and foliage registries used by the editor. It currently contains 346 entries: 341 placeable assets, three character models available for preview only, and two [window sculptures](window-sculptures.md). Categories cover terrain, objects, roofs, boundaries, windows, people, foliage, cliffs and ramps. Character previews also expose the current weapon and outfit choices, including the donkey's Hawaiian shirt.

Bull, rabbit and dog models are already present in the reviewed renderer snapshot, but its portable map schema rejects those species. They are labeled **Preview only**, and placement stays disabled. Supporting them in saved maps needs a separate format/consumer compatibility decision. Existing map/block formats and consumer capabilities have not been expanded by the library.

Existing map assets use `InspectionScene`. Window sculptures use a small dedicated scene with the same vendored Three.js, workshop daylight and wall paint. Their controls show wood, brick or concrete, a clay view, and the aperture with sashes removed. Sculpture JSON can be downloaded without adding an unsupported map prop. Framing fits the rendered bounds by moving the camera; models retain their authored scale. Footprints describe reserved placement tiles, including overhang reservations, rather than promising that every reserved tile blocks walking. The preview is disposable presentation data and never enters the user's document, undo stack, saves or export. Closing the library disposes its scene and cancels its animation frame.

Use this asset selects the existing editor tool and its controls. The normal canvas preview, validation, placement transaction and undo history perform the edit. Ramps use surface/direction/placement controls; banks use surface/direction/side/step; cliffs use the cliff tool; roof variants use the roof tool. The library preserves foliage preset identity after the inherited movement handler runs, and exposes the already-supported open-bog preset omitted from the donor's select list.

Biome terrain swatches crop `ground-atlas-v1.png` with `BIOME_GROUNDS` metadata, replacing links to five absent per-biome PNG exports. Original vendor bytes remain untouched. Three machine paint atlases omitted by the original dependency closure are preserved in a supplemental snapshot at the same reviewed AFT commit. The build records both the workbench and machine-paint adaptations and emits `editor-assets.json` with source pins, catalog entries and bindings; `build-provenance.json` links that inventory.

## Adding reviewed assets

Incoming character work reported by the user on 28 October 2026: a bear is being wired upstream. It is absent from Nautilus's current pinned snapshot and is not included in the library counts above. Intake needs a full reviewed commit containing its model, paint, animation/equipment bindings and dependencies, followed by visual and map-format/consumer compatibility checks. Do not import unfinished worker files or assume that renderer support makes the species placeable.

1. Review a full donor commit and its asset dependencies, source hashes, notices, dimensions, anchors, rotation and collision behavior. Keep donor worktrees read-only and preserve original bytes in a new immutable snapshot.
2. Update the deliberate source pin and rendering/placement registries together. Preserve one tile per metre and the inherited distinction between renderer floor spacing and tactical floor heights. Do not resize a model merely to match its footprint.
3. Existing registry families appear in the library automatically. A new asset family needs a deliberate category, preview staging and tool binding in `apps/editor/asset-catalog.js` and `asset-preview.js`. Unsupported content must have an explicit placement restriction; do not route it to an approximate prop or silently discard it on export.
4. Run the required checks and review comparable previews and in-map placements. Inspect rotation, selection, undo/redo, save and import/export. Review generation when affected. Record accuracy, efficiency and narrative tradeoffs under [design-evaluation.md](design-evaluation.md), including the preferred option for the named use case.

`npm run check` verifies editor dependencies against both the reviewed pin and its manifest, including character and machine meshes/paint and the biome atlas. Asset tests cover registry coverage, search, independent preview geometry and edit/undo/round-trip behavior. These checks provide a baseline for future intake; they do not replace browser review of new visual content.
