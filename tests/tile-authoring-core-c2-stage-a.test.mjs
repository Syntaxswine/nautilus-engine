import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as C from '../candidates/tile-authoring/core/c2/index.js';
import {Budget,readData,shape,captureShape} from '../candidates/tile-authoring/core/c2/data.js';
import {validateLedger,validateRecoveryRetention,validateCandidateRetirement} from '../candidates/tile-authoring/core/c2/ledger.js';
import {T,A,cp,token,pack,stageFixture,paintOperations,preparedCapture,ledger,allocation,captureSource,expected} from '../tools/tile-authoring-core-c2-fixtures.mjs';

function plan(x){const p=C.planTileAuthoring(T,x.input);assert.equal(p.ok,true,JSON.stringify(p));return p;}
function bind(x,p,c=preparedCapture(p),core=T){return C.bindTileAuthoringTarget(core,{before:x.input.document,plan:p,prepared:null,appearanceCapture:c});}
function reject(r,code){assert.equal(r.ok,false,JSON.stringify(r));if(code)assert.equal(r.diagnostics[0].code,code);}
const imported=stageFixture(),importPlan=plan(imported),painted=stageFixture(paintOperations(imported.f)),paintPlan=plan(painted);
const refresh=c=>{const l=c.ledgerTrace.at(-1).ledger;ledger(l);c.admittedGeometry=cp(l.geometry);c.peakTotals=cp(l.totals);Object.assign(c.costBounds,l.totals);return c;};

test('private Stage A import preserves original30 canonical artwork, two page dependencies, hashes and complete notices',()=>{
 assert.equal(pack.manifest.artwork.length,30);assert.equal(pack.blobEntries.length,2);
 assert.deepEqual(importPlan.targetDocument.authoring.library.artwork,pack.manifest.artwork);
 assert.equal(importPlan.resourceRequirements.introduced.length,30);assert.equal(importPlan.resourceRequirements.encodedNeeds.length,2);assert.equal(importPlan.resourceRequirements.decodeNeeds.length,0);
 assert.equal(importPlan.resourceRequirements.declaredEncodedRequirementBytes,2560200);
 assert.deepEqual(importPlan.targetDocument.tileBundle,imported.input.document.tileBundle);assert.equal(importPlan.request,null);assert.equal(importPlan.route,'appearance-only');
 const target=bind(imported,importPlan);assert.equal(target.ok,true,JSON.stringify(target));assert.equal(Object.keys(target.bindings).length,19);assert.equal(target.tilePreparation,'source-unchanged');assert.equal(target.committable,false);assert.deepEqual(JSON.parse(JSON.stringify(target.targetDocument)),target.targetDocument);
});
test('pure appearance planner/binder never call public repair; stamp saves exact transform and local binding',()=>{
 const core={...T,prepareTileRepair(){throw Error('Core tried to prepare');}},p=C.planTileAuthoring(core,painted.input);assert.equal(p.ok,true,JSON.stringify(p));
 const r=bind(painted,p,preparedCapture(p),core);assert.equal(r.ok,true,JSON.stringify(r));
 assert.deepEqual(r.targetDocument.authoring.decorations.chunks[0].marks[0],painted.input.command.operations[2].body.mark);
 assert.equal(r.costBounds.cellsAllViews,960);assert.equal(r.costBounds.trianglesAllViews,1860);assert.equal(r.costBounds.rootsAllViews,2);
 assert.equal(r.bindings.sourceAuthorityToken,p.original.expected.hostAuthorityToken);assert.equal(r.bindings.commandDigest,token(p.command));
});
test('old Host profile strings and absent SourceCapture cannot enable C2; actual C1 plans remain exact',()=>{
 const x=cp(imported.input);delete x.appearanceSource;reject(C.planTileAuthoring(T,x),'C2_HOST_PROFILE_UNBOUND');
 const f=stageFixture().f,command=f.command(f.document,f.context,[{kind:'preset.save',body:{preset:cp(f.saved.record)}}]);const old={document:f.document,command,context:f.context};
 assert.deepEqual(C.planTileAuthoring(T,old),A.planTileAuthoring(T,old));
});
test('JSON command and object command produce the same complete saved target',()=>{
 const x=cp(painted.input);x.command=JSON.stringify(x.command);const p=C.planTileAuthoring(T,x);assert.equal(p.ok,true,JSON.stringify(p));assert.deepEqual(p.targetDocument,paintPlan.targetDocument);
});
test('strict JSON duplicates, accessors, unpaired surrogates, negative zero and unknown fields refuse',()=>{
 const x=cp(painted.input);x.command=JSON.stringify(x.command).replace('"version":1','"version":1,"version":1');reject(C.planTileAuthoring(T,x));
 let calls=0;const raw={};Object.defineProperty(raw,'document',{enumerable:true,get(){calls++;return painted.input.document;}});reject(C.planTileAuthoring(T,raw));assert.equal(calls,0);
 for(const text of ['{"x":1,"x":2}','{"x":"\\ud800"}','{"x":-0}','{"__proto__":1}'])assert.throws(()=>readData(text));
 reject(C.planTileAuthoring(T,{...painted.input,extra:true}));
});
test('late canonical operation failure leaves original document, resources and redo-bearing source unchanged',()=>{
 const x=cp(painted.input),before=JSON.stringify(x.document);x.command.operations.push({opId:'op.late',kind:'owner.remove',body:{ownerIds:['owner.one'],deleteDecorationIds:[]}});x.appearanceSource.original.commandDigest=token(x.command);reject(C.planTileAuthoring(T,x),'C2_STAGE_A_OPERATION_UNAVAILABLE');assert.equal(JSON.stringify(x.document),before);
});
test('imports refuse different immutable content, missing dependency, path aliases, unsupported media and missing requires',()=>{
 for(const mutate of [
  x=>x.command.operations[0].body.pack.manifest.artwork[0].body.label='tampered',
  x=>x.command.operations[0].body.pack.blobEntries.pop(),
  x=>x.command.operations[0].body.pack.blobEntries[0].entry='../escape.png',
  x=>x.command.operations[0].body.pack.requires=[],
  x=>{const r=x.command.operations[0].body.pack.manifest.artwork[0];r.body.blob.mediaType='image/webp';r.body.imageView.pageDigest=token(r.body.blob);const {contentDigest,...raw}=r;Object.assign(r,C.sealTileContentRecord(T,raw).record);}
 ]){
  const x=cp(imported.input);mutate(x);x.appearanceSource.original.commandDigest=token(x.command);reject(C.planTileAuthoring(T,x));
 }
});
test('source Expected, full floor digest, exact surface frame/grid and required profile guards refuse',()=>{
 for(const mutate of [
  x=>x.command.expected.hostDocumentDigest=token('other source'),
  x=>x.appearanceSource.authority.floorEpoch++,
  x=>x.command.operations[1].body.target.bindingDigest=token('other frame'),
  x=>x.appearanceSource.profiles.clip='unsupported.clip'
 ]){
  const x=cp(painted.input);mutate(x);if(x.command.expected.hostDocumentDigest!==painted.input.command.expected.hostDocumentDigest)x.appearanceSource.original.expected=cp(x.command.expected);
  x.appearanceSource.original.commandDigest=token(x.command);
  if(x.appearanceSource.authority.floorEpoch!==painted.input.appearanceSource.authority.floorEpoch){const p=plan({input:x});const c=preparedCapture(p);c.authority.floorEpoch--;reject(bind({input:x},p,c),'STALE_CONTEXT');}
  else reject(C.planTileAuthoring(T,x));
 }
});
test('actual observed work is monotonic and unused final reservation is not spent work',()=>{
 const c=preparedCapture(paintPlan),r=bind(painted,paintPlan,c);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(c.costBounds.planning.unitsCharged,c.planningCarry.afterPreparation);assert.ok(r.costBounds.planning.unitsCharged>c.planningCarry.afterPreparation);assert.ok(r.costBounds.planning.unitsCharged<c.planningCarry.finalBindUpperBound);assert.ok(r.costBounds.planning.inputBytes>=paintPlan.costBounds.planning.inputBytes);
});
test('understated final reservation and near-global-cap cumulative preparation exhaust without a target',()=>{
 let c=preparedCapture(paintPlan,{upper:paintPlan.costBounds.planning.unitsCharged+73});reject(bind(painted,paintPlan,c),'AUTHORING_WORK_LIMIT');
 c=preparedCapture(paintPlan);c.planningCarry.afterPreparation=999990;c.costBounds.planning.unitsCharged=999990;reject(bind(painted,paintPlan,c),'AUTHORING_WORK_LIMIT');
});
test('tight effective limits are carried through capacity, plan digest and final bind; omission/raise/change refuse',()=>{
 const x=stageFixture(null,{limits:{plannerUnits:800000,artwork:30}}),p=plan(x),c=preparedCapture(p);const r=bind(x,p,c);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(p.limits.plannerUnits,800000);assert.ok(r.costBounds.planning.unitsCharged<800000);
 for(const mutate of [p=>delete p.limits,p=>p.limits.plannerUnits=1000001,p=>p.limits.artwork=29]){const q=cp(p);mutate(q);reject(bind(x,q,cp(c)));}
 reject(C.planTileAuthoring(T,{...imported.input,limits:{artwork:29}}),'CONTENT_LIMIT');
 reject(C.planTileAuthoring(T,{...painted.input,limits:{plannerUnits:200000}}),'AUTHORING_WORK_LIMIT');
});
test('capacity bounds use effective+absolute limit commitment and cannot predate actual checkpoint/history',()=>{
 for(const mutate of [c=>c.capacityBound.governingLimitsDigest=token(c.capacityBound.limits),c=>c.capacityBound.sourceHistoryGeneration++,c=>c.capacityBound.upperBounds.walBytes=1,c=>c.capacityBound.upperBounds.historyEntries=65,c=>c.capacityBound.operation={}]){const c=preparedCapture(paintPlan);mutate(c);reject(bind(painted,paintPlan,c));}
});
test('original request/Expected, source lease sets and admitted requirements cannot be restamped',()=>{
 for(const mutate of [c=>c.original.requestId='other.request',c=>c.sourceResourceLeaseSetDigest=token('other leases'),c=>c.sourceResourceRefs=c.targetResourceRefs,c=>c.resourceRequirements.introduced=[],c=>c.encodedAvailability.pop(),c=>c.appearance.sourceVisual.presentationStateDigest=token('cleared failure')]){const c=preparedCapture(paintPlan);mutate(c);reject(bind(painted,paintPlan,c));}
});
test('candidate full geometry and owned native identities are required; no fake unchanged set, shared buffers or third root',()=>{
 for(const mutate of [
  c=>c.candidateBaseView=null,
  c=>c.sourceGeometry=c.admittedGeometry,
  c=>{c.candidateBaseView.geometryAllocationIds=['fixture.geometry'];c.ledgerTrace[0].ledger.geometry.views[1].geometryAllocationIds=['fixture.geometry'];refresh(c);},
  c=>{c.ledgerTrace[0].ledger.geometry.views[1].roots=2;c.candidateBaseView.roots=2;refresh(c);},
  c=>{c.ledgerTrace[0].ledger.geometry.views[1].cells=545;c.candidateBaseView.cells=545;refresh(c);},
  c=>{c.ledgerTrace[0].ledger.allocations.find(a=>a.purpose==='geometry-buffer'&&a.ownerRequestId).chargedBytes=0;refresh(c);}
 ]){const c=preparedCapture(paintPlan);mutate(c);reject(bind(painted,paintPlan,c));}
});
test('source same-count physical ABA, foreign allocation owners and forgotten charges refuse',()=>{
 for(const mutate of [
  c=>{c.ledgerTrace[0].ledger.allocations[0].allocationId='foreign.same.count';refresh(c);},
  c=>{c.ledgerTrace[0].ledger.allocations.at(-1).ownerRequestId='foreign.request';},
  c=>{c.ledgerTrace[0].ledger.sequence+=2;},
  c=>{c.ledgerTrace[0].ledger.allocations[1].contextEpoch++;refresh(c);},
  c=>{c.unresolvedAllocationIds=['unmeasured.native.copy'];},
  c=>{c.costBounds.declaredDecodedAllocationBytes=0;},
  c=>{c.ledgerTrace[0].ledger.allocations.at(-1).chargedBytes=0;refresh(c);},
  c=>{c.ledgerTrace[0].ledger.allocations=c.ledgerTrace[0].ledger.allocations.filter(a=>a.allocationId!=='fixture.candidate.base');refresh(c);}
 ]){const c=preparedCapture(paintPlan);mutate(c);reject(bind(painted,paintPlan,c));}
});
test('four actual sampled allocations fit; a fifth physical copy refuses even with identical page bytes',()=>{
 const c=preparedCapture(paintPlan),l=c.ledgerTrace[0].ledger,sha=paintPlan.resourceRequirements.decodeNeeds[0].blobSha256;
 l.allocations.push(allocation('fixture.duplicate.copy','artwork-image','decoded-additional',1024,paintPlan.original.requestId,{blobSha256:sha}));refresh(c);const good=bind(painted,paintPlan,c);assert.equal(good.ok,true,JSON.stringify(good));assert.equal(good.costBounds.atlasPagesAllViews,4);
 l.allocations.push(allocation('fixture.fifth.copy','artwork-image','decoded-additional',1024,paintPlan.original.requestId,{blobSha256:sha}));refresh(c);reject(bind(painted,paintPlan,c),'SCHEMA_RANGE');
});
test('all transient CPU/GPU/upload/scratch copies and cached materials count at peaks',()=>{
 const c=preparedCapture(paintPlan),l=c.ledgerTrace[0].ledger;
 l.allocations.push(allocation('fixture.scratch','decoder-scratch','decoded-additional',24000000,paintPlan.original.requestId,{sampledAtlas:false}));ledger(l);
 const final=cp(l);final.sequence++;const a=final.allocations.at(-1);a.state='retired-verified';a.retirementReceiptDigest=token('DTO verified scratch retirement');a.referenceIds=[];ledger(final);
 c.ledgerTrace.push({eventId:'fixture.admit.final',action:'admit',ownerRequestId:paintPlan.original.requestId,ledger:final});c.ledgerTrace[0].action='acquire';c.admittedGeometry=cp(final.geometry);c.peakTotals=cp(l.totals);Object.assign(c.costBounds,final.totals);reject(bind(painted,paintPlan,c));
 const q=preparedCapture(paintPlan);for(let i=0;i<64;i++)q.ledgerTrace[0].ledger.materials.push({materialId:'fixture.cache.'+i,state:'cache-idle',ownerRequestId:paintPlan.original.requestId,referenceIds:[],retirementReceiptDigest:null});refresh(q);reject(bind(painted,paintPlan,q));
});
test('exact finite authored-grid masks and repeat detail survive; wrong grid, overlapping spans and 4097 cells refuse',()=>{
 const x=stageFixture(),def=x.f.document.authoring.library.definitions.find(d=>d.id===x.f.document.authoring.ownerPins[0].definition.id&&d.revision===x.f.document.authoring.ownerPins[0].definition.revision),g=def.body.surfaces[0].grid;
 const mask={kind:'grid-spans',grid:{id:g.id,version:1,digest:token(g)},rows:[{j:0,spans:[{i0:0,count:64}]},{j:1,spans:[{i0:-1,count:1}]}]};
 const ops=paintOperations(x.f,{mask});ops[2].body.mark.graphic.form='detail';ops[2].body.mark.graphic.wrap='repeat';const y=stageFixture(ops),p=plan(y);assert.deepEqual(p.targetDocument.authoring.decorations.chunks[0].marks[0].graphic.mask,mask);assert.equal(bind(y,p).ok,true);
 for(const mutate of [m=>m.grid.id='other.grid',m=>m.rows[1].j=0,m=>m.rows[0].spans.push({i0:1,count:1}),m=>m.rows=[{j:0,spans:[{i0:0,count:4096}]},{j:1,spans:[{i0:0,count:1}]}]]){const bad=cp(ops);mutate(bad[2].body.mark.graphic.mask);reject(C.planTileAuthoring(T,stageFixture(bad).input));}
});
test('revisions, explicit layer deletion and deferred group/reanchor policies are atomic',()=>{
 const doc=paintPlan.targetDocument,m=cp(doc.authoring.decorations.chunks[0].marks[0]);m.revision=2;m.graphic.opacity=.25;
 const x=stageFixture([{kind:'decoration.update',body:{markId:m.id,expectedRevision:1,replacement:m,groupPolicy:'preserve-whole-group'}}],{document:doc}),p=plan(x);assert.equal(p.targetDocument.authoring.decorations.chunks[0].marks[0].revision,2);assert.equal(bind(x,p).ok,true);
 const remove={kind:'surface.layers',body:{target:cp(m.target),layers:[],removedLayerMarkIds:[m.id]}},y=stageFixture([remove],{document:doc}),q=plan(y);assert.equal(q.targetDocument.authoring.decorations.surfaces.length,0);assert.equal(q.targetDocument.authoring.decorations.chunks[0].marks.length,0);
 remove.body.removedLayerMarkIds=[];reject(C.planTileAuthoring(T,stageFixture([remove],{document:doc}).input),'EXPLICIT_LAYER_DELETE_REQUIRED');
 m.target.ownerId='owner.two';reject(C.planTileAuthoring(T,stageFixture([{kind:'decoration.update',body:{markId:m.id,expectedRevision:1,replacement:m,groupPolicy:'detach-explicit'}}],{document:doc}).input),'C2_REANCHOR_UNAVAILABLE');
 const grouped=paintOperations(imported.f);grouped[2].body.mark.groupId='group.future';reject(C.planTileAuthoring(T,stageFixture(grouped).input),'C2_GROUPING_UNAVAILABLE');
});
test('whole history restores the exact old contentRevision and keeps the null command/original request',()=>{
 const f=stageFixture(null,{document:paintPlan.targetDocument}).f,target=imported.input.document,request={id:'request.undo.c2',kind:'smart-tile-history-restore',action:'undo',targetDocumentDigest:token(target)},s=captureSource(f.document,f.context,null,{action:'undo',historyRequest:request});
 const input={document:f.document,command:null,context:f.context,appearanceSource:s,history:{request,targetDocument:target}},p=C.planTileAuthoring(T,input);assert.equal(p.ok,true,JSON.stringify(p));assert.equal(p.command,null);assert.equal(p.targetDocument.contentRevision,target.contentRevision);const r=C.bindTileAuthoringTarget(T,{before:f.document,plan:p,prepared:null,appearanceCapture:preparedCapture(p)});assert.equal(r.ok,true,JSON.stringify(r));assert.deepEqual(r.targetDocument,target);
});
test('unknown retention includes a historical-only resource and preserves owned candidate geometry/debt',()=>{
 const c=preparedCapture(paintPlan),historical=cp(paintPlan.resourceRequirements.targetResourceRefs[1]),v={kind:'nautilus-tile-authoring-c2-recovery-retention',version:1,original:cp(paintPlan.original),outcome:'unknown',committed:null,writesFrozen:true,recoveryRequestId:paintPlan.original.requestId,sourceResourceRefs:[],targetResourceRefs:[cp(paintPlan.resourceRequirements.targetResourceRefs[0])],historyRedoPendingResourceRefs:[historical],exportResourceRefs:[],requiredUnion:[cp(paintPlan.resourceRequirements.targetResourceRefs[0]),historical].sort((a,z)=>a.artwork.id<z.artwork.id?-1:1),historyRedoPendingRefsDigest:token({historyRedoPending:[historical],exports:[]}),retainedEncodedLeaseIds:c.encodedAvailability.map(x=>x.encodedLeaseId),retainedAppearanceLeaseIds:['fixture.appearance'],retainedGeometryLeaseIds:[c.candidateBaseView.geometryLeaseId],candidateBaseView:c.candidateBaseView,retainedLedger:c.ledgerTrace[0].ledger,unverifiedAllocationIds:[]};
 assert.doesNotThrow(()=>validateRecoveryRetention(T,v,new Budget()));const bad=cp(v);bad.requiredUnion.pop();assert.throws(()=>validateRecoveryRetention(T,bad,new Budget()),e=>e.code==='RECOVERY_RESOURCE_UNION');
});
test('golden save fixture and canonical contracts remain unchanged and candidate stays unregistered',()=>{
 const golden=JSON.parse(fs.readFileSync(new URL('../candidates/tile-authoring/core/c2/fixtures/stage-a-golden-save.json',import.meta.url),'utf8'));assert.deepEqual(paintPlan.targetDocument,golden);shape(T,'workbenchDocument',golden,new Budget());
 const packageJSON=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));assert.ok(!Object.values(packageJSON.exports).some(x=>String(x).includes('/c2/')));assert.equal(C.tileAuthoringDiscovery().publicRegistration,false);
});

test('unchanged duplicate import is no-change and rehashed identity conflicts cannot replace a retained record',()=>{
 const x=stageFixture(null,{document:importPlan.targetDocument});reject(C.planTileAuthoring(T,x.input),'NO_CHANGE');
 const r=x.input.command.operations[0].body.pack.manifest.artwork[0],raw=cp(r);delete raw.contentDigest;raw.body.label='Different immutable content';Object.assign(r,C.sealTileContentRecord(T,raw).record);x.input.appearanceSource.original.commandDigest=token(x.input.command);reject(C.planTileAuthoring(T,x.input),'IMMUTABLE_CONTENT_CONFLICT');
});
test('requirements follows exact C2 dependencies and preserves unsupported profile diagnostics',()=>{
 const d=importPlan.targetDocument,r=C.inspectTileAuthoringRequirements(T,{document:d,subject:d.resourceRefs[0].artwork});assert.deepEqual(r.requiredResources,[d.resourceRefs[0].artwork]);assert.equal(r.unavailable.length,0);
});
test('fixed ledger ceilings accept exact boundaries and refuse one unit above, including hidden/zero-alpha residency',()=>{
 const l=cp(paintPlan.sourceCapture.ledger);l.geometry.views[0].cells=1024;l.geometry.views[0].triangles=50000;
 l.residency=[{viewId:'fixture.accepted',ownerId:'owner.one',markIds:Array.from({length:1024},(_,i)=>'hidden.mark.'+i)}];
 l.bins={contributorsPerBin:8,binReferencesAllViews:32768};
 l.allocations.push(allocation('cap.decoded','decoder-scratch','decoded-additional',33554432,null,{sampledAtlas:false}),allocation('cap.derived','derived-uniforms','derived',4194304,null,{sampledAtlas:false}));
 for(let i=0;i<63;i++)l.materials.push({materialId:'cache.'+i,state:'cache-idle',ownerRequestId:null,referenceIds:[],retirementReceiptDigest:null});ledger(l);assert.doesNotThrow(()=>validateLedger(T,l,new Budget()));
 for(const change of [x=>x.geometry.views[0].cells++,x=>x.geometry.views[0].triangles++,x=>x.residency[0].markIds.push('one.more'),x=>x.bins.contributorsPerBin++,x=>x.bins.binReferencesAllViews++,x=>x.allocations.find(a=>a.allocationId==='cap.decoded').chargedBytes++,x=>x.allocations.find(a=>a.allocationId==='cap.derived').chargedBytes++,x=>x.materials.push({...x.materials[0],materialId:'one.more'})]){
  const bad=cp(l);change(bad);ledger(bad);assert.throws(()=>validateLedger(T,bad,new Budget()));
 }
});
test('unverified candidate retirement preserves second root and native charges; final-bind failure creates no ticket',()=>{
 const c=preparedCapture(paintPlan),l=cp(c.ledgerTrace[0].ledger),candidate=l.geometry.views[1];candidate.state='retiring-unverified';for(const a of l.allocations.filter(a=>c.candidateBaseView.geometryAllocationIds.includes(a.allocationId)))a.state='retiring-unverified';ledger(l);
 const v={kind:'nautilus-tile-authoring-candidate-retirement',version:1,original:cp(paintPlan.original),failedAt:'final-pure-bind',sourceCheckpointUnchanged:true,durableWrites:0,historyTicketState:'not-created',sourceGeometry:cp(c.sourceGeometry),candidateBaseView:cp(c.candidateBaseView),outcome:'unverified',retirementReceiptDigest:null,restoredAcceptedViewIdentityDigest:paintPlan.sourceCapture.visual.acceptedViewIdentityDigest,retainedSourceDebtDigest:paintPlan.sourceCapture.visual.retirementDebtDigest,finalRetirementDebtDigest:token('unverified candidate plus retained old debt'),finalLedger:l};
 assert.doesNotThrow(()=>validateCandidateRetirement(T,v,new Budget()));assert.equal(l.totals.rootsAllViews,2);const bad=cp(v);bad.historyTicketState='rejected';assert.throws(()=>validateCandidateRetirement(T,bad,new Budget()),e=>e.code==='HISTORY_TICKET_SEQUENCE');
});
