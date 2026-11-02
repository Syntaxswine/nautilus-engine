// Private headless B1 data/planning hooks. The existing session owns everything
// asynchronous, its one retained consumer, history, input and durable authority.
import {smartTileData,smartTileDigest,fields,id,fail} from '../smart-tile/checkpoint.js';
import {validateSmartTileDraft} from '../smart-tile/intents.js';
import {TILE_STACK_EDITOR,validateStackDraft,tileStackActions,assertTileStackAdapter} from './contract.js';
import {capturePlannerSource,bindPlannerTargetProposal,validateRequestedClearance} from './planner-seam.js';
import {validateFinishMenuProjection} from './finish-menu.js';
import * as publicStack from '../../../packages/tile-stack-core/index.js';
import {stackOperationBinding} from './checkpoint.js';
import {planIsolatedLevelSurface,surfaceOwnerId} from './surface-route.js';
import {bindIsolatedLevelSurfaceTarget} from './surface-binding.js';
const clone=structuredClone;
export function createTileStackSessionProfile(deps,{binding,initialDocument,finishCatalogue,inspection=null}){
  const {domain,codec}=binding,menu=validateFinishMenuProjection(finishCatalogue,initialDocument.finishBinding);
  const stack=deps.stack??publicStack,limits={...stack.STACK_PLANNER_LIMITS,neighbourRadiusM:0};
  const choose=id=>{const row=menu.entries.find(v=>v.id===id);if(!row)fail('UNBOUND_FINISH','/draft/finishId','Choose an ID from the immutable workspace catalogue.');if(!row.available)fail('UNAVAILABLE_FINISH','/draft/finishId',row.reason);return row.id;};
  function validateDraft(input){
    const d=smartTileData(input);
    if(d.tool==='stack'){validateStackDraft(d,initialDocument.floorBinding);validateRequestedClearance(initialDocument,d.minimumClearanceM);choose(d.finishId);return d;}
    if(d.tool==='finish'){fields(d,['tool','ownerId','finishId'],'/draft');surfaceOwnerId(d.ownerId);choose(d.finishId);return d;}
    const {finishId,...source}=d;choose(finishId);
    if(d.tool==='rectangle'&&d.ownerId!==null)fail('STACK_RECTANGLE_TARGET_UNBOUND','/draft/ownerId','Targeted rectangle editing requires a reviewed edit-owners geometry-edit route, which B1 does not bind. Keep the accepted owner; use Finish for appearance, or ownerId:null only for deliberate new construction.');
    if(d.tool==='path'&&d.ownerId!==null)fail('B2_SURFACE_TARGET_UNBOUND','/draft/ownerId','Targeted path geometry editing is unbound; retain the accepted owner and use Finish or deliberate new construction.');
    validateSmartTileDraft(source);
    return d;
  }
  function plan({checkpoint,draft,requestId,newOwnerId,floorId,hostContext,lockId}){
    const document=domain.validateDocument(checkpoint.document),frame=capturePlannerSource(domain,deps.tiles,document,hostContext),layout=document.tileBundle.layout;
    let intent,ownerId;
    if(lockId||draft?.tool==='finish'){
      ownerId=lockId??draft.ownerId;const old=layout.instances.find(v=>v.id===ownerId);
      if(!old)fail('UNKNOWN_OWNER','/draft/ownerId','Select an accepted whole owner.');if(old.locked)fail('LOCK_CONFLICT','/draft/ownerId','A locked owner cannot be edited or implicitly unlocked.');
      const oldRecipe=document.tileBundle.recipes.find(r=>r.id===old.recipeId);
      if(oldRecipe.shape.kind==='profile-sweep'){
        if(lockId)fail('B2_SURFACE_LOCK_UNBOUND','/ownerId','This bounded path route supports only new isolated surfaces and cosmetic Finish.');
        return planIsolatedLevelSurface(deps,{document,frame,draft,requestId,newOwnerId,floorId,limits,finishId:choose(draft.finishId)});
      }
      const primary=document.constraints.owners.find(v=>v.instanceId===ownerId)?.primaryReservationId;
      if(!primary)fail('STACK_OWNER_BINDING','/draft/ownerId','Retain the named primary reservation for this managed owner.');
      let recipeUpdates=[],recipeId=old.recipeId;
      if(!lockId){const r=clone(document.tileBundle.recipes.find(r=>r.id===old.recipeId));r.id='finish.'+deps.tiles.tileLayoutToken({requestId,ownerId});r.contentVersion++;r.interior.skinId=choose(draft.finishId);recipeId=r.id;recipeUpdates=[r];}
      const {contentDigest,...placement}=clone(old);
      intent={kind:'edit-owners',version:1,id:requestId,minimumClearanceM:document.constraints.minimumClearanceM,upserts:[{...placement,recipeId,locked:!!lockId,primaryReservationId:primary}],removeIds:[],recipeUpdates,joins:{removeIds:[],upserts:[]},relations:{removeIds:[],upserts:[]}};
    }else{
      const d=validateDraft(draft);if(d.tool==='path')return planIsolatedLevelSurface(deps,{document,frame,draft:d,requestId,newOwnerId,floorId,limits,finishId:choose(d.finishId)});
      const recipe=deps.examples.surfaceRecipe(newOwnerId+'.recipe',d.widthM,d.depthM,{segments:16});recipe.interior.variantSeed=d.seed;recipe.interior.skinId=choose(d.finishId);
      const floors=d.tool==='stack'?d.floorIds:[floorId],members=floors.map((floorId,i)=>({id:newOwnerId+'.'+floorId,floorId,locked:d.tool==='stack'&&i<floors.length-1,anchorIds:[]}));ownerId=members.at(-1).id;
      intent={kind:'place-stack',version:1,id:requestId,minimumClearanceM:d.tool==='stack'?validateRequestedClearance(document,d.minimumClearanceM):document.constraints.minimumClearanceM,recipe,primaryReservationId:'body',originXY:clone(d.origin),transform:{quarterTurns:0,mirrorX:false},members};
    }
    const stackPlan=stack.planTileStack(deps.tiles,{bundle:document.tileBundle,context:frame.context,constraints:document.constraints,expected:frame.expected,intent,limits});
    if(!stackPlan.ok){const e=new TypeError('The actual stack planner refused this intent.');e.code=stackPlan.diagnostics[0]?.code??'STACK_PLAN_REFUSED';e.diagnostics=stackPlan.diagnostics;throw e;}
    return {route:'public-rectangle-stack',request:stackPlan.request,ownerId,frame,stackPlan};
  }
  function editOperation({checkpoint,plan,prepared,requestId,contextToken,token,hostContext}){
    const target=plan.route==='public-v1-isolated-surface'?bindIsolatedLevelSurfaceTarget(domain,deps.tiles,{document:checkpoint.document,hostContext,plan,prepared}):bindPlannerTargetProposal(domain,deps.tiles,checkpoint.document,hostContext,plan.frame,plan.stackPlan,prepared.next.bundle);
    return {kind:TILE_STACK_EDITOR.operation,version:2,id:requestId,documentId:checkpoint.document.id,action:'edit',expected:{token,contextToken},request:plan.request,target:{tileBundle:target.targetDocument.tileBundle,constraints:target.targetDocument.constraints},binding:target.binding};
  }
  return Object.freeze({interface:TILE_STACK_EDITOR,assertAdapter:assertTileStackAdapter,validateDraft,plan,editOperation,
    context(document,{cancelled,...hostContext}){return domain.contextToken(hostContext,document);},
    actions:state=>tileStackActions(state,{inspectionBound:!!inspection?.isLive()}),
    ...(inspection?{validateInspection:inspection.validate,setInspection:inspection.set}:{}),
    validateHistoryTarget(_before,target){domain.validateDocument(target);},
    historyOperation({checkpoint,target,requestId,action,request,contextToken,token}){return {kind:TILE_STACK_EDITOR.operation,version:2,id:requestId,documentId:checkpoint.document.id,action,expected:{token,contextToken},request,target:{tileBundle:target.tileBundle,constraints:target.constraints},binding:stackOperationBinding(deps.tiles,checkpoint.document,target,request,contextToken)};},
    validateCommit({document,hostContext,transaction,packet}){
      const {plan,prepared,operation}=transaction;
      const bound=plan.route==='public-v1-isolated-surface'?bindIsolatedLevelSurfaceTarget(domain,deps.tiles,{document,hostContext,plan,prepared}):bindPlannerTargetProposal(domain,deps.tiles,document,hostContext,plan.frame,plan.stackPlan,prepared.next.bundle);
      return packet.requestId===plan.request.id&&smartTileDigest(packet.nextBundle)===smartTileDigest(prepared.next.bundle)&&smartTileDigest(operation.binding)===smartTileDigest(bound.binding)&&smartTileDigest(codec.targetDocument(document,operation))===smartTileDigest(bound.targetDocument);
    },
    snapshot(base,document){
      const floorProfileDigest=deps.tiles.tileLayoutToken({id:document.floorBinding.profile.id,version:document.floorBinding.profile.version,floors:document.tileBundle.layout.floors});
      return {...base,interface:{kind:TILE_STACK_EDITOR.kind,version:2},floors:document.floorBinding.floors,inspection:inspection?inspection.get():{mode:'selected-floor',cutawayFloorId:null},workspace:{id:document.id,checkpointVersion:2,policyToken:domain.bindingToken,floorTableId:document.floorBinding.id,floorTableToken:domain.floorTableToken,floorProfile:document.floorBinding.profile,sourceSha256:document.floorBinding.sourceSha256,finishBinding:document.finishBinding,sourceDocumentDigest:smartTileDigest(document),sourceConstraintsDigest:deps.tiles.tileLayoutToken(document.constraints),floorProfileDigest},finishCatalogue:menu,stackPolicy:{minimumClearanceM:document.constraints.minimumClearanceM,managedOwnerCount:document.constraints.owners.length,managedRelationCount:document.constraints.managedRelations.length},acceptedMinimumClearanceM:document.constraints.minimumClearanceM,owners:base.owners.map(v=>({...v,finishId:v.skinId}))};
    }
  });
}
