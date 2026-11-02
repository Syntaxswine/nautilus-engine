// Audit-only probes against the immutable cache produced by inventory.py.
// This file creates no renderer, browser, server, timer, game state, or public API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const cache=path.resolve(root,'artifacts/actor-height-intake/pinned');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const inventory=read(path.join(root,'docs/reviews/actor-height-intake/sources.json'));
const base='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/';
const live='sites/tactical-animal/dist/aft/tactics/';
const study='sites/tactical-animal/dist/designer/a20b343a0234/tactics/';
const admin='assets/art/exposition-administration/';
const moduleAt=(sid,p)=>import(pathToFileURL(path.join(cache,sid,p)).href);
const jsonAt=(sid,p)=>read(path.join(cache,sid,p));
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const source of inventory.sources)for(const file of source.files){
 const p=path.join(cache,source.id,file.path);
 assert.equal(fs.statSync(p).size,file.bytes,'Cached byte count: '+file.path);
 assert.equal(digest(p),file.sha256,'Cached source hash: '+file.path);
}
const report={schemaVersion:1,baselineCommit:inventory.baselineCommit,
 environment:{node:process.version,platform:process.platform,architecture:process.arch,cpu:os.cpus()[0]?.model},
 method:'Headless native factories and procedural pose sampling from hash-verified Git objects. No WebGL painting, physical-phone frame cost, collision, navigation, or consumer adoption is claimed.',
 actors:{},weapons:{},motion:{},height:{},checks:[]};

function bodyCounts(worker){
 const geometries=new Set(worker.parts.map(p=>p.geometry)),buffers=new Set();
 let triangles=0;
 for(const g of geometries){
  triangles+=(g.index?.count||g.attributes.position.count)/3;
  for(const a of Object.values(g.attributes))buffers.add(a.array.buffer);
  if(g.index)buffers.add(g.index.array.buffer);
 }
 return {uniqueGeometries:geometries.size,triangles,attributeAndIndexArrayBufferBytes:[...buffers].reduce((s,b)=>s+b.byteLength,0)};
}
function disposeWorker(worker,equipment){
 // Factories differ: mammal dispose owns its default rifle but not a replacement
 // weapon or skeleton. Resolve identity before releasing caller-owned equipment.
 if(equipment&&equipment!==worker.rifle)equipment.dispose();
 worker.dispose();
 if(!worker.bones.some(b=>b.name==='pelvis'))worker.skeleton?.dispose();
 worker.root.removeFromParent();
}
for(const [sid,prefix]of [['nautilus',base],['farmyard',live]]){
 const {ANIMAL_MOTION_CATALOG:catalog}=await moduleAt(sid,prefix+'animal-motion-catalog.js');
 report.actors[sid]=[];
 const Three=await moduleAt(sid,prefix+'vendor/three.module.js');
 report.actors[sid+'ThreeRevision']=Three.REVISION;
 for(const profile of catalog){
  const data=jsonAt(sid,prefix+profile.file),worker=profile.create(data);
  try{
   worker.pose('neutral',0);const d=worker.diagnostics();
   assert.equal(worker.root.scale.distanceTo(new Three.Vector3(1,1,1)),0);
   assert.ok([...d.min,...d.max].every(Number.isFinite));
   assert.ok(worker.parts.every(m=>m.isSkinnedMesh));
   const weights={minimumSum:Infinity,maximumSum:-Infinity,nonfinite:0};
   for(const part of worker.parts){const w=part.geometry.attributes.skinWeight;
    for(let i=0;i<w.count;i++){let sum=0;for(let j=0;j<w.itemSize;j++)sum+=w.getComponent(i,j);
     if(!Number.isFinite(sum))weights.nonfinite++;weights.minimumSum=Math.min(weights.minimumSum,sum);weights.maximumSum=Math.max(weights.maximumSum,sum);
    }
   }
   assert.equal(weights.nonfinite,0);assert.ok(Math.abs(weights.minimumSum-1)<1e-5&&Math.abs(weights.maximumSum-1)<1e-5);
   let carry=null;
   if(worker.equipWeapon){worker.pose('carry',0);carry=worker.diagnostics().contacts;assert.ok(carry.every(c=>Number.isFinite(c.error)&&c.error<1e-5));}
   report.actors[sid].push({id:profile.id,label:profile.label,data:prefix+profile.file,paint:profile.paint,
    frame:profile.frame,eye:profile.eye,unarmed:!!profile.unarmed,hasEquipmentAPI:typeof worker.equipWeapon==='function',
    boneNames:worker.bones.map(b=>b.name),sourceTriangles:data.sourceTriangles??null,body:bodyCounts(worker),
    neutralBounds:{min:d.min,max:d.max},height:d.max[1]-d.min[1],weightSums:weights,
    defaultCarryContacts:carry,exportedAnimationClipCount:worker.root.animations.length});
  }finally{disposeWorker(worker);}
 }
 const {WEAPON_MODELS,createWeaponModel}=await moduleAt(sid,prefix+'weapon-models.js');
 report.weapons[sid]=[];
 for(const [id,definition]of Object.entries(WEAPON_MODELS)){
  const weapon=createWeaponModel(id);
  try{report.weapons[sid].push({id,...definition,triangles:weapon.triangles??null,
   anchors:Object.fromEntries(Object.entries(weapon.anchors||{}).map(([id,node])=>[id,node.position.toArray()])),
   carry:weapon.carry??null,hasMount:!!weapon.mount,hasHose:!!weapon.hose});
  }finally{weapon.dispose();}
 }
 report.checks.push(sid+': 12 factories, unscaled native bounds, normalized skin weights, default carry contacts and all weapon constructors');
}

const {ANIMAL_MOTION_CATALOG:catalog}=await moduleAt('farmyard',live+'animal-motion-catalog.js');
const {createWeaponModel}=await moduleAt('farmyard',live+'weapon-models.js');
const {createWorkerLocomotion}=await moduleAt('farmyard',live+'worker-locomotion.js');
const {createBattlePosture}=await moduleAt('farmyard',live+'battle-posture.js');
const {createGrenadeThrow,GRENADE_THROW,GRENADE_KEYS}=await moduleAt('farmyard',study+'grenade-throw-motion.js');
const profile=catalog.find(p=>p.id==='donkey');
const worker=profile.create(jsonAt('farmyard',live+profile.file)),pistol=createWeaponModel('pistol');
let walk,throwing,grenade;
try{
 worker.equipWeapon(pistol);walk=createWorkerLocomotion(worker,profile);const posture=createBattlePosture(worker,profile);
 const samples=[];
 for(const [stance,pose]of [['standing',{}],['kneeling',{kneel:1}],['prone',{prone:1}]])for(const blend of [0,1]){
  const sample={distance:.425,blend,heading:35,pose};walk.apply(sample);posture.apply(sample);
  const d=worker.diagnostics();assert.ok([...d.min,...d.max].every(Number.isFinite));
  samples.push({stance,blend,localBounds:{min:d.min,max:d.max},rootYawRadians:worker.root.rotation.y});
 }
 walk.dispose();walk=null;
 grenade=createWeaponModel('grenade');
 const started=performance.now();throwing=createGrenadeThrow(worker,grenade,{animal:'donkey'});
 const setupMilliseconds=performance.now()-started,poses=[];let largestHeldGripError=0;
 const times=[0,.46,.5,.7,1.24,1.6,1.9199,1.92,1.945,2.14,3.9,4.6];
 for(const t of times){const state=throwing.at(t);
  assert.equal(state.released,t>=GRENADE_THROW.release);assert.ok(state.palm.every(Number.isFinite));
  if(state.gripError!==null){largestHeldGripError=Math.max(largestHeldGripError,state.gripError);assert.ok(state.gripError<1e-5);}
  poses.push({time:t,phase:state.phase,released:state.released,palm:state.palm,propPhase:state.ball.phase,heldGripError:state.gripError});
 }
 // Seeking is a presentation operation. It can repeat the released state and
 // therefore must never award an action, release a live item or apply damage.
 assert.equal(throwing.at(1.92).released,true);assert.equal(throwing.at(1.92).released,true);
 assert.equal(throwing.at(0).released,false);
 let rockRejected=false;try{createGrenadeThrow(worker,{id:'rock'});}catch{rockRejected=true;}assert.ok(rockRejected);
 report.motion={character:{presetId:'demolition',existingName:'Misha',species:'donkey',carriedWeapon:'pistol',thrownProp:'grenade'},
  supportFindings:{standingHeight:Math.max(...samples.filter(s=>s.stance==='standing').map(s=>s.localBounds.max[1])),ordinaryDoorHeight:1.65,
   minimumProneY:Math.min(...samples.filter(s=>s.stance==='prone').map(s=>s.localBounds.min[1])),
   acceptance:'Finite pose/marker probes passed. Prone support and standing ordinary-door clearance are unresolved; these samples do not establish traversal acceptance.'},
  stanceSamples:samples,throw:{constants:GRENADE_THROW,keys:GRENADE_KEYS,poses,largestHeldGripError,
   releaseCenter:throwing.releaseCenter.toArray(),launchVelocity:throwing.launch.toArray(),
   setupMilliseconds:{value:setupMilliseconds,kind:'single cold Node sample; not a runtime or phone budget'},
   directRockPropRejected:rockRejected,seekRepeatsReleasedState:true,
   sourceOnly:'Farmyard committed designer study; live FieldView does not invoke this body clip.'}};
 report.checks.push('Misha: 6 standing/kneeling/prone rest/walk samples; 12 throw times; exact release boundary, grip, seek and direct-rock rejection');
}finally{throwing?.dispose();walk?.dispose();if(grenade)grenade.dispose();disposeWorker(worker,pistol);}

const T=await moduleAt('nautilus',base+'vendor/three.module.js');
const {createAdministrationBuilding,PLAN}=await moduleAt('administration',admin+'index.js');
const borrowedMaterial=new T.MeshStandardMaterial(),borrowedTexture=new T.Texture();
let borrowedMaterialDisposals=0,borrowedTextureDisposals=0;
borrowedMaterial.addEventListener('dispose',()=>borrowedMaterialDisposals++);borrowedTexture.addEventListener('dispose',()=>borrowedTextureDisposals++);
const owned=new Map();
function observe(item){
 if(!item||owned.has(item))return;
 const type=item.isMaterial?'material':item.isInstancedMesh?'instance-batch':item.isBufferGeometry?'geometry':null;
 if(!type)return;
 const counter={type,disposals:0};owned.set(item,counter);item.addEventListener('dispose',()=>counter.disposals++);
}
// Observe factory constructor allocations as well as reachable resources, so an
// unused material slot and intermediates do not disappear from the lifecycle audit.
const observedT={...T};
for(const key of Object.keys(observedT))if(/Geometry$|^Mesh.*Material$|^InstancedMesh$/.test(key)&&typeof T[key]==='function'){
 observedT[key]=new Proxy(T[key],{construct(target,args){const value=Reflect.construct(target,args);observe(value);return value;}});
}
const building=createAdministrationBuilding(observedT,{position:[5,4.24,7],quarterTurns:1,materials:{facade:borrowedMaterial},textures:{floor:borrowedTexture}});
try{
 building.root.updateMatrixWorld(true);
 const d=building.diagnostics(),floors=PLAN.floors.map(f=>({id:f.id,nativeLevel:f.level,
  localSurfaceY:f.level*2.12,worldSurfaceY:4.24+f.level*2.12,use:f.use,polygons:f.polygons,holes:f.holes}));
 assert.deepEqual(floors.map(f=>f.nativeLevel),[1,3,5,7,9,19,23]);
 assert.equal(PLAN.levels.length,37);assert.equal(PLAN.levels[36].floors.length,0);
 assert.equal(PLAN.levels[36].elevation,76.32);
 assert.deepEqual(building.root.scale.toArray(),[1,1,1]);
 building.root.traverse(o=>{for(const item of [o.isInstancedMesh?o:null,o.geometry,...(Array.isArray(o.material)?o.material:[o.material])])observe(item);});
 report.height={assetId:PLAN.assetId,hostThreeRevision:T.REVISION,placement:{position:[5,4.24,7],quarterTurns:1,scale:[1,1,1]},
  localBounds:building.bounds,diagnosticKeys:Object.keys(d),diagnostics:d,floors,
  nativeLevelRecords:PLAN.levels,stairs:PLAN.stairs,
  sourcePlanRooms:PLAN.rooms.length,crown:{nativeMarker:36,elevation:76.32,occupiedFloor:false},
  roofAndGalleryLevels:[9,19,23],pavilionStories:4,
  doesNotProve:'Fifteen connected occupied stories, collision, character clearance, roof access, gameplay navigation, fire, or consumer adoption.'};
 building.dispose();building.dispose();
 report.height.disposal={observedOwnedObjects:owned.size,geometryObjects:[...owned.values()].filter(v=>v.type==='geometry').length,
  materialObjects:[...owned.values()].filter(v=>v.type==='material').length,
  instanceBatches:[...owned.values()].filter(v=>v.type==='instance-batch').length,
  duplicateObservedDisposals:[...owned.values()].filter(v=>v.disposals>1).length,
  unobservedDisposals:[...owned.values()].filter(v=>v.disposals===0).length,
  borrowedMaterialDisposals,borrowedTextureDisposals};
 assert.equal(borrowedMaterialDisposals,0);assert.equal(borrowedTextureDisposals,0);
 assert.equal(report.height.disposal.duplicateObservedDisposals,0);assert.equal(report.height.disposal.unobservedDisposals,0);
 report.checks.push('Administration: exact 7 authored surface levels, void/crown separation, translated quarter-turn native scale, idempotent observed-resource disposal, borrowed material/texture preservation');
}finally{building.dispose();borrowedMaterial.dispose();borrowedTexture.dispose();}
assert.equal(typeof globalThis.document,'undefined');assert.equal(typeof globalThis.window,'undefined');
report.checks.push('All probes ran without DOM, WebGL, timer, server or browser');
const out=path.join(root,'docs/reviews/actor-height-intake/measurements.json');
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({actors:Object.fromEntries(['nautilus','farmyard'].map(s=>[s,report.actors[s].length])),
 threeRevisions:[report.actors.nautilusThreeRevision,report.actors.farmyardThreeRevision],
 weapons:report.weapons.farmyard.length,motion:report.motion.throw.largestHeldGripError,
 height:{floors:report.height.floors.map(f=>f.nativeLevel),bounds:report.height.localBounds,disposal:report.height.disposal},checks:report.checks},null,2));
