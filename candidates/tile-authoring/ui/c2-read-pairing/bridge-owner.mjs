// PRIVATE Host-side view/constructor connector. Borrows one existing workbench.
import {failure,finiteUIData,readC2UI,validateUIShape,sameData} from '../c2-host-bridge/vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/contract.js';
import {readTileAuthoringUIView} from '../../../../apps/editor/tile-authoring/ui/panel.js';
import {inspectSurface} from '../c2-host-bridge/query.mjs';
import {listSharedArtwork,sharedArtworkImage} from '../../../../packages/assets/index.js';
import {constructCommand} from '../c2-host-bridge/construct.mjs';
const own=(o,k)=>Object.getOwnPropertyDescriptor(o??{},k)?.value,clone=structuredClone;
const pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest});
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;};
const serviceNames=['describe','snapshot','query','prepare','apply','cancel','recover'];
const diagnostic=(code,message,ownerIds=[])=>({code,path:'/overlay',message,action:'Preserve the complete source; bind the named actual existing owner.',ownerIds});
const safeKey=base=>[base.snapshot,base.presentation,base.commandJSON??null,base.readiness??null,base.resources??null];
const sourceKey=base=>[base.snapshot.document,base.snapshot.expected];

export function createPairingBridgeOwner(workbench,options={}){
 const ports={sourceOwner:null,preparationBinding:null,formInputOwner:null,selectedBytesBinding:null,idOwner:null,preparationCancellation:null,input:null,thumbnail:null,...options};
 const service=own(workbench,'service'),baseMethods=['getSnapshot','subscribe','collectCommand','discardDraft','allocateIds'];
 const methods=baseMethods.map(k=>own(workbench,k)),services=serviceNames.map(k=>own(service,k));
 if(methods.some(f=>typeof f!=='function')||services.some(f=>typeof f!=='function'))throw failure('C2_WORKBENCH_REQUIRED','Borrow the SAME actual workbench/seven-method service and allocator.');
 const borrowed=['borrowedFloorController','borrowedInputOwner','borrowedResourcePorts','history'].map(k=>[k,own(workbench,k)]);
 const portMethods=new Map(),requiredPorts={sourceOwner:['capture','isCurrent','observe'],preparationBinding:['isBound'],formInputOwner:['touched'],selectedBytesBinding:['resolve'],idOwner:['allocate'],preparationCancellation:['owns','cancel'],input:['resolve'],thumbnail:['resolve']};
 for(const [name,names]of Object.entries(requiredPorts))if(ports[name]){const entries=names.map(k=>[k,own(ports[name],k)]);if(entries.some(([,f])=>typeof f!=='function'))throw failure('C2_PORT_REQUIRED','Supply explicit own synchronous methods for '+name+'.');portMethods.set(name,entries);}
 let byteOwner=null,byteMethods=[],issuedCount=0,disposed=false,broken=false,constructing=false,reading=false,version=0,selectionVersion=0,publishing=false,queued=false,stop=null;
 let choice=null,layerId=null,markId=null,chosenArtwork=null,lastRead=null;
 const reads=new WeakMap(),scopes=new WeakMap(),listeners=new Set();
 const connection=()=>!disposed&&!broken&&own(workbench,'service')===service&&baseMethods.every((k,i)=>own(workbench,k)===methods[i])&&serviceNames.every((k,i)=>own(service,k)===services[i])&&borrowed.every(([k,v])=>own(workbench,k)===v)&&[...portMethods].every(([name,entries])=>ports[name]&&entries.every(([k,f])=>own(ports[name],k)===f))&&byteMethods.every(([k,f])=>own(byteOwner,k)===f);
 const requireConnection=()=>{if(!connection()){broken=true;throw failure('C2_CONNECTION_RETIRED','The actual borrowed workbench/service/port connection changed.');}};
 const fresh=()=>{requireConnection();const raw=methods[0].call(workbench);requireConnection();return{raw,base:readTileAuthoringUIView(raw)};};
 function sameSource(entry){
  requireConnection();if(!entry.capture||!ports.sourceOwner)return false;
  const current=fresh(),result=ports.sourceOwner.isCurrent(entry.capture.scope,current.raw);requireConnection();
  const after=fresh();return result===true&&sameData(sourceKey(current.base),sourceKey(after.base))&&sameData(sourceKey(after.base),sourceKey(entry.base));
 }
 function guard(entry,stamp){
  requireConnection();if(version!==stamp||selectionVersion!==entry.selectionVersion||disposed||!entry.published)throw failure('C2_READ_STALE','The displayed source/selection changed, including a published A→B→A.');
  const current=fresh();if(version!==stamp||!sameData(safeKey(current.base),safeKey(entry.base))||!sameSource(entry))throw failure('C2_READ_STALE','Use the complete original read without refreshing Expected.');
  requireConnection();if(version!==stamp||selectionVersion!==entry.selectionVersion)throw failure('C2_READ_STALE','A callback invalidated the original source.');
 }
 function entryFor(read){const e=reads.get(read);if(!e||!e.published||read.overlay.basis!==e.basis||read.snapshot!==e.base.snapshot)throw failure('C2_FOREIGN_READ','A copied/foreign/stale Basis DTO is not this constructor\'s actual issued read.');if(version!==e.version||selectionVersion!==e.selectionVersion)throw failure('C2_READ_STALE','A published source/selection change invalidated this read, including ABA.');return e;}
 const issueRefusal=(read,error)=>{const e=reads.get(read),basis=e?.basis??lastRead?.overlay.basis;if(!basis)throw error;return freeze({status:'refused',basis,diagnostics:[diagnostic(error.code??'C2_BRIDGE_REFUSED',error.message??'The operation was refused.')]});};
 function sourceChoices(d){return d.authoring.ownerPins.flatMap((p,i)=>{const owner=d.tileBundle.layout.instances.find(o=>o.id===p.ownerId),def=d.authoring.library.definitions.find(r=>sameData(pin(r),p.definition));if(!owner||!def)throw failure('C2_SOURCE_MEMBERSHIP','Actual owners must retain exact complete definition Pins.');return def.body.surfaces.map(s=>({ownerId:owner.id,ownerLabel:'Copy '+(i+1),definition:p.definition,surfaceId:s.id,surfaceLabel:s.id==='top'?'Top surface':s.id,floorId:owner.floorBindings[s.floorSlot],floorLabel:d.floorBinding.floors.find(f=>f.id===owner.floorBindings[s.floorSlot])?.label??'',locked:owner.locked}));});}
 function inspectSelection(base,floorId,choices){
  if(!choice)return{selection:null,derived:null,choice:null};const c=choices.find(c=>c.ownerId===choice.ownerId&&c.surfaceId===choice.surfaceId);if(!c)return{selection:null,derived:null,choice:null};
  const d=base.snapshot.document,owner=d.tileBundle.layout.instances.find(o=>o.id===c.ownerId),def=d.authoring.library.definitions.find(r=>sameData(pin(r),c.definition)),frame=def.body.surfaces.find(s=>s.id===c.surfaceId),saved=d.authoring.decorations.surfaces.find(s=>s.ownerId===c.ownerId&&s.surfaceId===c.surfaceId);
  let derived=null,message='Inspect the selected exact source surface.',bindingState='refused';
  if(c.floorId!==floorId)return{selection:null,derived:null,choice:null};
  try{derived=inspectSurface(d,base.snapshot.expected,{ownerId:c.ownerId,surfaceId:c.surfaceId,definition:c.definition});bindingState=derived.state==='existing'?'bound':'prospective';message='Core0597 source/frame/grid inspected; this data grants no editing work or readiness.';}catch(e){message=e.message;}
  const marks=d.authoring.decorations.chunks.flatMap(c=>c.marks).filter(m=>m.target.ownerId===c.ownerId&&m.target.surfaceId===c.surfaceId),selected=marks.find(m=>m.id===markId)??null,layers=saved?.layers??[];
  return{derived,choice:c,selection:{ownerId:c.ownerId,surfaceId:c.surfaceId,floorId:c.floorId,bindingState,target:derived?.target??(saved?{ownerId:saved.ownerId,surfaceId:saved.surfaceId,floorId:saved.floorId,bindingDigest:saved.bindingDigest}:null),frame,grid:derived?.grid??(saved?{id:frame.grid.id,version:frame.grid.version,digest:saved.gridDigest}:null),pose:{originM:owner.origin,quarterTurns:owner.transform.quarterTurns,mirrorX:owner.transform.mirrorX,locked:owner.locked,definition:c.definition},selectedLayerId:layers.some(l=>l.id===layerId)?layerId:null,selectedMarkId:selected?.id??null,layers:layers.map(value=>({value,markIds:marks.filter(m=>m.layerId===value.id).map(m=>m.id),opacityStatus:value.opacity===0?'hidden-by-opacity':'opacity-enabled'})),marks:marks.map(m=>({id:m.id,revision:m.revision,layerId:m.layerId,ordinal:m.ordinal,artwork:m.graphic.artwork,groupId:m.groupId})),selectedMark:selected,groups:d.authoring.decorations.groups.map(g=>({id:g.id,floorId:g.floorId,memberMarkIds:g.memberMarkIds})),message}};
 }
 function palette(d){
  const originals=listSharedArtwork(),out=[];
  for(const record of d.authoring.library.artwork){let ref=d.resourceRefs.find(r=>sameData(r.artwork,pin(record)));if(!ref){try{ref=sharedArtworkImage(pin(record)).resourceRef;}catch{throw failure('C2_DESCRIPTOR_UNBOUND','A saved unknown artwork has no actual required descriptor. Preserve the complete source.');}}
   out.push({artwork:pin(record),label:record.body.label,resourceRef:ref,frameId:record.body.imageView.frame.id,origin:'workspace',dependency:{route:'retained-two-ops',state:d.resourceRefs.some(r=>sameData(r,ref))?'source-exact':'descriptor-missing',missingPort:'verifiedBuiltinByteOwner'},availability:'unavailable',thumbnail:'unavailable',reason:diagnostic('C2_LIVE_BINDINGS_UNBOUND','Actual byte/native/meter bindings are required; ResourceRefs are metadata.')});
  }
  for(const record of originals)if(!out.some(r=>sameData(r.artwork,pin(record))))out.push({artwork:pin(record),label:record.body.label,resourceRef:sharedArtworkImage(pin(record)).resourceRef,frameId:record.body.imageView.frame.id,origin:'builtin-offer',dependency:{route:'builtin-prefix',state:'producer-missing',missingPort:byteOwner?'verifiedBuiltinByteOwner':'constructBuiltinDependencyPrefix'},availability:'unavailable',thumbnail:'unavailable',reason:diagnostic('C2_SELECTED_BUILTIN_UNBOUND','Selection/discovery adopts nothing. Bind an actual selected byte capability and the same native/meter owners.')});
  return out;
 }
 function getSnapshot(){
  requireConnection();if(reading)throw failure('C2_READ_REENTRY','Finish the current finite source projection.');reading=true;const stamp=version,selectedStamp=selectionVersion;
  try{
   const {raw,base}=fresh(),d=base.snapshot.document;
   if(!d.authoring?.library||!d.authoring.decorations||!Array.isArray(d.resourceRefs)||!Array.isArray(d.tileBundle?.layout?.instances))throw failure('C2_COMPLETE_SOURCE_REQUIRED','Supply the complete current v3 source, not a partial metadata projection.');
   let capture=null;if(ports.sourceOwner){capture=ports.sourceOwner.capture(raw);requireConnection();if(capture?.read!==raw||!capture.scope||ports.sourceOwner.isCurrent(capture.scope,raw)!==true)throw failure('C2_SOURCE_OWNER_UNBOUND','The paired existing source owner did not recognize this actual complete workbench read.');}
   const floorId=capture?.floorId??workbench.borrowedFloorController?.state?.selectedId;if(!d.floorBinding.floors.some(f=>f.id===floorId))throw failure('C2_DRAWING_FLOOR_UNBOUND','Borrow the actual declared drawing-floor controller.');
   const choices=sourceChoices(d),selected=inspectSelection(base,floorId,choices),basis=freeze({documentId:d.id,contentRevision:d.contentRevision,expected:base.snapshot.expected,floorId});
   const reason=diagnostic('C2_LIVE_BINDINGS_UNBOUND','Actual source/byte/native/meter/constructor bindings remain UNBOUND.'),gates=Object.fromEntries(['selection','firstMark','content.import','surface.layers','decoration.add','decoration.update','decoration.remove','review','apply','cancel','recover'].map(k=>[k,{enabled:false,reason}]));
   const unknown=base.presentation.outcome?.outcome==='unknown'||capture?.phase==='recovery-required',state=unknown?'unknown':capture?.phase==='preparing'?'preparing':base.presentation.retainedApplyRequest?'review-ready':base.presentation.outcome?.outcome==='committed'?'committed':base.presentation.outcome?.outcome==='rejected'?'refused':base.presentation.command?'draft':'idle';
   const p={kind:'nautilus-c2-overlay-ui-projection-proposal',version:1,basis,observation:capture?.observation?finiteUIData(capture.observation):null,availability:'inspect-only',message:reason.message,choices,selection:selected.selection,palette:palette(d),chosenArtwork:chosenArtwork&&paletteContains(d,chosenArtwork)?chosenArtwork:null,groupsPresent:d.authoring.decorations.groups.length>0,current:{state,requestId:base.presentation.command?.requestId??base.presentation.outcome?.requestId??capture?.originalRequestId??null,recoveryRequestId:unknown?base.presentation.outcome?.recoveryRequestId??capture?.originalRequestId??null:null,presentation:base.presentation.outcome?.presentation??'not-reported',message:unknown?'Unknown acceptance: retain the original request/resources and reconcile through the existing service.':capture?.phase==='preparing'?'Existing session preparation is pending; cancellation needs its owned helper.':reason.message,diagnostics:[]},gates,deferred:{selectedDefaults:'unavailable',bytePacks:'unavailable',combinedPlacement:'unavailable'}};
   const read=Object.freeze({...base,overlay:p}),scope=Object.freeze({}),entry={read,base,capture,basis,scope,derived:selected.derived,choice:selected.choice,version:stamp,selectionVersion:selectedStamp,published:false};reads.set(read,entry);scopes.set(scope,entry);
   gates.selection={enabled:!unknown&&capture?.phase!=='preparing'&&capture?.phase!=='applying',reason:unknown?reason:null};
   // Only the actual SAME-session preparation binding may enable UI staging.
   // Inspection/work DTOs and selected encoded bytes grant no such binding.
   let preparationBound=false;if(capture&&ports.preparationBinding)preparationBound=ports.preparationBinding.isBound(capture.scope,service)===true;
   const common=!!capture&&preparationBound&&!!ports.idOwner&&!!selected.derived&&!p.groupsPresent&&!selected.selection?.pose.locked&&!unknown&&!['preparing','applying'].includes(capture.phase);
   let byteReady=false;const row=p.palette.find(r=>sameData(r.artwork,p.chosenArtwork));
   if(row&&byteOwner&&ports.selectedBytesBinding){const cap=ports.selectedBytesBinding.resolve(read,row.artwork);if(cap&&byteOwner.isByteScopeCurrent(cap)===true){const obs=byteOwner.observeByteScope(cap);if(sameData(obs.basis,basis)&&sameData(obs.artwork,row.artwork)&&obs.sourceDigest===base.snapshot.expected.hostDocumentDigest&&obs.editingWorkCredit===0){byteReady=true;row.availability=common?'preparable':'unavailable';row.dependency.missingPort=null;row.dependency.state=row.origin==='workspace'?'source-exact':'prefix-validated';row.reason=common?null:reason;}}}
   if(common){p.availability='editable';p.message='Actual paired owners enable only the named supported canonical operations.';for(const k of ['surface.layers','decoration.update','decoration.remove'])gates[k]={enabled:base.presentation.actions[k]?.enabled===true,reason:null};const add=byteReady&&!!ports.formInputOwner;for(const k of ['content.import','decoration.add'])gates[k]={enabled:add&&base.presentation.actions[k]?.enabled===true,reason:null};gates.firstMark={enabled:add&&!p.selection.layers.length&&!p.selection.marks.length&&gates['surface.layers'].enabled&&gates['decoration.add'].enabled&&(row.origin==='workspace'||gates['content.import'].enabled),reason:null};}
   const c2Command=base.presentation.command?.operations?.length>0&&base.presentation.command.operations.every(op=>['content.import','surface.layers','decoration.add','decoration.update','decoration.remove'].includes(op.kind));
   for(const k of ['review','apply','recover'])gates[k]={enabled:common&&!!c2Command&&!unknown&&k!=='recover'&&base.presentation.actions[k]?.enabled===true||unknown&&k==='recover'&&base.presentation.outcome?.outcome==='unknown'&&base.presentation.actions.recover?.enabled===true,reason:null};
   if(unknown)gates.cancel={enabled:false,reason:diagnostic('C2_UNKNOWN_RETAINED','Unknown acceptance retains resources and original ID; never run unadopted cleanup.')};
   else if(capture?.phase==='preparing')gates.cancel={enabled:!!ports.preparationCancellation&&!!capture.originalRequestId&&ports.preparationCancellation.owns(capture.scope,capture.originalRequestId,service)===true&&base.presentation.actions.cancel?.enabled===true,reason:diagnostic('C2_PREPARATION_CANCEL_UNBOUND','Pending prepare needs the SAME-session original-request cancellation helper; service.cancel/discardDraft are insufficient.')};
   else gates.cancel={enabled:!!capture&&!!c2Command&&base.presentation.actions.cancel?.enabled===true&&!!(base.presentation.command||base.presentation.review),reason:null};
   requireConnection();if(version!==stamp||selectionVersion!==selectedStamp||!sameData(safeKey(fresh().base),safeKey(base)))throw failure('C2_READ_STALE','A callback changed the complete source during projection.');
   validateUIShape('Projection',p);freeze(p);readC2UI(read);freeze(read);entry.published=true;issuedCount++;lastRead=read;return read;
  }finally{reading=false;}
 }
 function paletteContains(d,p){return d.authoring.library.artwork.some(r=>sameData(pin(r),p))||listSharedArtwork().some(r=>sameData(pin(r),p));}
 function publish(){if(disposed||broken)return;queued=true;if(publishing)return;publishing=true;let visits=0;try{while(queued&&!disposed&&!broken){queued=false;if(++visits>8){broken=true;throw failure('C2_OBSERVER_BOUND','Finite projection observer reentry exceeded eight visits.');}const read=getSnapshot();for(const fn of [...listeners]){try{fn(read);}catch{}}}}finally{publishing=false;}}
 function selectExisting(read,selection){
  try{const e=entryFor(read);requireConnection();if(read.overlay.gates.selection.enabled!==true||!sameData(safeKey(fresh().base),safeKey(e.base)))throw failure('C2_SELECTION_STALE','Selection requires the current actual complete read.');if(e.capture)guard(e,e.version);const c=finiteUIData(selection),s=read.overlay.selection;
   if(c.kind==='surface'){if(!read.overlay.choices.some(x=>x.ownerId===c.ownerId&&x.surfaceId===c.surfaceId&&x.floorId===e.basis.floorId))throw failure('C2_SURFACE_SELECTION','Choose a listed surface on the actual drawing floor.');choice={ownerId:c.ownerId,surfaceId:c.surfaceId};layerId=markId=null;}
   else if(c.kind==='layer'){if(!s?.layers.some(l=>l.value.id===c.layerId))throw failure('C2_LAYER_SELECTION','Choose a retained layer.');layerId=c.layerId;}
   else if(c.kind==='mark'){const mark=s?.selectedMark?.id===c.markId?s.selectedMark:e.base.snapshot.document.authoring.decorations.chunks.flatMap(c=>c.marks).find(m=>m.id===c.markId&&m.target.ownerId===s?.ownerId&&m.target.surfaceId===s?.surfaceId);if(!mark)throw failure('C2_MARK_SELECTION','Choose a retained mark on the selected surface.');markId=mark.id;layerId=mark.layerId;chosenArtwork=mark.graphic.artwork;}
   else if(c.kind==='artwork'){if(!s)throw failure('C2_SURFACE_SELECTION','Select a source surface before choosing its artwork.');if(!read.overlay.palette.some(r=>sameData(r.artwork,c.artwork)))throw failure('C2_ARTWORK_SELECTION','Choose an original exact listed Pin.');chosenArtwork=c.artwork;}
   else throw failure('C2_SELECTION_KIND','Use the existing finite selection alternatives.');selectionVersion++;publish();const next=getSnapshot();return freeze({status:'selected',basis:next.overlay.basis,selection:next.overlay.selection,localPointM:null});
  }catch(e){return issueRefusal(read,e);}
 }
 function constructOverlayCommand(read,form){
  let e,entered=false;try{e=entryFor(read);if(constructing||reading)throw failure('C2_CONSTRUCTION_REENTRY','Finish the current finite construction.');constructing=true;entered=true;const stamp=version;
   const context={read,entry:e,ports,byteOwner,byteBinding:ports.selectedBytesBinding,guard:()=>guard(e,stamp),call:fn=>{guard(e,stamp);const value=fn();if(value&&typeof value.then==='function')throw failure('C2_SYNC_PORT_REQUIRED','Construction ports are synchronous; acquisition is separate.');guard(e,stamp);return value;}};
   return freeze(constructCommand(context,form));
  }catch(error){return issueRefusal(read,error);}finally{if(entered)constructing=false;}
 }
 function withCurrentRead(currentRead,originalRead,visit){
  requireConnection();if(reading||constructing||typeof visit!=='function')throw failure('C2_PAIR_REENTRY','Use one synchronous owned read check outside construction.');
  const current=entryFor(currentRead),original=entryFor(originalRead);
  const check=()=>{guard(current,current.version);guard(original,original.version);
   if(!current.capture||current.capture.scope!==original.capture?.scope||current.version!==original.version||current.selectionVersion!==original.selectionVersion||!sameData(current.basis,original.basis)||!sameData(currentRead.overlay.selection,originalRead.overlay.selection)||!sameData(currentRead.overlay.chosenArtwork,originalRead.overlay.chosenArtwork))throw failure('C2_PAIR_SCOPE_CHANGED','Both actual reads must retain the same source handle, generation, selection and complete original Basis.');
  };
  check();const result=visit(originalRead);if(result&&typeof result.then==='function')throw failure('C2_SYNC_PORT_REQUIRED','The owned current-read callback is synchronous.');check();return result;
 }
 const sourceOwner=Object.freeze({
  resolve(read){const e=reads.get(read);return e&&e.published&&e.capture&&read.overlay.basis===e.basis&&read.snapshot===e.base.snapshot&&sameSource(e)?e.scope:null;},
  observe(scope){const e=scopes.get(scope);if(!e||!e.published||!sameSource(e))throw failure('C2_SOURCE_SCOPE_STALE','Use the same actual recognized complete source owner.');const meta=finiteUIData(ports.sourceOwner.observe(e.capture.scope));requireConnection();if(!sameSource(e))throw failure('C2_SOURCE_SCOPE_STALE','The owner observation changed the original complete source.');return freeze({...meta,basis:e.basis,document:e.base.snapshot.document});},
  isCurrent(scope){const e=scopes.get(scope);try{return!!e&&e.published&&sameSource(e);}catch{return false;}}
 });
 const overlayPorts=Object.freeze({selectExisting,constructOverlayCommand,
  acceptCanvasSelection(read,hit){try{const e=entryFor(read);if(!ports.input)throw failure('C2_INPUT_OWNER_UNBOUND','Bind the SAME existing live hit owner; numeric selection remains available.');const stamp=version;guard(e,stamp);const result=ports.input.resolve(workbench.borrowedInputOwner,hit,e.capture?.scope);guard(e,stamp);return selectExisting(read,result.selection);}catch(error){return issueRefusal(read,error);}},
  resolveVerifiedThumbnail(read,artwork){try{const e=entryFor(read);if(!ports.thumbnail||!read.overlay.palette.some(row=>sameData(row.artwork,artwork)))throw failure('C2_THUMBNAIL_OWNER_UNBOUND','Borrow the existing exact verified thumbnail owner.');const stamp=version;guard(e,stamp);const result=ports.thumbnail.resolve(read,artwork);guard(e,stamp);return result;}catch(error){return{status:'unavailable',diagnostics:[diagnostic(error.code??'C2_THUMBNAIL_UNBOUND',error.message)]};}}
 });
 stop=methods[1].call(workbench,()=>{version++;if(listeners.size)publish();});if(typeof stop!=='function')throw failure('C2_SUBSCRIPTION_REQUIRED','Borrowed workbench subscription must return its owned listener disposer.');
 return Object.freeze({getSnapshot,overlayPorts,sourceOwner,withCurrentRead,isConnectionCurrent:connection,
  pairBuiltinOwner(owner){requireConnection();if(issuedCount||byteOwner)throw failure('C2_BYTE_PAIR_ONCE','Pair the fixed existing byte owner ONCE before exposing any read.');const names=['resolveRetainedBytes','constructBuiltinDependencyPrefix','isByteScopeCurrent','observeByteScope','forAuthoringAttempt'];byteMethods=names.map(k=>[k,own(owner,k)]);if(byteMethods.some(([,f])=>typeof f!=='function'))throw failure('C2_BYTE_OWNER_UNBOUND','Supply the accepted exact byte/prefix owner API.');byteOwner=owner;},
  subscribe(fn){requireConnection();if(typeof fn!=='function')throw failure('C2_OBSERVER_REQUIRED','Supply a finite view observer.');listeners.add(fn);return()=>listeners.delete(fn);},
  cancelPendingPreparation(read){try{const e=entryFor(read),c=e.capture,stamp=version;if(!c||c.phase!=='preparing'||read.presentation.outcome?.outcome==='unknown'||!c.originalRequestId||!ports.preparationCancellation)throw failure('C2_PREPARATION_CANCEL_UNBOUND','No same-session owned preparation cancellation helper is bound.');guard(e,stamp);if(ports.preparationCancellation.owns(c.scope,c.originalRequestId,service)!==true)throw failure('C2_PREPARATION_CANCEL_FOREIGN','The helper does not own this original request/connection.');guard(e,stamp);return ports.preparationCancellation.cancel(c.scope,c.originalRequestId,service);}catch(error){return{cancelled:false,code:error.code??'C2_CANCEL_REFUSED',message:error.message};}},
  dispose(){if(disposed)return;disposed=true;version++;listeners.clear();const unsubscribe=stop;stop=null;unsubscribe?.();}
 });
}
