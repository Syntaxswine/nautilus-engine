// Re-records tests/fixtures/original-building-geometry.json: every original design's
// digest (tools/building-geometry.mjs) at game and authoring detail, made with the
// reviewed renderer itself. Its building-catalog files are read from the Git objects
// of the commit the fixture names, and the renderer must hash to the recorded blob.
// Needed only when the digest changes; then also refresh the fixture's hash in
// tools/prefab-original-catalog.mjs (a deliberate edit) and its generated catalogue.
//   node tools/record-building-geometry.mjs           compare, writing nothing
//   node tools/record-building-geometry.mjs --write   re-record
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {buildingDigests} from './building-geometry.mjs';
import {DESIGNS} from '../packages/building-catalog/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), file = path.join(root, 'tests/fixtures/original-building-geometry.json');
const fixture = JSON.parse(fs.readFileSync(file, 'utf8')), {commit, renderer, sha256} = fixture.recordedFrom, package_ = path.dirname(renderer);
const show = name => execFileSync('git', ['-C', root, '--no-optional-locks', 'show', commit + ':' + package_ + '/' + name], {maxBuffer: 1 << 28});
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'nautilus-reviewed-renderer-'));
let digests;
try {
  const dir = path.join(scratch, package_); fs.mkdirSync(dir, {recursive: true});
  for (const name of ['index.js', 'designs.js', 'three.js']) fs.writeFileSync(path.join(dir, name), show(name));
  if (createHash('sha256').update(fs.readFileSync(path.join(dir, 'three.js'))).digest('hex') !== sha256) throw Error('The reviewed renderer in ' + commit + ' does not hash to ' + sha256);
  const {createBuildingModel} = await import(pathToFileURL(path.join(dir, 'three.js')).href);
  digests = buildingDigests(T, createBuildingModel, DESIGNS.map(design => design.id));
} finally {fs.rmSync(scratch, {recursive: true, force: true});}
const changed = Object.keys({...fixture.digests, ...digests}).filter(key => fixture.digests[key] !== digests[key]);
if (process.argv.includes('--write')) {
  fs.writeFileSync(file, JSON.stringify({...fixture, digests}, null, 1) + '\n');
  console.log('Re-recorded ' + Object.keys(digests).length + ' digests with ' + commit.slice(0, 7) + "'s renderer (" + changed.length + ' changed); fixture sha256 ' + createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
} else {
  console.log(changed.length ? changed.length + ' of ' + Object.keys(digests).length + ' digests differ from the fixture' : 'The fixture equals the reviewed renderer\'s digests.');
  if (changed.length) process.exitCode = 1;
}
