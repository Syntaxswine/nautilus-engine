import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FARMYARD_GRENADE_ROOT, verifyFarmyardGrenadeIntake} from '../tools/intake-farmyard-grenades.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = 'docs/reviews/2026-10-29-farmyard-grenades.sources.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
// Verify the frozen source before any donor test module can run.
const verified = verifyFarmyardGrenadeIntake(root);

test('frozen grenade conformance evidence is closed, bounded and reference-only', () => {
  assert.equal(verified.files, 43);
  assert.equal(verified.bytes, 894207);
  assert.equal(verified.modules, 36);
  assert.equal(verified.copiedBinaryAssets, 0);
  assert.equal(manifest.dependencyResolutions.publicRuntimeImportsDonorGame, false);
  assert.equal(manifest.dynamicResources.targetSprites.files.length, 354);
  assert.equal(manifest.dynamicResources.targetSprites.fetchedByHeadlessTests, false);
  assert.ok(manifest.files.every(f => f.role === 'reference'));
  assert.ok(manifest.dependencyResolutions.three.every(r => r.normalizedLfEqual));
});

test('offline intake verification rejects altered bytes and undeclared payload', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'nautilus-grenade-intake-'));
  try {
    const snapshot = path.join(temp, FARMYARD_GRENADE_ROOT);
    fs.mkdirSync(path.dirname(snapshot), {recursive: true});
    fs.cpSync(path.join(root, FARMYARD_GRENADE_ROOT), snapshot, {recursive: true});
    fs.mkdirSync(path.join(temp, path.dirname(manifestPath)), {recursive: true});
    fs.copyFileSync(path.join(root, manifestPath), path.join(temp, manifestPath));
    for (const enginePath of new Set(manifest.dependencyResolutions.three.map(r => r.enginePath))) {
      fs.mkdirSync(path.dirname(path.join(temp, enginePath)), {recursive: true});
      fs.copyFileSync(path.join(root, enginePath), path.join(temp, enginePath));
    }
    const source = path.join(snapshot, 'sites/tactical-animal/dist/solo-game.js');
    const original = fs.readFileSync(source);
    fs.appendFileSync(source, '\n// deliberately changed test-only copy\n');
    assert.throws(() => verifyFarmyardGrenadeIntake(temp), /Source bytes changed: .*solo-game\.js/);
    fs.writeFileSync(source, original);
    fs.writeFileSync(path.join(snapshot, 'undeclared.js'), 'export {};\n');
    assert.throws(() => verifyFarmyardGrenadeIntake(temp), /Unexpected or missing snapshot files/);
    fs.unlinkSync(path.join(snapshot, 'undeclared.js'));
    assert.deepEqual(verifyFarmyardGrenadeIntake(temp), verified);
  } finally {
    const resolved = path.resolve(temp);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('nautilus-grenade-intake-'));
    fs.rmSync(resolved, {recursive: true});
  }
});

// Exact original tests use the real pinned game/control modules; the original
// app harness alone supplies the browser dependencies. No server or art loads.
await import('../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/tests/grenades.test.mjs');
await import('../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/tests/grenade-controls.test.mjs');
await import('../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/tests/grenade-input.test.mjs');
await import('../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/tests/area-weapon-button.test.mjs');
