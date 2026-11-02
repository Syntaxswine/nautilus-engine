// Borrow the reviewed native provider/pool; no second renderer or allocation
// manager. Its real inspection capability remains owned by that presenter.
import {createTileStackPresentation,nativeInspectionPort} from '../tile-stack/presentation.js';
import {smartTileData,smartTileDigest,fail} from '../smart-tile/checkpoint.js';

export function createTileAuthoringPresentation(ports){return createTileStackPresentation(ports);}
export const tileAuthoringInspectionPort=nativeInspectionPort;

// Read the actual manager's charged roots/geometry/cells, including acquiring
// and unverified retiring records, and the existing native finish-pool debt.
// This port owns no allocations and never deletes artwork or history resources.
export function createTileAuthoringResourcePorts({presentation,atlasLease,baseLease,readSessionResources,availableProfiles,artworkPort=null}){
  const inspection=nativeInspectionPort(presentation);
  if(!inspection||typeof readSessionResources!=='function'||!Array.isArray(availableProfiles))fail('NATIVE_AUTHORING_RESOURCES','/resources','Borrow the actual native presenter, manager ledger and explicit supported profiles.');
  const atlasProof=smartTileData(atlasLease.proof),baseIdentity=baseLease.value.uuid;
  const presentationProfileDigest=smartTileDigest({provider:'public-canonical-flat-tile-art-v1',finishes:'public-native-tile-finishes-v1',atlasProof,baseIdentity,availableProfiles});
  function dependencies(){return {live:inspection.isLive(),atlas:atlasLease.diagnostics(),base:baseLease.diagnostics(),atlasProof,baseIdentity};}
  function missingBindings(document){
    const missing=[];const live=dependencies();if(!live.live||live.atlas.released||live.base.released)missing.push('NATIVE_PRESENTATION_LEASE_REQUIRED');
    if(document.authoring.decorations.chunks.some(c=>c.marks.length)||document.authoring.decorations.surfaces.some(s=>s.layers.length))missing.push('C1_OVERLAY_PRESENTATION_UNBOUND');
    if(document.resourceRefs.length&&!artworkPort)missing.push('ARTWORK_RESOURCE_LEASE_REQUIRED');return missing;
  }
  function read(){
    const native=presentation.snapshot(),views=smartTileData(readSessionResources());
    const allocations={declaredDecodedAllocationBytes:0,residentMarksAllViews:0,rootsAllViews:views.roots,trianglesAllViews:views.triangles,cellsAllViews:views.cells,ownedAppearanceMaterialsAllViews:native.pool.ownedMaterials,contributorsPerBin:0,binReferencesAllViews:0,derivedBufferBytesAllViews:0,atlasPagesAllViews:0};
    const caps={declaredDecodedAllocationBytes:33554432,residentMarksAllViews:1024,rootsAllViews:2,trianglesAllViews:50000,cellsAllViews:1024,ownedAppearanceMaterialsAllViews:64,contributorsPerBin:8,binReferencesAllViews:32768,derivedBufferBytesAllViews:4194304,atlasPagesAllViews:4};
    for(const [key,value]of Object.entries(allocations))if(!Number.isSafeInteger(value)||value<0||value>caps[key])fail('BUDGET_EXHAUSTED','/allocations/'+key,'Actual aggregate charges exceed the shared bound.');
    if(native.views.length!==views.roots)fail('ALLOCATION_LEDGER_MISMATCH','/allocations','Every native root must belong to the retained manager ledger.');
    return {allocations,allocationLedgerDigest:smartTileDigest({views,pool:native.pool,retirementErrors:native.resources.retirementErrors})};
  }
  return Object.freeze({presentationProfileDigest,contextToken:()=>smartTileDigest(dependencies()),missingBindings,
    capture(document){
      const missing=missingBindings(document);if(missing.length)fail(missing[0],'/resources','Required presentation/resource bindings are unavailable; preserve the complete document.');
      const artwork=artworkPort?.capture(document.resourceRefs)??{bindings:[],leaseSetDigest:smartTileDigest([]),isCurrent:()=>true};
      if(smartTileDigest(artwork.bindings)!==smartTileDigest(document.resourceRefs))fail('UNBOUND_RESOURCE_SET','/resources','Retain verified exact bindings for every durable resource reference.');
      const captured=read(),sourceDependencies=smartTileDigest(dependencies()),resourceLeaseSetDigest=smartTileDigest({dependencies:sourceDependencies,artwork:artwork.leaseSetDigest});
      return Object.freeze({data:{presentationProfileDigest,resourceLeaseSetDigest,...captured,availableProfiles:smartTileData(availableProfiles),resourceBindings:smartTileData(artwork.bindings)},
        isCurrent({sourceUnchanged=false}={}){try{if(smartTileDigest(dependencies())!==sourceDependencies||!artwork.isCurrent())return false;const now=read();return !sourceUnchanged||now.allocationLedgerDigest===captured.allocationLedgerDigest;}catch{return false;}}});
    }});
}
