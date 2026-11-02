import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHarness,nativeStack,T,art,presenter,finishes,finishMetadata,actual} from './fixtures/tile-stack-editor/b2.mjs';
import {apply,saved} from './fixtures/tile-stack-editor/b1.mjs';
import {createTileStackPresentation,nativeInspectionPort} from '../apps/editor/tile-stack/presentation.js';
import {createSmartTileViews} from '../apps/editor/smart-tile/views.js';

// Real public retained preparation, actual public native provider/finish pool
// and actual T.dispose events. Synthetic atlas: no decoding, WebGL, GPU-release
// or GPU-leak claim. The later listeners are cleanup-delivery witnesses only.
let source;
async function document(){return structuredClone(await(source??=(async()=>{
 const h=await nativeHarness();try{
  await apply(h,nativeStack(h.document));assert.deepEqual(h.counts,{prepare:1,apply:1});const d=saved(h).document,original=d.tileBundle.recipes.find(r=>r.id===d.tileBundle.layout.instances[0].recipeId),recipes=finishMetadata.tileFinishCatalogue().families.map((family,i)=>({...structuredClone(original),id:'retirement.family.'+i,interior:{...original.interior,skinId:family.id}})),catalogue=actual.tiles.createTileCatalogue([...d.tileBundle.recipes,...recipes]);
  d.tileBundle=actual.tiles.tileBundle({...d.tileBundle.layout,catalogueDigest:catalogue.digest,instances:d.tileBundle.layout.instances.map((owner,i)=>({...owner,recipeId:recipes[i%4].id,contentDigest:actual.tiles.compileTileRecipe(recipes[i%4]).contentDigest}))},catalogue);actual.tiles.openTileBundle(d.tileBundle,{requireResolved:true});return d;
 }finally{h.dispose();}
})()));}
async function setup(){
 const d=await document(),atlas=new T.Texture({width:4,height:4});atlas.colorSpace=T.SRGBColorSpace;const base=new T.MeshStandardMaterial({roughness:.95,side:T.DoubleSide}),scene=new T.Scene(),released={atlas:false,base:false},borrowedDisposals={atlas:0,base:0},releaseCalls=[];atlas.addEventListener('dispose',()=>borrowedDisposals.atlas++);base.addEventListener('dispose',()=>borrowedDisposals.base++);
 const lease=(key,value,proof)=>({value,proof,release(){releaseCalls.push(key);released[key]=true;},diagnostics:()=>({released:released[key]})});
 const p=createTileStackPresentation({tiles:actual.tiles,art,presenter,finishes,finishMetadata,THREE:T,scene,floors:d.floorBinding.floors,sectorSizeM:24,atlasLease:lease('atlas',atlas,finishMetadata.TILE_FINISH_ATLAS),baseLease:lease('base',base)}),owner=createSmartTileViews({acquire:p.acquire,attach:p.attach}),r=await owner.acquire(d.tileBundle,()=>true);assert.equal(r.ok,true);assert.equal(owner.promote(r.record),true);
 const view=owner.accepted,groups=[...view.root.children],meshes=groups.flatMap(g=>g.children.filter(n=>n.isMesh)),geometry=new Set([...meshes.map(m=>m.geometry),...view.native.interfaces.map(i=>i.geometry)]),materials=new Set(meshes.map(m=>m.material));assert.equal(geometry.size,75);assert.equal(materials.size,4);assert.equal(owner.snapshot().triangles,930);assert.equal(owner.snapshot().cells,480);
 return {p,owner,view,groups,meshes,geometry,materials,base,atlas,released,releaseCalls,borrowedDisposals,close(){owner.dispose();p.dispose();if(released.base)base.dispose();if(released.atlas)atlas.dispose();}};
}
for(const failure of ['both','geometry','materials','none'])test('native dispose event receipts: '+failure,async t=>{
 const h=await setup();t.after(()=>h.close());const geometryCalls=new Map([...h.geometry].map(g=>[g,0])),materialCalls=new Map([...h.materials].map(m=>[m,0]));let geometryReceipts=0,materialReceipts=0;const override=new T.MeshStandardMaterial();let overrideDisposals=0;override.addEventListener('dispose',()=>overrideDisposals++);h.meshes[0].material=override;t.after(()=>override.dispose());
 for(const g of h.geometry){
  g.addEventListener('dispose',()=>{geometryCalls.set(g,geometryCalls.get(g)+1);assert.equal(h.p.snapshot().pool.leases,0);assert.equal(h.meshes[0].material,override);h.p.dispose();assert.deepEqual(h.released,{atlas:false,base:false});if(['both','geometry'].includes(failure))throw Error('Earlier actual BufferGeometry dispose listener');});
  g.addEventListener('dispose',()=>geometryReceipts++);
 }
 for(const m of h.materials){
  m.addEventListener('dispose',()=>{materialCalls.set(m,materialCalls.get(m)+1);assert.equal(h.p.snapshot().pool.disposed,false);h.p.dispose();assert.deepEqual(h.released,{atlas:false,base:false});if(['both','materials'].includes(failure))throw Error('Earlier actual finish Material dispose listener');});
  m.addEventListener('dispose',()=>materialReceipts++);
 }
 h.owner.dispose();h.p.dispose();assert.ok([...geometryCalls.values()].every(n=>n===1));assert.ok([...materialCalls.values()].every(n=>n===1));assert.equal(geometryReceipts,['both','geometry'].includes(failure)?0:75);assert.equal(materialReceipts,['both','materials'].includes(failure)?0:4);assert.equal(overrideDisposals,0);assert.deepEqual(h.borrowedDisposals,{atlas:0,base:0});assert.equal(h.view.native.diagnostics().ownedGeometry,0);
 const charges=h.owner.snapshot(),snapshot=h.p.snapshot();
 if(['both','geometry'].includes(failure)){
  assert.equal(h.view.diagnostics().disposed,false);assert.equal(h.view.diagnostics().retirement.geometry,'unverified');assert.equal(h.view.diagnostics().retirement.reservedGeometry,75);assert.deepEqual([charges.roots,charges.retiring,charges.triangles,charges.cells],[1,1,930,480]);assert.deepEqual(h.released,{atlas:false,base:false});
 }else {assert.equal(h.view.diagnostics().disposed,true);assert.deepEqual([charges.roots,charges.retiring,charges.triangles,charges.cells],[0,0,0,0]);}
 if(['both','materials'].includes(failure)){
  assert.equal(snapshot.pool.disposed,false);assert.equal(snapshot.pool.ownedMaterials,4);assert.equal(snapshot.pool.logicalOwnedMaterials,0);assert.equal(snapshot.pool.unverifiedMaterials,4);assert.deepEqual(h.released,{atlas:false,base:false});
 }else {assert.equal(snapshot.pool.disposed,true);assert.equal(snapshot.pool.ownedMaterials,0);}
 if(failure==='none'){assert.deepEqual(h.released,{atlas:true,base:true});assert.deepEqual(h.releaseCalls,['atlas','base']);}
 else assert.deepEqual(h.releaseCalls,[]);
 // Logical counters are already zero. Subsequent no-ops cannot clear taint or
 // fabricate later receipts, and cannot release a held borrowed dependency.
 h.view.dispose();h.owner.dispose();h.p.dispose();assert.deepEqual(h.owner.snapshot(),charges);assert.deepEqual(h.p.snapshot(),snapshot);assert.ok([...geometryCalls.values()].every(n=>n===1));assert.ok([...materialCalls.values()].every(n=>n===1));
});
test('retiring native view is excluded from visibility, picking and bounds even when a host reparents its old mesh',async t=>{
 const h=await setup();t.after(()=>h.close());for(const g of h.geometry)g.addEventListener('dispose',()=>{throw Error('Unverified actual geometry event');});h.owner.dispose();
 const group=h.groups[0],mesh=h.meshes[0];h.view.root.add(group);group.add(mesh);h.view.root.visible=group.visible=true;h.view.root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(24,100,22),new T.Vector3(0,-1,0));assert.ok(ray.intersectObject(mesh,false).length>0);
 h.p.setFloor('F01');nativeInspectionPort(h.p).set({mode:'selected-floor',cutawayFloorId:null});assert.equal(group.visible,true);assert.equal(h.p.hitOwner(ray),null);assert.equal(h.p.bounds().isEmpty(),true);assert.equal(h.owner.snapshot().retiring,1);h.view.root.remove(group);h.p.dispose();assert.deepEqual(h.released,{atlas:false,base:false});
});
