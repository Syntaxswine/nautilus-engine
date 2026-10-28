import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {checkEditorAssets} from './editor-assets.mjs';
import {prefabCatalogueSource} from './prefab-catalog.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json')));
let count = 0, size = 0;
const tracked = process.argv.includes('--tracked') ? new Set(execFileSync('git', ['-c', 'safe.directory=' + root.replaceAll('\\', '/'), '-C', root, 'ls-files', '-z'], {encoding:'utf8'}).split('\0')) : null;
for (const donor of ['aft', 'farmyard', 'aftAssets', 'tinderboxPrefabs']) {
  const folder = path.join(root, sources[donor].root), manifest = JSON.parse(fs.readFileSync(path.join(folder, 'provenance.json')));
  if (manifest.commit !== sources[donor].commit) throw Error('Source pin mismatch: ' + donor);
  for (const entry of manifest.files) {
    if (tracked && !tracked.has(sources[donor].root + '/' + entry.path)) throw Error('Required upstream file is not tracked by Git: ' + entry.path);
    const file = path.resolve(folder, entry.path);
    if (!file.startsWith(folder + path.sep)) throw Error('Invalid manifest path.');
    const data = fs.readFileSync(file);
    if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw Error('Upstream bytes changed: ' + entry.path);
    if (/\.m?js$/.test(file)) for (const match of data.toString().matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) {
      // editor-playtest.js is an explicitly replaced build adapter. The raw
      // version remains evidence and is never loaded by the standalone editor.
      if (entry.path.endsWith('/editor-playtest.js')) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), match[1]))) throw Error('Missing import: ' + entry.path + ' -> ' + match[1]);
    }
    count++; size += entry.bytes;
  }
}
const core = await import('../packages/map-core/index.js');
const editorAssets = checkEditorAssets(root,sources,tracked);
if(fs.readFileSync(path.join(root,'packages/prefab-core/catalogue.js'),'utf8')!==prefabCatalogueSource())throw Error('Building registry differs from the pinned native geometry and source plans.');
if (globalThis.document || globalThis.window) throw Error('Run checks in a headless Node environment.');
const demo = (await import('../packages/map-core/example.js')).exampleYard();
const errors = core.validateMap(demo); if (errors.length) throw Error('Example map: ' + errors.join(' '));
const review = JSON.parse(fs.readFileSync(path.join(root, sources.rulesReview.manifest)));
if (tracked && !tracked.has(sources.rulesReview.manifest)) throw Error('Rules source review is not tracked by Git.');
for (const source of review.sources) {
  if (!/^[a-f0-9]{40}$/.test(source.commit)) throw Error('Invalid rules source pin.');
  for (const entry of source.files) if (entry.identicalImportedFile) {
    const data = fs.readFileSync(path.join(root, entry.identicalImportedFile));
    if (data.length !== entry.bytes || createHash('sha256').update(data).digest('hex') !== entry.sha256) throw Error('Rules review/source mismatch: ' + entry.path);
  }
}
const visited = new Set();
function ruleClosure(file) {
  if (visited.has(file)) return; visited.add(file);
  if (!file.startsWith(root + path.sep) || /[\\/]three[.]/.test(file)) throw Error('Rules must be self-contained and renderer-independent.');
  if (tracked && !tracked.has(path.relative(root, file).replaceAll('\\', '/'))) throw Error('Rules dependency is not tracked by Git: ' + file);
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
    if (!match[1].startsWith('.')) throw Error('Rules cannot depend on an external runtime: ' + match[1]);
    ruleClosure(path.resolve(path.dirname(file), match[1]));
  }
}
for (const entry of ['index.js', 'dialogue.js', 'aft-compat.js']) ruleClosure(path.join(root, 'packages/rules-core', entry));
await import('../packages/rules-core/index.js');
const encounter = (await import('../packages/rules-core/example.js')).exampleEncounter();
if (!encounter.attack.ok || encounter.guard.resources.hp.current !== 50) throw Error('Rules example failed.');
if (core.ENGINE_VERSION !== JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version) throw Error('Engine version mismatch.');
console.log('Verified ' + count + ' pinned source files (' + Math.round(size / 1024 / 1024) + ' MiB), module closure, ' + editorAssets.length + ' editor assets, headless map/rules APIs, examples and rules-source evidence.');
