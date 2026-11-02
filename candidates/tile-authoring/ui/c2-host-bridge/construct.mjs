// Private HOST data constructor. No hash, ID generator, executor or resource owner.
import {failure,finiteUIData,validateUIShape,sameData} from './vendor/ui5a7/root/candidates/tile-authoring/ui/c2-runtime/contract.js';
import {sharedArtwork,sharedArtworkImage} from '../../../../packages/assets/index.js';
import {assembleOverlayCommandData,graphicFromOriginalDefaults,patchMarkData} from './data.mjs';
import {inspectSurface,canonicalMaskData} from './query.mjs';
const clone=structuredClone,pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest});
const error=(code,message)=>{throw failure(code,message);};

export function constructCommand(context,actualForm){
 const {read,entry,ports,call:borrow,guard:guardRead,byteOwner,byteBinding}=context;
 const form=validateUIShape('Form',actualForm),s=read.overlay.selection,d=read.snapshot.document;
 const guard=()=>{guardRead();if(!sameData(form,finiteUIData(actualForm)))error('C2_FORM_STALE','The exact original form changed during a borrowed callback.');};
 const call=fn=>{guard();const result=borrow(fn);guard();return result;};
 if(!entry.capture)error('C2_SOURCE_OWNER_UNBOUND','The actual complete source/read owner is UNBOUND.');
 if(!ports.idOwner)error('C2_ID_OWNER_UNBOUND','The same connection must supply its scoped ID allocator.');
 if(!s||!s.target||!entry.derived||!['prospective','bound'].includes(s.bindingState)||s.pose.locked||d.authoring.decorations.groups.length)error('C2_SURFACE_UNSUPPORTED','Select a supported unlocked ungrouped source surface.');
 if(entry.capture.phase==='preparing'||entry.capture.phase==='applying'||entry.capture.phase==='recovery-required'||read.presentation.outcome?.outcome==='unknown')error('C2_WRITES_FROZEN','The original request must settle before constructing another edit.');
  guard();
  const choice=entry.choice,target=inspectSurface(d,read.snapshot.expected,{ownerId:choice.ownerId,surfaceId:choice.surfaceId,definition:choice.definition});guard();
  if(target.committable!==false||target.sourceDocumentDigest!==read.snapshot.expected.hostDocumentDigest||target.workspaceRevision!==d.contentRevision||!sameData(target.target,entry.derived.target)||!sameData(target.grid,entry.derived.grid)||!sameData(target.surface,s.frame)||!sameData(target.existingBinding,entry.derived.existingBinding))error('C2_TARGET_SOURCE_MISMATCH','Inspected target must match exact Core0597 source/frame/grid/existing binding data.');
  const mask=draft=>canonicalMaskData(draft,target);
  let graphic=null,artwork=null,prefix=[],mark=null,layers=null,removed=[],newLayers=0,newMarks=0,newChunks=0;
  const verifyBytes=selected=>{
   if(!byteOwner||!byteBinding)error('C2_BUILTIN_BYTE_OWNER_UNBOUND','The selected builtin byte owner/binding is UNBOUND.');
   const cap=call(()=>byteBinding.resolve(read,selected));if(!cap||call(()=>byteOwner.isByteScopeCurrent(cap))!==true)error('C2_SELECTED_BYTES_UNBOUND','No current actually verified selected byte capability is bound.');
   const observed=finiteUIData(call(()=>byteOwner.observeByteScope(cap)));
   if(!sameData(observed.basis,read.overlay.basis)||!sameData(observed.artwork,selected)||observed.sourceDigest!==read.snapshot.expected.hostDocumentDigest||observed.editingWorkCredit!==0)error('C2_BYTE_SOURCE_MISMATCH','Selected bytes must bind the original complete source and exact Pin; preflight grants zero editing credit.');
   // No forAuthoringAttempt here: that belongs to the later real session.prepare.
   return cap;
  };
  if(form.kind==='first-mark'||form.kind==='decoration.add'){
   artwork=form.artwork;if(!sameData(artwork,read.overlay.chosenArtwork))error('C2_ARTWORK_SELECTION','Use the explicitly selected original exact revision.');
   const record=finiteUIData(sharedArtwork(artwork)),image=finiteUIData(sharedArtworkImage(artwork));guard();
   if(!ports.formInputOwner)error('C2_FORM_TOUCH_UNBOUND','Actual first/add touched-field provenance is UNBOUND.');
   const touched=finiteUIData(call(()=>ports.formInputOwner.touched(read,actualForm)));
   graphic=graphicFromOriginalDefaults(form,touched,mask);
   const retained=d.authoring.library.artwork.find(r=>sameData(pin(r),artwork)),ref=d.resourceRefs.find(r=>sameData(r.artwork,artwork));
   const bytes=verifyBytes(artwork);
   if(retained){
    if(!sameData(retained,record)||!sameData(ref,image.resourceRef)||form.kind==='first-mark'&&form.dependency!=='retained')error('C2_RETAINED_ARTWORK_MISMATCH','Keep the exact retained original record and complete resource descriptor.');
    const r=call(()=>byteOwner.resolveRetainedBytes(read,artwork));if(r?.status!=='verified'||!sameData(r.basis,read.overlay.basis)||!sameData(r.artwork,artwork)||r.bytes!==bytes)error('C2_RETAINED_BYTES_UNBOUND','The real retained-byte owner must recognize the exact capability.');
   }else{
    if(form.kind!=='first-mark'||form.dependency!=='builtin-import')error('C2_BUILTIN_ROUTE_UNBOUND','Absent builtin imports are explicit first-mark dependencies in this contract.');
    const r=call(()=>byteOwner.constructBuiltinDependencyPrefix(read,artwork));
    if(r?.status!=='validated'||!sameData(r.basis,read.overlay.basis)||!sameData(r.artwork,artwork)||r.bytes!==bytes||!Array.isArray(r.packs)||!r.packs.length)error('C2_BUILTIN_PREFIX_UNBOUND','Require the actual complete source-bound selected prefix in this command.');
    const records=r.packs.flatMap(p=>p.manifest.artwork);if(records.length!==1||!sameData(records[0],record)||r.packs.some(p=>p.manifest.definitions.length||p.manifest.presets.length))error('C2_BUILTIN_PREFIX_SCOPE','Do not seed all30 records or alter the chosen original closure.');
    prefix=r.packs.map(pack=>({kind:'content.import',body:{pack:validateUIShape('BuiltinArtworkPack',pack),conflict:'refuse-different-content'}}));
   }
   newMarks=1;newChunks=1;
   if(form.kind==='first-mark'){
    if(s.layers.length||s.marks.length)error('C2_FIRST_MARK_SCOPE','First mark requires the unpainted selected surface.');
    layers=[{id:null,order:0,label:form.layer.label,opacity:form.layer.opacity,blendProfile:'source-over-linear-premultiplied-v1'}];newLayers=1;
   }else{
    if(!s.layers.some(l=>l.value.id===form.layerId))error('C2_LAYER_REQUIRED','Use a retained layer on this exact surface.');
    if(s.marks.some(m=>m.layerId===form.layerId&&m.ordinal>=4294967295))error('C2_ORDINAL_LIMIT','The next layer ordinal exceeds the fixed C0 bound.');
   }
  }else if(form.kind==='decoration.update'){
   const original=s.selectedMark;if(!original||form.markId!==original.id||form.expectedRevision!==original.revision||original.groupId!==null||new Set(form.changes.map(c=>c.field)).size!==form.changes.length)error('C2_MARK_REVISION','Patch the exact selected ungrouped revision with explicit unique changes.');
   for(const change of form.changes){
    if(change.field==='layerId'){if(!s.layers.some(l=>l.value.id===change.value))error('C2_LAYER_REQUIRED','Use a retained layer on this surface.');}
    else if(change.field==='artwork'){
     if(!sameData(change.value,read.overlay.chosenArtwork)||!d.authoring.library.artwork.some(r=>sameData(pin(r),change.value)))error('C2_RETAINED_ARTWORK_REQUIRED','An artwork patch requires the selected exact already-retained Pin.');
     verifyBytes(change.value);
    }
   }
   mark=patchMarkData(original,form,mask);
  }else if(form.kind==='decoration.remove'){
   if(new Set(form.markIds).size!==form.markIds.length||form.markIds.some(id=>!s.marks.some(m=>m.id===id&&m.groupId===null)))error('C2_ERASE_SCOPE','Erase only the explicit retained ungrouped selected-surface marks.');
  }else if(form.kind==='surface.layers'){
   const source=new Map(s.layers.map(l=>[l.value.id,l])),kept=new Set();
   layers=form.layers.map((row,order)=>{if(row.kind==='existing'){const prior=source.get(row.value.id);if(!prior||kept.has(row.value.id)||row.value.order!==order)error('C2_LAYER_SCOPE','Retain distinct existing IDs and explicit complete order.');kept.add(row.value.id);return clone(row.value);}if(row.order!==order)error('C2_LAYER_ORDER','Use explicit contiguous layer order.');newLayers++;return{id:null,order,label:row.label,opacity:row.opacity,blendProfile:'source-over-linear-premultiplied-v1'};});
   const completeRemoved=s.layers.filter(l=>!kept.has(l.value.id)).flatMap(l=>l.markIds);if(!sameData(completeRemoved.slice().sort(),form.removedLayerMarkIds.slice().sort()))error('C2_REMOVED_MARKS_REQUIRED','The caller must explicitly name the complete marks in removed layers.');removed=clone(form.removedLayerMarkIds);
  }
  // Finite graphic values are checked before the only allocator callback.
  // Target/mask query data grants no editing work or permission to prepare.
  if(graphic)validateUIShape('GraphicDraft',{form:graphic.form,transform:graphic.transform,opacity:graphic.opacity,tintLinearRGB:graphic.tintLinearRGB,mask:{kind:'all-surface'}});
  if(mark){if(mark.revision>65535)error('C2_MARK_REVISION','The next source revision exceeds the fixed C0 bound.');validateUIShape('GraphicDraft',{form:mark.graphic.form,transform:mark.graphic.transform,opacity:mark.graphic.opacity,tintLinearRGB:mark.graphic.tintLinearRGB,mask:{kind:'all-surface'}});}
  guard();const counts={operations:prefix.length+(form.kind==='first-mark'?2:1),layers:newLayers,marks:newMarks,chunks:newChunks};
  const ids=finiteUIData(call(()=>ports.idOwner.allocate(entry.capture.scope,counts)));
  if(!ids||ids.opIds?.length!==counts.operations||ids.layerIds?.length!==newLayers||ids.markIds?.length!==newMarks||ids.chunkIds?.length!==newChunks||typeof ids.requestId!=='string')error('C2_ID_SET_REQUIRED','Reserve the complete exact ID set ONCE after validation.');
  const fresh=[ids.requestId,...ids.opIds,...ids.layerIds,...ids.markIds,...ids.chunkIds];if(new Set(fresh).size!==fresh.length||fresh.some(x=>typeof x!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,95}(?![\s\S])/.test(x)))error('C2_ID_SET_REQUIRED','Use distinct bounded existing-owner identities.');
  const allLayers=d.authoring.decorations.surfaces.flatMap(s=>s.layers.map(l=>l.id)),allMarks=d.authoring.decorations.chunks.flatMap(c=>c.marks.map(m=>m.id));if(ids.layerIds.some(id=>allLayers.includes(id))||ids.markIds.some(id=>allMarks.includes(id))||ids.chunkIds.some(id=>d.authoring.decorations.chunks.some(c=>c.id===id)))error('C2_FRESH_IDS_REQUIRED','New world IDs cannot collide with retained records.');
  const command=assembleOverlayCommandData({read,form,target:target.target,graphic,mark,layers,removed,prefix},ids);
  guard();
  return {status:'constructed',basis:read.overlay.basis,route:form.kind==='first-mark'?(prefix.length?'builtin-prefix-first-mark':'retained-first-mark'):'appearance-edit',command};
}
