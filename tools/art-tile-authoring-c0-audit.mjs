import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {root, base as art, sha, readC0, inspectC0} from './art-tile-authoring-c0-check.mjs';
import {distribution, moduleClosure} from './distribution.mjs';

// Final fixed-source audit only. This does not validate arbitrary Core documents,
// decode images, mint live leases or establish renderer/device readiness.
const artistCommit = 'f5bfda9ec0f639018ccfee2415b1f70502e77cae';
const coreCommit = '43227894c50ec62b71806978195fff2c650eb388';
const branch = 'codex/tile-authoring-art-c0-alignment';
const review = 'docs/reviews/tile-authoring/art/';
const output = review + 'c0-source-manifest.json';
const git = args => execFileSync('git', ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), ...args], {
  cwd: root, windowsHide: true, maxBuffer: 8 * 1024 * 1024
});
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => {
  const b = bytes(file);
  return (b[0] === 255 && b[1] === 254 ? b.toString('utf16le') : b.toString('utf8')).replace(/^\uFEFF/, '');
};
const json = file => JSON.parse(read(file));
const record = file => ({path: file, bytes: bytes(file).length, sha256: sha(bytes(file))});
const allowed = file => file.startsWith(art) || file === review + 'c0-realignment.md' || file === output ||
  /^tests\/art-tile-authoring-c0\.test\.mjs$/.test(file) || /^tools\/art-tile-authoring-c0-[^/]+\.mjs$/.test(file);

assert.equal(git(['branch', '--show-current']).toString().trim(), branch);
git(['merge-base', '--is-ancestor', artistCommit, 'HEAD']);
const changed = [...new Set((git(['diff', '--name-only', artistCommit]).toString() + '\n' +
  git(['ls-files', '--others', '--exclude-standard']).toString()).split(/\r?\n/).filter(Boolean))].sort();
assert.ok(changed.every(allowed), 'Out-of-scope task changes');
assert.equal(git(['diff', artistCommit, '--', 'packages', 'apps', 'package.json', 'upstream.json', '.github']).length, 0,
  'Runtime, registration, deployment or consumer-pin change');
assert.ok(!changed.some(f => /\.(png|webp|jpe?g|svg)$/i.test(f)), 'Original art must not change or be copied');

const input = json(art + 'inputs/fixed-inputs.json');
assert.equal(input.coreCommit, coreCommit);
assert.equal(input.artistCommit, artistCommit);
for (const r of input.records) {
  const source = git(['show', r.commit + ':' + r.path]);
  assert.equal(r.commit, coreCommit);
  assert.equal(source.length, r.bytes);
  assert.equal(sha(source), r.sha256);
  assert.ok(bytes(r.local).equals(source), 'Exact immutable Core metadata: ' + r.path);
}
const preserved = json(art + 'inputs/art-preservation.json');
assert.equal(preserved.commit, artistCommit);
assert.equal(preserved.records.length, 9);
for (const r of preserved.records) {
  const source = git(['show', artistCommit + ':' + r.path]);
  assert.equal(source.length, r.bytes);
  assert.equal(sha(source), r.sha256);
  assert.ok(bytes(r.path).equals(source), 'Original Artist bytes: ' + r.path);
}
for (const file of ['artist-import-mapping.json', 'document-v3.json']) {
  const sourcePath = 'candidates/tile-authoring/core/examples/' + file;
  assert.ok(git(['show', input.supersedesRead + ':' + sourcePath]).equals(git(['show', coreCommit + ':' + sourcePath])),
    'Coordinate correction must preserve original mapping and document bytes');
}
const manifest = json(art + 'resources.json');
assert.equal(manifest.digest, 'ef2daf8b205bae3ca14baa093be85fa46e46b769f645c95327a6bf72f2152d33');
const fixture = inspectC0(readC0());
const exclusion = ['core', 'renderer', 'assets', 'compatibility'].map(profile => {
  const d = distribution(profile);
  assert.ok(!d.files.some(f => f.startsWith('candidates/tile-authoring/')));
  return {profile, candidateShipped: false};
});
const gates = ['check', 'test', 'upstream', 'build'].map(name => {
  const r = json('artifacts/art-tile-authoring-c0-' + name + '.json');
  assert.equal(r.exitCode, 0, name);
  const log = read(r.log);
  if (name === 'test') {
    assert.match(log, /(?:ℹ |# )tests 932\s/);
    assert.match(log, /(?:ℹ |# )fail 0\s/);
  }
  if (name === 'upstream') assert.match(log, /(?:ℹ |# )tests 32\s/);
  if (name === 'build') assert.match(log, /519 module paths checked/);
  return {...r, logSha256: record(r.log).sha256};
});
const focused = json('artifacts/art-tile-authoring-c0-focused.json');
assert.equal(focused.exitCode, 0);
assert.match(read(focused.log), /(?:ℹ |# )tests 20\s/);
assert.match(read(focused.log), /(?:ℹ |# )fail 0\s/);
const sourceFiles = changed.filter(file => file !== output);
const report = {
  status: 'pass-contract-only', artistBaseCommit: artistCommit, coreCommit, branch,
  availability: 'C0 contract and static fixtures only; no runtime implementation or live readiness',
  originalArtistBinding: {id: manifest.id, version: manifest.version, digest: manifest.digest},
  fixedCoreInputs: input.records, preservedOriginalArt: preserved.records, fixture,
  focused: {...focused, logSha256: record(focused.log).sha256, tests: 20, newC0Tests: 12, originalArtTests: 8,
    mathematicalD4AndInverseWitnesses: 16},
  gates, publicDistributionExclusion: exclusion,
  scopeGuard: {allChangesInArtistPaths: true, runtimeAndRegistrationsUnchanged: true, changed},
  inputs: sourceFiles.map(record),
  actualPublicTokenDependencyClosure: moduleClosure(['packages/tiles-core/index.js']).map(record),
  helperScope: {startedForC0Alignment: 0, retainedForC0Alignment: 0,
    note: 'Only bounded foreground gate/audit commands; no preview, browser, server, watcher or worker launched'},
  qualification: 'Metadata, source hash and mathematical fixture checks only. Full schema validator, live decoder, geometry/texture/material leases, combined kernel, clipping, installed renderer and device performance are not established.'
};
fs.writeFileSync(path.join(root, output), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({status: report.status, coreCommit, fixture, sourceFiles: sourceFiles.length,
  gates: gates.map(g => ({command: g.command, exitCode: g.exitCode})), helpers: report.helperScope}, null, 2));
