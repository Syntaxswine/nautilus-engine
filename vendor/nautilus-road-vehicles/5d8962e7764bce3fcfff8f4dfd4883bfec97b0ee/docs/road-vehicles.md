# Painted road vehicles

Find the parked vehicles in **Map Workshop → Asset library → Vehicles**, or search for hatchback, sedan, pickup, van, SUV or crossover. Select a body and paint finish, then use **Use this asset**. R turns the preview by a quarter turn. Placement, Undo, Redo, block rotation and map save/export use the existing scenery workflow.

Eight original bodies each have sage, oxide red and petrol blue paint, for 24 placeable variants. The grid is 1 × 1 m, with the standard 2.12 m story height. All variants reserve two tiles across, with mirrors inside that reservation. Hatchbacks reserve four tiles in length, crew pickups six, and the other bodies five.

The hatchback is 3.70 m long and 1.46 m high. The sedan is 4.54 × 1.44 m. Pickups are 4.84 × 1.77 m and 5.54 × 1.84 m. Vans are 4.80 × 2.10 m and 4.64 × 1.94 m. SUVs are 4.42 × 1.92 m and 4.44 × 1.69 m. These are body length and total height. The original canvas truck measures approximately 4.75 m long, 2.03 m wide and 2.37 m high in the pinned mesh. The vehicles share its native metre scale.

The pivot sits at ground height in the centre of the reservation. Forward is local +Z, and wheel treads meet Y = 0. Public asset dimensions include the mirrors. Model metadata also records body width.

## Shared renderer

```js
import {createRoadVehicleKit} from '@nautilus-engine/renderer/assets/three';

const vehicles = createRoadVehicleKit(THREE);
await vehicles.ready; // Painted image skins; report a load failure to the host.
const car = vehicles.create('vehicle-hatchback-teal');
scene.add(car.root);
const pickup = vehicles.create('vehicle-pickup-sage');
scene.add(pickup.root);
const sculpt = vehicles.create('vehicle-hatchback-teal', {lod: 'sculpt'});
sculpt.dispose();
car.dispose();
pickup.dispose();
vehicles.dispose();
```

Each model returns `{root, dispose()}`. Different finishes of a body borrow the same geometry and image skin. Each car uses two mesh submissions. The kit owns geometry, materials and paint. Individual disposal removes its root. Kit disposal retires all live roots and shared resources, including images that finish loading after retirement. The host owns its renderer and scene. `create()` remains synchronous; await `ready` before presenting the assets. In a renderer without a DOM, supply `{loadSkin: async url => texture}`; the kit takes ownership of the returned texture. Plain Node geometry inspection does not load images.

These are parked assets with fixed wheels, doors, lamps and tailgates. The host supplies driving, passengers, damage, inventories and interactions. Workshop reserves the full footprint as solid, including an open pickup bed. Maps preserve ordinary prop IDs, coordinates and quarter turns. A receiving game must declare `nautilus-road-vehicles-v1` and supply a scenery binding for these IDs. The pinned stock map loader rejects unknown vehicle props. Workshop's handoff check identifies a missing vehicle capability before handing off the map.

## Art and review

Original procedural sculpts live in `packages/vehicle-visuals/sculpt.js`. Finish the curved sheet metal, wheel-well returns, tyres, dished rims, open beds and mirror supports there, then run `node tools/vehicle-art/bake.mjs`. This actually simplifies the completed author surface with pinned meshoptimizer v0.24, retains its positions/normals/UVs and compacts the remaining vertices into `reduced-data.js`. It does not independently generate a coarse version. `reduction.json` records source/output hashes, per-part counts and the simplifier's estimated geometric error. The regression test independently repeats the collapse and checks the complete resulting index/attribute buffers.

| Body | Finished sculpt triangles | Game triangles |
| --- | ---: | ---: |
| Hatchback | 55,680 | 11,198 |
| Sedan | 55,680 | 11,198 |
| Regular pickup | 63,104 | 11,197 |
| Crew pickup | 63,104 | 11,197 |
| Cargo van | 55,680 | 11,198 |
| Passenger van | 55,680 | 11,198 |
| Utility SUV | 62,592 | 11,197 |
| Crossover | 62,592 | 11,198 |

Windows are **painted into the image skin on the continuous body surface**. There are no window overlay polygons or projecting seam/handle/lamp boxes. Door seams, handles, grille, lamps, bumpers, window gaskets, reflections, bed corrugation and wheel fasteners are skin details. Geometry supplies the silhouette and the open bed. The two-sided side layout is symmetric; these are opaque painted windows, without interiors or glass simulation.

`tools/vehicle-art/paint-master.png` is original imagegen brushwork using the existing pinned AFT paint sheet as a style reference. Its exact prompt is in `prompt.json`. `node tools/vehicle-art/skins.mjs` fits the brushwork and authored detail shapes to each model's registered side/top/front/rear UV layout. It requires Sharp, either installed locally or available through `CODEX_NODE_MODULES`. Skin RGB stores painted colour; alpha stores the body-finish mask. The standard material's colour sample uses this mask to tint enamel while leaving glass/trim colours intact. The PNG alpha is not rendered as transparency. `running-gear.png` is shared by every vehicle. Run `node tools/vehicle-art/record.mjs` after baking/painting to refresh the explicit source/asset hashes. Unmodified simplifier source, embedded WASM, README and MIT notice are preserved under the full commit in `vendor/meshoptimizer/` and are used only by authoring/tests.

The body styles are fictional, with proportions selected for readable silhouettes on the metre grid. The preferred revision for these parked tactical assets uses smooth silhouette geometry and painted detail: it improves curved panel/window alignment and matches the existing truck's painterly treatment (subjective visual judgment). The earlier roughly 10,600 → 4,900 approach had lower mesh cost but did not meet the requested sculpt workflow or close-up paint standard. The new triangle counts above are measured. A full set uses eight shared 2048² body skins and one 1024² running-gear skin; RGBA textures with full mipmaps would use about 176 MiB if all are uploaded (code-based estimate). Finishes share these maps. No frame-rate improvement is claimed. The high-detail sculpt remains available for art inspection; the reduced mesh is the gameplay default. No donor or consumer pin changes.

The built Workshop selects two separately named scenery modules through its import map. Its raw pinned scenery catalogue and scene remain byte-preserved for isolated tools. `tools/road-vehicle-registration.mjs` replays the explicit vehicle additions after the authenticated artwork and railway changes.
