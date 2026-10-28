import {parseMap, requiredMapFeatures, WALL_KIT} from '../../map-core/index.js';

export const TINDERBOX_ADAPTER = Object.freeze({
  id: 'nautilus.tinderbox.flat-yard', version: '1.0.0',
  consumerCommit: '8a8405681614662a92f9b98fb9b9600bd06d3ad1',
  schema: 'nautilus.tinderbox.scene', schemaVersion: 1,
  maxWorldMetres: 64, maxWallModules: 128, maxTerrainPatches: 512,
  playerRadius: 0.56, supportedFeatures: Object.freeze(['nautilus-wall-runs-v1'])
});
export const TINDERBOX_TERRAIN_MATERIALS = Object.freeze({
  yard: 'paving', floor: 'paving', 'ground-concrete': 'paving',
  'ground-asphalt': 'paving', 'ground-tiles': 'paving',
  'ground-grass': 'grass', 'ground-wood-planks': 'wood'
});
export const TINDERBOX_WALL_MATERIALS = Object.freeze({wood: 'wood', brick: 'masonry', concrete: 'masonry'});
const MAX_JSON_BYTES = 5000000;
const MAP_KEYS = ['version', 'width', 'height', 'levels', 'name', 'terrain', 'upper', 'edges', 'stairs', 'climbs', 'props', 'starts', 'guards', 'exits', 'wallRuns', 'metadata'];
const MARKER_KEYS = ['x', 'y', 'z', 'heading', 'species', 'weapon', 'outfit', 'character'];
const CHARACTER_MARKER_KEYS = ['id', 'displayName', 'scriptId', 'category', 'faction', 'attitude', 'combatBehavior', 'canTalk', 'dialogueRef', 'canSell', 'shopInventoryRef', 'shopPricingRef', 'references', 'model', 'visualVariant'];

export class TinderboxCompatibilityError extends Error {
  constructor(code, path, message, action) {
    super(message); this.name = 'TinderboxCompatibilityError'; this.code = code; this.path = path; this.action = action;
  }
  toJSON() { return {code: this.code, path: this.path, message: this.message, action: this.action}; }
}
function fail(code, path, message, action = 'Keep the portable map in Nautilus and update the adapter before using this content in Tinderbox.') {
  throw new TinderboxCompatibilityError(code, path, message, action);
}
function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('INVALID_DATA', path, `Expected an object at ${path}.`);
}
function keys(value, allowed, path, code = 'UNSUPPORTED_FIELD') {
  record(value, path);
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(code, `${path}.${key}`, `The Tinderbox adapter does not support ${path}.${key}.`);
}
function jsonData(value, path = '$', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) return;
  if (!value || typeof value !== 'object' || ancestors.has(value) || !Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('INVALID_JSON_DATA', path, 'Pass finite, acyclic plain JSON data.');
  if (ancestors.size >= 64) fail('INVALID_JSON_DATA', path, 'Portable adapter data must not exceed 64 nesting levels.');
  const own = Reflect.ownKeys(value);
  if (own.some(key => typeof key !== 'string' || !(Array.isArray(value) && key === 'length') && (!Object.getOwnPropertyDescriptor(value, key).enumerable || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')))) fail('INVALID_JSON_DATA', path, 'Portable adapter data cannot contain symbols, accessors or hidden fields.');
  if (Array.isArray(value) && own.some(key => key !== 'length' && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length))) fail('INVALID_JSON_DATA', path, 'Portable arrays cannot contain extra named properties.');
  ancestors.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) jsonData(value[i], `${path}[${i}]`, ancestors);
  } else {
    for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) fail('INVALID_JSON_DATA', `${path}.${key}`, 'Prototype-related fields are not portable adapter data.');
      jsonData(value[key], `${path}.${key}`, ancestors);
    }
  }
  ancestors.delete(value);
}
function readJSON(input) {
  if (typeof input === 'string') {
    if (input.length > MAX_JSON_BYTES || new TextEncoder().encode(input).length > MAX_JSON_BYTES) fail('SAVE_TOO_LARGE', '$', 'The adapter JSON limit is 5 MB of UTF-8.');
    try { input = JSON.parse(input); } catch { fail('INVALID_JSON', '$', 'The adapter input is not valid JSON.'); }
  }
  jsonData(input);
  const text = JSON.stringify(input);
  if (text.length > MAX_JSON_BYTES || new TextEncoder().encode(text).length > MAX_JSON_BYTES) fail('SAVE_TOO_LARGE', '$', 'The adapter JSON limit is 5 MB of UTF-8.');
  return JSON.parse(text);
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function policyOf(input) {
  keys(input, ['region', 'playerStart', 'markerPolicy', 'outsidePolicy', 'seed'], 'policy', 'INVALID_POLICY');
  keys(input.region, ['x', 'y', 'width', 'height'], 'policy.region', 'INVALID_POLICY');
  const r = input.region;
  if (![r.x, r.y, r.width, r.height].every(Number.isInteger) || r.x < 0 || r.y < 0 || r.width < 2 || r.height < 2 || r.width > 64 || r.height > 64 || r.x + r.width > 240 || r.y + r.height > 240) fail('INVALID_POLICY', 'policy.region', 'Choose an explicit 2–64 metre tile rectangle inside the 240 metre Nautilus map.');
  if (!Number.isInteger(input.playerStart) || input.playerStart < 0 || input.playerStart > 3) fail('INVALID_POLICY', 'policy.playerStart', 'Select exactly one squad-start index, 0–3, for Tinderbox’s controlled bear.');
  if (input.markerPolicy !== 'select-player-preserve-markers') fail('INVALID_POLICY', 'policy.markerPolicy', 'Explicitly select select-player-preserve-markers: remaining starts and exits are markers, without squad or exit gameplay.');
  if (input.outsidePolicy !== 'require-unmodified-yard') fail('INVALID_POLICY', 'policy.outsidePolicy', 'Explicitly select require-unmodified-yard: no authored content may be cropped away.');
  const seed = input.seed ?? 1947;
  if (!Number.isSafeInteger(seed)) fail('INVALID_POLICY', 'policy.seed', 'Tinderbox requires a safe integer seed.');
  return {region: {...r}, playerStart: input.playerStart, markerPolicy: input.markerPolicy, outsidePolicy: input.outsidePolicy, seed};
}
function mapOf(input) {
  const source = readJSON(input);
  keys(source, MAP_KEYS, 'map', 'UNSUPPORTED_MAP_FIELD');
  if (source.version !== 2) fail('UNSUPPORTED_MAP_SCHEMA', 'map.version', 'This adapter accepts aft-map-v2 only; migrate legacy maps through the public Nautilus persistence API first.');
  let map;
  try { map = parseMap(JSON.stringify(source)); }
  catch (error) { fail('INVALID_MAP', 'map', error.message, 'Correct the map’s validation errors in Nautilus before exporting it.'); }
  for (const feature of requiredMapFeatures(map)) if (!TINDERBOX_ADAPTER.supportedFeatures.includes(feature)) fail('UNSUPPORTED_CAPABILITY', 'map', `Tinderbox flat-yard does not support ${feature}.`);
  for (const name of ['guards', 'props', 'stairs', 'climbs']) if (map[name]?.length) fail('UNSUPPORTED_MAP_CONTENT', `map.${name}`, `Tinderbox flat-yard cannot translate ${name}.`);
  if (map.upper.some(layer => Object.keys(layer).length)) fail('UNSUPPORTED_MAP_CONTENT', 'map.upper', 'Tinderbox flat-yard cannot translate upper-floor geometry.');
  if (Object.keys(map.edges).length) fail('UNSUPPORTED_MAP_CONTENT', 'map.edges', 'Tinderbox flat-yard accepts wallRuns only; grid barriers, gates and locks need another adapter profile.');
  for (const name of ['starts', 'exits']) for (const [i, point] of map[name].entries()) {
    keys(point, MARKER_KEYS, `map.${name}[${i}]`, 'UNSUPPORTED_MARKER_FIELD');
    if (point.character !== undefined) {
      keys(point.character, CHARACTER_MARKER_KEYS, `map.${name}[${i}].character`, 'UNSUPPORTED_MARKER_FIELD');
      for (const [n, link] of (point.character.references || []).entries()) keys(link, ['role', 'targetId'], `map.${name}[${i}].character.references[${n}]`, 'UNSUPPORTED_MARKER_FIELD');
    }
    if ((point.z ?? 0) !== 0) fail('UNSUPPORTED_MAP_CONTENT', `map.${name}[${i}].z`, 'Tinderbox markers must lie on ground level.');
  }
  if (map.wallRuns) {
    keys(map.wallRuns, ['version', 'segments'], 'map.wallRuns');
    for (const [i, wall] of map.wallRuns.segments.entries()) {
      keys(wall, ['id', 'a', 'b', 'z', 'stories', 'material'], `map.wallRuns.segments[${i}]`);
      if (wall.z !== 0 || wall.stories !== 1 || wall.a[0] !== wall.b[0] && wall.a[1] !== wall.b[1]) fail('UNSUPPORTED_WALL', `map.wallRuns.segments[${i}]`, 'Tinderbox flat-yard requires axis-aligned, single-story wall runs at z=0.');
    }
    if (map.wallRuns.segments.length > TINDERBOX_ADAPTER.maxWallModules) fail('MODULE_BUDGET', 'map.wallRuns.segments', 'Pinned Tinderbox accepts at most 128 exterior modules.');
  }
  return map;
}
function buildPatches(map, region) {
  const patches = [], active = new Map();
  for (let y = region.y; y < region.y + region.height; y++) {
    const row = new Map();
    for (let x = region.x; x < region.x + region.width;) {
      const material = TINDERBOX_TERRAIN_MATERIALS[map.terrain[y][x]], start = x++;
      while (x < region.x + region.width && TINDERBOX_TERRAIN_MATERIALS[map.terrain[y][x]] === material) x++;
      if (material === 'paving') continue;
      const key = `${start}:${x - start}:${material}`, previous = active.get(key);
      const patch = previous || {x: start - region.x, y: y - region.y, width: x - start, depth: 0, material};
      if (!previous) patches.push(patch);
      patch.depth++; row.set(key, patch);
    }
    active.clear(); for (const [key, patch] of row) active.set(key, patch);
  }
  if (patches.length > TINDERBOX_ADAPTER.maxTerrainPatches) fail('PATCH_BUDGET', 'map.terrain', 'The flat-yard profile allows at most 512 merged terrain patches.');
  return patches;
}
function project(map, policy) {
  const r = policy.region, insideTile = (x, y) => x >= r.x && y >= r.y && x < r.x + r.width && y < r.y + r.height;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const terrain = map.terrain[y][x];
    if (!insideTile(x, y)) {
      if (terrain !== 'yard') fail('CROPPED_CONTENT', `map.terrain[${y}][${x}]`, 'The selected region would discard authored terrain. Enlarge or move the region, or keep this map in Nautilus.');
    } else if (!Object.hasOwn(TINDERBOX_TERRAIN_MATERIALS, terrain)) fail('UNSUPPORTED_TERRAIN', `map.terrain[${y}][${x}]`, `Tinderbox flat-yard cannot translate terrain ${terrain}.`);
  }
  const markers = name => map[name].map((point, i) => {
    if (!insideTile(point.x, point.y)) fail('CROPPED_MARKER', `map.${name}[${i}]`, 'Every squad start and exit must fit inside the explicit Tinderbox region.');
    return {id: `${name === 'starts' ? 'start' : 'exit'}-${i + 1}`, x: point.x - r.x + 0.5, y: point.y - r.y + 0.5, z: 0, source: structuredClone(point)};
  });
  const starts = markers('starts'), exits = markers('exits');
  const modules = (map.wallRuns?.segments || []).map((wall, i) => {
    const dx = wall.b[0] - wall.a[0], dy = wall.b[1] - wall.a[1];
    const width = Math.hypot(dx, dy), depth = WALL_KIT.thickness;
    const x = (wall.a[0] + wall.b[0]) / 2 - r.x + 0.5, y = (wall.a[1] + wall.b[1]) / 2 - r.y + 0.5;
    const halfX = (dx ? width : depth) / 2, halfY = (dy ? width : depth) / 2;
    if (x - halfX < 0 || y - halfY < 0 || x + halfX > r.width || y + halfY > r.height) fail('CROPPED_WALL', `map.wallRuns.segments[${i}]`, 'The complete wall thickness and both endpoints must fit inside the Tinderbox region.');
    const quarter = dx > 0 ? 0 : dy > 0 ? 1 : dx < 0 ? 2 : 3;
    return {id: 'nautilus-wall:' + wall.id, form: 'wall', x, y, width, depth, height: WALL_KIT.height,
      heading: quarter * Math.PI / 2, physicalMaterial: TINDERBOX_WALL_MATERIALS[wall.material],
      skinSlots: {facade: wall.material === 'wood' ? 'inherited-wood' : wall.material === 'brick' ? 'inherited-brick' : 'inherited-plaster', trim: 'inherited-cream', door: 'inherited-wood', roof: 'inherited-roof'},
      sourceRefs: ['nautilus:wall-run:' + wall.id, 'nautilus:material:' + wall.material, TINDERBOX_ADAPTER.id + '@' + TINDERBOX_ADAPTER.version]};
  });
  const player = starts[policy.playerStart], radius = TINDERBOX_ADAPTER.playerRadius;
  if (player.x < radius || player.y < radius || player.x > r.width - radius || player.y > r.height - radius || modules.some(m => {
    const swap = Math.round(m.heading / (Math.PI / 2)) % 2;
    return Math.hypot(Math.max(Math.abs(player.x - m.x) - (swap ? m.depth : m.width) / 2, 0), Math.max(Math.abs(player.y - m.y) - (swap ? m.width : m.depth) / 2, 0)) < radius - 1e-10;
  })) fail('PLAYER_CLEARANCE', `map.starts[${policy.playerStart}]`, 'The selected bear spawn needs Tinderbox’s 0.56 metre disc clearance from world bounds and walls.');
  return {id: 'nautilus-tinderbox-flat-v1', width: r.width, height: r.height, tileSize: 1, fireCellSize: 0.5,
    player: {x: player.x, y: player.y, tool: 'matches'}, patches: buildPatches(map, r), modules, obstacles: [], actors: [],
    nautilus: {schema: 'aft-map-v2', sourceName: map.name, region: {...r}, coordinateOffset: {x: 0.5 - r.x, y: 0.5 - r.y},
      selectedStart: player.id, markerPolicy: policy.markerPolicy, outsidePolicy: policy.outsidePolicy, starts, exits}};
}

/** Compile data for a real, pinned Tinderbox scenario. No game runtime is imported. */
export function createTinderboxScene(input, options) {
  const map = mapOf(input), policy = policyOf(readJSON(options));
  return {schema: TINDERBOX_ADAPTER.schema, schemaVersion: TINDERBOX_ADAPTER.schemaVersion,
    adapter: {id: TINDERBOX_ADAPTER.id, version: TINDERBOX_ADAPTER.version, consumerCommit: TINDERBOX_ADAPTER.consumerCommit},
    policy, portableMap: map, scenario: project(map, policy)};
}

/** Load checks that the saved scenario is exactly the projection of its sidecar. */
export function loadTinderboxScene(input) {
  const save = readJSON(input);
  keys(save, ['schema', 'schemaVersion', 'adapter', 'policy', 'portableMap', 'scenario'], 'save');
  if (save.schema !== TINDERBOX_ADAPTER.schema || save.schemaVersion !== TINDERBOX_ADAPTER.schemaVersion) fail('UNSUPPORTED_SAVE_SCHEMA', 'save.schemaVersion', 'Unsupported Tinderbox adapter save schema. Older readers must not reinterpret future saves.');
  const expected = createTinderboxScene(save.portableMap, save.policy);
  if (canonical(save.adapter) !== canonical(expected.adapter)) fail('UNSUPPORTED_ADAPTER_VERSION', 'save.adapter', 'This save targets a different adapter or Tinderbox source pin.');
  if (canonical(save.scenario) !== canonical(expected.scenario)) fail('SCENARIO_MISMATCH', 'save.scenario', 'Saved Tinderbox scenario disagrees with its Nautilus map or policy.', 'Re-export the portable map with the matching adapter; do not hand-edit the derived scenario.');
  return expected;
}
export function saveTinderboxScene(input) { return canonical(loadTinderboxScene(input)) + '\n'; }
export function exportNautilusMap(input) { return structuredClone(loadTinderboxScene(input).portableMap); }
