# Painterly White House and furnishing kit

Original visual landmark `white-house-public-tour-v1`. A classic public-tour interpretation of the residence, historic East/West Wings, colonnades and compact grounds, with 46 rooms and 51 reusable furnishing designs. The interior recipe places 463 furnishings, with additional grounds modules. Published as an optional asset; this does not establish playable rooms or a production-game integration.

Public headless entry: `@nautilus-engine/core/landmarks/white-house`. Host-Three renderer: `@nautilus-engine/renderer/landmarks/white-house/three`. Files without Three: `@nautilus-engine/building-assets/white-house`. The source/static workbench is `examples/white-house.html`, linked from the Building Library. The installed guide includes this minimal consumer and checklist.

```js
import * as THREE from '@nautilus-engine/renderer/render-effects/three';
import {createWhiteHouseModel, createWhiteHouseFurnishing,
        whiteHousePaintURL, whiteHouseModelFiles}
  from '@nautilus-engine/renderer/landmarks/white-house/three';
const atlas = await new THREE.TextureLoader().loadAsync(whiteHousePaintURL());
atlas.colorSpace = THREE.SRGBColorSpace;
const house = createWhiteHouseModel(THREE, {atlas, lod:'game'});
scene.add(house.root);
house.setView({level:1, roof:false, cutaway:true, grounds:false});
// Isolate a room, or make an independently placeable furnishing:
house.setView({level:1, roomId:'blue-room', roof:false, cutaway:true});
const desk = createWhiteHouseFurnishing(THREE, 'resolute-desk', {atlas});
scene.add(desk.root);
console.log(whiteHouseModelFiles('resolute-desk')); // glTF + BIN + shared atlas
// On host scene retirement:
house.dispose(); desk.dispose(); atlas.dispose();
```

## Space and design choices

- One unit is one metre. Render axes are `(x,height,z)`, north is negative Z, and the scene origin is its northwest corner. Estate footprint: 132 × 96 tiles. Residence: 48 × 24 m. The 1 m floor tiles, integer room footprints and 2.12 m Z steps follow editor conventions.
- Occupied residence Z levels are 0, 1, 3 and 5. State/family rooms are 4.24 m high; other rooms 2.12 m. Z=2 and Z=4 are double-height voids, never extra slabs. The roof is display geometry above the six editable strata. Stairwell slab openings and visible flights preserve these elevations; host stair traversal/support remains unbound.
- The main plan and silhouettes use published archived tour references. Dimensions, wing plans, private/service rooms, grounds and contents are adapted. This is neither a measured reconstruction nor a current-condition survey. The historic East Wing is intentionally included. No contemporary private layout or exact historic furniture inventory is claimed.
- Furniture has stable IDs and tile footprints; the bathroom stall occupies exactly **1 × 2 tiles**. Nominal sizes describe the intended object; exported bounds include trim. Small trim may extend slightly outside nominal dimensions. Props are floor-centred and independently placeable; chandelier and wall-item positions require explicit host placement heights.
- The `authoring` source preserves dense radial profiles, small beads, column flutes, glass pendants, bevels and balustrades. The `game` derivative reduces those after the forms are settled. Both share painterly albedo: damask, parquet, drapery folds, panel ornament, gold and woodgrain use the new original atlas, without normal/displacement maps. Pixel rectangles accommodate the generated atlas's nonuniform rows.

Public sources and uncertainties are in `art/white-house/references.json`; exact built-in image-generation prompt/provenance in `art/white-house/generation.json`. Reference pictures stay outside runtime assets. All geometry and paints are newly authored. The landscape swatch is an original illustration, not a copied historical painting. The manifest records atlas/export hashes and measured triangles for both LODs; those counts are not FPS claims. Exterior-only export is available for cheaper distant views. `setView` culls complete room/floor batches; authoring mode is for review, not a default city workload.

## Ownership, saves and adoption

Supply the host's shared Three namespace and loaded atlas. The provider has no DOM, renderer, clock, game authority, inventory or persistence. Each model owns its geometry/materials and a cloned texture configuration; the borrowed atlas/image stays with the host. `dispose` is idempotent, removes owned roots and releases those resources. Changing view never alters geometry, saves, dimensions or the plan. Unknown asset IDs/LODs fail explicitly. Async texture loading/cancellation belongs to the host; stage it before replacing a live scene.

The JSON `white-house.scene.json` is a versioned native landmark recipe and tile/room sidecar, **not** the inherited portable map/block format. It preserves sparse Z levels, curved visual rooms, placements and stair requirements. `whiteHouseCompatibility` reports missing required host declarations. A legacy adapter must refuse unsupported features instead of dropping curves, floors or furnishings. There is no new movement/collision/fire/interaction implementation. Chairs are visual seats; toilets, stalls, lights, doors and electronics have no implied behavior. A bathroom door is shown closed. Bind dynamic variants explicitly in the adopting game.

The glTFs are ordinary 2.0 assets with separate BIN buffers and one shared PNG. Keep each `.gltf` with its matching `.bin` in `models/`, and the atlas one directory above. They retain baked geometry and semantic mesh metadata, not the live JavaScript cutaway API, interactions or animation clips. The full source recipes, plan and skin provenance are included in the downloadable pack.

## Builder checklist

- [ ] Select an exact engine/asset pin. Inspect contract, manifest, references, original paint prompt and exported bounds.
- [ ] Load the host's one Three and atlas; test source/game LODs and an individual furniture placement.
- [ ] Match 1 m tiles, 2.12 m Z, occupied levels, stairwell holes, room IDs and the 1 × 2 stall footprint.
- [ ] Supply explicit host geometry, movement/support, interactions and save policies. Refuse incomplete adoption with `whiteHouseCompatibility`.
- [ ] Verify full estate, both porticoes, state rooms, Oval Office and floor/room isolation at desktop/phone sizes. Choose an appropriate residency/LOD policy.
- [ ] Stage loads before scene replacement; test failure/cancellation in the host, then dispose and confirm the borrowed atlas/scene survive.
- [ ] Save the full landmark sidecar with IDs/content pin. Do not mislabel it as a portable map or replay cosmetic objects as gameplay events.

**Recommendation:** preserve recognisable public room relationships and the porticoes while adapting dimensions to the editor (accuracy with explicit compromises). Prefer painted ornament and the simplified/exterior variants for gameplay (efficiency; actual counts in the manifest, device performance unmeasured). The ceremonial palette and rich furniture support a recognisable landmark and readable room identities (subjective narrative judgment). Detailed source remains available for close inspection.
