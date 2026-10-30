import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from '../packages/render-effects/three.js';
import * as W from '../packages/windows-core/index.js';
import * as F from '../packages/adapters/farmyard/windows.js';
import {createFarmyardWindowPresentation as create,projectAcceptedWindowPresentation as project} from '../packages/window-visuals/three.js';
import {createWindowLibrary} from '../packages/window-visuals/native/geometry.js';
import {createWindowShatter} from '../packages/window-visuals/native/shatter.js';
import {windowFixture} from './fixtures/window-presentation/fixture.mjs';
import {adapt} from '../docs/reviews/window-presentation/intake.mjs';
import {moduleClosure} from '../tools/distribution.mjs';
import {paneHarness} from './fixtures/farmyard-window-impacts/harness.mjs';
import * as Source from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js';
const fixture=options=>windowFixture(W,F,options),clone=structuredClone;
const make=()=>{const scene=new T.Scene(),view=create({THREE:T,scene});return {scene,view};};
const next=f=>project(W,f.state),cue=r=>clone({receiptId:r.receipt.id,effects:r.effects});
const code=(fn,name)=>assert.throws(fn,e=>e.code===name);

test('visual intake preserves nine original objects, exact adaptations, study/audio/Three notices and a kernel-free closure',()=>{
  const source=JSON.parse(fs.readFileSync('packages/window-visuals/source.json'));
  assert.equal(source.files.length,9);assert.equal(source.commit,F.FARMYARD_WINDOW_CATALOGUE.sourceCommit);
  const map={'art/windows/geometry.js':'geometry.js','art/windows/catalog.js':'catalog.js','aft/tactics/hybrid-materials.js':'surfaces.js','aft/tactics/diagonal-roads.js':'diagonal-roads.js','window-shatter.js':'shatter.js','world-dimensions.js':'world-dimensions.js'};
  for(const row of source.files){const b=fs.readFileSync(path.join(source.rawRoot,row.path));assert.equal(b.length,row.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),row.sha256);const target=map[row.path.slice('sites/tactical-animal/dist/'.length)];if(target)assert.equal(fs.readFileSync('packages/window-visuals/native/'+target,'utf8'),adapt(row.path,b));}
  assert.ok(fs.existsSync(source.externalDependencies[0].notice));
  const closure=moduleClosure(['packages/window-visuals/three.js']);assert.ok(closure.every(p=>p.startsWith('packages/window-visuals/')));assert.ok(!closure.some(p=>/windows-core|three\.module|window-system|window-view/.test(p)));
  assert.equal(typeof globalThis.document,'undefined');
});

test('bridge borrows the owning core module and returns detached versioned plain data',()=>{
  const f=fixture(),p=next(f);assert.equal(p.kind,'nautilus-window-presentation');assert.deepEqual(JSON.parse(JSON.stringify(p)),p);
  p.windows[0].broken.push('fake');assert.deepEqual(next(f).windows[0].broken,[]);code(()=>project({},f.state),'MISSING_CORE_API');assert.throws(()=>project(W,clone(f.state)));
});

test('all 39 presets retain native pane/solid bounds and IDs for 624 rotations/joins; tall sheets retain physical metres',async()=>{
  const {view}=make();let cases=0;
  try{for(const definition of F.FARMYARD_WINDOW_CATALOGUE.presets)for(const rotation of [0,90,180,270])for(const flags of [0,1,2,3]){
    const f=fixture({definitionId:definition.id,rotation,joins:{left:!!(flags&1),right:!!(flags&2)}}),p=next(f);await view.prepare(p);const model=view.root.getObjectByName('native-view');assert.ok(model);assert.deepEqual(model.scale.toArray(),[1,1,1]);assert.equal(model.userData.placementId,'native-window');
    const geometry=W.inspectWindowGeometry(W.windowStateGeometry(f.state));model.updateWorldMatrix(true,true);
    for(const member of geometry.members.filter(m=>m.kind!=='prop')){const mesh=member.kind==='glass'?model.getObjectByName('glass:'+member.paneId):model.getObjectByName(member.partId),box=new T.Box3().setFromObject(mesh),b=member.bounds;for(const [actual,expected] of [[box.min.x,b.x0],[box.max.x,b.x1],[box.min.z,b.y0],[box.max.z,b.y1],[box.min.y,b.z0],[box.max.y,b.height]])assert.ok(Math.abs(actual-expected)<2e-7,member.partId);}
    for(const pane of p.windows[0].panes)assert.equal(model.getObjectByName(pane.visualId).userData.visualId,pane.visualId);cases++;
  }
  const f=fixture({definitionId:'window.full.borderless',dimensions:{width:20,height:10.6}});await view.prepare(next(f));const box=new T.Box3().setFromObject(view.root);assert.ok(Math.abs(box.max.y-10.6)<1e-7);assert.ok(Math.abs(box.max.x-box.min.x-20)<1e-7);assert.equal(cases,624);
  }finally{view.dispose();}
});

test('accepted masks hide glass and glints together; only fresh matching post-ack observations create elapsed-time shatter',async()=>{
  const f=fixture({rotation:90}),{view,scene}=make();try{
    await view.prepare(next(f));const pane=next(f).windows[0].panes[0],node=view.root.getObjectByName(pane.visualId);assert.equal(node.children.length,2);assert.equal(node.visible,true);
    const r=f.impact(),p=next(f);view.update(p,{observation:cue(r),timeSeconds:10});assert.equal(node.visible,false);assert.equal(view.diagnostics().activeEffects,1);assert.deepEqual(view.diagnostics().receiptIds,[r.receipt.id]);
    view.update(clone(p),{observation:cue(r),timeSeconds:10.1});assert.equal(view.diagnostics().activeEffects,1);
    view.sample(10.5);const shards=view.root.getObjectByName('glass:'+f.placement.definitionId).children[0].geometry.attributes.position.array;assert.ok([...shards].every(Number.isFinite));assert.ok(Math.min(...Array.from(shards).filter((_,i)=>i%3===1))>=.003-1e-7);
    const before=view.diagnostics();const bad=cue(r);bad.effects[0].paneId='r2c3';code(()=>view.update(p,{observation:bad,timeSeconds:10.6}),'INVALID_RECEIPT_OBSERVATION');assert.deepEqual(view.diagnostics(),before);
    view.sample(20);assert.equal(view.diagnostics().activeEffects,0);await view.prepare(p);view.update(p,{observation:cue(r),timeSeconds:0});assert.equal(view.diagnostics().activeEffects,0,'Quiet reload seeds current receipt baseline.');
    assert.equal(scene.children.length,1);
  }finally{view.dispose();}assert.equal(scene.children.length,0);
});

test('mask-only publication is quiet, receipt mismatch fails atomically, and scopes/content require complete preparation',async()=>{
  const f=fixture(),{view}=make();try{await view.prepare(next(f));const old=next(f),r=f.impact(),p=next(f);code(()=>view.update(p,{observation:cue(r)}),'MISSING_HOST_TIME');assert.equal(view.diagnostics().revision,0);view.update(p);assert.equal(view.diagnostics().activeEffects,0);view.update(p,{observation:cue(r),timeSeconds:5});assert.equal(view.diagnostics().activeEffects,0,'A late duplicate cannot replay cosmetics.');
    code(()=>view.update(old),'STALE_PRESENTATION');for(const field of ['stateId','sceneId','contentEpoch','contentDigest']){const bad=clone(p);bad.scope[field]=field==='contentDigest'?'f'.repeat(64):'other';code(()=>view.update(bad),'CONTENT_CHANGED');}
    const altered=clone(p);altered.windows[0].placement.finish='ivory';code(()=>view.update(altered),'CONTENT_CHANGED');assert.equal(view.diagnostics().revision,1);
  }finally{view.dispose();}
});

test('failed, superseded, cancelled and late preparations preserve the accepted scene and retire staged ownership',async()=>{
  let resolve,failLoad=false;const scene=new T.Scene(),borrowed=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());scene.add(borrowed);let borrowedDisposals=0;borrowed.geometry.addEventListener('dispose',()=>borrowedDisposals++);
  const modules={createWindowLibrary,createWindowShatter},pending=[];let defer=false;
  const view=create({THREE:T,scene,loadNative:()=>failLoad?Promise.reject(Error('load failed')):defer?new Promise(r=>{resolve=r;pending.push(r);}):Promise.resolve(modules)}),f=fixture();
  await view.prepare(next(f));const group=view.root.children[0];failLoad=true;await assert.rejects(view.prepare(next(f)),/load failed/);assert.equal(view.root.children[0],group);failLoad=false;defer=true;
  const older=view.prepare(next(f)),newer=view.prepare(next(f));pending[0](modules);await assert.rejects(older,e=>e.code==='PREPARATION_CANCELLED');pending[1](modules);await newer;assert.notEqual(view.root.children[0],group);
  const stable=view.root.children[0],abort=new AbortController(),cancelled=view.prepare(next(f),{signal:abort.signal});abort.abort();resolve(modules);await assert.rejects(cancelled,e=>e.code==='PREPARATION_CANCELLED');assert.equal(view.root.children[0],stable);
  const retired=view.prepare(next(f));view.dispose();resolve(modules);await assert.rejects(retired,e=>e.code==='DISPOSED');assert.deepEqual(scene.children,[borrowed]);assert.equal(borrowedDisposals,0);view.dispose();code(()=>view.sample(1),'DISPOSED');borrowed.geometry.dispose();borrowed.material.dispose();
});

test('invalid identities, unknown panes, altered native bounds and accessor data fail before replacing the scene',async()=>{
  const {view}=make(),f=fixture(),p=next(f);await view.prepare(p);const live=view.root.children[0];
  try{for(const change of [p=>p.version=2,p=>p.windows[0].broken=['unknown'],p=>p.windows[0].definition.solids[0].min[0]-=.1,p=>p.windows[0].placement.rotation=45,p=>p.windows[0].panes[0].visualId=p.windows[0].panes[1].visualId]){const bad=clone(p);change(bad);await assert.rejects(view.prepare(bad));assert.equal(view.root.children[0],live);}
    let calls=0;const bad=clone(p);Object.defineProperty(bad,'secret',{enumerable:true,get(){calls++;return 1;}});await assert.rejects(view.prepare(bad),e=>e.code==='INVALID_PROJECTION');assert.equal(calls,0);
  }finally{view.dispose();}
});

test('aggregate shard budgets, shared materials and borrowed scene survive retirement; tall effect duration reaches the floor',async()=>{
  const f=fixture(),scene=new T.Scene(),view=create({THREE:T,scene,maxEffects:2,maxShards:12});await view.prepare(next(f));const materials=new Set(),geometries=new Set();view.root.traverse(o=>{if(o.material)materials.add(o.material);if(o.geometry)geometries.add(o.geometry);});let md=0,gd=0;for(const m of materials)m.addEventListener('dispose',()=>md++);for(const g of geometries)g.addEventListener('dispose',()=>gd++);
  for(const [i,id]of ['r0c0','r0c1','r0c2'].entries()){const r=f.impact({paneId:id,commandId:'budget-'+i});view.update(next(f),{observation:cue(r),timeSeconds:i});assert.ok(view.diagnostics().activeEffects<=2);assert.ok(view.diagnostics().shards<=12);}
  view.dispose();assert.equal(md,materials.size);assert.equal(gd,geometries.size);assert.equal(scene.children.length,0);
  const tall=createWindowShatter(T,{kind:'window.full.borderless',bounds:{min:[-10,0,-.004],max:[10,10.6,.004]},includePane:false,maxShards:70});try{assert.ok(tall.duration>2.2);tall.sample(tall.duration-.001);assert.equal(tall.diagnostics().settled,true);tall.sample(tall.duration);assert.equal(tall.diagnostics().cleared,true);}finally{tall.dispose();}
});

test('the actual retained connector publishes visuals only after acknowledgement, with quiet retry and no extra costs',async()=>{
  const h=paneHarness({W,F,Source}),{view}=make();
  const accepted=()=>W.openWindowState(W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),h.store.windowState);
  try{await view.prepare(project(W,accepted()));h.hooks.present=(_owner,observation)=>view.update(project(W,accepted()),{observation,timeSeconds:10});
    const packet=h.packet();h.hooks.cas=()=>false;assert.equal(h.binding.perform(packet).committed,false);assert.equal(view.diagnostics().revision,0);assert.equal(view.diagnostics().activeEffects,0);
    delete h.hooks.cas;const result=h.binding.perform(packet);assert.equal(result.committed,true);assert.equal(view.diagnostics().revision,1);assert.equal(view.diagnostics().activeEffects,1);const ap=Source.hero(h.store.source).ap,ammo=Source.hero(h.store.source).ammo.pistol;assert.equal(h.binding.perform(packet).repeated,true);assert.equal(view.diagnostics().activeEffects,1);assert.equal(Source.hero(h.store.source).ap,ap);assert.equal(Source.hero(h.store.source).ammo.pistol,ammo);
  }finally{view.dispose();h.binding.dispose();}
});

test('accepted updates fence pending prepares, quiet rewinds retain a scope high-water mark, and reduced motion keeps masks exact',async()=>{
  const f=fixture(),initial=next(f),modules={createWindowLibrary,createWindowShatter};let resolve,defer=false,result;
  const scene=new T.Scene(),view=create({THREE:T,scene,loadNative:()=>defer?new Promise(r=>resolve=r):Promise.resolve(modules)});
  try{await view.prepare(initial);defer=true;const pending=view.prepare(initial);result=f.impact();view.update(next(f),{observation:cue(result),timeSeconds:0});resolve(modules);await assert.rejects(pending,e=>e.code==='PREPARATION_CANCELLED');assert.equal(view.diagnostics().revision,1);
    defer=false;await view.prepare(initial);view.update(next(f),{observation:cue(result),timeSeconds:0});assert.equal(view.diagnostics().activeEffects,0);
  }finally{view.dispose();}
  const reduced=create({THREE:T,scene,maxEffects:0,maxShards:0});await reduced.prepare(initial);const p=next(f);reduced.update(p,{observation:cue(result),timeSeconds:0});assert.equal(reduced.diagnostics().activeEffects,0);assert.equal(reduced.root.getObjectByName(p.windows[0].panes[0].visualId).visible,false);reduced.dispose();
});

test('an allocated cosmetic that fails sampling is disposed before any accepted view mutation',async()=>{
  const f=fixture();let closed=0;const view=create({THREE:T,scene:new T.Scene(),loadNative:async()=>({createWindowLibrary,createWindowShatter:()=>({group:new T.Group(),sample(){throw Error('cosmetic sample failed');},dispose(){closed++;}})})});
  try{await view.prepare(next(f));const result=f.impact();assert.throws(()=>view.update(next(f),{observation:cue(result),timeSeconds:1}),/cosmetic sample failed/);assert.equal(closed,1);assert.equal(view.diagnostics().revision,0);assert.equal(view.diagnostics().activeEffects,0);assert.equal(view.root.getObjectByName(next(f).windows[0].panes[0].visualId).visible,true);}finally{view.dispose();}
});
