// Explicit new workspace only; saved records use the bound shared codec.
import {createFloorBinding} from './floors.js';
import {smartTileData,id} from '../smart-tile/checkpoint.js';
export function createTileStackWorkspace(deps,{workspaceId,sourceJSON,profileId='aft-native-fifteen',finishBinding,minimumClearanceM=2,templateRecipe=deps.examples.surfaceRecipe('stack-default-template',8,4,{segments:16})}){
  id(workspaceId,'/workspaceId');
  const floorBinding=createFloorBinding(deps,sourceJSON,profileId),catalogue=deps.tiles.createTileCatalogue([templateRecipe]);
  const layout={kind:'nautilus-tile-layout',version:1,id:workspaceId+'.layout',revision:0,floors:floorBinding.floors.map(({id,elevationM})=>({id,elevationM})),catalogueDigest:catalogue.digest,instances:[],joins:[],relations:[],selection:{seed:771,policyVersion:1},extensions:{}};
  return {id:workspaceId,sourceJSON,floorBinding,finishBinding:smartTileData(finishBinding),tileBundle:deps.tiles.tileBundle(layout,catalogue),constraints:{kind:'nautilus-stack-constraints',version:1,floorProfileId:floorBinding.profile.id,minimumClearanceM,owners:[],managedRelations:[]}};
}
