// Original parked road vehicles. Metres are native render units.
export const ROAD_VEHICLE_FEATURE = 'nautilus-road-vehicles-v1';
export const VEHICLE_GRID = Object.freeze({tileM: 1, storyM: 2.12});
const form = (id, name, cells, lengthM, widthM, heightM, wheelRadiusM, axlesM, kind) =>
  Object.freeze({id, name, cells: Object.freeze(cells), lengthM, widthM, heightM, wheelRadiusM,
    axlesM: Object.freeze(axlesM), kind});
export const VEHICLE_BODIES = Object.freeze([
  form('hatchback', 'Compact hatchback', [2, 4], 3.70, 1.72, 1.46, .29, [-1.08, 1.13], 'car'),
  form('sedan', 'Family sedan', [2, 5], 4.54, 1.80, 1.44, .30, [-1.37, 1.39], 'car'),
  form('pickup', 'Regular cab pickup', [2, 5], 4.84, 1.88, 1.77, .35, [-1.48, 1.52], 'pickup'),
  form('crew-pickup', 'Crew cab pickup', [2, 6], 5.54, 1.90, 1.84, .36, [-1.71, 1.76], 'pickup'),
  form('cargo-van', 'Panel cargo van', [2, 5], 4.80, 1.90, 2.10, .32, [-1.46, 1.47], 'van'),
  form('passenger-van', 'Passenger van', [2, 5], 4.64, 1.84, 1.94, .31, [-1.39, 1.45], 'van'),
  form('utility-suv', 'Boxy utility SUV', [2, 5], 4.42, 1.88, 1.92, .35, [-1.30, 1.33], 'suv'),
  form('crossover', 'Compact crossover', [2, 5], 4.44, 1.82, 1.69, .32, [-1.35, 1.38], 'suv')
]);
export const VEHICLE_FINISHES = Object.freeze([
  Object.freeze({id: 'sage', name: 'sage', colour: 0x72816b}),
  Object.freeze({id: 'oxide', name: 'oxide red', colour: 0xa36752}),
  Object.freeze({id: 'teal', name: 'petrol blue', colour: 0x527b82})
]);
export const ROAD_VEHICLES = Object.freeze(VEHICLE_BODIES.flatMap(body =>
  VEHICLE_FINISHES.map(finish => Object.freeze({
    id: 'vehicle-' + body.id + '-' + finish.id, form: body.id, finish: finish.id,
    name: body.name + ' · ' + finish.name, cells: body.cells,
    lengthM: body.lengthM, widthM: body.widthM, heightM: body.heightM
  }))));
const byId = new Map(ROAD_VEHICLES.map(row => [row.id, row]));
export function roadVehicle(id) {
  const key = typeof id === 'string' && id.startsWith('vehicle:') ? 'vehicle-' + id.slice(8) : id;
  const row = byId.get(key);
  if (!row) throw new RangeError('Unknown road vehicle: ' + String(id));
  return row;
}
export const ROAD_VEHICLE_SCENERY = Object.freeze(Object.fromEntries(ROAD_VEHICLES.map(row => [row.id,
  Object.freeze({w: row.cells[0], h: row.cells[1], origin: Object.freeze(row.cells.map(n => (n - 1) / 2)),
    facing: Object.freeze([0, 1]), name: row.name, model: 'road-vehicle', form: row.id,
    height: row.heightM, cover: 0, solid: true})
])));
export const ROAD_VEHICLE_ASSETS = Object.freeze(ROAD_VEHICLES.map(row => Object.freeze({
  id: 'vehicle:' + row.id.slice(8), name: row.name, category: 'Vehicles',
  dimensions: Object.freeze({width: 1.97, depth: row.lengthM, height: row.heightM, metresPerUnit: 1}),
  tiles: row.cells, source: Object.freeze({project: 'nautilus', profile: 'painted-road-vehicles', version: 1}),
  availability: 'shared-road-vehicle-renderer', entry: './assets/three', factory: 'createRoadVehicleKit',
  modelId: row.id, guide: 'docs/road-vehicles.md',
  note: 'Parked vehicle with a whole-metre placement reservation. The host owns driving and interactions.'
})));