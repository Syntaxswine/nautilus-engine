# Nautilus shared foundation

## Ownership and layout

| Path | Responsibility |
| --- | --- |
| `packages/map-core/` | Headless public API and portable example content |
| `packages/prefab-core/` | Headless whole-building identities, conservative placement lots and deterministic settlement candidates |
| `packages/building-catalog/` | Original architectural recipes, descriptive rooms/openings and an optional host-supplied Three renderer |
| `packages/render-effects/` | Optional standard-depth WebGL2 effects and the shared Three entry; game eligibility stays outside |
| `packages/rules-core/` | Headless character sheets, skills, explicit roll profiles and resource/damage boundaries |
| `apps/editor/` | Nautilus workshop chrome, responsive layout and game-host bridge |
| `vendor/aft/<commit>/` | Byte-preserved AFT editor, rendering dependency closure and selected original tests |
| `vendor/aft-assets/<commit>/` | Byte-preserved supplemental machine paint closure for the existing AFT snapshot |
| `vendor/farmyard/<commit>/` | Byte-preserved painted UI materials and their provenance |
| `vendor/tinderbox-prefabs/<commit>/` | Byte-preserved Gross house assemblies, source plates/plans, materials and handoff |
| `packages/prefab-core/` | Headless building registry, lot validation and deterministic layout placement |
| `upstream.json` | Reviewed donor pins and their purpose |
| `tools/snapshot-source.mjs` | Read-only Git-object importer; writes only a new local snapshot |
| `tools/build.mjs` | Self-contained static editor, recorded deployment patches and isolated storage |
| `tests/` | Nautilus boundary/behavior checks |

Game working copies remain independent. No runtime URL points to a sibling checkout, an absolute local file path, or a moving remote branch. All reused renderer modules resolve the same vendored Three.js instance.

Design selection follows [accuracy, efficiency and narrative](design-evaluation.md). Reviews must recommend a preferred design for the named game or use case, with reasons and evidence. Shared interfaces can support different simulation detail; [the initial recommendations](reviews/2026-10-28-design-tradeoffs.md) distinguish general percentage attacks, dramatic AFT shot outcomes, detailed Tinderbox fire and cheaper tactical policies.

## Optional rendering effects

The [contour effect contract](render-effects.md) exposes the reviewed Farmyard golden halo with standard and wide profiles. Its separately pinned source is reference evidence; the engine extraction uses the existing Three instance and has no gameplay imports. It does not enable itself in the map workshop or donor games.

## Shared building authoring

The [prefab contract](building-prefabs.md) preserves source assemblies and saved collection identities, while [the original building catalogue](building-catalog.md) supplies additional painted architectural designs and exported glTF assets. Buildings are visual authoring references; collision, navigation, doors, fire and game persistence remain explicit consumer responsibilities. Legacy AFT structure stamps still produce ordinary editable geometry. The [integration intake](intake/2026-10-28-expanded-library.md) records contribution pins, design choices and acceptance evidence.

## Character and rules API

The [rules contract](rules.md) defines the portable character schema and the boundaries between derived stats, checks, combat decisions, confirmed impacts and consumer scheduling. The [three-game comparison](reviews/2026-10-28-rules-foundation.md) records why each design was selected. Rule modules run without a DOM, renderer, storage or internal clock. They reuse pinned algorithms and return copied state/events; consumers own commit/persistence and world geometry.

## Public map API

`createMapDocument(name)` and `createBlockDocument(name)` create independent documents. `openDocument(objectOrJSON)` opens the existing portable map or block format. `MapDocument` wraps the inherited editing controller. Its key methods are `preview(command)`, `apply(command)`, `undo()`, `redo()`, `rename(name)`, `replace(map)`, `validate()` and `export()`.

Preview returns a candidate without committing it. Apply commits only accepted commands. Rejected edits leave the blueprint and undo history intact. Validation checks map geometry and reachability; authoring can temporarily disconnect areas until the design is ready to export for gameplay. Import validates before opening a replacement document.

`generateConnectedMap(designs, seed, plan)` builds from a supplied block library without changing that library. `emptyFeaturePlan`, `seededFeaturePlan`, connection inspection/matching, map/block parsing and validation are also exported. Seeded generation remains bounded, validates its assembled result and reports missing continuations or crossing blocks.

`MAP_CONTRACT` records the inherited dimensions. Ground map coordinates use integer-centred metre positions `(x,y)` with a layer index `z`; the Three.js scene uses `(x,height,y)`. The inherited rendering and tactical floor intervals differ and remain in the pinned conversion helpers. Do not equate layer index with metres or rescale collision separately from visuals.

[Angled wall runs](wall-runs.md) extend this boundary with measured ground endpoints and an explicit consumer capability. They retain native panel dimensions and survive map/block editing, capture, placement, rotation and connected generation. The [design assessment](reviews/2026-10-28-angled-walls.md) explains the choice and its limits.

## Browser and game-host boundary

The [editor asset integration contract](editor-assets.md) defines catalog discovery, shared-renderer previews, placement bindings and future visual intake. The library derives entries from the pinned registries, retains explicit portable-format restrictions and records its built inventory separately from the original vendor snapshots.

The [building prefab contract](building-prefabs.md) adds a separate whole-building library. Gross house assemblies remain fixed source references with complete interiors/exteriors and a declared optional map capability. Their lots can be placed deterministically into full maps. Game adapters must explicitly support this feature; legacy block operations reject data they cannot preserve.

The standalone browser entry exposes `window.nautilus`:

```js
const disconnect = window.nautilus.connectGame({
  openMap({json, contract}) {
    // The consumer validates its own capabilities and translates the blueprint.
    return myGame.openEditorMap(json, contract);
  }
});

// Later, when the host is removed:
disconnect();
```

`window.nautilus.open(input)` opens a valid map/block, `export()` returns portable JSON, and `sendToGame()` sends a validated map copy. The host must explicitly connect an adapter before either handoff button enables. Blocks must first be placed in a full map. A handoff does not discard the editor blueprint or history.

This is an embedding API, not an automatic cross-origin bridge. Consumers own their launch UI, origin checks, transport and capability validation. Nautilus never opens a donor checkout's runtime. The original upstream playtest bridge stays unchanged in source; only the built editor uses Nautilus's separate host adapter.

## Consumer adoption

| Consumer | Initial compatibility | Work still required |
| --- | --- | --- |
| AFT 3D | Original portable map/block schemas and editor behavior retained | Pin Nautilus, replace its editor entry deliberately, review the game handoff |
| Farmyard Commando | Existing AFT-import path provides a starting point for flat maps | Bind the adapter; reject upper floors, traversal and unsupported terrain/objects explicitly |
| Tinderbox | Shared metre scale and suitable visual assets | Translate blueprint objects into Tinderbox content/collision without importing AFT combat rules |

The initial catalog and document controller still contain AFT character and scenario conventions. Later extraction can separate catalogs, placement constraints and spawn roles into registries. Consumer pins should be exact releases/commits and updates should run each game's checks. Do not make a consumer silently follow Nautilus main.
