// Exact data contradictions returned by independent review of ed66. Actual Core
// reducers and original source; resource/native observations remain synthetic.
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,ledger,prepared,summarize,costsFromTotals,cp,B,life,token,allocation,texture,unpainted} from '../tools/tile-authoring-core-c2-browser-fixtures.mjs';
const rejects=(fn,code)=>assert.throws(fn,e=>code instanceof RegExp?code.test(e.code):e.code===code);
function release(l,x,itemClass,key){const id='closure.release.'+x[key];x.state='released-owned';x.releaseReceiptId=id;l.mutationEpoch=2;l.releaseReceipts.push({kind:'nautilus-browser-owner-release',version:1,accountingScope:B.SCOPE,profileDigest:B.PROFILE_DIGEST,...life,receiptId:id,requestId:x.ownerRequestId??'request.release',itemClass,allocationIds:key==='allocationId'?[x[key]]:[],viewIds:key==='viewId'?[x[key]]:[],materialIds:key==='materialId'?[x[key]]:[],rangeLeaseIds:key==='rangeLeaseId'?[x[key]]:[],beforeMutationEpoch:1,afterMutationEpoch:2,releaseBasis:'engine-owner-release',remainingReferencesDigest:token([]),logicalOwnershipReleased:true,physicalReclamation:'UNMEASURED',observationDigest:token(['synthetic positive domain release',id])});return summarize(l);}
const validate=l=>{const f=setup({requestId:'request.closure.check'});return f.core.validateLedgerData({ledger:l,documents:[f.d]},f.scope('prepared-data'));};
function staged(){const f=setup({requestId:'request.closure.paint'}),s=f.source(),p=f.core.plan(s,f.scope('planning')),q=f.core.capacity(p,{checkpoint:f.checkpoint,history:f.history},f.scope('capacity')),c=prepared(p,q);return {...f,s,p,q,c,l:c.ledgerTrace[0].ledger};}
function recompute(f){summarize(f.l);f.c.peakTotals=Object.fromEntries(Object.keys(f.l.totals).map(k=>[k,Math.max(f.l.totals[k],f.s.ledger.totals[k])]));f.c.costBounds={...f.c.costBounds,...costsFromTotals(f.c.peakTotals)};}
for(const [domain,code]of [['geometry','BROWSER_GEOMETRY_STORE'],['material','BROWSER_MATERIAL_STORE']])test('exact review falsifier: held view cannot retain released '+domain,()=>{const l=ledger(unpainted),v=l.geometry.views[0],row=domain==='geometry'?l.allocations.find(x=>x.allocationId===v.geometryAllocationIds[0]):l.materials.find(x=>x.materialId===v.materialIds[0]);release(l,row,domain==='geometry'?'cpu-buffer':'view-material-range',domain==='geometry'?'allocationId':'materialId');assert.equal(v.state,'held');assert.equal(row.state,'released-owned');assert.equal(domain==='geometry'?l.totals.geometryOwnedCpuBytes:l.totals.appearanceMaterialsAllOwners,0);rejects(()=>validate(l),code);});
test('exact review falsifier: first-mark bind rejects one-byte relabeled required artwork CPU page',()=>{const f=staged(),row=f.l.allocations.find(x=>x.purpose==='artwork-image'&&x.allocationClass==='cpu-fixed-buffer');assert.equal(row.observableBytes,6291456);row.purpose='upload-staging';row.observableBytes=1;recompute(f);assert.equal(f.c.peakTotals.additionalDecodedOwnedLogicalBytes,25165825);rejects(()=>{const c=f.core.validatePreparedData(f.p,f.q,f.c,f.scope('prepared-data'));return f.core.bind(f.p,f.q,c,f.scope('final-bind'));},'BROWSER_DECODE_ROLE');});


test('held view rejects omitted dependencies, idle/acquiring rows, foreign context and wrong geometry usage',()=>{
 const cases=[
  ['BROWSER_GEOMETRY_STORE',l=>l.geometry.views[0].geometryAllocationIds=[]],
  ['BROWSER_MATERIAL_STORE',l=>l.geometry.views[0].materialIds=[]],
  ['BROWSER_GEOMETRY_STORE',l=>l.allocations[0].state='acquiring'],
  ['BROWSER_MATERIAL_STORE',l=>l.materials[0].state='cache-idle'],
  ['BROWSER_GEOMETRY_STORE',l=>l.allocations[0].contextEpoch++],
  ['BROWSER_MATERIAL_STORE',l=>l.materials[0].ownerLifetimeId='foreign.life'],
  ['BROWSER_GEOMETRY_STORE',l=>{const x=l.allocations[0];x.charge='decoded-additional';x.purpose='upload-staging';x.geometryLayout=null;}]
 ];for(const [code,mutate]of cases){const l=ledger(unpainted);mutate(l);summarize(l);rejects(()=>validate(l),code);}
});
test('held CPU and API geometry stores remain charged, while fully released view/dependency tombstones are valid',()=>{
 const l=ledger(unpainted),layout={kind:'buffer-store',target:'ARRAY_BUFFER',usage:'STATIC_DRAW',logicalBytes:l.allocations[0].observableBytes,storeGeneration:1};l.allocations.push(allocation('closure.api.geometry','geometry-buffer','geometry-governed',layout.logicalBytes,null,{allocationClass:'api-buffer-store',apiLayout:layout,apiLayoutDigest:token(layout)}));l.geometry.views[0].geometryAllocationIds.push('closure.api.geometry');summarize(l);assert.equal(validate(l).valid,true);assert.equal(l.totals.geometryOwnedCpuBytes,33480);assert.equal(l.totals.geometryApiBufferBytes,33480);
 const bad=cp(l);bad.allocations.at(-1).apiLayout.target='ELEMENT_ARRAY_BUFFER';bad.allocations.at(-1).apiLayoutDigest=token(bad.allocations.at(-1).apiLayout);rejects(()=>validate(bad),'BROWSER_GEOMETRY_STORE');
 const done=ledger(unpainted);release(done,done.geometry.views[0],'view-material-range','viewId');release(done,done.materials[0],'view-material-range','materialId');release(done,done.allocations[0],'cpu-buffer','allocationId');assert.equal(validate(done).valid,true);assert.equal(done.totals.geometryOwnedCpuBytes,0);assert.equal(done.totals.appearanceMaterialsAllOwners,0);
});
function rangeLedger(){const l=ledger(unpainted);l.rangeLeases=[{rangeLeaseId:'closure.range',...life,allocationIds:['dto.source.base','dto.source.base.cpu'],viewIds:['dto.source.view'],protectedRegionDigest:token('synthetic protected full stores'),state:'held',releaseReceiptId:null,ownerRequestId:null}];return l;}
test('held ranges require full held same-context stores and held views; released ranges preserve shared stores',()=>{
 assert.equal(validate(rangeLedger()).valid,true);
 for(const [code,mutate]of [['BROWSER_RANGE_STORE',l=>l.allocations[2].state='acquiring'],['BROWSER_RANGE_STORE',l=>l.allocations[2].ownerLifetimeId='foreign.life'],['BROWSER_RANGE_VIEW',l=>l.geometry.views[0].state='release-pending'],['BROWSER_RANGE_STORE',l=>release(l,l.allocations[2],'cpu-buffer','allocationId')]]){const l=rangeLedger();mutate(l);summarize(l);rejects(()=>validate(l),code);}
 const l=rangeLedger();release(l,l.rangeLeases[0],'view-material-range','rangeLeaseId');assert.equal(validate(l).valid,true);assert.equal(l.totals.additionalDecodedOwnedLogicalBytes,6291456);assert.equal(l.totals.baselineApiTextureBytes,6291456);
});
test('active material/store references cannot retain acquiring, pending or released targets',()=>{
 for(const state of ['acquiring','release-pending','released-owned']){const l=ledger(unpainted),referenceId='closure.material.ref';l.references=[{referenceId,kind:'source',ownerLifetimeId:life.ownerLifetimeId,requestId:null,documentOrHistoryDigest:null,allocationIds:['dto.source.base.cpu'],viewIds:[],materialIds:['dto.source.material'],rangeLeaseIds:[],state:'active'}];l.materials[0].referenceIds=[referenceId];l.allocations[2].referenceIds=[referenceId];if(state==='released-owned')release(l,l.allocations[2],'cpu-buffer','allocationId');else l.allocations[2].state=state;summarize(l);rejects(()=>validate(l),'BROWSER_REFERENCE_LIVE');}
});
test('decoded page observations reject other purposes, domains, contexts, states and missing full CPU/API receivers',()=>{
 const cases=[
  f=>f.l.allocations.find(x=>x.purpose==='artwork-image'&&x.allocationClass==='cpu-fixed-buffer').purpose='decoder-scratch',
  f=>f.l.allocations.find(x=>x.purpose==='artwork-image'&&x.sampled).purpose='base-image',
  f=>f.l.allocations.find(x=>x.purpose==='artwork-image'&&x.allocationClass==='cpu-fixed-buffer').contextEpoch++,
  f=>f.l.allocations.find(x=>x.purpose==='artwork-image'&&x.allocationClass==='cpu-fixed-buffer').ownerLifetimeId='foreign.life',
  f=>{const row=f.l.allocations.find(x=>x.purpose==='artwork-image'&&x.allocationClass==='cpu-fixed-buffer');release(f.l,row,'cpu-buffer','allocationId');},
  f=>{const row=f.l.allocations.find(x=>x.purpose==='artwork-image'&&x.allocationClass==='cpu-fixed-buffer');f.c.decodedObservations[0].allocationIds=f.c.decodedObservations[0].allocationIds.filter(id=>id!==row.allocationId);}
 ];for(const mutate of cases){const f=staged();mutate(f);recompute(f);rejects(()=>f.core.validatePreparedData(f.p,f.q,f.c,f.scope('prepared-data')),'BROWSER_DECODE_ROLE');}
});
