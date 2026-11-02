// Explicit headless host fixtures. Caller supplies actual public namespaces.
import {createFloorBinding} from '../../../apps/editor/tile-stack/floors.js';
import {smartTileDigest,createSmartTileCheckpoint} from '../../../apps/editor/smart-tile/checkpoint.js';
export function editorWorkspaceFixture({mapCore,tiles,examples},profileId='aft-native-fifteen'){
  const map=mapCore.blankMap('Verbatim original source for a new tile-only tower');map.metadata={retained:{hp:37,ap:0,clock:.125,unknown:['keep',7]}};
  const sourceJSON=JSON.stringify(map,null,1),floorBinding=createFloorBinding({mapCore},sourceJSON,profileId),recipe=examples.surfaceRecipe('stack-unused-proof',8,4,{segments:16}),catalogue=tiles.createTileCatalogue([recipe]);
  const layout={kind:'nautilus-tile-layout',version:1,id:'new-stack-layout',revision:0,floors:floorBinding.floors.map(({id,elevationM})=>({id,elevationM})),catalogueDigest:catalogue.digest,instances:[],joins:[],relations:[],selection:{seed:771,policyVersion:1},extensions:{}};
  // Compatibility-only catalogue identity, not a claim that four future Artist
  // families are bound. Gate B replaces this fixture with the accepted binding.
  const finishBinding={id:'gate-a-compatibility-fixture',version:1,digest:smartTileDigest({ids:['skin.painterly','skin.slate','skin.sandstone'],fixture:true})};
  const constraints={kind:'nautilus-stack-constraints',version:1,floorProfileId:floorBinding.profile.id,minimumClearanceM:2,owners:[],managedRelations:[]};
  return {id:'new-stack-workspace',sourceJSON,floorBinding,finishBinding,tileBundle:tiles.tileBundle(layout,catalogue),constraints};
}
export function legacyRecoveryFixture(deps){
  const d=editorWorkspaceFixture(deps),recipe=structuredClone(d.tileBundle.recipes[0]),catalogue=deps.tiles.createTileCatalogue([recipe]);
  const floors=[{id:'0',label:'1',elevationM:0,legacyLayer:0},{id:'1',label:'2',elevationM:2.12,legacyLayer:1},{id:'2',label:'3',elevationM:4.24,legacyLayer:2}],layout={...structuredClone(d.tileBundle.layout),id:'unchanged-v1-compatibility',floors:floors.map(({id,elevationM})=>({id,elevationM})),catalogueDigest:catalogue.digest};
  layout.instances=[{id:'legacy-a',recipeId:recipe.id,contentDigest:deps.tiles.compileTileRecipe(recipe).contentDigest,origin:[20,20,0],floorBindings:{base:'0'},transform:{quarterTurns:0,mirrorX:false},locked:false,anchorIds:[]}];
  return createSmartTileCheckpoint(deps,{id:'unchanged-v1-workspace',sourceJSON:d.sourceJSON,floorBinding:{id:'editor-supplied-native-floors-v1',version:1,floors},tileBundle:deps.tiles.tileBundle(layout,catalogue)});
}

// Explicit public-core binding witness, not output from the proposed planner.
// Only the upper owner's finish/pair requirement changes; the lower pair stays 2.
export function plannerBindingSourceFixture(deps){
  const d=editorWorkspaceFixture(deps),recipe=d.tileBundle.recipes[0],layout=structuredClone(d.tileBundle.layout),contentDigest=deps.tiles.compileTileRecipe(recipe).contentDigest;
  layout.instances=[['lower-a','F00',0,true],['lower-b','F01',2.12,true],['upper','F14',29.68,false]].map(([id,floorId,h,locked])=>({id,recipeId:recipe.id,contentDigest,origin:[20,20,h],floorBindings:{base:floorId},transform:{quarterTurns:0,mirrorX:false},locked,anchorIds:[]}));
  layout.relations=[{id:'lower-pair',kind:'cross',a:'lower-a',b:'lower-b',clearanceM:2},{id:'upper-a',kind:'cross',a:'lower-a',b:'upper',clearanceM:3},{id:'upper-b',kind:'cross',a:'lower-b',b:'upper',clearanceM:3}];
  const catalogue=deps.tiles.createTileCatalogue(d.tileBundle.recipes);d.tileBundle=deps.tiles.tileBundle(layout,catalogue);d.constraints.owners=layout.instances.map(v=>({instanceId:v.id,primaryReservationId:'body'}));d.constraints.managedRelations=structuredClone(layout.relations);return d;
}
export function preparedPlannerBindingFixture(deps,source,frame,minimumClearanceM=4){
  const old=source.tileBundle.layout.instances.find(v=>v.id==='upper'),recipe=structuredClone(source.tileBundle.recipes.find(r=>r.id===old.recipeId));recipe.id='upper-finish';recipe.interior.skinId='skin.slate';
  const constraints=structuredClone(source.constraints);constraints.managedRelations=constraints.managedRelations.map(r=>r.a==='upper'||r.b==='upper'?{...r,clearanceM:Math.max(r.clearanceM,minimumClearanceM)}:r);
  const e=frame.expected,request={version:1,id:'fixed-upper-finish',expected:{revision:e.revision,layoutDigest:e.layoutDigest,catalogueDigest:e.catalogueDigest,contextToken:e.contextToken},selection:structuredClone(source.tileBundle.layout.selection),replaceIds:[old.id],removeIds:[],slots:[{id:old.id,origin:old.origin,floorBindings:old.floorBindings,alternatives:[{recipeId:recipe.id,transform:old.transform}],locked:false,anchorIds:old.anchorIds}],joins:[],relations:structuredClone(constraints.managedRelations),recipeUpdates:[recipe],maxSteps:256,maxClosure:32,maxSpatialTests:100000,maxGeometryWork:100000,neighbourRadiusM:0};
  const prepared=deps.tiles.prepareTileRepair(source.tileBundle,request,{contextToken:e.contextToken,cancelled:false});
  if(!prepared.ok)throw Error('Explicit public-core fixture refused: '+JSON.stringify(prepared.diagnostics));
  const plan={kind:'nautilus-tile-stack-plan',version:1,ok:true,request,constraints,binding:{sourceLayoutDigest:e.layoutDigest,sourceCatalogueDigest:e.catalogueDigest,contextToken:e.contextToken,sourceConstraintsDigest:e.sourceConstraintsDigest,nextConstraintsDigest:deps.tiles.tileLayoutToken(constraints),floorProfileDigest:e.floorProfileDigest,requestDigest:deps.tiles.tileLayoutToken(request)}};
  return {plan,prepared,requestedMinimumClearanceM:minimumClearanceM,plannerExecuted:false};
}
