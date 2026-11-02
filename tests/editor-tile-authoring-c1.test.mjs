import test from 'node:test';
import assert from 'node:assert/strict';
import {harness,definitions,library,applyCommand,placeBody,upgradeBody,pin,authoring} from './fixtures/tile-authoring-editor/c1.mjs';
const saved=h=>h.binding.codec.open(h.raw),clone=structuredClone;

test('C1 actual public Core/native service and JSONL create A1/clone B1/revise B2/preset B1/place two/upgrade one',async t=>{
  const h=await harness();t.after(()=>h.dispose());const initial=saved(h),view=h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),native=clone(h.presentation.snapshot()),revision=h.session.getSnapshot().readiness.visual.revision;
  const r=await library(h);assert.equal(saved(h).document.contentRevision,4);assert.deepEqual(saved(h).document.tileBundle,initial.document.tileBundle);assert.deepEqual(saved(h).document.constraints,initial.document.constraints);
  assert.equal(h.counts.prepare,0);assert.equal(h.counts.acquire,1);assert.deepEqual(h.presentation.snapshot(),native);assert.equal(h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),view);assert.equal(h.session.getSnapshot().readiness.visual.revision,revision);assert.equal(h.session.getSnapshot().readiness.visual.state,'accepted');
  const placed=await applyCommand(h,h.command('preset.place',placeBody(h,r)),{jsonl:true});assert.equal(placed.review.tilePreparation,'public-v1-prepared');assert.deepEqual(h.counts,{prepare:1,apply:1,acquire:2,directRepair:0});
  const before=saved(h),second=clone(before.document.tileBundle.layout.instances.find(o=>o.id==='c1.owner.two')),secondPin=clone(before.document.authoring.ownerPins.find(o=>o.ownerId==='c1.owner.two'));
  await applyCommand(h,h.command('placement.upgrade',upgradeBody(r)));const after=saved(h);assert.equal(after.document.contentRevision,6);assert.equal(after.document.tileBundle.layout.revision,2);assert.deepEqual(h.counts,{prepare:2,apply:2,acquire:3,directRepair:0});
  assert.deepEqual(after.document.tileBundle.layout.instances.find(o=>o.id==='c1.owner.two'),second);assert.deepEqual(after.document.authoring.ownerPins.find(o=>o.ownerId==='c1.owner.two'),secondPin);assert.deepEqual(after.document.authoring.ownerPins.find(o=>o.ownerId==='c1.owner.one').definition,pin(r.b2));assert.deepEqual(after.document.authoring.library.presets[0],r.p);
  for(const recipe of before.document.tileBundle.recipes)assert.deepEqual(after.document.tileBundle.recipes.find(v=>v.id===recipe.id),recipe);assert.equal(after.document.sourceJSON,initial.document.sourceJSON);
  const query=await h.service.query({kind:'requirements.inspect',subject:pin(r.b1)});assert.equal(query.kind,'nautilus-tile-authoring-requirements');
  for(let i=0;i<6;i++)assert.equal((await h.session.undo()).committed,true);assert.deepEqual(saved(h).document,initial.document);
  for(let i=0;i<6;i++)assert.equal((await h.session.redo()).committed,true);assert.deepEqual(saved(h).document,after.document);
  assert.equal(h.counts.prepare,2);assert.equal(h.counts.acquire,7);assert.equal(saved(h).journal.receipts.length,18);
});

test('C1 source-unchanged review/cancel/history and real NO_CHANGE retain the accepted view, allocations and redo',async t=>{
  const h=await harness();t.after(()=>h.dispose());const r=await library(h);await applyCommand(h,h.command('preset.place',placeBody(h,r)));await applyCommand(h,h.command('placement.upgrade',upgradeBody(r)));await h.session.undo();
  const before=saved(h),counts=clone(h.counts),view=h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),native=clone(h.presentation.snapshot());assert.equal(h.session.getSnapshot().history.redo,1);
  const unchanged=await h.service.prepare(h.command('preset.save',{preset:r.p}));assert.equal(unchanged.ok,false);assert.ok(unchanged.diagnostics.some(d=>d.code==='NO_CHANGE'));assert.deepEqual(saved(h),before);assert.equal(h.session.getSnapshot().history.redo,1);assert.deepEqual(h.counts,counts);assert.deepEqual(h.presentation.snapshot(),native);
  assert.equal((await h.session.redo()).committed,true);const geometry=saved(h).document;
  const newDefinition=authoring.createRectangleDefinition(h.deps.tiles,{identity:{id:r.b2.id,revision:3,recipeId:'c1.recipe.b3'},base:r.b2,edits:{label:'Unused label revision'}}).definition;
  const review=await h.service.prepare(h.command('recipe.revise',{base:pin(r.b2),definition:newDefinition}));assert.equal(review.tilePreparation,'source-unchanged');const current=h.scene.children.find(c=>c.userData.smartTileRole==='accepted');const start=clone(h.counts),resources=clone(h.presentation.snapshot()),visualRevision=h.session.getSnapshot().readiness.visual.revision;
  assert.equal((await h.service.apply(h.workbench.getSnapshot().presentation.retainedApplyRequest)).committed,true);assert.equal((await h.session.undo()).committed,true);assert.deepEqual(saved(h).document,geometry);assert.equal((await h.session.redo()).committed,true);
  assert.deepEqual(h.counts,start);assert.deepEqual(h.presentation.snapshot(),resources);assert.equal(h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),current);assert.equal(h.session.getSnapshot().readiness.visual.revision,visualRevision);assert.notEqual(view,null);
});

for(const failure of ['before','after'])test('C1 metadata unknown '+failure+' commit freezes writes and recovers original ID without prepare/acquire/rebuild, including cold reopen',async t=>{
  const h=await harness();t.after(()=>h.dispose());const {a}=definitions(),review=await h.service.prepare(h.command('recipe.create',{definition:a})),request=h.workbench.getSnapshot().presentation.retainedApplyRequest;
  h.hook=(packet,when)=>{if(packet.phase==='commit'&&when===failure)throw Error('Injected uncertainty');};const result=await h.service.apply(request);assert.equal(result.outcome,'unknown');assert.equal(result.recoveryRequestId,review.requestId);assert.equal(h.session.save().ok,false);assert.equal((await h.session.undo()).ok,false);assert.equal((await h.session.redo()).ok,false);
  const counts=clone(h.counts),view=h.scene.children.find(c=>c.userData.smartTileRole==='accepted');h.hook=()=>{};const coldValues=new Map(h.values);
  const recovered=await h.service.recover(review.requestId);assert.equal(recovered.committed,failure==='after');assert.deepEqual(h.counts,counts);assert.equal(h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),view);
  const cold=await harness({values:coldValues});t.after(()=>cold.dispose());const coldCounts=clone(cold.counts);const fromCold=await cold.service.recover(review.requestId);assert.equal(fromCold.committed,failure==='after');assert.deepEqual(cold.counts,coldCounts);assert.equal(saved(cold).journal.receipts.at(-1).id,review.requestId);
});

test('C1 same-connection one-use review, stale source/context and strict complete save refuse without adoption',async t=>{
  const h=await harness();t.after(()=>h.dispose());const {a}=definitions(),command=h.command('recipe.create',{definition:a}),before=saved(h),review=await h.service.prepare(command),request=h.workbench.getSnapshot().presentation.retainedApplyRequest;
  const copy=clone(request);copy.reviewToken='f'.repeat(64);assert.equal((await h.service.apply(copy)).committed,false);assert.deepEqual(saved(h),before);
  h.floors.select('F01');assert.equal((await h.service.apply(request)).committed,false);assert.deepEqual(saved(h),before);assert.equal((await h.service.prepare(command)).ok,false);
  const malformed=clone(before);malformed.document.extraAuthority={};assert.throws(()=>h.binding.codec.open(malformed));malformed.document=clone(before.document);malformed.document.version=2;assert.throws(()=>h.binding.codec.open(malformed));
  assert.equal(h.counts.prepare,0);assert.equal(h.counts.acquire,1);assert.equal(h.writes.length,0);assert.equal(review.tilePreparation,'source-unchanged');
});

test('C1 metadata and metadata history preserve actual accepted identity and unverified native retirement debt',async t=>{
  const h=await harness();t.after(()=>h.dispose());const r=await library(h);await applyCommand(h,h.command('preset.place',placeBody(h,r)));
  const review=await h.service.prepare(h.command('placement.upgrade',upgradeBody(r)));assert.equal(review.status,'reviewable');
  const candidate=h.nativeViews.at(-1);candidate.root.traverse(node=>{if(node.geometry)node.geometry.addEventListener('dispose',()=>{throw Error('Native cleanup receipt failed');});});
  assert.equal(h.service.cancel(review.reviewToken).cancelled,true);const resources=clone(h.session.getSnapshot().resources);assert.equal(resources.retiring,1);assert.equal(resources.roots,2);
  const native=clone(h.presentation.snapshot()),view=h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),counts=clone(h.counts),revision=h.session.getSnapshot().readiness.visual.revision;
  const b3=authoring.createRectangleDefinition(h.deps.tiles,{identity:{id:r.b2.id,revision:3,recipeId:'c1.recipe.b3'},base:r.b2,edits:{label:'Metadata with retained debt'}}).definition;
  await applyCommand(h,h.command('recipe.revise',{base:pin(r.b2),definition:b3}));assert.equal((await h.session.undo()).committed,true);assert.equal((await h.session.redo()).committed,true);
  assert.deepEqual(h.counts,counts);assert.deepEqual(h.session.getSnapshot().resources,resources);assert.deepEqual(h.presentation.snapshot(),native);assert.equal(h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),view);assert.equal(h.session.getSnapshot().readiness.visual.revision,revision);
});

test('C1 metadata acceptance/history cannot heal an existing committed presentation error or restamp the old accepted lease',async t=>{
  const h=await harness();t.after(()=>h.dispose());const r=await library(h);await applyCommand(h,h.command('preset.place',placeBody(h,r)));
  const oldView=h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),oldRevision=h.session.getSnapshot().readiness.visual.revision;
  h.hook=(packet,when)=>{if(packet.phase==='commit'&&when==='after')h.session.cancel('Post-write visual cancellation');};
  const changed=await applyCommand(h,h.command('placement.upgrade',upgradeBody(r)));assert.equal(changed.outcome.presentation,'failed');h.hook=()=>{};
  assert.equal(h.session.getSnapshot().readiness.visual.state,'failed');const counts=clone(h.counts),native=clone(h.presentation.snapshot());
  const b3=authoring.createRectangleDefinition(h.deps.tiles,{identity:{id:r.b2.id,revision:3,recipeId:'c1.recipe.b3'},base:r.b2,edits:{label:'Metadata after visual failure'}}).definition;
  const metadata=await applyCommand(h,h.command('recipe.revise',{base:pin(r.b2),definition:b3}));assert.equal(metadata.outcome.presentation,'failed');assert.equal((await h.session.undo()).committed,true);assert.equal((await h.session.redo()).committed,true);
  assert.equal(h.session.getSnapshot().readiness.visual.state,'failed');assert.equal(h.session.getSnapshot().readiness.visual.revision,oldRevision);assert.equal(h.scene.children.find(c=>c.userData.smartTileRole==='accepted'),oldView);assert.deepEqual(h.counts,counts);assert.deepEqual(h.presentation.snapshot(),native);
});
