import * as legacy from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
import {rotateSceneryBlock as rotateLegacy} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/scenery-block-rotation.js';
import {wallRunErrors, wallRunsOf, wallsInSector, shiftWallRun} from './wall-runs.js';
export {blockCanvas, isBlock} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';
function setRuns(map, runs, extension = map.wallRuns) {if (runs.length) map.wallRuns = {...extension, version: 1, segments: runs}; else delete map.wallRuns;return map;}
export function extractBlock(map, sx = 0, sy = 0) {
  const block = legacy.extractBlock(map, sx, sy), runs = wallsInSector(map, sx, sy).map(run => shiftWallRun(run, -sx * 24, -sy * 24));
  return setRuns(block, runs, map.wallRuns);
}
export function validateBlock(block) {legacy.validateBlock(block);const errors = wallRunErrors(block, 24);if (errors.length) throw Error(errors.join(' '));return block;}
export function applyData(map, block, x, y, remap = false) {
  const errors = wallRunErrors(block, 24);if (errors.length) throw Error(errors.join(' '));
  legacy.applyData(map, block, x, y, remap);
  const ids = new Set(wallRunsOf(map).map(r => r.id)), shifted = wallRunsOf(block).map(r => {
    let id = remap ? `s${x / 24}-${y / 24}:${r.id.replace(/^s\d+-\d+:/, '')}` : r.id, i = 1;
    const base = id;while (ids.has(id)) id = base + '.' + i++;ids.add(id);return shiftWallRun(r, x, y, id);
  });
  setRuns(map, [...wallRunsOf(map), ...shifted], map.wallRuns || block.wallRuns);
}
export function openBlock(block) {validateBlock(block);return setRuns(legacy.openBlock(block), structuredClone(wallRunsOf(block)), block.wallRuns);}
export function placeBlock(map, block, sx, sy) {
  validateBlock(block);const removed = new Set(wallsInSector(map, sx, sy).map(r => r.id)), out = legacy.placeBlock(map, block, sx, sy);
  const runs = structuredClone(wallRunsOf(map).filter(r => !removed.has(r.id))), ids = new Set(runs.map(r => r.id));
  for (const run of wallRunsOf(block)) {const shifted = shiftWallRun(run, sx * 24, sy * 24, `s${sx}-${sy}:${run.id.replace(/^s\d+-\d+:/, '')}`);let i = 1;const base = shifted.id;while (ids.has(shifted.id)) shifted.id = base + '.' + i++;ids.add(shifted.id);runs.push(shifted);}
  return setRuns(out, runs, map.wallRuns || block.wallRuns);
}
export function rotateSceneryBlock(block) {
  validateBlock(block);const out = rotateLegacy(block);
  return setRuns(out, wallRunsOf(block).map(run => ({...structuredClone(run), a: [23 - run.a[1], run.a[0]], b: [23 - run.b[1], run.b[0]]})), block.wallRuns);
}
