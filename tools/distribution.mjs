import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {schemaDocuments} from '../packages/map-core/contract-manifest.js';
import {moduleReferenceGraph} from './module-references.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = path.join(root, 'package.json');
const slash = value => value.replaceAll('\\', '/');
const relative = file => slash(path.relative(root, file));
const sourcePackage = () => JSON.parse(fs.readFileSync(packagePath, 'utf8'));
function inside(file) { if (!file.startsWith(root + path.sep)) throw Error('Distribution dependency escapes the project: ' + file); }
export function moduleClosure(entries) {
  return moduleReferenceGraph(entries.map(entry=>path.resolve(root,entry)),{root}).map(record=>relative(record.filename)).sort();
}
function walk(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(folder, entry.name); return entry.isDirectory() ? walk(file) : [relative(file)];
  });
}
function resources() {
  const sources = JSON.parse(fs.readFileSync(path.join(root, 'upstream.json'))), base = sources.tinderboxPrefabs.root;
  return ['assets/buildings/painted-materials-v2.png', base + '/assets/art/gross-housing-v1/houses.json',
    ...['gross-housing-v1/clapboard-ivory-v1.png', 'gross-housing-v1/cedar-shingles-v1.png', 'gross-housing-v1/floorboards-oak-v1.png',
      'gross-housing-v1/wallpaper-botanical-v1.png', 'exposition-skins-v1/brick-sienna-v1.png', 'exposition-skins-v1/roof-slate-v1.png'].map(file => base + '/assets/art/' + file)];
}
const supportFiles = () => ['README.md', 'NOTICE.md', 'upstream.json', 'CHANGELOG.md', 'docs/compatibility.md', 'docs/distribution.md', 'docs/rock-distraction.md', 'docs/reviews/2026-10-29-rock-distraction.sources.json', 'docs/progression.md', 'docs/reviews/2026-10-29-basic-progression.md', 'docs/reviews/2026-10-29-basic-progression.sources.json',
  'docs/components/index.md', 'docs/components/bear-authoring.md',
  'docs/modular-foundation.md', 'docs/floor-navigation.md', 'docs/runtime-modules.md', 'docs/extended-world-core.md', 'docs/adapters/farmyard-rules.md', 'docs/reviews/2026-10-29-farmyard-rules.sources.json',
  ...schemaDocuments().map(item=>relative(fileURLToPath(item.url))), ...walk(path.join(root, 'schemas')), ...walk(path.join(root, 'vendor')).filter(file => /(?:^|\/)(?:license(?:\.[^/]+)?|[^/]*-license\.txt|copying(?:\.[^/]+)?|notice(?:\.[^/]+)?)$/i.test(file))];
export function distribution(profile = 'compatibility') {
  const source = sourcePackage(); let exports = source.exports, extras = [];
  if (profile === 'core') exports = Object.fromEntries(Object.entries(exports).filter(([id]) => !id.endsWith('/three') && !id.startsWith('./render-effects') && !id.startsWith('./floors/')));
  else if (profile === 'renderer') { exports = Object.fromEntries(Object.entries(exports).filter(([id]) => id.endsWith('/three') || id === './render-effects')); exports['.'] = './packages/assets/three.js'; extras = resources(); }
  else if (profile === 'assets') { exports = {'.': './packages/assets/files.js', './catalogue': './packages/assets/index.js'}; extras = walk(path.join(root, 'assets/buildings')).filter(file => !file.endsWith('.report.json') && !file.endsWith('.recipe.json')); }
  else if (profile === 'compatibility') extras = resources();
  else throw Error('Unknown package profile: ' + profile);
  const files = [...new Set([...moduleClosure(Object.values(exports)), ...extras, ...supportFiles()])].sort();
  if (profile === 'core' && files.some(file => /(?:^|\/)(?:three(?:\.module|\.core|\.tsl)?\.js|painted-[^/]+\.js)$/.test(file))) throw Error('Headless core distribution reaches renderer machinery.');
  for (const file of files) { inside(path.resolve(root, file)); if (!fs.existsSync(path.join(root, file))) throw Error('Missing distribution file: ' + file); }
  return {exports, files, name: profile === 'compatibility' ? source.name : '@nautilus-engine/' + (profile === 'assets' ? 'building-assets' : profile)};
}
function npm(args, cwd) {
  const npmCli = [process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')
  ].find(file => file && path.basename(file) === 'npm-cli.js' && fs.existsSync(file));
  if (!npmCli) throw Error('Run through npm, or use a Node installation containing npm, to create the offline distribution.');
  return execFileSync(process.execPath, [npmCli, ...args], {cwd, encoding:'utf8', windowsHide:true, maxBuffer:8*1024*1024});
}
export function packProfile(profile) {
  const {exports, files, name} = distribution(profile), source = sourcePackage(), output = path.join(root, 'artifacts/distribution');
  const stage = path.join(output, 'stage-' + profile); fs.mkdirSync(stage, {recursive:true});
  for (const file of files) { const destination = path.join(stage, file); fs.mkdirSync(path.dirname(destination), {recursive:true}); fs.copyFileSync(path.join(root, file), destination); }
  const manifest = {name, version: source.version, private:true, type:'module', description:source.description, engines:source.engines, exports,
    files:[...files, 'package-provenance.json']};
  fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(stage, 'package-provenance.json'), JSON.stringify({schemaVersion:1, profile, version:source.version,
    files:files.map(file=>({path:file,bytes:fs.statSync(path.join(root,file)).size,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))}, null, 2));
  const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', output], stage))[0];
  const result = {profile, name, version:source.version, file:path.join(output,packed.filename), compressedBytes:packed.size, unpackedBytes:packed.unpackedSize, fileCount:packed.entryCount, integrity:packed.integrity};
  fs.writeFileSync(path.join(output, profile + '-report.json'), JSON.stringify(result, null, 2)); return result;
}
export function testExternalPackage(profile='core') {
  if(!['core','assets'].includes(profile))throw Error('Unsupported external package proof profile.');
  const packed = packProfile(profile), consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'nautilus-consumer-'));
  try {
    fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({name:'nautilus-external-proof',private:true,type:'module'}));
    npm(['install', '--offline', '--ignore-scripts', '--package-lock=false', '--no-audit', '--no-fund', packed.file], consumer);
    if(profile==='core'){const pin=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))).tinderboxConformance.root;if(!/^tests\/fixtures\/consumers\/tinderbox\/[a-f0-9]{40}$/.test(pin))throw Error('Invalid conformance source pin.');fs.cpSync(path.join(root,pin),path.join(consumer,'tinderbox-proof'),{recursive:true});}
    if(profile==='core'){const pin=JSON.parse(fs.readFileSync(path.join(root,'upstream.json'))).farmyardRulesConformance.root;if(!/^tests\/fixtures\/consumers\/farmyard-rules\/[a-f0-9]{40}$/.test(pin))throw Error('Invalid Farmyard conformance source pin.');fs.cpSync(path.join(root,pin),path.join(consumer,'farmyard-proof'),{recursive:true});}
    const test = profile==='assets' ? `import assert from 'node:assert/strict';
import fs from 'node:fs';
import {listBuildingAssets,buildingAssetURLs} from '@nautilus-engine/building-assets';
const assets=listBuildingAssets();assert.equal(assets.length,48);
for(const asset of assets){const files=buildingAssetURLs(asset.id);const model=JSON.parse(fs.readFileSync(new URL(files.model)));
assert.equal(model.asset.version,'2.0');assert.equal(new URL(model.buffers[0].uri,files.model).href,files.buffer);assert.equal(new URL(model.images[0].uri,files.model).href,files.atlas);
for(const name of ['buffer','blueprint','atlas'])assert.ok(fs.statSync(new URL(files[name])).size>0);}
console.log('Installed optional asset package: all 48 model, binary, blueprint and atlas URLs resolve.');` : `import assert from 'node:assert/strict';
import {createMapDocument,createSave,parseSave,serializeSave,engineManifest,schemaDocuments,createSlopedRoof,ROOF_FEATURE,blueprintRequirements,negotiateCapabilities} from '@nautilus-engine/core';
import {createTinderboxScene,saveTinderboxScene,loadTinderboxScene,exportNautilusMap} from '@nautilus-engine/core/adapters/tinderbox';
import fs from 'node:fs';
import {compileModules} from './tinderbox-proof/src/content/exterior-kit.js';
import {createSimulation} from './tinderbox-proof/src/simulation/index.js';
for(const schema of schemaDocuments())assert.equal(JSON.parse(fs.readFileSync(new URL(schema.url))).$id,schema.uri);
const document=createMapDocument('External package proof');
assert.equal(document.apply({tool:'floor',start:{x:10,y:10,z:0},end:{x:11,y:11,z:0}}).ok,true);
assert.equal(document.undo(),true);assert.equal(document.redo(),true);
assert.equal(document.apply({tool:'wall-run',start:{x:13,y:3,z:0},end:{x:13,y:10,z:0},options:{exact:true,stories:1,material:'brick'}}).ok,true);
const map=JSON.parse(document.export()), save=parseSave(serializeSave(createSave(map)));
assert.deepEqual(save.payload.data,map);assert.equal(engineManifest().contractVersion,1);
const roofDocument=createMapDocument('Installed roof proof');
assert.equal(roofDocument.apply({tool:'sloped-roof',options:{exact:true,x:40,y:40,width:12,depth:8,eaves:1,style:'hip',axis:'x',direction:1,pitch:35,overhang:.3,material:'clay',seed:0}}).ok,true);
const roofMap=JSON.parse(roofDocument.export()),roofSave=parseSave(serializeSave(createSave(roofMap)));
assert.deepEqual(roofSave.payload.data,roofMap);assert.ok(createSlopedRoof(roofMap.slopedRoofs.roofs[0]).indices.length>0);
const roofless=engineManifest();roofless.capabilities=roofless.capabilities.filter(feature=>feature.id!==ROOF_FEATURE);
assert.equal(negotiateCapabilities(blueprintRequirements(roofMap),roofless).ok,false);

const scene=createTinderboxScene(map,{region:{x:0,y:0,width:20,height:16},playerStart:0,markerPolicy:'select-player-preserve-markers',outsidePolicy:'require-unmodified-yard',seed:1947});
assert.deepEqual(exportNautilusMap(loadTinderboxScene(saveTinderboxScene(scene))),map);
const restored=loadTinderboxScene(saveTinderboxScene(scene));assert.equal(compileModules(scene.scenario.modules,scene.scenario).obstacles.length,1);
function replay(project){const sim=createSimulation({scenario:project.scenario,seed:project.policy.seed,config:{input:{cameraRelative:false}}});try{sim.dispatch({type:'move',x:1,y:0});let state;for(let tick=0;tick<300;tick++)state=sim.advance(1/60);return state;}finally{sim.dispose();}}
const state=replay(scene);assert.ok(state.player.x>10&&state.player.x<=13.5-.08-.56+1e-8);assert.deepEqual(replay(restored),state);
assert.equal(typeof globalThis.window,'undefined');console.log('Installed external core and actual pinned Tinderbox compiler/simulation: authoring, collision, saves and replay pass.');`;
    fs.writeFileSync(path.join(consumer,'proof.mjs'), test + (profile==='core' ? '\n' + fs.readFileSync(path.join(root,'tests/fixtures/items/rock-package-proof.mjs'),'utf8') + '\n' + fs.readFileSync(path.join(root,'tests/fixtures/progression/package-proof.mjs'),'utf8') + '\n' + fs.readFileSync(path.join(root,'tests/fixtures/modules/package-proof.mjs'),'utf8') : ''));
    const output = execFileSync(process.execPath, ['proof.mjs'], {cwd:consumer,encoding:'utf8',windowsHide:true});
    return {...packed, proof:output.trim()};
  } finally {
    const resolved = fs.realpathSync(consumer), temp = fs.realpathSync(os.tmpdir());
    if (!resolved.startsWith(temp + path.sep) || !path.basename(resolved).startsWith('nautilus-consumer-')) throw Error('Refusing cleanup of an unexpected external proof directory.');
    fs.rmSync(resolved, {recursive:true,force:true});
  }
}
const invoked = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  if (process.argv.includes('--write')) { const pkg=sourcePackage();pkg.files=distribution().files;fs.writeFileSync(packagePath,JSON.stringify(pkg,null,2)+'\n');console.log('Updated explicit compatibility-package file whitelist.'); }
  else if (process.argv.includes('--check')) { if (JSON.stringify(sourcePackage().files)!==JSON.stringify(distribution().files)) throw Error('Package whitelist is stale; run node tools/distribution.mjs --write.');console.log('Verified explicit distributable files and runtime dependency closure.'); }
  else if (process.argv.includes('--test-assets')) console.log(JSON.stringify(testExternalPackage('assets'),null,2));
  else if (process.argv.includes('--test')) console.log(JSON.stringify(testExternalPackage(),null,2));
  else { const option=process.argv.indexOf('--profile'); console.log(JSON.stringify(packProfile(option<0?'core':process.argv[option+1]),null,2)); }
}
