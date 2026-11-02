// DATA only, after an actual ticket. No planner, stage, settlement or writer.
import {need,own,field,canonicalId,expectedKeys} from './data.js';

export function createExactOperationData(input){
 const {binding,before,target,original,command,bound,head,ticket,work,targetJSON}=own(input,['binding','before','target','original','command','bound','head','ticket','work','targetJSON']);
 const {codec,domain}=binding,origin=own(original,['action','requestId','commandDigest','expected','hostRequest']);
 const id=canonicalId(origin.requestId),action=origin.action;need(['edit','undo','redo'].includes(action),'C2_HOST_ACTION');
 need(typeof targetJSON==='string'&&head.matchesOwnedTicket(work,ticket,targetJSON)===true,'C2_HOST_ACTUAL_TICKET');
 need(field(ticket,'targetText')===targetJSON&&field(ticket,'action')===action,'C2_HOST_ACTUAL_TICKET');
 const source=codec.open(before);need(source===before,'C2_HOST_OWNED_CHECKPOINT');
 const document=domain.validateDocument(source.document),next=domain.validateDocument(target),expected=own(origin.expected,expectedKeys);
 const complete=domain.expected(document,expected.hostAuthorityToken,expected.authorityContextToken);for(const key of expectedKeys)need(expected[key]===complete[key],'C2_HOST_ORIGINAL_EXPECTED');
 need(domain.documentDigest(next)===domain.documentDigest(targetJSON),'C2_HOST_TICKET_TARGET');
 const request=origin.hostRequest;need(field(request,'id')===id,'C2_HOST_ORIGINAL_ID');
 if(action==='edit'){
  need(field(command,'requestId')===id&&field(bound,'requestId')===id&&field(bound,'targetDocument')===target&&field(bound,'tilePreparation')==='source-unchanged','C2_HOST_BOUND_TARGET');
  const commandExpected=own(field(command,'expected'),expectedKeys);for(const key of expectedKeys)need(commandExpected[key]===expected[key],'C2_HOST_ORIGINAL_EXPECTED');
 }else need(command===null&&bound===null&&field(request,'kind')==='smart-tile-history-restore'&&field(request,'action')===action&&field(request,'targetDocumentDigest')===domain.documentDigest(next),'C2_HOST_HISTORY_ORIGIN');
 // The real observed domain owns these reads/copies/digests. The Host does not
 // reconstruct source, prune immutable versions, or make another preparation.
 const operationBinding=domain.operationBinding(document,next,request,command,expected.authorityContextToken);need(operationBinding.commandDigest===origin.commandDigest,'C2_HOST_RETAINED_COMMAND');
 return {kind:codec.formats.operation,version:3,id,documentId:document.id,action,expected:{token:expected.hostAuthorityToken,contextToken:expected.authorityContextToken},request,
  target:domain.targetFields(next),binding:operationBinding,authoringBinding:action==='edit'?field(bound,'bindings'):null,tilePreparation:'source-unchanged',command};
}
