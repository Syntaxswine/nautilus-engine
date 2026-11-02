// Continued actual Core algorithms on the SAME private source registry.
// This file does not change the frozen ed66/30b factory or accept its tokens.
import * as ActualTiles from '../../../../../../packages/tiles-core/index.js';
import {Budget,readData,fields,shape,hash,freeze,fail} from '../data.js';
import {jsonBytes} from '../budget.js';
import {PROFILES,PROFILE_DIGEST,SCOPE,RESOURCE_CATALOGUE_BINDING} from '../contract.js';
import {validateContext,validateDocument,validateResourceContext,documentDigests} from '../model.js';
import {validateAppearanceDocument} from '../operations.js';
import {validateSourceCapture} from '../ledger.js';
import {deriveAppearancePlan,finishPlan} from '../planning.js';
import {finishData} from '../output.js';
import {deriveOwnedSurfaceTarget} from '../surface-target.js';
import {sourceAccess} from './owner.js';
import {deriveActualCapacity} from './capacity.js';
const cores=new WeakMap();
export function continuedCoreAccess(value,owner){const x=cores.get(value);if(!x||x.owner!==owner)fail('C2_CORE_OWNER_UNBOUND','/core','Actual same-owner continued Core required.');return x;}
const own=(v,k)=>{const d=Object.getOwnPropertyDescriptor(v??{},k);if(!d||!Object.hasOwn(d,'value'))fail('C2_CORE_DATA','/'+k,'Own data required.');return d.value;};
const need=(v,c,p,m)=>{if(!v)fail(c,p,m);};
export function createContinuedCore(owner,{tiles=ActualTiles,presentationProfile}){
 if(tiles!==ActualTiles)fail('C2_ACTUAL_CORE_REQUIRED','/tiles','Use the actual public tiles namespace.');
 fields(presentationProfile,['id','version','sourceCommit'],'/presentationProfile');const p=Object.freeze(Object.fromEntries(['id','version','sourceCommit'].map(k=>[k,own(presentationProfile,k)])));need(typeof p.id==='string'&&Number.isSafeInteger(p.version)&&p.version>0&&/^[a-f0-9]{40}$/.test(p.sourceCommit),'C2_PRESENTATION_PROFILE','/profile','Fixed provider descriptor required.');
 const t=tiles,access=sourceAccess(owner),sources=new WeakMap(),plans=new WeakMap(),capacities=new WeakMap(),presentationProfileDigest=t.tileLayoutToken({provider:p,accountingProfileDigest:PROFILE_DIGEST});
 function run(phase,fn){access.requirePurpose('authoring');const {a,r}=access.current();if(r.phase!==phase)fail('C2_CORE_PHASE','/phase','Use the actual reserved '+phase+' phase.');const sink=access.coreSink(),b=sink.budget??new Budget({},sink);if(!sink.budget)sink.setBudget(b);else b.attach(sink);return fn(b,a);}
 const owned=(map,value,a,name)=>{const x=map.get(value);need(x&&x.attempt===a,'C2_CORE_'+name+'_UNBOUND','/'+name,'Exact same-attempt actual Core output required.');return x;};
 const api=Object.freeze({
  presentationProfileDigest,
  deriveSurfaceTarget(input){return run('source',(b,a)=>{need(a.sourceAliases.has(own(input,'document')),'C2_SOURCE_IDENTITY','/document','The actual original source is required.');const out=deriveOwnedSurfaceTarget(t,input,b);b.bindSource(out.sourceDocumentDigest);return out;});},
  captureSourceData(input){return run('source',(b,a)=>{
   need(a.sourceAliases.has(own(input,'document')),'C2_SOURCE_IDENTITY','/document','Begin before this exact original source read.');
   const v=readData(input,b,b.limits.inputBytes);fields(v,['document','command','context','observation','limits','history'],'/source',['document','command','context','observation']);
   if(v.limits)for(const [k,n]of Object.entries(v.limits)){if(!Object.hasOwn(b.limits,k)||!Number.isSafeInteger(n)||n<0||n>b.limits[k])fail('INVALID_LIMIT','/limits/'+k,'Tightening only.');b.limits[k]=n;}
   b.take(0);b.input(0);if(b.nodes>b.limits.nodes||(b.maxDepthObserved??0)>b.limits.depth)fail('AUTHORING_NODE_LIMIT','/limits','Captured source exceeds tightened bounds.');
   b.take(Math.ceil(jsonBytes(v.document,b.limits.sourceBytes)/64));if(v.command!==null)b.take(Math.ceil(jsonBytes(v.command,b.limits.commandBytes)/64));
   validateContext(t,v.context,b);need(v.context.presentationProfileDigest===presentationProfileDigest,'C2_PRESENTATION_BINDING','/context','Exact constructor composite profile required.');validateDocument(t,v.document,b);validateResourceContext(t,v.document,v.context,b);validateAppearanceDocument(t,v.document,b);
   access.bindWorkProfile('appearance');const digests=documentDigests(t,v.document,b);b.bindSource(digests.hostDocumentDigest);let original;
   if(v.command!==null){shape(t,'command',v.command,b);original={action:'edit',requestId:v.command.requestId,commandDigest:hash(t,v.command,b),expected:v.command.expected,hostRequest:{id:v.command.requestId,kind:'nautilus-tile-authoring-source-unchanged',version:1}};}
   else{fields(v.history,['request','targetDocument','expected'],'/history');original={action:v.history.request.action,requestId:v.history.request.id,commandDigest:hash(t,null,b),expected:v.history.expected,hostRequest:v.history.request};}
   need(original.requestId===a.requestId,'C2_ORIGINAL_REQUEST','/requestId','Use only the real original request ID.');for(const [key,value]of Object.entries(digests))need(original.expected[key]===value,'STALE_SOURCE','/expected/'+key,'Complete original source must match.');
   fields(v.observation,['authority','sourceResourceRefs','resourceLeaseSetDigest','ledger','visual','history'],'/observation');
   const result={resourceCatalogue:RESOURCE_CATALOGUE_BINDING,kind:'nautilus-tile-authoring-browser-source-capture',version:1,profiles:PROFILES,original,...v.observation,accountingScope:SCOPE,profileDigest:PROFILE_DIGEST,attemptBudget:b.stamp(x=>hash(t,x,b))};validateSourceCapture(t,v.document,v.context,result,original,b);
   const capture=finishData(result,b);sources.set(capture,{attempt:a,before:freeze(v.document),context:freeze(v.context),command:freeze(v.command),history:freeze(v.history),source:a.source});return capture;
  });},
  plan(capture){return run('planning',(b,a)=>{const x=owned(sources,capture,a,'SOURCE');const p=deriveAppearancePlan(t,{document:x.before,command:x.command,context:x.context,appearanceSource:capture,...(x.command===null?{history:{request:x.history.request,targetDocument:x.history.targetDocument}}:{})},b),plan=finishPlan(t,p,b);plans.set(plan,{...x,plan});return plan;});},
  capacity(plan,input){return run('capacity',(b,a)=>{const x=owned(plans,plan,a,'PLAN'),capacity=deriveActualCapacity(owner,t,x,input,b);capacities.set(capacity,{attempt:a,plan,...input});return capacity;});},
  validatePrepared(){fail('C2_ARTIST_SOURCE_UNBOUND','/prepared','Actual formal Artist/Native/decoder receipt adapter is not paired. DTO prepared captures cannot substitute.');},
  bind(){access.requirePurpose('authoring');fail('C2_FINAL_BIND_UNBOUND','/bind','Actual presentation source receipt and exact ticket/WAL validation are not paired.');},
  state:()=>freeze({continuedCore:'BOUND',oneOwner:true,authoringOnly:true,ownedPlan:'BOUND',headCapacity:'BOUND',presentation:'UNBOUND',finalBind:'UNBOUND',actualWal:'UNBOUND',publicActivation:false})
 });cores.set(api,{owner,access,sources,plans,capacities});return api;
}
