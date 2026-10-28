import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const repo = option('--repo'), requested = option('--commit'), donor = option('--donor');
if (!repo || !requested || !['aft', 'aft-assets', 'farmyard'].includes(donor)) throw Error('Use --donor aft|aft-assets|farmyard --repo <checkout> --commit <full reviewed SHA> [--write].');
if (!/^[a-f0-9]{40}$/.test(requested)) throw Error('Pin a full commit SHA.');
const git = args => execFileSync('git', ['-c', 'safe.directory=' + path.resolve(repo).replaceAll('\\', '/'), '-C', repo, ...args], {maxBuffer: 1024 * 1024 * 768, windowsHide: true});
const commit = git(['rev-parse', requested + '^{commit}']).toString().trim();
const prefix = donor.startsWith('aft') ? 'dist/' : 'sites/tactical-animal/dist/';
const inventory = new Map();
for (const record of git(['ls-tree', '-r', '-z', commit, prefix, ...(donor === 'aft' ? ['tests'] : [])]).toString().split('\0').filter(Boolean)) {
  const [meta, name] = record.split('\t');
  const [mode, type, oid] = meta.split(' ');
  if (type === 'blob') inventory.set(name, {oid, mode});
}
function readBatch(names) {
  const out = execFileSync('git', ['-c', 'safe.directory=' + path.resolve(repo).replaceAll('\\', '/'), '-C', repo, 'cat-file', '--batch'], {input: names.map(name => inventory.get(name).oid).join('\n') + '\n', maxBuffer: 1024 * 1024 * 768, windowsHide: true});
  const result = new Map(); let at = 0;
  for (const name of names) {
    const end = out.indexOf(10, at), header = out.subarray(at, end).toString(), size = Number(header.split(' ')[2]);
    if (!Number.isSafeInteger(size)) throw Error('Cannot read Git blob for ' + name);
    at = end + 1; result.set(name, out.subarray(at, at + size)); at += size + 1;
  }
  return result;
}
const texts = readBatch([...inventory.keys()].filter(name => /\.(?:m?js|css|html)$/.test(name)));
const selected = new Set(), missing = new Set();
const extensions = /\.(?:m?js|css|html|json|png|webp|jpe?g|svg|gif|glb|gltf|bin|wasm|ogg|wav|mp3|woff2?|ttf|txt)$/i;
const normalize = (from, value) => path.posix.normalize(path.posix.join(path.posix.dirname(from), value.split(/[?#]/)[0]));
function candidate(from, value, required = false) {
  if (!value || /^(?:https?:|data:|blob:|\/|#)/.test(value) || value === './' || value === '../') return;
  if (/^(?:dist|tests)\//.test(value) && inventory.has(value)) return include(value);
  const name = normalize(from, value);
  if (!name.startsWith(prefix) && !(donor === 'aft' && name.startsWith('tests/'))) return;
  if (name.endsWith('.html') && name !== prefix + 'tactics/editor-3d.html') return;
  if (inventory.has(name)) return include(name);
  if (value.includes('${')) {
    const pattern = new RegExp('^' + name.split(/\$\{[^}]+\}/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$');
    for (const file of inventory.keys()) if (pattern.test(file)) include(file);
  } else if (value.endsWith('/') && value.startsWith('./')) {
    for (const file of inventory.keys()) if (file.startsWith(name.replace(/\/$/, '') + '/') && extensions.test(file)) include(file);
  } else if (required) missing.add(from + ' -> ' + value);
}
function include(name) {
  if (selected.has(name)) return;
  selected.add(name);
  // This upstream file is retained verbatim. The deployed editor replaces it
  // with Nautilus's host-adapter bridge, so no combat application is imported.
  if (name === prefix + 'tactics/editor-playtest.js') return;
  const text = texts.get(name)?.toString(); if (!text) return;
  if (/\.m?js$/.test(name)) for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)) candidate(name, m[1], true);
  if (name.endsWith('.html')) for (const m of text.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) if (extensions.test(m[1].split(/[?#]/)[0])) candidate(name, m[1], true);
  if (name.endsWith('.css')) for (const m of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) candidate(name, m[1], true);
  for (const m of text.matchAll(/(['"`])([^'"`\r\n]+?)\1/g)) if (extensions.test(m[2]) || /^\.\.?\//.test(m[2]) && m[2].includes('${') || m[2].startsWith('./') && m[2].endsWith('/')) candidate(name, m[2]);
}
const machinePaints = ['lathe-paint-v1.png','mill-paint-v1.png','press-paint-v2.png'].map(name => 'dist/assets/environment/factory-machines/' + name);
if (donor === 'aft-assets') {
  // Supplemental closure for the existing immutable snapshot. These paths
  // are constructed by string concatenation in factory-machine-paint.js.
  for (const name of machinePaints) {if (!inventory.has(name)) throw Error('Missing machine paint: ' + name);include(name);}
} else if (donor === 'aft') {
  for (const file of ['tactics/editor-3d.html', 'tactics/editor-3d-controller.js', 'tactics/editor-3d-generator.js', 'tactics/block-generator.js', 'tactics/core/maps.js', 'tactics/core/blocks.js', 'tactics/core/connections.js', 'tactics/core/feature-plan.js']) include(prefix + file);
  for (const name of inventory.keys()) if (/^dist\/tactics\/[^/]+-10k-data\.json$/.test(name) || /^dist\/assets\/characters\/lowpoly-proof\/[^/]+-(?:underlay|tail|red-hat)-paint-v1\.png$/.test(name) || name.startsWith('dist/tactics/sector-library/') && extensions.test(name) || name.startsWith('dist/tactics/vendor/') && /(?:license|notice)/i.test(name)) include(name);
  for (const name of ['editor-3d-editing', 'editor-3d', 'tactics-blocks', 'tactics-connections', 'tactics-feature-plan']) include('tests/' + name + '.test.mjs');
  for (const name of machinePaints) if (inventory.has(name)) include(name);
} else {
  for (const name of ['industrial-switches.css', 'map-frame.css', 'assets/ui/industrial-switches/switch-skins-v2.webp', 'assets/ui/industrial-switches/map-frame-v1.webp', 'assets/ui/industrial-switches/manifest.json']) include(prefix + name);
}
if (missing.size) throw Error('Unresolved dependencies:\n' + [...missing].join('\n'));
const names = [...selected].sort();
const bytes = readBatch(names);
const destination = path.join(root, 'vendor', donor, commit);
const files = names.map(name => {
  const data = bytes.get(name); if (!data) throw Error('Missing tracked source: ' + name);
  return {path: name, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length};
});
const manifest = {schemaVersion: 1, donor, repository: 'https://github.com/Syntaxswine/' + (donor.startsWith('aft') ? 'animal-factory-tactics-3d' : 'farmyard-commando'), commit, sourcePrefix: prefix, files, adaptations: 'None in vendor. Deployment-only patches and Nautilus adapters are separate.', rightsStatus: 'Original embedded licenses retained. Source provenance does not add a license grant.'};
if (process.argv.includes('--write')) {
  if (fs.existsSync(destination)) throw Error('This immutable snapshot already exists; use a new reviewed pin.');
  for (const name of names) { const file = path.join(destination, name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, bytes.get(name)); }
  fs.writeFileSync(path.join(destination, 'provenance.json'), JSON.stringify(manifest, null, 2) + '\n');
}
console.log(JSON.stringify({donor, commit, files: files.length, bytes: files.reduce((sum, f) => sum + f.bytes, 0), written: process.argv.includes('--write')}));
