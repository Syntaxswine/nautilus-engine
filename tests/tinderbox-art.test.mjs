import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as T from '../packages/render-effects/three.js';
import {listSharedAssets,sharedAsset} from '../packages/assets/index.js';
import {loadTinderboxArt,loadTinderboxMedicine} from '../packages/assets/three.js';
import {verifyTinderboxMedicine} from '../tools/intake-tinderbox-medicine.mjs';
import {execFileSync} from 'node:child_process';
import {verifyTinderboxArt,SOURCE_COMMIT} from '../tools/intake-tinderbox-art.mjs';
import {tinderboxArtCatalogueSource} from '../tools/tinderbox-art-catalogue.mjs';
import {distribution} from '../tools/distribution.mjs';
import {wallPanels} from '../packages/map-core/wall-runs.js';
import {wallPanels as sourcePanels} from '../vendor/tinderbox-art/e261e7c749a4957470195b993a53051cae15416f/vendor/nautilus-engine/90054d07134116a5d9661f8318a76fe68f922aad/packages/map-core/wall-runs.js';
const entries=listSharedAssets().filter(a=>a.id.startsWith('tinderbox:'));
const id=(name,family='interior')=>'tinderbox:'+family+':'+name;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);

test('fixed source bytes, bounded adaptations and measured discovery stay reproducible',()=>{
 assert.equal(verifyTinderboxArt().commit,SOURCE_COMMIT);
 assert.equal(verifyTinderboxMedicine().commit,'988b4aca32343c9f2e566db74bb018c705820742');
 assert.equal(fs.readFileSync(new URL('../packages/tinderbox-art/catalogue.js',import.meta.url),'utf8'),tinderboxArtCatalogueSource());
 assert.equal(entries.length,51);assert.equal(entries.filter(a=>a.family==='interior').length,35);assert.equal(entries.filter(a=>a.family==='waterfront').length,9);assert.equal(entries.filter(a=>a.family==='medicine').length,3);
 const copy=sharedAsset(id('writing-desk'));copy.bounds.min[0]=999;assert.notEqual(sharedAsset(copy.id).bounds.min[0],999);
});
test('all 47 pieces use the host Three, final native scale and catalogue geometry',async()=>{
 const library=await loadTinderboxArt(T);
 try{for(const entry of entries.filter(a=>a.family!=='layout')){
  const m=library.create(entry.id);try{
   assert.ok(m.root instanceof T.Group);assert.deepEqual(m.root.scale.toArray(),[1,1,1]);
   const b=m.bounds;for(let i=0;i<3;i++){near(b.min.getComponent(i),entry.bounds.min[i]);near(b.max.getComponent(i),entry.bounds.max[i]);}
   assert.equal(m.diagnostics().triangles,entry.triangles);
   m.root.traverse(o=>{assert.deepEqual(o.scale.toArray(),[1,1,1]);});
  }finally{m.dispose();}
 }}finally{library.dispose();}
});
test('returning donor compiler and current Nautilus retain exact native wall panels across tiers',async()=>{
 const library=await loadTinderboxArt(T);
 try{for(const venue of ['new-york','administration','horticulture','fisheries']){
  const plan=library.plan(venue);for(const run of plan.walls){
   const stories=Math.min(5,run.endLevel-run.startLevel),segment={id:run.id,a:[run.a[0]+512,run.a[1]+512],b:[run.b[0]+512,run.b[1]+512],z:0,stories,material:'wood'};
   assert.deepEqual(wallPanels(segment),sourcePanels(segment));
  }
 }}finally{library.dispose();}
});
test('four additive layouts preserve occupied floors, independent section selection and copied plans',async()=>{
 const library=await loadTinderboxArt(T);
 try{for(const venue of ['new-york','administration','horticulture','fisheries']){
  const plan=library.plan(venue),copy=library.plan(venue);plan.props[0].x=99999;assert.notEqual(copy.props[0].x,99999);
  const full=library.create(id(venue,'layout')),empty=library.create(id(venue,'layout'),{levels:[]});
  try{assert.deepEqual(full.metadata.levels,copy.occupiedLevels);assert.equal(full.metadata.selectedPropIds.length,copy.props.length);assert.equal(empty.diagnostics().triangles,0);
   assert.ok(full.metadata.nativePieces.every(p=>p.native?Math.abs(p.width-1)<1e-6&&Math.abs(p.height-2)<1e-6:true));
   const section=library.create(id(venue,'layout'),{levels:[copy.occupiedLevels[0]],sectionBounds:{min:[-5,0,0],max:[5,200,10]},includeCeilings:false});
   try{assert.ok(section.diagnostics().triangles<full.diagnostics().triangles);assert.ok(section.metadata.selectedPropIds.every(pid=>copy.props.some(p=>p.id===pid&&p.level===copy.occupiedLevels[0])));}finally{section.dispose();}
  }finally{full.dispose();empty.dispose();}
 }}finally{library.dispose();}
});
test('waterfront rotation and neighbours share native deck height without filling the inner notch',async()=>{
 const library=await loadTinderboxArt(T);
 try{for(let q=0;q<4;q++){
  const a=library.create(id('quay-rail','waterfront'),{quarterTurns:q}),offset=new T.Vector3(1,0,0).applyAxisAngle(new T.Vector3(0,1,0),q*Math.PI/2);
  const b=library.create(id('quay-rail','waterfront'),{position:[Math.round(offset.x),0,Math.round(offset.z)],quarterTurns:q});
  try{near(a.root.position.distanceTo(b.root.position),1);assert.equal(a.metadata.nativeProfile.floorSpacing,2.12);
   const slab=a.metadata.floorTiles[0];assert.equal(slab.top,2.12);
   const A=new T.Vector3(1,2.12,.5).applyMatrix4(a.root.matrixWorld),B=new T.Vector3(0,2.12,.5).applyMatrix4(b.root.matrixWorld);near(A.distanceTo(B),0);
  }finally{a.dispose();b.dispose();}
 }
 const corner=library.create(id('quay-inner-corner','waterfront')),stairs=library.create(id('quay-stairs','waterfront'));
 try{assert.equal(corner.metadata.gridCells.length,3);assert.equal(corner.metadata.gridCells.some(p=>p[0]===1&&p[1]===1),false);assert.ok(stairs.metadata.footprint[0].some(p=>p[1]===-4));assert.equal(stairs.metadata.treads.length,12);}finally{corner.dispose();stairs.dispose();}
 }finally{library.dispose();}
});
test('tank appearance toggles quietly, restores, retains identity and follows placed bounds',async()=>{
 const library=await loadTinderboxArt(T);
 try{for(const name of ['aquarium-small','aquarium-large','aquarium-inner']){
  const tank=library.create(id(name),{position:[7,2.12,9],quarterTurns:1}),other=library.create(id(name));
  try{const target=tank.metadata.damageTargets[0].id,geometry=new Set(),materials=new Set();tank.root.traverse(o=>{if(o.isMesh){geometry.add(o.geometry);materials.add(o.material);}});
   assert.equal(tank.setTankDestroyed(target,true),true);assert.equal(tank.setTankDestroyed(target,true),false);assert.equal(tank.getTankState(target),'destroyed');assert.equal(other.getTankState(target),'intact');
   const measured=new T.Box3().setFromObject(tank.root);near(measured.min.x,tank.bounds.min.x);near(measured.max.z,tank.bounds.max.z);
   tank.root.traverse(o=>{if(o.isMesh){assert.ok(geometry.has(o.geometry));assert.ok(materials.has(o.material));}});
   assert.equal(tank.setTankDestroyed(target,false),true);assert.throws(()=>tank.setTankDestroyed('missing'),/Unknown/);assert.throws(()=>tank.setTankDestroyed(target,1),/boolean/);
  }finally{tank.dispose();other.dispose();}
 }}finally{library.dispose();}
});
test('Fisheries restores one of fifty stable tanks without changing its neighbours',async()=>{
 const library=await loadTinderboxArt(T),layout=library.create(id('fisheries','layout'));
 try{const targets=layout.metadata.damageTargets;assert.equal(targets.length,50);const first=targets[0].id,next=targets[1].id;layout.setTankDestroyed(first);assert.equal(layout.getTankState(next),'intact');
  const restored=library.create(id('fisheries','layout'),{destroyedTankIds:[first]});try{assert.equal(restored.getTankState(first),'destroyed');assert.equal(restored.getTankState(next),'intact');}finally{restored.dispose();}
 }finally{library.dispose();}
});
test('invalid IDs, placement, unsupported scale and appearance fail before live mutation',async()=>{
 await assert.rejects(loadTinderboxArt({}),/Three/);const library=await loadTinderboxArt(T),good=library.create(id('writing-desk'));
 try{for(const [asset,options]of [[id('missing'),{}],[id('writing-desk'),{scale:2}],[id('writing-desk'),{quarterTurns:4}],[id('writing-desk'),{materials:{wood:{}}}],[id('writing-desk'),{textures:{wood:null}}],[id('quay-rail','waterfront'),{position:[.5,0,0]}],[id('new-york','layout'),{includeCeilings:'yes'}],[id('new-york','layout'),{levels:[99]}]])assert.throws(()=>library.create(asset,options));
  assert.ok(good.diagnostics().triangles>0);assert.deepEqual(good.root.position.toArray(),[0,0,0]);
 }finally{library.dispose();}
});
test('owned resources retire exactly once; borrowed materials, paint and scene survive',async()=>{
 const library=await loadTinderboxArt(T),paint=new T.Texture(),material=new T.MeshStandardMaterial({map:paint}),scene=new T.Scene();let borrowed=0,disposed=0;
 paint.addEventListener('dispose',()=>borrowed++);material.addEventListener('dispose',()=>borrowed++);
 const prop=library.create(id('writing-desk'),{materials:{wood:material}}),quay=library.create(id('quay-rail','waterfront'),{textures:{facade:paint}});scene.add(prop.root,quay.root);
 const resources=new Set();for(const model of [prop,quay])model.root.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);if(o.isInstancedMesh)resources.add(o);}});
 for(const resource of resources)resource.addEventListener('dispose',()=>disposed++);
 assert.throws(()=>quay.setAppearance({materials:{facade:{}}}));assert.ok(quay.diagnostics().triangles>0);
 library.dispose();library.dispose();prop.dispose();quay.dispose();assert.equal(borrowed,0);assert.equal(disposed,resources.size);assert.equal(scene.children.length,0);assert.throws(()=>prop.diagnostics(),/disposed/);assert.throws(()=>library.create(id('writing-desk')),/disposed/);
 material.dispose();paint.dispose();
});
test('installed profiles contain guides and optional closure without importing raw donor game',()=>{
 for(const profile of ['core','renderer','assets','compatibility']){
  const d=distribution(profile);assert.ok(d.files.includes('packages/tinderbox-art/README.md'));assert.ok(!d.files.some(f=>f.startsWith('vendor/tinderbox-art/')||f.startsWith('vendor/tinderbox-medicine/')));
  if(['renderer','compatibility'].includes(profile))assert.ok(d.files.includes('packages/tinderbox-art/native/interiors.js'));
  if(profile==='core')assert.ok(!d.files.includes('packages/tinderbox-art/native/interiors.js'));
 }
});
test('medicine snapshots restore, hide consumed IDs while paused, reject atomically and never scale to radius',async()=>{
 const paint=new T.Texture(),material=new T.MeshStandardMaterial({map:paint});let borrowed=0;paint.addEventListener('dispose',()=>borrowed++);material.addEventListener('dispose',()=>borrowed++);
 const view=await loadTinderboxMedicine(T,{materials:{shirt:material}});
 const records=['powder','healing','inversion'].map((kind,i)=>({id:'pickup-'+i,kind,x:i,y:2,radius:.3}));
 try{view.update(records,{paused:true});assert.equal(view.diagnostics().visiblePickups,3);const initial=new T.Box3().setFromObject(view.root).getSize(new T.Vector3());
  view.update(records.map(p=>({...p,radius:10})));assert.deepEqual(new T.Box3().setFromObject(view.root).getSize(new T.Vector3()).toArray(),initial.toArray());
  assert.throws(()=>view.update([records[0],records[0]]));assert.equal(view.diagnostics().visiblePickups,3);
  view.update(records.map((p,i)=>({...p,consumed:i===0})),{paused:true});assert.equal(view.diagnostics().visiblePickups,2);
  view.update([]);assert.equal(view.diagnostics().visiblePickups,0);view.update(records);assert.equal(view.diagnostics().visiblePickups,3);
 }finally{view.dispose();view.dispose();}assert.equal(borrowed,0);assert.throws(()=>view.update(records),/disposed/);material.dispose();paint.dispose();
});
test('waterfront and medicine load independently while landmark imports are forbidden',()=>{
 const facade=new URL('../packages/assets/three.js',import.meta.url).href,three=new URL('../packages/render-effects/three.js',import.meta.url).href;
 const script=`import{registerHooks}from'node:module';registerHooks({resolve(s,c,n){if(/native\\/(?:interiors|plans)\\.js$/.test(s))throw Error('Heavy interior import forbidden');return n(s,c)}});const T=await import(${JSON.stringify(three)});const{loadTinderboxArt,loadTinderboxMedicine}=await import(${JSON.stringify(facade)});const a=await loadTinderboxArt(T,{families:['waterfront']});a.create('tinderbox:waterfront:quay-rail').dispose();a.dispose();const m=await loadTinderboxMedicine(T);m.update([{id:'p',kind:'powder',x:0,y:0,radius:1}]);m.dispose();`;
 execFileSync(process.execPath,['--input-type=module','-e',script],{windowsHide:true});
});
