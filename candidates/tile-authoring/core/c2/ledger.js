import {fail,hash,equal,captureShape} from './data.js';
import {CAPS,PROFILES} from './contract.js';
import {lifetimeTracker,validateLifetimes} from './ledger-transitions.js';
export const live=x=>x.state!=='retired-verified';
export const allocationKey=a=>[a.contextId,a.contextEpoch,a.allocationId].join('|');
const requireData=(value,code,path,message)=>{if(!value)fail(code,path,message);};
const unique=(xs,path)=>requireData(new Set(xs).size===xs.length,'LEDGER_IDENTITY',path,'Actual identities must be unique.');
export function geometryData(t,g,b){
 const views=g.views.filter(live);
 return {geometryLeaseSetDigest:hash(t,views.map(x=>({viewId:x.viewId,geometryLeaseId:x.geometryLeaseId,geometryEpoch:x.geometryEpoch})),b),geometryObjectsDigest:hash(t,views.map(x=>({viewId:x.viewId,identityBasis:x.identityBasis,objects:x.geometryObjectsDigest})),b),views:g.views,rootsAllViews:views.reduce((n,x)=>n+x.roots,0),trianglesAllViews:views.reduce((n,x)=>n+x.triangles,0),cellsAllViews:views.reduce((n,x)=>n+x.cells,0)};
}
export function ledgerTotals(l){
 const allocations=l.allocations.filter(live);
 return {declaredDecodedAllocationBytes:allocations.filter(x=>x.charge==='decoded-additional').reduce((n,x)=>n+x.chargedBytes,0),residentMarksAllViews:l.residency.reduce((n,x)=>n+x.markIds.length,0),rootsAllViews:l.geometry.rootsAllViews,trianglesAllViews:l.geometry.trianglesAllViews,cellsAllViews:l.geometry.cellsAllViews,ownedAppearanceMaterialsAllViews:l.materials.filter(live).length,contributorsPerBin:l.bins.contributorsPerBin,binReferencesAllViews:l.bins.binReferencesAllViews,derivedBufferBytesAllViews:allocations.filter(x=>x.charge==='derived').reduce((n,x)=>n+x.chargedBytes,0),atlasPagesAllViews:new Set(allocations.filter(x=>x.sampledAtlas).map(allocationKey)).size};
}
export function validateLedger(t,l,b){
 captureShape(t,'LedgerObservation',l,b);
 unique(l.geometry.views.map(x=>x.viewId),'/ledger/geometry/views');unique(l.geometry.views.map(x=>x.geometryLeaseId),'/ledger/geometry/leases');
 unique(l.allocations.map(allocationKey),'/ledger/allocations');unique(l.allocations.map(x=>x.allocationId),'/ledger/allocationIds');unique(l.materials.map(x=>x.materialId),'/ledger/materials');
 const allocations=new Map(l.allocations.map(x=>[x.allocationId,x])),materials=new Map(l.materials.map(x=>[x.materialId,x]));
 for(const x of [...l.allocations,...l.materials,...l.geometry.views]){
  b.take();unique(x.referenceIds??[], '/ledger/references');
  if(!live(x))requireData(x.retirementReceiptDigest!==null&&(x.referenceIds??[]).length===0,'RETIREMENT_UNVERIFIED','/ledger','Only a positive retirement receipt releases physical charges.');
  else requireData(x.retirementReceiptDigest===null,'RETIREMENT_STATE','/ledger','Live/acquiring/unverified allocations retain their charges.');
 }
 for(const a of l.allocations){
  const allowed=a.purpose==='geometry-buffer'?a.charge==='geometry-governed'&&!a.sampledAtlas:a.purpose==='encoded-blob'?a.charge==='encoded'&&!a.sampledAtlas:a.purpose==='derived-uniforms'?a.charge==='derived'&&!a.sampledAtlas:a.purpose==='base-image'?['baseline-visible','decoded-additional'].includes(a.charge):a.charge==='decoded-additional';
  requireData(allowed,'ALLOCATION_CLASS','/ledger/allocations','Physical storage is charged in its governing class; geometry is never free or artwork memory.');
  if(a.sampledAtlas)requireData(a.storage==='gpu'&&['base-image','artwork-image'].includes(a.purpose),'SAMPLED_ALLOCATION_CLASS','/ledger/allocations','Sampled pages are actual image GPU allocations.');
 }
 for(const view of l.geometry.views){
  b.take();unique(view.geometryAllocationIds,'/ledger/geometry/buffers');unique(view.materialIds,'/ledger/geometry/materials');
  if(view.identityBasis==='actual-native')requireData(view.geometryObjectsDigest!==null,'GEOMETRY_IDENTITY','/ledger/geometry','Actual native objects need a full identity observation.');
  if(live(view)){
   for(const id of view.geometryAllocationIds){const a=allocations.get(id);requireData(a&&live(a)&&a.purpose==='geometry-buffer'&&a.charge==='geometry-governed'&&a.chargedBytes>0,'GEOMETRY_ALLOCATION','/ledger/geometry','Every actual geometry buffer must remain positively charged.');}
   for(const id of view.materialIds)requireData(materials.has(id)&&live(materials.get(id)),'GEOMETRY_MATERIAL','/ledger/geometry','All visible, cached and candidate materials count.');
   if(view.cells>0)requireData(view.geometryAllocationIds.length>0,'GEOMETRY_ALLOCATION','/ledger/geometry','Nonempty geometry cannot claim zero native allocation.');
  }
 }
 unique(l.residency.map(x=>x.viewId+'|'+x.ownerId),'/ledger/residency');
 for(const row of l.residency){b.take(row.markIds.length+1);unique(row.markIds,'/ledger/residency/marks');requireData(l.geometry.views.some(v=>v.viewId===row.viewId&&live(v)),'RESIDENCY_VIEW','/ledger/residency','Hidden marks still need a retained live view.');}
 requireData(equal(t,l.geometry,geometryData(t,l.geometry,b),b),'GEOMETRY_TOTALS','/ledger/geometry','Root/cell/triangle/identity totals must derive every retained view.');
 const totals=ledgerTotals(l);
 requireData(equal(t,l.totals,totals,b),'LEDGER_TOTALS','/ledger/totals','All physical copies, materials and hidden/zero-alpha marks are charged.');
 for(const [k,cap]of Object.entries(CAPS))requireData(Number.isSafeInteger(totals[k])&&totals[k]<=cap,'BUDGET_EXHAUSTED','/ledger/totals/'+k,'Fixed shared allocation cap exhausted.');
 return l;
}
export function knownArtworkBlobs(t,documents,b){
 const blobs=new Map();
 for(const d of documents)for(const r of d.authoring.library.artwork){
  b.take();const blob=r.body.blob,prior=blobs.get(blob.sha256);
  if(prior&&!equal(t,prior,blob,b))fail('BLOB_DESCRIPTOR_CONFLICT','/ledger','Every physical copy must bind one complete immutable source/target blob descriptor.');
  blobs.set(blob.sha256,blob);
 }
 return blobs;
}
export function validateArtworkAllocations(l,blobs,b){
 for(const row of l.allocations){
  b.take();if(row.purpose!=='artwork-image')continue;
  const blob=row.blobSha256===null?null:blobs.get(row.blobSha256);
  requireData(blob,'ARTWORK_BLOB_UNBOUND','/ledger/allocations','Every physical artwork image, including extra/source-only/cached copies, needs verified complete blob metadata. Unknown quantities cannot become zero.');
  requireData(row.chargedBytes>=blob.widthPx*blob.heightPx*4,'RGBA8_ALLOCATION_BOUND','/ledger/allocations','Every full RGBA8 image copy keeps its complete byte lower bound, independently of decoder-observation references.');
 }
}
export function validateSourceCapture(t,before,context,s,original,b){
 captureShape(t,'SourceCapture',s,b);requireData(equal(t,s.profiles,PROFILES,b),'C2_HOST_PROFILE_UNBOUND','/appearanceSource/profiles','Pair the explicit C2 profiles; profile strings on an old Host are insufficient.');
 requireData(equal(t,s.original,original,b),'ORIGINAL_BINDING','/appearanceSource/original','Retain the original ID, digest, Expected and Host request.');
 requireData(equal(t,s.sourceResourceRefs,before.resourceRefs,b)&&equal(t,context.resourceBindings,before.resourceRefs,b),'SOURCE_RESOURCE_SET','/appearanceSource','Capture source refs separately from new target refs.');
 for(const k of ['hostAuthorityToken','authorityContextToken','presentationProfileDigest'])requireData(s.authority[k]===context[k],'STALE_CONTEXT','/appearanceSource/authority/'+k,'One actual source authority/context is required.');
 requireData(s.authority.hostAuthorityToken===original.expected.hostAuthorityToken&&s.authority.authorityContextToken===original.expected.authorityContextToken,'ORIGINAL_BINDING','/appearanceSource/authority','Source Expected stays fixed throughout preparation.');
 requireData(before.floorBinding.floors.some(f=>f.id===s.authority.floorId),'FLOOR_BINDING','/appearanceSource/authority/floorId','Capture an actual source floor.');
 validateLedger(t,s.ledger,b);validateArtworkAllocations(s.ledger,knownArtworkBlobs(t,[before],b),b);
 for(const chunk of before.authoring.decorations.chunks)for(const m of chunk.marks)requireData(s.ledger.residency.some(row=>row.ownerId===m.target.ownerId&&row.markIds.includes(m.id)&&s.ledger.geometry.views.some(v=>v.viewId===row.viewId&&v.role==='accepted'&&live(v))),'SOURCE_RESIDENCY_UNBOUND','/appearanceSource/ledger','Every accepted source mark, including hidden/zero-alpha marks, must remain resident and charged.');
 requireData(equal(t,context.allocations,s.ledger.totals,b)&&context.allocationLedgerDigest===hash(t,s.ledger,b)&&context.resourceLeaseSetDigest===s.resourceLeaseSetDigest,'SOURCE_LEDGER_BINDING','/appearanceSource/ledger','Context binds the exact actual source ledger and lease set.');
 return s;
}
export const viewOnly=x=>{const {projectionProfile,projectionDigest,retirementOwnerRequestId,retirementProfile,...v}=x;return v;};
const without=(x,keys)=>Object.fromEntries(Object.entries(x).filter(([k])=>!keys.includes(k)));
function preserveSource(t,source,now,candidate,requestId,sharing,b){
 const sourceViews=new Set(source.geometry.views.map(x=>x.viewId));
 for(const old of source.geometry.views){
  const v=now.geometry.views.find(x=>x.viewId===old.viewId);requireData(v&&equal(t,without(old,['visible']),without(v,['visible']),b)&&(!candidate?old.visible===v.visible:true),'ACCEPTED_SOURCE_CHANGED','/ledger/geometry','Retain every accepted native identity/count/debt; only owned preview visibility may change.');
 }
 for(const v of now.geometry.views)if(!sourceViews.has(v.viewId)){
  requireData(candidate&&v.viewId===candidate.viewId&&v.ownerRequestId===requestId&&v.role==='candidate'&&v.geometryLeaseId===candidate.geometryLeaseId&&v.geometryEpoch===candidate.geometryEpoch&&v.bundleDigest===candidate.bundleDigest&&v.geometrySourceDigest===candidate.geometrySourceDigest&&v.roots===1,'OWNED_CANDIDATE_GEOMETRY','/ledger/geometry','Only one exact request-owned candidate is allowed.');
 }
 // Accepted/retiring source views are immutable through appearance preparation.
 // Their real resident mark copies survive even when hidden or zero alpha.
 for(const old of source.residency){
  const row=now.residency.find(x=>x.viewId===old.viewId&&x.ownerId===old.ownerId);
  requireData(row&&equal(t,row,old,b),'SOURCE_RESIDENCY_CHANGED','/ledger/residency','Retain every actual source-view mark record until that view has positively verified retirement.');
 }
 for(const row of now.residency)if(sourceViews.has(row.viewId))requireData(source.residency.some(x=>equal(t,x,row,b)),'SOURCE_RESIDENCY_CHANGED','/ledger/residency','Do not restamp or relabel residency on an unchanged accepted native view.');
 for(const old of source.allocations){
  const row=now.allocations.find(x=>allocationKey(x)===allocationKey(old));
  requireData(row&&equal(t,without(old,['referenceIds']),without(row,['referenceIds']),b)&&old.referenceIds.every(x=>row.referenceIds.includes(x)),'FOREIGN_ALLOCATION_TRANSITION','/ledger/allocations','Preserve every source physical allocation, epoch, charge and debt.');
  if(!equal(t,old.referenceIds,row.referenceIds,b))requireData(old.sampledAtlas&&sharing.some(a=>allocationKey(a)===allocationKey(old)&&equal(t,a.sourceReferenceIds,old.referenceIds,b)&&equal(t,a.admittedReferenceIds,row.referenceIds,b)),'SHARING_ATTESTATION','/ledger/allocations','Added sampled references require actual provider allocation/context/epoch attestation.');
 }
 for(const old of source.materials){
  const row=now.materials.find(x=>x.materialId===old.materialId);requireData(row&&equal(t,without(old,['referenceIds']),without(row,['referenceIds']),b)&&old.referenceIds.every(x=>row.referenceIds.includes(x)),'FOREIGN_MATERIAL_TRANSITION','/ledger/materials','Retain source and cache material identity/state/debt.');
 }
}
export function validatePreparedCapture(t,before,p,c,b){
 captureShape(t,'PreparedCapture',c,b);
 const s=p.sourceCapture,req=p.original.requestId;
 requireData(equal(t,c.profiles,s.profiles,b)&&equal(t,c.original,p.original,b)&&equal(t,c.authority,s.authority,b),'STALE_CONTEXT','/appearanceCapture','Original source authority, context and request stay unchanged.');
 requireData(c.planDigest===hash(t,p,b)&&c.sourceCaptureDigest===hash(t,s,b),'CAPTURE_DIGEST','/appearanceCapture','Capture binds this entire actual source capture and plan.');
 requireData(equal(t,c.sourceResourceRefs,s.sourceResourceRefs,b)&&equal(t,c.targetResourceRefs,p.targetDocument.resourceRefs,b)&&equal(t,c.resourceRequirements,p.resourceRequirements,b),'RESOURCE_REQUIREMENTS','/appearanceCapture','Source/target requirements remain distinct and exact.');
 requireData(c.sourceResourceLeaseSetDigest===s.resourceLeaseSetDigest&&equal(t,c.sourceGeometry,s.ledger.geometry,b)&&equal(t,c.appearance.sourceVisual,s.visual,b),'SOURCE_CAPTURE_BINDING','/appearanceCapture','Retain exact source leases, geometry and visual/error/debt.');
 requireData(c.unresolvedAllocationIds.length===0,'ACCOUNTING_UNBOUND','/appearanceCapture','Unknown physical quantities need safe reserved bounds; unresolved identities block admission.');
 const candidate=c.candidateBaseView,overlay=p.preparationNeed==='prepare-overlay';
 if(overlay){
  requireData(candidate&&candidate.ownerRequestId===req&&candidate.retirementOwnerRequestId===req&&candidate.projectionProfile==='public-canonical-flat-tile-art-v1'&&candidate.retirementProfile==='owned-candidate-base-retirement-v1'&&candidate.bundleDigest===hash(t,p.targetDocument.tileBundle,b)&&candidate.geometrySourceDigest===p.fingerprints.target.geometry&&candidate.roots===1&&candidate.identityBasis==='actual-native'&&candidate.state==='live','OWNED_CANDIDATE_GEOMETRY','/appearanceCapture/candidateBaseView','Use the actual owned unchanged public art projection, fully charged as a second view.');
  const oldIds=new Set(s.ledger.geometry.views.flatMap(v=>v.geometryAllocationIds));
  requireData(candidate.geometryAllocationIds.every(id=>!oldIds.has(id))&&!s.ledger.geometry.views.some(v=>v.viewId===candidate.viewId||v.geometryLeaseId===candidate.geometryLeaseId),'OWNED_CANDIDATE_GEOMETRY','/appearanceCapture','No inferred shared geometry or reuse of an accepted native lease.');
  requireData(c.appearance.mode==='prepared-overlay'&&c.appearance.candidateDigest!==null,'APPEARANCE_PREPARATION','/appearanceCapture/appearance','Actual appearance preparation is required.');
 }else requireData(candidate===null&&equal(t,c.admittedGeometry,c.sourceGeometry,b)&&c.appearance.mode==='retain-existing'&&c.appearance.candidateDigest===null&&p.resourceRequirements.decodeNeeds.length===0,'UNUSED_IMPORT_PREPARATION','/appearanceCapture','Encoded-only import preserves actual source view/error/debt and decodes nothing.');
 requireData(c.appearance.presentedRequirementsDigest===hash(t,p.resourceRequirements,b),'APPEARANCE_REQUIREMENTS','/appearanceCapture/appearance','Receipt binds the complete presented requirements.');
 const encoded=p.resourceRequirements.encodedNeeds,decoded=p.resourceRequirements.decodeNeeds;
 requireData(equal(t,c.encodedAvailability.map(x=>x.blobSha256),encoded.map(x=>x.blob.sha256),b),'ENCODED_RESOURCE_UNBOUND','/appearanceCapture','Every complete target page requires verified encoded availability, even unused imports.');
 for(let i=0;i<encoded.length;i++)requireData(c.encodedAvailability[i].blobDescriptorDigest===hash(t,encoded[i].blob,b),'ENCODED_RESOURCE_UNBOUND','/appearanceCapture','Encoded verification binds full blob descriptor.');
 requireData(equal(t,c.decodedObservations.map(x=>x.blobSha256),decoded.map(x=>x.blobSha256),b),'DECODE_NEEDS','/appearanceCapture','Only actual required decode observations belong here.');
 requireData(c.ledgerTrace.length>0&&c.ledgerTrace.at(-1).action==='admit','PREPARATION_REQUIRED','/appearanceCapture','Actual owned admission is the final trace step.');
 const blobs=knownArtworkBlobs(t,[before,p.targetDocument],b),tracker=lifetimeTracker(s.ledger);
 let previous=s.ledger;const peak={...previous.totals},events=new Set();
 for(const step of c.ledgerTrace){
  requireData(!events.has(step.eventId)&&step.ownerRequestId===req&&step.ledger.sequence===previous.sequence+1&&step.ledger.scopeDigest===s.ledger.scopeDigest&&step.ledger.preservedObjectsDigest===s.ledger.preservedObjectsDigest,'FOREIGN_ALLOCATION_TRANSITION','/appearanceCapture/ledgerTrace','Own each exact monotonic event; foreign epochs, reentry and same-count ABA refuse.');events.add(step.eventId);
  validateLedger(t,step.ledger,b);validateArtworkAllocations(step.ledger,blobs,b);validateLifetimes(t,previous,step,b,tracker);preserveSource(t,s.ledger,step.ledger,candidate,req,c.sampledSharing,b);
  for(const a of step.ledger.allocations)if(!s.ledger.allocations.some(x=>allocationKey(x)===allocationKey(a)))requireData(a.ownerRequestId===req&&a.charge!=='baseline-visible','FOREIGN_ALLOCATION_TRANSITION','/ledgerTrace','New physical allocations belong to this request and consume additional charges.');
  for(const m of step.ledger.materials)if(!s.ledger.materials.some(x=>x.materialId===m.materialId))requireData(m.ownerRequestId===req,'FOREIGN_MATERIAL_TRANSITION','/ledgerTrace','New material/cache rows belong to the actual request.');
  for(const k of Object.keys(peak))peak[k]=Math.max(peak[k],step.ledger.totals[k]);
  previous=step.ledger;
 }
 requireData(equal(t,c.peakTotals,peak,b)&&equal(t,c.admittedGeometry,previous.geometry,b),'CAPTURE_PEAK_BINDING','/appearanceCapture','Check transient physical peaks and the actual admitted native set.');
 if(candidate)for(const old of s.ledger.allocations.filter(a=>live(a)&&a.purpose==='base-image'&&a.sampledAtlas)){
  const fresh=previous.allocations.some(a=>live(a)&&a.ownerRequestId===req&&a.purpose==='base-image'&&a.sampledAtlas&&a.charge==='decoded-additional'&&a.blobSha256===old.blobSha256&&a.chargedBytes>=old.chargedBytes);
  const shared=c.sampledSharing.some(a=>allocationKey(a)===allocationKey(old)&&a.sourceReferenceIds.every(id=>a.admittedReferenceIds.includes(id))&&a.admittedReferenceIds.some(id=>!a.sourceReferenceIds.includes(id))&&previous.allocations.some(x=>allocationKey(x)===allocationKey(old)&&equal(t,x.referenceIds,a.admittedReferenceIds,b)));
  requireData(fresh||shared,'BASE_IMAGE_ALLOCATION','/appearanceCapture','A second base image costs its actual complete allocation unless provider-native sharing is explicitly attested.');
 }
 if(candidate)for(const chunk of p.targetDocument.authoring.decorations.chunks)for(const m of chunk.marks)requireData(previous.residency.some(row=>row.viewId===candidate.viewId&&row.ownerId===m.target.ownerId&&row.markIds.includes(m.id)),'TARGET_RESIDENCY_UNBOUND','/appearanceCapture','Charge every target mark in the owned candidate, including hidden/zero-alpha marks.');
 if(candidate)requireData(previous.geometry.views.some(v=>equal(t,v,viewOnly(candidate),b)),'OWNED_CANDIDATE_GEOMETRY','/appearanceCapture','Final candidate row must be the actual native view.');
 for(const x of c.decodedObservations){
  const need=encoded.find(e=>e.blob.sha256===x.blobSha256);
  requireData(x.resourceContextEpoch===s.authority.resourceContextEpoch&&x.imageInterpretationDigest===hash(t,{blob:need.blob,decoderProfile:x.decoderProfile},b)&&x.allocationIds.length>0,'DECODE_OBSERVATION','/appearanceCapture','Bind actual full-page interpretation and current resource epoch.');
  for(const id of x.allocationIds)requireData(previous.allocations.some(a=>a.allocationId===id&&a.state==='live'&&a.blobSha256===x.blobSha256&&a.purpose==='artwork-image'&&a.chargedBytes>=need.blob.widthPx*need.blob.heightPx*4),'DECODE_ALLOCATION','/appearanceCapture','Actual decoded/texture physical copies remain charged.');
  requireData(x.allocationIds.some(id=>previous.allocations.some(a=>a.allocationId===id&&a.sampledAtlas&&a.storage==='gpu')),'DECODE_TEXTURE_REQUIRED','/appearanceCapture','Actual sampled image allocation is required; a pixel digest alone is insufficient.');
 }
 return previous;
}

export function validateRecoveryRetention(t,v,b){
 captureShape(t,'RecoveryRetention',v,b);validateLedger(t,v.retainedLedger,b);
 requireData(v.recoveryRequestId===v.original.requestId&&v.outcome==='unknown'&&v.committed===null&&v.writesFrozen,'RECOVERY_ID_MISMATCH','/retention','Unknown keeps the original same-ID recovery and writes frozen.');
 const all=[...v.sourceResourceRefs,...v.targetResourceRefs,...v.historyRedoPendingResourceRefs,...v.exportResourceRefs],set=new Map();
 for(const x of all){b.take();set.set(hash(t,x,b),x);}
 const union=[...set.values()].sort((a,z)=>a.artwork.id<z.artwork.id?-1:a.artwork.id>z.artwork.id?1:a.artwork.revision-z.artwork.revision);
 requireData(equal(t,union,v.requiredUnion,b)&&v.historyRedoPendingRefsDigest===hash(t,{historyRedoPending:v.historyRedoPendingResourceRefs,exports:v.exportResourceRefs},b),'RECOVERY_RESOURCE_UNION','/retention','Retain exact source/target/history/redo/pending/export union, including historical-only blobs.');
 if(v.candidateBaseView){
  requireData(v.candidateBaseView.ownerRequestId===v.original.requestId&&v.retainedGeometryLeaseIds.includes(v.candidateBaseView.geometryLeaseId)&&v.retainedLedger.geometry.views.some(x=>x.viewId===v.candidateBaseView.viewId&&live(x)),'RECOVERY_GEOMETRY_RETAINED','/retention','Unknown retains the actual candidate geometry lease and charges.');
 }
 for(const a of v.retainedLedger.allocations)if(a.state==='retiring-unverified')requireData(v.unverifiedAllocationIds.includes(a.allocationId),'RECOVERY_DEBT_LOSS','/retention','Every unverified physical copy stays charged.');
 return v;
}
export function validateCandidateRetirement(t,v,b){
 captureShape(t,'CandidateRetirementObservation',v,b);validateLedger(t,v.finalLedger,b);
 const c=v.candidateBaseView;
 requireData(c.ownerRequestId===v.original.requestId&&c.retirementOwnerRequestId===v.original.requestId,'OWNED_CANDIDATE_GEOMETRY','/retirement','Retire only this owned candidate.');
 requireData(v.failedAt==='final-pure-bind'?v.historyTicketState==='not-created':v.historyTicketState==='rejected','HISTORY_TICKET_SEQUENCE','/retirement','No ticket exists before final bind; reject the real ticket after final WAL validation fails.');
 for(const old of v.sourceGeometry.views)requireData(v.finalLedger.geometry.views.some(x=>equal(t,x,old,b)),'ACCEPTED_SOURCE_CHANGED','/retirement','Accepted source geometry/view identity is restored exactly.');
 const row=v.finalLedger.geometry.views.find(x=>x.viewId===c.viewId);
 requireData(row,'CANDIDATE_RETIREMENT','/retirement','Retirement observation identifies the actual retained row.');
 if(v.outcome==='verified'){
  requireData(v.retirementReceiptDigest!==null&&row.state==='retired-verified'&&row.retirementReceiptDigest===v.retirementReceiptDigest,'RETIREMENT_UNVERIFIED','/retirement','Positive owned retirement is needed to release charges.');
  for(const id of c.geometryAllocationIds)requireData(v.finalLedger.allocations.some(a=>a.allocationId===id&&a.state==='retired-verified'&&a.retirementReceiptDigest===v.retirementReceiptDigest),'RETIREMENT_UNVERIFIED','/retirement','Every candidate geometry buffer needs the positive retirement receipt.');
 }else requireData(v.retirementReceiptDigest===null&&row.state==='retiring-unverified'&&v.finalLedger.totals.rootsAllViews===v.sourceGeometry.rootsAllViews+c.roots,'RETIREMENT_UNVERIFIED','/retirement','Unverified retirement retains the full second view and native geometry charges.');
 requireData(v.restoredAcceptedViewIdentityDigest!==null&&v.retainedSourceDebtDigest!==null,'VISUAL_SOURCE_BINDING','/retirement','Retain accepted visual identity and preexisting debt.');
 return v;
}
