import {createSmartTileCheckpoint} from './checkpoint.js';

// Supplied by the same native Editor profile, not a world-wide floor policy.
export function smartTileProofCheckpoint(mapCore,tiles,examples){
  const map=mapCore.blankMap('Smart Tile · retained workshop source');
  map.metadata={original:{actorResources:{hp:37,ap:0},clock:.125,unknown:['preserve',7,'7']}};
  const floors=[{id:'0',label:'1',elevationM:0,legacyLayer:0},{id:'1',label:'2',elevationM:2.12,legacyLayer:1},{id:'2',label:'3',elevationM:4.24,legacyLayer:2}];
  const recipe=examples.surfaceRecipe('proof-paving',8,4,{segments:16});recipe.interior.variantSeed=0;
  const catalogue=tiles.createTileCatalogue([recipe]),layout={kind:'nautilus-tile-layout',version:1,id:'editor-smart-tile-yard',revision:0,floors:floors.map(({id,elevationM})=>({id,elevationM})),catalogueDigest:catalogue.digest,instances:[],joins:[],relations:[],selection:{seed:0,policyVersion:1},extensions:{}};
  return createSmartTileCheckpoint({mapCore,tiles},{id:'editor-smart-tile-proof',sourceJSON:JSON.stringify(map),floorBinding:{id:'editor-supplied-native-floors-v1',version:1,floors},tileBundle:tiles.tileBundle(layout,catalogue)});
}
