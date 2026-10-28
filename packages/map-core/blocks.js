import * as legacy from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
import {rotateSceneryBlock as rotateLegacy} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/scenery-block-rotation.js';
import {validateMap} from './maps.js';
import {wallRunErrors, wallRunsOf, wallsInSector, shiftWallRun} from './wall-runs.js';
export {blockCanvas, isBlock} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
function setRuns(map, runs, extension = map.wallRuns) {
  const metadata = extension && Object.keys(extension).some(k => k !== 'version' && k !== 'segments');
  if (runs.length || metadata) map.wallRuns = {...structuredClone(extension), version: 1, segments: structuredClone(runs)};
  else delete map.wallRuns;
  return map;
}
function checkRuns(map, size) {
  const errors = wallRunErrors(map, size);
  if (errors.length) throw Error(errors.join(' '));
}
function checkMap(map) {
  const errors = validateMap(map, {connectivity: false});
  if (errors.length) throw Error(errors.join(' '));
  return map;
}
function equalMetadata(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && equalMetadata(a[k], b[k]));
}
function mergeExtensions(destination, source) {
  const merged = {...destination};
  for (const [key, value] of Object.entries(source || {})) {
    if (key === 'version' || key === 'segments') continue;
    if (Object.hasOwn(merged, key) && !equalMetadata(merged[key], value)) throw Error('Conflicting wall-run extension metadata for ' + key + '. Reconcile it before placing or generating blocks.');
    Object.defineProperty(merged, key, {value, enumerable: true, configurable: true, writable: true});
  }
  return merged;
}
function shiftedRuns(runs, x, y, existing, remap) {
  const ids = new Set(existing.map(r => r.id));
  return runs.map(run => {
    const base = remap ? `s${x / 24}-${y / 24}:${run.id.replace(/^s\d+-\d+:/, '')}` : run.id;
    let id = base.slice(0, 96), i = 1;
    while (ids.has(id)) {const suffix = '.' + i++; id = base.slice(0, 96 - suffix.length) + suffix;}
    ids.add(id);
    return shiftWallRun(run, x, y, id);
  });
}
export function extractBlock(map, sx = 0, sy = 0) {
  checkRuns(map);
  const block = legacy.extractBlock(map, sx, sy), runs = wallsInSector(map, sx, sy).map(run => shiftWallRun(run, -sx * 24, -sy * 24));
  return setRuns(block, runs, map.wallRuns);
}
export function validateBlock(block) {
  legacy.validateBlock(block); checkRuns(block, 24);
  if (wallRunsOf(block).length) checkMap(setRuns(legacy.openBlock(block), wallRunsOf(block), block.wallRuns));
  return block;
}
// Assembly retains the inherited no-feature path. Wall-bearing updates stage a
// candidate so wall-data/resource errors cannot partially alter a map. Callers
// validate their block catalog once and the completed assembly after setting its
// squad spawn; neither needs a full map-validation pass for every copied block.
export function applyData(map, block, x, y, remap = false) {
  if (map.wallRuns === undefined && block.wallRuns === undefined) return legacy.applyData(map, block, x, y, remap);
  checkRuns(block, 24); checkRuns(map);
  if (![x, y].every(n => Number.isInteger(n) && n >= 0 && n <= 216 && n % 24 === 0)) throw Error('Choose a block offset at a valid 24-metre map sector.');
  const previous = wallRunsOf(map), runs = [...previous, ...shiftedRuns(wallRunsOf(block), x, y, previous, remap)];
  const extension = mergeExtensions(map.wallRuns, block.wallRuns);
  checkRuns(setRuns({width: 240, levels: Math.max(map.levels, block.levels)}, runs, extension));
  const candidate = structuredClone(map);
  legacy.applyData(candidate, block, x, y, remap);
  setRuns(candidate, runs, extension);
  if (!Object.hasOwn(candidate, 'wallRuns')) delete map.wallRuns;
  Object.assign(map, candidate);
}
export function openBlock(block) {validateBlock(block);return setRuns(legacy.openBlock(block), wallRunsOf(block), block.wallRuns);}
export function placeBlock(map, block, sx, sy) {
  validateBlock(block); checkRuns(map);
  // Validate sector coordinates before inspecting or translating its geometry.
  if (![sx, sy].every(n => Number.isInteger(n) && n >= 0 && n <= 9)) throw Error('Choose a sector from 1 to 10.');
  const removed = new Set(wallsInSector(map, sx, sy).map(r => r.id));
  const retained = wallRunsOf(map).filter(r => !removed.has(r.id));
  const runs = [...retained, ...shiftedRuns(wallRunsOf(block), sx * 24, sy * 24, retained, true)];
  const extension = mergeExtensions(map.wallRuns, block.wallRuns);
  const out = setRuns(legacy.placeBlock(map, block, sx, sy), runs, extension);
  return checkMap(out);
}
export function rotateSceneryBlock(block) {
  validateBlock(block);const out = rotateLegacy(block), round = n => Math.round(n * 1e6) / 1e6;
  const runs = wallRunsOf(block).map(run => ({...structuredClone(run), a: [round(23 - run.a[1]), run.a[0]], b: [round(23 - run.b[1]), run.b[0]]}));
  return validateBlock(setRuns(out, runs, block.wallRuns));
}
