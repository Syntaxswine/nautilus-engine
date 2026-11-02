import test from 'node:test';
import assert from 'node:assert/strict';
import {actual,harness,stack,saved,review,apply} from './fixtures/tile-stack-editor/b1.mjs';
import {createTileStackStorage} from '../apps/editor/tile-stack/checkpoint.js';
const clone=structuredClone;
const rectangle=(ownerId=null)=>({tool:'rectangle',ownerId,origin:[60,20],widthM:8,depthM:4,seed:771,finishId:'skin.painterly'});

test('B1 targeted rectangles refuse unknown/unlocked/locked owners without construction or lost redo/view; null still constructs',async t=>{
  const h=await harness();t.after(()=>h.session.dispose());await apply(h);
  const owners=saved(h).document.tileBundle.layout.instances,unlocked=owners.find(v=>!v.locked),locked=owners.find(v=>v.locked);
  await apply(h,{tool:'finish',ownerId:unlocked.id,finishId:'skin.slate'});assert.equal((await h.session.undo()).committed,true);
  const before=saved(h),state=h.session.getSnapshot(),counts=clone(h.counts),writes=h.writes.length,views=h.views.length,accepted=h.views.find(v=>!v.diagnostics().disposed);
  assert.equal(state.history.redo,1);assert.equal(before.document.tileBundle.layout.instances.length,15);
  for(const ownerId of ['missing-requested-owner',unlocked.id,locked.id]){
    const result=h.session.setDraft(rectangle(ownerId));assert.equal(result.ok,false,ownerId);assert.equal(result.code,'STACK_RECTANGLE_TARGET_UNBOUND');
    assert.ok(result.diagnostics.some(d=>d.code===result.code&&d.path==='/draft/ownerId'&&d.message.includes('edit-owners')));
    assert.equal((await h.session.review()).ok,false);assert.deepEqual(saved(h),before);
    const current=h.session.getSnapshot();for(const key of ['phase','tool','draft','selectedOwnerId','reviewId','revision','checkpointSerial','history','resources'])assert.deepEqual(current[key],state[key],ownerId+': '+key);
    assert.deepEqual(h.counts,counts);assert.equal(h.writes.length,writes);assert.equal(h.views.length,views);assert.equal(accepted.diagnostics().disposed,false);assert.equal(accepted.root.visible,true);
  }
  await apply(h,rectangle(null));const after=saved(h),oldIds=new Set(owners.map(v=>v.id));
  assert.equal(after.document.tileBundle.layout.instances.length,16);assert.equal(after.document.constraints.owners.length,16);
  assert.equal(after.document.tileBundle.layout.instances.filter(v=>!oldIds.has(v.id)).length,1);
  for(const owner of before.document.tileBundle.layout.instances)assert.deepEqual(after.document.tileBundle.layout.instances.find(v=>v.id===owner.id),owner);
  assert.deepEqual(after.document.constraints.managedRelations,before.document.constraints.managedRelations);assert.equal(after.document.sourceJSON,before.document.sourceJSON);
  assert.equal(h.counts.prepare,counts.prepare+1);assert.equal(h.counts.apply,counts.apply+1);assert.equal(h.session.getSnapshot().history.redo,0);
});

// Reuse immutable records from actual retained preparations and one real pending
// write. Each storage probe below owns its own in-memory namespace adapter.
let fixturePromise;
function storageFixture(){return fixturePromise??=(async()=>{
  const h=await harness();try{
    const initial=h.binding.codec.open(saved(h));await apply(h,{...rectangle(),origin:[20,20]});const committed=h.binding.codec.open(saved(h));
    const r=await review(h,{...rectangle(),origin:[40,20]});assert.equal(r.ok,true,JSON.stringify(r));
    h.hook=(packet,when)=>{if(packet.phase==='stage'&&when==='after')throw Error('Keep a complete original pending checkpoint for storage probes');};
    assert.equal((await h.session.apply(r.reviewId)).committed,null);const pending=h.binding.codec.open(h.raw);
    assert.equal(pending.journal.serial,1);assert.equal(pending.journal.receipts.length,1);assert.equal(pending.journal.pending.id,r.requestId);
    assert.deepEqual(h.counts,{prepare:2,apply:1});
    return {binding:h.binding,initial,committed,pending,key:h.key,foreignKey:'nautilus-smart-tile-editor-stack-v2:foreign-workspace'};
  }finally{h.session.dispose();}
})();}
function storageProbe(f,{occupied=true,onGet=()=>{}}={}){
  const committedJSON=f.binding.codec.serialize(f.committed),values=new Map([[f.foreignKey,committedJSON]]),calls=[];
  if(occupied)values.set(f.key,committedJSON);
  return {values,calls,storage:{getItem(key){calls.push({kind:'get',key});onGet(key);return values.get(key)??null;},setItem(key,value){calls.push({kind:'set',key});values.set(key,value);}}};
}

test('B1 invalid or foreign complete initial checkpoints cannot read/write either namespace or invoke source getters',async()=>{
  const f=await storageFixture();let getters=0;
  const foreign=clone(f.initial);foreign.document.id='foreign-workspace';
  const future=clone(f.initial);future.version=99;
  const badReceipt=clone(f.committed);badReceipt.journal.serial=0;
  const badPending=clone(f.pending);badPending.journal.pending.request.id='different-original-request';
  const accessor=clone(f.initial);Object.defineProperty(accessor.document,'id',{enumerable:true,get(){getters++;return 'foreign-workspace';}});
  for(const initialCheckpoint of [foreign,future,badReceipt,badPending,accessor]){
    const p=storageProbe(f),before=[...p.values];
    assert.throws(()=>createTileStackStorage(actual,{binding:f.binding,storage:p.storage,initialCheckpoint}));
    assert.deepEqual(p.calls,[]);assert.deepEqual([...p.values],before);
  }
  assert.equal(getters,0);
});

test('B1 occupied storage owns initial source before getItem mutation and stages/commits only the validated namespace',async()=>{
  const f=await storageFixture(),raw=clone(f.committed);let mutated=false;
  const p=storageProbe(f,{onGet(){if(mutated)return;mutated=true;raw.document.id='foreign-workspace';raw.document.sourceJSON='invalid source after validation';raw.document.floorBinding.floors[0].elevationM=999;raw.journal.receipts=[];raw.journal.serial=0;}}),foreignBefore=p.values.get(f.foreignKey);
  const authority=createTileStackStorage(actual,{binding:f.binding,storage:p.storage,initialCheckpoint:raw});
  assert.equal(mutated,true);assert.deepEqual(authority.read(),f.committed);assert.equal(p.calls.filter(v=>v.kind==='set').length,0);
  const staged=authority.stage(f.pending.journal.pending,()=>true);assert.equal(staged.ack,true);assert.deepEqual(staged.checkpoint,f.pending);
  const committed=authority.commit(staged.checkpoint,()=>true);assert.equal(committed.ack,true);assert.equal(committed.checkpoint.journal.receipts.length,2);
  assert.equal(committed.checkpoint.document.id,f.committed.document.id);assert.equal(committed.checkpoint.document.sourceJSON,f.committed.document.sourceJSON);
  assert.equal(p.values.get(f.foreignKey),foreignBefore);assert.ok(p.calls.every(v=>v.key===f.key));assert.equal(p.calls.filter(v=>v.kind==='set').length,2);
});

test('B1 empty storage adopts the complete owned initial pending/receipts despite getItem source mutation, then recovers original ID',async()=>{
  const f=await storageFixture(),raw=clone(f.pending),expectedJSON=f.binding.codec.serialize(f.pending);let mutated=false;
  const p=storageProbe(f,{occupied:false,onGet(){if(mutated)return;mutated=true;raw.document.id='foreign-workspace';raw.document.sourceJSON='invalid source after validation';raw.document.finishBinding.digest='f'.repeat(64);raw.journal.receipts=[];raw.journal.serial=0;raw.journal.pending=null;}}),foreignBefore=p.values.get(f.foreignKey);
  const authority=createTileStackStorage(actual,{binding:f.binding,storage:p.storage,initialCheckpoint:raw});
  assert.equal(mutated,true);assert.equal(p.values.get(f.key),expectedJSON);assert.deepEqual(authority.read(),f.pending);
  assert.equal(authority.read().journal.receipts.length,1);assert.equal(authority.read().journal.pending.id,f.pending.journal.pending.id);
  const recovered=authority.recover(f.pending,f.pending.journal.pending.id);assert.equal(recovered.state,'settled');assert.equal(recovered.outcome,'not-committed');
  assert.deepEqual(recovered.checkpoint.journal.receipts[0],f.committed.journal.receipts[0]);assert.deepEqual(recovered.checkpoint.document,f.committed.document);assert.equal(recovered.checkpoint.journal.receipts.length,2);
  assert.equal(p.values.get(f.foreignKey),foreignBefore);assert.ok(p.calls.every(v=>v.key===f.key));assert.equal(p.calls.filter(v=>v.kind==='set').length,2);
});
