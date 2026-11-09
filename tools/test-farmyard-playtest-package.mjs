import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {packProfile, root} from './distribution.mjs';
import {corePeer, packageName, packFarmyardPlaytest, peerBridge, runNpm} from './pack-farmyard-playtest.mjs';

const core = packProfile('core');
const packed = packFarmyardPlaytest();
const temp = fs.realpathSync(os.tmpdir());
const prefix = 'nautilus-farmyard-playtest-';
const consumer = fs.mkdtempSync(path.join(temp, prefix));
let report;
try {
  const run = args => execFileSync(process.execPath, args, {
    cwd: consumer, windowsHide: true, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024
  });
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({name: 'farmyard-playtest-package-proof', private: true}));
  runNpm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false',
    core.file, packed.file], consumer);
  const installed = path.join(consumer, 'node_modules', packageName);
  const installedCore = path.join(consumer, 'node_modules', core.name);
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')));
  assert.deepEqual(manifest.exports, {'.': './index.js'});
  assert.deepEqual(manifest.peerDependencies, corePeer);
  assert.equal(fs.readFileSync(path.join(installed, 'core-peer.js'), 'utf8'), peerBridge);
  const installedFiles = fs.readdirSync(installed, {recursive: true, withFileTypes: true})
    .filter(entry => entry.isFile())
    .map(entry => path.relative(installed, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort();
  assert.deepEqual(installedFiles, packed.files);
  assert.ok(!fs.existsSync(path.join(installedCore, 'packages/adapters/farmyard/playtest')));
  assert.ok(!fs.existsSync(path.join(installedCore, 'vendor/farmyard-playtest')));

  const fixture = new URL('../tests/fixtures/farmyard-playtest/', import.meta.url);
  fs.writeFileSync(path.join(consumer, 'proof.mjs'), `
import assert from 'node:assert/strict';
import {createMapDocument, MAP_CONTRACT} from '@nautilus-engine/core';
import {FARMYARD_DOOR_CONTRACT} from '@nautilus-engine/core/adapters/farmyard/doors';
import {createFarmyardPlaytestConnector, FARMYARD_PLAYTEST_PROFILE} from '@nautilus-engine/farmyard-playtest';
import {doorPlaytestDocument} from ${JSON.stringify(new URL('door-start.mjs', fixture).href)};
import {preparePinnedFarmyardHost, verifyProductionDoor} from ${JSON.stringify(new URL('production-proof.mjs', fixture).href)};
const observed = [];
assert.equal(FARMYARD_PLAYTEST_PROFILE.maximumDoors, FARMYARD_DOOR_CONTRACT.doors);
assert.equal(FARMYARD_PLAYTEST_PROFILE.maximumBoxes, FARMYARD_DOOR_CONTRACT.boxes);
for (const axis of ['e', 's']) {
  const connector = createFarmyardPlaytestConnector({prepareHost: preparePinnedFarmyardHost});
  const json = doorPlaytestDocument(createMapDocument, axis).export();
  try {
    const {session, cleanupError} = await connector.openMap({json, contract: MAP_CONTRACT});
    assert.equal(cleanupError, null);
    assert.equal(session.sourceJSON, json);
    observed.push(verifyProductionDoor(session, axis));
  } finally {
    assert.equal(await connector.dispose(), null);
  }
}
console.log(JSON.stringify(observed));
`);
  report = {
    connector: packed,
    entry: manifest.exports['.'],
    core: {name: core.name, version: core.version, integrity: core.integrity},
    peerDependencies: manifest.peerDependencies,
    installedFiles,
    productionDoorCases: JSON.parse(run(['proof.mjs']))
  };
} finally {
  const resolved = fs.realpathSync(consumer);
  assert.ok(resolved.startsWith(temp + path.sep) && path.basename(resolved).startsWith(prefix));
  fs.rmSync(resolved, {recursive: true, force: true});
  assert.ok(!fs.existsSync(resolved));
}
const output = path.join(root, 'artifacts/farmyard-playtest');
fs.mkdirSync(output, {recursive: true});
fs.writeFileSync(path.join(output, 'optional-installed-package-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
