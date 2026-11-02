import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as C from '../candidates/tile-authoring/core/c2/index.js';
import {T,cp,token,stageFixture,paintOperations,preparedCapture,ledger,allocation} from '../tools/tile-authoring-core-c2-fixtures.mjs';

const folder=new URL('../candidates/tile-authoring/core/c2/vendor/architect-review/f32f02a/',import.meta.url),index=JSON.parse(fs.readFileSync(new URL('ledger-counterexamples.json',folder),'utf8'));
const codes={'owned-live-charge-shrink':'OWNED_ALLOCATION_CHARGE_SHRINK','owned-material-disappears':'UNVERIFIED_MATERIAL_LOSS','accepted-source-residency-disappears':'SOURCE_RESIDENCY_CHANGED','extra-sampled-page-under-rgba-bound':'RGBA8_ALLOCATION_BOUND'};
for(const row of index.rows)test('architect exact hash-bound regression: '+row.name,()=>{
 const raw=fs.readFileSync(new URL(row.file,folder));assert.equal(createHash('sha256').update(raw).digest('hex'),row.sha256);
 const w=JSON.parse(raw);assert.equal(w.fixed,'f32f02a57d445b393b9fc96a8d757f1947a6f46a');assert.equal(w.response.ok,true,'Preserve the independently observed failed positive; never rewrite old proof.');
 const result=C.bindTileAuthoringTarget(T,{before:w.input.document,plan:w.plan,prepared:null,appearanceCapture:w.appearanceCapture});
 assert.equal(result.ok,false,JSON.stringify(result));assert.equal(result.diagnostics[0].code,codes[row.name]);
});
const initial=stageFixture(),x=stageFixture(paintOperations(initial.f)),p=C.planTileAuthoring(T,x.input);assert.equal(p.ok,true,JSON.stringify(p));
const bind=c=>C.bindTileAuthoringTarget(T,{before:x.input.document,plan:p,prepared:null,appearanceCapture:c});
function recapture(c,steps){
 for(const l of steps.map(s=>s.ledger))ledger(l);
 c.ledgerTrace=steps;const final=steps.at(-1).ledger;c.admittedGeometry=cp(final.geometry);Object.assign(c.costBounds,final.totals);
 const peak={...p.sourceCapture.ledger.totals};for(const step of steps)for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],step.ledger.totals[k]);c.peakTotals=peak;return c;
}
function transient({retire=true,prune=false}={}){
 const c=preparedCapture(p),first=cp(c.ledgerTrace[0].ledger),requestId=p.original.requestId;
 first.allocations.push(allocation('regression.scratch','decoder-scratch','decoded-additional',1000000,requestId,{sampledAtlas:false}));
 first.materials.push({materialId:'regression.cached.material',state:'cache-idle',ownerRequestId:requestId,referenceIds:[],retirementReceiptDigest:null});
 const second=cp(first);second.sequence++;
 if(retire){for(const row of [second.allocations.at(-1),second.materials.at(-1)]){row.state='retired-verified';row.referenceIds=[];row.retirementReceiptDigest=token('DTO owned positive retirement receipt');}}
 const third=cp(second);third.sequence++;if(prune){third.allocations.pop();third.materials.pop();}
 return recapture(c,[{eventId:'regression.acquire',action:'acquire',ownerRequestId:requestId,ledger:first},{eventId:'regression.retire',action:retire?'retire-verified':'acquire',ownerRequestId:requestId,ledger:second},{eventId:'regression.admit',action:'admit',ownerRequestId:requestId,ledger:third}]);
}
test('positive ordered owned allocation/material retirement releases charges and retains the actual transient peak',()=>{
 const c=transient(),r=bind(c);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(c.peakTotals.declaredDecodedAllocationBytes-r.costBounds.declaredDecodedAllocationBytes,1000000);
 assert.equal(c.peakTotals.ownedAppearanceMaterialsAllViews-r.costBounds.ownedAppearanceMaterialsAllViews,1);
 assert.equal(c.ledgerTrace[1].ledger.allocations.at(-1).chargedBytes,1000000);
});
test('positive already-verified retirement can prune rows at later admission; physical identity cannot resurrect',()=>{
 const c=transient({prune:true});assert.equal(bind(c).ok,true);
 const final=cp(c.ledgerTrace.at(-1).ledger);final.sequence++;final.allocations.push(cp(c.ledgerTrace[0].ledger.allocations.at(-1)));
 recapture(c,[...c.ledgerTrace,{eventId:'regression.resurrect',action:'admit',ownerRequestId:p.original.requestId,ledger:final}]);
 const r=bind(c);assert.equal(r.ok,false);assert.equal(r.diagnostics[0].code,'RETIRED_ALLOCATION_REUSED');
});
test('owned physical quantity/type/storage/owner/blob identity and material lifetime do not reset between observations',()=>{
 for(const mutate of [
  l=>l.allocations.at(-1).chargedBytes=1,
  l=>l.allocations.at(-1).storage='gpu',
  l=>l.allocations.at(-1).ownerRequestId='foreign.owner',
  l=>l.allocations.at(-1).blobSha256=token('different source'),
  l=>l.materials.pop(),
  l=>l.materials.at(-1).ownerRequestId='foreign.owner'
 ]){
  const c=transient({retire:false}),last=cp(c.ledgerTrace.at(-1).ledger);mutate(last);recapture(c,[...c.ledgerTrace.slice(0,-1),{...c.ledgerTrace.at(-1),ledger:last}]);assert.equal(bind(c).ok,false);
 }
});
test('retirement receipt/state requires an explicit verified event and cannot masquerade as ordinary admission',()=>{
 const c=transient();c.ledgerTrace[1].action='admit';const r=bind(c);assert.equal(r.ok,false);assert.equal(r.diagnostics[0].code,'RETIREMENT_EVENT_REQUIRED');
});
test('unverified retirement keeps full quantity/material charges and cannot become a new live lifetime',()=>{
 const c=transient({retire:false}),second=c.ledgerTrace[1].ledger,third=c.ledgerTrace[2].ledger;
 for(const l of [second,third])for(const row of [l.allocations.at(-1),l.materials.at(-1)])row.state='retiring-unverified';
 c.ledgerTrace[1].action='retire-unverified';recapture(c,c.ledgerTrace);const result=bind(c);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.costBounds.declaredDecodedAllocationBytes,c.peakTotals.declaredDecodedAllocationBytes);
 const last=cp(third);last.sequence++;last.allocations.at(-1).state='live';recapture(c,[...c.ledgerTrace,{eventId:'regression.unverified.revive',action:'admit',ownerRequestId:p.original.requestId,ledger:last}]);assert.equal(bind(c).ok,false);
});
test('accepted source residency remains charged across all views even when the source preview becomes hidden',()=>{
 const before=p.targetDocument,mark=cp(before.authoring.decorations.chunks[0].marks[0]);mark.revision++;mark.graphic.opacity=0;
 const y=stageFixture([{kind:'decoration.update',body:{markId:mark.id,expectedRevision:1,replacement:mark,groupPolicy:'preserve-whole-group'}}],{document:before}),q=C.planTileAuthoring(T,y.input);assert.equal(q.ok,true,JSON.stringify(q));
 const c=preparedCapture(q),l=c.ledgerTrace[0].ledger;l.geometry.views.find(v=>v.role==='accepted').visible=false;ledger(l);c.admittedGeometry=cp(l.geometry);c.peakTotals=cp(l.totals);Object.assign(c.costBounds,l.totals);
 const result=C.bindTileAuthoringTarget(T,{before,plan:q,prepared:null,appearanceCapture:c});assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.costBounds.residentMarksAllViews,2);
 const bad=cp(c);bad.ledgerTrace[0].ledger.residency.find(v=>v.viewId==='fixture.accepted').markIds=[];ledger(bad.ledgerTrace[0].ledger);bad.peakTotals=cp(bad.ledgerTrace[0].ledger.totals);Object.assign(bad.costBounds,bad.peakTotals);
 const rejected=C.bindTileAuthoringTarget(T,{before,plan:q,prepared:null,appearanceCapture:bad});assert.equal(rejected.ok,false);assert.equal(rejected.diagnostics[0].code,'SOURCE_RESIDENCY_CHANGED');
});
test('every physical artwork page copy keeps the known full RGBA8 bound, whether sampled or referenced by decode observations',()=>{
 for(const sampled of [true,false]){
  const c=preparedCapture(p),l=c.ledgerTrace[0].ledger,sha=p.resourceRequirements.decodeNeeds[0].blobSha256;
  l.allocations.push(allocation('regression.extra.image','artwork-image','decoded-additional',1024,p.original.requestId,{sampledAtlas:sampled,storage:sampled?'gpu':'cpu',blobSha256:sha}));recapture(c,c.ledgerTrace);
  const r=bind(c);assert.equal(r.ok,false);assert.equal(r.diagnostics[0].code,'RGBA8_ALLOCATION_BOUND');
 }
});
test('preserved failed-positive source is exact and current four-page control charges the whole page',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('inventory.json',folder),'utf8')),row=inventory.files.find(x=>x.path==='stage-a-tests-original.mjs'),raw=fs.readFileSync(new URL(row.path,folder));
 assert.equal(createHash('sha256').update(raw).digest('hex'),row.sha256);assert.match(raw.toString('utf8'),/artwork-image','decoded-additional',1024/);
 const c=preparedCapture(p),l=c.ledgerTrace[0].ledger,need=p.resourceRequirements.encodedNeeds.find(n=>n.blob.sha256===p.resourceRequirements.decodeNeeds[0].blobSha256).blob;
 l.allocations.push(allocation('regression.valid.fourth','artwork-image','decoded-additional',need.widthPx*need.heightPx*4,p.original.requestId,{blobSha256:need.sha256}));recapture(c,c.ledgerTrace);const r=bind(c);assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.costBounds.atlasPagesAllViews,4);
});
