// Explicit headless host fixtures. Caller supplies actual public namespaces.
import {createFloorBinding} from './floors.js';
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
