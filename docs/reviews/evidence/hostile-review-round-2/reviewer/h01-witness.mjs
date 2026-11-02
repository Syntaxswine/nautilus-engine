// H01 (validation errors ignored): is a map that fails validate() handed to a capable host?
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = path.resolve(process.argv[2]), file = path.join(root, 'apps/editor/game-handoff.js'), original = fs.readFileSync(file);
const find = "  if (errors.length) throw Error(errors.join(' '));\n";
const probe = `
import {createMapDocument, engineManifest} from './packages/map-core/index.js';
import {sendMapToGame} from './apps/editor/game-handoff.js';
const map = JSON.parse(createMapDocument('Unreachable').export()); map.exits = [{x: 30, y: 30, z: 0}];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) map.terrain[30 + dy][30 + dx] = 'water';
let calls = 0; const host = {manifest: engineManifest(), openMap() { calls++; return 'opened'; }};
let outcome; try { outcome = sendMapToGame(JSON.stringify(map), host); } catch (e) { outcome = 'refused: ' + e.message; }
console.log(JSON.stringify({outcome, hostCalls: calls}));`;
const out = {};
for (const id of ['pristine', 'H01']) {
  try {
    if (id === 'H01') { const text = original.toString('utf8'); if (text.split(find).length !== 2) throw Error('needle'); fs.writeFileSync(file, text.replace(find, '\n')); }
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {cwd: root, encoding: 'utf8'});
    out[id] = r.status === 0 ? JSON.parse(r.stdout) : r.stderr.slice(0, 300);
  } finally { fs.writeFileSync(file, original); }
}
out.restored = fs.readFileSync(file).equals(original);
console.log(JSON.stringify(out, null, 1));
