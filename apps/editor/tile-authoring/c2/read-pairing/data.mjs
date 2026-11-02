// Pure HOST data helpers. No readiness, authority, ID allocation, hash, budget
// credit or execution. Caller-supplied IDs and target data remain non-authority.
import {failure,finiteUIData,validateUIShape,sameData} from '../ui/contract.js';
import {sharedArtworkDefaults} from '../../../../../packages/assets/index.js';
const clone=structuredClone,transformFields=['positionM','sizeM','rotationRad','mirrorU','pivotUV'];
const fields=['form',...transformFields,'opacity','tintLinearRGB','mask'];
export function graphicFromOriginalDefaults(form,touched,canonicalMask){
 const safe=validateUIShape('Form',form);if(!['first-mark','decoration.add'].includes(safe.kind))throw failure('C2_FORM_KIND','Original defaults seed only first/add forms.');
 if(!Array.isArray(touched)||new Set(touched).size!==touched.length||touched.some(k=>!fields.includes(k)))throw failure('C2_FORM_TOUCH_UNBOUND','Require the actual explicit touched-field set.');
 const original=finiteUIData(sharedArtworkDefaults(safe.artwork)),result=clone(original);
 for(const key of fields){const supplied=transformFields.includes(key)?safe.graphic.transform[key]:safe.graphic[key],saved=transformFields.includes(key)?original.transform[key]:original[key];if(touched.includes(key)){const value=key==='mask'?canonicalMask(supplied):supplied;if(transformFields.includes(key))result.transform[key]=clone(value);else result[key]=clone(value);}else if(!sameData(supplied,saved))throw failure('C2_DEFAULT_FIELDS_UNBOUND','Seed untouched fields from exact public artwork defaults; a UI placeholder is not an edit.');}
 result.wrap=result.form==='stamp'?'clamp':'repeat';return finiteUIData(result);
}
export function patchMarkData(source,form,canonicalMask){
 const f=validateUIShape('Form',form);if(f.kind!=='decoration.update'||source.id!==f.markId||source.revision!==f.expectedRevision||source.groupId!==null||source.revision>=65535||new Set(f.changes.map(c=>c.field)).size!==f.changes.length)throw failure('C2_MARK_REVISION','Patch the exact supported ungrouped source revision.');
 const result=clone(source);result.revision++;
 for(const change of f.changes){if(change.field==='layerId')result.layerId=change.value;else if(transformFields.includes(change.field))result.graphic.transform[change.field]=clone(change.value);else result.graphic[change.field]=change.field==='mask'?canonicalMask(change.value):clone(change.value);}
 result.graphic.wrap=result.graphic.form==='stamp'?'clamp':'repeat';return finiteUIData(result);
}
export function assembleOverlayCommandData({read,form,target,graphic=null,mark=null,layers=null,removed=[],prefix=[]},identities){
 const ids=finiteUIData(identities),f=validateUIShape('Form',form),s=read.overlay.selection;
 const counts={operations:prefix.length+(f.kind==='first-mark'?2:1),layers:layers?.filter(l=>l.id===null).length??0,marks:['first-mark','decoration.add'].includes(f.kind)?1:0,chunks:['first-mark','decoration.add'].includes(f.kind)?1:0};
 if(ids.opIds?.length!==counts.operations||ids.layerIds?.length!==counts.layers||ids.markIds?.length!==counts.marks||ids.chunkIds?.length!==counts.chunks)throw failure('C2_ID_SET_REQUIRED','Use the complete existing owner-supplied identity set.');
 let layerIndex=0;const outputLayers=layers?.map(l=>l.id===null?{...l,id:ids.layerIds[layerIndex++]}:l),operations=prefix.map(p=>clone(p));
 if(f.kind==='first-mark')operations.push({kind:'surface.layers',body:{target,layers:outputLayers,removedLayerMarkIds:[]}});
 if(f.kind==='first-mark'||f.kind==='decoration.add')operations.push({kind:'decoration.add',body:{chunkId:ids.chunkIds[0],mark:{id:ids.markIds[0],revision:1,target,layerId:f.kind==='first-mark'?outputLayers[0].id:f.layerId,ordinal:f.kind==='first-mark'?0:Math.max(-1,...s.marks.filter(m=>m.layerId===f.layerId).map(m=>m.ordinal))+1,graphic,groupId:null}}});
 if(f.kind==='decoration.update')operations.push({kind:f.kind,body:{markId:f.markId,expectedRevision:f.expectedRevision,replacement:mark,groupPolicy:'preserve-whole-group'}});
 if(f.kind==='decoration.remove')operations.push({kind:f.kind,body:{markIds:f.markIds,groupPolicy:'preserve-whole-group'}});
 if(f.kind==='surface.layers')operations.push({kind:f.kind,body:{target,layers:outputLayers,removedLayerMarkIds:removed}});
 return validateUIShape(f.kind==='first-mark'?(prefix.length?'BuiltinFirstMarkCommand':'RetainedFirstMarkCommand'):'OverlayCommand',{kind:'nautilus-tile-authoring-command',version:1,requestId:ids.requestId,expected:read.snapshot.expected,operations:operations.map((op,i)=>({opId:ids.opIds[i],...op})),budgetProfile:'authoring-reference-proposal-v1'});
}
