// Source-only native presentation audit. No donor checkout writes or engine import.
// Run: node --experimental-vm-modules art/grenade-review/audit.mjs <Farmyard repository>
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import * as T from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {createLightHorse} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/horse-light-model.js';
import {createGrenadeModel} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/grenade-model.js';
import {moduleReferenceGraph} from '../../tools/module-references.mjs';

const repo=path.resolve(process.argv[2]??'C:/Users/baals/Documents/ChatGPT/Tactical Animal'),root=process.cwd();
const SOURCE='251bf8094b5f9ebe44208443084c1a6d6658512a',BASELINE='f6caeef309e56423fea5e32eb717533f33b59cbb',AFT='781246a668c723d5a4c5463e70534cc04b6a5641';
const sourceRoot='sites/tactical-animal/dist/',runtime=sourceRoot+'aft/',designer=sourceRoot+'designer/a20b343a0234/',pinned='vendor/aft/'+AFT+'/dist/';
const cache='artifacts/grenade-review/source',output='docs/reviews/grenade-presentation';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),unix=name=>name.replaceAll('\\','/');
const git=args=>execFileSync('git',['-c','safe.directory='+unix(repo),'-C',repo,...args],{windowsHide:true,maxBuffer:64*1024*1024});
assert.equal(git(['rev-parse',SOURCE+'^{commit}']).toString().trim(),SOURCE);
const tree=new Set(git(['ls-tree','-r','--name-only',SOURCE]).toString().trim().split('\n')),sources=new Map();
const read=(file,purpose)=>{assert.ok(tree.has(file),'Missing published source '+file);const bytes=git(['show',SOURCE+':'+file]);if(!sources.has(file))sources.set(file,{path:file,purpose,commit:SOURCE,gitBlob:git(['rev-parse',SOURCE+':'+file]).toString().trim(),bytes:bytes.length,sha256:sha(bytes)});const target=path.join(cache,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);return bytes;};
const write=(name,value)=>{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/'+name,JSON.stringify(value,null,2)+'\n');};
const normalize=bytes=>bytes.toString('utf8').replace(/\r\n/g,'\n').trimEnd();
const pinnedClosure=moduleReferenceGraph(['horse-light-model.js','grenade-model.js','horse-model-paint.js'].map(name=>path.resolve(pinned,'tactics',name)),{root});
const comparison=[];
for(const rel of [...new Set([...pinnedClosure.map(record=>unix(path.relative(path.resolve(pinned),record.filename))),
 'tactics/horse-10k-data.json','tactics/grenade-release.js','tactics/vendor/THREE-LICENSE.txt',
 'assets/equipment/painted-ui/grenade-surface.png','assets/characters/lowpoly-proof/horse-worker-model-paint-v1.png'])].sort()){
 const original=fs.readFileSync(path.join(pinned,rel));assert.ok(original.equals(execFileSync('git',['-c','safe.directory='+unix(root),'-C',root,'show',BASELINE+':'+pinned+rel],{windowsHide:true,maxBuffer:64*1024*1024})),'Pinned native bytes changed: '+rel);const record={pinnedPath:pinned+rel,pinnedBytes:original.length,pinnedSha256:sha(original),variants:[]};
 for(const [kind,prefix]of [['runtime',runtime],['designer',designer]]){
  const file=prefix+rel;if(!tree.has(file)){record.variants.push({kind,path:file,present:false});continue;}
  const bytes=read(file,'Native model/paint dependency comparison');record.variants.push({kind,path:file,present:true,bytes:bytes.length,sha256:sha(bytes),exactBytes:bytes.equals(original),sameTextExceptLineEndingsAndFinalWhitespace:/\.(js|json|txt)$/.test(rel)&&normalize(bytes)===normalize(original)});
 }
 comparison.push(record);
}
const inspectionPaths=[sourceRoot+'field-view.js',sourceRoot+'solo-game.js',sourceRoot+'grenade-controls.js',runtime+'tactics/animal-motion-catalog.js',runtime+'tactics/animal-motion-paint.js',runtime+'tactics/battle-posture.js',runtime+'tactics/worker-locomotion.js',runtime+'tactics/weapon-models.js',designer+'tactics/battle-grenades.js',designer+'tactics/grenade-throw-motion.js',designer+'tactics/grenade-prepared.js',designer+'tactics/grenade-release.js',designer+'tactics/hen-grenade-throw.js',designer+'tactics/grenade-geometry.js','sites/tactical-animal/aft-provenance.json','sites/tactical-animal/designer-provenance.json'];
for(const file of inspectionPaths)read(file,'Runtime path / available designer driver audit');
// Link the original driver source to the one existing host Three namespace.
// No edited donor module is emitted or installed, and no game module executes.
assert.ok(vm.SourceTextModule,'Use --experimental-vm-modules for the source-only link probe.');
const host=new vm.SyntheticModule(Object.keys(T),function(){for(const key of Object.keys(T))this.setExport(key,T[key]);});
async function evaluate(file){const module=new vm.SourceTextModule(read(file,'Executed headless original presentation source').toString(),{identifier:'git:'+SOURCE+':'+file});await module.link(specifier=>{assert.equal(specifier,'./vendor/three.module.js');return host;});await module.evaluate();return module.namespace;}
const driver=await evaluate(designer+'tactics/grenade-throw-motion.js'),prepared=await evaluate(designer+'tactics/grenade-prepared.js');
const data=JSON.parse(fs.readFileSync(pinned+'tactics/horse-10k-data.json'));
assert.deepEqual(data,JSON.parse(read(runtime+'tactics/horse-10k-data.json','Actual runtime native horse data').toString()));
assert.ok(comparison.every(record=>record.variants.filter(v=>v.present).every(v=>v.exactBytes||v.sameTextExceptLineEndingsAndFinalWhitespace)),'A native dependency has material differences; inspect before recommending reuse.');
const point=new T.Vector3(),visible=object=>{for(let current=object;current;current=current.parent)if(!current.visible)return false;return true;};
function bounds(meshes){const box=new T.Box3();for(const mesh of meshes){if(!visible(mesh))continue;mesh.updateWorldMatrix(true,false);const count=mesh.geometry.attributes.position.count,indices=new Set(mesh.geometry.index?.array??Array.from({length:count},(_,i)=>i));for(const index of indices){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);box.expandByPoint(point);}}return box;}
function centredRadius(meshes){let radius=0;for(const mesh of meshes){mesh.updateWorldMatrix(true,false);for(const index of new Set(mesh.geometry.index?.array??Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i))){mesh.getVertexPosition(index,point).applyMatrix4(mesh.matrixWorld);radius=Math.max(radius,point.length());}}return radius;}
const pack=box=>({min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new T.Vector3()).toArray()}),half=box=>Math.max(Math.abs(box.min.x),Math.abs(box.max.x),Math.abs(box.min.z),Math.abs(box.max.z));
const skinHash=worker=>sha(Buffer.concat(worker.parts.flatMap(part=>['skinIndex','skinWeight'].map(name=>{const a=part.geometry.attributes[name].array;return Buffer.from(a.buffer,a.byteOffset,a.byteLength);})))),nativeSamples=[],failures=[];
const atlas=new T.Texture();let atlasDisposals=0;atlas.addEventListener('dispose',()=>atlasDisposals++);
const worker=createLightHorse(data),grenade=createGrenadeModel(atlas),originalSkin=skinHash(worker);
let motion,carry,prop,definitionMarkers,preparedProof;
const bodyUnion=new T.Box3(),heldUnion=new T.Box3(),propHeldUnion=new T.Box3(),feetRanges={};let gripErrorMax=0;
try{
 worker.equipWeapon(grenade);worker.pose('carry');worker.root.updateMatrixWorld(true);worker.skeleton.update();
 carry={body:pack(bounds(worker.parts)),equipped:pack(bounds([...worker.parts,...grenade.parts])),contacts:worker.diagnostics().contacts,nativeScale:worker.root.scale.toArray()};
 grenade.root.position.set(0,0,0);grenade.root.quaternion.identity();grenade.root.updateMatrixWorld(true);const casing=grenade.parts.filter(part=>!['pull ring','curved safety lever'].includes(part.name));prop={bounds:pack(bounds(grenade.parts)),fullRootCentredBoundingRadiusM:centredRadius(grenade.parts),flightCasingBounds:pack(bounds(casing)),flightCasingRootCentredBoundingRadiusM:centredRadius(casing),triangles:grenade.triangles,meshes:grenade.parts.length,grip:grenade.anchors.grip.position.toArray(),releaseAnchor:grenade.anchors.release.position.toArray(),carry:grenade.carry};
 const started=performance.now();motion=driver.createGrenadeThrow(worker,grenade,{animal:'horse'});const prepareMs=performance.now()-started;
 definitionMarkers={...driver.GRENADE_THROW,keys:driver.GRENADE_KEYS,releaseCenter:motion.releaseCenter.toArray(),launch:motion.launch.toArray(),impacts:motion.impacts,prepareMs,prepareMethod:'Six original source balance passes; one native Node sample, not a game/renderer benchmark.'};
 const times=[...new Set([...Array.from({length:139},(_,i)=>i/30),...driver.GRENADE_KEYS.map(key=>key.time),...['pin','drop','plant','release','lever','duration'].flatMap(key=>[driver.GRENADE_THROW[key]-1e-6,driver.GRENADE_THROW[key],driver.GRENADE_THROW[key]+1e-6])].filter(t=>t>=0&&t<=driver.GRENADE_THROW.duration))].sort((a,b)=>a-b);
 for(const time of times){try{
  const state=motion.at(time),body=bounds(worker.parts),heldParts=time<driver.GRENADE_THROW.release?grenade.parts.filter(part=>part.name!=='pull ring'||time<driver.GRENADE_THROW.drop):[],held=bounds([...worker.parts,...heldParts]);
  bodyUnion.union(body);heldUnion.union(held);if(heldParts.length)propHeldUnion.union(bounds(heldParts));
  if(state.gripError!==null)gripErrorMax=Math.max(gripErrorMax,state.gripError);
  const feet={};for(const side of [-1,1]){const box=bounds([motion.footMesh(side)]),contact=state.feet[side].contact;feet[side]={contact,minY:box.min.y,maxY:box.max.y};const range=feetRanges[contact]??={minY:Infinity,maxMinimumY:-Infinity,samples:0};range.minY=Math.min(range.minY,box.min.y);range.maxMinimumY=Math.max(range.maxMinimumY,box.min.y);range.samples++;}
  nativeSamples.push({time,phase:state.phase,released:state.released,body:pack(body),actorAndHeld:pack(held),gripError:state.gripError,feet,projectile:state.ball,ring:state.ring,lever:state.lever});
 }catch(error){failures.push({time,error:error.message});}}
 for(const time of [1.92,.5,3.9,0,1.92,1.92,2.14]){const state=motion.at(time),sample=nativeSamples.find(sample=>Math.abs(sample.time-time)<1e-8);assert.ok(sample);for(const key of ['phase','released','ball','ring','lever'])assert.deepEqual(state[key],key==='ball'?sample.projectile:sample[key]);}
 motion.dispose();motion.dispose();assert.equal(skinHash(worker),originalSkin,'The original driver must restore authored skin weights.');
 const saved=prepared.GRENADE_PREPARED.horse.balance,quickStart=performance.now();const quick=driver.createGrenadeThrow(worker,grenade,{animal:'horse',preparedBalance:saved});
 try{let maxPositionDeltaM=0;for(const time of [0,.5,.7,1.6,1.92,2.14,3.9,4.6]){const actual=quick.at(time),source=nativeSamples.find(sample=>Math.abs(sample.time-time)<1e-8);assert.ok(source);maxPositionDeltaM=Math.max(maxPositionDeltaM,...actual.palm.map((v,i)=>Math.abs(v-(motion.palmAt(time).toArray()[i]))));}preparedProof={source:designer+'tactics/grenade-prepared.js',rows:saved.rows.length,prepareAndEightPosesMs:performance.now()-quickStart,maxPalmDeltaM:maxPositionDeltaM,releaseCenter:quick.releaseCenter.toArray(),launch:quick.launch.toArray()};}finally{quick.dispose();}
 assert.equal(skinHash(worker),originalSkin);
}finally{motion?.dispose();worker.equipWeapon();grenade.dispose();worker.dispose();worker.skeleton.dispose();}
assert.equal(atlasDisposals,0,'Borrowed paint must survive prop disposal.');atlas.dispose();assert.equal(atlasDisposals,1);
assert.equal(failures.length,0,JSON.stringify(failures));assert.ok(gripErrorMax<1e-6);
const field=read(sourceRoot+'field-view.js','Actual runtime rendering path').toString(),solo=read(sourceRoot+'solo-game.js','Actual runtime committed grenade event').toString();
assert.ok(!field.includes('createGrenadeThrow')&&!field.includes('BattleGrenades'));
assert.ok(field.includes('ttl:thrown?700')&&field.includes("shot.weapon==='grenade'?500:0"));
assert.ok(solo.includes('z:1.1*(1-t)+.08*t+Math.sin(t*Math.PI)*rise'));
write('sources.json',{sourceCommit:SOURCE,baseline:BASELINE,existingAftPin:AFT,method:'Read original Git objects only; ignored audit cache, no donor changes or vendored import.',pinnedDependencyClosure:pinnedClosure.map(record=>unix(path.relative(root,record.filename))),comparison,sources:[...sources.values()].sort((a,b)=>a.path.localeCompare(b.path))});
const arcDelta=definitionMarkers.releaseCenter.map((v,i)=>v-(i===1?1.1:0));
write('measurements.json',{status:'Source/native rig audit only. Integrated visual review awaits a fixed architect candidate.',sourceCommit:SOURCE,baseline:BASELINE,runtime:process.version,threeRevision:T.REVISION,actor:{species:'horse',outfit:'normal',nativeScale:[1,1,1],bones:worker.bones.length,bodyTriangles:data.triangles,sourceAuthoringTriangles:data.sourceTriangles,animationClips:worker.root.animations.length,bodyOnly:pack(bodyUnion),actorAndHeld:pack(heldUnion),heldProp:pack(propHeldUnion),requiredRootCentredHalfExtentM:half(heldUnion),standingMover:{radiusM:.46,heightM:1.7},fitsStandingMover:half(heldUnion)<=.46&&heldUnion.max.y<=1.7},prop,carry,markers:definitionMarkers,prepared:preparedProof,sampling:{rateHz:30,samples:nativeSamples.length,failures,maximumHeldGripErrorM:gripErrorMax,feetRanges},runtimeDifference:{runtimeArcStartHeightM:1.1,nativeReleaseHeightM:definitionMarkers.releaseCenter[1],heightDifferenceM:arcDelta[1],nativeReleaseMinusAuthoritativeOrigin:arcDelta,discontinuityM:Math.hypot(...arcDelta),arcPolicy:'Preserve Farmyard source-authoritative origin [0,1.1,0] and arc unchanged. Any handoff blend is cosmetic only; otherwise declare the visible discontinuity.',fieldViewDedicatedThrowDriver:false,designerDriverAvailable:true},ownershipProof:{borrowedAtlasDisposedByProp:false,skinWeightsRestored:true,driverDisposeIdempotent:true,deterministicOutOfOrderAndRepeatedSeeks:[1.92,.5,3.9,0,1.92,1.92,2.14],noPreviewHelpersStarted:true},samples:nativeSamples});
console.log(JSON.stringify({comparisons:comparison.length,sources:sources.size,samples:nativeSamples.length,failures:failures.length,grenadeTriangles:prop.triangles,grenadeMeshes:prop.meshes,body:pack(bodyUnion),actorAndHeld:pack(heldUnion),maximumGripErrorM:gripErrorMax,feetRanges,release:definitionMarkers.releaseCenter,prepared:preparedProof,retainedHelpers:0}));
