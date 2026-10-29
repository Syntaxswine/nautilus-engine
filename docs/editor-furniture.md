# Library furniture inspection

Open **Asset library → Furniture**. The collection has eight forms, six finishes and two contents states: **96 variants of eight forms**. Form, finish and contents filters combine with text search. Empty results clear the previous selection. Furniture discovery and metadata remain available if the workshop renderer cannot start.

The compact controls expose the model's orientation, painted or clay appearance, and a low camera angle for inspecting table gaps. **Turn view** moves the camera around the same model. **Orientation** applies an actual 0°, 90°, 180° or 270° model turn, including the source's dimension, tile and placement-offset changes.

## Dimensions and source

Overall size is measured from the rendered geometry, including trim, in width × height × depth order. Body footprint is the source's declared physical body in the ground plane. Source tile reservation is the separate rectangular reservation; it does not describe a solid blocker. The camera fits the real model without rescaling it. For example, a full-tile cabinet's trim can extend beyond its declared body while remaining inside its reserved lot. Stocked table geometry can be shorter than its conservative source height.

The collection preserves Farmyard `fb6e20aa6e7d0cfe8793b4b7f693552d69a3a18b`. Its engine IDs start with `furniture:library.`. The shared catalogue is generated from the same records as editor discovery, retaining this source pin rather than assigning the older AFT source to the new furniture. The headless [furniture contract](furniture.md) describes borrowing the visual assets in a game.

## Accuracy, efficiency and narrative

**Accuracy:** Prefer the authored geometry, current rendered bounds and separate body/reservation contracts over an approximate generic map prop. Open space below an empty table remains visible geometry. Stocked shelves use painted solid rows; gaps in their painted book spines are not physical holes. These art measurements do not establish authoritative collision, inventory or fire properties.

**Efficiency:** A successfully loaded preview scene reuses one library across furniture selections. Only the current instance remains attached. Factory code and furniture textures load on the first furniture selection; ordinary workshop startup and headless discovery do not load them. The preview draws on changes and resize rather than maintaining an animation loop. These are code-based workload observations, not GPU or city-scale benchmarks. The source's economical painted shelf rows are appropriate at normal tactical camera distances; detailed individual books would require a separate close-interaction profile.

**Narrative:** The source's finishes and plain/frieze variants offer a consistent period-room vocabulary (subjective preference). Preserve these forms and the empty/stocked distinction for room authoring while keeping actual searched inventory and burning fuel under each game's control. Clay and low-angle inspection help reviewers see the structure without changing its material identity.

## Availability and lifetime

Furniture is **preview only and unavailable for map placement** in this intake. Inspection cannot select an approximate legacy tool or change a map, revision, undo history, saved design or portable export. Collision, navigation, fire, inventory, saves and halo highlighting need deliberate consumer support. The existing halo path does not support these instanced roots.

Each furniture scene owns its library and current instance. Closing, hiding or replacing the preview retires them. A library that finishes after its scene closes is disposed without creating an instance. Failed loads can retry through **Retry preview**; search, filters, source and body/reservation metadata survive renderer failure. The controller ignores obsolete resolve/reject callbacks. Painted materials are restored before a clay-view instance is released, preserving the factory's ownership contract.

The reproducible visual acceptance entry is `node tools/review-editor-furniture.mjs` after building the editor. It uses the isolated, bounded browser harness and writes captures, model poses, source hashes and cleanup receipts under `artifacts/editor-furniture`.
