// PRIVATE browser family. Headless pure data, no registration or write authority.
import {jsonBytes} from './budget.js';
import {Budget,readData,corePort,fields,shape,hash,equal,freeze,fail,captureShape} from './data.js';
import {pairCoreOwner} from './meter.js';
import {PROFILES,PROFILE_DIGEST,SCOPE,COVERAGE,RESOURCE_CATALOGUE_BINDING} from './contract.js';
import {validateContext,validateDocument,validateResourceContext,documentDigests} from './model.js';
import {validateAppearanceDocument} from './operations.js';
import {deriveAppearancePlan,finishPlan} from './planning.js';
import {deriveDataCapacity} from './capacity.js';
import {validatePreparedData} from './prepared.js';
import {validateSourceCapture,costTotals,validateLedgerData,validateTransitionData} from './ledger.js';
import {costs} from './requirements.js';
import {finishData} from './output.js';
import {deriveOwnedSurfaceTarget} from './surface-target.js';
export {createBrowserAttemptOwner} from './meter.js';
export {PROFILE_DIGEST,SCOPE,PROFILES} from './contract.js';
const need=(v,code,path,message)=>{if(!v)fail(code,path,message);};
const own=(v,k)=>{const d=Object.getOwnPropertyDescriptor(v??{},k);need(d&&Object.hasOwn(d,'value'),'BROWSER_OWN_FIELD','/'+k,'Use own data fields.');return d.value;};
export function createBrowserCoreCandidate({tiles,attemptOwner,presentationProfile}){
 const t=corePort(tiles),pair=pairCoreOwner(attemptOwner),sources=new WeakMap(),plans=new WeakMap(),capacities=new WeakMap(),captures=new WeakMap();
 // Constructor identity is descriptive; it never binds an actual Native port.
 fields(presentationProfile,['id','version','sourceCommit'],'/presentationProfile');const p=Object.freeze(Object.fromEntries(['id','version','sourceCommit'].map(k=>[k,own(presentationProfile,k)])));need(Object.keys(p).sort().join(',')==='id,sourceCommit,version'&&typeof p.id==='string'&&Number.isSafeInteger(p.version)&&p.version>0&&/^[a-f0-9]{40}$/.test(p.sourceCommit),'BROWSER_PRESENTATION_PROFILE','/presentationProfile','Fixed reviewed provider descriptor required at construction.');
 const presentationProfileDigest=t.tileLayoutToken({provider:p,accountingProfileDigest:PROFILE_DIGEST});
 function run(scope,phase,fn){fields(scope,['attempt','reservation','source'],'/scope');return pair.execute(scope.attempt,scope.reservation,phase,scope.source,sink=>{const b=sink.budget??new Budget({},sink);if(!sink.budget)sink.setBudget(b);else b.attach(sink);return fn(b);});}
 function owned(map,value,attempt,name){const x=map.get(value);need(x&&x.attempt===attempt,'BROWSER_OWNED_'+name,'/'+name,'Use this exact intrinsic Core-produced immutable value in the same attempt; serialized DTOs cannot buy work.');return x;}
 const api={
  presentationProfileDigest,
  flowBindings:()=>COVERAGE.separateMonotonicFlowDomains,
  liveBindings:()=>freeze({CoreReferenceSink:'BOUND',Host:'UNBOUND',Native:'UNBOUND',Artist:'UNBOUND',Decoder:'UNBOUND',actualCodec:'UNBOUND',publicRepair:'UNBOUND'}),
  deriveSurfaceTarget(input,scope){return run(scope,'source',b=>{need(own(input,'document')===scope.source,'BROWSER_SOURCE_IDENTITY','/document','Use the same original source.');const result=deriveOwnedSurfaceTarget(t,input,b);b.bindSource(result.sourceDocumentDigest);return result;});},
  captureSourceData(input,scope){return run(scope,'source',b=>{
   const v=readData(input,b,b.limits.inputBytes);fields(v,['document','command','context','observation','limits','history'],'/source',['document','command','context','observation']);
   need(own(input,'document')===scope.source,'BROWSER_SOURCE_IDENTITY','/document','Begin before any source inspection using this original source object.');
   if(v.limits){for(const [k,n]of Object.entries(v.limits)){if(!Object.hasOwn(b.limits,k)||!Number.isSafeInteger(n)||n<0||n>b.limits[k])fail('INVALID_LIMIT','/limits/'+k,'Tightening only.');b.limits[k]=n;}}
   b.take(0);b.input(0);if(b.nodes>b.limits.nodes||(b.maxDepthObserved??0)>b.limits.depth)fail('AUTHORING_NODE_LIMIT','/limits','Captured source exceeds tightened node/depth limits.');
   b.take(Math.ceil(jsonBytes(v.document,b.limits.sourceBytes)/64));if(v.command!==null)b.take(Math.ceil(jsonBytes(v.command,b.limits.commandBytes)/64));
   validateContext(t,v.context,b);need(v.context.presentationProfileDigest===presentationProfileDigest,'BROWSER_PRESENTATION_BINDING','/context','Constructor composite profile must match.');validateDocument(t,v.document,b);validateResourceContext(t,v.document,v.context,b);validateAppearanceDocument(t,v.document,b);
   const digests=documentDigests(t,v.document,b);b.bindSource(digests.hostDocumentDigest);
   let original;if(v.command!==null){shape(t,'command',v.command,b);original={action:'edit',requestId:v.command.requestId,commandDigest:hash(t,v.command,b),expected:v.command.expected,hostRequest:{id:v.command.requestId,kind:'nautilus-tile-authoring-source-unchanged',version:1}};}else{fields(v.history,['request','targetDocument','expected'],'/history');original={action:v.history.request.action,requestId:v.history.request.id,commandDigest:hash(t,null,b),expected:v.history.expected,hostRequest:v.history.request};}
   need(original.requestId===b.sink.snapshot().requestId,'BROWSER_ORIGINAL_REQUEST','/requestId','Attempt starts with the exact original request.');for(const [k,want]of Object.entries(digests))need(original.expected[k]===want,'STALE_SOURCE','/expected/'+k,'Complete original source must match.');
   fields(v.observation,['authority','sourceResourceRefs','resourceLeaseSetDigest','ledger','visual','history'],'/observation');
   const result={resourceCatalogue:RESOURCE_CATALOGUE_BINDING,kind:'nautilus-tile-authoring-browser-source-capture',version:1,profiles:PROFILES,original,...v.observation,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST,attemptBudget:b.stamp(x=>hash(t,x,b))};validateSourceCapture(t,v.document,v.context,result,original,b);
   const capture=finishData(result,b);sources.set(capture,{attempt:scope.attempt,before:freeze(v.document),context:freeze(v.context),command:freeze(v.command),history:freeze(v.history),source:scope.source});return capture;
  });},
  plan(sourceCapture,scope){return run(scope,'planning',b=>{const x=owned(sources,sourceCapture,scope.attempt,'SOURCE');need(x.source===scope.source,'BROWSER_SOURCE_IDENTITY','/source','Exact opaque source required.');const p=deriveAppearancePlan(t,{document:x.before,command:x.command,context:x.context,appearanceSource:sourceCapture,...(x.command===null?{history:{request:x.history.request,targetDocument:x.history.targetDocument}}:{})},b);const plan=finishPlan(t,p,b);plans.set(plan,{...x,plan});return plan;});},
  capacity(plan,input,scope){return run(scope,'capacity',b=>{const x=owned(plans,plan,scope.attempt,'PLAN'),result=deriveDataCapacity(t,x,input,b);capacities.set(result,{attempt:scope.attempt,plan});return result;});},
  validatePreparedData(plan,capacity,observations,scope){return run(scope,'prepared-data',b=>{const x=owned(plans,plan,scope.attempt,'PLAN'),q=owned(capacities,capacity,scope.attempt,'CAPACITY');need(q.plan===plan,'BROWSER_CAPACITY_BINDING','/capacity','Use this original plan.');const out=validatePreparedData(t,x,observations,capacity,b);captures.set(out.capture,{attempt:scope.attempt,plan,capacity,ledger:out.ledger});return out.capture;});},
  bind(plan,capacity,capture,scope){return run(scope,'final-bind',b=>{
   const x=owned(plans,plan,scope.attempt,'PLAN'),q=owned(capacities,capacity,scope.attempt,'CAPACITY'),c=owned(captures,capture,scope.attempt,'CAPTURE');need(q.plan===plan&&c.plan===plan&&c.capacity===capacity&&b.verifyStamp(capture.attemptBudget),'BROWSER_BIND_ATTEMPT','/bind','Same original plan, capacity, observation and intrinsic allowance required.');
   const before=readData(scope.source,b,b.limits.sourceBytes);need(hash(t,before,b)===plan.sourceHostDocumentDigest&&b.boundSourceDigest===plan.sourceHostDocumentDigest,'BROWSER_SOURCE_CHANGED','/source','Final headless source read must equal the paid complete original; real Host currentness remains UNBOUND.');
   const source=documentDigests(t,before,b),target=documentDigests(t,plan.targetDocument,b),e=plan.original.expected,l=c.ledger;
   const bindings={commandDigest:plan.original.commandDigest,sourceWorkspaceDigest:source.workspaceDigest,targetWorkspaceDigest:target.workspaceDigest,sourceHostDocumentDigest:source.hostDocumentDigest,targetHostDocumentDigest:target.hostDocumentDigest,sourceAuthorityToken:e.hostAuthorityToken,authorityContextToken:e.authorityContextToken,sourceContentDigest:source.contentDigest,targetContentDigest:target.contentDigest,sourceDecorationDigest:source.decorationDigest,targetDecorationDigest:target.decorationDigest,sourceConstraintsDigest:source.stackConstraintsDigest,nextConstraintsDigest:target.stackConstraintsDigest,floorProfileDigest:source.floorProfileDigest,sourceResourceSetDigest:source.resourceSetDigest,targetResourceSetDigest:target.resourceSetDigest,resourceLeaseSetDigest:capture.admittedResourceLeaseSetDigest,presentationProfileDigest:plan.context.presentationProfileDigest,allocationLedgerDigest:hash(t,l,b)};shape(t,'bindings',bindings,b);
   const result={kind:'nautilus-tile-authoring-browser-target',version:1,ok:true,committable:false,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST,requestId:plan.original.requestId,targetDocument:plan.targetDocument,bindings,fingerprints:plan.fingerprints,tilePreparation:'source-unchanged',costBounds:costs(before,plan.targetDocument,costTotals(capture.peakTotals),b),attemptBudget:b.stamp(v=>hash(t,v,b))};captureShape(t,'BrowserAuthoringTarget',result,b);return finishData(result,b);
  });},
  validateLedgerData(input,scope){return run(scope,'prepared-data',b=>{const v=readData(input,b,b.limits.inputBytes);fields(v,['ledger','documents'],'/ledger');validateLedgerData(t,v.ledger,b,v.documents);return finishData({kind:'nautilus-browser-ledger-data-check',version:1,valid:true,liveAuthority:false,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST},b);});},
  validateTransitionData(input,scope){return run(scope,'prepared-data',b=>{const v=readData(input,b,b.limits.inputBytes);fields(v,['before','after','requestId','documents'],'/transition');validateLedgerData(t,v.before,b,v.documents);validateTransitionData(t,v.before,v.after,v.requestId,b,v.documents);return finishData({kind:'nautilus-browser-transition-data-check',version:1,valid:true,liveAuthority:false,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST},b);});},
  requireLiveBindings(){fail('BROWSER_LIVE_BACKENDS_UNBOUND','/bindings','Actual Host, Native, Artist, Decoder, codec and public repair hooks are UNBOUND. No Apply, storage, ticket, WAL, recovery or live preparation is implemented here.');}
 };return Object.freeze(api);
}
