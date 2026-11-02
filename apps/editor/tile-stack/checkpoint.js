// Private B1 policy over the single shared codec. No journal/CAS implementation.
import {createSmartTileCheckpointCodec,smartTileData,smartTileDigest,fields,id,fail} from '../smart-tile/checkpoint.js';
import {createTileStackDocumentPolicy,workspaceStorageKey} from './policy.js';
import {validateConstraints} from '../../../packages/tile-stack-core/contracts.js';
import {createSmartTileStorage} from '../smart-tile/storage.js';

const keys=['sourceDocumentDigest','targetDocumentDigest','sourceLayoutDigest','sourceCatalogueDigest','contextToken','sourceConstraintsDigest','nextConstraintsDigest','floorProfileDigest','requestDigest'];
const digest=(v,p)=>{if(typeof v!=='string'||!/^[a-f0-9]{64}$/.test(v))fail('STACK_OPERATION_DIGEST',p,'Retain a complete captured digest.');};
export function stackOperationBinding(tiles,before,target,request,contextToken){
  return {sourceDocumentDigest:smartTileDigest(before),targetDocumentDigest:smartTileDigest(target),sourceLayoutDigest:tiles.tileLayoutToken(before.tileBundle.layout),sourceCatalogueDigest:before.tileBundle.layout.catalogueDigest,contextToken,sourceConstraintsDigest:tiles.tileLayoutToken(before.constraints),nextConstraintsDigest:tiles.tileLayoutToken(target.constraints),floorProfileDigest:tiles.tileLayoutToken({id:before.floorBinding.profile.id,version:before.floorBinding.profile.version,floors:before.tileBundle.layout.floors}),requestDigest:tiles.tileLayoutToken(request)};
}
export function createTileStackCheckpointCodec(deps,initialDocument){
  const domain=createTileStackDocumentPolicy(deps,initialDocument);
  const policy={formats:domain.formats,
    validateDocument(input){const d=domain.validateDocument(input);validateConstraints(d.constraints);return d;},
    targetDocument(before,operation){return domain.targetDocument(before,operation.target);},
    validateOperation(op,doc,_deps,before,target){
      fields(op,['kind','version','id','documentId','action','expected','request','target','binding'],'/operation');id(op.id,'/operation/id');
      if(op.documentId!==doc.id||!['edit','undo','redo'].includes(op.action))fail('STACK_OPERATION_IDENTITY','/operation','Retain the workspace and explicit action.');
      fields(op.expected,['token','contextToken'],'/operation/expected');for(const [k,v]of Object.entries(op.expected))digest(v,'/operation/expected/'+k);
      fields(op.binding,keys,'/operation/binding');for(const [k,v]of Object.entries(op.binding))digest(v,'/operation/binding/'+k);
      if(!op.request||op.request.id!==op.id)fail('RECOVERY_ID_MISMATCH','/operation/request','Retain the exact original request ID.');
      const b=op.binding,l=target.tileBundle.layout;
      if(b.contextToken!==op.expected.contextToken||b.targetDocumentDigest!==smartTileDigest(target)||b.nextConstraintsDigest!==deps.tiles.tileLayoutToken(target.constraints)||b.requestDigest!==deps.tiles.tileLayoutToken(op.request)||b.floorProfileDigest!==deps.tiles.tileLayoutToken({id:doc.floorBinding.profile.id,version:doc.floorBinding.profile.version,floors:doc.tileBundle.layout.floors}))fail('STACK_OPERATION_BINDING','/operation/binding','The complete prospective document, request and fixed floor profile must agree.');
      if(op.action==='edit'){
        if(op.request.version!==1)fail('INVALID_EDIT_REQUEST','/operation/request/version','Keep the ordinary public v1 repair request.');
        const e=op.request.expected;fields(e,['revision','layoutDigest','catalogueDigest','contextToken'],'/operation/request/expected');
        if(!Number.isSafeInteger(e.revision)||e.revision<0||l.revision!==e.revision+1||e.layoutDigest!==b.sourceLayoutDigest||e.catalogueDigest!==b.sourceCatalogueDigest||e.contextToken!==b.contextToken||smartTileDigest(l.joins)!==smartTileDigest(op.request.joins)||smartTileDigest(l.relations)!==smartTileDigest(op.request.relations))fail('STACK_REQUEST_TARGET','/operation/request','Retain the source expectations and complete prepared joins/relations.');
        if(before){
          if(smartTileDigest(before.tileBundle.layout.extensions)!==smartTileDigest(l.extensions))fail('STACK_EXTENSION_CHANGE','/operation/target','Preserve original layout extensions.');
          for(const r of target.constraints.managedRelations){const old=before.constraints.managedRelations.find(x=>x.id===r.id);if(old&&(smartTileDigest([r.a,r.b].sort())!==smartTileDigest([old.a,old.b].sort())||r.clearanceM<old.clearanceM))fail('STACK_EDITOR_PAIR_WEAKENED','/operation/target/constraints','A retained managed identity cannot change pair or lose a stronger requirement.');}
        }
      }else{
        fields(op.request,['id','kind','action','targetDocumentDigest'],'/operation/request');
        if(op.request.kind!=='smart-tile-history-restore'||op.request.action!==op.action||op.request.targetDocumentDigest!==smartTileDigest(target))fail('HISTORY_TARGET_MISMATCH','/operation/request','History restores the exact complete saved document.');
      }
      if(before&&smartTileDigest(b)!==smartTileDigest(stackOperationBinding(deps.tiles,before,target,op.request,op.expected.contextToken)))fail('STACK_OPERATION_SOURCE','/operation/binding','The operation must bind its exact complete accepted source.');
      return op;
    }
  };
  const codec=createSmartTileCheckpointCodec(deps,policy);
  return Object.freeze({codec,domain});
}
export function createTileStackStorage(deps,{binding,storage,initialCheckpoint,...options}){
  const {codec}=binding,ownedInitial=codec.open(initialCheckpoint);
  const key=workspaceStorageKey(ownedInitial.document.id),existing=storage.getItem(key);
  // Existing records are fully opened, never cleared, restamped or overwritten.
  if(existing!==null)codec.open(existing);
  return createSmartTileStorage(deps,{...options,storage,key,initialCheckpoint:ownedInitial,codec,keyPolicy:value=>value===key});
}
