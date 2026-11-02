// DTO UNIT FIXTURES ONLY. Native/decoder/storage ownership is deliberately not simulated
// as authority. Physical IDs, captures and carried provider work below are synthetic data.
import fs from 'node:fs';
import * as T from '../packages/tiles-core/index.js';
import * as M from '../packages/map-core/index.js';
import * as F from '../packages/tile-finishes/catalogue.js';
import * as A from '../packages/tile-authoring-core/index.js';
import {fixture,runWorkflow,expected} from '../tests/fixtures/tile-authoring/c1-workflow.mjs';
import {PROFILES,LIMITS} from '../candidates/tile-authoring/core/c2/contract.js';
export {T,M,F,A,expected};
export const cp=x=>structuredClone(x),token=v=>T.tileLayoutToken(typeof v==='string'?JSON.stringify(v):v);
export const pack=JSON.parse(fs.readFileSync(new URL('../candidates/tile-authoring/core/c2/fixtures/canonical-thirty-pack.json',import.meta.url),'utf8'));
const zero=()=>({declaredDecodedAllocationBytes:0,residentMarksAllViews:0,rootsAllViews:0,trianglesAllViews:0,cellsAllViews:0,ownedAppearanceMaterialsAllViews:0,contributorsPerBin:0,binReferencesAllViews:0,derivedBufferBytesAllViews:0,atlasPagesAllViews:0});
export function geometry(g){const live=g.views.filter(x=>x.state!=='retired-verified');return {...g,geometryLeaseSetDigest:token(live.map(x=>({viewId:x.viewId,geometryLeaseId:x.geometryLeaseId,geometryEpoch:x.geometryEpoch}))),geometryObjectsDigest:token(live.map(x=>({viewId:x.viewId,identityBasis:x.identityBasis,objects:x.geometryObjectsDigest}))),rootsAllViews:live.reduce((n,x)=>n+x.roots,0),trianglesAllViews:live.reduce((n,x)=>n+x.triangles,0),cellsAllViews:live.reduce((n,x)=>n+x.cells,0)};}
export function ledger(l){
 l.geometry=geometry(l.geometry);const a=l.allocations.filter(x=>x.state!=='retired-verified');
 l.totals={...zero(),declaredDecodedAllocationBytes:a.filter(x=>x.charge==='decoded-additional').reduce((n,x)=>n+x.chargedBytes,0),residentMarksAllViews:l.residency.reduce((n,x)=>n+x.markIds.length,0),rootsAllViews:l.geometry.rootsAllViews,trianglesAllViews:l.geometry.trianglesAllViews,cellsAllViews:l.geometry.cellsAllViews,ownedAppearanceMaterialsAllViews:l.materials.filter(x=>x.state!=='retired-verified').length,contributorsPerBin:l.bins.contributorsPerBin,binReferencesAllViews:l.bins.binReferencesAllViews,derivedBufferBytesAllViews:a.filter(x=>x.charge==='derived').reduce((n,x)=>n+x.chargedBytes,0),atlasPagesAllViews:a.filter(x=>x.sampledAtlas).length};
 return l;
}
export const allocation=(id,purpose,charge,bytes,request=null,extra={})=>({allocationId:id,contextId:'fixture.render',contextEpoch:1,purpose,storage:purpose==='encoded-blob'?'encoded-store':purpose==='decoder-scratch'?'cpu':'gpu',charge,chargedBytes:bytes,byteBasis:'exact',sampledAtlas:['base-image','artwork-image'].includes(purpose),blobSha256:null,state:'live',ownerRequestId:request,referenceIds:[id+'.ref'],retirementReceiptDigest:null,...extra});
export function captureSource(document,context,command,{action='edit',historyRequest=null,cells=480,triangles=930}={}){
 const original={action,requestId:command?.requestId??historyRequest.id,commandDigest:token(command),expected:command?.expected??expected(T,document,context),hostRequest:historyRequest??{id:command.requestId,kind:'nautilus-tile-authoring-source-unchanged',version:1}};
 const view={viewId:'fixture.accepted',role:'accepted',state:'live',identityBasis:'actual-native',ownerRequestId:null,geometryLeaseId:'fixture.accepted.lease',geometryEpoch:1,bundleDigest:token(document.tileBundle),geometrySourceDigest:token({sourceJSON:document.sourceJSON,floorBinding:document.floorBinding,tileBundle:document.tileBundle}),geometryObjectsDigest:token('DTO source native objects'),roots:1,triangles,cells,visible:true,geometryAllocationIds:['fixture.geometry'],materialIds:['fixture.material'],retirementReceiptDigest:null};
 const sourceLedger=ledger({sequence:0,scopeDigest:token('DTO actual owner scope'),preservedObjectsDigest:token('DTO source borrowed object identities'),geometry:{views:[view]},allocations:[allocation('fixture.geometry','geometry-buffer','geometry-governed',65536),allocation('fixture.base','base-image','baseline-visible',6291456)],materials:[{materialId:'fixture.material',state:'live',ownerRequestId:null,referenceIds:['fixture.accepted'],retirementReceiptDigest:null}],residency:[],bins:{contributorsPerBin:0,binReferencesAllViews:0}});
 const used=new Set(),byOwner=new Map();for(const chunk of document.authoring.decorations.chunks)for(const m of chunk.marks){used.add(token(m.graphic.artwork));if(!byOwner.has(m.target.ownerId))byOwner.set(m.target.ownerId,[]);byOwner.get(m.target.ownerId).push(m.id);}
 for(const [ownerId,markIds]of byOwner)sourceLedger.residency.push({viewId:view.viewId,ownerId,markIds});
 const sourceBlobs=new Set();for(const r of document.authoring.library.artwork){if(sourceBlobs.has(r.body.blob.sha256))continue;sourceBlobs.add(r.body.blob.sha256);sourceLedger.allocations.push(allocation('source.encoded.'+r.body.blob.sha256.slice(0,16),'encoded-blob','encoded',r.body.blob.byteLength,null,{blobSha256:r.body.blob.sha256}));}
 const decodedPages=new Set();for(const r of document.authoring.library.artwork)if(used.has(token({id:r.id,revision:r.revision,contentDigest:r.contentDigest}))&&!decodedPages.has(r.body.blob.sha256)){decodedPages.add(r.body.blob.sha256);sourceLedger.allocations.push(allocation('source.decoded.'+r.body.blob.sha256.slice(0,16),'artwork-image','decoded-additional',r.body.blob.widthPx*r.body.blob.heightPx*4,null,{blobSha256:r.body.blob.sha256}));}
 ledger(sourceLedger);
 context.allocations=cp(sourceLedger.totals);context.allocationLedgerDigest=token(sourceLedger);context.resourceBindings=cp(document.resourceRefs);context.resourceLeaseSetDigest=token('DTO exact source resource leases');
 // Only Expected depends on host/context tokens, not captured allocation observations.
 original.expected=command?.expected??expected(T,document,context);
 return {kind:'nautilus-tile-authoring-appearance-source-capture',version:1,profiles:cp(PROFILES),original,authority:{hostAuthorityToken:context.hostAuthorityToken,authorityContextToken:context.authorityContextToken,presentationProfileDigest:context.presentationProfileDigest,floorId:'F00',mode:'manual',floorEpoch:1,providerTokenDigest:token('DTO fixed provider'),resourceContextEpoch:1,geometryContextEpoch:1,rendererContextId:'fixture.render',rendererContextEpoch:1},sourceResourceRefs:cp(document.resourceRefs),resourceLeaseSetDigest:context.resourceLeaseSetDigest,ledger:sourceLedger,visual:{acceptedViewIdentityDigest:token('DTO source view identity'),presentationStateDigest:token('DTO source display failure retained'),retirementDebtDigest:token('DTO source debt retained')},history:{journalDigest:token('DTO actual source journal'),generation:3,stateDigest:token('DTO actual history state')}};
}
const base=runWorkflow(T,M,A,F).document;
export function stageFixture(operations=null,{limits={},document=null,requestId='request.c2-a'}={}){
 const f=fixture(T,M,A,F);f.document=cp(document??base);f.context.availableProfiles=[...new Set([...f.context.availableProfiles,...Object.values(PROFILES),...pack.requires])];
 const op=operations??[{kind:'content.import',body:{pack:cp(pack),conflict:'refuse-different-content'}}];
 const command=f.command(f.document,f.context,op,requestId),appearanceSource=captureSource(f.document,f.context,command);
 return {f,input:{document:f.document,command,context:f.context,appearanceSource,limits}};
}
export function paintOperations(f,{mask={kind:'all-surface'},count=1}={}){
 const owner=f.document.authoring.ownerPins[0],def=f.document.authoring.library.definitions.find(d=>d.id===owner.definition.id&&d.revision===owner.definition.revision),s=def.body.surfaces[0],data={ownerId:owner.ownerId,surfaceId:s.id,floorId:'F00',geometryDigest:s.geometryDigest,frameDigest:s.frameDigest,gridDigest:token(s.grid)};
 const target={ownerId:owner.ownerId,surfaceId:s.id,floorId:'F00',bindingDigest:token(data)},layer={id:'layer.c2',order:0,label:'Sparse paint',opacity:1,blendProfile:'source-over-linear-premultiplied-v1'};
 const marks=Array.from({length:count},(_,i)=>({id:'mark.c2.'+i,revision:1,target:cp(target),layerId:layer.id,ordinal:i,graphic:{artwork:cp(pack.manifest.artwork[0]&&{id:pack.manifest.artwork[0].id,revision:1,contentDigest:pack.manifest.artwork[0].contentDigest}),form:'stamp',transform:{positionM:[1+i*.1,1],sizeM:[1.6,1.6],rotationRad:.2,mirrorU:false,pivotUV:[.2,.8]},opacity:1,tintLinearRGB:[1,.8,.5],mask:cp(mask),wrap:'clamp'},groupId:null}));
 return [{kind:'content.import',body:{pack:cp(pack),conflict:'refuse-different-content'}},{kind:'surface.layers',body:{target,layers:[layer],removedLayerMarkIds:[]}},...marks.map(mark=>({kind:'decoration.add',body:{chunkId:'chunk.c2',mark}}))];
}
export function preparedCapture(p,{upper=p.limits.plannerUnits,preparationWork=64}={}){
 const req=p.original.requestId,s=p.sourceCapture,l=cp(s.ledger);l.sequence++;
 const encodedAvailability=[];
 for(const need of p.resourceRequirements.encodedNeeds){
  const suffix=need.blob.sha256.slice(0,16),id='encoded.'+suffix;
  l.allocations.push(allocation(id,'encoded-blob','encoded',need.blob.byteLength,req,{blobSha256:need.blob.sha256}));
  encodedAvailability.push({blobSha256:need.blob.sha256,blobDescriptorDigest:token(need.blob),verificationDigest:token(['DTO encoded byte verification',need.blob.sha256]),encodedLeaseId:id});
 }
 let candidateBaseView=null;const decodedObservations=[];
 if(p.preparationNeed==='prepare-overlay'){
  candidateBaseView={...cp(s.ledger.geometry.views[0]),viewId:'fixture.candidate',role:'candidate',ownerRequestId:req,geometryLeaseId:'fixture.candidate.lease',geometryObjectsDigest:token('DTO candidate native object identities'),geometryAllocationIds:['fixture.candidate.geometry'],materialIds:['fixture.candidate.material'],projectionProfile:'public-canonical-flat-tile-art-v1',projectionDigest:token('DTO complete unchanged public art projection'),retirementOwnerRequestId:req,retirementProfile:'owned-candidate-base-retirement-v1'};
  const {projectionProfile,projectionDigest,retirementOwnerRequestId,retirementProfile,...view}=candidateBaseView;l.geometry.views.push(view);
  l.allocations.push(allocation('fixture.candidate.geometry','geometry-buffer','geometry-governed',65536,req),allocation('fixture.candidate.base','base-image','decoded-additional',6291456,req));
  l.materials.push({materialId:'fixture.candidate.material',state:'live',ownerRequestId:req,referenceIds:['fixture.candidate'],retirementReceiptDigest:null});
  const byOwner=new Map();for(const chunk of p.targetDocument.authoring.decorations.chunks)for(const m of chunk.marks){if(!byOwner.has(m.target.ownerId))byOwner.set(m.target.ownerId,[]);byOwner.get(m.target.ownerId).push(m.id);}
  for(const [ownerId,markIds]of byOwner)l.residency.push({viewId:view.viewId,ownerId,markIds});
  l.bins={contributorsPerBin:Math.min(8,[...byOwner.values()].reduce((n,x)=>n+x.length,0)),binReferencesAllViews:[...byOwner.values()].reduce((n,x)=>n+x.length,0)};
  for(const need of p.resourceRequirements.decodeNeeds){
   const blob=p.resourceRequirements.encodedNeeds.find(x=>x.blob.sha256===need.blobSha256).blob,id='decoded.'+blob.sha256.slice(0,16);
   l.allocations.push(allocation(id,'artwork-image','decoded-additional',blob.widthPx*blob.heightPx*4,req,{blobSha256:blob.sha256}));
   decodedObservations.push({blobSha256:blob.sha256,decoderProfile:need.decoderProfile,verificationDigest:token(['DTO decode verification',blob.sha256]),imageInterpretationDigest:token({blob,decoderProfile:need.decoderProfile}),pixelDigest:token('DTO pixels '+blob.sha256),resourceContextEpoch:1,allocationIds:[id]});
  }
 }
 ledger(l);
 const limits={checkpointBytes:16000000,historyBytes:16000000,checkpointNodes:1000000,checkpointDepth:40,receipts:128,historyEntries:64,coreInputBytes:6000000,coreOutputBytes:4000000,coreNodes:200000,coreDepth:32,plannerUnits:1000000};
 const actualSource=p.costBounds.planning.unitsCharged,afterCapacity=actualSource+8,afterPreparation=afterCapacity+preparationWork;
 const capacityBound={kind:'nautilus-tile-authoring-capacity-bound',version:1,committable:false,original:cp(p.original),sourceCheckpointToken:p.original.expected.hostAuthorityToken,targetHostDocumentDigest:p.targetHostDocumentDigest,sourceJournalDigest:s.history.journalDigest,sourceHistoryGeneration:s.history.generation,sourceHistoryStateDigest:s.history.stateDigest,governingLimitsDigest:token({authoring:p.limits,host:limits}),limits,upperBounds:{walBytes:2000000,historyBytes:2000000,checkpointNodes:200000,checkpointDepth:40,historyEntries:10,receipts:10},work:{chargedBefore:actualSource,chargeThisPhase:8,chargedAfter:afterCapacity}};
 return {kind:'nautilus-tile-authoring-prepared-appearance-capture',version:1,profiles:cp(PROFILES),original:cp(p.original),planDigest:token(p),sourceCaptureDigest:token(s),authority:cp(s.authority),sourceResourceRefs:cp(p.resourceRequirements.sourceResourceRefs),targetResourceRefs:cp(p.resourceRequirements.targetResourceRefs),resourceRequirements:cp(p.resourceRequirements),sourceResourceLeaseSetDigest:s.resourceLeaseSetDigest,admittedResourceLeaseSetDigest:token('DTO actual admitted leases'),sourceGeometry:cp(s.ledger.geometry),admittedGeometry:cp(l.geometry),candidateBaseView,capacityBound,planningCarry:{sourceCharged:actualSource,afterCapacity,afterPreparation,finalBindUpperBound:upper},encodedAvailability,decodedObservations,appearance:{mode:candidateBaseView?'prepared-overlay':'retain-existing',receiptDigest:token('DTO actual appearance receipt'),presentedRequirementsDigest:token(p.resourceRequirements),sourceVisual:cp(s.visual),candidateDigest:candidateBaseView?token('DTO candidate appearance'):null},ledgerTrace:[{eventId:'fixture.admission',action:'admit',ownerRequestId:req,ledger:l}],peakTotals:cp(l.totals),sampledSharing:[],unresolvedAllocationIds:[],costBounds:{...cp(p.costBounds),...l.totals,planning:{...cp(p.costBounds.planning),unitsCharged:afterPreparation}}};
}
