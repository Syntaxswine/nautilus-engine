// Pure ordinary-v1 request construction/validation; no preparation or authority.
import {smartTileData,smartTileDigest,fields,fail} from '../smart-tile/checkpoint.js';
import {assertSurfaceIsolation,surfaceWork} from './surface-guard.js';
const clone=structuredClone,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function surfaceOwnerId(value){if(typeof value!=='string'||value.length>96||!/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/.test(value))fail('B2_SURFACE_OWNER_ID','/draft/ownerId','Retain the exact accepted public-core whole-owner identity.');return value;}
export function assertLevelPath(recipe){
  const p=recipe.shape?.path,heights=p?.kind==='line'?[p.a[2],p.b[2]]:p?.kind==='cubic'?p.points.map(v=>v[2]):p?.kind==='arc'?[p.h0,p.h1]:null;
  if(recipe.frame!=='local'||recipe.shape.kind!=='profile-sweep'||!heights?.length||heights.some(h=>h!==0)||recipe.ports.length)fail('B2_SURFACE_PROFILE_UNBOUND','/source','Use an original isolated local level line/arc/cubic with no interface ports; no flattening or inferred adjacency.');
  if(!recipe.reservations.some(r=>r.id==='authoring-envelope'&&r.floorSlot==='base'))fail('B2_SURFACE_ENVELOPE_REQUIRED','/source/reservations','Keep the accepted authoring-envelope; Finish cannot invent a replacement envelope.');
}
function provisional(tiles,before,recipe,owner){
  const catalogue=tiles.createTileCatalogue([...before.recipes,recipe]),layout={...clone(before.layout),revision:before.layout.revision+1,catalogueDigest:catalogue.digest,instances:before.layout.instances.filter(v=>v.id!==owner.id).concat(owner)};
  return {kind:'nautilus-tile-bundle',version:1,templates:clone(before.templates),recipes:[...clone(before.recipes),clone(recipe)],layout};
}
export function planIsolatedLevelSurface(deps,{document,frame,draft,requestId,newOwnerId,floorId,limits,finishId}){
  const {tiles,examples}=deps,before=tiles.openTileBundle(document.tileBundle,{requireResolved:true}).bundle,d=smartTileData(draft),work=surfaceWork(limits);
  const old=d.tool==='finish'?before.layout.instances.find(v=>v.id===d.ownerId):null;let recipe,owner;
  if(d.tool==='finish'){
    if(!old)fail('UNKNOWN_OWNER','/draft/ownerId','Select an accepted whole owner.');if(old.locked)fail('LOCK_CONFLICT','/draft/ownerId','A locked owner cannot be finished.');
    if(document.constraints.owners.some(v=>v.instanceId===old.id)||document.constraints.managedRelations.some(r=>[r.a,r.b].includes(old.id)))fail('B2_STACK_INTERACTION_UNBOUND','/draft/ownerId','A managed owner stays on its supported public stack route.');
    const previous=before.recipes.find(r=>r.id===old.recipeId);assertLevelPath(previous);recipe=clone(previous);
    recipe.id='surface.'+tiles.tileLayoutToken({requestId,ownerId:old.id,source:frame.sourceDocumentDigest});recipe.contentVersion++;recipe.interior.skinId=finishId;
    owner={...clone(old),recipeId:recipe.id,contentDigest:tiles.compileTileRecipe(recipe).contentDigest};
  }else{
    if(d.tool!=='path'||d.ownerId!==null)fail('B2_SURFACE_TARGET_UNBOUND','/draft/ownerId','Targeted path geometry editing is unbound; use a null owner only for deliberate new isolated construction.');
    surfaceOwnerId(newOwnerId);if(before.layout.instances.some(v=>v.id===newOwnerId))fail('B2_SURFACE_OWNER_ID_REUSED','/draft/ownerId','Supply one fresh explicit owner identity.');
    const floor=before.layout.floors.find(f=>f.id===floorId);if(!floor)fail('UNKNOWN_FLOOR','/floorId','Bind the actual selected native floor.');
    recipe=examples.pathRecipe('surface.'+tiles.tileLayoutToken({requestId,newOwnerId}),d.path.kind);recipe.shape.path=clone(d.path);recipe.shape.widthM=d.widthM;recipe.interior.variantSeed=d.seed;recipe.interior.skinId=finishId;
    const p=d.path,points=p.kind==='line'?[p.a,p.b]:p.kind==='cubic'?p.points:[[p.center[0]-p.radius,p.center[1]-p.radius,0],[p.center[0]+p.radius,p.center[1]+p.radius,0]],pad=d.widthM*4;
    recipe.reservations=[{id:'authoring-envelope',floorSlot:'base',channel:'surface',layerId:'ground',min:[Math.min(...points.map(p=>p[0]))-pad,Math.min(...points.map(p=>p[1]))-pad,0],max:[Math.max(...points.map(p=>p[0]))+pad,Math.max(...points.map(p=>p[1]))+pad,.12]}];assertLevelPath(recipe);
    owner={id:newOwnerId,recipeId:recipe.id,contentDigest:tiles.compileTileRecipe(recipe).contentDigest,origin:[...d.origin,floor.elevationM],floorBindings:{base:floor.id},transform:{quarterTurns:0,mirrorX:false},locked:false,anchorIds:recipe.anchors.map(a=>a.id)};
  }
  if(before.recipes.some(r=>r.id===recipe.id))fail('B2_SURFACE_RECIPE_ID_REUSED','/source/recipes','A fresh copy-on-write recipe identity collided; preserve all prior recipes.');
  if(before.recipes.length>=32)fail('STACK_REFERENCE_RECIPE_LIMIT','/source/recipes','Keep every prior recipe within the existing cap.');
  const next=provisional(tiles,before,recipe,owner);assertSurfaceIsolation(before,next,owner.id,document.constraints,work);
  const e=frame.expected,request={version:1,id:requestId,expected:{revision:e.revision,layoutDigest:e.layoutDigest,catalogueDigest:e.catalogueDigest,contextToken:e.contextToken},selection:clone(before.layout.selection),replaceIds:old?[old.id]:[],removeIds:[],slots:[{id:owner.id,origin:clone(owner.origin),floorBindings:clone(owner.floorBindings),alternatives:[{recipeId:recipe.id,transform:clone(owner.transform)}],locked:owner.locked,anchorIds:clone(owner.anchorIds)}],joins:clone(before.layout.joins),relations:clone(before.layout.relations),recipeUpdates:[recipe],maxSteps:limits.maxSteps,maxClosure:limits.maxClosure,maxSpatialTests:limits.maxSpatialTests,maxGeometryWork:limits.maxGeometryWork,neighbourRadiusM:0};
  return freeze({route:'public-v1-isolated-surface',ownerId:owner.id,request,frame,recipe,owner,finish:!!old,work:work.snapshot()});
}
// Durable ordinary-request/target consistency precedes route classification.
// Current Editor routes use explicit one-choice slots and fresh COW recipes;
// no solver is replayed, and unrelated unchanged paths remain legal source.
export function validateEditRequestScope(tiles,op,target,before=null){
  const r=op.request,next=target.tileBundle,at='/operation/request',scope=message=>fail('B2_EDIT_REQUEST_SCOPE',at,message);
  fields(r,['version','id','expected','selection','replaceIds','removeIds','slots','joins','relations','recipeUpdates','maxSteps','maxClosure','maxSpatialTests','maxGeometryWork','neighbourRadiusM'],at);
  for(const key of ['replaceIds','removeIds','slots','recipeUpdates'])if(!Array.isArray(r[key])||r[key].length>32)scope('Retain the bounded complete ordinary repair scope.');
  if(!r.slots.length&&!r.removeIds.length)scope('An edit must declare the actual changed owner scope.');
  const slotIds=new Set(r.slots.map(v=>v.id)),removed=new Set(r.removeIds),replaced=new Set(r.replaceIds),updates=new Set(r.recipeUpdates.map(v=>v.id));
  if(slotIds.size!==r.slots.length||removed.size!==r.removeIds.length||replaced.size!==r.replaceIds.length||updates.size!==r.recipeUpdates.length||[...replaced].some(id=>!slotIds.has(id))||[...removed].some(id=>slotIds.has(id)))scope('Retain distinct unambiguous declared owner and recipe identities.');
  for(const slot of r.slots){
    const owner=next.layout.instances.find(v=>v.id===slot.id);if(!owner||slot.alternatives?.length!==1)scope('Every declared slot must describe its actual complete target owner.');
    const choice=slot.alternatives[0],recipe=next.recipes.find(v=>v.id===choice.recipeId);if(!recipe)scope('Bind the actual target recipe.');
    const wanted={id:slot.id,recipeId:choice.recipeId,contentDigest:tiles.compileTileRecipe(recipe).contentDigest,origin:slot.origin,floorBindings:slot.floorBindings,transform:choice.transform,locked:slot.locked,anchorIds:slot.anchorIds};if(smartTileDigest(wanted)!==smartTileDigest(owner))scope('The target owner must match the complete ordinary repair slot.');
  }
  if([...removed].some(id=>next.layout.instances.some(v=>v.id===id))||!same(r.selection,next.layout.selection))scope('The complete target must retain declared removals and selection.');
  for(const recipe of r.recipeUpdates)if(!same(recipe,next.recipes.find(v=>v.id===recipe.id)))scope('Every fresh recipe update must match the actual target source.');
  // Original recipes, including unused entries, are retained by all currently
  // bound routes. This also checks a first receipt without duplicating its old
  // document: removing request markers cannot conceal a new/changed recipe.
  const priorRecipes=next.recipes.filter(v=>!updates.has(v.id));if(!priorRecipes.length||tiles.createTileCatalogue(priorRecipes).digest!==r.expected.catalogueDigest)scope('The complete source catalogue must equal the target minus its declared fresh recipe updates.');
  const pathOwner=id=>{const o=next.layout.instances.find(v=>v.id===id);return next.recipes.find(v=>v.id===o?.recipeId)?.shape.kind==='profile-sweep';};
  if(target.constraints.owners.some(v=>pathOwner(v.instanceId))||target.constraints.managedRelations.some(v=>pathOwner(v.a)||pathOwner(v.b)))scope('An isolated path cannot be adopted as a managed stack owner or endpoint.');
  if(before){
    const old=before.tileBundle;
    for(const owner of old.layout.instances){const after=next.layout.instances.find(v=>v.id===owner.id);if(!slotIds.has(owner.id)&&!removed.has(owner.id)&&!same(owner,after))scope('Actual source/target owner changes must be declared before route selection.');if(removed.has(owner.id)&&after)scope('A removed owner cannot survive.');}
    for(const owner of next.layout.instances){const prior=old.layout.instances.find(v=>v.id===owner.id);if(!prior&&!slotIds.has(owner.id)||slotIds.has(owner.id)&&!!prior!==replaced.has(owner.id))scope('New/replaced owners must match the actual original source.');}
    if([...removed].some(id=>!old.layout.instances.some(v=>v.id===id)))scope('Only an accepted owner can be removed.');
    for(const recipe of old.recipes)if(!same(recipe,next.recipes.find(v=>v.id===recipe.id)))scope('Keep every previous/unused recipe exactly; current routes are copy-on-write.');
    for(const recipe of next.recipes)if(!old.recipes.some(v=>v.id===recipe.id)&&!updates.has(recipe.id))scope('Every actual fresh recipe must be declared.');
    if(!same(old.templates,next.templates))scope('Retain original template references.');
  }
}
export function isSurfaceOperation(op,target,before=null){
  if(op.action!=='edit')return false;
  const path=(bundle,id)=>{const owner=bundle.layout.instances.find(v=>v.id===id);return bundle.recipes.find(v=>v.id===owner?.recipeId)?.shape.kind==='profile-sweep';};
  if(before){const old=before.tileBundle,next=target.tileBundle,ids=new Set([...old.layout.instances,...next.layout.instances].map(v=>v.id));for(const id of ids)if(!same(old.layout.instances.find(v=>v.id===id),next.layout.instances.find(v=>v.id===id))&&(path(old,id)||path(next,id)))return true;}
  return (Array.isArray(op.request.recipeUpdates)&&op.request.recipeUpdates.some(r=>r.shape?.kind==='profile-sweep'))||(Array.isArray(op.request.slots)&&op.request.slots.some(s=>Array.isArray(s.alternatives)&&s.alternatives.some(a=>target.tileBundle.recipes.find(r=>r.id===a.recipeId)?.shape.kind==='profile-sweep')));
}
export function validateSurfaceOperation(tiles,op,target,before=null){
  const r=op.request,slots=r.slots;
  if(!Array.isArray(slots)||slots.length!==1||!Array.isArray(r.removeIds)||r.removeIds.length||!Array.isArray(r.recipeUpdates)||r.recipeUpdates.length!==1||!Array.isArray(r.replaceIds)||r.replaceIds.length>1||slots[0].alternatives?.length!==1||r.replaceIds.length&&r.replaceIds[0]!==slots[0].id)fail('B2_SURFACE_REQUEST_SCOPE','/operation/request','An isolated surface request has exactly one owner and one fresh recipe.');
  const recipe=r.recipeUpdates[0],owner=target.tileBundle.layout.instances.find(v=>v.id===slots[0].id);assertLevelPath(recipe);
  if(target.constraints.owners.some(v=>v.instanceId===slots[0].id)||target.constraints.managedRelations.some(v=>[v.a,v.b].includes(slots[0].id)))fail('B2_STACK_INTERACTION_UNBOUND','/operation/target/constraints','The isolated surface route cannot reinterpret a managed stack owner.');
  if(!owner||owner.recipeId!==recipe.id||slots[0].alternatives[0].recipeId!==recipe.id||!same(recipe,target.tileBundle.recipes.find(v=>v.id===recipe.id))||owner.locked||!same(r.selection,target.tileBundle.layout.selection))fail('B2_SURFACE_REQUEST_SCOPE','/operation/request','Retain the complete single surface source, original selection and unlocked placement.');
  const slot=slots[0],wanted={id:slot.id,recipeId:recipe.id,contentDigest:tiles.compileTileRecipe(recipe).contentDigest,origin:slot.origin,floorBindings:slot.floorBindings,transform:slot.alternatives[0].transform,locked:slot.locked,anchorIds:slot.anchorIds};
  if(smartTileDigest(wanted)!==smartTileDigest(owner))fail('B2_SURFACE_REQUEST_SCOPE','/operation/request/slots','The complete target owner must match the original ordinary repair slot exactly.');
  if(op.binding.sourceConstraintsDigest!==op.binding.nextConstraintsDigest||before&&!same(before.constraints,target.constraints))fail('B2_SURFACE_CONSTRAINT_CHANGE','/operation/target/constraints','Every isolated-path edit preserves the complete accepted constraints bytes.');
  if(before){
    for(const key of ['id','floors','joins','relations','selection','extensions'])if(!same(before.tileBundle.layout[key],target.tileBundle.layout[key]))fail('B2_SURFACE_PROTECTED_SOURCE','/operation/target/'+key,'An isolated edit cannot alter unrelated layout source.');
    if(!same(before.tileBundle.templates,target.tileBundle.templates))fail('B2_SURFACE_PROTECTED_SOURCE','/operation/target/templates','Keep the complete original template references.');
    for(const v of before.tileBundle.layout.instances)if(v.id!==owner.id&&!same(v,target.tileBundle.layout.instances.find(x=>x.id===v.id)))fail('B2_SURFACE_PROTECTED_SOURCE','/operation/target/instances','Keep every unrelated owner exactly.');
    for(const v of before.tileBundle.recipes)if(!same(v,target.tileBundle.recipes.find(x=>x.id===v.id)))fail('B2_SURFACE_PROTECTED_SOURCE','/operation/target/recipes','Keep all prior and unused recipes exactly.');
    if(target.tileBundle.recipes.length!==before.tileBundle.recipes.length+1||target.tileBundle.layout.instances.length!==before.tileBundle.layout.instances.length+(r.replaceIds.length?0:1))fail('B2_SURFACE_REQUEST_SCOPE','/operation/target','The complete target contains exactly the one declared owner/recipe change.');
    if(r.replaceIds.length){const old=before.tileBundle.layout.instances.find(v=>v.id===owner.id),oldRecipe=before.tileBundle.recipes.find(v=>v.id===old?.recipeId);if(!old||old.locked||!oldRecipe)fail('B2_SURFACE_REQUEST_SCOPE','/operation/target','Finish retains an existing unlocked owner.');assertLevelPath(oldRecipe);
      const wanted=clone(oldRecipe);wanted.id=recipe.id;wanted.contentVersion++;wanted.interior.skinId=recipe.interior.skinId;
      if(!same(wanted,recipe)||!same({...old,recipeId:owner.recipeId,contentDigest:owner.contentDigest},owner))fail('B2_SURFACE_GEOMETRY_EDIT_UNBOUND','/operation/target','Only the selected path recipe identity/version/skin may change; geometry, seed, anchor subset and native floor stay exact.');}
    assertSurfaceIsolation(before.tileBundle,target.tileBundle,owner.id,before.constraints,surfaceWork({maxSpatialTests:r.maxSpatialTests}));
  }
  return owner.id;
}
