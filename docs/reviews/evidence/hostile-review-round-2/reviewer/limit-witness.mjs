// What the surviving limit mutants let through. Applies B04 or B05 to the pristine copy, then
// asks every public entry point about a 33-building map (Gross catalogue, and the same map under
// the combined catalogue). Restores in a finally. Usage: node limit-witness.mjs <pristine-root>
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = path.resolve(process.argv[2]);
const B = path.join(root, 'packages/prefab-core/index.js'), D = path.join(root, 'packages/map-core/prefab-document.js');
const MUTANTS = {
  pristine: [],
  B04: [[B, '||data.instances.length>MAX_BUILDINGS)fail(', '||data.catalogue===PREFAB_CATALOGUE&&data.instances.length>MAX_BUILDINGS)fail(']],
  B05: [[B, '||data.instances.length>MAX_BUILDINGS)fail(', ')fail('], [D, "    const raw=JSON.parse(text),errors=prefabErrors(raw);if(errors.length)throw Error(errors.join(' '));", "    const raw=JSON.parse(text),errors=prefabErrors(raw);if(errors.length)throw Error(errors.join(' '));if(raw?.buildingPrefabs?.instances?.length>32)throw Error('Unsupported building prefab catalogue/version, or more than 32 buildings.');"]],
};
const probe = `
import {placeBuilding, blankMap, openDocument, loadBlueprint, parseMap, validateMap, prefabErrors, requiredMapFeatures, COMBINED_PREFAB_CATALOGUE} from './packages/map-core/index.js';
const catalogue = placeBuilding(blankMap('Catalogue'), {asset: 'albany-cottage', x: 30, y: 30, turns: 0, clearance: 1}).map.buildingPrefabs.catalogue;
const city = (count, cat) => { const map = blankMap('City'); map.buildingPrefabs = {version: 1, catalogue: cat, instances: []};
  for (let i = 0; i < count; i++) map.buildingPrefabs.instances.push({id: 'b' + i, asset: 'albany-cottage', x: 20 + i % 6 * 34, y: 20 + Math.floor(i / 6) * 34, turns: 0, clearance: 1}); return map; };
const ask = fn => { try { const r = fn(); return Array.isArray(r) && r.length ? 'errors: ' + r[0].slice(0, 60) : 'accepted'; } catch (e) { return 'throws: ' + e.message.slice(0, 60); } };
const out = {};
for (const [name, cat] of [['gross', catalogue], ['combined', COMBINED_PREFAB_CATALOGUE]]) {
  const m = city(33, cat);
  out[name] = {openDocument: ask(() => openDocument(m)), loadBlueprint: ask(() => loadBlueprint(m)), parseMap: ask(() => parseMap(JSON.stringify(m))),
    validateMap: ask(() => validateMap(m)), prefabErrors: ask(() => prefabErrors(m)), requiredMapFeatures: ask(() => requiredMapFeatures(m))};
}
console.log(JSON.stringify(out));`;
const results = {};
for (const [id, edits] of Object.entries(MUTANTS)) {
  const originals = new Map([B, D].map(f => [f, fs.readFileSync(f)]));
  try {
    for (const [file, find, replace] of edits) { const text = fs.readFileSync(file, 'utf8'); if (text.split(find).length !== 2) throw Error(id + ' needle'); fs.writeFileSync(file, text.replace(find, replace)); }
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', probe], {cwd: root, encoding: 'utf8'});
    results[id] = r.status === 0 ? JSON.parse(r.stdout) : r.stderr.slice(0, 400);
  } finally { for (const [f, bytes] of originals) fs.writeFileSync(f, bytes); }
  results[id + ' restored'] = [B, D].every(f => fs.readFileSync(f).equals(originals.get(f)));
}
console.log(JSON.stringify(results, null, 1));
