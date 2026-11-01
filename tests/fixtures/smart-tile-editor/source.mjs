import * as mapCore from '../../../packages/map-core/index.js';
import * as tiles from '../../../packages/tiles-core/index.js';
import {surfaceRecipe} from '../../../packages/tile-visuals/example.js';
import {createSmartTileCheckpoint,smartTileCheckpointToken} from '../../../apps/editor/smart-tile/checkpoint.js';
export const cores={mapCore,tiles},contextToken='a'.repeat(64);
export function smartTileFixture({empty=false}={}){
  const map=mapCore.blankMap('Complete retained Smart Tile source');map.metadata={retained:{hp:37,ap:0,clock:.125,ordered:[7,'7'],unknown:{preserve:true}}};
  const sourceJSON=JSON.stringify(map,null,1),floors=[{id:'0',label:'1',elevationM:0,legacyLayer:0},{id:'1',label:'2',elevationM:2.12,legacyLayer:1},{id:'2',label:'3',elevationM:4.24,legacyLayer:2}];
  const recipe=surfaceRecipe('paving-shared',8,4),catalogue=tiles.createTileCatalogue([recipe]),instance=(id,x,locked)=>({id,recipeId:recipe.id,contentDigest:tiles.compileTileRecipe(recipe).contentDigest,origin:[x,20,0],floorBindings:{base:'0'},transform:{quarterTurns:0,mirrorX:false},locked,anchorIds:recipe.anchors.map(a=>a.id)});
  const layout={kind:'nautilus-tile-layout',version:1,id:'smart-tile-yard',revision:0,floors:floors.map(({id,elevationM})=>({id,elevationM})),catalogueDigest:catalogue.digest,instances:empty?[]:[instance('surface-a',20,false),instance('surface-b',28,true)],joins:empty?[]:[{id:'straight-neighbour',a:{instanceId:'surface-a',faceId:'east',portIds:null},b:{instanceId:'surface-b',faceId:'west',portIds:null}}],relations:[],selection:{seed:17,policyVersion:1},extensions:{}};
  const checkpoint=createSmartTileCheckpoint(cores,{id:'construction-document',sourceJSON,floorBinding:{id:'editor-supplied-native-floors-v1',version:1,floors},tileBundle:tiles.tileBundle(layout,catalogue)});return {checkpoint,recipe,floors,sourceJSON};
}
export function finishOperation(checkpoint,id='finish-owner-a'){
  const bundle=checkpoint.document.tileBundle,source=bundle.layout,copy=structuredClone(bundle.recipes[0]);copy.id='selected-owner-finish';copy.interior.skinId='skin.slate';
  const a=source.instances.find(v=>v.id==='surface-a');
  const request={version:1,id,expected:{revision:source.revision,layoutDigest:tiles.tileLayoutToken(source),catalogueDigest:source.catalogueDigest,contextToken},selection:{seed:17,policyVersion:1},replaceIds:[a.id],removeIds:[],slots:[{id:a.id,origin:a.origin,floorBindings:a.floorBindings,alternatives:[{recipeId:copy.id,transform:a.transform}],locked:false,anchorIds:a.anchorIds}],joins:source.joins,relations:source.relations,recipeUpdates:[copy],maxSteps:256,maxClosure:32,maxSpatialTests:100000,maxGeometryWork:100000,neighbourRadiusM:0};
  const prepared=tiles.prepareTileEdit(bundle,request,{contextToken});if(!prepared.ok)throw Error(JSON.stringify(prepared.diagnostics));
  return {kind:'nautilus-smart-tile-editor-operation',version:1,id,documentId:checkpoint.document.id,action:'edit',expected:{token:smartTileCheckpointToken(checkpoint),contextToken},request,targetBundle:prepared.next.bundle};
}
