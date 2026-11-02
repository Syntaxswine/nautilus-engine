// Component fixture: actual pure Core + actual C1 service/workbench, SYNTHETIC
// session/source ownership only. No native, editing attempt, Apply or WAL proof.
import * as T from '../../../../../packages/tiles-core/index.js';
import * as M from '../../../../../packages/map-core/index.js';
import * as A from '../../../../../packages/tile-authoring-core/index.js';
import * as F from '../../../../../packages/tile-finishes/catalogue.js';
import * as metadata from '../../../../../packages/assets/index.js';
import {fixture,runWorkflow,expected} from '../../../../../tests/fixtures/tile-authoring/c1-workflow.mjs';
import {createTileAuthoringHostService,createTileAuthoringWorkbenchBinding} from '../../../../../apps/editor/tile-authoring/host-service.js';
import {createC2HostBridge} from '../bridge.mjs';
import {inspectSurface} from '../query.mjs';
import {produceSelectedBuiltinPack} from '../vendor/bytesd8/root/candidates/tile-authoring/host/builtin-dependency-prefix/index.mjs';
import {stageOperations} from '../vendor/core0597/root/candidates/tile-authoring/core/c2/operations.js';
import {Budget} from '../vendor/core0597/root/candidates/tile-authoring/core/c2/data.js';
import {assembleOverlayCommandData} from '../data.mjs';
export {T,metadata,expected,inspectSurface,produceSelectedBuiltinPack,stageOperations,Budget};
export const pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest});
const initial=runWorkflow(T,M,A,F).document,context=fixture(T,M,A,F).context;
export const complete=()=>structuredClone(initial);
export const sourceExpected=d=>expected(T,d,context);
export const basis=d=>({documentId:d.id,contentRevision:d.contentRevision,expected:sourceExpected(d),floorId:'F00'});
export const selection=d=>({ownerId:'owner.one',surfaceId:'top',definition:d.authoring.ownerPins.find(x=>x.ownerId==='owner.one').definition});
export function ids(counts,suffix='fixture'){
 return{requestId:'request.'+suffix,opIds:Array.from({length:counts.operations},(_,i)=>'op.'+suffix+'.'+i),layerIds:Array.from({length:counts.layers},(_,i)=>'layer.'+suffix+'.'+i),markIds:Array.from({length:counts.marks},(_,i)=>'mark.'+suffix+'.'+i),chunkIds:Array.from({length:counts.chunks},(_,i)=>'chunk.'+suffix+'.'+i)};
}
export function formFor(artwork,dependency='builtin-import'){
 const {form,transform,opacity,tintLinearRGB,mask}=metadata.sharedArtworkDefaults(artwork);
 return{kind:'first-mark',artwork,dependency,layer:{label:'Artwork',opacity:1},graphic:{form,transform,opacity,tintLinearRGB,mask}};
}
export function painted(artwork=pin(metadata.listSharedArtwork()[0])){
 const d=complete(),target=inspectSurface(d,sourceExpected(d),selection(d)),prefix=produceSelectedBuiltinPack(T,{document:d,basis:basis(d),selected:artwork,metadata}),graphic=structuredClone(prefix.graphic);
 graphic.transform.rotationRad=.234567;graphic.transform.pivotUV=[.31,.72];
 const command=assembleOverlayCommandData({read:{snapshot:{expected:sourceExpected(d)},overlay:{selection:{marks:[]}}},form:formFor(artwork),target:target.target,graphic,layers:[{id:null,order:0,label:'Retained',opacity:.7,blendProfile:'source-over-linear-premultiplied-v1'}],prefix:[{kind:'content.import',body:{pack:prefix.pack,conflict:'refuse-different-content'}}]},ids({operations:3,layers:1,marks:1,chunks:1},'seed'));
 const next=stageOperations(T,d,command,context,new Budget());next.contentRevision++;return next;
}
export function harness({document=complete(),options={},idHook=null}={}){
 let current=document,phase='idle',draft=null,serial=0,scope=Object.freeze({}),generation=0,releaseReview=null,cancelCalls=0,allocationCalls=0;
 const listeners=new Set(),actualReads=new WeakMap(),touches=new WeakMap(),floor={state:{selectedId:'F00'}};
 const emit=()=>{for(const f of [...listeners])f();};
 const session={
  getSnapshot:()=>({phase,draft,reviewId:null,recoveryId:phase==='recovery-required'?draft?.requestId:null,actions:{setDraft:true,review:true,apply:false,cancel:phase!=='preparing',undo:false,redo:false,save:false,open:false,retryPresentation:false},readiness:{visual:{state:'unbound'}},resources:{fixtureOnly:true}}),
  getAuthoringSnapshot:()=>({document:current,expected:sourceExpected(current),missingBindings:[],hostProtocolVersion:1}),
  getAuthoringReview:()=>null,
  setDraft(command){draft=structuredClone(command);phase='draft';return{ok:true};},
  async review(){phase='preparing';emit();return await new Promise(resolve=>{releaseReview=()=>{phase='idle';resolve({ok:false,diagnostics:[]});emit();};});},
  apply(){throw Error('UNBOUND fixture Apply');},
  cancel(){cancelCalls++;phase='idle';draft=null;emit();return{ok:true};},
  recover(){throw Error('UNBOUND fixture recovery');},
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
 };
 const service=createTileAuthoringHostService({session,authoring:A,isAuthorized:()=>true,connectionId:'synthetic-component-connection'});
 const original=createTileAuthoringWorkbenchBinding({service,session,borrowedFloorController:floor,borrowedInputOwner:Object.freeze({fixture:true}),borrowedResourcePorts:Object.freeze({fixture:true}),allocateIds:()=>{throw Error('Use scoped fixture ID owner');}});
 const workbench={...original,getSnapshot(){const raw=original.getSnapshot();actualReads.set(raw,scope);return raw;}};
 const sourceOwner={capture(raw){if(actualReads.get(raw)!==scope)throw Error('Foreign fixture read');return{scope,read:raw,floorId:floor.state.selectedId,observation:null,phase,originalRequestId:draft?.requestId??null};},isCurrent(s,raw){return s===scope&&actualReads.get(raw)===scope&&raw.snapshot.document===current&&raw.snapshot.expected.hostDocumentDigest===sourceExpected(current).hostDocumentDigest;},observe(s){if(s!==scope)throw Error('Stale fixture source');return{sourceGeneration:generation,ownerLifetimeId:'synthetic-fixture-owner',contextId:'synthetic-fixture-context',contextEpoch:0,mutationEpoch:generation};}};
 // C1 detaches snapshot data, so use complete data equality rather than reference.
 sourceOwner.isCurrent=(s,raw)=>s===scope&&actualReads.get(raw)===scope&&JSON.stringify(raw.snapshot.document)===JSON.stringify(current)&&raw.snapshot.expected.hostDocumentDigest===sourceExpected(current).hostDocumentDigest;
 const idOwner={allocate(s,counts){if(s!==scope)throw Error('Foreign scoped allocator');allocationCalls++;const result=ids(counts,'allocated.'+(++serial));idHook?.(result,counts);return result;}};
 const formInputOwner={touched(read,form){return touches.get(form)??null;}};
 const bridge=createC2HostBridge(workbench,{sourceOwner,idOwner,formInputOwner,...options});
 return{bridge,workbench,service,session,sourceOwner,idOwner,formInputOwner,floor,touch:(f,fields=[])=>{touches.set(f,fields);return f;},get document(){return current;},get allocationCalls(){return allocationCalls;},get cancelCalls(){return cancelCalls;},get listenerCount(){return listeners.size;},
  setDocument(d,{notify=true}={}){current=d;scope=Object.freeze({});generation++;if(notify)emit();},
  setPhase(p,request='request.pending'){phase=p;if(['preparing','recovery-required'].includes(p))draft={kind:'nautilus-tile-authoring-command',version:1,requestId:request,expected:sourceExpected(current),operations:[],budgetProfile:'authoring-reference-proposal-v1'};emit();},
  emit,finishPending(){releaseReview?.();},
  select(choice){const r=bridge.getSnapshot(),result=bridge.overlayPorts.selectExisting(r,choice);if(result.status!=='selected')throw Error(JSON.stringify(result));return bridge.getSnapshot();},
  selectSurface(){return this.select({kind:'surface',ownerId:'owner.one',surfaceId:'top'});},
  selectMark(){this.selectSurface();return this.select({kind:'mark',markId:'mark.seed.0'});},
  dispose(){bridge.dispose();}
 };
}
