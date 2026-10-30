import {distribution} from './distribution.mjs';
import {moduleReferencesBatch,moduleReferenceGraph,resolveModuleFile} from './module-references.mjs';
import {checkSharedAssets} from './shared-assets.mjs';
import fs from 'node:fs';
import {checkSearchHalo} from './check-search-halo.mjs';
import {verifyFarmyardGrenadeIntake} from './intake-farmyard-grenades.mjs';
import {checkGrenadeVisuals} from './check-grenade-visuals.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {checkEditorAssets} from './editor-assets.mjs';
import {prefabCatalogueSource} from './prefab-catalog.mjs';
import {originalCatalogueSource} from './prefab-original-catalog.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json')));
let count = 0, size = 0;
const pinnedModules = [];
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
    // editor-playtest.js is an explicitly replaced build adapter. Its raw
    // source remains evidence and is never loaded by the standalone editor.
    if (/\.m?js$/.test(file) && !entry.path.endsWith('/editor-playtest.js')) pinnedModules.push({filename:file,source:data.toString(),entry:entry.path});
    count++; size += entry.bytes;
  }
}
for (const [index,record] of moduleReferencesBatch(pinnedModules).entries()) for (const specifier of record.specifiers) {
  const dependency=resolveModuleFile(specifier,record.filename);
  if (dependency!==null && !fs.existsSync(dependency)) throw Error('Missing import: '+pinnedModules[index].entry+' -> '+specifier);
}
const haloEvidence = checkSearchHalo(root, sources, tracked);
const core = await import('../packages/map-core/index.js');
const editorAssets = checkEditorAssets(root,sources,tracked);
if(fs.readFileSync(path.join(root,'packages/prefab-core/catalogue.js'),'utf8')!==prefabCatalogueSource())throw Error('Building registry differs from the pinned native geometry and source plans.');
if(fs.readFileSync(path.join(root,'packages/prefab-core/original-catalogue.js'),'utf8')!==originalCatalogueSource())throw Error('Original building registry differs from reviewed source identities and full model envelopes.');
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
const ruleEntries = [];
function ruleClosure(file) { ruleEntries.push(file); }
for (const entry of ['index.js', 'dialogue.js', 'aft-compat.js', 'progression.js']) ruleClosure(path.join(root, 'packages/rules-core', entry));
ruleClosure(path.join(root, 'packages/map-core/wall-runs.js'));
ruleClosure(path.join(root, 'packages/items-core/index.js'));
ruleClosure(path.join(root, 'packages/grenades-core/index.js'));
ruleClosure(path.join(root, 'packages/grenades-core/aim.js'));
ruleClosure(path.join(root, 'packages/runtime-core/index.js'));
ruleClosure(path.join(root, 'packages/world-core/index.js'));
ruleClosure(path.join(root, 'packages/adapters/farmyard/rules.js'));
ruleClosure(path.join(root, 'packages/floor-navigation/index.js'));
for (const {filename:file} of moduleReferenceGraph(ruleEntries,{root})) {
  if (!file.startsWith(root + path.sep) || /[\\/]three[.]/.test(file)) throw Error('Rules must be self-contained and renderer-independent.');
  if (tracked && !tracked.has(path.relative(root,file).replaceAll('\\','/'))) throw Error('Rules dependency is not tracked by Git: '+file);
}
await import('../packages/runtime-core/index.js');
await import('../packages/world-core/index.js');
await import('../packages/adapters/farmyard/rules.js');
await import('../packages/floor-navigation/index.js');
await import('../packages/rules-core/index.js');
await import('../packages/rules-core/progression.js');
const encounter = (await import('../packages/rules-core/example.js')).exampleEncounter();
if (!encounter.attack.ok || encounter.guard.resources.hp.current !== 50) throw Error('Rules example failed.');
if (core.ENGINE_VERSION !== JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version) throw Error('Engine version mismatch.');
console.log('Verified ' + count + ' pinned source files (' + Math.round(size / 1024 / 1024) + ' MiB), module closure, '+editorAssets.length+' editor assets, headless map/rules/progression/items APIs, examples, rules-source evidence and '+haloEvidence.referenceFiles+' halo reference files / '+haloEvidence.runtimeModules+' shared rendering modules.');
await import('./check-building-catalog.mjs');

checkSharedAssets();
const grenadeEvidence=verifyFarmyardGrenadeIntake(root);
console.log('Verified pinned Farmyard grenade source and conformance closure: '+JSON.stringify(grenadeEvidence));
console.log('Verified native grenade source and derived modules: '+JSON.stringify(checkGrenadeVisuals(root,{tracked})));

if (JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'package.json'))).files)!==JSON.stringify(distribution().files)) throw Error('Package whitelist is stale; run node tools/distribution.mjs --write.');

const conformance = sources.tinderboxConformance, conformanceRoot = path.resolve(root, conformance.root);
const conformanceManifest = JSON.parse(fs.readFileSync(path.join(conformanceRoot,'provenance.json')));
if(conformanceManifest.commit!==conformance.commit)throw Error('Tinderbox conformance pin mismatch.');
for(const entry of conformanceManifest.files){
 const file=path.resolve(conformanceRoot,entry.path), relative=(conformance.root+'/'+entry.path);
 if(!file.startsWith(conformanceRoot+path.sep))throw Error('Invalid conformance fixture path.');
 const bytes=fs.readFileSync(file);if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Conformance source bytes changed: '+relative);
 if(tracked){if(!tracked.has(relative))throw Error('Untracked conformance source: '+relative);const indexed=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',':'+relative],{windowsHide:true});if(createHash('sha256').update(indexed).digest('hex')!==entry.sha256)throw Error('Git would alter conformance source bytes: '+relative);}
}


// Farmyard comparison sources are test-only; preserve exact Git-object bytes.
const farmyardPin=sources.farmyardRulesConformance;
const farmyardReview=JSON.parse(fs.readFileSync(path.join(root,farmyardPin.manifest)));
if(farmyardReview.consumer.commit!==farmyardPin.commit||farmyardReview.fixtureRoot!==farmyardPin.root)throw Error('Farmyard conformance source pin mismatch.');
let farmyardCopies=0;
for(const entry of farmyardReview.files.filter(item=>item.copied)){
  const file=path.resolve(root,entry.fixture),folder=path.resolve(root,farmyardPin.root);
  if(!file.startsWith(folder+path.sep))throw Error('Farmyard fixture path escapes its frozen root.');
  const data=fs.readFileSync(file);
  if(data.length!==entry.bytes||createHash('sha256').update(data).digest('hex')!==entry.sha256||createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex')!==entry.gitBlob)throw Error('Farmyard source fixture bytes changed: '+entry.fixture);
  if(tracked){if(!tracked.has(entry.fixture))throw Error('Untracked Farmyard source fixture: '+entry.fixture);const indexed=execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'show',':'+entry.fixture],{windowsHide:true});if(createHash('sha256').update(indexed).digest('hex')!==entry.sha256)throw Error('Git altered Farmyard fixture bytes: '+entry.fixture);}
  farmyardCopies++;
}
for(const profile of ['core','renderer','assets','compatibility'])if(distribution(profile).files.some(file=>file.startsWith('tests/fixtures/consumers/')))throw Error('A distribution includes test-only consumer fixtures.');
console.log('Verified '+farmyardCopies+' byte-preserved Farmyard conformance modules, kept outside runtime distributions.');
