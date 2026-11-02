import {SMART_TILE_LIMITS as L} from './contract.js';
import {smartTileData,fields,id,fail,smartTileDigest} from './checkpoint.js';
const clone=structuredClone,I={quarterTurns:0,mirrorX:false};
const finite=(v,path,min=-1000000,max=1000000)=>{if(typeof v!=='number'||!Number.isFinite(v)||Object.is(v,-0)||v<min||v>max)fail('INVALID_DRAFT_NUMBER',path,'Use a finite native metre value within the proof range.');};
export function validateSmartTileDraft(input){
  const d=smartTileData(input);if(!d||!['rectangle','path','finish'].includes(d.tool))fail('UNSUPPORTED_SMART_TILE_TOOL','/draft/tool','Use Rectangle, isolated Path or Finish whole surface.');
  if(d.tool==='finish'){fields(d,['tool','ownerId','skinId'],'/draft');id(d.ownerId,'/draft/ownerId');if(!['skin.painterly','skin.slate','skin.sandstone'].includes(d.skinId))fail('UNBOUND_FINISH','/draft/skinId','Choose a bound decorative finish; boundary/game materials are unchanged.');return d;}
  fields(d,d.tool==='rectangle'?['tool','ownerId','origin','widthM','depthM','seed']:['tool','ownerId','origin','path','widthM','seed'],'/draft');if(d.ownerId!==null)id(d.ownerId,'/draft/ownerId');
  if(!Array.isArray(d.origin)||d.origin.length!==2)fail('INVALID_DRAFT_ORIGIN','/draft/origin','Use native planar x,y.');d.origin.forEach((v,i)=>finite(v,'/draft/origin/'+i));finite(d.widthM,'/draft/widthM',.1,64);if(!Number.isInteger(d.seed)||d.seed<0||d.seed>4294967295)fail('INVALID_SEED','/draft/seed','Save an explicit uint32 variation seed.');
  if(d.tool==='rectangle')finite(d.depthM,'/draft/depthM',.1,64);
  else {if(!['line','arc','cubic'].includes(d.path?.kind))fail('UNSUPPORTED_PATH','/draft/path','Use an original level line, arc or cubic.');const heights=d.path.kind==='line'?[d.path.a?.[2],d.path.b?.[2]]:d.path.kind==='arc'?[d.path.h0,d.path.h1]:d.path.points?.map(p=>p[2]);if(!heights?.length||heights.some(h=>h!==0))fail('GRADED_PATH_UNSUPPORTED','/draft/path','This proof retains level local controls at h=0; graded paths stay unsupported.');}
  return d;
}
export function planSmartTileIntent({tiles,examples},checkpoint,input,{requestId,newOwnerId,floorId,contextToken}){
  const d=validateSmartTileDraft(input),bundle=checkpoint.document.tileBundle,layout=bundle.layout,old=layout.instances.find(v=>v.id===d.ownerId),floor=layout.floors.find(f=>f.id===floorId);id(requestId,'/request/id');if(!floor)fail('UNKNOWN_FLOOR','/floorId','Use the actual available floor controller.');if(d.ownerId&&!old)fail('UNKNOWN_OWNER','/draft/ownerId','Select an accepted whole owner.');if(old?.locked)fail('LOCK_CONFLICT','/draft/ownerId','A whole-instance lock prevents this edit.');
  const ownerId=old?.id||newOwnerId;id(ownerId,'/ownerId');if(!old&&layout.instances.some(v=>v.id===ownerId))fail('OWNER_ID_REUSED','/ownerId','Use a fresh owner identity.');
  const recipes=bundle.recipes,previous=old&&recipes.find(r=>r.id===old.recipeId),baseRecipeId=ownerId+'.recipe',ownRecipeId=layout.instances.some(v=>v.id!==ownerId&&v.recipeId===baseRecipeId)?ownerId+'.private-'+smartTileDigest({requestId}).slice(0,12):baseRecipeId;let recipe,recipeUpdates=[];
  if(d.tool==='finish'){
    recipe=clone(previous);recipe.id=ownRecipeId;recipe.contentVersion=(recipes.find(r=>r.id===ownRecipeId)?.contentVersion||0)+1;recipe.interior.skinId=d.skinId;
  }else if(d.tool==='rectangle'){
    const make=recipeId=>{const r=examples.surfaceRecipe(recipeId,d.widthM,d.depthM,{segments:16});r.interior.variantSeed=d.seed;return r;};
    // Exact source equality only selects a reusable descriptor. The public core
    // still validates every alternative and owns all interface matching.
    const shared=!old&&recipes.find(r=>smartTileDigest(make(r.id))===smartTileDigest(r));recipe=shared||make(ownRecipeId);if(!shared)recipe.contentVersion=(recipes.find(r=>r.id===ownRecipeId)?.contentVersion||0)+1;
  }else{
    recipe=examples.pathRecipe(ownRecipeId,d.path.kind);recipe.contentVersion=(recipes.find(r=>r.id===ownRecipeId)?.contentVersion||0)+1;recipe.shape.path=clone(d.path);recipe.shape.widthM=d.widthM;recipe.interior.variantSeed=d.seed;
    // A conservative authoring reservation; never a collision/support body.
    // The presenter must also refuse a surface outside this declared envelope.
    const p=d.path,points=p.kind==='line'?[p.a,p.b]:p.kind==='cubic'?p.points:[[p.center[0]-p.radius,p.center[1]-p.radius,0],[p.center[0]+p.radius,p.center[1]+p.radius,0]],pad=d.widthM*4;
    recipe.reservations=[{id:'authoring-envelope',floorSlot:'base',channel:'surface',layerId:'ground',min:[Math.min(...points.map(p=>p[0]))-pad,Math.min(...points.map(p=>p[1]))-pad,0],max:[Math.max(...points.map(p=>p[0]))+pad,Math.max(...points.map(p=>p[1]))+pad,.12]}];
  }
  const compiledRecipe=tiles.compileTileRecipe(recipe);if(!recipes.some(r=>r.id===recipe.id&&smartTileDigest(r)===smartTileDigest(recipe)))recipeUpdates=[recipe];
  const origin=d.tool==='finish'?clone(old.origin):[...d.origin,floor.elevationM],floorBindings=d.tool==='finish'?clone(old.floorBindings):{base:floorId},transform=clone(old?.transform||I),placement={id:ownerId,recipeId:recipe.id,contentDigest:compiledRecipe.contentDigest,origin,floorBindings,transform,locked:false,anchorIds:d.tool==='finish'?clone(old.anchorIds):recipe.anchors.map(a=>a.id)};
  const nextRecipes=recipes.filter(r=>r.id!==recipe.id).concat(recipe),catalogue=tiles.createTileCatalogue(nextRecipes),candidate={...clone(layout),catalogueDigest:catalogue.digest,instances:layout.instances.filter(v=>v.id!==ownerId).concat(placement)},joins=clone(layout.joins);
  const inspected=tiles.transformTileRecipe(recipe,placement,layout.floors).geometry,accepted=tiles.openTileBundle(bundle,{requireResolved:true}).compiled;
  const occupied=new Set();for(const j of joins)for(const end of [j.a,j.b]){const v=accepted.instances.find(v=>v.id===end.instanceId);for(const p of v.ports)if(p.faceId===end.faceId&&(end.portIds===null||end.portIds.includes(p.id)))occupied.add(end.instanceId+'|'+p.id);}
  for(const port of inspected.ports){if(occupied.has(ownerId+'|'+port.id))continue;const possible=[];for(const neighbour of accepted.instances){if(neighbour.id===ownerId)continue;for(const p of neighbour.ports)if(p.worldEdgeId===port.worldEdgeId&&!occupied.has(neighbour.id+'|'+p.id))possible.push({neighbour,p});}if(possible.length>1)fail('AMBIGUOUS_INTERFACE','/draft','Several existing owners offer the same interface; keep the explicit source.');
    for(const {neighbour,p}of possible){const join={id:'join-'+ownerId+'-'+neighbour.id+'-'+port.id,a:{instanceId:ownerId,faceId:port.faceId,portIds:[port.id]},b:{instanceId:neighbour.id,faceId:p.faceId,portIds:[p.id]}},match=tiles.matchTileInterfaces(candidate,catalogue,join);if(match.ok){joins.push(join);occupied.add(ownerId+'|'+port.id);occupied.add(neighbour.id+'|'+p.id);}}
  }
  const request={version:1,id:requestId,expected:{revision:layout.revision,layoutDigest:tiles.tileLayoutToken(layout),catalogueDigest:layout.catalogueDigest,contextToken},selection:{seed:d.seed??layout.selection.seed,policyVersion:1},replaceIds:old?[ownerId]:[],removeIds:[],slots:[{id:ownerId,origin,floorBindings,alternatives:[{recipeId:recipe.id,transform}],locked:false,anchorIds:placement.anchorIds}],joins,relations:clone(layout.relations),recipeUpdates,maxSteps:L.repairSteps,maxClosure:L.repairClosure,maxSpatialTests:L.spatialTests,maxGeometryWork:L.geometryWork,neighbourRadiusM:0};
  return {request,ownerId,draft:d};
}
export function planSmartTileLock(tiles,checkpoint,ownerId,{requestId,contextToken}){
  const l=checkpoint.document.tileBundle.layout,v=l.instances.find(v=>v.id===ownerId);if(!v)fail('UNKNOWN_OWNER','/ownerId','Select a whole owner.');if(v.locked)fail('LOCK_ALREADY_SET','/ownerId','The v1 repair profile cannot implicitly unlock a locked owner.');
  return {version:1,id:requestId,expected:{revision:l.revision,layoutDigest:tiles.tileLayoutToken(l),catalogueDigest:l.catalogueDigest,contextToken},selection:clone(l.selection),replaceIds:[ownerId],removeIds:[],slots:[{id:ownerId,origin:clone(v.origin),floorBindings:clone(v.floorBindings),alternatives:[{recipeId:v.recipeId,transform:clone(v.transform)}],locked:true,anchorIds:clone(v.anchorIds)}],joins:clone(l.joins),relations:clone(l.relations),recipeUpdates:[],maxSteps:L.repairSteps,maxClosure:L.repairClosure,maxSpatialTests:L.spatialTests,maxGeometryWork:L.geometryWork,neighbourRadiusM:0};
}
