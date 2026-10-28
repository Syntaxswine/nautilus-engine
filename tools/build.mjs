import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {exampleYard} from '../packages/map-core/example.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw Error('Invalid build directory.');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json')));
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
fs.rmSync(output, {recursive: true, force: true}); fs.mkdirSync(output, {recursive: true});
function write(name, data) {const dest = path.join(output, name);fs.mkdirSync(path.dirname(dest), {recursive: true});fs.writeFileSync(dest, data);}
const patches = [];
const storage = [
  ['animal-factory-tactics-3d-designs-v1','nautilus-engine-designs-v1'],
  ['animal-factory-tactics-3d-saves-v1','nautilus-engine-playtests-v1'],
  ['animal-factory-campaign-saves-v1','nautilus-engine-campaigns-v1'],
  ['animal-factory-tactics-3d:options:v1','nautilus-engine:options:v1'],
  ['animal-factory-environment-preview-v1','nautilus-engine-environment-preview-v1'],
  ['animal-factory-overmap-sketch-v1','nautilus-engine-overmap-sketch-v1'],
  ['aft-map-library-folder','nautilus-engine-map-library-folder'],
  ['animal-factory-maps','nautilus-engine-maps']
];
function once(text, needle, replacement, label) {if (!text.includes(needle)) throw Error('Upstream changed: ' + label);return text.replace(needle, replacement);}
for (const donor of ['aft', 'farmyard']) {
  const folder = sources[donor].root, manifest = JSON.parse(fs.readFileSync(path.join(root, folder, 'provenance.json')));
  for (const entry of manifest.files) {
    if (entry.path.startsWith('tests/')) continue;
    const source = fs.readFileSync(path.join(root, folder, entry.path)); let data = source;
    if (/\.js$/.test(entry.path)) {
      let text = source.toString();
      for (const [original, replacement] of storage) text = text.replaceAll(original, replacement);
      if (donor === 'aft' && entry.path.endsWith('/editor-playtest.js')) text = `import {parseMap} from './core/maps.js';\nexport function launchPlaytest(json){parseMap(json);if(!window.nautilus?.hasGameAdapter)throw Error('Connect a game adapter, or export this map as JSON.');return window.nautilus.sendToGame(json);}\n`;
      if (donor === 'aft' && entry.path.endsWith('/editor-3d-tools.js')) {
        text = once(text, 'Playtest ↗', 'Send to game', 'game handoff button');
        text = once(text, "$('playtest').disabled=!!d.block", "$('playtest').disabled=!!d.block||!window.nautilus?.hasGameAdapter", 'game handoff availability');
      }
      if (donor === 'aft' && entry.path.endsWith('/editor-workbench.js')) text = once(text, '▶ Playtest', 'Send to game', 'workbench handoff button');
      if (donor === 'aft' && entry.path.endsWith('/editor-3d.js')) text = once(text, "await open(JSON.stringify(blankMap('New design')));return;", "const response=await fetch('./nautilus-example.json');if(!response.ok)throw Error('Example yard could not load.');await open(await response.text());return;", 'opening example');
      data = Buffer.from(text);
    }
    if (!data.equals(source)) patches.push({path:folder + '/' + entry.path, sourceSha256:entry.sha256, builtSha256:createHash('sha256').update(data).digest('hex')});
    write(folder + '/' + entry.path, data);
  }
  write(folder + '/provenance.json', JSON.stringify(manifest, null, 2));
}
fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true});
write('upstream.json', JSON.stringify(sources, null, 2));
write('.openai/hosting.json', fs.readFileSync(path.join(root, '.openai/hosting.json')));
write('NOTICE.md', fs.readFileSync(path.join(root, 'NOTICE.md')));
const base = sources.aft.root + '/dist/tactics/';
const toRoot = '../../../../../';
let html = fs.readFileSync(path.join(root, base, 'editor-3d.html'), 'utf8');
html = once(html, '<head>', '<head><base href="./' + base + '">', 'document base');
html = html.replace(/<title>.*?<\/title>/, '<title>Nautilus Engine · Map Workshop</title>');
html = html.replace(/<header>[\s\S]*?<\/header>/, `<header class="nautilus-header"><a class="engine-brand" href="#" aria-label="Nautilus Engine"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 34C47 15 32 3 17 8S0 31 13 40c11 8 25-1 22-13-2-9-14-12-19-5-4 7 2 13 7 10 4-2 2-7-1-6"/><path class="shell-ribs" d="M32 10l-8 8M17 8l3 11M7 16l10 7M5 29l11-1M13 40l6-10M26 42l-3-11"/></svg><span><strong>Nautilus Engine</strong><small>MAP WORKSHOP</small></span></a><span class="engine-edition">Shared worlds. Individual games.</span><nav aria-label="Workshop actions"><button id="nautilus-example">Example yard</button><button id="nautilus-options" aria-controls="nautilus-properties" aria-expanded="false">Tool options</button><button id="nautilus-help">About & shortcuts</button><span class="engine-version">v${version}</span></nav></header>`);
html = once(html, '</head>', '<link rel="stylesheet" href="' + toRoot + 'app/editor.css"></head>', 'Nautilus theme');
html = once(html, '</body>', '<script type="module" src="' + toRoot + 'app/editor.js"></script></body>', 'Nautilus host bridge');
write('index.html', html);
write(base + 'nautilus-example.json', JSON.stringify(exampleYard()));
for (const name of ['editor.js', 'editor.css']) write('app/' + name, fs.readFileSync(path.join(root, 'apps/editor', name), 'utf8').replaceAll('__FARMYARD__', sources.farmyard.root + '/sites/tactical-animal/dist'));
write('build-provenance.json', JSON.stringify({engineVersion: version, sources, adaptations:['Nautilus title and navigation','Isolated browser storage namespaces','Game-adapter handoff instead of bundled combat runtime','Authored opening yard','Farmyard switch and map-frame materials'], patches}, null, 2));
console.log('Built Nautilus Engine ' + version + ': independent editor, headless map core, ' + patches.length + ' recorded deployment patches.');
