// Verification probe for review finding M3: can a branch's own buildings be placed
// with that branch's own engine? Usage: node place-probe.mjs <repo-root> <asset-id>...
// 'albany-cottage' is the control: it ships at 12ad8c9 and must be accepted, or the
// probe cannot tell "unknown asset" apart from "this yard rejects everything".
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const [root, ...ids] = process.argv.slice(2);
const head = execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], {encoding: 'utf8'}).trim();
const core = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')).href);
const yard = core.blankMap('Structures');
yard.starts = [{x: 5, y: 5}, {x: 6, y: 5}, {x: 5, y: 6}, {x: 6, y: 6}];
yard.exits = [{x: 8, y: 8}];
const out = {head, registryCount: core.BUILDING_ASSETS.length};
for (const asset of ['albany-cottage', ...ids]) {
  try {
    const result = core.placeBuilding(yard, {asset, x: 30, y: 30, turns: 0, clearance: 2});
    out[asset] = result.map?.buildingPrefabs?.instances?.length ? 'placed' : 'returned without an instance';
  } catch (error) { out[asset] = 'REJECTED: ' + error.message.slice(0, 120); }
}
console.log(JSON.stringify(out, null, 2));
