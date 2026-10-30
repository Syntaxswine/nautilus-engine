// What P01 (parseSave returns the editor's export) does to the round-1 M14 fixture.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = path.resolve(process.argv[2]), file = path.join(root, 'packages/map-core/persistence.js'), original = fs.readFileSync(file);
const find = '  save.payload.data = data; return save;', replace = '  save.payload.data = JSON.parse(new EditingDocument().open(JSON.stringify(data)).export()); return save;';
const probe = `
import {blankMap, createSave, parseSave, serializeSave} from './packages/map-core/index.js';
import assert from 'node:assert/strict';
const map = blankMap('Unnormalized actors'); map.guards = [{x: 30, y: 30, z: 0, species: 'goat', weapon: 'rifle'}];
const text = JSON.stringify(map), loaded = parseSave(serializeSave(createSave(text))).payload.data;
let equal = true; try { assert.deepEqual(loaded, map); } catch { equal = false; }
console.log(JSON.stringify({payloadEqualsAuthoredMap: equal, startsWithCharacter: loaded.starts.filter(s => s.character).length, guardHasCharacter: !!loaded.guards[0].character,
  twoLoadsIdentical: JSON.stringify(parseSave(serializeSave(createSave(text)))) === JSON.stringify(parseSave(serializeSave(createSave(text))))}));`;
const out = {};
for (const id of ['pristine', 'P01']) {
  try {
    if (id === 'P01') { const text = original.toString('utf8'); if (text.split(find).length !== 2) throw Error('needle'); fs.writeFileSync(file, text.replace(find, replace)); }
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {cwd: root, encoding: 'utf8'});
    out[id] = r.status === 0 ? JSON.parse(r.stdout) : r.stderr.slice(0, 300);
  } finally { fs.writeFileSync(file, original); }
}
out.restored = fs.readFileSync(file).equals(original);
console.log(JSON.stringify(out, null, 1));
