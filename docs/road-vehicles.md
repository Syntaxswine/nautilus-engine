# Painted road vehicles

Find the parked vehicles in **Map Workshop → Asset library → Vehicles**, or search for hatchback, sedan, pickup, van, SUV or crossover. Select a body and paint finish, then use **Use this asset**. R turns the preview by a quarter turn. Placement, Undo, Redo, block rotation and map save/export use the existing scenery workflow.

Eight original bodies each have sage, oxide red and petrol blue paint, for 24 placeable variants. The grid is 1 × 1 m, with the standard 2.12 m story height. All variants reserve two tiles across, with mirrors inside that reservation. Hatchbacks reserve four tiles in length, crew pickups six, and the other bodies five.

The hatchback is 3.70 m long and 1.46 m high. The sedan is 4.54 × 1.44 m. Pickups are 4.84 × 1.77 m and 5.54 × 1.84 m. Vans are 4.80 × 2.10 m and 4.64 × 1.94 m. SUVs are 4.42 × 1.92 m and 4.44 × 1.69 m. These are body length and total height. The original canvas truck measures approximately 4.75 m long, 2.03 m wide and 2.37 m high in the pinned mesh. The vehicles share its native metre scale.

The pivot sits at ground height in the centre of the reservation. Forward is local +Z, and wheel treads meet Y = 0. Public asset dimensions include the mirrors. Model metadata also records body width.

## Shared renderer

```js
import {createRoadVehicleKit} from '@nautilus-engine/renderer/assets/three';

const vehicles = createRoadVehicleKit(THREE);
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

Each model returns `{root, dispose()}`. Different finishes of a body borrow the same geometry. One procedural paint sheet supplies matte brushwork, rubber, window reflections and trim, using the railway kit's texture generator. Each car uses two mesh submissions. The kit owns geometry, materials and paint. Individual disposal removes its root. Kit disposal retires all live roots and shared resources. The host owns its renderer and scene.

These are parked assets with fixed wheels, doors, lamps and tailgates. The host supplies driving, passengers, damage, inventories and interactions. Workshop reserves the full footprint as solid, including an open pickup bed. Maps preserve ordinary prop IDs, coordinates and quarter turns. A receiving game must declare `nautilus-road-vehicles-v1` and supply a scenery binding for these IDs. The pinned stock map loader rejects unknown vehicle props. Workshop's handoff check identifies a missing vehicle capability before handing off the map.

## Art and review

Original procedural sculpts live in `packages/vehicle-visuals/sculpt.js`. Authoring geometry uses 48 radial wheel divisions and 24 arch divisions. The game models simplify these to 20 and 10, keeping the same dimensions. Painted door seams, grille bars and bed grooves concentrate geometric detail in the body shapes, wheel wells, tyres and mirrors.

The body styles are fictional, with proportions selected for readable silhouettes on the metre grid. The faceted silhouette and matte brushwork are a visual choice for the Workshop's existing painted truck and trains. Reported triangle counts measure generated geometry, without a frame-rate claim.

The built Workshop selects two separately named scenery modules through its import map. Its raw pinned scenery catalogue and scene remain byte-preserved for isolated tools. `tools/road-vehicle-registration.mjs` replays the explicit vehicle additions after the authenticated artwork and railway changes.