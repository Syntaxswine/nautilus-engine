import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {packProfile, root} from './distribution.mjs';

const npm = [
  process.env.npm_execpath,
  path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
  path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')
].find(file => file && path.basename(file) === 'npm-cli.js' && fs.existsSync(file));
if (!npm) throw Error('Node with npm is required.');
const packed = packProfile('core');
const temp = fs.realpathSync(os.tmpdir());
const prefix = 'nautilus-aft-spread-';
const consumer = fs.mkdtempSync(path.join(temp, prefix));
let result;
try {
  const run = args => execFileSync(process.execPath, args, {
    cwd: consumer, windowsHide: true, encoding: 'utf8', timeout: 180_000, maxBuffer: 4 * 1024 * 1024
  });
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({name: 'aft-shot-spread-proof', private: true}));
  run([npm, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false',
    '--cache', path.join(consumer, 'npm-cache'), packed.file]);
  fs.writeFileSync(path.join(consumer, 'proof.mjs'), `
import assert from 'node:assert/strict';
import * as aft from '@nautilus-engine/core/rules/aft';
assert.deepEqual(Object.keys(aft).sort(), [
  'CLIMBS', 'accuracyPenalty', 'climbRiskText', 'climbingPenalty', 'climbingPreview', 'climbingSkill',
  'injuryMovement', 'rollClimb', 'roundChance', 'traceAftShot', 'turnAP'
].sort());
assert.equal(typeof globalThis.window, 'undefined');
assert.equal(typeof globalThis.document, 'undefined');
const input = {
  origin: {x: 0, y: 0, h: 1.2, z: 4}, aim: {x: 0, y: 20, h: 1.2, z: 1}, maxReach: 30,
  decision: {rolledHit: false, chance: 50, die: 8}, precision: 80, seed: 42, pellets: 6
};
const scene = {trace({origin, direction, maxReach}) {
  const distance = (7 - origin.y) / direction.y;
  const x = origin.x + direction.x * distance, h = origin.h + direction.h * distance;
  return distance >= 0 && distance <= maxReach && x > .02 && x < .3 && h > .5 && h < 1.8
    ? {kind: 'world', id: 'side-wall', distance} : null;
}};
const shot = aft.traceAftShot(input, scene);
assert.equal(shot.draws, 12);
assert.equal(shot.rays.length, 6);
assert.equal(shot.decision.rolledHit, false);
assert.equal(shot.rays[0].contact.id, 'side-wall');
assert.deepEqual(shot.rays[0].origin, {x: 0, y: 0, h: 1.2});
assert.ok(Math.abs(shot.rays[0].endpoint.y - 7) < 1e-12);
assert.deepEqual(aft.traceAftShot(JSON.parse(JSON.stringify(input)), scene), shot);
console.log(JSON.stringify({pellets: shot.rays.length, draws: shot.draws, seed: shot.seed, firstEndpoint: shot.rays[0].endpoint}));
`);
  result = {
    package: packed.name, version: packed.version, integrity: packed.integrity,
    entry: '@nautilus-engine/core/rules/aft',
    proof: JSON.parse(run(['proof.mjs']))
  };
} finally {
  const resolved = fs.realpathSync(consumer);
  assert.ok(path.dirname(resolved) === temp && path.basename(resolved).startsWith(prefix));
  fs.rmSync(resolved, {recursive: true, force: true});
  assert.ok(!fs.existsSync(resolved));
}
const output = path.join(root, 'artifacts/aft-weapon-spread');
fs.mkdirSync(output, {recursive: true});
fs.writeFileSync(path.join(output, 'installed-package-report.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
