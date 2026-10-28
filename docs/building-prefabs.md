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

The current authoring profile allows 32 Gross instances per full map, 1–8 m of access clearance and flat ground placement at layer 1. Placement rejects overlapping lots/clearance, water, vegetation, relief, upper geometry, props, walls, canopies, access routes, character starts/patrols and travel markers. Subsequent ordinary edits must also preserve these constraints. Selecting a building allows whole-instance rotation or deletion; the normal undo/redo stack preserves all references.

The `nautilus-building-prefabs-v1` feature is **visual map authoring**, not a gameplay collision or fire compiler. The game handoff calls `assertMapCapabilities(map, adapter.features)` and rejects a consumer that has not explicitly declared this feature. Declaring it is a consumer's promise to preserve the full assembly and implement appropriate collision, navigation, doors, floor/stair traversal and gameplay semantics. Merely displaying a profile in Nautilus does not integrate any game.

The optional source wall trace fragments remain source evidence. They are not inserted as complete maps, and their aperture metadata is not mistaken for solid wall collision. This intake does not merge the separate wall-run implementation. Combining existing wall-run maps and building lots currently fails explicitly pending a shared collision adapter.

Legacy 24 × 24 blocks cannot represent these references. Block import/generation/rotation reject the field; capture and replacement reject a sector intersecting a building or its clearance. Unaffected sectors remain usable. This prevents silent loss of a house, its floors or its source identity.

## Procedural placement

`generateBuildingLayout(map, options)` in `packages/prefab-core` is headless and deterministic. Options include a text seed, count, allowed asset IDs, an integer rectangular area and clearance. It returns a copied candidate map plus instances; it never edits its input or consumes global randomness.

`lot-grid-v1` uses square lots large enough for all selected assets in all four orientations. Four metre lanes separate lots. A seeded shuffle chooses slots, assets and orientations; blocked sites are skipped. The algorithm either fits the entire requested count or throws with the number that fit. No partial layout is committed. Generation metadata records the seed, exact asset set, area, clearance and algorithm version. Existing work and building identities are preserved when adding another layout.

The library previews the actual candidate models before **Add previewed layout**. A document/revision check rejects stale candidates. Applying recomputes the same plan through the document controller and commits it as one undoable edit. Native browser saves and JSON export/import retain the extension. The generator reserves grassy lanes; it does not paint roads, grade land or generate gameplay connections to house entrances. Those are explicit next layers of settlement generation.

## Rendering and validation

The scene adapter batches native triangles by material and floor/visibility group, baking the original vertex transforms and preserving face materials, normals and physical UVs. Placed copies share one template per used house design and the six texture resources. They retain original scale and use the editor's lighting/camera. Cutaways use the original artist clipping and floor controls. A house-only preview loads house materials and the same daylight rig, without duplicating the character/biome/machinery atlases. Its layout ground is a neutral grass reference; the main map retains its actual ground and existing objects. Closing a preview disposes its resources and explicitly releases its own WebGL context. Removing unused variants disposes their templates; removing all buildings releases their textures. All temporary review helpers stop after review.

The 32-house limit is a provisional authoring bound, not a measured frame-rate guarantee. Larger districts need representative GPU/frame-time measurements and likely a distant/exterior representation. The current six-house review does not establish mobile hardware performance. See the [design review](reviews/2026-10-28-building-prefabs.md).
