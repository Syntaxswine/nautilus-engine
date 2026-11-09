import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {packProfile, root} from './distribution.mjs';

const packed = packProfile('core');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli && path.basename(npmCli) === 'npm-cli.js', 'Run with npm run test:farmyard-playtest:installed.');
const temp = fs.realpathSync(os.tmpdir());
const prefix = 'nautilus-farmyard-playtest-';
const consumer = fs.mkdtempSync(path.join(temp, prefix));
let report;
try {
  const run = args => execFileSync(process.execPath, args, {
    cwd: consumer, windowsHide: true, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024
  });
  fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({name: 'farmyard-playtest-package-proof', private: true}));
  run([npmCli, 'install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', packed.file]);
  const installed = path.join(consumer, 'node_modules/@nautilus-engine/core');
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json')));
  assert.equal(manifest.exports['./adapters/farmyard/playtest'], './packages/adapters/farmyard/playtest/index.js');
  assert.ok(!fs.existsSync(path.join(installed, 'vendor/farmyard-playtest')));

  const fixture = new URL('../tests/fixtures/farmyard-playtest/', import.meta.url);
  fs.writeFileSync(path.join(consumer, 'proof.mjs'), `
import assert from 'node:assert/strict';
import {createMapDocument, MAP_CONTRACT} from '@nautilus-engine/core';
import {createFarmyardPlaytestConnector} from '@nautilus-engine/core/adapters/farmyard/playtest';
import {doorPlaytestDocument} from ${JSON.stringify(new URL('door-start.mjs', fixture).href)};
import {preparePinnedFarmyardHost, verifyProductionDoor} from ${JSON.stringify(new URL('production-proof.mjs', fixture).href)};
const observed = [];
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
    package: packed.name,
    entry: manifest.exports['./adapters/farmyard/playtest'],
    installedFiles: packed.fileCount,
    bundledProductionSources: 0,
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
fs.writeFileSync(path.join(output, 'installed-package-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
