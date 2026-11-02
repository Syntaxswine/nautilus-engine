import test from 'node:test';
import assert from 'node:assert/strict';
import {actual,documentFixture,harness,stack,saved,review,apply} from './fixtures/tile-stack-editor/b1.mjs';
import {smartTileDigest,openSmartTileCheckpoint} from '../apps/editor/smart-tile/checkpoint.js';
import {plannerBindingSourceFixture} from './fixtures/tile-stack-editor/source-fixtures.mjs';
import {createTileStackCheckpointCodec,createTileStackStorage} from '../apps/editor/tile-stack/checkpoint.js';
const clone=structuredClone;

for(const profile of ['aft-native-fifteen','nonuniform-fifteen'])test('B1 real retained stack: '+profile+' commits 15 owners/105 crossings/14 locks once, with full Undo/Redo',async t=>{
  const h=await harness({document:documentFixture(profile)});t.after(()=>h.session.dispose());const before=saved(h),r=await review(h);
  assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(saved(h).document,before.document);assert.equal(h.counts.prepare,1);assert.equal(h.counts.apply,0);assert.equal(h.writes.length,0);
  assert.equal(h.session.getSnapshot().resources.cells,480);assert.equal((await h.session.apply(r.reviewId)).committed,true);
  const after=saved(h),l=after.document.tileBundle.layout;assert.equal(l.instances.length,15);assert.equal(l.relations.length,105);assert.equal(l.instances.filter(v=>v.locked).length,14);assert.ok(l.instances.every(v=>v.anchorIds.length===0));
  assert.deepEqual(l.floors,before.document.tileBundle.layout.floors);for(const v of l.instances)assert.equal(v.origin[2],l.floors.find(f=>f.id===v.floorBindings.base).elevationM);
  assert.equal(after.document.sourceJSON,before.document.sourceJSON);assert.deepEqual(after.document.floorBinding,before.document.floorBinding);assert.deepEqual(after.document.finishBinding,before.document.finishBinding);assert.equal(after.document.constraints.managedRelations.length,105);assert.equal(after.document.constraints.minimumClearanceM,2);
  assert.equal(h.session.getSnapshot().history.undo,1);assert.equal(h.counts.apply,1);assert.deepEqual(h.writes.map(v=>v.phase),['stage','commit']);
  assert.deepEqual(after.journal.receipts[0].operation.target,{tileBundle:after.document.tileBundle,constraints:after.document.constraints});assert.equal(after.version,2);assert.throws(()=>openSmartTileCheckpoint(actual,after));
  assert.equal((await h.session.undo()).committed,true);assert.deepEqual(saved(h).document,before.document);assert.equal((await h.session.redo()).committed,true);assert.deepEqual(saved(h).document,after.document);assert.equal(h.counts.prepare,1);assert.equal(h.counts.apply,1);assert.equal(h.session.getSnapshot().history.undo,1);
  const text=h.session.save().checkpointJSON;assert.equal((await h.session.open(text)).ok,true);assert.deepEqual(saved(h).document,after.document);assert.equal(h.session.getSnapshot().history.undo,0);
});

for(const keepAnchor of [false,true])test('B1 top-only finish keeps stronger/unrelated obligations and original '+(keepAnchor?'nonempty':'empty')+' anchors/source/locked owners',async t=>{
  const d=plannerBindingSourceFixture(actual);
  // Valid complete initial source with distinct lower 2m / upper 4m obligations.
  d.finishBinding={...documentFixture().finishBinding};d.constraints.managedRelations.forEach(r=>{if(r.id!=='lower-pair')r.clearanceM=4;});
  const layout=clone(d.tileBundle.layout);layout.relations=clone(d.constraints.managedRelations);if(keepAnchor)layout.instances.find(v=>v.id==='upper').anchorIds=[d.tileBundle.recipes[0].anchors[0].id];d.tileBundle=actual.tiles.tileBundle(layout,actual.tiles.createTileCatalogue(d.tileBundle.recipes));
  const h=await harness({document:d});t.after(()=>h.session.dispose());const before=saved(h),old=before.document.tileBundle.layout.instances.find(v=>v.id==='upper');
  await apply(h,{tool:'finish',ownerId:'upper',finishId:'skin.slate'});const after=saved(h),next=after.document.tileBundle.layout.instances.find(v=>v.id==='upper');
  assert.deepEqual(next,{...old,recipeId:next.recipeId,contentDigest:next.contentDigest});assert.deepEqual(next.anchorIds,old.anchorIds);assert.deepEqual(after.document.constraints,before.document.constraints);assert.equal(after.document.sourceJSON,before.document.sourceJSON);assert.equal(after.document.constraints.minimumClearanceM,2);
  for(const v of before.document.tileBundle.layout.instances.filter(v=>v.locked))assert.deepEqual(after.document.tileBundle.layout.instances.find(x=>x.id===v.id),v);
  assert.equal(after.document.tileBundle.recipes.find(r=>r.id===next.recipeId).interior.skinId,'skin.slate');assert.equal(h.counts.prepare,1);assert.equal(h.session.getSnapshot().history.undo,1);
  assert.equal((await h.session.undo()).committed,true);assert.deepEqual(saved(h).document,before.document);assert.equal((await h.session.redo()).committed,true);assert.deepEqual(saved(h).document,after.document);assert.equal(h.counts.prepare,1);
});

for(const failure of ['before','after'])test('B1 same-ID '+failure+' commit failure retains paired operation and original history ticket',async t=>{
  const h=await harness();t.after(()=>h.session.dispose());const before=saved(h),r=await review(h);assert.equal(r.ok,true,JSON.stringify(r));
  h.hook=(p,when)=>{if(p.phase==='commit'&&when===failure)throw Error('Injected unknown acknowledgement');};
  const result=await h.session.apply(r.reviewId);assert.equal(result.committed,null);assert.equal(h.session.getSnapshot().recoveryId,r.requestId);assert.equal(h.session.save().ok,false);assert.equal((await h.session.undo()).ok,false);assert.equal((await h.session.redo()).ok,false);assert.equal(h.session.setDraft(stack(h.document)).ok,false);
  assert.equal((await h.session.recover('different-request')).code,'RECOVERY_ID_MISMATCH');h.session.cancel('cannot-clear-unknown');h.hook=()=>{};
  assert.equal((await h.session.recover(r.requestId)).committed,failure==='after');const after=saved(h);assert.equal(after.journal.receipts.length,1);assert.equal(after.journal.receipts[0].id,r.requestId);assert.equal(h.counts.prepare,1);assert.equal(h.counts.apply,1);assert.equal(h.writes.filter(v=>v.phase==='commit').length,1);assert.equal(h.session.getSnapshot().history.undo,failure==='after'?1:0);
  if(failure==='before')assert.deepEqual(after.document,before.document);else {assert.equal(after.document.constraints.managedRelations.length,105);assert.equal(after.document.tileBundle.layout.instances.length,15);}
});

test('B1 cold pending/unwritten restart recovers original ID without preparing, applying or resetting another namespace',async t=>{
  const h=await harness();const r=await review(h);assert.equal(r.ok,true,JSON.stringify(r));h.hook=(p,when)=>{if(p.phase==='stage'&&when==='after')throw Error('Lost pending acknowledgement');};
  assert.equal((await h.session.apply(r.reviewId)).committed,null);const raw=h.raw,original=JSON.parse(raw);assert.equal(original.journal.pending.id,r.requestId);h.session.dispose();
  const values=new Map([[h.key,raw],['nautilus-smart-tile-editor-proof-v1','retain original v1 bytes']]);const cold=await harness({document:h.document,storageValues:values});t.after(()=>cold.session.dispose());
  assert.equal(cold.raw,raw);assert.equal(cold.session.getSnapshot().phase,'recovery-required');assert.equal((await cold.session.recover(r.requestId)).committed,false);assert.equal(cold.counts.prepare,0);assert.equal(cold.counts.apply,0);assert.deepEqual(cold.writes.map(v=>v.phase),['recover']);assert.deepEqual(saved(cold).document,original.document);assert.equal(values.get('nautilus-smart-tile-editor-proof-v1'),'retain original v1 bytes');
  assert.equal((await cold.session.recover(r.requestId)).ok,false);assert.equal(saved(cold).journal.receipts.length,1);
});

test('B1 positive acceptance survives lost presentation; retry adds no prepare, write or history',async t=>{
  const h=await harness();t.after(()=>h.session.dispose());const r=await review(h);assert.equal(r.ok,true,JSON.stringify(r));h.hook=(p,when)=>{if(p.phase==='commit'&&when==='after')h.session.cancel('post-commit-presentation-retirement');};
  assert.equal((await h.session.apply(r.reviewId)).committed,true);assert.equal(h.session.getSnapshot().phase,'presentation-error');const before=saved(h),count=h.writes.length;h.hook=()=>{};
  assert.equal((await h.session.retryPresentation()).ok,true);assert.deepEqual(saved(h),before);assert.equal(h.counts.prepare,1);assert.equal(h.counts.apply,1);assert.equal(h.writes.length,count);assert.equal(h.session.getSnapshot().history.undo,1);
});

test('B1 stale/cancelled/budget refusals preserve complete source, redo and accepted view',async t=>{
  const h=await harness();t.after(()=>h.session.dispose());await apply(h);const top=saved(h).document.tileBundle.layout.instances.find(v=>!v.locked);await apply(h,{tool:'finish',ownerId:top.id,finishId:'skin.slate'});await h.session.undo();
  const before=saved(h),accepted=h.views.find(v=>!v.diagnostics().disposed),writes=h.writes.length;
  const large=await review(h,stack(h.document,{origin:[60,20]}));assert.equal(large.ok,false);assert.equal(large.code,'AGGREGATE_VIEW_BUDGET');assert.equal(h.writes.length,writes);assert.equal(h.session.getSnapshot().history.redo,1);assert.deepEqual(saved(h).document,before.document);assert.equal(accepted.diagnostics().disposed,false);
  const r=await review(h,{tool:'finish',ownerId:top.id,finishId:'skin.sandstone'});assert.equal(r.ok,true,JSON.stringify(r));h.floors.select('F01');assert.equal((await h.session.apply(r.reviewId)).ok,false);assert.equal(h.session.getSnapshot().history.redo,1);assert.deepEqual(saved(h).document,before.document);
  const cancel=await review(h,{tool:'finish',ownerId:top.id,finishId:'skin.sandstone'});assert.equal(cancel.ok,true,JSON.stringify(cancel));h.hook=(p,when)=>{if(p.phase==='commit'&&when==='before')h.session.cancel('at-final-writer-fence');};assert.equal((await h.session.apply(cancel.reviewId)).committed,false);assert.deepEqual(saved(h).document,before.document);assert.equal(h.session.getSnapshot().history.redo,1);assert.equal(accepted.diagnostics().disposed,false);
});

test('B1 codec refuses partial/tampered paired targets and preserves occupied/future namespaces byte-for-byte',async t=>{
  const h=await harness();t.after(()=>h.session.dispose());await apply(h);const cp=saved(h),op=clone(cp.journal.receipts[0].operation),initial=h.binding.codec.create(h.document);
  delete op.target.constraints;assert.throws(()=>h.binding.codec.stage(initial,op));const bad=clone(cp);bad.document.constraints.managedRelations[0].clearanceM=1;assert.throws(()=>h.binding.codec.open(bad));
  const corrupt=clone(cp);corrupt.journal.receipts[0].operation.binding.nextConstraintsDigest='f'.repeat(64);assert.throws(()=>h.binding.codec.open(corrupt));
  const future=JSON.stringify({...cp,version:99}),values=new Map([[h.key,future]]),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  assert.throws(()=>createTileStackStorage(actual,{binding:h.binding,storage,initialCheckpoint:initial}));assert.equal(values.get(h.key),future);assert.equal(h.binding.codec.serialize(cp),h.session.save().checkpointJSON);assert.equal(smartTileDigest(h.binding.codec.open(cp)),smartTileDigest(cp));
});

test('B1 owned-snapshot cache never blesses mutable or shallow-frozen source/table changes',()=>{
  const d=documentFixture(),{domain}=createTileStackCheckpointCodec(actual,d),owned=domain.validateDocument(d);
  assert.equal(domain.validateDocument(owned),owned);const changed=clone(owned);changed.sourceJSON+='\n';assert.throws(()=>domain.validateDocument(changed));
  const shallow=Object.freeze({...clone(owned)});shallow.floorBinding.floors[14].elevationM+=.01;assert.throws(()=>domain.validateDocument(shallow));assert.equal(domain.validateDocument(owned),owned);
});
