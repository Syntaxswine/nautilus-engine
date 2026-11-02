// Profile-specific validation only. Stage/settle/CAS/recovery are deliberately
// absent: Gate B must inject this policy into one extracted existing codec.
import {smartTileData,smartTileDigest,fields,id,fail,bytes} from '../../../apps/editor/smart-tile/checkpoint.js';
import {openFloorBinding,floorControllerRecords,floorTableToken} from './floors.js';
import {TILE_STACK_EDITOR as C} from './contract.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const digest=(v,path)=>{if(typeof v!=='string'||v.length!==64||!/^[a-f0-9]+$/.test(v))fail('STACK_DIGEST',path,'Supply the exact fixed content digest.');};
export function validateTileStackDocument(deps,input){
  const d=smartTileData(input);fields(d,['id','sourceJSON','floorBinding','finishBinding','tileBundle','constraints'],'/document');id(d.id,'/document/id');
  openFloorBinding(deps,d.sourceJSON,d.floorBinding);
  fields(d.finishBinding,['id','version','digest'],'/document/finishBinding');id(d.finishBinding.id,'/document/finishBinding/id');
  if(d.finishBinding.version!==1)fail('STACK_FINISH_BINDING_VERSION','/document/finishBinding/version','Use the explicit catalogue binding schema v1.');digest(d.finishBinding.digest,'/document/finishBinding/digest');
  if(bytes(JSON.stringify(d.tileBundle))>C.limits.bundleBytes)fail('STACK_BUNDLE_LIMIT','/document/tileBundle','Keep the existing complete-bundle bound.');
  const opened=deps.tiles.openTileBundle(d.tileBundle,{requireResolved:true});
  if(opened.bundle.layout.instances.length>C.limits.owners||opened.bundle.recipes.length>C.limits.recipes)fail('STACK_OWNER_LIMIT','/document/tileBundle','Keep the shared owner/recipe ceilings.');
  if(smartTileDigest(d.tileBundle)!==smartTileDigest(opened.bundle))fail('STACK_BUNDLE_NORMALIZATION','/document/tileBundle','Validation must not replace or drop source.');
  const expected=d.floorBinding.floors.map(({id,elevationM})=>({id,elevationM}));
  if(smartTileDigest(expected)!==smartTileDigest(d.tileBundle.layout.floors))fail('STACK_LAYOUT_FLOORS','/document/tileBundle/layout/floors','The canonical bundle must retain the exact native floor IDs/elevations/order.');
  validateSavedConstraints(d);return freeze(d);
}
// Referential host-source validation only, following the fixed fdd0601 API.
// Complete old/new geometric obligations remain the public planner/core's job.
function validateSavedConstraints(d){
  const c=d.constraints,l=d.tileBundle.layout;fields(c,['kind','version','floorProfileId','minimumClearanceM','owners','managedRelations'],'/document/constraints');
  if(c.kind!=='nautilus-stack-constraints'||c.version!==1||c.floorProfileId!==d.floorBinding.profile.id)fail('STACK_CONSTRAINTS_PROFILE','/document/constraints','Retain the typed constraints and exact geometric floor-profile identity.');
  if(typeof c.minimumClearanceM!=='number'||!Number.isFinite(c.minimumClearanceM)||c.minimumClearanceM<.000001||c.minimumClearanceM>100_000||!Array.isArray(c.owners)||c.owners.length>32||!Array.isArray(c.managedRelations)||c.managedRelations.length>256)fail('STACK_CONSTRAINTS_LIMIT','/document/constraints','Retain an explicit clearance of at least one micrometre and bounded owner/relation source.');
  const owners=new Set(),relations=new Set();for(const [i,o]of c.owners.entries()){
    const path='/document/constraints/owners/'+i;fields(o,['instanceId','primaryReservationId'],path);const v=l.instances.find(v=>v.id===o.instanceId),r=d.tileBundle.recipes.find(r=>r.id===v?.recipeId);
    if(owners.has(o.instanceId)||!r?.reservations.some(x=>x.id===o.primaryReservationId))fail('STACK_CONSTRAINT_OWNER',path,'Bind a unique actual owner and its named primary source reservation.');owners.add(o.instanceId);
  }
  for(const [i,r]of c.managedRelations.entries()){
    const path='/document/constraints/managedRelations/'+i;fields(r,['id','kind','a','b','clearanceM'],path);
    if(relations.has(r.id)||r.kind!=='cross'||!owners.has(r.a)||!owners.has(r.b)||r.a===r.b||typeof r.clearanceM!=='number'||!Number.isFinite(r.clearanceM)||r.clearanceM<c.minimumClearanceM||smartTileDigest(l.relations.find(x=>x.id===r.id)??null)!==smartTileDigest(r))fail('STACK_MANAGED_RELATION',path,'Keep each managed crossing exactly present in source with at least the saved required clearance.');relations.add(r.id);
  }
}
function bindingOf(d){return {id:d.id,layoutId:d.tileBundle.layout.id,sourceSha256:d.floorBinding.sourceSha256,floorBinding:d.floorBinding,finishBinding:d.finishBinding,minimumClearanceM:d.constraints.minimumClearanceM};}
export function createTileStackDocumentPolicy(deps,initialDocument){
  const initial=validateTileStackDocument(deps,initialDocument),binding=bindingOf(initial),bindingToken=smartTileDigest(binding);
  function validateDocument(input){const d=validateTileStackDocument(deps,input);if(smartTileDigest(bindingOf(d))!==bindingToken)fail('STACK_WORKSPACE_BINDING','/document','Retain workspace/layout identity, exact original source and the predeclared floor/catalogue bindings.');return d;}
  function targetDocument(before,input){const pair=smartTileData(input);fields(pair,['tileBundle','constraints'],'/target');return validateDocument({...validateDocument(before),...pair});}
  return Object.freeze({
    kind:'nautilus-tile-stack-document-policy',version:1,bindingToken,
    formats:Object.freeze({checkpoint:C.checkpoint,checkpointVersion:2,journal:C.journal,journalVersion:2,operation:C.operation,operationVersion:2}),
    floorRecords:freeze(floorControllerRecords(initial.floorBinding)),floorTableToken:floorTableToken(initial.floorBinding),
    validateDocument,
    assertDocumentTransition(before,after){validateDocument(before);return validateDocument(after);},
    contextToken(input,acceptedDocument=initial){
      const c=smartTileData(input);fields(c,['floorId','mode','floorEpoch','providerToken'],'/context');
      if(!initial.floorBinding.floors.some(f=>f.id===c.floorId)||!['manual','character-follow','contact-inspection'].includes(c.mode)||!Number.isSafeInteger(c.floorEpoch)||c.floorEpoch<0||typeof c.providerToken!=='string'||!c.providerToken.length||c.providerToken.length>512)fail('STACK_SESSION_CONTEXT','/context','Bind an actual declared floor/mode/epoch and immutable presenter/pool identity.');
      const accepted=validateDocument(acceptedDocument);return smartTileDigest({policyToken:bindingToken,sourceDocumentDigest:smartTileDigest(accepted),sourceConstraintsDigest:deps.tiles.tileLayoutToken(accepted.constraints),...c});
    },
    targetDocument,
    bindTarget(before,pair){
      const accepted=validateDocument(before),target=targetDocument(accepted,pair);
      return freeze({sourceDocumentDigest:smartTileDigest(accepted),sourceConstraintsDigest:deps.tiles.tileLayoutToken(accepted.constraints),targetDocumentDigest:smartTileDigest(target),nextConstraintsDigest:deps.tiles.tileLayoutToken(target.constraints),targetDocument:target});
    }
  });
}

// This opens only an initial proposal, not a live saved v2 authority. Refusing
// noninitial journals preserves every original pending/receipt byte for Gate B.
export function openInitialCheckpointProposal(deps,input){
  const c=smartTileData(input);fields(c,['kind','version','document','journal'],'');
  if(c.kind!==C.checkpoint||c.version!==2)fail('STACK_CHECKPOINT_VERSION','/version','New v2 workspaces do not migrate v1 or unknown checkpoint versions.');
  validateTileStackDocument(deps,c.document);fields(c.journal,['kind','version','serial','receipts','pending'],'/journal');
  if(c.journal.kind!==C.journal||c.journal.version!==2)fail('STACK_JOURNAL_VERSION','/journal','Keep the explicit v2 journal discriminator.');
  if(c.journal.serial!==0||!Array.isArray(c.journal.receipts)||c.journal.receipts.length||c.journal.pending!==null)fail('STACK_SHARED_CODEC_REQUIRED','/journal','Preserve this saved/pending record unchanged until the reviewed shared codec is bound. No reset or restamping.');
  const l=c.document.tileBundle.layout;if(l.revision!==0||l.instances.length||l.joins.length||l.relations.length)fail('STACK_INITIAL_WORKSPACE_REQUIRED','/document/tileBundle','Only a new empty workspace is an initial proposal.');return freeze(c);
}
export function createInitialCheckpointProposal(deps,document){
  return openInitialCheckpointProposal(deps,{kind:C.checkpoint,version:2,document,journal:{kind:C.journal,version:2,serial:0,receipts:[],pending:null}});
}
export function workspaceStorageKey(workspaceId){id(workspaceId,'/workspaceId');return C.storagePrefix+workspaceId;}
export function planNewWorkspaceStorage(deps,checkpoint,existingRaw){
  if(existingRaw!==null)fail('STACK_NAMESPACE_OCCUPIED','/storage','An existing or uninspected namespace cannot be overwritten, migrated or cleared.');
  const c=openInitialCheckpointProposal(deps,checkpoint);return Object.freeze({key:workspaceStorageKey(c.document.id),expectedExisting:null,newWorkspaceOnly:true,initialJSON:JSON.stringify(c)});
}
