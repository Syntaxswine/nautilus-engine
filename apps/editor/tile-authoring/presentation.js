// Borrow the reviewed native provider/pool; no second renderer or allocation
// manager. Its real inspection capability remains owned by that presenter.
import {createTileStackPresentation,nativeInspectionPort} from '../tile-stack/presentation.js';
import {smartTileData,smartTileDigest,fail} from '../smart-tile/checkpoint.js';

const nativeOwners=new WeakMap();
function materialsOf(view){const materials=new Set();view.root.traverse(node=>{if(node.material)for(const material of Array.isArray(node.material)?node.material:[node.material])materials.add(material);});return materials;}
export function createTileAuthoringPresentation(ports){
  const native=createTileStackPresentation(ports),state={native,views:new Map(),materials:new Map(),ordinal:0};
  const api=Object.freeze({...native,async acquire(bundle,budget){
    const sourceBundleDigest=smartTileDigest(bundle),view=await native.acquire(bundle,budget);
    for(const material of materialsOf(view))if(!state.materials.has(material))state.materials.set(material,state.materials.size+1);
    state.views.set(view,{identity:++state.ordinal,sourceBundleDigest});return view;
  }});nativeOwners.set(api,state);return api;
}
export const tileAuthoringInspectionPort=presentation=>nativeInspectionPort(nativeOwners.get(presentation)?.native??presentation);

// Read the actual manager's charged roots/geometry/cells, including acquiring
// and unverified retiring records, and the existing native finish-pool debt.
// This port owns no allocations and never deletes artwork or history resources.
export function createTileAuthoringResourcePorts({presentation,atlasLease,baseLease,readSessionResources,availableProfiles,artworkPort=null}){
  const owner=nativeOwners.get(presentation),inspection=tileAuthoringInspectionPort(presentation);
  if(!owner||!inspection||typeof readSessionResources!=='function'||!Array.isArray(availableProfiles))fail('NATIVE_AUTHORING_RESOURCES','/resources','Borrow the actual tracked native presenter, manager ledger and explicit supported profiles.');
  const atlasProof=smartTileData(atlasLease.proof),atlasValue=atlasLease.value,baseValue=baseLease.value,baseIdentity=baseValue.uuid,profiles=Object.freeze(smartTileData(availableProfiles));
  const presentationProfileDigest=smartTileDigest({provider:'public-canonical-flat-tile-art-v1',finishes:'public-native-tile-finishes-v1',atlasProof,baseIdentity,availableProfiles:profiles});
  function dependencies(){return {live:inspection.isLive(),atlas:atlasLease.diagnostics(),base:baseLease.diagnostics(),atlasIdentityMatches:atlasLease.value===atlasValue,baseIdentityMatches:baseLease.value===baseValue,atlasProof:smartTileData(atlasLease.proof),baseIdentity,baseVersion:baseValue.version,baseAppearance:{type:baseValue.type,color:[baseValue.color.r,baseValue.color.g,baseValue.color.b],roughness:baseValue.roughness,metalness:baseValue.metalness,opacity:baseValue.opacity,transparent:baseValue.transparent,side:baseValue.side},atlasAppearance:{uuid:atlasValue.uuid,version:atlasValue.version,colorSpace:atlasValue.colorSpace,width:atlasValue.image?.width??null,height:atlasValue.image?.height??null,src:atlasValue.image?.currentSrc??atlasValue.image?.src??null}};}
  function missingBindings(document){
    const missing=[];const live=dependencies();if(!live.live||live.atlas.released||live.base.released||!live.atlasIdentityMatches||!live.baseIdentityMatches||smartTileDigest(live.atlasProof)!==smartTileDigest(atlasProof))missing.push('NATIVE_PRESENTATION_LEASE_REQUIRED');
    if(document.authoring.decorations.chunks.some(c=>c.marks.length)||document.authoring.decorations.surfaces.some(s=>s.layers.length))missing.push('C1_OVERLAY_PRESENTATION_UNBOUND');
    if(document.resourceRefs.length&&!artworkPort)missing.push('ARTWORK_RESOURCE_LEASE_REQUIRED');return missing;
  }
  function read(){
    const native=presentation.snapshot(),views=smartTileData(readSessionResources());
    const allocations={declaredDecodedAllocationBytes:0,residentMarksAllViews:0,rootsAllViews:views.roots,trianglesAllViews:views.triangles,cellsAllViews:views.cells,ownedAppearanceMaterialsAllViews:native.pool.ownedMaterials,contributorsPerBin:0,binReferencesAllViews:0,derivedBufferBytesAllViews:0,atlasPagesAllViews:0};
    const caps={declaredDecodedAllocationBytes:33554432,residentMarksAllViews:1024,rootsAllViews:2,trianglesAllViews:50000,cellsAllViews:1024,ownedAppearanceMaterialsAllViews:64,contributorsPerBin:8,binReferencesAllViews:32768,derivedBufferBytesAllViews:4194304,atlasPagesAllViews:4};
    for(const [key,value]of Object.entries(allocations))if(!Number.isSafeInteger(value)||value<0||value>caps[key])fail('BUDGET_EXHAUSTED','/allocations/'+key,'Actual aggregate charges exceed the shared bound.');
    const objects=[];for(const [view,binding]of owner.views){const diagnostics=smartTileData(view.diagnostics());if(diagnostics.disposed===true&&diagnostics.ownedGeometry===0){owner.views.delete(view);continue;}objects.push({view,binding,data:{identity:binding.identity,sourceBundleDigest:binding.sourceBundleDigest,diagnostics,cellCount:view.cellCount,visible:view.root.visible,role:view.root.userData.smartTileRole,ownerVisibility:view.root.children.map(node=>({id:node.userData.instanceId,visible:node.visible})),materialIdentities:[...materialsOf(view)].map(material=>owner.materials.get(material)??-1).sort((a,b)=>a-b)}});}
    if(native.views.length!==views.roots||objects.length!==views.roots)fail('ALLOCATION_LEDGER_MISMATCH','/allocations','Every actual native root must belong to the retained manager ledger.');
    const data={views,pool:native.pool,retirementErrors:native.resources.retirementErrors,drawingFloorId:native.drawingFloorId,inspection:native.inspection,allocationEpoch:owner.ordinal,objects:objects.map(item=>item.data)};
    return {allocations,allocationLedgerDigest:smartTileDigest(data),data,objects};
  }
  return Object.freeze({presentationProfileDigest,contextToken:()=>smartTileDigest(dependencies()),missingBindings,
    capture(document){
      const missing=missingBindings(document);if(missing.length)fail(missing[0],'/resources','Required presentation/resource bindings are unavailable; preserve the complete document.');
      const artwork=artworkPort?.capture(document.resourceRefs)??{bindings:[],leaseSetDigest:smartTileDigest([]),isCurrent:()=>true};
      if(artworkPort)fail('C1_ARTWORK_LEDGER_UNBOUND','/resources','C1 has no reviewed decoder/allocation transition adapter; retain artwork references without claiming zero decoded allocations.');
      if(smartTileDigest(artwork.bindings)!==smartTileDigest(document.resourceRefs))fail('UNBOUND_RESOURCE_SET','/resources','Retain verified exact bindings for every durable resource reference.');
      const captured=read(),sourceDependencies=smartTileDigest(dependencies()),resourceLeaseSetDigest=smartTileDigest({dependencies:sourceDependencies,artwork:artwork.leaseSetDigest}),sourceMaterials=new Set(owner.materials.keys());let admitted=null;
      return Object.freeze({data:{presentationProfileDigest,resourceLeaseSetDigest,allocations:captured.allocations,allocationLedgerDigest:captured.allocationLedgerDigest,availableProfiles:smartTileData(profiles),resourceBindings:smartTileData(artwork.bindings)},
        admit({record,acceptedView,targetBundle}){
          if(admitted||record?.state!=='candidate'||!record.view||!owner.views.has(record.view)||owner.views.get(record.view).sourceBundleDigest!==smartTileDigest(targetBundle))fail('OWNED_ALLOCATION_REQUIRED','/allocations','Admit only this retained acquisition and exact target bundle once.');
          if(smartTileDigest(dependencies())!==sourceDependencies||!artwork.isCurrent())fail('STALE_RESOURCE_LEASE','/resources','The resource owner changed during acquisition.');
          const now=read(),candidate=now.objects.find(item=>item.view===record.view),others=now.objects.filter(item=>item.view!==record.view);
          if(!candidate||candidate.data.role!=='candidate'||others.length!==captured.objects.length||now.data.allocationEpoch!==captured.data.allocationEpoch+1)fail('FOREIGN_ALLOCATION_TRANSITION','/allocations','Only the owned candidate may join the captured ledger; foreign allocation/release ABA also refuses.');
          for(const before of captured.objects){const after=others.find(item=>item.view===before.view),expected={...before.data,visible:before.view===acceptedView?false:before.data.visible};if(!after||smartTileDigest(after.data)!==smartTileDigest(expected))fail('FOREIGN_ALLOCATION_TRANSITION','/allocations','An existing view identity, source, allocation or visibility changed.');}
          const manager={...captured.data.views,roots:captured.data.views.roots+1,candidate:captured.data.views.candidate+1,triangles:captured.data.views.triangles+record.triangles,cells:captured.data.views.cells+record.cells};
          if(smartTileDigest(manager)!==smartTileDigest(now.data.views))fail('FOREIGN_ALLOCATION_TRANSITION','/allocations','The manager transition must equal only this candidate\'s actual charged allocation.');
          const freshMaterials=[...materialsOf(record.view)].filter(material=>material!==baseLease.value&&!sourceMaterials.has(material)),pool={...captured.data.pool,ownedMaterials:captured.data.pool.ownedMaterials+freshMaterials.length,leases:captured.data.pool.leases+record.view.projection.entries.length};
          if(smartTileDigest(pool)!==smartTileDigest(now.data.pool)||smartTileDigest(captured.data.retirementErrors)!==smartTileDigest(now.data.retirementErrors)||captured.data.drawingFloorId!==now.data.drawingFloorId||smartTileDigest(captured.data.inspection)!==smartTileDigest(now.data.inspection))fail('FOREIGN_ALLOCATION_TRANSITION','/allocations','Only this candidate\'s actual pool leases/materials may change.');
          admitted=now;
        },
        isCurrent({sourceUnchanged=false}={}){try{if(smartTileDigest(dependencies())!==sourceDependencies||!artwork.isCurrent())return false;const now=read(),expected=sourceUnchanged?captured:admitted??captured;return now.allocationLedgerDigest===expected.allocationLedgerDigest&&now.objects.every((item,i)=>item.view===expected.objects[i]?.view);}catch{return false;}}});
    }});
}
