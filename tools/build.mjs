import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {exampleYard} from '../packages/map-core/example.js';
import {adaptWallEditor} from './editor-wall-adapter.mjs';
import {LAUNCH_PLAYTEST, SEND_CLICK} from './editor-game-handoff.mjs';
import {editorAssets} from '../apps/editor/asset-catalog.js';
import {adaptEditorPrefabs} from './editor-prefab-adapter.mjs';
import {adaptEditorRoofs} from './editor-roof-adapter.mjs';
import {BUILDING_ASSETS,GROSS_BUILDING_ASSETS,PREFAB_CATALOGUE,COMBINED_PREFAB_CATALOGUE,ORIGINAL_BUILDING_SOURCE} from '../packages/prefab-core/index.js';
import {verifyBuild} from './verify-build.mjs';
import './build-building-assets.mjs';
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
for (const donor of ['aft', 'farmyard', 'aftAssets', 'tinderboxPrefabs']) {
  const folder = sources[donor].root, manifest = JSON.parse(fs.readFileSync(path.join(root, folder, 'provenance.json')));
  for (const entry of manifest.files) {
    if (entry.path.startsWith('tests/')) continue;
    const source = fs.readFileSync(path.join(root, folder, entry.path)); let data = source;
    if (/\.js$/.test(entry.path)) {
      let text = source.toString();
      for (const [original, replacement] of storage) text = text.replaceAll(original, replacement);
      if (donor === 'aft' && entry.path.endsWith('/editor-playtest.js')) text = LAUNCH_PLAYTEST;
      if (donor === 'aft' && entry.path.endsWith('/editor-3d-tools.js')) {
        text = once(text, 'Playtest ↗', 'Send to game', 'game handoff button');
        text = once(text, "$('playtest').disabled=!!d.block", "$('playtest').disabled=!!d.block||!window.nautilus?.hasGameAdapter", 'game handoff availability');
      }
      if (donor === 'aft' && entry.path.endsWith('/editor-workbench.js')) {
        text = once(text, '▶ Playtest', 'Send to game', 'workbench handoff button');
        text = once(text, "import {tilePreview} from './editor-tool-previews.js';", "import {terrainSwatch} from '../../../../../app/asset-swatches.js';", 'shared terrain swatch adapter');
        text = once(text, "const img=new Image();img.src=tilePreview(item.id);img.alt='';", "const img=terrainSwatch(item.id);", 'atlas-backed biome swatches');
      }
      if (donor === 'aft' && entry.path.endsWith('/factory-machine-paint.js')) text = once(text, "'../assets/environment/factory-machines/'", "new URL('../../../../../" + sources.aftAssets.root + "/dist/assets/environment/factory-machines/',import.meta.url).href", 'supplemental factory machine paint');
      if (donor === 'aft' && entry.path.endsWith('/editor-3d.js')) text = once(text, "await open(JSON.stringify(blankMap('New design')));return;", "const response=await fetch('./nautilus-example.json');if(!response.ok)throw Error('Example yard could not load.');await open(await response.text());return;", 'opening example');
      if (donor === 'aft') text = adaptWallEditor(entry.path, text, once);
      if (donor === 'aft') text = adaptEditorPrefabs(entry.path,text,once);
      if (donor === 'aft') text = adaptEditorRoofs(entry.path,text,once);
      // The deployed Send click is the text tests/editor-host-bridge.test.mjs runs.
      if (donor === 'aft' && (entry.path.endsWith('/editor-playtest.js') ? text !== LAUNCH_PLAYTEST : entry.path.endsWith('/editor-3d-tools.js') && text.split(SEND_CLICK).length !== 2)) throw Error('The deployed Send click differs from the tested one: ' + entry.path);
      data = Buffer.from(text);
    }
    if (!data.equals(source)) patches.push({path:folder + '/' + entry.path, sourceSha256:entry.sha256, builtSha256:createHash('sha256').update(data).digest('hex')});
    write(folder + '/' + entry.path, data);
  }
  write(folder + '/provenance.json', JSON.stringify(manifest, null, 2));
}
fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true});
fs.cpSync(path.join(root, 'schemas'), path.join(output, 'schemas'), {recursive: true});
// Keep reproducible Node-only review tools in source; deploy reports and images.
fs.cpSync(path.join(root, 'docs'), path.join(output, 'docs'), {recursive: true,filter:source=>!source.endsWith('.mjs')});
fs.cpSync(path.join(root, 'examples'), path.join(output, 'examples'), {recursive: true});
const haloManifest=JSON.parse(fs.readFileSync(path.join(root,sources.searchHalo.root,'provenance.json')));
write(sources.searchHalo.root+'/provenance.json',JSON.stringify(haloManifest,null,2));
const renderEffects={sourceCommit:sources.searchHalo.commit,referenceManifest:sources.searchHalo.root+'/provenance.json',examples:fs.readdirSync(path.join(root,'examples')).map(name=>({path:'examples/'+name,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,'examples',name))).digest('hex')})),files:fs.readdirSync(path.join(root,'packages/render-effects')).map(name=>({path:'packages/render-effects/'+name,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,'packages/render-effects',name))).digest('hex')}))};
fs.cpSync(path.join(root, 'assets/buildings'), path.join(output, 'assets/buildings'), {recursive: true});
fs.cpSync(path.join(root, 'apps/buildings'), path.join(output, 'buildings'), {recursive: true});
write('buildings/references.json', fs.readFileSync(path.join(root, 'art/buildings/reference-register.json')));
write('upstream.json', JSON.stringify(sources, null, 2));
write('.openai/hosting.json', fs.readFileSync(path.join(root, '.openai/hosting.json')));
write('NOTICE.md', fs.readFileSync(path.join(root, 'NOTICE.md')));
const base = sources.aft.root + '/dist/tactics/';
const toRoot = '../../../../../';
let html = fs.readFileSync(path.join(root, base, 'editor-3d.html'), 'utf8');
html = once(html, '<head>', '<head><base href="./' + base + '">', 'document base');
html = html.replace(/<title>.*?<\/title>/, '<title>Nautilus Engine · Map Workshop</title>');
html = html.replace(/<header>[\s\S]*?<\/header>/, `<header class="nautilus-header"><a class="engine-brand" href="#" aria-label="Nautilus Engine"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 34C47 15 32 3 17 8S0 31 13 40c11 8 25-1 22-13-2-9-14-12-19-5-4 7 2 13 7 10 4-2 2-7-1-6"/><path class="shell-ribs" d="M32 10l-8 8M17 8l3 11M7 16l10 7M5 29l11-1M13 40l6-10M26 42l-3-11"/></svg><span><strong>Nautilus Engine</strong><small>MAP WORKSHOP</small></span></a><span class="engine-edition">Shared worlds. Individual games.</span><nav aria-label="Workshop actions"><button id="nautilus-example">Example yard</button><button id="nautilus-options" aria-controls="nautilus-properties" aria-expanded="false">Tool options</button><button id="nautilus-help">About & shortcuts</button><span class="engine-version">v${version}</span></nav></header>`);
html = once(html, '</head>', '<link rel="stylesheet" href="' + toRoot + 'app/editor.css"><script src="' + toRoot + 'app/runtime-errors.js"></script></head>', 'Nautilus theme and failure reporting');
html = once(html, '</body>', '<script type="module" src="' + toRoot + 'app/editor.js"></script></body>', 'Nautilus host bridge');
write('index.html', html);
write(base + 'nautilus-example.json', JSON.stringify(exampleYard()));
for (const name of fs.readdirSync(path.join(root, 'apps/editor')).filter(name => /\.(js|css)$/.test(name))) write('app/' + name, fs.readFileSync(path.join(root, 'apps/editor', name), 'utf8').replaceAll('../../vendor/', '../vendor/').replaceAll('../../packages/', '../packages/').replaceAll('__AFT__', sources.aft.root).replaceAll('__FARMYARD__', sources.farmyard.root + '/sites/tactical-animal/dist'));
const assets = editorAssets();
write('editor-assets.json', JSON.stringify({schemaVersion:1, sources:{aft:sources.aft.commit,farmyard:sources.farmyard.commit,aftAssets:sources.aftAssets.commit}, assets}, null, 2));
write('building-prefabs.json',JSON.stringify({schemaVersion:2,catalogue:COMBINED_PREFAB_CATALOGUE,catalogues:[{id:PREFAB_CATALOGUE,source:sources.tinderboxPrefabs,assets:GROSS_BUILDING_ASSETS.map(a=>a.id)},{id:COMBINED_PREFAB_CATALOGUE,sources:{gross:sources.tinderboxPrefabs,original:ORIGINAL_BUILDING_SOURCE},assets:BUILDING_ASSETS.map(a=>a.id)}],assets:BUILDING_ASSETS},null,2));
write('build-provenance.json', JSON.stringify({engineVersion: version, sources, renderEffects, editorAssets:{catalog:'editor-assets.json',count:assets.length}, buildingPrefabs:{catalog:'building-prefabs.json',count:BUILDING_ASSETS.length,catalogues:[PREFAB_CATALOGUE,COMBINED_PREFAB_CATALOGUE],originalSourceCommit:ORIGINAL_BUILDING_SOURCE.commit}, adaptations:['Nautilus title and navigation','Isolated browser storage namespaces','Game-adapter handoff instead of bundled combat runtime','Authored opening yard','Farmyard switch and map-frame materials','Portable native-scale wall runs, measured wall tools, oriented preview and block preservation','Optional reviewed golden contour effect and standalone example','Catalog-derived asset library with inspection-scene previews','Biome swatches sample the pinned ground atlas','Whole-building prefab references, native shared-renderer assemblies and deterministic lot placement'], patches}, null, 2));
const modules=await verifyBuild(output,patches);
console.log('Built Nautilus Engine ' + version + ': independent editor, headless map and rules cores, ' + patches.length + ' recorded deployment patches; '+modules+' module paths checked and own/adapted scripts syntax-checked.');
