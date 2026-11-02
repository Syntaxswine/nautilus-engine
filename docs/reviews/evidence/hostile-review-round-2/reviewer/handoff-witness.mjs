// What H02 (openMap called without its host) and H05 (null adapter unchecked) do to a real call.
// Applies each to the pristine copy's game-handoff.js in turn and restores in a finally.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = path.resolve(process.argv[2]), file = path.join(root, 'apps/editor/game-handoff.js'), original = fs.readFileSync(file);
const M = {
  pristine: [],
  H02: [['  return adapter.openMap({json: document.export(), contract: MAP_CONTRACT});', '  const open = adapter.openMap; return open({json: document.export(), contract: MAP_CONTRACT});']],
  H05: [["if (!adapter || typeof adapter.openMap !== 'function')", "if (typeof adapter.openMap !== 'function')"]],
};
const probe = `
import {createMapDocument} from './packages/map-core/index.js';
import {checkGameAdapter, sendMapToGame} from './apps/editor/game-handoff.js';
class Host { constructor() { this.received = []; this.features = []; } openMap(handoff) { this.received.push(handoff); return 'opened ' + this.received.length; } }
const out = {};
try { out.classHost = sendMapToGame(createMapDocument('Witness').export(), new Host()); } catch (e) { out.classHost = e.constructor.name + ': ' + e.message; }
for (const v of [null, undefined]) { try { checkGameAdapter(v); out['check ' + v] = 'accepted'; } catch (e) { out['check ' + v] = e.constructor.name + ': ' + e.message; } }
console.log(JSON.stringify(out));`;
const results = {};
for (const [id, edits] of Object.entries(M)) {
  try {
    let text = original.toString('utf8');
    for (const [find, replace] of edits) { if (text.split(find).length !== 2) throw Error('needle'); text = text.replace(find, replace); }
    fs.writeFileSync(file, text);
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {cwd: root, encoding: 'utf8'});
    results[id] = r.status === 0 ? JSON.parse(r.stdout) : r.stderr.slice(0, 300);
  } finally { fs.writeFileSync(file, original); }
}
results.restored = fs.readFileSync(file).equals(original);
console.log(JSON.stringify(results, null, 1));
