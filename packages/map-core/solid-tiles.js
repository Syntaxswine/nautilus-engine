import {GROUNDS, propCells} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';
import {passable, blockedEdge, roofTop} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {foliageKey} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-data.js';
import {WALL_KIT, wallRunsIntersect} from './wall-runs.js';
import {buildingLot} from '../prefab-core/index.js';

export const SOLID_TILE_FEATURE = 'nautilus-solid-ground-tiles-v1';
export const SOLID_TILE_STEPS = 8;
export const SOLID_TILE_LIMIT = 4096;
export const SOLID_TILE_SKINS = Object.freeze([...GROUNDS]);
const skins = new Set(SOLID_TILE_SKINS);
const ground = new Set(['yard', 'floor', 'woodland', ...SOLID_TILE_SKINS]);
const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const keyAt = (x, y) => x + ',' + y;
export const solidTileCells = map => map?.solidTiles?.cells || {};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const inside = (x, y, size) => [x, y].every(n => Number.isInteger(n) && n >= 0 && n < size);
const isStep = n => Number.isInteger(n) && n >= 1 && n <= SOLID_TILE_STEPS;
const stepMm = Math.round(WALL_KIT.floorSpacing * 1000) / SOLID_TILE_STEPS;
export const solidTileHeightM = steps => steps * stepMm / 1000;

export function solidTileAt(map, x, y) {
  const tile = solidTileCells(map)[keyAt(x, y)];
  return tile ? {x, y, steps: tile[0], skin: tile[1], heightM: solidTileHeightM(tile[0])} : null;
}

export function solidTileErrors(map, size = map?.kind === 'red-shift-block' ? 24 : 240) {
  const data = map?.solidTiles;
  if (data === undefined) return [];
  if (!record(data) || data.version !== 1 || Object.keys(data).length !== 2 || !record(data.cells))
    return ['Expected solidTiles version 1 with a cells object.'];
  const cells = Object.entries(data.cells);
  if (!cells.length || cells.length > SOLID_TILE_LIMIT)
    return ['Keep between 1 and ' + SOLID_TILE_LIMIT + ' solid block cells, or omit the empty layer.'];
  for (const [key, tile] of cells) {
    const [x, y] = key.split(',').map(Number);
    if (key !== keyAt(x, y) || !inside(x, y, size) || !Array.isArray(tile) || tile.length !== 2 || !isStep(tile[0]) || !skins.has(tile[1]))
      return ['Invalid solid block at ' + key + '. Choose a cell in bounds, 1–8 height steps and a ground skin.'];
  }

  const occupied = new Set();
  const mark = point => { if ((point.z ?? 0) === 0) occupied.add(keyAt(point.x, point.y)); };
  for (const prop of map.props || []) for (const point of propCells(prop)) mark(point);
  for (const point of [...(map.starts || []), ...(map.guards || []), ...(map.exits || []), ...(map.stairs || []),
    ...(map.climbs || []).flatMap(p => [p, roofTop(p)]), ...(map.guards || []).flatMap(p => p.patrol || [])]) mark(point);
  const lots = (map.buildingPrefabs?.instances || []).map(instance => buildingLot(instance));
  for (const [key, [steps]] of cells) {
    const [x, y] = key.split(',').map(Number);
    if (!ground.has(map.terrain?.[y]?.[x]) || map.landPaint?.[key])
      return ['Solid blocks need dry, unraised ground at ' + key + '.'];
    if (occupied.has(key) || map.foliage?.[foliageKey(x, y)] ||
        lots.some(lot => x >= lot.x && x < lot.x + lot.width && y >= lot.y && y < lot.y + lot.depth))
      return ['A solid block at ' + key + ' would bury a marker, object, plant, building or access point. Clear the cell first.'];
    if (steps === SOLID_TILE_STEPS && map.upper?.[0]?.[key] && map.upper[0][key] !== 'void')
      return ['The full-height solid block at ' + key + ' overlaps the first upper floor. Lower it or clear the floor.'];
  }
  return [];
}

export function assertSolidTiles(map, size) {
  const [error] = solidTileErrors(map, size);
  if (error) throw Error(error);
  return map;
}

export function setSolidTiles(target, cells) {
  if (Object.keys(cells).length) target.solidTiles = {version: 1, cells: structuredClone(cells)};
  else delete target.solidTiles;
  return target;
}

// Only a higher column owns the exposed riser on a shared edge.
export function solidTileGeometry(map) {
  const cells = solidTileCells(map);
  return Object.keys(cells).map(key => {
    const [x, y] = key.split(',').map(Number);
    const tile = solidTileAt(map, x, y);
    const h = tile.heightM;
    const sides = directions.flatMap(([dx, dy]) => {
      const lower = cells[keyAt(x + dx, y + dy)]?.[0] || 0;
      return lower < tile.steps ? [{dx, dy, minH: solidTileHeightM(lower), maxH: h}] : [];
    });
    return {...tile, bounds: {min: {x: x - .5, y: y - .5, h: 0}, max: {x: x + .5, y: y + .5, h}}, sides};
  });
}

export function previewSolidTiles(map, command, size) {
  const {start, end = start, options = {}, tool} = command;
  if (![start, end].every(p => p && inside(p.x, p.y, size) && (p.z ?? 0) === 0))
    throw Error('Use Solid block on the ground layer inside the map or reusable block.');
  const remove = tool === 'erase-solid-block';
  const {solidSteps, groundKind} = options;
  if (!remove && (!isStep(solidSteps) || !skins.has(groundKind))) throw Error('Choose 1–8 height steps and a ground skin.');
  const x0 = Math.min(start.x, end.x), x1 = Math.max(start.x, end.x);
  const y0 = Math.min(start.y, end.y), y1 = Math.max(start.y, end.y);
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 256) throw Error('Edit at most 256 solid block cells per stroke.');
  const data = {...solidTileCells(map)}, cells = [];
  let changed = false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const key = keyAt(x, y), previous = data[key];
    cells.push({x, y, z: 0});
    if (remove) {
      if (previous) { delete data[key]; changed = true; }
    } else if (previous?.[0] !== solidSteps || previous[1] !== groundKind) {
      data[key] = [solidSteps, groundKind];
      changed = true;
    }
  }
  if (!changed) throw Error(remove ? 'There are no solid blocks in that stroke.' : 'These cells already use that height and skin.');
  const candidate = setSolidTiles(structuredClone(map), data);
  return {ok: true, map: candidate, cells, edges: [], solidPreview: {remove}};
}

// Use the same host assessment for stairs and for a one-eighth rise. That
// service owns full-body clearance, ordinary stair eligibility and costs.
// Inputs are cell centres on an already validated blueprint.
export function planSolidTileStep(map, from, to, assess) {
  if (typeof assess !== 'function') throw TypeError('Bind the host walk and stair assessment.');
  const size = map?.kind === 'red-shift-block' ? 24 : 240;
  const refuse = code => ({ok: false, code});
  if (![from, to].every(p => p && inside(p.x, p.y, size) && (p.z ?? 0) === 0) ||
      Math.abs(from.x - to.x) + Math.abs(from.y - to.y) !== 1) return refuse('NOT_ADJACENT');
  const a = solidTileAt(map, from.x, from.y), b = solidTileAt(map, to.x, to.y);
  if (!a && !b) return refuse('NO_SOLID_TILE');
  if (![from, to].every(p => !map.landPaint?.[keyAt(p.x, p.y)] && passable(map, p))) return refuse('NO_SUPPORT');
  if (blockedEdge(map, from, to)) return refuse('BLOCKED_EDGE');
  const difference = (b?.steps || 0) - (a?.steps || 0);
  if (Math.abs(difference) > 1) return refuse('STEP_TOO_HIGH');
  const start = {x: from.x, y: from.y, h: a?.heightM || 0};
  const end = {x: to.x, y: to.y, h: b?.heightM || 0};
  // Sweep horizontally at the higher top; a real host tests the vertical
  // segment too. This keeps the route out of the column's solid riser.
  const path = [start];
  if (difference > 0) path.push({...start, h: end.h});
  if (difference < 0) path.push({...end, h: start.h});
  path.push(end);
  if (path.slice(1).some((p, i) => wallRunsIntersect(map, {...path[i], h: path[i].h + .8}, {...p, h: p.h + .8})))
    return refuse('BLOCKED_EDGE');
  const route = {kind: difference ? 'stairs' : 'walk', from: start, to: end, path};
  const result = assess(structuredClone(route));
  if (!result?.ok) return refuse(result?.code || 'STAIR_ASSESSMENT_REFUSED');
  if (!Number.isFinite(result.cost) || result.cost < 0) throw TypeError('Host movement cost must be finite and nonnegative.');
  return {ok: true, ...route, cost: result.cost};
}
