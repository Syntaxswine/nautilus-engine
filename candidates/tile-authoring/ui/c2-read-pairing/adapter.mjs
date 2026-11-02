// Private presentation/read adapter. One existing bridge, real d8 owner and
// borrowed workbench. No service verb, coordinator, authoring attempt or executor.
import {createPairingBridgeOwner} from './bridge-owner.mjs';
import {createBuiltinByteOwner} from '../c2-host-bridge/vendor/bytesd8/root/candidates/tile-authoring/host/builtin-dependency-prefix/index.mjs';
import {importTileContentPack} from '../c2-host-bridge/vendor/core0597/root/candidates/tile-authoring/core/c2/portable.js';
import {failure,finiteUIData,sameData,validateUIShape} from '../c2-host-bridge/vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/contract.js';
import * as tiles from '../../../../packages/tiles-core/index.js';
import * as metadata from '../../../../packages/assets/index.js';
import {formInputOwner as producedFormInputOwner} from './form-producer.mjs';
const own=(o,k)=>Object.getOwnPropertyDescriptor(o??{},k)?.value;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const issue=(code,message)=>{throw failure(code,message);};
const diagnostic=error=>({code:error.code??'C2_PAIR_REFUSED',path:'/overlay',message:error.message??'Pairing refused.',action:'Preserve original source/resources and explicitly acquire for the actual current read.',ownerIds:[]});
function statusMessage(p,paired,pairError){
 if(['unknown','preparing'].includes(p.current.state))return p.current.message;
 if(p.current.state==='committed')return 'Command committed. Presentation: '+p.current.presentation+'.';
 if(p.current.state==='refused')return 'Command refused. Check the reported diagnostics.';
 if(!p.selection&&p.gates.selection.enabled)return 'Select an authored surface.';
 if(p.availability!=='editable')return 'Editing is unavailable for this connection.';
 if(p.current.state==='review-ready')return 'Reviewed command is ready for the enabled actions.';
 if(p.current.state==='draft')return 'Command staged. Review it when enabled.';
 if(!p.chosenArtwork)return 'Select artwork for this surface.';
 if(pairError)return 'Selected artwork must be loaded again for the current selection.';
 return paired?'Selected artwork is ready for the enabled editing actions.':'Selected artwork is not loaded yet.';
}

export function createC2ReadPairingAdapter(workbench,{bridgePorts={},reader=null,byteLimits={}}={}){
 if(Object.hasOwn(bridgePorts,'selectedBytesBinding'))issue('C2_PAIR_BINDING_OWNED','The adapter binds only its actual acquired selected capability.');
 const inputOwner=Object.hasOwn(bridgePorts,'formInputOwner')?bridgePorts.formInputOwner:producedFormInputOwner,inputMethod=own(inputOwner,'touched');
 if(inputOwner&&typeof inputMethod!=='function')issue('C2_FORM_TOUCH_UNBOUND','Supply the actual own touched-field method.');
 let held=null,activeForm=null,lastRead=null,disposed=false,constructing=false,acquiring=false;
 const issued=new WeakMap(),stops=new Set();
 const selectedBytesBinding=Object.freeze({resolve(read,pin){return held&&read===held.original&&sameData(pin,held.artwork)?held.bytes:null;}});
 const formInputOwner=inputOwner?Object.freeze({touched(read,form){
  if(own(inputOwner,'touched')!==inputMethod)issue('C2_FORM_OWNER_CHANGED','The actual form owner changed.');
  return inputMethod.call(inputOwner,activeForm?.original===read?activeForm.current:read,form);
 }}):null;
 const owner=createPairingBridgeOwner(workbench,{...bridgePorts,formInputOwner,selectedBytesBinding});
 const leaseOwner=createBuiltinByteOwner({tiles,metadata,sourceOwner:owner.sourceOwner,reader,portable:{importTileContentPack},limits:byteLimits});
 owner.pairBuiltinOwner(leaseOwner);
 const connectionCurrent=()=>!disposed&&owner.isConnectionCurrent()&&(!inputOwner||own(inputOwner,'touched')===inputMethod);
 const requireConnection=()=>{if(!connectionCurrent())issue('C2_PAIR_CONNECTION_RETIRED','The same workbench, bridge, source and input owners must remain connected.');};
 function entry(read){requireConnection();const e=issued.get(read);if(!e||read.overlay.basis!==e.basis||read.snapshot!==e.raw.snapshot)issue('C2_PAIR_FOREIGN_READ','Use this adapter\'s actual issued read and exact Basis, never a copy or foreign read.');return e;}
 function refuse(read,error){const basis=issued.get(read)?.basis??lastRead?.overlay.basis;if(!basis)throw error;return freeze({status:'refused',basis,diagnostics:[diagnostic(error)]});}
 function checkHeld(currentRaw){
  requireConnection();if(!held)issue('C2_PAIR_ACQUISITION_UNBOUND','Explicitly acquire the selected original artwork for this owned read.');
  const h=held;
  return owner.withCurrentRead(currentRaw,h.original,original=>{
   if(owner.sourceOwner.resolve(original)!==h.scope||owner.sourceOwner.isCurrent(h.scope)!==true||!sameData(owner.sourceOwner.observe(h.scope),h.observation))issue('C2_PAIR_SOURCE_CHANGED','The actual held source handle/generation/context changed.');
   if(leaseOwner.isByteScopeCurrent(h.bytes)!==true)issue('C2_PAIR_BYTES_STALE','The actual selected lease is no longer held/current.');
   const observed=leaseOwner.observeByteScope(h.bytes);
   if(observed.editingWorkCredit!==0||!sameData(observed.basis,h.basis)||!sameData(observed.artwork,h.artwork)||observed.sourceDigest!==h.basis.expected.hostDocumentDigest)issue('C2_PAIR_BYTES_SOURCE','The real capability must retain its original source and zero editing credit.');
   requireConnection();return h;
  });
 }
 function getSnapshot(){
  requireConnection();const raw=owner.getSnapshot();let p=raw.overlay,paired=false,pairError=false;
  if(held)try{
   const h=checkHeld(raw),copy=structuredClone(finiteUIData(p)),row=copy.palette.find(row=>sameData(row.artwork,h.artwork));
   if(!row||!sameData(copy.chosenArtwork,h.artwork))issue('C2_PAIR_SELECTION_CHANGED','Keep the exact selected Pin.');
   copy.basis=p.basis;
   const editable=copy.availability==='editable',add=editable&&!!inputOwner&&raw.presentation.actions['decoration.add']?.enabled===true;
   row.dependency.missingPort=null;row.dependency.state=h.route==='builtin-prefix'?'prefix-validated':'source-exact';row.availability=editable?'preparable':'unavailable';if(editable)row.reason=null;
   copy.gates['decoration.add']={enabled:add,reason:add?null:p.gates['decoration.add'].reason};
   const importing=add&&h.route==='builtin-prefix'&&raw.presentation.actions['content.import']?.enabled===true;
   copy.gates['content.import']={enabled:importing,reason:importing?null:p.gates['content.import'].reason};
   const first=add&&!!copy.selection&&!copy.selection.layers.length&&!copy.selection.marks.length&&copy.gates['surface.layers'].enabled&&(h.route==='retained-two-ops'||importing);
   copy.gates.firstMark={enabled:first,reason:first?null:p.gates.firstMark.reason};
   validateUIShape('Projection',copy);p=freeze(copy);paired=true;
  }catch(error){const copy=structuredClone(finiteUIData(p));copy.basis=p.basis;copy.current.diagnostics=[diagnostic(error)];p=freeze(copy);pairError=true;}
  const message=statusMessage(p,paired,pairError);
  if(p.message!==message||p.current.message!==message){const copy=structuredClone(finiteUIData(p));copy.basis=p.basis;copy.message=copy.current.message=message;p=freeze(copy);}
  const read=p===raw.overlay?raw:Object.freeze({...raw,overlay:p});issued.set(read,{raw,basis:raw.overlay.basis});lastRead=read;return read;
 }
 async function acquireSelected(read,options={}){
  let result=null,returned=false,entered=false;
  try{
   const e=entry(read);if(acquiring||constructing)issue('C2_PAIR_BUSY','Finish the current explicit acquisition or construction.');acquiring=true;entered=true;
   const selected=read.overlay.chosenArtwork,s=read.overlay.selection;
   if(!selected||read.overlay.gates.selection.enabled!==true||!s||!['bound','prospective'].includes(s.bindingState)||s.pose.locked||read.overlay.groupsPresent)issue('C2_PAIR_SELECTION_REQUIRED','Select a supported unlocked surface and exact artwork before acquiring.');
   const scope=owner.withCurrentRead(e.raw,e.raw,()=>owner.sourceOwner.resolve(e.raw));
   if(!scope)issue('C2_PAIR_SOURCE_UNBOUND','The existing source owner did not recognize this actual read.');
   const observation=owner.sourceOwner.observe(scope);
   result=await leaseOwner.acquireBuiltinBytes(e.raw,selected,options);
   if(result.status!=='verified')return result;
   requireConnection();
   owner.withCurrentRead(e.raw,e.raw,original=>{
    if(owner.sourceOwner.resolve(original)!==scope||!sameData(owner.sourceOwner.observe(scope),observation)||leaseOwner.isByteScopeCurrent(result.bytes)!==true)issue('C2_PAIR_SOURCE_CHANGED','Acquisition changed the original owned source.');
    const retained=original.snapshot.document.authoring.library.artwork.some(record=>sameData({id:record.id,revision:record.revision,contentDigest:record.contentDigest},selected));
    const verified=retained?leaseOwner.resolveRetainedBytes(original,selected):leaseOwner.constructBuiltinDependencyPrefix(original,selected);
    if(verified.status!==(retained?'verified':'validated')||verified.bytes!==result.bytes||!sameData(verified.basis,original.overlay.basis)||!sameData(verified.artwork,selected))issue('C2_PAIR_LOOKUP_UNBOUND','The actual d8 private read lookup must recognize the returned capability.');
    held={original,scope,observation,basis:original.overlay.basis,artwork:selected,bytes:result.bytes,route:retained?'retained-two-ops':'builtin-prefix'};
   });
   returned=true;return result;
  }catch(error){return refuse(read,error);}finally{
   // Only a newly acquired, never returned reference is unadopted here. Exposed
   // host-owned references are NEVER retired by source changes or disposal.
   if(result?.status==='verified'&&!returned)leaseOwner.release(result.bytes);
   if(entered)acquiring=false;
  }
 }
 function constructOverlayCommand(read,form){
  let entered=false;
  try{
   const e=entry(read);if(constructing||acquiring)issue('C2_PAIR_BUSY','Finish the current explicit acquisition or construction.');constructing=true;entered=true;
   const safe=validateUIShape('Form',form),needsBytes=['first-mark','decoration.add'].includes(safe.kind)||safe.kind==='decoration.update'&&safe.changes.some(change=>change.field==='artwork');
   const h=needsBytes?checkHeld(e.raw):null,original=h?.original??e.raw;
   const result=owner.withCurrentRead(e.raw,original,()=>{
    activeForm={original,current:read};try{return owner.overlayPorts.constructOverlayCommand(original,form);}finally{activeForm=null;}
   });
   return freeze({...result,basis:e.basis});
  }catch(error){return refuse(read,error);}finally{if(entered)constructing=false;}
 }
 function selectExisting(read,choice){try{const e=entry(read);return owner.overlayPorts.selectExisting(e.raw,choice);}catch(error){return refuse(read,error);}}
 const overlayPorts=Object.freeze({selectExisting,constructOverlayCommand,
  acceptCanvasSelection(read,hit){try{return owner.overlayPorts.acceptCanvasSelection(entry(read).raw,hit);}catch(error){return refuse(read,error);}},
  resolveVerifiedThumbnail(read,pin){try{return owner.overlayPorts.resolveVerifiedThumbnail(entry(read).raw,pin);}catch(error){return{status:'unavailable',diagnostics:[diagnostic(error)]};}}
 });
 function subscribe(fn){requireConnection();if(typeof fn!=='function')issue('C2_OBSERVER_REQUIRED','Supply a view observer.');const stop=owner.subscribe(()=>fn(getSnapshot()));const dispose=()=>{stop();stops.delete(dispose);};stops.add(dispose);return dispose;}
 const binding=Object.freeze({service:own(workbench,'service'),getSnapshot,subscribe,collectCommand:own(workbench,'collectCommand'),discardDraft:own(workbench,'discardDraft'),allocateIds:own(workbench,'allocateIds'),history:own(workbench,'history'),borrowedFloorController:own(workbench,'borrowedFloorController'),borrowedInputOwner:own(workbench,'borrowedInputOwner'),borrowedResourcePorts:own(workbench,'borrowedResourcePorts'),overlayPorts});
 return Object.freeze({binding,getSnapshot,overlayPorts,acquireSelected,leaseOwner,isConnectionCurrent:connectionCurrent,
  cancelPendingPreparation(read){try{return owner.cancelPendingPreparation(entry(read).raw);}catch(error){return{cancelled:false,code:error.code??'C2_CANCEL_REFUSED',message:error.message};}},
  dispose(){if(disposed)return;disposed=true;for(const stop of [...stops])stop();held=null;owner.dispose();}
 });
}
