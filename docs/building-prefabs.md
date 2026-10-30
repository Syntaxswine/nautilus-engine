# Prefabricated buildings

The editor's **Building library** contains thirteen Gross catalogue houses from Tinderbox, 48 original architectural designs, and three existing AFT structures (shed, workshop and checkpoint hut). The 61 whole-building entries provide native-model previews, provider-specific floor cutaways, source information, whole-house placement and seeded building lots within full 240 × 240 maps. The three AFT presets remain editable structure stamps.

The Gross houses retain 29 interior levels and 147 labeled spaces in their original plan JSON. These are catalogue-inspired compositions, not measured reconstructions. The artist explicitly interprets snapped dimensions, colours, furnishings, rear elevations and ornament. The preserved source plates make those decisions inspectable.

## Sources and maintenance

The reviewed Tinderbox pin is `6693bfa3fea2edec77649d830de5ac68ba4c1a50`, recorded as `tinderboxPrefabs` in `upstream.json`. Its separate immutable snapshot contains 66 files: the assembly module and dependency closure, six material images, collection and individual plans, optional wall trace fragments, original plates, generation/source records and artist handoff/reviews. No Tinderbox game runtime or second Three.js is loaded. The assembler receives the editor's existing Three.js module.

The three AFT structures use the existing AFT pin and editing command. They stamp ordinary editable map geometry and objects. The Gross houses remain complete assembly references so polygonal plans, facades, roofs, sills, stairs and furnishings survive unchanged; they are not flattened into approximate tile rooms.

The [original provider adapter review](reviews/2026-10-28-original-prefab-adapter.md) records the fixed 48-building source, combined catalogue helpers, renderer ownership and review scope. Original entries are unfurnished, original game-scale interpretations with their own reference links and blueprint JSON. They do not display Gross source plates. The artist's detailed/source gallery is a clearly named optional action within the modal. An editor build lacking the original-building capability permits inspection but rejects original placement/generation until its core integration is present.

For each future collection:

1. Review a full committed source SHA and its handoff, dependencies, source rights/notices, native units and original geometry. Never import live worker files or an uncommitted checkout.
2. Deliberately add a collection importer/registry and source pin. `tools/snapshot-source.mjs --donor tinderbox-prefabs --repo <read-only-checkout> --commit <full-SHA>` inventories the current collection without writing; `--write` creates a new immutable snapshot. Do not overwrite an existing snapshot.
3. Derive conservative placement bounds from all assembled exterior geometry, including overhangs, entrance stairs and porches. `node tools/prefab-catalog.mjs --write` regenerates the current registry; `npm run check` compares it with the original assembly. Review source and renderer changes before changing the registry's fixed module pin.
4. Add a new immutable catalogue identity. Never redirect an existing saved catalogue ID to different geometry. Keep an old catalogue available or implement an explicit reviewed migration; otherwise reject it visibly on load.
5. Define ground support, clearance, orientation, entry and levels. Review all orientations, exterior/interior views, source plates, mixed placements, saves and rejection cases. Evaluate accuracy, efficiency and narrative using `design-evaluation.md`.
6. Run the required project checks and browser review, then commit and push only the intake's files. Consumers adopt a new pin independently.

The current collection-specific adapter is intentionally small. A second architectural style should add a new provider and registry entry, rather than editing Gross source files. Historical source images, authored assemblies and Nautilus placement metadata remain separate responsibilities.

## Map contract

Legacy maps without the optional field behave as before. Gross building maps add:

```json
{
  "buildingPrefabs": {
    "version": 1,
    "catalogue": "tinderbox-gross-housing-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50",
    "instances": [
      {"id":"building-1","asset":"albany-cottage","x":40,"y":40,"turns":0,"clearance":2}
    ]
  }
}
```

`x,y` are the first cells of a conservative integer lot, **not** the original house model's origin. `buildingTransform(instance)` returns the translation and Y rotation for the untouched native assembly. Its complete horizontal bounds fit inside `buildingLot(instance)`. Turns are clockwise quarter turns; mesh scale stays `[1,1,1]`. Source units are metres, with a native 2 m wall and 2.12 m story interval. Each source house retains its own plinth and basement elevations.

The current authoring profile allows 32 whole-building instances per full map, 1–8 m of access clearance and flat ground placement at layer 1. Placement rejects overlapping lots/clearance, water, vegetation, relief, upper geometry, props, walls, canopies, access routes, character starts/patrols and travel markers. Subsequent ordinary edits must also preserve these constraints. Selecting a building allows whole-instance rotation or deletion; the normal undo/redo stack preserves all references.

The `nautilus-building-prefabs-v1` feature is **visual map authoring**, not a gameplay collision or fire compiler. The game handoff calls `assertMapCapabilities(map, adapter.features)` and rejects a consumer that has not explicitly declared this feature. Declaring it is a consumer's promise to preserve the full assembly and implement appropriate collision, navigation, doors, floor/stair traversal and gameplay semantics. Merely displaying a profile in Nautilus does not integrate any game.

The optional source wall trace fragments remain source evidence. They are not inserted as complete maps, and their aperture metadata is not mistaken for solid wall collision. The composed wall and prefab adapters permit distant angled walls in the same map. A conservative oriented-thickness test rejects a wall body or boundary contact intersecting a building lot or its clearance, on every authored layer. This authoring reservation is not an interior collision compiler or support for overpasses through a reserved lot.

The public `@nautilus-engine/map-core/prefabs` placement and generation APIs validate sloped-roof envelopes through the headless roof contract. Separate roofs reserve their complete overhang rectangles against whole-building lots and access clearance on every eaves layer, using the editor's shared boundary tolerance. Direct placement rejects a conflict; seeded generation skips blocked candidates and either finds the full requested count or rejects without changing its input. Maps without roofs retain their existing seeded layouts.

Legacy 24 × 24 blocks cannot represent these references. Block import/generation/rotation reject the field; capture and replacement reject a sector intersecting a building or its clearance. Unaffected sectors remain usable. This prevents silent loss of a house, its floors or its source identity.

## Fixed collections and capabilities

The unchanged Gross catalogue identity remains valid for its original thirteen IDs. The combined identity is `nautilus-gross-original-v1@6693bfa3fea2edec77649d830de5ac68ba4c1a50+ee7c18ecdc2669168247b94a82156634b2c4ffe5`. It supports all 61 fixed assemblies. Original IDs under the old Gross identity reject rather than silently acquiring new meaning. Adding an original through placement/generation deliberately changes only the copied candidate's catalogue identity; existing Gross references and metadata survive. Combined maps do not silently downgrade while their envelope remains present.

Maps containing original geometry additionally require `nautilus-original-buildings-v1`, alongside the base prefab feature and any wall feature. Unknown catalogue/version data reject even with no instances. Nested metadata survives ordinary edits and the last deletion; block-workspace commands and legacy migrations cannot silently discard a prefab envelope.

The library exposes residential, Gross, original-home, full-original and full-combined seed pools. Its default small residential mix fits six lots in the 96 × 96 area. The headless generator's implicit Gross pool remains a compatibility profile; select `DEFAULT_RESIDENTIAL_ASSETS` and an explicit suitable area for a new mixed district. Each provider retains its own source references and furnishings description. Original plans/downloads live in the detailed gallery; a Gross plate is shown only for Gross content.

## Procedural placement

`generateBuildingLayout(map, options)` in `packages/prefab-core` is headless and deterministic. Options include a text seed, count, allowed asset IDs, an integer rectangular area and clearance. It returns a copied candidate map plus instances; it never edits its input or consumes global randomness.

`lot-grid-v1` uses square lots large enough for all selected assets in all four orientations. Four metre lanes separate lots. A seeded shuffle chooses slots, assets and orientations; blocked sites are skipped. The algorithm either fits the entire requested count or throws with the number that fit. No partial layout is committed. Generation metadata records the seed, exact asset set, area, clearance and algorithm version. Existing work and building identities are preserved when adding another layout.

The library previews the actual candidate models before **Add previewed layout**. A document/revision check rejects stale candidates. Applying recomputes the same plan through the document controller and commits it as one undoable edit. Native browser saves and JSON export/import retain the extension. The generator reserves grassy lanes; it does not paint roads, grade land or generate gameplay connections to house entrances. Those are explicit next layers of settlement generation.

## Rendering and validation

In the editor both collections draw from display batches (`apps/editor/prefab-batches.js`). Opaque triangles merge into one geometry per material, ordered so that each view is a few contiguous runs: one draw per material for every view of an original building (exterior, each floor's cutaway, walls on or off), at most two for a Gross house. A view only rewrites the geometry groups of that shared geometry; the source model still decides what is visible, and placed copies follow their template. The Gross batches bake the native vertex transforms, as before, preserving face materials, normals and physical UVs. Original buildings come from the already grouped game derivative with its borrowed shared atlas, floor cutaways and unit scale; their batch meshes are copied byte for byte, door leaves are baked at their hinges, and glass stays one mesh per source batch so it still sorts back to front. The original provider biases copied floor materials in depth where the editor ground shares the same height; the source vertices remain unchanged. Placed copies share one template per used house design and the six texture resources. `tests/prefab-display-batches.test.mjs` checks, for every design and view, that the drawn triangles are exactly the source's visible triangles. Two things can change a pixel. Merging fixes the draw order inside a material, so where two surfaces of one material meet at exactly equal depth, the winner can differ from the old per-mesh order (which followed camera distance). And baking a door leaf at its hinge rounds its vertices and normals slightly differently from the renderer's own matrices. The [asset-rendering benchmark](asset-rendering-benchmark.md) measures both on SwiftShader. Most editor views are byte-identical. The others differ only at depth ties, shown by its tie masks, or by one colour level in a few cutaway pixels, which vanish when door leaves are left unbaked. They retain original scale and use the editor's lighting/camera. Cutaways use the original artist clipping and floor controls. A house-only preview loads house materials and the same daylight rig, without duplicating the character/biome/machinery atlases. Its layout ground is a neutral grass reference; the main map retains its actual ground and existing objects. Closing a preview disposes its resources and explicitly releases its own WebGL context. Removing unused variants disposes their templates; removing all buildings releases their textures. All temporary review helpers stop after review.

The 32-house limit is a provisional authoring bound, not a measured frame-rate guarantee. The [asset-rendering benchmark](asset-rendering-benchmark.md) now records desktop frame times and draw calls for 32-building districts; larger districts still need phone measurements and likely a distant/exterior representation. The current six-house review does not establish mobile hardware performance. See the [design review](reviews/2026-10-28-building-prefabs.md).
