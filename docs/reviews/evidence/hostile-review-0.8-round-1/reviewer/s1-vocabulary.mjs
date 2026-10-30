// Previous-series S1 re-check: AFT main accepts a `bull` guard; does Nautilus?
// Control: a horse guard (in both vocabularies) must be accepted by both.
// Requires the AFT closure extracted by m1-exchange.mjs (donor/aft3d-<sha>/).
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {sandbox, evidenceDir, donors, git, writeResult, nodeRig} from './lib/common.mjs';

const aftMain = git(['rev-parse', 'origin/main'], donors.aft3d).trim();
const dir = fs.readdirSync(path.join(evidenceDir, 'donor')).find((d) => d === 'aft3d-' + aftMain.slice(0, 7));
if (!dir) throw Error('Run m1-exchange.mjs first to extract the AFT closure.');
const aft = await import(pathToFileURL(path.join(evidenceDir, 'donor', dir, 'dist/tactics/core/maps.js')).href);
const core = await import(pathToFileURL(path.join(sandbox, 'packages/map-core/index.js')).href);
const run = (fn) => { try { fn(); return 'accepted'; } catch (e) { return 'REJECTED: ' + e.message.slice(0, 120); } };
const rows = {};
for (const species of ['horse', 'bull', 'bear', 'rabbit', 'dog']) {
  const m = aft.blankMap('AFT main ' + species + ' guard'); m.guards = [{x: 30, y: 30, z: 0, species, weapon: 'rifle'}];
  const text = JSON.stringify(m);
  rows[species] = {aftMain: run(() => aft.parseMap(text)), nautilusOpenDocument: run(() => core.openDocument(text))};
}
writeResult('s1-vocabulary.json', {rig: nodeRig(), aftMainCommit: aftMain, aftMainSpecies: aft.SPECIES, rows});
console.log(JSON.stringify(rows, null, 1));
