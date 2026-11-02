// Data consistency only. This does not plan, prepare, write or create a retained
// handle. Gate B must still verify the actual retained-core preparation/lease.
import {smartTileData,smartTileDigest,fields,fail} from '../../../apps/editor/smart-tile/checkpoint.js';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

export function validateRequestedClearance(document,value){
  if(typeof value!=='number'||!Number.isFinite(value)||value<document.constraints.minimumClearanceM||value>100_000)fail('STACK_EDITOR_REQUESTED_CLEARANCE','/intent/minimumClearanceM','Retain an explicit request at least the accepted workspace minimum; never overwrite accepted constraints to satisfy it.');return value;
}

export function capturePlannerSource(policy,tiles,document,hostContext){
  const accepted=policy.validateDocument(document),h=smartTileData(hostContext);fields(h,['floorId','mode','floorEpoch','providerToken','cancelled'],'/hostContext');
  if(typeof h.cancelled!=='boolean')fail('STACK_EDITOR_CANCELLATION','/hostContext/cancelled','Capture actual host cancellation explicitly.');
  if(h.cancelled)fail('STACK_EDITOR_CANCELLED','/hostContext','Cancelled source cannot form a candidate.');
  const {cancelled,...viewContext}=h,contextToken=policy.contextToken(viewContext,accepted),l=accepted.tileBundle.layout;
  const floorProfile={id:accepted.floorBinding.profile.id,version:accepted.floorBinding.profile.version,floors:l.floors};
  const sourceConstraintsDigest=tiles.tileLayoutToken(accepted.constraints),floorProfileDigest=tiles.tileLayoutToken(floorProfile);
  return freeze({sourceDocumentDigest:smartTileDigest(accepted),context:{contextToken,cancelled,sourceConstraintsDigest,floorProfile},expected:{revision:l.revision,layoutDigest:tiles.tileLayoutToken(l),catalogueDigest:l.catalogueDigest,contextToken,sourceConstraintsDigest,floorProfileDigest}});
}

export function bindPlannerTargetProposal(policy,tiles,document,hostContext,frame,inputPlan,preparedBundle){
  const source=policy.validateDocument(document),current=capturePlannerSource(policy,tiles,source,hostContext),captured=smartTileData(frame),plan=smartTileData(inputPlan);
  if(smartTileDigest(current)!==smartTileDigest(captured))fail('STACK_EDITOR_STALE_FRAME','/frame','The complete accepted document or actual floor/mode/epoch/provider context changed.');
  if(plan.kind!=='nautilus-tile-stack-plan'||plan.version!==1||plan.ok!==true)fail('STACK_EDITOR_PLAN_REQUIRED','/plan','Bind an explicit successful plan proposal; a refusal has no target.');
  const b=plan.binding,e=current.expected;fields(b,['sourceLayoutDigest','sourceCatalogueDigest','contextToken','sourceConstraintsDigest','nextConstraintsDigest','floorProfileDigest','requestDigest'],'/plan/binding');
  for(const [key,want]of Object.entries({sourceLayoutDigest:e.layoutDigest,sourceCatalogueDigest:e.catalogueDigest,contextToken:e.contextToken,sourceConstraintsDigest:e.sourceConstraintsDigest,floorProfileDigest:e.floorProfileDigest,requestDigest:tiles.tileLayoutToken(plan.request),nextConstraintsDigest:tiles.tileLayoutToken(plan.constraints)}))if(b[key]!==want)fail('STACK_EDITOR_PLAN_BINDING','/plan/binding/'+key,'Retain the fixed planner ABI and the original source/request/next constraints tokens.');
  const expected={revision:e.revision,layoutDigest:e.layoutDigest,catalogueDigest:e.catalogueDigest,contextToken:e.contextToken};
  if(smartTileDigest(plan.request.expected)!==smartTileDigest(expected))fail('STACK_EDITOR_REQUEST_SOURCE','/plan/request/expected','The ordinary public repair request must bind the captured source.');
  if(plan.constraints.minimumClearanceM!==source.constraints.minimumClearanceM)fail('STACK_EDITOR_GLOBAL_POLICY_CHANGE','/plan/constraints/minimumClearanceM','Per-intent clearance does not change accepted workspace policy.');
  const next=policy.targetDocument(source,{tileBundle:preparedBundle,constraints:plan.constraints});
  if(next.tileBundle.layout.revision!==e.revision+1||smartTileDigest(next.tileBundle.layout.relations)!==smartTileDigest(plan.request.relations)||smartTileDigest(next.tileBundle.layout.joins)!==smartTileDigest(plan.request.joins))fail('STACK_EDITOR_PREPARED_DATA','/target/tileBundle','The prospective prepared source must retain the request revision, joins and relations.');
  for(const r of next.constraints.managedRelations){const prior=source.constraints.managedRelations.find(p=>p.id===r.id);if(prior&&(smartTileDigest([prior.a,prior.b].sort())!==smartTileDigest([r.a,r.b].sort())||r.clearanceM<prior.clearanceM))fail('STACK_EDITOR_PAIR_WEAKENED','/target/constraints/managedRelations','An existing managed identity cannot change pair or lose its stronger requirement.');}
  const target=policy.bindTarget(source,{tileBundle:next.tileBundle,constraints:next.constraints});
  return freeze({targetDocument:target.targetDocument,binding:{sourceDocumentDigest:target.sourceDocumentDigest,targetDocumentDigest:target.targetDocumentDigest,...b},request:plan.request,committable:false});
}
