// Original metre-scale bathroom art. One map tile is one metre.
export const freeze = value => {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
};
export const BATHROOM_CONTRACT = freeze({
  schema: 'nautilus-bathroom-art', version: 1, metresPerTile: 1, metresPerUnit: 1,
  groundAxes: ['x', 'z'], renderAxes: ['x', 'height', 'z'], scale: [1, 1, 1],
  origin: 'Front-left ground corner; fixtures face local negative z.',
  stallTiles: [1, 2], stallMetres: [1, 2], fixtureSnap: .05,
  wallHeight: 2, floorInterval: 2.12, enclosureWallThickness: .16,
  partitionThickness: .04, partitionBottom: .16, partitionTop: 1.81,
  doorAngles: [0, 90], doorSwing: 'Outward into an explicitly reserved aisle.',
  status: 'Original visual kit; shared editor persistence and game behavior require explicit intake.'
});
const fixture = (id, name, kind, width, depth, extra = {}) => ({id: 'bath-' + id, name, kind, width, depth, category: 'fixture', ...extra});
const modules = [
  fixture('toilet-cistern', 'Ceramic seated toilet', 'toilet', .5, .8, {style: 'ceramic'}),
  fixture('toilet-high-cistern', 'High-cistern period toilet', 'toilet', .5, .8, {style: 'period'}),
  fixture('toilet-steel', 'Stainless seated toilet', 'toilet', .5, .8, {style: 'steel'}),
  fixture('urinal-wall', 'Wall-hung ceramic urinal', 'urinal', .55, .4),
  fixture('urinal-trough', 'Two-person steel urinal trough', 'urinal-trough', 2, .45),
  fixture('sink-pedestal', 'Pedestal washbasin', 'sink', .7, .55, {style: 'pedestal'}),
  fixture('sink-wall', 'Wall-mounted washbasin', 'sink', .65, .5, {style: 'wall'}),
  fixture('sink-double', 'Double wash trough', 'sink-double', 2, .6),
  fixture('sink-stone', 'Stone wash bowl', 'sink', .8, .6, {style: 'stone'}),
  {id: 'bath-stall-panel', name: 'Stall side partition · 2 m', kind: 'partition', category: 'part', width: .04, depth: 2},
  {id: 'bath-stall-frame', name: 'Stall front frame · 1 tile', kind: 'frame', category: 'part', width: 1, depth: .12},
  ...['left', 'right'].map(hand => ({id: 'bath-stall-door-' + hand, name: 'Stall door · ' + hand + ' hinge', kind: 'door', category: 'part', width: 1, depth: .12, hand})),
  {id: 'bath-urinal-divider', name: 'Urinal privacy divider', kind: 'divider', category: 'part', width: .04, depth: .65},
  ...['left', 'right'].map(hand => ({id: 'bath-stall-' + hand, name: 'Complete stall · ' + hand + ' hinge', kind: 'stall', category: 'stall', width: 1, depth: 2, tiles: [1, 2], hand})),
  {id: 'bath-stall-row-3', name: 'Three stalls · independently opening doors', kind: 'stall-row', category: 'assembly', width: 3, depth: 2, tiles: [3, 2], cells: [[0, 0], [1, 0], [2, 0]]},
  {id: 'bath-outhouse-timber', name: 'Timber outhouse', kind: 'outhouse', category: 'outhouse', width: 1, depth: 2, style: 'timber', tiles: [1, 2], bays: 1},
  {id: 'bath-outhouse-double', name: 'Two-bay timber outhouse', kind: 'outhouse', category: 'outhouse', width: 2, depth: 2, style: 'timber', tiles: [2, 2], bays: 2},
  {id: 'bath-outhouse-masonry', name: 'Masonry privy', kind: 'outhouse', category: 'outhouse', width: 1, depth: 2, style: 'masonry', tiles: [1, 2], bays: 1},
  {id: 'bath-outhouse-portable', name: 'Portable toilet cabin', kind: 'outhouse', category: 'outhouse', width: 1, depth: 2, style: 'portable', tiles: [1, 2], bays: 1}
];
export const BATHROOM_MODULES = freeze(modules);
export function bathroomRecipe(id) {
  const recipe = BATHROOM_MODULES.find(r => r.id === id);
  if (!recipe) throw Error('Unknown bathroom module: ' + id);
  return structuredClone(recipe);
}
export const BATHROOM_LAYOUTS = freeze([
  {id: 'bath-public-washroom', name: 'Public washroom · three 1 × 2 stalls', kind: 'layout', category: 'layout', width: 6, depth: 6, enclosed: true,
    instances: [
      {id: 'stalls', assetId: 'bath-stall-row-3', position: [1, 0, 4], yaw: 0},
      {id: 'basins', assetId: 'bath-sink-double', position: [2.9, 0, .8], yaw: Math.PI},
      {id: 'urinal-a', assetId: 'bath-urinal-wall', position: [5.5, 0, 2.2], yaw: Math.PI / 2},
      {id: 'urinal-b', assetId: 'bath-urinal-wall', position: [5.5, 0, 3.2], yaw: Math.PI / 2},
      {id: 'privacy', assetId: 'bath-urinal-divider', position: [5.3, 0, 2.35], yaw: Math.PI / 2}
    ], stallCells: [[1, 4], [2, 4], [3, 4]], aisle: {x: .5, z: 2.8, width: 4.5, depth: 1.2}},
  {id: 'bath-camp-washyard', name: 'Camp washyard · timber and masonry privies', kind: 'layout', category: 'layout', width: 6, depth: 5, enclosed: false,
    instances: [
      {id: 'timber', assetId: 'bath-outhouse-double', position: [0, 0, 3], yaw: 0},
      {id: 'stone', assetId: 'bath-outhouse-masonry', position: [3, 0, 3], yaw: 0},
      {id: 'portable', assetId: 'bath-outhouse-portable', position: [5, 0, 3], yaw: 0},
      {id: 'wash-bowl', assetId: 'bath-sink-stone', position: [1.8, 0, .65], yaw: Math.PI},
      {id: 'trough', assetId: 'bath-urinal-trough', position: [5.5, 0, .65], yaw: Math.PI}
    ], stallCells: [[0, 3], [1, 3], [3, 3], [5, 3]], aisle: {x: 0, z: 1.8, width: 6, depth: 1.2}}
]);
