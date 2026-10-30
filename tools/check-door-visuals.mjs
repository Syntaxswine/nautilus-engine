import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { moduleReferencesBatch } from './module-references.mjs';

const pin = '251bf8094b5f9ebe44208443084c1a6d6658512a';
const snapshot = 'vendor/farmyard-door-visuals/' + pin, dist = 'sites/tactical-animal/dist/';
const view = dist + 'interaction-view.js', wood = dist + 'aft/assets/environment/hybrid-surfaces/wood-factory-v2.png';
const digest = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const gitBlob = bytes => digest(Buffer.concat([Buffer.from('blob ' + bytes.length + '\0'), bytes]), 'sha1');

export function checkDoorVisuals(root, { tracked = null, output = null } = {}) {
  root = path.resolve(root);
  function read(file) {
    const resolved = path.resolve(root, file);
    assert.ok(resolved.startsWith(root + path.sep), 'Door visual file escapes project: ' + file);
    assert.ok(fs.lstatSync(resolved).isFile(), 'Door visual source must be a regular file: ' + file);
    if (tracked) assert.ok(tracked.has(file), 'Untracked door visual source: ' + file);
    return fs.readFileSync(resolved);
  }
  const manifest = JSON.parse(read(snapshot + '/provenance.json'));
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.commit, pin); assert.equal(manifest.snapshotRoot, snapshot);
  assert.equal(manifest.repository, 'https://github.com/Syntaxswine/farmyard-commando');
  assert.deepEqual(manifest.files.map(record => record.path).sort(), [view, wood].sort());
  let bytes = 0;
  for (const record of manifest.files) {
    const data = read(snapshot + '/' + record.path);
    assert.equal(data.length, record.bytes); assert.equal(digest(data), record.sha256); assert.equal(gitBlob(data), record.gitBlob); bytes += data.length;
  }
  assert.equal(bytes, 2762865); assert.equal(manifest.copiedPayload.originalBytes, bytes); assert.equal(manifest.copiedPayload.originalFiles, 2);
  assert.deepEqual(manifest.copiedPayload.generatedFiles, ['NOTICE.md', 'provenance.json']);
  assert.ok(read(snapshot + '/NOTICE.md').toString().includes('no licence grant'));
  const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name);
    assert.ok(!entry.isSymbolicLink(), 'No linked door visual evidence');
    return entry.isDirectory() ? walk(file) : [path.relative(path.join(root, snapshot), file).replaceAll('\\', '/')];
  });
  assert.deepEqual(walk(path.join(root, snapshot)).sort(), ['NOTICE.md', 'provenance.json', view, wood].sort());
  const png = read(snapshot + '/' + wood);
  assert.equal(png.length, 2757790); assert.equal(digest(png), 'fd84b8b6dffb4974ce19c51d8a8e0dbe7295a2dddcf8c262eaa94e542ed64021');
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

  const closure = manifest.referenceClosure, records = closure.staticModules, names = new Set(records.map(record => record.path));
  assert.equal(closure.entry, view); assert.equal(names.size, 17); assert.equal(records.length, names.size);
  assert.ok(names.has(view));
  for (const record of records) {
    assert.ok(record.path.startsWith(dist) && record.path.endsWith('.js'));
    assert.match(record.sha256, /^[a-f0-9]{64}$/); assert.match(record.gitBlob, /^[a-f0-9]{40}$/);
    assert.ok(Number.isSafeInteger(record.bytes) && record.bytes > 0);
    assert.equal(record.copied, record.path === view);
    for (const reference of record.imports) {
      assert.ok(reference.specifier.startsWith('./') || reference.specifier.startsWith('../'));
      assert.equal(reference.target, path.posix.normalize(path.posix.join(path.posix.dirname(record.path), reference.specifier)));
      assert.ok(names.has(reference.target), 'Incomplete mixed-view static closure: ' + reference.target);
    }
  }
  const reached = new Set(), visit = name => {
    if (reached.has(name)) return; reached.add(name);
    records.find(record => record.path === name).imports.forEach(reference => visit(reference.target));
  };
  visit(view); assert.equal(reached.size, names.size, 'Unreachable closure entries');
  const entry = records.find(record => record.path === view);
  assert.equal(entry.sha256, manifest.files.find(record => record.path === view).sha256);
  assert.deepEqual(moduleReferencesBatch([{ filename: view, source: read(snapshot + '/' + view).toString('utf8') }])[0].specifiers.sort(), entry.imports.map(reference => reference.specifier).sort());
  assert.deepEqual(manifest.deferred.chestPaints.map(record => record.id).sort(), ['supply-chest-closed', 'supply-chest-open']);
  for (const chest of manifest.deferred.chestPaints) {
    assert.equal(chest.copied, false); assert.ok(chest.path.startsWith(dist + 'aft/assets/environment/'));
    assert.match(chest.sha256, /^[a-f0-9]{64}$/); assert.match(chest.gitBlob, /^[a-f0-9]{40}$/);
    assert.ok(chest.bytes > 0 && chest.crop.length === 4 && chest.crop.every(Number.isFinite));
  }
  assert.equal(manifest.deferred.clue.copied, false);
  assert.equal(manifest.deferred.clue.geometry, 'OctahedronGeometry(.18)');
  assert.equal(manifest.dependencyResolutions.three.length, 3);
  for (const record of manifest.dependencyResolutions.three) {
    assert.equal(record.copied, false);
    assert.ok(record.reusedPath.startsWith('vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/'));
    const data = read(record.reusedPath); assert.equal(data.length, record.reusedBytes); assert.equal(digest(data), record.reusedSha256);
  }
  const license = manifest.dependencyResolutions.three.find(record => record.path.endsWith('/THREE-LICENSE.txt'));
  assert.equal(manifest.noticeReferences.find(record => record.path.endsWith('/THREE-LICENSE.txt')).sha256, license.sha256);
  assert.equal(manifest.noticeReferences.length, 2);
  assert.deepEqual(manifest.runtime.resources, [wood]); assert.equal(manifest.runtime.donorRuntimeImported, false); assert.equal(manifest.runtime.duplicateThreeModules, 0);
  assert.equal(manifest.runtime.adaptedEntry, 'packages/door-visuals/three.js'); assert.equal(manifest.runtime.sharedThree, 'packages/render-effects/three.js');
  const provider = read(manifest.runtime.adaptedEntry).toString('utf8');
  assert.deepEqual(moduleReferencesBatch([{ filename: manifest.runtime.adaptedEntry, source: provider }])[0].specifiers, ['../render-effects/three.js']);
  assert.ok(provider.includes(snapshot + '/' + wood), 'Runtime URL must resolve to the preserved native paint.');
  assert.ok(provider.includes(manifest.files.find(record => record.path === wood).sha256));
  if(output){
    const report=JSON.parse(fs.readFileSync(path.join(output,'build-provenance.json'))).farmyardDoorVisuals;
    assert.equal(report.source.commit,pin);assert.equal(report.referenceManifest,snapshot+'/provenance.json');
    assert.deepEqual(report.files.map(row=>row.path).sort(),[manifest.runtime.adaptedEntry,snapshot+'/'+wood].sort());
    for(const row of report.files){const original=read(row.path),built=fs.readFileSync(path.join(output,row.path));assert.equal(row.bytes,original.length);assert.equal(row.sha256,digest(original));assert.deepEqual(built,original);}
    assert.deepEqual(fs.readFileSync(path.join(output,snapshot+'/provenance.json')),read(snapshot+'/provenance.json'));
    assert.equal(fs.existsSync(path.join(output,snapshot,view)),false,'Mixed donor view is reference-only');
  }
  return { commit: pin, originalFiles: 2, originalBytes: bytes, staticReferenceModules: records.length,
    runtimeResources: 1, deferredChestResources: 2, duplicateThreeModules: 0 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(checkDoorVisuals(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
