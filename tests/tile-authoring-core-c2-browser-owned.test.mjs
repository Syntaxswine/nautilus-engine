import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chain,setup,prepared,allocation,texture,ledger,summarize,life,provider,T,B,cp,token,unpainted,selected,pack,costsFromTotals} from '../tools/tile-authoring-core-c2-browser-fixtures.mjs';
import {createBrowserAttemptOwner,pairCoreOwner} from '../candidates/tile-authoring/core/c2/browser-owned-v1/meter.js';
import {BROWSER_SCHEMA} from '../candidates/tile-authoring/core/c2/browser-owned-v1/contract.js';
import {readData,shape} from '../candidates/tile-authoring/core/c2/browser-owned-v1/data.js';
import {Budget} from '../candidates/tile-authoring/core/c2/browser-owned-v1/budget.js';
import {PROFILE} from '../candidates/tile-authoring/core/c2/browser-owned-v1/contract.js';
const code=(fn,want)=>assert.throws(fn,e=>want instanceof RegExp?want.test(e.code):e.code===want);
const pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest});
const seal=r=>{delete r.contentDigest;r.contentDigest=token(r);return r;};
let first;
test('real Core selected builtin first-mark chain fits one intrinsic attempt; all live backends remain UNBOUND',()=>{
 const f=first=chain({surfaceTarget:true}),w=f.owner.snapshot(f.attempt);
 assert.equal(f.surfaceTarget.target.bindingDigest,f.command.operations[1].body.target.bindingDigest);assert.equal(Object.keys(f.surfaceTarget.bindingSeed).length,8);assert.equal(f.surfaceTarget.work.outputBytes,Buffer.byteLength(JSON.stringify(f.surfaceTarget)));
 assert.equal(f.target.committable,false);assert.deepEqual(f.command.operations.map(x=>x.kind),['content.import','surface.layers','decoration.add']);
 assert.equal(f.target.targetDocument.authoring.library.artwork.length,1);assert.equal(f.target.targetDocument.authoring.decorations.chunks[0].marks.length,1);
 assert.deepEqual(f.target.targetDocument.tileBundle,f.d.tileBundle);assert.equal(f.target.targetDocument.sourceJSON,f.d.sourceJSON);
 assert.equal(Object.keys(f.command.expected).length,12);assert.equal(Object.keys(f.target.bindings).length,19);
 assert(w.reference.charged>400000&&w.reference.charged<1000000);assert.equal(w.reference.charged,w.raw.authoringReferenceUnits+w.raw.hostNodeVisits);
 assert.equal(w.reference.reserved,0);assert.equal(w.reference.unresolved,0);assert.equal(w.raw.decoderTicks,0);assert.equal(w.raw.artistPreparationTicks,0);assert.equal(w.raw.publicSteps,0);
 for(const [k,n]of Object.entries(w.raw))assert(n<=w.rawLimits[k],k);
 assert.deepEqual(f.core.liveBindings(),{CoreReferenceSink:'BOUND',Host:'UNBOUND',Native:'UNBOUND',Artist:'UNBOUND',Decoder:'UNBOUND',actualCodec:'UNBOUND',publicRepair:'UNBOUND'});
 code(()=>f.core.requireLiveBindings(),'BROWSER_LIVE_BACKENDS_UNBOUND');
 assert.equal(f.target.costBounds.planning.outputBytes,Buffer.byteLength(JSON.stringify(f.target)));
 assert.equal(f.p.costBounds.planning.outputBytes,Buffer.byteLength(JSON.stringify(f.p)));
 assert(Object.isFrozen(f.p.targetDocument));
});
test('painted document supports create, clone, revise and graphic preset save while retaining actual appearance data',()=>{
 let d=cp((first??=chain()).target.targetDocument);const initial=cp(d),base=selected(d).definition;
 const created=seal({...cp(base),id:'definition.browser.new',revision:1,body:{...cp(base.body),label:'New definition',recipe:{...cp(base.body.recipe),id:'recipe.browser.new'}}});
 const cloned=seal({...cp(created),id:'definition.browser.clone',body:{...cp(created.body),label:'Clone',recipe:{...cp(created.body.recipe),id:'recipe.browser.clone'}}});
 const revised=seal({...cp(created),revision:2,body:{...cp(created.body),label:'Revised',recipe:{...cp(created.body.recipe),id:'recipe.browser.revised'}}});
 const surface=d.authoring.decorations.surfaces[0],mark=d.authoring.decorations.chunks[0].marks[0],preset=seal({...cp(d.authoring.library.presets[0]),id:'preset.browser.painted',revision:1,body:{...cp(d.authoring.library.presets[0].body),definition:pin(base),defaultLayers:[{surfaceId:surface.surfaceId,layer:cp(surface.layers[0])}],defaultMarks:[{id:'template.browser',surfaceId:surface.surfaceId,layerId:mark.layerId,ordinal:0,graphic:cp(mark.graphic)}]}});
 const ops=[{kind:'recipe.create',body:{definition:created}},{kind:'recipe.clone',body:{base:pin(created),definition:cloned}},{kind:'recipe.revise',body:{base:pin(created),definition:revised}},{kind:'preset.save',body:{preset}}];
 for(let i=0;i<ops.length;i++){
  const f=chain({document:d,operations:[ops[i]],requestId:'request.browser.library.'+i});d=cp(f.target.targetDocument);
  assert.equal(f.p.preparationNeed,'encoded-only-retain-appearance');assert.equal(f.c.candidateBaseView,null);assert.deepEqual(f.c.sourceGeometry,f.c.admittedGeometry);
  assert.deepEqual(d.authoring.decorations,initial.authoring.decorations);assert.deepEqual(d.resourceRefs,initial.resourceRefs);assert.deepEqual(d.authoring.ownerPins,initial.authoring.ownerPins);assert.deepEqual(d.tileBundle,initial.tileBundle);
  assert(f.owner.snapshot(f.attempt).reference.charged<1000000);
 }
 assert.equal(d.authoring.library.definitions.length,initial.authoring.library.definitions.length+3);assert.equal(d.authoring.library.presets.at(-1).id,preset.id);
});
test('painted placement and upgrade refuse explicitly without a C1 fallback or source truncation',()=>{
 const d=cp((first??=chain()).target.targetDocument);for(const kind of ['preset.place','placement.upgrade']){const f=setup({document:d,operations:[{kind,body:kind==='preset.place'?{preset:pin(d.authoring.library.presets[0]),placements:[],defaults:'none'}:{from:pin(d.authoring.library.definitions[0]),to:pin(d.authoring.library.definitions[0]),ownerIds:[],newRecipeAnchorIds:[],anchorDecisions:[]}}],requestId:'request.browser.geometry.'+kind});
 // Canonical grammar may reject an empty geometry command before dispatch.
 code(()=>{const s=f.source();f.core.plan(s,f.scope('planning'));},/SCHEMA_|BROWSER_GEOMETRY_ROUTE_UNBOUND/);assert.deepEqual(f.d,d);}
});
test('no reported work/serialized plan, foreign owner, phase or reservation grants Core credit',()=>{
 code(()=>new Budget(),'BROWSER_CORE_COUNTER_UNBOUND');const f=setup(),s=f.source(),p=f.core.plan(s,f.scope('planning'));
 code(()=>f.core.capacity(cp(p),{checkpoint:f.checkpoint,history:f.history},f.scope('capacity')),'BROWSER_OWNED_PLAN');
 const g=setup({requestId:'request.browser.foreign'}),gs=g.source();code(()=>g.core.plan(s,g.scope('planning')),'BROWSER_OWNED_SOURCE');
 const h=setup({requestId:'request.browser.phase'}),wrong=h.scope('capacity');code(()=>h.core.captureSourceData({document:h.d,command:h.command,context:{},observation:{}},wrong),'BROWSER_RESERVATION_OWNERSHIP');
 const k=setup({requestId:'request.browser.identity'}),scope=k.scope('source');scope.source=cp(k.d);code(()=>k.core.captureSourceData({document:k.d,command:k.command,context:{},observation:{}},scope),'BROWSER_SOURCE_IDENTITY');
 code(()=>f.owner.begin({source:f.d,requestId:f.command.requestId}),'BROWSER_ATTEMPT_REUSED');
 assert.equal(Object.keys(f.core.flowBindings()).length,5);for(const row of Object.values(f.core.flowBindings())){assert.equal(row.counterBinding,'UNBOUND');assert.equal(row.observation,null);}
 assert.equal(typeof f.owner.perform,'undefined');assert.equal(typeof f.owner.report,'undefined');assert.equal(typeof f.core.registerNative,'undefined');
});
test('normalized and ten raw caps remain independent; no decoder conversion or fresh subphase allowance',()=>{
 const f=setup({referenceLimit:15000});code(()=>f.source(),/BROWSER_RESERVATION_EXHAUSTED|AUTHORING_WORK_LIMIT/);assert(f.owner.snapshot(f.attempt).reference.charged<=15000);code(()=>f.source(),'BROWSER_ATTEMPT_CLOSED');
 const g=setup({requestId:'request.browser.input.cap',rawLimits:{inputBytes:10}});code(()=>g.source(),'BROWSER_RESERVATION_EXHAUSTED');assert(g.owner.snapshot(g.attempt).raw.inputBytes<=10);
 const o=createBrowserAttemptOwner(),a=o.begin({source:{},requestId:'raw.test'});code(()=>o.reserve(a,{phase:'planning',referenceUnits:1000001}),'BROWSER_WORK_LIMIT');code(()=>o.reserve(a,{phase:'planning',raw:{decoderTicks:64000001}}),'BROWSER_WORK_LIMIT');code(()=>o.reserve(a,{phase:'planning',raw:{publicSteps:1}}),'BROWSER_WORK_LIMIT');
});
test('continuation escrow is not withdrawable; unknown retains original allowance and cannot replay authoring',()=>{
 const o=createBrowserAttemptOwner(),source={},a=o.begin({source,requestId:'request.unknown'}),r=o.reserve(a,{phase:'cleanup',purpose:'escrow',referenceUnits:500,raw:{hostNodeVisits:500}});code(()=>o.withdrawUnused(a,r),'BROWSER_RESERVATION_OWNERSHIP');o.finish(a,'unknown');assert.equal(o.snapshot(a).reference.reserved,500);code(()=>o.reserveRemaining(a,'planning'),'BROWSER_ATTEMPT_CLOSED');code(()=>o.begin({source,requestId:'request.unknown'}),'BROWSER_ATTEMPT_REUSED');
 const cold=o.begin({source,requestId:'request.cold',purpose:'outcome-recovery'}),cr=o.reserveRemaining(cold,'source');code(()=>pairCoreOwner(o).execute(cold,cr,'source',source,()=>null),'BROWSER_ATTEMPT_PURPOSE');
});
test('opaque Core failure retains unresolved actual reservation rather than zeroing unknown work',()=>{
 const o=createBrowserAttemptOwner(),source={},a=o.begin({source,requestId:'request.opaque'}),r=o.reserve(a,{phase:'source',referenceUnits:100,raw:{authoringReferenceUnits:100}});assert.throws(()=>pairCoreOwner(o).execute(a,r,'source',source,s=>{s.take(7);throw new Error('backend failed');}));const w=o.snapshot(a);assert.equal(w.raw.authoringReferenceUnits,7);assert.equal(w.reference.unresolved,93);assert.equal(w.unresolvedRaw.authoringReferenceUnits,93);assert.equal(w.state,'unavailable');
});
function checkLedger(l,expect){const f=setup({requestId:'request.ledger'}),fn=()=>f.core.validateLedgerData({ledger:l,documents:[f.d]},f.scope('prepared-data'));if(expect)code(fn,expect);else assert.equal(fn().liveAuthority,false);}
test('ledger recomputes totals and separately charges CPU/API/copies/debt/slots',()=>{
 const l=ledger(unpainted);checkLedger(l);const copy=cp(l.allocations[2]);copy.allocationId+='copy';copy.nativeOrBackingIdentityDigest=token('different CPU copy');l.allocations.push(copy);summarize(l);assert.equal(l.totals.additionalDecodedOwnedLogicalBytes,12582912);checkLedger(l);l.totals.additionalDecodedOwnedLogicalBytes--;checkLedger(l,'BROWSER_TOTALS');
});
test('whole known RGBA page bounds apply to every CPU copy and exact API layout',()=>{
 const d=cp((first??=chain()).target.targetDocument),l=ledger(d),cpu=l.allocations.find(x=>x.purpose==='artwork-image'&&!x.sampled);cpu.observableBytes--;summarize(l);const f=setup({document:d,requestId:'request.image.bound'});code(()=>f.core.validateLedgerData({ledger:l,documents:[d]},f.scope('prepared-data')),'BROWSER_IMAGE_CAPACITY');
 const z=ledger(unpainted),api=z.allocations.find(x=>x.sampled);api.apiLayout.baseLevel=1;api.apiLayoutDigest=token(api.apiLayout);checkLedger(z,/SCHEMA_ONE_OF|BROWSER_MIP_LAYOUT/);
});
test('actual store identities and immutable full capacity cannot hide aliases',()=>{const l=ledger(unpainted),x=cp(l.allocations[2]);x.allocationId+='alias';l.allocations.push(x);summarize(l);checkLedger(l,'BROWSER_STORE_ALIAS');});
test('geometry aggregates, capacities and material/residency closures are checked',()=>{
 let l=ledger(unpainted);l.geometry.geometryObjectsDigest=token('wrong');checkLedger(l,'BROWSER_GEOMETRY_DIGEST');l=ledger(unpainted);l.allocations[0].geometryLayout.byteOffset=4;checkLedger(l,/SCHEMA_ONE_OF|BROWSER_GEOMETRY_LAYOUT/);l=ledger(unpainted);l.residency=[{viewId:'absent',ownerId:'owner',markIds:['mark']}];summarize(l);checkLedger(l,'BROWSER_RESIDENCY');
});
test('strict/combined kinds, private draft digest and physical reclamation claims never enter browser containers',()=>{
 for(const mutate of [l=>l.kind='nautilus-tile-authoring-appearance-ledger',l=>l.profileDigest='d1dbdaec5c802078a62b083894c40889767a04340b5dcc3450f4bbd44f493883',l=>l.allocations[0].retirementReceiptDigest=token('strict'),l=>l.opaque.totalRamBoundClaim=true]){const l=ledger(unpainted);mutate(l);checkLedger(l,/SCHEMA_|BROWSER_PROFILE_MISMATCH/);}
});
test('positive atomic reservation fulfillment discounts only its exact receiver, never an independent copy',()=>{
 const l=ledger(unpainted),id='dto.reserve',request='request.ledger',actual=allocation('dto.receiver','upload-staging','decoded-additional',2048,request,{fulfillsReservationId:id});
 const reserve=allocation(id,'upload-staging','decoded-additional',4096,request,{allocationClass:'application-reservation',reservation:{state:'fulfilled',targetClass:'cpu-fixed-buffer',expectedApiLayout:null,fulfilledAllocationId:actual.allocationId,fulfillmentReceiptId:'dto.fulfill'}});
 const receipt={kind:'nautilus-browser-reservation-fulfillment',version:1,accountingScope:B.SCOPE,profileDigest:B.PROFILE_DIGEST,...life,receiptId:'dto.fulfill',requestId:request,reservationId:id,allocationId:actual.allocationId,reservedBytes:4096,actualBytes:2048,beforeMutationEpoch:0,afterMutationEpoch:1,observationDigest:token('SYNTHETIC fulfillment')};l.allocations.push(reserve,actual);l.fulfillmentReceipts.push(receipt);summarize(l);assert.equal(l.totals.additionalDecodedOwnedLogicalBytes,6291456+2048);checkLedger(l);
 const bad=cp(l);bad.fulfillmentReceipts[0].requestId='foreign';checkLedger(bad,'BROWSER_FULFILLMENT');const missing=cp(l);missing.fulfillmentReceipts=[];checkLedger(missing,'BROWSER_FULFILLMENT');
 const copy=cp(actual);copy.allocationId+='copy';copy.nativeOrBackingIdentityDigest=token('SYNTHETIC independent receiver');copy.fulfillsReservationId=null;l.allocations.push(copy);summarize(l);assert.equal(l.totals.additionalDecodedOwnedLogicalBytes,6291456+4096);checkLedger(l);
});
test('range release cannot dispose shared CPU/API stores; context end releases API only',()=>{
 const l=ledger(unpainted);l.rangeLeases=[{rangeLeaseId:'dto.range',...life,allocationIds:['dto.source.base','dto.source.base.cpu'],viewIds:[],protectedRegionDigest:token('SYNTHETIC range'),state:'released-owned',releaseReceiptId:'dto.range.release',ownerRequestId:'request.ledger'}];l.releaseReceipts=[{kind:'nautilus-browser-owner-release',version:1,accountingScope:B.SCOPE,profileDigest:B.PROFILE_DIGEST,...life,receiptId:'dto.range.release',requestId:'request.ledger',itemClass:'view-material-range',allocationIds:[],viewIds:[],materialIds:[],rangeLeaseIds:['dto.range'],beforeMutationEpoch:0,afterMutationEpoch:1,releaseBasis:'engine-owner-release',remainingReferencesDigest:token([]),logicalOwnershipReleased:true,physicalReclamation:'UNMEASURED',observationDigest:token('SYNTHETIC range release')}];checkLedger(l);assert.equal(l.totals.additionalDecodedOwnedLogicalBytes,6291456);
 const bad=cp(l);bad.allocations[2].state='released-owned';bad.allocations[2].releaseReceiptId='dto.range.release';summarize(bad);checkLedger(bad,'BROWSER_RELEASE_PROOF');
 const cpu=cp(l);cpu.releaseReceipts[0].itemClass='cpu-buffer';cpu.releaseReceipts[0].allocationIds=['dto.source.base.cpu'];cpu.releaseReceipts[0].rangeLeaseIds=[];cpu.releaseReceipts[0].releaseBasis='context-lifetime-ended';checkLedger(cpu,/SCHEMA_/);
});
test('failed/unverified release keeps charges; source state and reservation targets cannot shrink in transition',()=>{
 const before=ledger(unpainted),after=cp(before);after.mutationEpoch++;after.allocations[2].state='release-pending';summarize(after);assert.equal(after.totals.additionalDecodedOwnedLogicalBytes,before.totals.additionalDecodedOwnedLogicalBytes);checkLedger(after);
 const f=setup();code(()=>f.core.validateTransitionData({before,after,requestId:'other',documents:[f.d]},f.scope('prepared-data')),'BROWSER_SOURCE_RELEASED');
});
test('prepared data cannot mint credit, overstate zero peaks, use a strict candidate or omit source mark residency',()=>{
 for(const mutate of [c=>c.attemptBudget={},c=>c.peakTotals.additionalDecodedOwnedLogicalBytes=0,c=>c.candidateBaseView.retirementProfile='owned-candidate-base-retirement-v1',c=>c.ledgerTrace[0].ledger.residency=[]]){const f=setup(),s=f.source(),p=f.core.plan(s,f.scope('planning')),q=f.core.capacity(p,{checkpoint:f.checkpoint,history:f.history},f.scope('capacity')),c=prepared(p,q);mutate(c);code(()=>f.core.validatePreparedData(p,q,c,f.scope('prepared-data')),/BROWSER_|SCHEMA_/);}
});
test('source mutation fails final bind even with authentic plan and private observations',()=>{
 const f=setup(),s=f.source(),p=f.core.plan(s,f.scope('planning')),q=f.core.capacity(p,{checkpoint:f.checkpoint,history:f.history},f.scope('capacity')),c=f.core.validatePreparedData(p,q,prepared(p,q),f.scope('prepared-data'));f.d.contentRevision++;code(()=>f.core.bind(p,q,c,f.scope('final-bind')),'BROWSER_SOURCE_CHANGED');
});

test('pre-import original palette cache stays fully charged without seeding saved library, and reuse names actual stores/leases',()=>{
 const f=setup({requestId:'request.palette.cache'}),blob=pack.manifest.artwork[0].body.blob,l=f.observation.ledger,referenceId='dto.palette.cache';
 const rows=[allocation('dto.palette.encoded','encoded-blob','encoded',blob.byteLength,null,{allocationClass:'encoded-handle',blobSha256:blob.sha256}),allocation('dto.palette.cpu','artwork-image','decoded-additional',blob.widthPx*blob.heightPx*4,null,{blobSha256:blob.sha256}),texture('dto.palette.api','artwork-image','decoded-additional',blob.widthPx,blob.heightPx,null,{blobSha256:blob.sha256})];
 for(const row of rows)row.referenceIds=[referenceId];l.allocations.push(...rows);l.references.push({referenceId,kind:'cache',ownerLifetimeId:life.ownerLifetimeId,requestId:null,documentOrHistoryDigest:null,allocationIds:rows.map(x=>x.allocationId),viewIds:[],materialIds:[],rangeLeaseIds:[],state:'active'});summarize(l);f.context.allocations=costsFromTotals(l.totals);f.context.allocationLedgerDigest=token(l);
 assert.equal(f.d.authoring.library.artwork.length,0);assert.equal(f.d.resourceRefs.length,0);
 const s=f.source(),p=f.core.plan(s,f.scope('planning')),q=f.core.capacity(p,{checkpoint:f.checkpoint,history:f.history},f.scope('capacity')),raw=prepared(p,q);
 assert.equal(raw.sampledSharing[0].allocationId,'dto.palette.api');assert.equal(raw.peakTotals.additionalDecodedOwnedLogicalBytes,l.totals.additionalDecodedOwnedLogicalBytes+12582912);
 const c=f.core.validatePreparedData(p,q,raw,f.scope('prepared-data')),target=f.core.bind(p,q,c,f.scope('final-bind'));
 assert.equal(target.targetDocument.authoring.library.artwork.length,1);assert.equal(s.ledger.allocations.find(x=>x.allocationId==='dto.palette.cpu').charge,'decoded-additional');assert.equal(c.ledgerTrace[0].ledger.allocations.filter(x=>x.blobSha256===blob.sha256&&x.sampled).length,1);assert(f.owner.snapshot(f.attempt).reference.charged<1000000);
});
test('catalogue scope/digest is closed and cannot classify an arbitrary unknown cache page as original',()=>{
 const l=ledger(unpainted);l.resourceCatalogue.catalogueDigest=token('different');checkLedger(l,'BROWSER_CATALOGUE_BINDING');
 const unknown=ledger(unpainted);unknown.allocations.push(allocation('dto.unknown','artwork-image','decoded-additional',4096,null,{blobSha256:token('unknown page')}));summarize(unknown);checkLedger(unknown,'BROWSER_IMAGE_DESCRIPTOR');
});

test('strict Core metadata reader records exact UTF-8 ingress/copy octets for objects and encoded JSON',()=>{
 const value={label:'HÃƒÆ’Ã‚Â© ÃƒÂ°Ã…Â¸Ã…â€™Ã…Â ',rows:[null,true,12.5,{'x':'line\nquote"'}]};
 for(const input of [value,JSON.stringify(value,null,2)]){const o=createBrowserAttemptOwner(),source={},a=o.begin({source,requestId:'reader.utf8'}),r=o.reserveRemaining(a,'source');pairCoreOwner(o).execute(a,r,'source',source,sink=>{const b=new Budget({},sink);assert.deepEqual(readData(input,b),value);});const w=o.snapshot(a);assert.equal(w.raw.inputBytes,Buffer.byteLength(typeof input==='string'?input:JSON.stringify(input)));assert.equal(w.raw.copyBytes,Buffer.byteLength(JSON.stringify(value)));}
});
test('descriptor and duplicate-key readers refuse hostile data without invoking accessors or forgetting paid input',()=>{
 let invoked=0;const value={};Object.defineProperty(value,'document',{get(){invoked++;return {};},enumerable:true});const o=createBrowserAttemptOwner(),source={},a=o.begin({source,requestId:'reader.hostile'}),r=o.reserveRemaining(a,'source');code(()=>pairCoreOwner(o).execute(a,r,'source',source,sink=>readData(value,new Budget({},sink))),'INVALID_DATA');assert.equal(invoked,0);
 const other=createBrowserAttemptOwner(),b=other.begin({source,requestId:'reader.duplicate'}),rr=other.reserveRemaining(b,'source'),text='{"same":1,"same":2}';code(()=>pairCoreOwner(other).execute(b,rr,'source',source,sink=>readData(text,new Budget({},sink))),'DUPLICATE_JSON_KEY');assert.equal(other.snapshot(b).raw.inputBytes,Buffer.byteLength(text));
});

test('fully released reservation and exact receiver remain valid tombstones with homogeneous owner receipts',()=>{
 const l=ledger(unpainted),request='request.ledger',actual=allocation('dto.done.cpu','upload-staging','decoded-additional',2048,request,{fulfillsReservationId:'dto.done.reserve',state:'released-owned',releaseReceiptId:'dto.done.cpu.release'}),reserve=allocation('dto.done.reserve','upload-staging','decoded-additional',4096,request,{allocationClass:'application-reservation',state:'released-owned',releaseReceiptId:'dto.done.reserve.release',reservation:{state:'fulfilled',targetClass:'cpu-fixed-buffer',expectedApiLayout:null,fulfilledAllocationId:actual.allocationId,fulfillmentReceiptId:'dto.done.fulfill'}});
 l.allocations.push(reserve,actual);l.fulfillmentReceipts.push({kind:'nautilus-browser-reservation-fulfillment',version:1,accountingScope:B.SCOPE,profileDigest:B.PROFILE_DIGEST,...life,receiptId:'dto.done.fulfill',requestId:request,reservationId:reserve.allocationId,allocationId:actual.allocationId,reservedBytes:4096,actualBytes:2048,beforeMutationEpoch:0,afterMutationEpoch:1,observationDigest:token('SYNTHETIC fulfillment')});
 const release=(id,row,itemClass,releaseBasis)=>({kind:'nautilus-browser-owner-release',version:1,accountingScope:B.SCOPE,profileDigest:B.PROFILE_DIGEST,...life,receiptId:id,requestId:request,itemClass,allocationIds:[row.allocationId],viewIds:[],materialIds:[],rangeLeaseIds:[],beforeMutationEpoch:1,afterMutationEpoch:2,releaseBasis,remainingReferencesDigest:token([]),logicalOwnershipReleased:true,physicalReclamation:'UNMEASURED',observationDigest:token(['SYNTHETIC release',id])});l.mutationEpoch=2;l.releaseReceipts.push(release('dto.done.cpu.release',actual,'cpu-buffer','engine-owner-release'),release('dto.done.reserve.release',reserve,'reservation','engine-owner-release'));summarize(l);checkLedger(l);assert.equal(l.totals.additionalDecodedOwnedLogicalBytes,6291456);
 const bad=cp(l);bad.releaseReceipts[0].requestId='other';checkLedger(bad,'BROWSER_RELEASE_PROOF');
});

test('schema union probes propagate actual owner exhaustion instead of misreporting invalid data',()=>{
 const o=createBrowserAttemptOwner(),source={},a=o.begin({source,requestId:'schema.work.limit',referenceLimit:70}),r=o.reserveRemaining(a,'source');code(()=>pairCoreOwner(o).execute(a,r,'source',source,sink=>shape(T,'BrowserAllocation',allocation('dto.budget','upload-staging','decoded-additional',16),new Budget({},sink),BROWSER_SCHEMA)),'BROWSER_RESERVATION_EXHAUSTED');assert.equal(o.snapshot(a).state,'failed');
});
