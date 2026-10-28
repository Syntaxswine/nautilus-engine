# Editor asset integration — 28 October 2026

## Scope and provenance

An isolated `codex/editor-assets` worktree integrates the current asset inventory. The baseline is Nautilus `d3c577fbf78974dc0a20660d46748a83758fd51f`, AFT `781246a668c723d5a4c5463e70534cc04b6a5641` and Farmyard `b2f2b6bd033cc3dbc8b572caa251244d283829c8`. All 534 original upstream files retain their recorded bytes. A supplemental `vendor/aft-assets/` snapshot adds the three factory-machine paint atlases required by that same reviewed AFT commit (lathe v1, mill v1, press v2; 5,042,285 bytes). The importer read Git objects, not working files. No worker content, moving pin or consumer update is included.

The editor now has a derived asset catalog, searchable library, shared-scene previews and placement bindings. The catalog has 344 entries; 341 can select an existing placement tool. Bull, rabbit and dog remain preview-only because the pinned portable schema rejects those species. Equipment and outfit previews use existing renderer bindings. The five biome swatches now crop the actual ground atlas. The already-supported open-bog preset is exposed, and wetland/bog selection survives the inherited movement control's generic-preset handler. A recorded build adapter routes machine paint to the supplemental snapshot, closing a dependency gap caused by concatenated filenames in the original import.

## Design assessment

**Alternatives and context:** Retain text-only selectors and the donor's schematic terrain swatches, or add catalog-derived previews using the inherited AFT inspection renderer within Farmyard-inspired Nautilus chrome. Retain the same renderer/model scale and portable-format restrictions in either case.

**Accuracy:** The implemented previews show the actual mesh, paint and authored dimensions, making them preferable for checking asset identity, orientation and relative proportions. Atlas-backed biome swatches match the same source panels as the terrain renderer. Camera framing changes for visibility; it does not rescale assets. Neither previews nor footprint labels establish real-world physical calibration, and reserved footprints remain distinct from collision clearance.

**Efficiency:** Code inspection shows one additional inspection scene while the library is open, one selected asset/sample at a time, and scene disposal on close. Asset changes reuse that preview scene; source modules use the existing Three.js instance. CSS crops the shared atlas without per-swatch canvas copies or new image exports. This costs more while open than text-only selectors; CPU, GPU and memory improvements are not claimed or benchmarked.

**Narrative:** Subjectively, using the same painted materials, lighting and proportions as the map makes the workshop more coherent and helps an author judge whether an incoming asset belongs in a scene. The existing green, paper and brass palette carries through the library. Equipment/outfit controls let authors review character appearance without mixing it with combat statistics.

**Recommendation and adoption:** Implemented: prefer shared-renderer previews and registry-derived bindings for map authoring. Keep the original controls as the detailed placement interface. Prefer explicit preview-only status for models outside the portable schema; a new model's presence does not establish consumer integration. Continue to require comparable visual review for future donor assets.

## Verification

- Source integrity and dependency checks: 537 pinned files; direct editor imports and runtime character/machine mesh/paint/atlas dependencies agree with the reviewed manifests.
- Nautilus tests: 28 passed, including all 344 preview geometries, catalog coverage/search, placement identity, orientation, undo/redo, wetland/bog identity and portable round trips.
- Original AFT regressions: 32 passed, including block generation and document behavior.
- Static build: passed; inventory and deployment adaptation hashes emitted.
- Browser review: narrow and 1280 × 900 desktop layouts, search, modeled previews, preview-only character restriction, outfit/weapon controls, live character placement, undo/redo, save, JSON export/reimport, biome swatch crop, cardinal ramp controls and wetland/bog bindings inspected. The exported map retained the donkey's RPG and Hawaiian shirt. All three supplemented machines rendered with their original paint; browser warnings/errors were empty. Generation and block round trips passed the required headless suites.
