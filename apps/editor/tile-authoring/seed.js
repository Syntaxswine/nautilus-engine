// Fresh workspaces only. Existing v1/v2 saves are never converted by this seed.
import {createTileStackWorkspace} from '../tile-stack/seed.js';
import {smartTileData,fields,id,fail} from '../smart-tile/checkpoint.js';

export function createTileAuthoringWorkspace(deps,options){
  options=smartTileData(options);fields(options,['workspaceId','sourceJSON','profileId','finishBinding','minimumClearanceM','templateRecipe'],'/workspace',['workspaceId','sourceJSON','finishBinding']);id(options.workspaceId,'/workspaceId');
  if(options.workspaceId.length>80)fail('WORKSPACE_ID_LIMIT','/workspaceId','Reserve room for explicit layout/library identities.');
  const base=createTileStackWorkspace(deps,options);
  return {kind:'nautilus-tile-workbench-document',version:3,...base,contentRevision:0,
    authoring:{kind:'nautilus-tile-authoring-module',version:1,
      library:{kind:'nautilus-tile-content',version:1,id:base.id+'.library',definitions:[],presets:[],artwork:[]},
      decorations:{kind:'nautilus-local-decorations',version:1,surfaces:[],chunks:[],groups:[]},ownerPins:[]},resourceRefs:[]};
}
