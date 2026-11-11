import {validateMap, FARMYARD_DOOR_CONTRACT} from './core-peer.js';

export const FARMYARD_PLAYTEST_PROFILE = Object.freeze({
  id: 'farmyard-flat-solo-door-v1',
  productionCommit: '4a0bd292ee09abb7f61e743289f5a40f09655b2c',
  width: 240,
  height: 240,
  metresPerTile: 1,
  terrain: Object.freeze(['yard', 'floor', 'crate', 'ground-asphalt', 'ground-grass', 'ground-gravel', 'ground-concrete']),
  edges: Object.freeze(['wall', 'door-wood-closed', 'door-steel-closed']),
  maximumDoors: FARMYARD_DOOR_CONTRACT.doors,
  maximumBoxes: FARMYARD_DOOR_CONTRACT.boxes
});

export class FarmyardPlaytestError extends Error {
  constructor(code, path, message, {cause, details, cleanupError} = {}) {
    super(message, {cause});
    this.name = 'FarmyardPlaytestError';
    this.code = code;
    this.path = path;
    if (details !== undefined) this.details = details;
    if (cleanupError) this.cleanupError = cleanupError;
  }
}

const profile = FARMYARD_PLAYTEST_PROFILE;
const mapFields = new Set([
  'version', 'width', 'height', 'levels', 'name', 'terrain', 'upper', 'edges',
  'stairs', 'climbs', 'canopies', 'edgeLocks', 'props', 'starts', 'guards', 'exits', 'foliage'
]);
const defaultCharacter = {
  displayName: '', scriptId: '', category: 'squad', faction: 'player', attitude: 'friendly',
  combatBehavior: 'fight', canTalk: false, dialogueRef: '', canSell: false,
  shopInventoryRef: '', shopPricingRef: ''
};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (code, path, message, options) => { throw new FarmyardPlaytestError(code, path, message, options); };
const cell = (value, size) => Number.isInteger(value) && value >= 0 && value < size;

function marker(point, path, role) {
  if (!record(point) || !cell(point.x, profile.width) || !cell(point.y, profile.height) ||
      (Object.hasOwn(point, 'z') && point.z !== 0)) {
    fail('INVALID_MARKER', path, 'Place this marker at a ground cell centre inside the 240 × 240 map.');
  }
  const allowed = ['x', 'y', 'z'];
  if (role !== 'retained-travel-marker') allowed.push('character');
  if (role === 'solo-spawn') allowed.push('heading');
  for (const key of Object.keys(point)) {
    if (!allowed.includes(key)) fail('UNBOUND_MARKER_PROPERTY', path + '/' + key, 'This marker property has no Farmyard binding.');
  }
  if (Object.hasOwn(point, 'character')) {
    if (!record(point.character)) fail('UNBOUND_ACTOR_PROPERTY', path + '/character', 'Use the default Workshop character metadata.');
    for (const [key, value] of Object.entries(point.character)) {
      if (key === 'id' || key === 'references' && Array.isArray(value) && value.length === 0) continue;
      if (!Object.hasOwn(defaultCharacter, key) || value !== defaultCharacter[key]) {
        fail('UNBOUND_ACTOR_PROPERTY', path + '/character/' + key, 'Authored character properties require a Farmyard binding.');
      }
    }
  }
  return Object.freeze({path, role, x: point.x, y: point.y, z: 0});
}

function checkTerrain(map) {
  if (!Array.isArray(map.terrain) || map.terrain.length !== profile.height) {
    fail('INVALID_TERRAIN', '/terrain', 'Supply all 240 ground rows.');
  }
  let boxes = 0;
  for (const [y, row] of map.terrain.entries()) {
    if (!Array.isArray(row) || row.length !== profile.width) fail('INVALID_TERRAIN', '/terrain/' + y, 'Supply all 240 ground cells.');
    for (const [x, kind] of row.entries()) {
      if (!profile.terrain.includes(kind)) fail('UNBOUND_TERRAIN', `/terrain/${y}/${x}`, 'This ground surface has no Farmyard binding.');
      if (kind === 'crate') boxes++;
    }
  }
  return boxes;
}

function checkEdges(edges, crates) {
  if (!record(edges)) fail('INVALID_EDGES', '/edges', 'Supply the ground edge record.');
  let doors = 0;
  const rows = Object.entries(edges);
  if (rows.length + crates > profile.maximumBoxes) {
    fail('GEOMETRY_LIMIT', '/edges', 'The playtest supports at most 8192 ground edges and crate cells combined.');
  }
  for (const [key, kind] of rows) {
    const match = /^[es]:(0|[1-9]\d{0,2}):(0|[1-9]\d{0,2})$/.exec(key);
    if (!match || !cell(Number(match[1]), profile.width) || !cell(Number(match[2]), profile.height)) {
      fail('UNBOUND_EDGE', '/edges/' + key, 'Use an east or south ground edge with an in-map cell anchor.');
    }
    if (!profile.edges.includes(kind)) fail('UNBOUND_EDGE', '/edges/' + key, 'This edge type has no Farmyard binding.');
    if (kind !== 'wall' && ++doors > profile.maximumDoors) {
      fail('DOOR_LIMIT', '/edges/' + key, 'The playtest supports at most 256 door leaves.');
    }
  }
}

export function preflightFarmyardPlaytest(handoff) {
  if (!record(handoff)) fail('INVALID_HANDOFF', '/open', 'Supply the Workshop JSON and map contract.');
  const {json, contract} = handoff;
  if (contract?.format !== 'aft-map-v2' || contract.width !== profile.width || contract.height !== profile.height ||
      contract.metresPerTile !== profile.metresPerTile || !Array.isArray(contract.groundAxes) ||
      contract.groundAxes.length !== 2 || contract.groundAxes[0] !== 'x' || contract.groundAxes[1] !== 'y') {
    fail('UNSUPPORTED_CONTRACT', '/contract', 'Send a 240 × 240 AFT v2 Workshop map with one metre per cell.');
  }
  if (typeof json !== 'string' || json.length > 4_000_000) {
    fail('INVALID_MAP_JSON', '/json', 'Send a Workshop JSON export of at most 4 million characters.');
  }
  let map;
  try { map = JSON.parse(json); }
  catch (cause) { fail('INVALID_MAP_JSON', '/json', 'The Workshop export is malformed JSON.', {cause}); }
  if (!record(map) || map.version !== 2 || map.width !== profile.width || map.height !== profile.height ||
      !Number.isInteger(map.levels) || map.levels < 3 || map.levels > 6) {
    fail('UNSUPPORTED_MAP', '/json', 'Use a full AFT v2 map with 240 × 240 ground cells and three to six declared levels.');
  }
  if (Object.hasOwn(map, 'foliage')) {
    if (!record(map.foliage)) fail('INVALID_MAP', '/foliage', 'Supply a valid foliage record.');
    const cells = Object.keys(map.foliage).length;
    if (cells) fail('UNBOUND_FOLIAGE', '/foliage', `Painted foliage needs a Farmyard binding (${cells} cells).`, {details: {cells}});
  }
  for (const key of Object.keys(map)) {
    if (!mapFields.has(key)) fail('UNBOUND_MAP_FIELD', '/' + key, 'This map field has no Farmyard playtest binding.');
  }
  if (!Array.isArray(map.upper) || map.upper.length !== map.levels - 1 ||
      map.upper.some(layer => !record(layer) || Object.keys(layer).length)) {
    fail('UNBOUND_UPPER_LEVEL', '/upper', 'Keep all levels above ground empty for this playtest.');
  }
  for (const key of ['stairs', 'props', 'guards', 'climbs', 'canopies']) {
    if (['climbs', 'canopies'].includes(key) && !Object.hasOwn(map, key)) continue;
    if (!Array.isArray(map[key]) || map[key].length) fail('UNBOUND_MAP_FIELD', '/' + key, 'This playtest requires an empty ' + key + ' list.');
  }
  if (Object.hasOwn(map, 'edgeLocks') && (!record(map.edgeLocks) || Object.keys(map.edgeLocks).length)) {
    fail('UNBOUND_MAP_FIELD', '/edgeLocks', 'Door locks need a separate Farmyard binding.');
  }
  checkEdges(map.edges, checkTerrain(map));
  if (!Array.isArray(map.starts) || map.starts.length !== 4 || !Array.isArray(map.exits) || map.exits.length !== 1) {
    fail('INVALID_MARKERS', '/starts', 'Place four Workshop squad starts and one travel marker.');
  }
  const markers = map.starts.map((point, i) => marker(point, '/starts/' + i, i === 0 ? 'solo-spawn' : 'retained-squad-marker'));
  markers.push(marker(map.exits[0], '/exits/0', 'retained-travel-marker'));
  const errors = validateMap(map);
  if (errors.length) fail('INVALID_MAP', '/json', errors[0], {details: errors});
  return {authoredMap: map, sourceJSON: json, markers: Object.freeze(markers)};
}
