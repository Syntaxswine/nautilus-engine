// Pure closed observation checks. Synthetic DTO tests never attest live work.
import {readData,fields,hash,equal,fail,captureShape} from './data.js';
import {PROFILES,PROFILE_DIGEST,SCOPE} from './contract.js';
import {validateTransitionData,costTotals} from './ledger.js';
import {costs} from './requirements.js';
import {finishData} from './output.js';
const need=(v,code,path,message)=>{if(!v)fail(code,path,message);};
const live=x=>x.state!=='released-owned';
const stripCandidate=v=>{const {projectionProfile,projectionDigest,releaseOwnerRequestId,releaseProfile,...view}=v;return view;};
export function validatePreparedData(t,record,raw,capacity,b){
 const p=record.plan,s=p.sourceCapture,request=p.original.requestId;
 const c=readData(raw,b,b.limits.inputBytes);
 // Intrinsic stamp replaces no caller field: observers submit the closed body.
 need(!Object.hasOwn(c,'attemptBudget'),'BROWSER_STAMP_CALLER','/attemptBudget','Only the actual owner issues this validation observation.');
 c.attemptBudget=b.stamp(v=>hash(t,v,b));captureShape(t,'BrowserPreparedCapture',c,b);
 need(c.profileDigest===PROFILE_DIGEST&&c.accountingScope===SCOPE&&equal(t,c.profiles,PROFILES,b),'BROWSER_PROFILE_MISMATCH','/profiles','Exact browser profile required.');
 need(equal(t,c.capacityBound,capacity,b)&&b.verifyStamp(capacity.attemptBudget)&&c.planDigest===hash(t,p,b)&&c.sourceCaptureDigest===p.sourceCaptureDigest&&equal(t,c.original,p.original,b),'BROWSER_PREPARED_BINDING','/prepared','Only the original plan/capacity/attempt can be validated.');
 for(const [x,y]of [[c.authority,s.authority],[c.sourceResourceRefs,p.resourceRequirements.sourceResourceRefs],[c.targetResourceRefs,p.resourceRequirements.targetResourceRefs],[c.resourceRequirements,p.resourceRequirements],[c.sourceGeometry,s.ledger.geometry],[c.appearance.sourceVisual,s.visual]])need(equal(t,x,y,b),'BROWSER_PREPARED_BINDING','/prepared','Preserve complete original resources, geometry and visual observation.');
 need(c.sourceResourceLeaseSetDigest===s.resourceLeaseSetDigest&&c.appearance.presentedRequirementsDigest===hash(t,p.resourceRequirements,b),'BROWSER_RESOURCE_BINDING','/prepared','Resource context and complete requirements must match.');
 let l=s.ledger;const peak={...l.totals},events=new Set();
 for(const step of c.ledgerTrace){b.take();need(!events.has(step.eventId)&&step.ownerRequestId===request,'BROWSER_TRACE_ID','/ledgerTrace','Distinct same-request transition IDs required.');events.add(step.eventId);validateTransitionData(t,l,step.ledger,request,b,[record.before,p.targetDocument]);l=step.ledger;for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],l.totals[k]);}
 need(equal(t,l.geometry,c.admittedGeometry,b)&&equal(t,peak,c.peakTotals,b),'BROWSER_PEAK_BINDING','/peakTotals','Recompute every transition peak including retained source/debt.');
 need(!c.unresolvedAllocationIds.length&&!l.allocations.some(x=>['acquiring','release-pending'].includes(x.state)),'BROWSER_UNRESOLVED_PREPARATION','/prepared','Unknown ownership never passes data admission.');
 if(p.preparationNeed==='encoded-only-retain-appearance'){
  need(c.candidateBaseView===null&&c.appearance.mode==='retain-existing'&&c.appearance.candidateDigest===null&&equal(t,c.sourceGeometry,c.admittedGeometry,b),'BROWSER_RETAIN_APPEARANCE','/appearance','Metadata-only changes retain all actual views exactly.');
  need(equal(t,record.before.authoring.decorations,p.targetDocument.authoring.decorations,b),'BROWSER_RETAIN_APPEARANCE','/target','Existing marks and layers remain exact.');
 }else{
  const candidate=c.candidateBaseView;need(candidate&&c.appearance.mode==='prepared-overlay'&&c.appearance.candidateDigest!==null,'BROWSER_CANDIDATE_REQUIRED','/candidateBaseView','Overlay observations require the explicit browser candidate.');
  const view=l.geometry.views.find(v=>v.viewId===candidate.viewId),source=s.ledger.geometry.views.find(v=>v.role==='accepted'&&live(v));
  need(view&&equal(t,view,stripCandidate(candidate),b)&&view.state==='held'&&view.ownerRequestId===request&&candidate.releaseOwnerRequestId===request&&view.bundleDigest===source.bundleDigest&&view.geometrySourceDigest===source.geometrySourceDigest&&view.roots===source.roots&&view.triangles===source.triangles&&view.cells===source.cells,'BROWSER_CANDIDATE_GEOMETRY','/candidateBaseView','Unchanged public source geometry only; candidate ownership has its separate browser release profile.');
  const expected=new Map();for(const chunk of p.targetDocument.authoring.decorations.chunks)for(const mark of chunk.marks){const ids=expected.get(mark.target.ownerId)??[];ids.push(mark.id);expected.set(mark.target.ownerId,ids);}
  const rows=l.residency.filter(r=>r.viewId===view.viewId);need(rows.length===expected.size,'BROWSER_RESIDENCY','/residency','Every owner source mark counts even hidden/zero alpha.');for(const row of rows)need(expected.has(row.ownerId)&&equal(t,[...row.markIds].sort(),expected.get(row.ownerId).sort(),b),'BROWSER_RESIDENCY','/residency','Complete exact target mark IDs required.');
 }
 const encoded=new Map(c.encodedAvailability.map(x=>[x.blobSha256,x]));need(encoded.size===c.encodedAvailability.length&&encoded.size===p.resourceRequirements.encodedNeeds.length,'BROWSER_ENCODED_CLOSURE','/encodedAvailability','Exactly every required encoded blob is observed.');
 for(const item of p.resourceRequirements.encodedNeeds){const e=encoded.get(item.blob.sha256),row=l.allocations.find(a=>a.allocationId===e?.encodedLeaseId);need(e&&e.blobDescriptorDigest===hash(t,item.blob,b)&&row&&row.state==='held'&&row.purpose==='encoded-blob'&&row.charge==='encoded'&&row.allocationClass!=='application-reservation'&&row.blobSha256===item.blob.sha256&&row.observableBytes>=item.blob.byteLength,'BROWSER_ENCODED_CLOSURE','/encodedAvailability','Exact full descriptor and full encoded receiver capacity required.');}
 const decoded=new Map(c.decodedObservations.map(x=>[x.blobSha256,x]));need(decoded.size===c.decodedObservations.length,'BROWSER_DECODE_CLOSURE','/decodedObservations','One observed decode per required page.');
 if(p.preparationNeed==='prepare-overlay')for(const item of p.resourceRequirements.decodeNeeds){
  const d=decoded.get(item.blobSha256),blob=p.resourceRequirements.encodedNeeds.find(x=>x.blob.sha256===item.blobSha256)?.blob,rows=d?.allocationIds.map(id=>l.allocations.find(a=>a.allocationId===id));
  need(d&&d.resourceContextEpoch===s.authority.resourceContextEpoch&&d.imageInterpretationDigest===hash(t,{blob,decoderProfile:item.decoderProfile},b)&&rows.length,'BROWSER_DECODE_CLOSURE','/decodedObservations','An exact observed decode for the full required page is mandatory.');
  need(rows.every(a=>a&&a.state==='held'&&a.blobSha256===blob.sha256&&a.purpose==='artwork-image'&&a.charge==='decoded-additional'&&['cpu-fixed-buffer','api-texture-store'].includes(a.allocationClass)&&a.ownerLifetimeId===l.ownerLifetimeId&&a.contextId===s.authority.rendererContextId&&a.contextEpoch===s.authority.rendererContextEpoch&&a.observableBytes>=blob.widthPx*blob.heightPx*4)&&rows.some(a=>a.allocationClass==='cpu-fixed-buffer')&&rows.some(a=>a.allocationClass==='api-texture-store'),'BROWSER_DECODE_ROLE','/decodedObservations','Each decoded page ID names a held actual full artwork-image CPU or API receiver in the exact owner/context. Scratch, upload staging, encoded, derived, baseline and reservations cannot stand in for a page.');
 }

 for(const item of decoded.values())need(p.resourceRequirements.decodeNeeds.some(x=>x.blobSha256===item.blobSha256),'BROWSER_DECODE_CLOSURE','/decodedObservations','No unrelated decode observations.');
 for(const d of c.decodedObservations)for(const id of d.allocationIds){const row=l.allocations.find(a=>a.allocationId===id),prior=s.ledger.allocations.find(a=>a.allocationId===id);if(prior?.sampled)need(c.sampledSharing.some(x=>x.allocationId===id),'BROWSER_SHARED_STORE','/sampledSharing','An existing page cannot be reused by matching SHA alone; exact retained actual store sharing is explicit.');}
 for(const item of c.sampledSharing){const old=s.ledger.allocations.find(x=>x.allocationId===item.allocationId),next=l.allocations.find(x=>x.allocationId===item.allocationId);need(old&&next&&old.sampled&&next.sampled&&item.contextId===old.contextId&&item.contextEpoch===old.contextEpoch&&equal(t,old.referenceIds,item.sourceReferenceIds,b)&&equal(t,next.referenceIds,item.admittedReferenceIds,b)&&next.referenceIds.length>old.referenceIds.length&&next.referenceIds.some(id=>!old.referenceIds.includes(id)&&l.references.some(r=>r.referenceId===id&&r.kind==='candidate'&&r.requestId===request&&r.allocationIds.includes(old.allocationId))),'BROWSER_SHARED_STORE','/sampledSharing','Only the exact retained actual store may gain references.');}
 const verified=costs(record.before,p.targetDocument,costTotals(peak),b),{planning:ignored,...claim}=c.costBounds,{planning:unused,...actual}=verified;
 need(equal(t,claim,actual,b),'BROWSER_CAPTURE_COST','/costBounds','Complete logical peak costs must match; work DTOs never grant credit.');c.costBounds=verified;
 return {capture:finishData(c,b),ledger:l};
}
