// Independent artist reference cache, never a runtime/vendor import.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

export const SOURCE_COMMIT = '4f5f53917990ec03b2f14c65f067e4b99ec8fcaa';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = name => process.argv[process.argv.indexOf(name) + 1];
if (!process.argv.includes('--repo')) throw Error('Supply --repo <read-only AFT repository>.');
const repo = path.resolve(arg('--repo'));
const git = args => execFileSync('git', ['-c', 'safe.directory=' + repo.replaceAll('\\', '/'), '-C', repo, ...args], {windowsHide: true, maxBuffer: 256 * 1024 * 1024});
if (git(['rev-parse', SOURCE_COMMIT + '^{commit}']).toString().trim() !== SOURCE_COMMIT) throw Error('Expected the full reviewed source commit.');
const inventory = new Map(git(['ls-tree', '-rz', SOURCE_COMMIT]).toString().split('\0').filter(Boolean).map(line => {
  const [metadata, name] = line.split('\t');
  const [mode, type, oid] = metadata.split(' ');
  if (type !== 'blob') throw Error('Only source blobs are reviewed.');
  return [name, {mode, oid}];
}));
const roots = [
  'dist/tactics/bear-worker.js', 'dist/tactics/bear-paint.js',
  'dist/tactics/horse-model-paint.js', 'dist/tactics/red-hat-model.js',
  'dist/tactics/weapon-models.js', 'dist/tactics/armed-idle-motion.js',
  'dist/tactics/worker-locomotion.js', 'dist/tactics/battle-posture.js',
  'dist/tactics/crawl-motion.js', 'dist/tactics/animal-motion.js',
  'dist/tactics/bear-10k-data.json', 'dist/tactics/bear-author-data.json',
  'dist/tactics/horse-10k-data.json', 'dist/tactics/pig-foreman-10k-data.json',
  'dist/assets/characters/lowpoly-proof/bear-worker-model-paint-v1.png',
  'dist/assets/characters/lowpoly-proof/bear-red-hat-model-paint-v1.png',
  'docs/tactics/review-images/bear/validation.json',
  'docs/tactics/review-images/bear/animation-integration-validation.json',
  'tests/bear-worker.test.mjs', 'tests/bear-integration.test.mjs'
];
const selected = new Map(), unresolvedResources = new Set();
const inspectionOnly = [
  'dist/tactics/animal-prone-motion.js', 'dist/tactics/animal-motion-paint.js',
  'dist/tactics/animal-motion-catalog.js', 'dist/tactics/animal-casualty-review.js',
  'dist/tactics/idle-motion.js', 'dist/tactics/horse-chair-motion.js',
  'dist/tactics/speaking-head.js', 'docs/tactics/BEAR-ANIMATION-INTEGRATION-2026-10-28.md'
];
function include(name, reason, follow = true) {
  if (selected.has(name)) return;
  const blob = inventory.get(name);
  if (!blob) throw Error('Missing pinned reference: ' + name);
  const bytes = git(['cat-file', 'blob', blob.oid]);
  selected.set(name, {blob, bytes, reason});
  if (!follow || !name.startsWith('dist/') || !/\.m?js$/.test(name)) return;
  const text = bytes.toString();
  for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) {
    const child = path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1]));
    if (!child.startsWith('dist/')) throw Error('Reference import escapes dist: ' + child);
    include(child, 'static import from ' + name);
  }
  // Three's API documentation contains example URLs, not bench resources.
  if (name.startsWith('dist/tactics/vendor/')) return;
  for (const match of text.matchAll(/(['"`])([^'"`\r\n]+\.(?:json|png|webp|jpe?g|svg|txt))\1/g)) {
    const value = match[2];
    if (/^(?:https?:|data:|\/)/.test(value)) continue;
    const child = path.posix.normalize(path.posix.join(path.posix.dirname(name), value));
    if (inventory.has(child)) include(child, 'resource literal from ' + name);
    else unresolvedResources.add(name + ' -> ' + value);
  }
}
for (const name of roots) include(name, 'explicit artist review root');
for (const name of inspectionOnly) include(name, 'inspection only; not executed or a dependency root', false);
for (const name of inventory.keys()) if (/^(?:LICENSE|NOTICE|COPYING)(?:\.[^/]+)?$/i.test(name) || /^dist\/tactics\/vendor\/(?:THREE-LICENSE\.txt|LICENSE[^/]*)$/i.test(name)) include(name, 'source notice');
const cache = path.join(root, 'artifacts/bear-review/source', SOURCE_COMMIT);
const files = [...selected].sort(([a], [b]) => a.localeCompare(b)).map(([name, {blob, bytes, reason}]) => {
  const destination = path.join(cache, name);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  if (fs.existsSync(destination) && !fs.readFileSync(destination).equals(bytes)) throw Error('Pinned review cache was changed: ' + name);
  fs.writeFileSync(destination, bytes);
  return {path: name, gitBlob: blob.oid, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, reason};
});
const manifest = {
  schemaVersion: 1, sourceCommit: SOURCE_COMMIT,
  repository: 'https://github.com/Syntaxswine/animal-factory-tactics-3d',
  engineBaseline: '8c4670450cb2b38c1e1abd811d633c22de9e2b7c',
  purpose: 'Independent pinned donor reference for artist review; not a Nautilus runtime import or integrated acceptance.',
  cache: 'artifacts/bear-review/source/' + SOURCE_COMMIT,
  roots, inspectionOnly, files, bytes: files.reduce((sum, file) => sum + file.bytes, 0),
  unresolvedResourceLiterals: [...unresolvedResources].sort(),
  limitation: 'Static imports and explicit resources for this reference bench only. This is not the Coder provider dependency manifest. Source tests/reports are context and are not executed as independent acceptance.',
  rights: 'Source bytes stay in the ignored review cache. Original notices are retained; provenance adds no license grant.'
};
fs.writeFileSync(new URL('./source-manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({commit: SOURCE_COMMIT, files: files.length, bytes: manifest.bytes, unresolvedResourceLiterals: manifest.unresolvedResourceLiterals}));
