// Round 3: what the handoff-state mutants G08-G10 do, measured on createGameHandoff directly.
// onChange records the state the page's refreshHandoff would read at that moment
// (handoff.hasGameAdapter), which the module test does not: it only counts calls.
// Each mutated module is a sibling copy of apps/editor/game-handoff.js, removed in a finally.
// Usage: node state-witness.mjs <pristine-root>
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root = path.resolve(process.argv[2]), real = path.join(root, 'apps/editor/game-handoff.js'), text = fs.readFileSync(real, 'utf8');
const core = await import(pathToFileURL(path.join(root, 'packages/map-core/index.js')));
const MUTANTS = [
  ['pristine', null, null],
  ['G08 a refused connect drops the current host', 'host = checkGameAdapter(adapter); onChange();', 'host = null; host = checkGameAdapter(adapter); onChange();'],
  ['G09 connect refreshes before the host is set', 'host = checkGameAdapter(adapter); onChange();', 'checkGameAdapter(adapter); onChange(); host = adapter;'],
  ['G10 disconnect refreshes before the host is cleared', 'if (host === adapter) {host = null; onChange();}', 'if (host === adapter) {onChange(); host = null;}']
];
let feature = JSON.parse(core.createMapDocument('Witness yard').export());
feature = core.placeBuilding(feature, {asset: 'violet-bay-house', x: 100, y: 60, turns: 1, clearance: 2}).map;
const json = JSON.stringify(feature), features = core.requiredMapFeatures(feature);
const out = {};
for (const [id, find, replace] of MUTANTS) {
  let mod;
  if (!find) mod = await import(pathToFileURL(real));
  else {
    if (text.split(find).length !== 2) throw Error('needle ' + id);
    const file = path.join(root, 'apps/editor/game-handoff.' + id.split(' ')[0] + '.js');
    try { fs.writeFileSync(file, text.replace(find, replace)); mod = await import(pathToFileURL(file).href + '?' + id.split(' ')[0]); } finally { fs.rmSync(file, {force: true}); }
  }
  const seen = [];
  const handoff = mod.createGameHandoff({exportMap: () => json, onChange: () => seen.push(handoff.hasGameAdapter ? 'connected' : 'none')});
  const calls = [], hostA = {features, openMap() { calls.push('A'); return 'A'; }};
  const log = [];
  const disconnect = handoff.connectGame(hostA); log.push('connect A: refresh saw ' + seen.at(-1) + ', hasGameAdapter ' + handoff.hasGameAdapter);
  try { handoff.connectGame({features: []}); log.push('malformed connect accepted'); } catch (error) { log.push('malformed connect refused: ' + error.message); }
  log.push('after refused connect: hasGameAdapter ' + handoff.hasGameAdapter + ', refreshes ' + seen.length);
  try { log.push('send after refused connect: ' + handoff.sendToGame()); } catch (error) { log.push('send after refused connect THROWS ' + error.message); }
  disconnect(); log.push('disconnect A: refresh saw ' + seen.at(-1) + ', hasGameAdapter ' + handoff.hasGameAdapter);
  out[id] = log;
}
console.log(JSON.stringify(out, null, 1));
