// Could the Nautilus editor load the Administration Building today?
// 1. As a whole-building prefab: is its asset ID known to the fixed registry?
// 2. As walls: each of its five "nautilus-assembly" tiers is a 240 m, 6-layer
//    wallRuns fragment. Open each tier through the public map API in a blank map
//    and predict the editor's wall draw groups (wall-scene.js groups panels by
//    cut width x material). Tiers have vertical offsets the legacy map cannot hold.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {sandbox, donors, git, writeResult, nodeRig} from './lib/common.mjs';

const core = await import(pathToFileURL(path.join(sandbox, 'packages/map-core/index.js')).href);
const commit = '43337a33ddfe4dff6849654c827c56e1f24e1acc';
const assembly = JSON.parse(git(['show', commit + ':assets/art/exposition-administration/nautilus-assembly.json'], donors.tinderbox));
const blob = git(['rev-parse', commit + ':assets/art/exposition-administration/nautilus-assembly.json'], donors.tinderbox).trim();
const yard = () => { const m = core.blankMap('Administration tier'); m.levels = 6; m.upper = [...m.upper, ...Array.from({length: 3}, () => structuredClone(m.upper[0]))]; m.starts = [{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}, {x: 2, y: 2}]; m.exits = [{x: 3, y: 3}]; return m; };
let placeAsPrefab;
try { core.placeBuilding(yard(), {asset: assembly.assetId, x: 40, y: 40, turns: 0, clearance: 2}); placeAsPrefab = 'placed'; } catch (e) { placeAsPrefab = 'REJECTED: ' + e.message; }
const tiers = assembly.tiers.map((t) => {
  const m = yard(); m.wallRuns = structuredClone(t.map.wallRuns);
  let opened, panels = 0; const groups = new Set(), widths = new Set();
  try {
    const doc = core.openDocument(m); opened = {ok: true, validateErrors: doc.validate().slice(0, 2)};
    for (const run of core.wallRunsOf(doc.map)) for (const p of core.wallPanels(run)) { panels++; widths.add(p.size[0].toFixed(6)); groups.add(p.size[0].toFixed(6) + ':' + p.material); }
  } catch (e) { opened = {ok: false, error: e.message.slice(0, 160)}; }
  return {tier: t.id, levelOffset: t.levelOffset, verticalOffsetM: t.translation[1], runs: t.map.wallRuns.segments.length, opened, panels, distinctCutWidths: widths.size, predictedWallInstancedMeshes: groups.size};
});
writeResult('landmark-editor-load.json', {rig: nodeRig(), source: {commit, file: 'assets/art/exposition-administration/nautilus-assembly.json', blob, kind: assembly.kind, role: assembly.role, enginePin: assembly.enginePin},
  placeAsPrefab, tiers, note: 'Walls only: floors, glazing, ornament, dome and stairs live in the Tinderbox factory, and the legacy map has no vertical offset for tiers 1-4.'});
console.log(JSON.stringify({placeAsPrefab, tiers}, null, 1));
