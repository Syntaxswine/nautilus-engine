import test from 'node:test';
import assert from 'node:assert/strict';
import {cores,smartTileFixture} from './fixtures/smart-tile-editor/source.mjs';
import * as examples from '../packages/tile-visuals/example.js';
import * as art from '../packages/tile-visuals/prepare.js';
import * as presenter from '../packages/tile-visuals/three.js';
import * as T from '../packages/render-effects/three.js';
import {createFloorNavigation} from '../packages/floor-navigation/index.js';
import {createSmartTilePresentation} from '../apps/editor/smart-tile/presentation.js';
import {createSmartTileSession} from '../apps/editor/smart-tile/session.js';
import {createSmartTileStorage} from '../apps/editor/smart-tile/storage.js';

async function setup(){
 const f=smartTileFixture({empty:true}),values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},key='nautilus-smart-tile-editor-test';let before=()=>{},after=()=>{},viewHook=()=>{},n=0;
 const scene=new T.Scene(),material=new T.MeshBasicMaterial({color:0xbcb7a3,side:T.DoubleSide}),slate=new T.MeshBasicMaterial({color:0x718d93,side:T.DoubleSide}),sand=new T.MeshBasicMaterial({color:0xc7a17b,side:T.DoubleSide}),line=new T.LineBasicMaterial(),pool=[material,slate,sand,line],disposals=pool.map(()=>0);pool.forEach((v,i)=>v.addEventListener('dispose',()=>disposals[i]++));
 const materials={skins:{'skin.painterly':material,'skin.slate':slate,'skin.sandstone':sand},boundary:material,line},base=createSmartTilePresentation({tiles:cores.tiles,art,presenter,THREE:T,scene,materials,sectorSizeM:cores.mapCore.MAP_CONTRACT.blockSize}),created=[];
 const presentation={acquire(b,o){const v=base.acquire(b,o);if(v){created.push(v);viewHook(v);}return v;},attach:base.attach};
 const authority=createSmartTileStorage(cores,{storage,key,initialCheckpoint:f.checkpoint,beforeWrite:p=>before(p),afterWrite:p=>after(p)}),floors=createFloorNavigation({floors:f.floors,selectedId:'0'}),options={authority,floorController:floors,presentation,newId:()=>String(++n)};
 const session=await createSmartTileSession({...cores,examples},options);
 return {session,created,scene,f,options,authority,pool,disposals,storage,key,set before(v){before=v;},set after(v){after=v;},set viewHook(v){viewHook=v;},close(){session.dispose();floors.dispose();for(const v of pool)v.dispose();}};
}
async function review(h,origin=[20,20]){h.session.setDraft({tool:'rectangle',ownerId:null,origin,widthM:8,depthM:4,seed:17});const r=await h.session.review();assert.equal(r.ok,true,JSON.stringify(r));return r;}
async function apply(h,origin){const r=await review(h,origin);assert.equal((await h.session.apply(r.reviewId)).committed,true);}

test('actual public native presentation derives a seam-crossing whole owner and distinct confirmed view',async t=>{
 const h=await setup();t.after(()=>h.close());const r=await review(h),snapshot=h.session.getSnapshot(),view=h.created.at(-1);
 assert.equal(snapshot.readiness.visual.state,'candidate');assert.equal(snapshot.readiness.visual.revision,0);assert.equal(snapshot.owners.length,0);assert.equal(view.cellCount,32);assert.deepEqual([...new Set(view.cells.map(c=>c.sector[0]))],[0,1]);assert.equal(new Set(view.cells.map(c=>c.ownerId)).size,1);assert.ok(view.root.children[0].children.some(n=>n.isMesh));
 assert.equal((await h.session.apply(r.reviewId)).committed,true);assert.equal(h.session.getSnapshot().readiness.visual.state,'accepted');assert.equal(h.session.getSnapshot().readiness.visual.revision,1);assert.equal(view.root.userData.smartTileRole,'accepted');assert.deepEqual(h.disposals,[0,0,0,0]);
 h.options.floorController.select('1');await apply(h,[40,20]);const high=h.created.at(-1).projection.entries.find(e=>e.placement.floorBindings.base==='1');assert.equal(high.loops[0][0][2],2.12);assert.ok(h.session.getSnapshot().resources.triangles<=50000);assert.ok(h.session.getSnapshot().resources.cells<=1024);
});

test('throwing native dispose observers drain all geometry and preserve borrowed neighbours/pool',async t=>{
 const h=await setup();t.after(()=>h.close());await apply(h);const borrowed=new T.Mesh(new T.BoxGeometry(),h.pool[0]);h.scene.add(borrowed);let borrowedDisposals=0;borrowed.geometry.addEventListener('dispose',()=>borrowedDisposals++);
 const accepted=h.created.at(-1),owned=[];accepted.root.traverse(n=>{if(n.geometry&&!owned.includes(n.geometry))owned.push(n.geometry);});let disposed=0;
 for(const g of owned)g.addEventListener('dispose',()=>{disposed++;throw Error('injected native observer');});
 await apply(h,[30,20]);assert.equal(disposed,owned.length);assert.equal(accepted.diagnostics().ownedGeometry,0);assert.equal(accepted.root.parent,null);assert.equal(borrowed.parent,h.scene);assert.equal(borrowedDisposals,0);assert.deepEqual(h.disposals,[0,0,0,0]);assert.equal(h.session.getSnapshot().resources.retiring,0);
 h.session.dispose();assert.equal(h.session.getSnapshot().resources.roots,0);assert.equal(borrowed.parent,h.scene);assert.equal(borrowedDisposals,0);borrowed.removeFromParent();borrowed.geometry.dispose();
});

test('native removed callback cancellation preserves the confirmed new owner and positive acknowledgement',async t=>{
 const h=await setup();t.after(()=>h.close());await apply(h);const old=h.created.at(-1);let called=false;
 old.root.addEventListener('removed',()=>{called=true;h.session.cancel('removed callback');throw Error('injected removed observer');});
 const r=await review(h,[30,20]);assert.equal((await h.session.apply(r.reviewId)).committed,true);assert.equal(called,true);assert.equal(h.session.getSnapshot().history.undo,2);assert.equal(h.session.getSnapshot().phase,'idle');assert.equal(h.session.getSnapshot().resources.roots,1);assert.equal(h.session.getSnapshot().readiness.visual.revision,2);assert.deepEqual(h.disposals,[0,0,0,0]);
});

test('native added observer cancellation and reparenting cannot resurrect a retired allocation',async t=>{
 const h=await setup();t.after(()=>h.close());const foreign=new T.Group();h.scene.add(foreign);let retired;
 h.viewHook=v=>{retired=v;v.root.addEventListener('added',()=>{h.session.cancel('native added');if(v.root.parent!==foreign)foreign.add(v.root);});};
 h.session.setDraft({tool:'rectangle',ownerId:null,origin:[12,20],widthM:8,depthM:4,seed:17});assert.equal((await h.session.review()).ok,false);assert.equal(retired.root.parent,null);assert.equal(retired.diagnostics().ownedGeometry,0);assert.equal(foreign.children.length,0);assert.equal(h.session.getSnapshot().resources.roots,1);assert.deepEqual(h.disposals,[0,0,0,0]);
});

test('real storage pending stage survives session disposal and reopens for same-ID recovery',async t=>{
 const h=await setup();t.after(()=>h.close());const r=await review(h);h.before=p=>{if(p.phase==='commit')throw Error('before write');};assert.equal((await h.session.apply(r.reviewId)).committed,null);const raw=h.storage.getItem(h.key);assert.equal(JSON.parse(raw).journal.pending.id,r.requestId);h.session.dispose();h.before=()=>{};
 const reopened=await createSmartTileSession({...cores,examples},h.options);t.after(()=>reopened.dispose());assert.equal(reopened.getSnapshot().phase,'recovery-required');assert.equal(reopened.getSnapshot().actions.save,false);assert.equal((await reopened.recover(r.requestId)).committed,false);assert.equal(reopened.getSnapshot().history.undo,0);assert.equal(reopened.getSnapshot().phase,'idle');assert.equal(JSON.parse(h.storage.getItem(h.key)).journal.pending,null);
});

test('unknown stage acknowledgements and foreign authority preserve exact operation and freeze saves',async t=>{
 const h=await setup();t.after(()=>h.close());const r=await review(h);h.after=p=>{if(p.phase==='stage')throw Error('stage lost acknowledgement');};assert.equal((await h.session.apply(r.reviewId)).committed,null);assert.equal(JSON.parse(h.storage.getItem(h.key)).journal.pending.id,r.requestId);assert.equal(h.session.save().ok,false);h.after=()=>{};
 const pending=h.storage.getItem(h.key),foreign=JSON.parse(pending);foreign.document.sourceJSON=foreign.document.sourceJSON.replace('Complete retained','Changed retained');h.storage.setItem(h.key,JSON.stringify(foreign));assert.equal((await h.session.recover(r.requestId)).committed,null);assert.equal(h.session.getSnapshot().phase,'recovery-required');h.storage.setItem(h.key,pending);assert.equal((await h.session.recover(r.requestId)).committed,false);
});
