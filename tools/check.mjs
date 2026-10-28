import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json')));
let count = 0, size = 0;
for (const donor of ['aft', 'farmyard']) {
  const folder = path.join(root, sources[donor].root), manifest = JSON.parse(fs.readFileSync(path.join(folder, 'provenance.json')));
  if (manifest.commit !== sources[donor].commit) throw Error('Source pin mismatch: ' + donor);
  for (const entry of manifest.files) {
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
if (globalThis.document || globalThis.window) throw Error('Run checks in a headless Node environment.');
const demo = (await import('../packages/map-core/example.js')).exampleYard();
const errors = core.validateMap(demo); if (errors.length) throw Error('Example map: ' + errors.join(' '));
console.log('Verified ' + count + ' pinned source files (' + Math.round(size / 1024 / 1024) + ' MiB), complete module closure, headless API and example geometry.');
