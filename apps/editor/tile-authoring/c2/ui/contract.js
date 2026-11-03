// Private UI structural checks only. These never establish hashes, ownership,
// resource verification, history, budget admission or permission to Apply.
import projectionSchema from './vendor/ui/05723c3cada36249c6b6777dd40c8a478701bccb/projection.schema.json' with {type:'json'};
import c0Schema from './vendor/core/8b4cd72c2d8f424d6811196d9651916bb7e9e2bd/contract.schema.json' with {type:'json'};
import {finiteUIData} from '../../ui/commands.js';
import {readTileAuthoringUIView} from '../../ui/panel.js';

export const failure=(code,message,diagnostics=[])=>Object.assign(new TypeError(message),{code,diagnostics});
export const sameData=(a,b)=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&sameData(a[k],b[k]));
export {finiteUIData};
const schemas=new Map([projectionSchema,c0Schema].map(s=>[s.$id,s]));
const annotations=new Set(['$id','$schema','$defs','title','description','readOnly']);
const keywords=new Set([...annotations,'$ref','type','const','enum','allOf','oneOf','not','if','then','else','minimum','maximum','minLength','maxLength','pattern','minItems','maxItems','uniqueItems','prefixItems','items','contains','minContains','maxContains','properties','required','additionalProperties','minProperties','maxProperties','propertyNames']);

// Deliberately bounded, data-only subset used by the two exact pinned schemas.
// Unknown schema vocabulary refuses. No network refs or schema registration.
export function validateUIShape(name,input){
  const value=finiteUIData(input);let visits=0;
  function check(rule,v,root,depth=0){
    if(++visits>600000||depth>128)throw failure('C2_SHAPE_BOUND','Structural validation exceeded the private UI bound.');
    if(rule===true)return true;if(rule===false)return false;
    for(const key of Object.keys(rule))if(!keywords.has(key))throw failure('C2_SCHEMA_VOCABULARY','Unsupported private shape keyword: '+key);
    if(rule.$ref){const [id,pointer='']=rule.$ref.split('#');const target=id?schemas.get(id):root;if(!target)throw failure('C2_SCHEMA_REF','Only exact pinned local schema data is supported.');let sub=target;for(const key of pointer.split('/').slice(1))sub=sub?.[key.replaceAll('~1','/').replaceAll('~0','~')];if(sub===undefined)throw failure('C2_SCHEMA_REF','Unknown schema pointer.');if(!check(sub,v,target,depth+1))return false;}
    if(rule.type){const good=rule.type==='null'?v===null:rule.type==='array'?Array.isArray(v):rule.type==='object'?!!v&&typeof v==='object'&&!Array.isArray(v):rule.type==='integer'?Number.isSafeInteger(v):typeof v===rule.type;if(!good)return false;}
    if(Object.hasOwn(rule,'const')&&!sameData(v,rule.const))return false;
    if(rule.enum&&!rule.enum.some(x=>sameData(x,v)))return false;
    if(rule.allOf&&!rule.allOf.every(r=>check(r,v,root,depth+1)))return false;
    if(rule.oneOf&&rule.oneOf.filter(r=>check(r,v,root,depth+1)).length!==1)return false;
    if(rule.not&&check(rule.not,v,root,depth+1))return false;
    if(rule.if){const branch=check(rule.if,v,root,depth+1)?rule.then:rule.else;if(branch!==undefined&&!check(branch,v,root,depth+1))return false;}
    if(typeof v==='number'&&(v<(rule.minimum??-Infinity)||v>(rule.maximum??Infinity)))return false;
    if(typeof v==='string'){const count=[...v].length;if(count<(rule.minLength??0)||count>(rule.maxLength??Infinity)||rule.pattern&&!new RegExp(rule.pattern,'u').test(v))return false;}
    if(Array.isArray(v)){
      if(v.length<(rule.minItems??0)||v.length>(rule.maxItems??Infinity))return false;
      if(rule.uniqueItems)for(let i=0;i<v.length;i++)for(let j=0;j<i;j++)if(sameData(v[i],v[j]))return false;
      for(let i=0;i<v.length;i++){const r=rule.prefixItems?.[i]??rule.items;if(r!==undefined&&!check(r,v[i],root,depth+1))return false;}
      if(rule.contains){const count=v.filter(x=>check(rule.contains,x,root,depth+1)).length;if(count<(rule.minContains??1)||count>(rule.maxContains??Infinity))return false;}
    }
    if(v&&typeof v==='object'&&!Array.isArray(v)){
      const keys=Object.keys(v);if(keys.length<(rule.minProperties??0)||keys.length>(rule.maxProperties??Infinity)||rule.required?.some(k=>!Object.hasOwn(v,k)))return false;
      for(const key of keys){if(rule.propertyNames&&!check(rule.propertyNames,key,root,depth+1))return false;const r=rule.properties?.[key]??rule.additionalProperties;if(r!==undefined&&!check(r,v[key],root,depth+1))return false;}
    }
    return true;
  }
  if(!projectionSchema.$defs[name]||!check(projectionSchema.$defs[name],value,projectionSchema))throw failure('C2_SHAPE_REQUIRED','Use the exact closed '+name+' data shape.');
  return value;
}

export function readC2UI(raw){
  const read=readTileAuthoringUIView(raw),p=validateUIShape('Projection',read.overlay),d=read.snapshot.document;
  if(!sameData(p.basis.expected,read.snapshot.expected)||p.basis.documentId!==d.id||p.basis.contentRevision!==d.contentRevision||!d.floorBinding.floors.some(f=>f.id===p.basis.floorId))throw failure('C2_BASIS_MISMATCH','The overlay must describe the exact displayed workspace and drawing floor.');
  if(p.groupsPresent!==(d.authoring.decorations.groups.length>0))throw failure('C2_GROUP_MISMATCH','Preserve all actual source group data.');
  const pin=r=>({id:r.id,revision:r.revision,contentDigest:r.contentDigest});
  for(const choice of p.choices){const owner=d.tileBundle.layout.instances.find(o=>o.id===choice.ownerId),ownerPin=d.authoring.ownerPins.find(o=>o.ownerId===choice.ownerId),definition=d.authoring.library.definitions.find(r=>sameData(pin(r),choice.definition)),surface=definition?.body.surfaces.find(s=>s.id===choice.surfaceId);if(!owner||!ownerPin||!definition||!surface||!sameData(ownerPin.definition,choice.definition)||owner.floorBindings[surface.floorSlot]!==choice.floorId||owner.locked!==choice.locked)throw failure('C2_CHOICE_MISMATCH','List only actual source owners, exact definitions, surfaces and floors.');}
  if(p.selection){
    const s=p.selection,c=p.choices.find(c=>c.ownerId===s.ownerId&&c.surfaceId===s.surfaceId&&c.floorId===s.floorId);if(!c||!sameData(c.definition,s.pose.definition)||c.locked!==s.pose.locked||s.floorId!==p.basis.floorId||s.target&&(s.target.ownerId!==s.ownerId||s.target.surfaceId!==s.surfaceId||s.target.floorId!==s.floorId))throw failure('C2_SELECTION_MISMATCH','Selection must belong to the displayed owner, exact revision and floor.');
    const owner=d.tileBundle.layout.instances.find(o=>o.id===s.ownerId),definition=d.authoring.library.definitions.find(r=>sameData(pin(r),c.definition)),frame=definition.body.surfaces.find(f=>f.id===s.surfaceId),binding=d.authoring.decorations.surfaces.find(b=>b.ownerId===s.ownerId&&b.surfaceId===s.surfaceId);
    if(!sameData(frame,s.frame)||!sameData(s.pose,{originM:owner.origin,quarterTurns:owner.transform.quarterTurns,mirrorX:owner.transform.mirrorX,locked:owner.locked,definition:c.definition})||s.grid&&(s.grid.id!==frame.grid.id||s.grid.version!==frame.grid.version))throw failure('C2_FRAME_MISMATCH','Use the exact authored source frame, grid and current owner pose.');
    if(binding&&(!sameData(s.target,{ownerId:binding.ownerId,surfaceId:binding.surfaceId,floorId:binding.floorId,bindingDigest:binding.bindingDigest})||s.grid?.digest!==binding.gridDigest||!['bound','refused','unresolved'].includes(s.bindingState)))throw failure('C2_BINDING_MISMATCH','Retain the complete existing binding instead of a prospective replacement.');
    const marks=d.authoring.decorations.chunks.flatMap(c=>c.marks).filter(m=>m.target.ownerId===s.ownerId&&m.target.surfaceId===s.surfaceId);
    const layers=(binding?.layers??[]).map(value=>({value,markIds:marks.filter(m=>m.layerId===value.id).map(m=>m.id),opacityStatus:value.opacity===0?'hidden-by-opacity':'opacity-enabled'}));
    if(!sameData(s.layers,layers)||!sameData(s.marks,marks.map(m=>({id:m.id,revision:m.revision,layerId:m.layerId,ordinal:m.ordinal,artwork:m.graphic.artwork,groupId:m.groupId})))||!sameData(s.selectedMark,s.selectedMarkId?marks.find(m=>m.id===s.selectedMarkId)??null:null)||s.selectedMarkId!==null&&!marks.some(m=>m.id===s.selectedMarkId)||s.selectedLayerId!==null&&!layers.some(l=>l.value.id===s.selectedLayerId)||!sameData(s.groups,d.authoring.decorations.groups.map(g=>({id:g.id,floorId:g.floorId,memberMarkIds:g.memberMarkIds}))))throw failure('C2_MEMBERSHIP_MISMATCH','Preserve complete source layer, mark and group membership.');
  }
  const seen=new Set();for(const row of p.palette){const key=JSON.stringify([row.artwork.id,row.artwork.revision,row.artwork.contentDigest]);if(seen.has(key)||!sameData(row.artwork,row.resourceRef.artwork))throw failure('C2_PALETTE_MISMATCH','Use distinct exact artwork Pins and matching descriptors.');seen.add(key);const record=d.authoring.library.artwork.find(r=>sameData(pin(r),row.artwork)),ref=d.resourceRefs.find(r=>sameData(r.artwork,row.artwork));if(row.origin==='workspace'&&(!record||row.dependency.route!=='retained-two-ops'||row.label!==record.body.label||row.frameId!==record.body.imageView.frame.id||ref&&!sameData(ref,row.resourceRef)||!ref&&row.dependency.state!=='descriptor-missing')||row.origin==='builtin-offer'&&(record||row.dependency.route!=='builtin-prefix'))throw failure('C2_PALETTE_MISMATCH','Distinguish retained source content from an unadopted exact built-in offer.');}
  if(p.chosenArtwork&&!p.palette.some(r=>sameData(r.artwork,p.chosenArtwork)))throw failure('C2_ARTWORK_MISMATCH','Choose an exact listed artwork revision.');
  return read;
}

export const sourceKey=read=>[read.snapshot,read.presentation.command,read.presentation.review,read.presentation.retainedApplyRequest,read.presentation.outcome,read.presentation.actions,read.overlay];
export const isUnknown=read=>read?.presentation.outcome?.outcome==='unknown'||read?.overlay.current.state==='unknown';
export const selectedArtwork=read=>read.overlay.palette.find(r=>sameData(r.artwork,read.overlay.chosenArtwork))??null;
export function assertAvailable(read,form){
  const p=read.overlay,s=p.selection;
  if(isUnknown(read))throw failure('C2_UNKNOWN_FROZEN','Reconcile the original unknown request before editing.');
  if(p.availability!=='editable'||!s||!s.target||!['bound','prospective'].includes(s.bindingState)||s.pose.locked||p.groupsPresent||s.groups.length)throw failure('C2_MUTATION_UNAVAILABLE','This surface is unavailable, locked, grouped or unsupported. Preserve its source.');
  const action=form.kind==='first-mark'?'firstMark':form.kind,needed=[action];
  if(form.kind==='first-mark'){if(s.layers.length||s.marks.length)throw failure('C2_FIRST_MARK_SCOPE','First mark requires an unpainted selected surface.');needed.push('surface.layers','decoration.add');if(form.dependency==='builtin-import')needed.push('content.import');}
  if(needed.some(k=>p.gates[k]?.enabled!==true||k!=='firstMark'&&read.presentation.actions[k]?.enabled!==true))throw failure('C2_ACTION_UNAVAILABLE','The existing workbench has not enabled every required operation.');
  if(['first-mark','decoration.add'].includes(form.kind)||form.kind==='decoration.update'&&form.changes.some(c=>c.field==='artwork')){
    const art=selectedArtwork(read);if(!art||!sameData(art.artwork,form.artwork??form.changes.find(c=>c.field==='artwork').value))throw failure('C2_ARTWORK_MISMATCH','Use the explicitly selected exact artwork revision.');
    const retained=read.snapshot.document.authoring.library.artwork.some(r=>sameData({id:r.id,revision:r.revision,contentDigest:r.contentDigest},art.artwork))&&read.snapshot.document.resourceRefs.some(r=>sameData(r,art.resourceRef));
    if(form.kind==='first-mark'&&form.dependency==='builtin-import'){if(retained||art.origin!=='builtin-offer'||art.dependency.state!=='prefix-validated'||art.dependency.missingPort!==null)throw failure('C2_BUILTIN_PREFIX_UNBOUND','Require the validated source-bound built-in prefix producer and actual verified byte owner.');}
    else if(!retained||art.origin!=='workspace'||art.dependency.state!=='source-exact'||art.dependency.missingPort!==null)throw failure('C2_RETAINED_ARTWORK_REQUIRED','Retain the exact artwork/descriptors with verified owner readiness before this operation.');
    if(!['retained','preparable'].includes(art.availability))throw failure('C2_ARTWORK_UNAVAILABLE','Artwork bytes or their owner are unavailable.');
  }
}

// Compare returned canonical data with the requested UI scope. Core/Host still
// performs authoritative canonical-mask, closure, hash, ID and source validation.
export function checkConstruction(read,form,result){
  const r=validateUIShape('Construction',result);if(!sameData(r.basis,read.overlay.basis))throw failure('C2_CONSTRUCTION_STALE','Construction returned a different original source basis.');
  if(r.status==='refused')throw failure(r.diagnostics[0]?.code??'C2_CONSTRUCTION_REFUSED',r.diagnostics[0]?.message??'Construction was refused.',r.diagnostics);
  const c=r.command,s=read.overlay.selection,ops=c.operations;
  if(!sameData(c.expected,read.snapshot.expected)||new Set(ops.map(o=>o.opId)).size!==ops.length)throw failure('C2_COMMAND_SOURCE','Keep the complete original Expected and distinct owner-allocated operation IDs.');
  const existingMarks=new Set(read.snapshot.document.authoring.decorations.chunks.flatMap(c=>c.marks).map(m=>m.id));
  for(const op of ops)if(op.kind==='decoration.add'&&existingMarks.has(op.body.mark.id))throw failure('C2_FRESH_ID_REQUIRED','The existing allocator must supply a fresh mark identity.');
  const target=body=>{if(!sameData(body,s.target))throw failure('C2_TARGET_CHANGED','Do not reanchor or change the selected target.');};
  const checkMask=(actual,draft)=>{
    if(draft.kind==='all-surface'){if(!sameData(actual,draft))throw failure('C2_MASK_CHANGED','Keep the explicit all-surface choice.');return;}
    if(actual.kind!=='grid-spans'||!sameData(actual.grid,s.grid))throw failure('C2_MASK_CHANGED','Core/Host must resolve cells against the current authored grid.');
    const rows=new Map();let count=0;for(const row of actual.rows){const spans=rows.get(row.j)??[];for(const span of row.spans){count+=span.count;spans.push(span);}rows.set(row.j,spans);}
    if(count!==draft.cells.length||draft.cells.some(cell=>(rows.get(cell.j)??[]).filter(span=>cell.i>=span.i0&&cell.i<span.i0+span.count).length!==1))throw failure('C2_MASK_CHANGED','The canonical owner response must cover exactly the explicitly requested cells.');
  };
  const graphic=(actual,draft,art)=>{
    for(const key of ['form','transform','opacity','tintLinearRGB'])if(!sameData(actual[key],draft[key]))throw failure('C2_FORM_CHANGED','Canonical construction changed an explicit numeric field.');
    if(!sameData(actual.artwork,art)||actual.wrap!==(draft.form==='stamp'?'clamp':'repeat'))throw failure('C2_FORM_CHANGED','Keep the selected exact artwork and form/wrap pairing.');
    checkMask(actual.mask,draft.mask);
  };
  if(form.kind==='first-mark'){
    const builtin=form.dependency==='builtin-import',prefix=ops.slice(0,-2),suffix=ops.slice(-2);
    if(r.route!==(builtin?'builtin-prefix-first-mark':'retained-first-mark')||builtin&&(!prefix.length||prefix.some(o=>o.kind!=='content.import'))||!builtin&&prefix.length||suffix[0]?.kind!=='surface.layers'||suffix[1]?.kind!=='decoration.add')throw failure('C2_FIRST_MARK_ORDER','Use the exact dependency imports, then layers/add, in one command.');
    if(builtin){const imported=prefix.flatMap(o=>o.body.pack.manifest.artwork);if(imported.length!==1||!sameData({id:imported[0].id,revision:imported[0].revision,contentDigest:imported[0].contentDigest},form.artwork))throw failure('C2_BUILTIN_CLOSURE_SCOPE','This bounded built-in requires only the selected record and its actual complete dependencies, not all30 records.');}
    const [l,a]=suffix;target(l.body.target);target(a.body.mark.target);if(l.body.layers.length!==1||l.body.removedLayerMarkIds.length||l.body.layers[0].order!==0||read.snapshot.document.authoring.decorations.surfaces.some(surface=>surface.layers.some(layer=>layer.id===l.body.layers[0].id))||l.body.layers[0].id!==a.body.mark.layerId||l.body.layers[0].label!==form.layer.label||l.body.layers[0].opacity!==form.layer.opacity)throw failure('C2_LAYER_CHANGED','Keep the single requested fresh layer and its explicit fields.');graphic(a.body.mark.graphic,form.graphic,form.artwork);
  }else{
    if(r.route!=='appearance-edit'||ops.length!==1||ops[0].kind!==form.kind)throw failure('C2_OPERATION_SCOPE','Stage the one explicit appearance operation.');
    const b=ops[0].body;
    if(form.kind==='decoration.add'){target(b.mark.target);if(b.mark.layerId!==form.layerId||!s.layers.some(l=>l.value.id===form.layerId))throw failure('C2_LAYER_CHANGED','Use a retained layer on this surface.');graphic(b.mark.graphic,form.graphic,form.artwork);}
    if(form.kind==='decoration.update'){
      const old=s.selectedMark;if(!old||old.id!==form.markId||old.revision!==form.expectedRevision||b.markId!==old.id||b.expectedRevision!==old.revision||b.replacement.id!==old.id||b.replacement.revision!==old.revision+1)throw failure('C2_MARK_REVISION','Patch the exact selected mark revision.');
      target(b.replacement.target);if(!s.layers.some(l=>l.value.id===b.replacement.layerId))throw failure('C2_LAYER_CHANGED','Use a retained layer on this same surface.');const expected=structuredClone(old);expected.revision++;for(const change of form.changes){if(change.field==='layerId')expected.layerId=change.value;else if(['positionM','sizeM','rotationRad','mirrorU','pivotUV'].includes(change.field))expected.graphic.transform[change.field]=change.value;else if(change.field==='mask'){checkMask(b.replacement.graphic.mask,change.value);expected.graphic.mask=b.replacement.graphic.mask;}else expected.graphic[change.field]=change.value;}expected.graphic.wrap=expected.graphic.form==='stamp'?'clamp':'repeat';if(!sameData(expected,b.replacement)||b.groupPolicy!=='preserve-whole-group')throw failure('C2_PATCH_PRESERVATION','Preserve every unedited mark value and whole-group policy.');
    }
    if(form.kind==='decoration.remove'&&(!sameData(b.markIds,form.markIds)||b.groupPolicy!=='preserve-whole-group'||form.markIds.some(id=>!s.marks.some(m=>m.id===id&&m.groupId===null))))throw failure('C2_ERASE_SCOPE','Erase only the explicitly selected ungrouped marks.');
    if(form.kind==='surface.layers'){
      target(b.target);if(!sameData(b.removedLayerMarkIds,form.removedLayerMarkIds)||b.layers.length!==form.layers.length)throw failure('C2_LAYER_CHANGED','Keep the full explicit layer list and removed-mark decision.');
      form.layers.forEach((l,i)=>{const v=b.layers[i];if(v.order!==i||l.kind==='existing'&&!sameData(v,l.value)||l.kind==='new'&&(v.label!==l.label||v.opacity!==l.opacity||v.order!==l.order))throw failure('C2_LAYER_CHANGED','Keep requested layer order and values.');});
    }
  }
  return c;
}
