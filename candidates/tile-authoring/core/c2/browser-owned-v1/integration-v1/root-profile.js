import {tileHash} from './root-profile-helpers.js';
// Pure Core data binding inside the one existing asynchronous session owner.
import {smartTileData,smartTileDigest,fields,fail} from './root-profile-helpers.js';
import {smartTileActions,assertSmartTileAdapter} from './kernel/deps/apps/editor/smart-tile/contract.js';
import {TILE_AUTHORING_EDITOR,tileAuthoringSource} from './kernel/runtime/apps/editor/tile-authoring/checkpoint.js';
import {readAuthoringJSON} from './root-profile-helpers.js';

const raise=result=>{const e=new TypeError(result.diagnostics?.[0]?.message??'Core refused authoring.');e.code=result.diagnostics?.[0]?.code??'AUTHORING_REFUSED';e.diagnostics=result.diagnostics;throw e;};
const checked=result=>result?.ok===true?result:raise(result);
export function createTileAuthoringSessionProfile(deps,{binding,finishCatalogue,resourcePorts,inspection=null}){
  const {codec,domain}=binding,core=deps.authoring,leases=new WeakMap(),fingerprints=new WeakMap();
  for(const name of ['capture','contextToken','missingBindings'])if(typeof resourcePorts?.[name]!=='function')fail('AUTHORING_RESOURCE_PORT','/resources/'+name,'Bind the actual retained resource owner.');
  const menu=smartTileData(finishCatalogue);fields(menu,['id','version','digest','entries'],'/finishCatalogue');
  const presentationProfileDigest=resourcePorts.presentationProfileDigest;
  if(typeof presentationProfileDigest!=='string'||!/^[a-f0-9]{64}$/.test(presentationProfileDigest))fail('AUTHORING_PRESENTATION_PROFILE','/resources','Capture the immutable actual presentation profile.');
  const hostOnly=({floorId,mode,floorEpoch,providerToken})=>({floorId,mode,floorEpoch,providerToken});
  // Dynamic resource/ledger leases bind the review separately. An owned
  // acquisition never refreshes or invalidates this authority/floor generation.
  const context=(document,host)=>domain.contextToken(document,hostOnly(host));
  function capture(document,token,contextToken,hostContext){
    const lease=resourcePorts.capture(document),contextData={hostAuthorityToken:token,authorityContextToken:contextToken,...lease.data,
      availableFinishIds:menu.entries.filter(x=>x.available).map(x=>x.id)};
    if(contextData.presentationProfileDigest!==presentationProfileDigest||typeof lease.isCurrent!=='function')fail('AUTHORING_RESOURCE_PORT','/resources','Retain the actual captured resource lease and immutable provider.');
    return {lease,contextData};
  }
  function operation(before,{id,action,request,target,command,contextToken,token,authoringBinding=null,tilePreparation}){
    return {kind:TILE_AUTHORING_EDITOR.operation,version:3,id,documentId:before.id,action,expected:{token,contextToken},request,target:domain.targetFields(target),binding:domain.operationBinding(before,target,request,command,contextToken),authoringBinding,tilePreparation,command};
  }
  function snapshotPacket({checkpoint,token,contextToken}){
    const document=domain.validateDocument(checkpoint.document);
    return {document,source:tileAuthoringSource(document),expected:domain.expected(document,token,contextToken),hostProtocolVersion:1,missingBindings:resourcePorts.missingBindings(document)};
  }
  const profile={authoring:true,interface:TILE_AUTHORING_EDITOR,assertAdapter:assertSmartTileAdapter,context,
    presentationFingerprint(input){const d=domain.validateDocument(input);let value=fingerprints.get(d);if(value===undefined){value=smartTileDigest({geometry:tileHash({sourceJSON:d.sourceJSON,floorBinding:d.floorBinding,tileBundle:d.tileBundle}),appearance:tileHash({tileBundle:d.tileBundle,finishBinding:d.finishBinding,decorations:d.authoring.decorations,resourceRefs:d.resourceRefs,profileDigest:presentationProfileDigest})});fingerprints.set(d,value);}return value;},
    validateDraft(input){const command=readAuthoringJSON(input);fields(command,['kind','version','requestId','expected','operations','budgetProfile'],'/command');if(command.kind!=='nautilus-tile-authoring-command'||command.version!==1)fail('AUTHORING_COMMAND_VERSION','/command','Use the canonical Core command.');return command;},
    requestId:draft=>draft.requestId,
    plan({checkpoint,draft,requestId,contextToken,hostContext}){
      if(menu.id!==checkpoint.document.finishBinding.id||menu.version!==checkpoint.document.finishBinding.version||menu.digest!==checkpoint.document.finishBinding.digest)fail('AUTHORING_FINISH_BINDING','/finishCatalogue','Borrow the exact immutable workspace finish catalogue.');
      const captured=capture(checkpoint.document,codec.token(checkpoint),contextToken,hostContext);
      const corePlan=checked(core.planTileAuthoring(deps.tiles,{document:checkpoint.document,command:draft,context:captured.contextData}));
      if(corePlan.requestId!==requestId)fail('AUTHORING_REQUEST_ID','/plan','Retain the command request ID.');
      const tilePreparation=corePlan.route==='source-unchanged'?'source-unchanged':'public-v1-prepared';
      return {corePlan,captured,tilePreparation,request:corePlan.request??{id:requestId,kind:'nautilus-tile-authoring-source-unchanged',version:1},ownerId:draft.operations.flatMap(op=>op.body?.ownerIds??op.body?.placements?.map(p=>p.ownerId)??[])[0]??null};
    },
    editOperation({checkpoint,plan,prepared,requestId,contextToken,token}){
      const bound=checked(core.bindTileAuthoringTarget(deps.tiles,{before:checkpoint.document,plan:plan.corePlan,prepared}));
      if(!plan.captured.lease.isCurrent({sourceUnchanged:bound.tilePreparation==='source-unchanged'}))fail('STALE_RESOURCE_LEASE','/resources','The captured actual resource lease changed during planning.');
      if(bound.tilePreparation!==plan.tilePreparation)fail('AUTHORING_PREPARATION_CLASS','/target','Bind the actual Core route.');plan.bound=bound;
      const op=operation(checkpoint.document,{id:requestId,action:'edit',request:plan.request,target:bound.targetDocument,command:plan.corePlan.command,contextToken,token,authoringBinding:bound.bindings,tilePreparation:bound.tilePreparation});leases.set(op,plan.captured.lease);return op;
    },
    validateHistoryTarget(_before,target){domain.validateDocument(target);},
    admitPresentation({operation,record,acceptedView}){leases.get(operation).admit({record,acceptedView,targetBundle:operation.target.tileBundle});},
    historyOperation({checkpoint,target,requestId,action,request,contextToken,token}){
      const same=smartTileDigest(checkpoint.document.tileBundle)===smartTileDigest(target.tileBundle)&&smartTileDigest(checkpoint.document.constraints)===smartTileDigest(target.constraints)&&profile.presentationFingerprint(checkpoint.document)===profile.presentationFingerprint(target);
      const op=operation(checkpoint.document,{id:requestId,action,request,target,command:null,contextToken,token,tilePreparation:same?'source-unchanged':'public-v1-prepared'});leases.set(op,resourcePorts.capture(checkpoint.document));return op;
    },
    validateCommit({document,hostContext,transaction:t,packet}){
      const op=t.operation;if(context(document,hostContext)!==op.expected.contextToken||!leases.get(op)?.isCurrent({sourceUnchanged:t.tilePreparation==='source-unchanged'}))return false;
      if(t.action!=='edit')return domain.documentDigest(codec.targetDocument(document,op))===domain.documentDigest(t.ticket.targetText);
      const bound=checked(core.bindTileAuthoringTarget(deps.tiles,{before:document,plan:t.plan.corePlan,prepared:t.prepared}));
      if(smartTileDigest(bound.bindings)!==smartTileDigest(op.authoringBinding)||domain.documentDigest(bound.targetDocument)!==domain.documentDigest(codec.targetDocument(document,op)))return false;
      return t.tilePreparation==='source-unchanged'?packet===null:packet?.requestId===op.id&&smartTileDigest(packet.nextBundle)===smartTileDigest(bound.targetDocument.tileBundle);
    },
    actions(state){const value={...smartTileActions(state)},settled=['idle','draft','review','presentation-error'].includes(state.phase)&&state.manual;if(settled){value.setDraft=true;value.selectOwner=true;value.review=state.hasDraft;value.undo=state.undo>0;value.redo=state.redo>0;}value.setInspection=!!inspection&&settled;return value;},
    snapshot(base,document){const missingBindings=resourcePorts.missingBindings(document),readiness={...base.readiness,resources:{state:missingBindings.length?'unbound':'host-bound',missingBindings}};if(missingBindings.length&&!['failed','unconfirmed'].includes(readiness.visual.state))readiness.visual={...readiness.visual,state:'unbound'};return {...base,readiness,interface:{kind:TILE_AUTHORING_EDITOR.kind,version:3},workspace:{id:document.id,checkpointVersion:3,contentRevision:document.contentRevision,sourceDocumentDigest:domain.documentDigest(document),policyToken:domain.bindingToken},floors:document.floorBinding.floors,finishCatalogue:menu,inspection:inspection?.get()??{mode:'selected-floor',cutawayFloorId:null}};},
    authoringSnapshot:snapshotPacket,
    settlement(checkpoint){const b=domain.documentBindings(checkpoint.document);return {workspaceDigest:b.workspaceDigest,hostDocumentDigest:b.hostDocumentDigest,authorityToken:codec.token(checkpoint)};},
    authoringReview(r){return {requestId:r.requestId,bindings:r.plan.bound.bindings,targetDocument:r.plan.bound.targetDocument,costBounds:r.plan.bound.costBounds,tilePreparation:r.tilePreparation};},
    query(document,input){const query=readAuthoringJSON(input);if(query.kind!=='requirements.inspect')fail('C1_QUERY_UNAVAILABLE','/query','Content-pack export is not implemented in C1.');fields(query,['kind','subject'],'/query');return core.inspectTileAuthoringRequirements(deps.tiles,{document,subject:query.subject});}
  };
  if(inspection){profile.validateInspection=value=>inspection.validate(value);profile.setInspection=value=>inspection.set(value);}
  return Object.freeze(profile);
}
