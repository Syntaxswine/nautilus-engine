// Exact optional player registration above the historical artwork/railway
// checks. Known current bytes are authenticated before exposing old preimages.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {npmFilePatterns} from './npm-files.mjs';
import {checkVehicleRegistration,historicalVehicleBytes} from './vehicle-registration.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sha=b=>createHash('sha256').update(b).digest('hex');
export const PLAYER_SETUP_BASE='3165bd2741884f67030f034f056b6fa6abd6e9e7';
export const PLAYER_SETUP_REVIEW='62f2fe90210b10985f80d75d9e4425f424a51c6b';
export const PLAYER_UI_REVIEW='578a86113395ea3ebcb76c636ce8f0882600d03e';
export function reviewedTrainSource(file){return ['packages/train-ui/index.js','packages/train-ui/index.d.ts'].includes(file)?PLAYER_UI_REVIEW:'d99fcf85256c90474cf570185159669caaed8070';}
export const PLAYER_COMPATIBILITY_BASE='7f50cb2a48aef87a16fc0465997549be9ed88dc2';
export const NATIVE_GAIT_PIN='279d2d34786b3e6e5c5baeeac6898e60030afdbe';
export const NATIVE_GAIT_ROOT='vendor/farmyard-native-gait/'+NATIVE_GAIT_PIN;
const preimagesFile='docs/reviews/player-setup/registration-preimages.json',preimagesSha='85696a7f36ec88994ecd96dfcc471bca530f83309aea0546e3eb1a38561688e0';
export const PLAYER_REGISTRATION_MANIFEST='docs/reviews/player-setup/registration.json';
const metadataSha='793ca0a2f2083cbc3b24e96be6cd8ed9d6c44e211ed164d7ec9beccf086b88bb';
// Exact source-only C1 fixture correction. These fixed rows grant no runtime
// exception; old collector preimages and every recovery assertion stay intact.
const c1Fixture={path:'tools/c1-checkpoint-fixture.mjs',bytes:1943,sha256:'1d342b98c55ea03411a0c9ad6bf92a8efcd1404b2ad1759590807e536baf7161'};
const c1Collector={path:'tools/editor-review-tile-authoring-c1.mjs',beforeSha256:'c82972f3208f09704a9b275495c359148e0cef011424d6e6501e783687c168ee',bytes:29390,sha256:'24b91cdd7f5ef5d5e4deeed4a93052045f103a0c383d6aea98d4c770c3beb489'};
function fixedC1Fixture(row,bytes){assert.equal(bytes.length,row.bytes,'C1 fixture source changed: '+row.path);assert.equal(sha(bytes),row.sha256,'C1 fixture source changed: '+row.path);return bytes;}
const json=file=>JSON.parse(fs.readFileSync(path.join(root,file)));
const entries=Object.freeze({'./player-setup':'./packages/player-setup/index.js','./player-setup/browser':'./packages/player-setup/browser.js','./native-actors':'./packages/native-actors/index.js','./native-actors/three':'./packages/native-actors/three.js','./player-ui':'./packages/player-ui/index.js','./player-ui/style.css':'./packages/player-ui/style.css'});
export function playerSetupExports(profile='compatibility'){
  const keys=profile==='core'?['./player-setup','./native-actors']:profile==='renderer'?['./native-actors','./native-actors/three']:profile==='compatibility'?Object.keys(entries):[];
  return Object.fromEntries(keys.map(k=>[k,entries[k]]));
}
export function withPlayerSetupExports(exports,profile){return {...Object.fromEntries(Object.entries(exports).filter(([k])=>!Object.hasOwn(entries,k))),...playerSetupExports(profile)};}
const nativeMeta=['README.md','NOTICE.md','usage-card.json','catalogue.json','source.json','index.d.ts'].map(n=>'packages/native-actors/'+n);
const setupMeta=['README.md','usage-card.json','source.json','index.d.ts'].map(n=>'packages/player-setup/'+n);
const uiMeta=['README.md','usage-card.json','source.json','index.d.ts'].map(n=>'packages/player-ui/'+n);
const gaitSupport=[NATIVE_GAIT_ROOT+'/NOTICE.md',NATIVE_GAIT_ROOT+'/provenance.json'];
export function playerSetupStaticResourcePaths(){return json('packages/player-setup/source.json').resources.map(r=>r.path);}
export function playerSetupPackageFiles(profile){
  if(profile==='assets')return [gaitSupport[0]];
  if(profile==='renderer')return [...nativeMeta,'packages/native-actors/three.d.ts',...gaitSupport,...json('packages/native-actors/source.json').resources.map(r=>r.path)];
  return [...nativeMeta,...setupMeta,...gaitSupport,'docs/player-setup.md',...(profile==='compatibility'?[...uiMeta,'packages/native-actors/three.d.ts','packages/player-setup/browser.d.ts',...playerSetupStaticResourcePaths()]:[])];
}
function profileAdditions(profile,setup,native){
  const modules=profile==='core'?setup.headlessClosure:profile==='renderer'?native.runtime.map(r=>r.path):profile==='compatibility'?setup.runtime.map(r=>r.path):[];
  return [...new Set([...modules,...playerSetupPackageFiles(profile)])].sort();
}
export function playerSetupBuildPath(file){return !/^(?:train-ui|player-ui|player-setup|native-actors)\/(?:evidence|tools|tests|fixture|source)(?:\/|$)/.test(file)&&!/(?:^|\/)\.gitattributes$/.test(file);}
export function playerSetupStaticMetadataPaths(){return [...new Set([...nativeMeta,...setupMeta,...uiMeta,...gaitSupport,'docs/player-setup.md'])].filter(p=>!p.endsWith('.d.ts'));}
export function playerSetupBuildProvenance(projectRoot){const setup=JSON.parse(fs.readFileSync(path.join(projectRoot,'packages/player-setup/source.json')));return {compatibilityBaseline:PLAYER_COMPATIBILITY_BASE,reviewedRuntime:PLAYER_SETUP_REVIEW,registrationBase:PLAYER_SETUP_BASE,releaseStamped:false,source:'packages/player-setup/source.json',runtime:setup.runtime,resources:setup.resources};}
function insert(text,anchor,replacement){assert.equal(text.split(anchor).length,2,'Expected one exact player registration anchor: '+anchor);return text.replace(anchor,replacement);}
export function playerSetupRootBytes(file,before,{baseProfiles}={}){
  if(file==='package.json'){const pkg=JSON.parse(before);Object.assign(pkg.exports,playerSetupExports());const setup=json('packages/player-setup/source.json'),native=json('packages/native-actors/source.json');pkg.files=npmFilePatterns([...new Set([...baseProfiles.compatibility.files,...profileAdditions('compatibility',setup,native)])].sort());return Buffer.from(JSON.stringify(pkg,null,2)+'\n');}
  if(file==='upstream.json'){const value=JSON.parse(before);value.farmyardNativeGait={repository:'https://github.com/Syntaxswine/farmyard-commando',commit:NATIVE_GAIT_PIN,root:NATIVE_GAIT_ROOT,manifest:NATIVE_GAIT_ROOT+'/provenance.json',purpose:'Reference-only original mammal gait for the reviewed public native actor adapter; selected goat/donkey data/paint retain the existing AFT pin. No donor game/runtime or extra Three adoption.'};return Buffer.from(JSON.stringify(value,null,2)+'\n');}
  if(file==='tools/distribution.mjs'){let text=before.toString();text=insert(text,"import {npmFilePatterns} from './npm-files.mjs';","import {npmFilePatterns} from './npm-files.mjs';\nimport {withPlayerSetupExports,playerSetupPackageFiles} from './player-setup-registration.mjs';");return Buffer.from(insert(text,'  const files = [...new Set(',"  exports=withPlayerSetupExports(exports,profile);\n  extras.push(...playerSetupPackageFiles(profile));\n  const files = [...new Set("));}
  if(file==='tools/build.mjs'){let text=insert(before.toString(),"import {trainStaticResourcePaths} from './train-registration.mjs';","import {trainStaticResourcePaths} from './train-registration.mjs';\nimport {playerSetupBuildPath,playerSetupStaticResourcePaths,playerSetupStaticMetadataPaths,playerSetupBuildProvenance} from './player-setup-registration.mjs';");
    const old="fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true, filter: source => !/^train-ui\\/(?:evidence|tools|tests|fixture)(?:\\/|$)/.test(path.relative(path.join(root, 'packages'), source).split(path.sep).join('/'))});";
    text=insert(text,old,"fs.cpSync(path.join(root, 'packages'), path.join(output, 'packages'), {recursive: true, filter: source => playerSetupBuildPath(path.relative(path.join(root, 'packages'), source).split(path.sep).join('/'))});");
    const copy='for (const file of trainStaticResourcePaths()) write(file, fs.readFileSync(path.join(root, file)));';text=insert(text,copy,copy+'\nfor(const file of [...playerSetupStaticResourcePaths(),...playerSetupStaticMetadataPaths()])write(file,fs.readFileSync(path.join(root,file)));');
    return Buffer.from(insert(text,'{engineVersion: version, sources, renderEffects, sharedArtwork:', '{engineVersion: version, sources, renderEffects, playerSetup:playerSetupBuildProvenance(root), sharedArtwork:'));
  }
  if(file==='tools/shared-artwork-registration.mjs'){let text=insert(before.toString(),"import {trainPackageExports} from './train-registration.mjs';","import {trainPackageExports} from './train-registration.mjs';\nimport {checkPlayerSetupRegistration} from './player-setup-registration.mjs';");text=insert(text,'export function checkSharedArtworkRegistration(', 'function checkHistoricalSharedArtworkRegistration(');return Buffer.from(text+"\nexport function checkSharedArtworkRegistration(ports){const player=checkPlayerSetupRegistration(ports),historical=checkHistoricalSharedArtworkRegistration(player.historicalPorts);return {...historical,report:{...historical.report,playerSetup:player.report,requiredGitCommits:[...new Set([...historical.report.requiredGitCommits,...player.report.requiredGitCommits])]}};}\n");}
  if(file==='tools/railway-route-registration.mjs'){let text=insert(before.toString(),"import {createHash} from 'node:crypto';","import {createHash} from 'node:crypto';\nimport {historicalPlayerRegistrationBytes} from './player-setup-registration.mjs';");return Buffer.from(insert(text,'export function historicalRailwayRouteBytes(object, file, current) {','export function historicalRailwayRouteBytes(object, file, current) {\n  current=historicalPlayerRegistrationBytes(object,file,current);'));}
  if(['tools/check-native-window-presenter.mjs','tools/check-tile-visuals-source.mjs'].includes(file))return Buffer.from(insert(before.toString(),"json('upstream.json')", "JSON.parse(historicalRailwayRouteBytes(object,'upstream.json',read('upstream.json')))"));
  if(file===c1Collector.path){assert.equal(sha(before),c1Collector.beforeSha256,'C1 collector preimage changed.');fixedC1Fixture(c1Fixture,fs.readFileSync(path.join(root,c1Fixture.path)));return fixedC1Fixture(c1Collector,fs.readFileSync(path.join(root,file)));}
  if(file==='tools/tile-authoring-editor-review-inputs.mjs'){let text=insert(before.toString(),"import {trainBuildBytes} from './train-registration.mjs';","import {trainBuildBytes} from './train-registration.mjs';\nimport {playerSetupRootBytes} from './player-setup-registration.mjs';");text=insert(text,'const extraVerificationFiles=[',"const extraVerificationFiles=[\n 'tools/c1-checkpoint-fixture.mjs',");return Buffer.from(insert(text,"r.path==='tools/build.mjs'?trainBuildBytes(artworkBuild.expected):r.expectedBuffer", "['tools/build.mjs','tools/editor-review-tile-authoring-c1.mjs'].includes(r.path)?playerSetupRootBytes(r.path,r.path==='tools/build.mjs'?trainBuildBytes(artworkBuild.expected):r.expectedBuffer):r.expectedBuffer"));}
  return before;
}
// Only these named protected files need this early historical view.
// The full checker below still authenticates all actual runtime/profile/index
// bytes; callers keep indexing their actual bytes, never these preimages.
export function historicalPlayerRegistrationBytes(object,file,current){
  current=historicalVehicleBytes(object,file,current);
  if(!['upstream.json','tools/build.mjs',c1Collector.path].includes(file))return current;
  const before=object(PLAYER_SETUP_BASE,file);if(current.equals(before))return current;
  assert.ok(current.equals(playerSetupRootBytes(file,before)),'Unreviewed player registration root bytes: '+file);return before;
}
function checkHistoricalPlayerSetupRegistration(ports){
  const {object,read,indexed=()=>{},distribution}=ports,preimageBytes=read(preimagesFile);assert.equal(sha(preimageBytes),preimagesSha,'Player registration preimages changed.');const baseline=JSON.parse(preimageBytes);assert.equal(baseline.base,PLAYER_SETUP_BASE);indexed(preimagesFile,preimageBytes);
  const setup=JSON.parse(object(PLAYER_SETUP_REVIEW,'packages/player-setup/source.json')),native=JSON.parse(object(PLAYER_SETUP_REVIEW,'packages/native-actors/source.json'));
  for(const row of [...setup.runtime,...setup.resources,...setup.publicTypes,...native.publicTypes]){const b=read(row.path);assert.equal(b.length,row.bytes,'Reviewed player bytes changed: '+row.path);assert.equal(sha(b),row.sha256,'Reviewed player bytes changed: '+row.path);indexed(row.path,b);}
  for(const file of ['packages/train-ui/index.js','packages/train-ui/index.d.ts']){const expected=object(PLAYER_UI_REVIEW,file);assert.ok(expected.equals(object(PLAYER_SETUP_REVIEW,file)),'Keep the accepted Stage 1 train presentation seam.');assert.ok(read(file).equals(expected),'Unreviewed train presentation seam: '+file);indexed(file,expected);}
  const rawPath=NATIVE_GAIT_ROOT+'/sites/tactical-animal/dist/aft/tactics/worker-locomotion.js',raw=read(rawPath);assert.equal(raw.length,3755);assert.equal(sha(raw),'7316b2dde70672a7fbfc7ff7708d5db9e2bdea5fff2e7215d3ef3a3d839336b0');assert.ok(raw.equals(object(PLAYER_SETUP_REVIEW,'packages/native-actors/source/worker-locomotion.js.original')));indexed(rawPath,raw);
  const registration=read(PLAYER_REGISTRATION_MANIFEST);assert.equal(sha(registration),metadataSha,'Player registration metadata changed.');const manifest=JSON.parse(registration);assert.equal(manifest.base,PLAYER_SETUP_BASE);assert.equal(manifest.reviewedRuntime,PLAYER_SETUP_REVIEW);indexed(PLAYER_REGISTRATION_MANIFEST,registration);
  for(const r of manifest.metadata){const b=read(r.path);assert.equal(b.length,r.bytes,r.path);assert.equal(sha(b),r.sha256,'Player metadata changed: '+r.path);indexed(r.path,b);}
  indexed('tools/player-setup-registration.mjs',read('tools/player-setup-registration.mjs'));
  indexed(c1Fixture.path,fixedC1Fixture(c1Fixture,read(c1Fixture.path)));
  const preimages={},actual={};for(const file of ['package.json','upstream.json','tools/build.mjs','tools/distribution.mjs','tools/shared-artwork-registration.mjs','tools/railway-route-registration.mjs','tools/check-native-window-presenter.mjs','tools/check-tile-visuals-source.mjs','tools/tile-authoring-editor-review-inputs.mjs',c1Collector.path]){const before=object(PLAYER_SETUP_BASE,file),current=read(file),expected=playerSetupRootBytes(file,before,{baseProfiles:baseline.profiles});assert.ok(current.equals(expected),'Unreviewed player registration root bytes: '+file);preimages[file]=before;actual[file]=current;indexed(file,current);}
  for(const profile of ['core','renderer','assets','compatibility']){const current=distribution(profile),before=baseline.profiles[profile];assert.deepEqual(current.exports,{...before.exports,...playerSetupExports(profile)},'Unreviewed player profile exports: '+profile);assert.equal(current.name,before.name);assert.deepEqual(current.files,[...new Set([...before.files,...profileAdditions(profile,setup,native)])].sort(),'Unreviewed player profile files: '+profile);}
  return {historicalPorts:{...ports,read:file=>Object.hasOwn(preimages,file)?preimages[file]:read(file),indexed(file,bytes){if(Object.hasOwn(preimages,file)){assert.ok(bytes.equals(preimages[file]),'Player historical assertion must use the exact named preimage: '+file);indexed(file,actual[file]);}else indexed(file,bytes);},distribution:(profile='compatibility')=>baseline.profiles[profile]},report:{status:'authenticated-player-setup-registration',base:PLAYER_SETUP_BASE,reviewedRuntime:PLAYER_SETUP_REVIEW,compatibilityBaseline:PLAYER_COMPATIBILITY_BASE,requiredGitCommits:[PLAYER_SETUP_BASE,PLAYER_SETUP_REVIEW,PLAYER_UI_REVIEW],historicalRootFiles:Object.keys(preimages),runtimeFiles:setup.runtime.length,resourceFiles:setup.resources.length,actualBytesPassedToIndexedPort:true,indexEnforcement:'Caller-owned; tracked guards verify actual current Git index bytes.',releaseStamped:false}};
}

export function checkPlayerSetupRegistration(ports){const vehicle=checkVehicleRegistration(ports),historical=checkHistoricalPlayerSetupRegistration(vehicle.historicalPorts);return {...historical,report:{...historical.report,vehicles:vehicle.report}};}
