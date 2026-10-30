# Tinderbox native art

Optional visual candidate, profile `tinderbox-native-art-v1`, API/content version 1. Discover 51 entries with `listSharedAssets()` from `@nautilus-engine/map-core/assets`; load their provider through the existing `@nautilus-engine/map-core/assets/three` entry. Optional split packages expose discovery at `@nautilus-engine/core/assets` and the provider at `@nautilus-engine/renderer/assets/three`. Select an exact engine commit when adopting this candidate.

The library contains **35 independently reusable furnishings, nine waterfront pieces, three medicine props and four additive interior arrangements**. It creates appearance only. Native dimensions, origins, quarter turns, metre UV density, semantic part IDs and static tank aftermath are retained. No clocks, game input, inventory, damage detection, physical material assignment or saved game state are owned here.

| Usage card | Contract |
| --- | --- |
| Required service | The host's one compatible Three namespace, including `Group`, `InstancedMesh` and `Box3`. The factory imports no second Three. Tested with the shared r180 renderer. |
| Public connection | `await loadTinderboxArt(THREE, {families:['waterfront']})` loads only selected families; omit options for all four families: interior, waterfront, medicine, layout. `library.create(fullCatalogueId, options)`; `library.plan(venueId)` returns a copied source plan when layouts are loaded. Unknown/unloaded IDs, create options and invalid bindings reject. |
| Resources | Procedural meshes and default materials are self-contained JavaScript. Optional input materials and textures/maps remain borrowed; materials are cloned. No image fetch or shader projection service is required. |
| Coordinates | One unit = one metre, +Y up, ground X/Z. Furnishings face -Z at their recorded source origin; check each measured `bounds`, attachment and source spec. Waterfront pivot is the front-left tile vertex, +X along shore, +Z landward. |
| Native structure | Walls 1 × 2 × .16 m; slab thickness .12 m; floor pitch **2.12 m**. Compose pieces without scaling. Bounds include overhangs, decoration and optional aftermath; an AABB is not a solid collider. |
| Placement | Furnishings accept finite `position:[x,height,z]` and `quarterTurns:0..3`. Waterfront/layout positions require integer X/Z and Y at a multiple of 2.12 m. There is no scale option. |
| Appearance | `materials`/`textures` bind named source slots. Furnishings/layouts: facade, ivory, trim, wood, woodDark, brass, velvet, linen, iron, glass, water, stone, foliage, soil, fruit, paper, ink, red, ochre. Waterfront: facade, coping, paving, rail, ornament. The waterfront also supports atomic `setAppearance()`. |
| Ownership | Caller adds the returned `root` to its scene. Instance `dispose()` removes it and retires owned geometry/materials/instance buffers. Library `dispose()` retires all remaining instances. Both are idempotent; borrowed materials, maps, scene and renderer survive. Calls on disposed handles reject. |
| Game decisions | Host owns collision, support, stairs/water traversal, physical materials/fuel, permissions, damage policy, streaming, persistence and atomic game commits. No placement/export capability was added to the portable editor format. |

## Smallest consumer

```js
import * as THREE from '@nautilus-engine/map-core/render-effects/three';
import {listSharedAssets} from '@nautilus-engine/map-core/assets';
import {loadTinderboxArt} from '@nautilus-engine/map-core/assets/three';

// Retain the host scene and renderer. No editor or donor game is loaded.
const scene = new THREE.Scene();
const library = await loadTinderboxArt(THREE);
const entry = listSharedAssets({category:'Furnishings'})
  .find(a => a.id === 'tinderbox:interior:writing-desk');
const desk = library.create(entry.id, {position:[4, 2.12, 6], quarterTurns:1});
scene.add(desk.root);
// Host renders scene, chooses collision/support and persists its own placement.
desk.dispose();
library.dispose();
```

The [interactive source/static gallery](../../examples/tinderbox-art.html) searches every entry, retains native model scale and fits the camera to the selected bounds. Its floor grid and lights are review aids. It is a reference consumer, not the map editor or a playable level. The installed snippet above needs no gallery or sibling checkout.

## Layouts and compatibility

`tinderbox:layout:new-york`, `:administration`, `:horticulture` and `:fisheries` add partitions, opening frames and furnishings to the donor's source-local landmark coordinates. They **contain no floor slabs, exterior shells, stairs or door leaves**. The four arrangements total 65 described spaces, 64 partition runs and 386 placed furnishings/decorations. These numbers describe authored content, not playable rooms.

Use `levels`, `sectionBounds:{min:[x,y,z],max:[x,y,z]}` and `includeCeilings:false` to prepare only a selected source-local section. Bounds select intersecting components before construction; they do not slice a mesh. Do not assume a high ceiling fixture fits an ordinary single storey. Inspect the source plan's occupied levels, attachment metadata and measured bounds.

The original [interior handoff at the fixed source](https://github.com/Syntaxswine/tinderbox/blob/e261e7c749a4957470195b993a53051cae15416f/docs/art/landmark-interiors/README.md) specifies matching shell pins and exact replacement/hidden IDs. In particular, Horticulture requires hiding its 90 named original exhibit IDs; Fisheries requires constructing its separate shell with `includeExhibits:false`. Those shells and the donor's production game are not silently imported. A layout alone is not a complete building. Prefer standalone props and waterfront modules for general Nautilus authoring; full landmark adoption needs a separate geometry/streaming/game review.

Waterfront metadata preserves ports, floor cells, true concave water notch, overhangs and the twelve-tread stair with a 2.12 m total rise. Water height and simulation remain host choices. The `concrete`/`wood` source compiler tokens only validate authoring; they do not assign historical construction or fuel.

## Tank appearance and restore

Three tank types support intact and destroyed appearances. A host may supply `{destroyed:true}` at standalone creation. After an authoritative state change, call `setTankDestroyed(stableTankId, boolean)`. Repeated same-state calls return false and produce no new allocations or one-shot effects. `getTankState()` returns the current appearance. Unknown/unloaded IDs fail. Library/instance disposal invalidates these methods.

```js
const tank = library.create('tinderbox:interior:aquarium-small');
const id = tank.metadata.damageTargets[0].id;
tank.setTankDestroyed(id, true); // Host has already committed its game state.
tank.setTankDestroyed(id, true); // false; quiet repeat
```

The donor's single-bullet requirement is preserved as source provenance. **It is not a universal Nautilus damage rule.** No hit callback, score, inventory cost, flooding, hazard or fish-survival simulation is installed. Hosts persist tank state with their own versioned placement data and reapply it during construction; restoring appearance does not replay effects. There is no new engine save schema or consumer pin.

`bounds` is the live placed Three Box3; frozen `metadata.bounds` records the initial source presentation. Aftermath debris can extend beyond intact bounds. Instance ray indices can change when tank buffers compact; resolve `object.userData.parts[hit.instanceId].damageTargetId` afresh and persist stable IDs, never instance indices. A source plan is descriptive metadata, not a collision/traversal compiler.

## Snapshot-driven medicine presentation

Standalone IDs are `tinderbox:medicine:powder`, `:healing` and `:inversion`. These create the original packet, jar and octagonal tin at native scale. Their slots are shirt, leather, brass, steel, ivory, dark and glass. For a whole pickup snapshot, load the independent provider below; it imports no interior plans, landmark meshes, DOM texture helpers or game rules.

```js
import {loadTinderboxMedicine} from '@nautilus-engine/map-core/assets/three';
const pickups = await loadTinderboxMedicine(THREE);
scene.add(pickups.root);
pickups.update([{id:'jar-1',kind:'healing',x:4,y:6,radius:.6}], {paused:true});
// After the host commits consumption, omit the ID or include consumed:true.
pickups.update([], {paused:true});
pickups.dispose();
```

`update()` takes a complete snapshot of at most 64 unique string IDs. Kind is powder/healing/inversion; x/y are finite ground metres mapping to X/Z, radius is positive host metadata and never rescales the model. Optional `consumed` is boolean. Invalid batches preserve the previous snapshot; consumed or omitted IDs disappear even while paused. World time and pause fields never advance a private animation. Restore by sending the host's accepted snapshot again. Pickup radius, effects, inventory, healing, eligibility, timing, permissions and atomic save/use decisions remain game-owned. Borrowed materials/paints survive disposal.

## Source, design choice and acceptance

The deliberate interior source is published artist commit [`e261e7c749a4957470195b993a53051cae15416f`](https://github.com/Syntaxswine/tinderbox/commit/e261e7c749a4957470195b993a53051cae15416f). This unmerged artist candidate is explicitly selected for bounded visual intake. The nine waterfront recipes originate at `c6ddd51d7dd47a2ec148159e6a6d64a8d00bd2a9`; their runtime/dependency bytes also match published Tinderbox integration `dc7f537a83a7e832a0dfa0757d0b2700b909c053` and the selected interior pin. Original Git blobs, byte counts, SHA-256 values, handoffs and historical source registers remain in `vendor/tinderbox-art/<commit>/provenance.json`. Runtime copies normalize line endings and redirect imports to the existing shared wall compiler; metadata's `enginePin` records the historical authoring pin, not a current engine release version. Original vendor bytes remain untouched. Research images and the donor game are excluded from runtime. Retain Arnold/Higinbotham/Gutenberg, original-plan/report credits and embedded notices; provenance adds no license grant.

Medicine has its separate fixed source `988b4aca32343c9f2e566db74bb018c705820742` and `vendor/tinderbox-medicine/<commit>/provenance.json`. Its factory/marks also match published master `dc7f537`. Original SVG, contour hashes and notice/provenance records are retained. Runtime selects only the unchanged PALETTE constant from the larger donor materials module, excluding unused DOM/texture code, and redirects two imports. No research or evolving UI resource is loaded.

**Accuracy:** prefer unchanged native dimensions, genuine open passages and real concave/stair geometry over stretched proxies. Source photographs/plans guide authored period forms; precise furnishing dimensions and many room placements remain interpretations, not surveyed reconstructions. **Efficiency:** prefer lazy optional modules and per-model instancing over importing the donor game. Catalogue triangle counts are measured geometry counts, not CPU/GPU frame-rate evidence. Large assemblies and the grotto need consumer-specific budgets. **Narrative:** warm wood, cream/gold details, glass cases and coherent shoreline pieces suit exposition and period scenes (art judgment); hosts can bind alternate finishes for other games.

Builder checklist for adoption:

- [ ] Find this card, catalogue entry, public imports and source notices in the installed package.
- [ ] Bind the existing Three namespace; create a prop and a waterfront piece at native scale.
- [ ] Inspect all required rotations, attachment heights, neighbouring joins and exact supported geometry.
- [ ] Supply collision/support, water/traversal and material/fire decisions explicitly; reject unsupported map export.
- [ ] Stage a host placement save and authoritative tank state; reject unknown IDs before replacing live state.
- [ ] Verify tank repeat/restore, section filtering, independent instances, failed inputs and retry.
- [ ] Review the adopting game's desktop/phone output, painted texture substitutions and scene budget.
- [ ] Dispose/reopen and confirm owned cleanup and survival of borrowed services.
- [ ] Record exact engine/game pins and complete the adopting game's tests. Engine art acceptance does not update any game pin.

Engine candidate evidence is recorded in [the intake review](../../docs/reviews/tinderbox-art-intake.md). Game adoption and complete landmark traversal remain separate.
