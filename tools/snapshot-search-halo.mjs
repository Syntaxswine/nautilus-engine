import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Reads immutable Git objects only. The donor checkout and its index are never
// changed. Archived Farmyard policy/tests are evidence, not engine modules.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage = 'Use --repo <Farmyard checkout> --commit <full reviewed SHA> [--write].';
const options = new Map();
let write = false;
for (let i = 2; i < process.argv.length; i++) {
  const name = process.argv[i];
  if (name === '--write' && !write) { write = true; continue; }
  if (!['--repo', '--commit'].includes(name) || options.has(name) || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw Error(usage);
  options.set(name, process.argv[++i]);
}
if (!options.has('--repo') || !/^[a-f0-9]{40}$/.test(options.get('--commit') || '')) throw Error(usage);
const repo = fs.realpathSync(path.resolve(options.get('--repo')));
const requested = options.get('--commit');
const git = args => execFileSync('git', ['-c', 'safe.directory=' + repo.replaceAll('\\', '/'), '-C', repo, ...args], {maxBuffer: 16 * 1024 * 1024, windowsHide: true});
const commit = git(['rev-parse', '--verify', requested + '^{commit}']).toString().trim();
if (commit !== requested) throw Error('The pin must identify the full reviewed commit itself.');
const readBlob = name => git(['show', commit + ':' + name]);
const sha256 = data => createHash('sha256').update(data).digest('hex');
const donor = 'farmyard';
const repository = 'https://github.com/Syntaxswine/farmyard-commando';
const sourcePrefix = 'sites/tactical-animal/';
const runtimeEntry = 'packages/render-effects/search-halo.js';
const rendererPath = sourcePrefix + 'dist/search-halo.js';
const testPath = sourcePrefix + 'tests/search-halo.test.mjs';
const names = [rendererPath, testPath, sourcePrefix + 'search-halo-porting.md'].sort();
const blobs = new Map(names.map(name => [name, readBlob(name)]));

const moduleReferences = text => [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);
function assertReviewedImports(name, header, expected) {
  const text = blobs.get(name).toString('utf8').replaceAll('\r\n', '\n');
  if (!text.startsWith(header) || JSON.stringify(moduleReferences(text)) !== JSON.stringify(expected) || /\bimport\s*\(/.test(text)) {
    throw Error('Source imports changed; review dependency closure before importing: ' + name);
  }
}
assertReviewedImports(rendererPath,
  "import * as T from './aft/tactics/vendor/three.module.js';\nimport {Core,hero} from './solo-game.js';\nimport {pointInWorldRect} from './world-grid.js';\n",
  ['./aft/tactics/vendor/three.module.js', './solo-game.js', './world-grid.js']);
assertReviewedImports(testPath,
  "import {test} from 'node:test';\nimport assert from 'node:assert/strict';\nimport * as T from '../dist/aft/tactics/vendor/three.module.js';\nimport {SearchHalo,searchHaloCandidates,searchHaloTarget,SEARCH_HALO_LIMIT} from '../dist/search-halo.js';\nimport {createSoloGame,hero,Core,encodeSave} from '../dist/solo-game.js';\nimport {blockWindow} from '../dist/world-grid.js';\n",
  ['node:test', 'node:assert/strict', '../dist/aft/tactics/vendor/three.module.js', '../dist/search-halo.js', '../dist/solo-game.js', '../dist/world-grid.js']);

// Resolve the renderer onto Nautilus's existing Three instance. Verify the AFT
// provenance first; a CRLF/LF comparison is evidence, never a vendor rewrite.
const upstream = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json'), 'utf8'));
const aft = upstream.aft;
if (!aft || !/^[a-f0-9]{40}$/.test(aft.commit) || aft.root !== 'vendor/aft/' + aft.commit) throw Error('Invalid existing AFT pin.');
const aftManifest = JSON.parse(fs.readFileSync(path.join(root, aft.root, 'provenance.json'), 'utf8'));
if (aftManifest.donor !== 'aft' || aftManifest.commit !== aft.commit || aftManifest.repository !== aft.repository) throw Error('Existing AFT provenance does not match its pin.');
const dependencyResolutions = [];
for (const name of ['three.module.js', 'three.core.js', 'THREE-LICENSE.txt']) {
  const sourcePath = sourcePrefix + 'dist/aft/tactics/vendor/' + name;
  const preservedPath = 'dist/tactics/vendor/' + name;
  const enginePath = aft.root + '/' + preservedPath;
  const original = readBlob(sourcePath), engine = fs.readFileSync(path.join(root, enginePath));
  const sourceSha256 = sha256(original), engineSha256 = sha256(engine);
  const recorded = aftManifest.files.find(entry => entry.path === preservedPath);
  if (!recorded || recorded.sha256 !== engineSha256 || recorded.bytes !== engine.length) throw Error('Existing AFT bytes do not match provenance: ' + enginePath);
  const sourceLf = Buffer.from(original.toString('utf8').replaceAll('\r\n', '\n'));
  const engineLf = Buffer.from(engine.toString('utf8').replaceAll('\r\n', '\n'));
  if (!sourceLf.equals(engineLf) || !Buffer.from(original.toString('utf8')).equals(original) || !Buffer.from(engine.toString('utf8')).equals(engine)) {
    throw Error('Donor Three differs beyond CRLF/LF line endings: ' + sourcePath);
  }
  if (name.endsWith('.js')) {
    const imports = moduleReferences(original.toString('utf8'));
    const expected = name === 'three.module.js' ? ['./three.core.js', './three.core.js'] : [];
    if (JSON.stringify(imports) !== JSON.stringify(expected) || /\bimport\s*\(/.test(original.toString('utf8'))) throw Error('Three dependency closure changed: ' + sourcePath);
  }
  dependencyResolutions.push({
    sourcePath,
    role: name === 'THREE-LICENSE.txt' ? 'license' : 'runtime',
    resolution: 'reuse-existing-engine-file',
    engineDonor: 'aft', engineCommit: aft.commit, enginePath,
    sourceSha256, sourceBytes: original.length,
    engineSha256, engineBytes: engine.length,
    comparison: original.equals(engine) ? 'byte-identical' : 'identical-after-crlf-to-lf',
    normalizedLfSha256: sha256(sourceLf),
    normalization: 'CRLF -> LF for comparison only; original donor and engine bytes remain unchanged.'
  });
}
for (const sourceImport of ['./solo-game.js', './world-grid.js']) dependencyResolutions.push({
  sourceImport,
  sourcePath: path.posix.join(sourcePrefix, 'dist', sourceImport),
  role: 'game-policy',
  resolution: 'excluded-by-renderer-extraction',
  reason: 'Nautilus extracts SearchHalo and local shaders only; Farmyard selection/knowledge exports and their game imports are archived reference evidence, never engine runtime dependencies.'
});
const files = names.map(name => ({path: name, sha256: sha256(blobs.get(name)), bytes: blobs.get(name).length, role: 'reference'}));
const manifest = {
  schemaVersion: 1, donor, repository, commit, sourcePrefix, files, runtimeEntry, dependencyResolutions,
  adaptations: [
    'None in vendor: the three reference files preserve the exact Git blob bytes.',
    'The engine-owned runtime extracts SearchHalo, its shader strings and actuallyVisible; it replaces the Three import with the single existing AFT-pinned engine instance.',
    'SEARCH_HALO_LIMIT, searchHaloCandidates, searchHaloTarget, solo-game.js and world-grid.js remain game-owned policy; archived donor tests and guide are not executed or shipped as modules.'
  ],
  rightsStatus: 'Original embedded notices retained; the reused Three MIT notice remains at its recorded enginePath. Source provenance does not add a license grant.'
};
const destination = path.join(root, 'vendor', donor, commit);
const relativeToDonor = path.relative(repo, destination);
if (relativeToDonor === '' || (!relativeToDonor.startsWith('..' + path.sep) && relativeToDonor !== '..' && !path.isAbsolute(relativeToDonor))) throw Error('Snapshot destination must be outside the read-only donor checkout.');
if (write) {
  if (fs.existsSync(destination)) throw Error('This immutable snapshot already exists; use a new reviewed pin.');
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.mkdirSync(destination);
  for (const name of names) {
    const file = path.join(destination, name);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, blobs.get(name), {flag: 'wx'});
  }
  fs.writeFileSync(path.join(destination, 'provenance.json'), JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx'});
}
console.log(JSON.stringify({donor, commit, files: files.length, bytes: files.reduce((sum, entry) => sum + entry.bytes, 0), dependencyResolutions: dependencyResolutions.length, written: write}));
