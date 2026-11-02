import {Budget,fail,readData,fields,shape,hash,equal,freeze,captureShape} from './data.js';
import {validateDocument,validateContext,validateResourceContext,documentDigests,presentationFingerprints} from './model.js';
import {stageOperations,validateAppearanceDocument} from './operations.js';
import {validateSourceCapture} from './ledger.js';
import {PROFILE_DIGEST,SCOPE} from './contract.js';
import {requirements,costs} from './requirements.js';
import {LIMITS} from './contract.js';
import {jsonBytes} from './budget.js';
import {Budget as LimitDeclaration} from '../budget.js';
import {finishData} from './output.js';

export function parsePlanInput(input,b,{alreadyRead=false}={}){
 const raw=alreadyRead?input:readData(input,b,b.limits.inputBytes);
 fields(raw,['document','command','context','appearanceSource','limits','history'],'/plan',['document','command','context']);
 const effective=new LimitDeclaration(raw.limits??{});Object.assign(b.limits,effective.limits);b.take(0);if(b.nodes>b.limits.nodes||b.inputBytes>b.limits.inputBytes||(b.maxDepthObserved??0)>b.limits.depth)fail('AUTHORING_INPUT_LIMIT','/limits','Captured source read exceeds effective tightened limits.');
 const field=(x,max)=>{if(typeof x==='string')return readData(x,b,max,{chargeInput:false});b.take(Math.ceil(jsonBytes(x,max)/64));return x;};
 const document=field(raw.document,b.limits.sourceBytes),command=raw.command===null?null:field(raw.command,b.limits.commandBytes),context=field(raw.context,b.limits.sourceBytes);
 return {...raw,document,command,context};
}
export function deriveAppearancePlan(t,v,b,{validateCapture=true}={}){
 const before=v.document,command=v.command,context=v.context,s=v.appearanceSource;
 if(!s)fail('C2_HOST_PROFILE_UNBOUND','/appearanceSource','Explicit C2 source capture and live Host pairing are required. Available profile strings alone do not enable C2.');
 validateContext(t,context,b);validateDocument(t,before,b);validateResourceContext(t,before,context,b);validateAppearanceDocument(t,before,b);
 for(const doc of [before]){if(doc.tileBundle.layout.instances.length>b.limits.owners||doc.tileBundle.recipes.length>b.limits.mapRecipes)fail('REFERENCE_MAP_LIMIT','/limits','All retained and unused owners/recipes count.');for(const k of ['definitions','presets','artwork'])if(doc.authoring.library[k].length>b.limits[k])fail('CONTENT_LIMIT','/limits/'+k,'Every retained immutable record counts.');}
 const source=documentDigests(t,before,b);let original,target;
 if(command!==null){
  if(v.history!==undefined)fail('HISTORY_EDIT_CONFLICT','/history','Edits carry no history restore target.');
  shape(t,'command',command,b);if(command.operations.length>b.limits.operations)fail('OPERATION_LIMIT','/operations','Canonical operation cap exceeded.');
  original={action:'edit',requestId:command.requestId,commandDigest:hash(t,command,b),expected:command.expected,hostRequest:{id:command.requestId,kind:'nautilus-tile-authoring-source-unchanged',version:1}};
  target=stageOperations(t,before,command,context,b);
  if(equal(t,target,before,b))fail('NO_CHANGE','/operations','No write or history change; retain redo.');
  if(before.contentRevision===Number.MAX_SAFE_INTEGER)fail('CONTENT_REVISION_LIMIT','/contentRevision','Content revision cannot overflow.');
  target.contentRevision=before.contentRevision+1;
 }else{
  fields(v.history,['request','targetDocument'],'/history');const request=v.history.request;
  fields(request,['id','kind','action','targetDocumentDigest'],'/history/request');shape(t,'id',request.id,b);
  if(request.kind!=='smart-tile-history-restore'||!['undo','redo'].includes(request.action))fail('HISTORY_REQUEST','/history/request','Preserve the existing original history request/action.');
  target=readData(v.history.targetDocument,b,b.limits.sourceBytes,{chargeInput:false});
  if(request.targetDocumentDigest!==hash(t,target,b))fail('HISTORY_TARGET_DIGEST','/history','Restore the exact historical target and contentRevision, without reconstruction.');
  original={action:request.action,requestId:request.id,commandDigest:hash(t,null,b),expected:s.original.expected,hostRequest:request};
  if(equal(t,before,target,b))fail('NO_CHANGE','/history','Exact current target is not another edit.');
  if(!equal(t,before.authoring.decorations.groups,target.authoring.decorations.groups,b))fail('C2_GROUPING_UNAVAILABLE','/history','Group changes remain Stage C.');
 }
 for(const [key,want]of Object.entries(source))if(original.expected[key]!==want)fail('STALE_SOURCE','/expected/'+key,'Every complete source/public digest must match the original capture.');
 if(original.expected.hostAuthorityToken!==context.hostAuthorityToken||original.expected.authorityContextToken!==context.authorityContextToken)fail('STALE_CONTEXT','/expected','Original source authority/context must match.');
 if(validateCapture)validateSourceCapture(t,before,context,s,original,b);
 validateDocument(t,target,b,{legacy:false});validateAppearanceDocument(t,target,b);
 if(!equal(t,before.tileBundle,target.tileBundle,b)||!equal(t,before.constraints,target.constraints,b)||!equal(t,before.sourceJSON,target.sourceJSON,b)||!equal(t,before.floorBinding,target.floorBinding,b)||!equal(t,before.finishBinding,target.finishBinding,b)||before.id!==target.id)fail('C2_GEOMETRY_ROUTE_REQUIRED','/target','Frozen Plan2 is appearance-only. Mixed geometry/default placement needs a separately accepted combined route.');
 const fingerprints={source:presentationFingerprints(t,before,context,b),target:presentationFingerprints(t,target,context,b)};
 if(fingerprints.source.geometry!==fingerprints.target.geometry)fail('GEOMETRY_CHANGED','/target','Appearance-only must preserve complete source geometry.');
 const resourceRequirements=requirements(t,before,target,b),decorationChanged=!equal(t,before.authoring.decorations,target.authoring.decorations,b);
 const preparationNeed=!decorationChanged?'encoded-only-retain-appearance':'prepare-overlay';
 const result={kind:'nautilus-tile-authoring-browser-appearance-plan',version:1,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST,ok:true,committable:false,route:'appearance-only',tilePreparation:'source-unchanged',original,command,limits:{...b.limits},context,sourceCapture:s,attemptBudget:b.stamp(v=>hash(t,v,b)),sourceCaptureDigest:hash(t,s,b),sourceHostDocumentDigest:source.hostDocumentDigest,targetHostDocumentDigest:hash(t,target,b),fingerprints,request:null,constraints:before.constraints,targetDocument:target,resourceRequirements,preparationNeed,costBounds:costs(before,target,context.allocations,b)};
 return result;
}
export function finishPlan(t,p,b){captureShape(t,'BrowserAppearancePlan',p,b);return finishData(p,b);}
