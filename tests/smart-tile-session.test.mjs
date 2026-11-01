import test from 'node:test';
import assert from 'node:assert/strict';
import {cores,smartTileFixture} from './fixtures/smart-tile-editor/source.mjs';
import * as examples from '../packages/tile-visuals/example.js';
import {createFloorNavigation} from '../packages/floor-navigation/index.js';
import {createSmartTileAuthority} from '../apps/editor/smart-tile/authority.js';
import {createSmartTileSession} from '../apps/editor/smart-tile/session.js';
import {smartTileDigest} from '../apps/editor/smart-tile/checkpoint.js';
const clone=structuredClone,rectangle=(origin=[20,20])=>({tool:'rectangle',ownerId:null,origin,widthM:8,depthM:4,seed:17});
async function harness({empty=true}={}){
  const f=smartTileFixture({empty});let raw=JSON.stringify(f.checkpoint),ordinal=0,hook=()=>{},acquireHook=null,attachHook=null,session;
  const calls=[],views=[];
  const authority=createSmartTileAuthority(cores,{read:()=>raw,write(packet){calls.push({phase:packet.phase,requestId:packet.requestId});const result=hook(packet,'before');if(result!==undefined)return result;if(smartTileDigest(JSON.parse(raw))!==packet.expectedRecordDigest||!packet.canCommit())return false;raw=packet.nextJSON;const after=hook(packet,'after');return after===undefined?true:after;}});
  const floors=createFloorNavigation({floors:f.floors,selectedId:'0',cancelPreview(){session?.cancel('before-plane');}});
  const presentation={async acquire(bundle,budget){if(acquireHook)await acquireHook(bundle,budget);let disposed=false;const view={root:{visible:true},cellCount:bundle.layout.instances.length,diagnostics:()=>({triangles:disposed?0:bundle.layout.instances.length*10,disposed,ownedGeometry:disposed?0:1}),dispose(){disposed=true;}};views.push(view);return view;},attach(root){attachHook?.(root);}};
  session=await createSmartTileSession({...cores,examples},{authority,floorController:floors,presentation,newId:()=>String(++ordinal)});
  return {f,session,floors,authority,calls,views,get raw(){return raw;},set raw(v){raw=v;},set hook(v){hook=v;},set acquireHook(v){acquireHook=v;},set attachHook(v){attachHook=v;}};
}
async function review(h,d=rectangle()){assert.equal(h.session.setDraft(d).ok,true);const r=await h.session.review();assert.equal(r.ok,true,JSON.stringify(r));return r;}
async function apply(h,d){const r=await review(h,d);const result=await h.session.apply(r.reviewId);assert.equal(result.committed,true,JSON.stringify(result));return result;}
const saved=h=>JSON.parse(h.session.save().checkpointJSON);

test('real public rectangle repair, straight join, explicit lock/finish and one atomic history',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());const original=h.raw;
 const r=await review(h);assert.equal(h.raw,original);assert.equal(h.session.getSnapshot().owners.length,0);assert.equal(h.session.getSnapshot().phase,'review');
 assert.equal((await h.session.apply(r.reviewId)).committed,true);const first=saved(h),a=first.document.tileBundle.layout.instances[0];
 await apply(h,rectangle([28,20]));const second=saved(h),b=second.document.tileBundle.layout.instances.find(v=>v.id!==a.id);
 assert.equal(second.document.tileBundle.layout.joins.length,1);assert.equal(a.recipeId,b.recipeId);assert.equal(h.session.getSnapshot().history.undo,2);
 const lock=await h.session.lockOwner(b.id);assert.equal(lock.ok,true);assert.equal((await h.session.apply(lock.reviewId)).committed,true);
 const locked=saved(h);await apply(h,{tool:'finish',ownerId:a.id,skinId:'skin.slate'});const finished=saved(h);
 assert.deepEqual(finished.document.tileBundle.layout.instances.find(v=>v.id===b.id),locked.document.tileBundle.layout.instances.find(v=>v.id===b.id));
 assert.deepEqual(finished.document.tileBundle.recipes.find(v=>v.id===b.recipeId),locked.document.tileBundle.recipes.find(v=>v.id===b.recipeId));
 assert.equal(finished.document.sourceJSON,h.f.sourceJSON);assert.equal(h.session.getSnapshot().history.undo,4);assert.equal(h.calls.filter(v=>v.phase==='commit').length,4);
 assert.equal((await h.session.undo()).committed,true);assert.deepEqual(saved(h).document,locked.document);assert.equal((await h.session.redo()).committed,true);assert.deepEqual(saved(h).document,finished.document);
 assert.equal((await h.session.apply(r.reviewId)).ok,false);
});

test('exact line arc and cubic controls and actual supplied upper floor survive save/reopen',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());h.floors.select('1');
 for(const [i,kind]of ['line','arc','cubic'].entries()){const path=examples.pathRecipe('saved-'+kind,kind).shape.path;await apply(h,{tool:'path',ownerId:null,origin:[i*25+2,2],path,widthM:.85,seed:771+i});const c=saved(h),v=c.document.tileBundle.layout.instances.at(-1),r=c.document.tileBundle.recipes.find(r=>r.id===v.recipeId);assert.deepEqual(r.shape.path,path);assert.equal(v.origin[2],2.12);assert.equal(v.floorBindings.base,'1');}
 const text=h.session.save().checkpointJSON,doc=saved(h).document;assert.equal((await h.session.open(text)).ok,true);assert.equal(h.session.getSnapshot().history.undo,0);assert.deepEqual(saved(h).document,doc);
});

test('refusal, wrong floor binding and cancelled acquisition preserve redo and accepted view',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());await apply(h);await apply(h,rectangle([40,20]));await h.session.undo();const before=saved(h),accepted=h.views.filter(v=>!v.diagnostics().disposed)[0];
 const r=await h.session.setDraft(rectangle());assert.equal(r.ok,true);assert.equal((await h.session.review()).ok,false);assert.equal(h.session.getSnapshot().history.redo,1);assert.deepEqual(saved(h).document,before.document);
 let release;h.acquireHook=()=>new Promise(resolve=>release=resolve);h.session.setDraft(rectangle([70,20]));const pending=h.session.review();await new Promise(resolve=>setImmediate(resolve));h.floors.select('1');release();assert.equal((await pending).ok,false);assert.equal(h.session.getSnapshot().history.redo,1);assert.equal(accepted.diagnostics().disposed,false);assert.deepEqual(saved(h).document,before.document);
 const wrong=clone(before);wrong.document.floorBinding.floors[1].elevationM=3;assert.equal((await h.session.open(wrong)).ok,false);assert.deepEqual(saved(h).document,before.document);
});

for(const failure of ['before','after','nonboolean'])test('unknown '+failure+' write freezes all mutation and recovers original ID exactly once',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());await apply(h);await apply(h,rectangle([40,20]));await h.session.undo();const before=saved(h),redo=h.session.getSnapshot().history.redo,r=await review(h,rectangle([70,20]));
 h.hook=(p,when)=>{if(p.phase==='commit'&&when===(failure==='before'?'before':'after')){if(failure==='nonboolean')return 'unknown';throw Error('injected');}};
 const result=await h.session.apply(r.reviewId);assert.equal(result.committed,null);let snap=h.session.getSnapshot();assert.equal(snap.phase,'recovery-required');assert.equal(snap.recoveryId,r.requestId);
 assert.equal(h.session.save().ok,false);assert.equal((await h.session.undo()).ok,false);assert.equal((await h.session.redo()).ok,false);assert.equal((await h.session.open(JSON.stringify(before))).ok,false);assert.equal(h.session.setDraft(rectangle()).ok,false);assert.equal((await h.session.recover('new-id')).code,'RECOVERY_ID_MISMATCH');
 h.session.cancel();h.hook=()=>{};const recovered=await h.session.recover(r.requestId);assert.equal(recovered.committed,failure!=='before');snap=h.session.getSnapshot();assert.equal(snap.phase,'idle');assert.equal(snap.history.redo,failure==='before'?redo:0);
 const cp=saved(h),receipt=cp.journal.receipts.at(-1);assert.equal(receipt.id,r.requestId);assert.equal(receipt.operation.request.id,r.requestId);assert.equal(h.calls.filter(v=>v.phase==='commit'&&v.requestId===r.requestId).length,1);assert.equal((await h.session.recover(r.requestId)).ok,false);
 if(failure==='before')assert.deepEqual(cp.document,before.document);
});

test('cancel/floor/mode/reentry at the final writer fence cannot accept a stale edit',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());const r=await review(h);let retainedLease;
 h.hook=(p,when)=>{if(p.phase==='commit'&&when==='before'){retainedLease=p.canCommit;assert.equal(h.session.setDraft(rectangle()).code,'EDITOR_REENTRY');h.floors.select('1');}};
 assert.equal((await h.session.apply(r.reviewId)).committed,false);assert.equal(retainedLease(),false);assert.equal(saved(h).document.tileBundle.layout.instances.length,0);assert.equal(h.session.getSnapshot().history.undo,0);
 h.hook=()=>{};h.floors.select('0');const modeReview=await review(h);h.floors.setCharacter({id:'real-host-subject',floorId:'0'});h.floors.followCharacter();assert.equal(h.session.getSnapshot().reviewId,null);assert.equal((await h.session.apply(modeReview.reviewId)).ok,false);assert.equal(h.session.getSnapshot().floor.mode,'character-follow');
});

test('positive acknowledgement survives cancellation/disposal and retries only presentation',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());const r=await review(h);h.hook=(p,when)=>{if(p.phase==='commit'&&when==='after')h.session.cancel('post-write');};
 const result=await h.session.apply(r.reviewId);assert.equal(result.committed,true);assert.equal(h.session.getSnapshot().phase,'presentation-error');assert.equal(h.session.getSnapshot().history.undo,1);assert.equal(saved(h).journal.receipts.at(-1).outcome,'committed');
 h.hook=()=>{};const calls=h.calls.length;assert.equal((await h.session.retryPresentation()).ok,true);assert.equal(h.calls.length,calls);assert.equal(h.session.getSnapshot().phase,'idle');
 const again=await review(h,rectangle([40,20]));h.hook=(p,when)=>{if(p.phase==='commit'&&when==='after')h.session.dispose();};assert.equal((await h.session.apply(again.reviewId)).committed,true);assert.equal(JSON.parse(h.raw).document.tileBundle.layout.instances.length,2);assert.equal(h.session.getSnapshot().phase,'disposed');assert.equal(h.session.getSnapshot().resources.roots,0);
});

test('observer cancellation, late attachment and coalesced acquisition never resurrect roots',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());let release;h.acquireHook=()=>new Promise(resolve=>release=resolve);h.session.setDraft(rectangle());const old=h.session.review();await new Promise(resolve=>setImmediate(resolve));h.session.cancel();h.session.setDraft(rectangle([40,20]));const next=h.session.review();assert.ok(h.session.getSnapshot().resources.roots<=2);h.session.cancel();h.session.setDraft(rectangle([60,20]));const latest=h.session.review();h.acquireHook=null;release();assert.equal((await old).ok,false);assert.equal((await next).ok,false);assert.equal((await latest).ok,true);assert.equal(h.views.filter(v=>!v.diagnostics().disposed).length,2);
 h.session.cancel();h.attachHook=()=>h.session.cancel('added-listener');h.session.setDraft(rectangle([80,20]));assert.equal((await h.session.review()).ok,false);assert.equal(h.views.filter(v=>!v.diagnostics().disposed).length,1);
 h.attachHook=null;const unsub=h.session.subscribe(s=>{if(s.phase==='review')h.session.cancel('observer');});h.session.setDraft(rectangle([90,20]));assert.equal((await h.session.review()).ok,false);unsub();assert.equal(h.session.getSnapshot().resources.candidate,0);
});

test('historical/foreign checkpoint open and unsupported exports preserve the authoritative session',async t=>{
 const h=await harness();t.after(()=>h.session.dispose());const old=h.session.save().checkpointJSON;await apply(h);const before=saved(h);assert.equal((await h.session.open(old)).code,'CHECKPOINT_AUTHORITY_MISMATCH');assert.deepEqual(saved(h),before);assert.equal(h.session.getSnapshot().actions.exportLegacy,false);assert.equal(h.session.getSnapshot().actions.sendToGame,false);
});
