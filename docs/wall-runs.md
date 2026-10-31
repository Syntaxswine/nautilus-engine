# Angled walls in the shared workshop

In **Walls → Angled wall run**, drag between corners and release to place. The preview reports the true length, bearing and number of stories. Choose 45° for bay windows, 15° for finer angles, 90° for square rooms, or Free angle. Grid increments range from 0.1 to 1 metre, with Off available. Nearby endpoint snapping takes priority over the angle/grid setting so a traced outline can close exactly. Green rings mark endpoints on the editing layer. **Trace in plan view** changes the existing camera without replacing the map.

**Exact endpoints · metres** accepts start/end coordinates without snapping. Select an existing run from its list to edit it; **Start next run here** copies its end into the next start. Select a wall in the scene to inspect it. Copy selected settings loads its coordinates, Rotate turns it 45° about its midpoint, and Delete removes the whole run. Each completed placement, update, rotation or deletion is one inherited undo step. Escape cancels a drag. Browser saves and JSON exports retain the same geometry.

The **Bay-window practice block** is a generic two-story tracing example, not a reconstruction of a Gross catalogue plan. It can be edited, saved, rotated, placed or used in a connected library after assigning its four connections.

## Native dimensions and geometry

The existing kit remains authoritative: one metre panels, two metre wall height, 0.16 metre thickness and 2.12 metre floor spacing, from AFT's pinned `hybrid-world.js`. Runs compose **one to five stories** without changing those dimensions. The starting layer plus story count must fit within the six supported layers. Floors, roofs, windows and doors remain separate authoring operations; selecting five stories does not generate complete buildings or automatically add floors.

A diagonal across a one metre grid square is √2 metres long. Stretching a one metre mesh to cover it would change the scale. Nautilus instead rotates native panels along the run and cuts the final panel to its remaining physical length. The renderer keeps one texture repeat per metre on all faces. Every panel of one material and layer visibility is one instance of a unit-width box, and the vertex shader (and the matching shadow-depth material) scales x and the long faces' u by that panel's width. Halving and multiplying by {0, 1} are exact in float32, so each panel's positions and UVs are bit-identical to a box built at its cut length (`tests/editor-wall-scene.test.mjs` checks this against `BoxGeometry` for every vertex). A wall structure therefore costs one draw per material, however many distinct cut lengths it has: round 1 of the 0.8 review measured 2,400 free-angle runs at 5,916 calls per frame when panels were instanced by length. Panels of different lengths now share one draw. Where two panels overlap at an angled join, the depth tie between them can resolve differently from the old per-length order; the [asset-rendering benchmark](asset-rendering-benchmark.md) shows those pixels are ties. Panels rebuild when the blueprint or view options change. Existing artist skins can follow this metre-based surface convention.

## Portable extension

The parent formats stay `aft-map-v2` and `aft-block-v1`. Only designs containing runs add this optional field:

```json
{
  "wallRuns": {
    "version": 1,
    "segments": [
      {"id":"wall-1", "a":[7.5,7.5], "b":[10.5,10.5], "z":0, "stories":2, "material":"wood"}
    ]
  }
}
```

`a`/`b` are ground coordinates in metres, not tile indices; `z` is the integer starting layer. Supported materials are wood, brick and concrete. Endpoints fit the inherited footprint boundaries, −0.5 through width−0.5. Runs are 0.1–64 metres long; a document allows at most 4,096 runs and 50,000 native panels. IDs are unique. Extension and per-run metadata survive normal editing and round trips, including an empty extension left after deleting the final run. Returned blocks/maps own copied metadata. Placement and generation preserve compatible document-level metadata and reject conflicting values before mutation; the format does not invent a merge rule. Remapped IDs remain within the 96-character budget. Invalid versions, nonfinite coordinates, duplicate IDs, unsupported materials and out-of-bounds stories are rejected before import or mutation. Drawing an overlapping collinear run is rejected; shared endpoints and crossing partitions are allowed.

Map/block capture and placement translate both endpoints. Placement assigns IDs scoped to the destination sector, replaces previous runs within it and preserves runs outside it. Capture/replacement refuses a run crossing a sector boundary, including a run whose two ends are both outside that sector. Split such a run into separate runs at the boundary first. Scenery-block rotation rotates the endpoints along with inherited geometry. Four quarter turns restore authored coordinates at the six-decimal precision of the wall tools, along with per-run and extension metadata.

Connected generation preserves each chosen block's runs, remaps IDs and validates wall-aware spawn/reachability. The existing seeded search order and connection algorithm are retained. **Angled connections across generated block seams are not represented by the inherited connection profiles yet.** Generation explicitly refuses any part of the full wall thickness touching or crossing a block boundary, even when the centerline endpoints are inset; use inset runs in generated libraries, or place those blocks manually. It never silently removes the geometry to make generation succeed.

## Consumer boundary

```js
window.nautilus.connectGame({
  features: ['nautilus-wall-runs-v1'],
  openMap({json, contract}) { /* translate oriented geometry and collision */ }
});
```

`sendToGame()` checks that capability before calling the adapter. Maps without runs need no additional capability. Export remains available for every valid blueprint, including consumers that have not adopted the extension. These changes update the shared workshop; no AFT, Farmyard or Tinderbox consumer pin is changed automatically.

Headless exports include `wallPanels(run)` (oriented physical geometry for rendering/collision/fire adapters), `measureWallRun`, `snapWallPoint`, `wallRunsIntersect`, `wallRunsBlockStep`, wall-aware `neighbors`/`blockedEdge`, and `assertMapCapabilities`. Ray endpoints for `wallRunsIntersect` use `{x,y,h}` with height `h` in **metres**, explicitly distinct from tactical layer `z`. Its local-frame slab test respects thickness, actual story heights and the inherited 0.12 metre floor intervals; it is not a world-axis bounding-box approximation. Consumers must incorporate these shapes into movement, sight, projectiles and fire as appropriate before advertising the capability. With `radius > 0`, the helper conservatively pads rectangular slabs, including corners and height. It is not an exact rounded swept-disc or sliding actor solver. `wallRunsBlockStep` uses a representative point 0.8 m above a layer and does not establish full-body clearance. A consumer adapter must preserve its own actor-clearance behavior. The helper does not itself integrate those game systems.

Headless validation adds a wall-aware reachability pass for ordinary starts, guards, travel markers and patrol waypoints. Tower lookouts use their inherited entry for authoring reachability, and authoring validation ignores game-owned locks without changing public runtime neighbors. Upper stair/roof-climb landings and patrol waypoints participate in wall occupancy checks. Walls placed through these access points, an existing character or a travel marker are rejected. Validate a completed design before handing it to a game; authoring can temporarily disconnect areas.

## Material and facade limits

The [art audit](reviews/2026-10-28-wall-runs-art-audit.md) approves native dimensions, cut widths, one-repeat-per-metre UV density and outward winding. The initial brick lookup selected neutral fallback pixels; the reviewed UI repair maps the validated material kind to its existing native surface. No new skin or house catalogue is imported.

Panels have square ends. Centerline joins overlap internally and leave a small outer notch at angled corners; this is not an open through-wall crack. The authoring foundation accepts this bounded butt-joint convention. A finished continuous facade needs a deliberate miter or junction treatment that preserves physical dimensions/collision. Each separate run restarts its UV phase, so arbitrary fractional splits do not promise continuous masonry. Floors, fascia and opening anchors remain separate authoring work.

## Source and validation

Original pinned vendor files remain byte-for-byte intact. `tools/editor-wall-adapter.mjs` records guarded import/control changes in the built editor. `packages/map-core/document.js`, `maps.js` and `blocks.js` wrap the pinned implementation. `generator.js` retains AFT's seeded solver and adds wall-aware catalog/seam validation, atomic assembly and spawn selection. The built provenance manifest hashes every changed vendor output.

The [code audit](reviews/2026-10-28-wall-runs-code-audit.md) records version/capability, metadata, transaction, traversal and seam repairs, including byte-equivalent no-feature generation at multiple seeds.

Automated coverage checks native dimensions and cuts, five stories, snapping, transactional history, rejected imports/edits, selection/rotation/deletion, block transformations, crossing-boundary rejection, collision/height gaps, reachability, adapter capability rejection, deterministic generation and equivalence with legacy generation when no runs are present. Run all four checks required by `AGENTS.md`, then review pointer drawing, exact editing, undo/redo, browser save/load, import/export, block rotation and generation in the workshop.
