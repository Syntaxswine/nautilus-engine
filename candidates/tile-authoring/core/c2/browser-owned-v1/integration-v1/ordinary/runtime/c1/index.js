import {tightenOrdinaryBudget,bindOrdinaryDispatch} from '../../scope.js';
import {jsonBytes} from '../../../../budget.js';
import {finishData} from '../../../../output.js';
// Public pure value/planning entry. No retained host, journal or renderer.
import {Budget,fail,readData,corePort,fields,shape,hash,equal,freeze,clone,refusal} from '../../data.js';
import {validateDocument,validateContext,documentDigests,presentationFingerprints,sourceProjection,resourceRefs,validateResourceContext,authoringCosts} from './model.js';
import {stageOperations} from './operations.js';
import {geometryPlan} from './geometry.js';
export {tileAuthoringDiscovery} from './contract.js';
export {createRectangleDefinition} from './geometry.js';
export {sealTileContentRecord,inspectTileAuthoringRequirements} from './model.js';
export {bindTileAuthoringTarget} from './target.js';
function stagedData(d){return {authoring:d.authoring,resourceRefs:d.resourceRefs,recipes:d.tileBundle.recipes,owners:d.tileBundle.layout.instances};}
export function planTileAuthoring(actual,input){
 let b=new Budget(),requestId='invalid-request';try{
 const t=corePort(actual),raw=readData(input,b,b.limits.inputBytes);fields(raw,['document','command','context','limits'],'/plan',['document','command','context']);tightenOrdinaryBudget(raw.limits??{});
 const field=(v,max)=>typeof v==='string'?readData(v,b,max,{chargeInput:false}):(b.take(Math.ceil(jsonBytes(v,max)/64)),v);const before=field(raw.document,b.limits.sourceBytes),command=field(raw.command,b.limits.commandBytes),context=field(raw.context,b.limits.sourceBytes);requestId=command?.requestId;shape(t,'command',command,b);if(command.operations.length>b.limits.operations)fail('OPERATION_LIMIT','/operations','Operation count exceeds captured bound.');validateContext(t,context,b);validateDocument(t,before,b);
 const source=documentDigests(t,before,b);for(const [key,value]of Object.entries(source))if(command.expected[key]!==value)fail('STALE_SOURCE','/expected/'+key,'Capture every exact source/document/profile/resource digest from the one host snapshot.');if(command.expected.hostAuthorityToken!==context.hostAuthorityToken||command.expected.authorityContextToken!==context.authorityContextToken)fail('STALE_CONTEXT','/expected','Captured host/journal/context tokens changed.');validateResourceContext(t,before,context,b);bindOrdinaryDispatch(before,command,b);
 const staged=stageOperations(t,before,command,context,b);if(equal(t,staged,before,b))fail('NO_CHANGE','/operations','No write/history change; retain redo.');if(before.contentRevision===Number.MAX_SAFE_INTEGER)fail('CONTENT_REVISION_LIMIT','/contentRevision','Content revision cannot overflow.');
 const metadata=equal(t,before.tileBundle,staged.tileBundle,b),stack=metadata?null:geometryPlan(t,before,staged,context,b,command.requestId),target=metadata?{...staged,contentRevision:before.contentRevision+1}:null;if(target)validateDocument(t,target,b,{legacy:false});
 const fingerprints={source:presentationFingerprints(t,before,context,b),target:target?presentationFingerprints(t,target,context,b):null};if(metadata&&!equal(t,fingerprints.source,fingerprints.target,b))fail('METADATA_GEOMETRY_CHANGE','/target','Source-unchanged requires equal geometry AND appearance fingerprints.');
 const result={kind:'nautilus-tile-authoring-plan',version:1,ok:true,committable:false,requestId:command.requestId,route:metadata?'source-unchanged':'public-v1-repair',command,commandDigest:hash(t,command,b),expected:clone(command.expected,b),context,limits:clone(b.limits,b),request:stack?.request??null,constraints:stack?.constraints??clone(before.constraints,b),stackBinding:stack?.binding??null,staged:stagedData(staged),targetDocument:target,fingerprints,costBounds:authoringCosts(staged,context,b)};
 return finishData(result,b);
 }catch(e){return refusal(requestId,e);}
}
