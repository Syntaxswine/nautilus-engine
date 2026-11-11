import * as C1 from '../../../../../packages/tile-authoring-core/index.js';
import {Budget,fail,readData,corePort,fields,shape,captureShape,hash,equal,freeze,refusal,plain} from './data.js';
import {jsonBytes} from './budget.js';
import {deriveAppearancePlan} from './planning.js';
import {documentDigests} from './model.js';
import {validatePreparedCapture} from './ledger.js';
import {costs} from './requirements.js';
const own=(v,k)=>{const x=Object.getOwnPropertyDescriptor(v??{},k);return x&&Object.hasOwn(x,'value')?x.value:undefined;};
const need=(v,code,path,msg)=>{if(!v)fail(code,path,msg);};
const withoutPlanning=p=>({...p,costBounds:{...p.costBounds,planning:null}});
function capacity(t,before,p,c,b){
 const q=c.capacityBound,k=c.planningCarry;
 captureShape(t,'CapacityBound',q,b);
 need(equal(t,q.original,p.original,b)&&q.sourceCheckpointToken===p.original.expected.hostAuthorityToken&&q.targetHostDocumentDigest===p.targetHostDocumentDigest&&q.sourceJournalDigest===p.sourceCapture.history.journalDigest&&q.sourceHistoryGeneration===p.sourceCapture.history.generation&&q.sourceHistoryStateDigest===p.sourceCapture.history.stateDigest,'CAPACITY_BINDING','/capacityBound','Data-only bound must bind actual source checkpoint, target and journal/history generation.');
 need(q.governingLimitsDigest===hash(t,{authoring:p.limits,host:q.limits},b),'CAPACITY_LIMITS_BINDING','/capacityBound','Commit explicit effective authoring limits and fixed absolute Host ceilings.');
 const l=q.limits,u=q.upperBounds;
 for(const [key,max]of Object.entries({walBytes:l.checkpointBytes,historyBytes:l.historyBytes,checkpointNodes:l.checkpointNodes,checkpointDepth:l.checkpointDepth,historyEntries:l.historyEntries,receipts:l.receipts}))need(u[key]<=max,'CAPACITY_EXHAUSTED','/capacityBound/upperBounds/'+key,'Conservative upper bounds must fit governing Host limits before reversible preparation.');
 const minimum=jsonBytes(before,p.limits.sourceBytes)+jsonBytes(p.targetDocument,p.limits.sourceBytes);
 need(u.walBytes>=minimum&&u.historyBytes>=minimum,'CAPACITY_UNDERSTATED','/capacityBound','Full before and target bytes alone must fit the prospective WAL and history bound.');
 need(q.work.chargedBefore===p.costBounds.planning.unitsCharged&&q.work.chargedAfter===q.work.chargedBefore+q.work.chargeThisPhase&&k.sourceCharged===q.work.chargedBefore&&k.afterCapacity===q.work.chargedAfter&&k.afterPreparation>=k.afterCapacity&&c.costBounds.planning.unitsCharged===k.afterPreparation&&k.finalBindUpperBound>=k.afterPreparation&&k.finalBindUpperBound<=p.limits.plannerUnits,'WORK_CARRY','/planningCarry','Actual monotonic work through preparation is separate from the unspent final-bind reservation.');
}
export function bindTileAuthoringTarget(actual,input){
 let requestId='invalid-request';try{
  if(!plain(input))fail('BIND_RECORD_REQUIRED','/bind','Supply the typed finite outer bind record; command JSON is supported by the planner.');
  const hint=own(input,'plan');requestId=own(own(hint,'original'),'requestId')??'invalid-request';if(own(hint,'version')===1)return C1.bindTileAuthoringTarget(actual,input);
  const capture=own(input,'appearanceCapture'),carry=own(capture,'planningCarry'),limits=own(hint,'limits');
  if(!plain(limits)||!plain(carry))fail('C2_PLAN_LIMITS_REQUIRED','/plan','Plan2 carries complete effective limits and actual preparation work.');
  // Read only own data descriptors before constructing the same command-wide meter.
  const safeLimits={};for(const key of Reflect.ownKeys(limits)){const v=own(limits,key);if(typeof key!=='string'||!Number.isSafeInteger(v))fail('INVALID_LIMIT','/plan/limits','Known integer data limits are required.');safeLimits[key]=v;}
  const b=new Budget(safeLimits),normalized={...b.limits};need(Object.keys(safeLimits).length===Object.keys(normalized).length&&Object.keys(normalized).every(k=>safeLimits[k]===normalized[k]),'C2_PLAN_LIMITS_REQUIRED','/plan/limits','Required Plan2 limits are complete and normalized.');
  const afterPreparation=own(carry,'afterPreparation'),upper=own(carry,'finalBindUpperBound');
  need(Number.isSafeInteger(afterPreparation)&&Number.isSafeInteger(upper)&&upper>=afterPreparation&&upper<=b.limits.plannerUnits,'WORK_CARRY','/planningCarry','Reservation fits the unchanged effective planner ceiling.');
  b.limits.plannerUnits=Math.min(upper,b.limits.plannerUnits);b.take(afterPreparation);
  const t=corePort(actual),v=readData(input,b,b.limits.inputBytes);fields(v,['before','plan','prepared','appearanceCapture'],'/bind');
  const p=v.plan,c=v.appearanceCapture;requestId=p.original?.requestId;
  need(c.costBounds.planning.inputBytes>=p.costBounds.planning.inputBytes,'WORK_CARRY','/costBounds/planning','Aggregate input accounting cannot forget the source phase.');b.input(c.costBounds.planning.inputBytes);
  captureShape(t,'AppearancePlan',p,b);need(v.prepared===null,'C2_PUBLIC_PREPARATION_FORBIDDEN','/prepared','Appearance-only makes no public repair call and accepts no substitute geometry preparation.');
  // Restore the effective limits declaration after imposing the local final reservation.
  need(equal(t,p.limits,normalized,b),'PLAN_LIMIT_BINDING','/plan/limits','Effective limits cannot change between source planning and final binding.');
  const derived=deriveAppearancePlan(t,{document:v.before,command:p.command,context:p.context,appearanceSource:p.sourceCapture,limits:p.limits,...(p.command===null?{history:{request:p.original.hostRequest,targetDocument:p.targetDocument}}:{})},b);
  derived.limits=normalized;
  need(equal(t,withoutPlanning(p),withoutPlanning(derived),b),'PLAN_DERIVATION_BINDING','/plan','Target, fingerprints, resources and costs must derive freshly from the exact canonical command/source or exact history target.');
  capacity(t,v.before,p,c,b);const admitted=validatePreparedCapture(t,v.before,p,c,b),verified=costs(v.before,p.targetDocument,admitted.totals,b);
  const {planning:ignored,...claimed}=c.costBounds,{planning:unused,...actualCosts}=verified;
  need(equal(t,claimed,actualCosts,b),'CAPTURE_COST_BINDING','/appearanceCapture/costBounds','Actual admitted charges and freshly derived logical resource costs must match; no zero-cost echo.');
  const source=documentDigests(t,v.before,b),target=documentDigests(t,p.targetDocument,b),e=p.original.expected;
  const bindings={commandDigest:p.original.commandDigest,sourceWorkspaceDigest:source.workspaceDigest,targetWorkspaceDigest:target.workspaceDigest,sourceHostDocumentDigest:source.hostDocumentDigest,targetHostDocumentDigest:target.hostDocumentDigest,sourceAuthorityToken:e.hostAuthorityToken,authorityContextToken:e.authorityContextToken,sourceContentDigest:source.contentDigest,targetContentDigest:target.contentDigest,sourceDecorationDigest:source.decorationDigest,targetDecorationDigest:target.decorationDigest,sourceConstraintsDigest:source.stackConstraintsDigest,nextConstraintsDigest:target.stackConstraintsDigest,floorProfileDigest:source.floorProfileDigest,sourceResourceSetDigest:source.resourceSetDigest,targetResourceSetDigest:target.resourceSetDigest,resourceLeaseSetDigest:c.admittedResourceLeaseSetDigest,presentationProfileDigest:p.context.presentationProfileDigest,allocationLedgerDigest:hash(t,admitted,b)};
  shape(t,'bindings',bindings,b);
  const result={kind:'nautilus-tile-authoring-target',version:1,ok:true,committable:false,requestId:p.original.requestId,targetDocument:p.targetDocument,bindings,fingerprints:p.fingerprints,tilePreparation:'source-unchanged',costBounds:verified};
  b.output(result);result.costBounds.planning=b.snapshot();return freeze(result);
 }catch(e){return refusal(requestId,e);}
}
