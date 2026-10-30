// Re-derive the answer's provenance pins from Git objects (read-only).
//   node provenance.mjs <sandbox> <baseline>
// 1. ee7c18e's renderer blob hash, and the baseline (main) renderer's file hash.
// 2. The 96 fixture digests recomputed with the baseline renderer (ee7c18e's blob).
// 3. REVIEWED_CATALOGUE_CONTENT recomputed from ee7c18e's catalogue.json.
// 4. Whether the registry's source record still names files as they are at its commit.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL, fileURLToPath} from 'node:url';
const [SANDBOX, BASELINE] = process.argv.slice(2).map(p => path.resolve(p));
const here = path.dirname(fileURLToPath(import.meta.url));
const COMMIT = 'ee7c18ecdc2669168247b94a82156634b2c4ffe5';
const sha = b => createHash('sha256').update(b).digest('hex');
const show = (rev, file) => execFileSync('git', ['-C', SANDBOX, 'show', rev + ':' + file], {maxBuffer: 1 << 28});
const out = {script: 'provenance.mjs', commit: COMMIT};
out.ee7c18eRendererSha = sha(show(COMMIT, 'packages/building-catalog/three.js'));
out.baselineRendererSha = sha(fs.readFileSync(path.join(BASELINE, 'packages/building-catalog/three.js')));
out.sandboxRendererSha = sha(fs.readFileSync(path.join(SANDBOX, 'packages/building-catalog/three.js')));
for (const f of ['packages/building-catalog/index.js', 'packages/building-catalog/designs.js']) out[f] = {ee7c18e: sha(show(COMMIT, f)), sandbox: sha(fs.readFileSync(path.join(SANDBOX, f)))};
// 2. fixture vs digests of the reviewed renderer (the baseline's file is ee7c18e's blob).
const T = await import(pathToFileURL(path.join(SANDBOX, 'vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js')).href);
const {DESIGNS} = await import(pathToFileURL(path.join(BASELINE, 'packages/building-catalog/index.js')).href);
const {createBuildingModel} = await import(pathToFileURL(path.join(BASELINE, 'packages/building-catalog/three.js')).href);
const {buildingDigests} = await import(pathToFileURL(path.join(SANDBOX, 'tools/building-geometry.mjs')).href);
const fixture = JSON.parse(fs.readFileSync(path.join(SANDBOX, 'tests/fixtures/original-building-geometry.json'), 'utf8'));
const recomputed = buildingDigests(T, createBuildingModel, DESIGNS.map(d => d.id));
const keys = Object.keys(fixture.digests);
out.fixture = {entries: keys.length, recordedFrom: fixture.recordedFrom, matchesReviewedRenderer: keys.filter(k => recomputed[k] === fixture.digests[k]).length, sameKeys: JSON.stringify(Object.keys(recomputed).sort()) === JSON.stringify([...keys].sort()), fixtureFileSha: sha(fs.readFileSync(path.join(SANDBOX, 'tests/fixtures/original-building-geometry.json')))};
// Control: a one-character change of one digest must be seen by the same comparison.
{const forged = {...fixture.digests}; const k = keys[7]; forged[k] = (forged[k][0] === 'a' ? 'b' : 'a') + forged[k].slice(1); out.fixture.controlForgedEntryMatches = keys.filter(x => recomputed[x] === forged[x]).length;}
// 3. catalogue content minus the renderer line, at ee7c18e and now.
const contentHash = text => {const c = JSON.parse(text); return sha(JSON.stringify({...c, inputs: c.inputs.filter(i => i.file !== 'packages/building-catalog/three.js')}));};
const tool = fs.readFileSync(path.join(SANDBOX, 'tools/prefab-original-catalog.mjs'), 'utf8'), pinned = tool.match(/REVIEWED_CATALOGUE_CONTENT='([0-9a-f]{64})'/)[1];
out.catalogue = {pinned, ee7c18e: contentHash(show(COMMIT, 'assets/buildings/catalogue.json').toString('utf8')), sandbox: contentHash(fs.readFileSync(path.join(SANDBOX, 'assets/buildings/catalogue.json'), 'utf8')),
  ee7c18eBytesSha: sha(show(COMMIT, 'assets/buildings/catalogue.json')), sandboxBytesSha: sha(fs.readFileSync(path.join(SANDBOX, 'assets/buildings/catalogue.json')))};
// 4. the registry's source record: each input it lists under commit ee7c18e, checked against that commit's blobs.
const {ORIGINAL_BUILDING_SOURCE} = await import(pathToFileURL(path.join(SANDBOX, 'packages/prefab-core/original-catalogue.js')).href);
out.registrySource = {commit: ORIGINAL_BUILDING_SOURCE.commit, catalogueSha256: ORIGINAL_BUILDING_SOURCE.catalogueSha256, catalogueAtCommitSha: out.catalogue.ee7c18eBytesSha,
  inputs: ORIGINAL_BUILDING_SOURCE.inputs.map(i => {let atCommit = null; try {atCommit = sha(show(ORIGINAL_BUILDING_SOURCE.commit, i.file));} catch {} return {file: i.file, recorded: i.sha256, atCommit, matchesCommit: atCommit === i.sha256};})};
// Is the fixture's own hash pinned anywhere a gate reads?
const grepFixtureHash = h => {try {return execFileSync('git', ['-C', SANDBOX, 'grep', '-l', h, 'HEAD', '--', 'tools', 'tests', 'packages'], {encoding: 'utf8'}).trim().split('\n').filter(Boolean);} catch {return [];}};
out.fixture.hashPinnedIn = grepFixtureHash(out.fixture.fixtureFileSha);
fs.writeFileSync(path.join(here, 'provenance.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
