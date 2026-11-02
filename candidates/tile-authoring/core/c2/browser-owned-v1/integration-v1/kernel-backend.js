// Actual fixed-source observer backend. Numeric increments originate only at
// the pinned source hooks; no returned work DTO or public report is accepted.
import {fail} from '../data.js';
import {jsonBytes,utf8Bytes} from '../budget.js';
import {sourceAccess} from './owner.js';
const codec=['open','create','serialize','token','stage','settle','inspectRecovery','targetDocument'];
const domain=['validateDocument','documentDigest','documentBindings','expected','operationBinding','targetFields','targetDocument','contextToken'];
const entries=new Set(['reader.strict','data.utf8','data.digest','data.read','data.fields','data.freeze','v3.freeze','v3.construct','v3.documentFacts','v3.storage.construct','session.journal.construct','session.snapshot','journal.historyBytes','authority.construct','source.requirements','session.bundle.open',...['construct','context','presentationFingerprint','validateDraft','requestId','plan','editOperation','validateHistoryTarget','admitPresentation','historyOperation','validateCommit','actions','snapshot','authoringSnapshot','settlement','authoringReview','query','validateInspection','setInspection'].map(n=>'profile.'+n),...['read','token','stage','commit','recover'].map(n=>'authority.'+n),...codec.map(n=>'codec.'+n),...codec.filter(n=>n!=='targetDocument').map(n=>'v3.'+n),...domain.map(n=>'v3.domain.'+n),...['data','digest','utf8','clone','stringify','parse'].map(n=>'host.'+n),...['snapshot','beginEdit','beginOpen','beginUndo','beginRedo','beginRebuild','cancel','setContext','reject','accept','utf8'].map(n=>'journal.'+n)]);
const stringify=new Set(['canonical.key-json','canonical.scalar-json','data.output-json','codec.json.stringify','v3.json.stringify','reader.object-output']);
const parse=new Set(['data.parse','codec.json.parse','v3.json.parse','reader.string-decode']);
const encode=new Set(['data.utf8.encode','journal.utf8.encode']);
const clone=new Set(['codec.structuredClone']);
const keys=new Set(['canonical.keys-sort','data.own-keys','data.field-keys','data.freeze-values']);
const constructs=new Set(['session.journal.construct']);
const lookups=new Set(['codec.owned-encoding-lookup']);
const hashes=new Set(['frozen.sha256','frozen.tiles.hash']);
export function createKernelBackend(owner,source,{onComplete=()=>{},onSerializer=()=>{},validateEntry=()=>{}}={}){
 const access=sourceAccess(owner),calls=new WeakMap(),claims=new WeakMap();let active=null,epoch=0;
 const record=token=>{const r=calls.get(token),ctx=access.peek();if(!r||!ctx||r.attempt!==ctx.a||r.lease!==ctx.r||r.closed)fail('C2_SOURCE_CALL_UNBOUND','/observer','Actual same-phase source call required.');return r;};
 const movement=r=>['history-head','history-target','obligations'].includes(r.lease.phase)||r.name.startsWith('journal.')?'historyFlowBytes':'checkpointFlowBytes';
 const api=Object.freeze({
  begin(name,parent,args){const {a,r}=access.current();if(['v3.stage','codec.stage','authority.stage'].includes(name)){access.requirePurpose('authoring');const op=args[name==='authority.stage'?0:1],id=Object.getOwnPropertyDescriptor(op??{},'id');if(!id||!Object.hasOwn(id,'value')||id.value!==a.requestId)fail('C2_ORIGINAL_REQUEST','/operation/id','Stage only the active actual original authoring request.');}if(/^journal\.(beginEdit|beginOpen|beginUndo|beginRedo|beginRebuild|cancel|setContext|reject|accept)$/.test(name))access.requirePurpose('authoring');validateEntry(name,args);if(!entries.has(name))fail('C2_SOURCE_HOOK_UNBOUND','/observer/'+name,'This fixed source entry has no reviewed coverage row.');const previous=active;if(parent!==null){const p=record(parent);if(previous!==parent||p.attempt!==a)fail('C2_SOURCE_PARENT','/observer','Nested source joins its actual private parent.');}else if(previous)fail('C2_SOURCE_REENTRY','/observer','No unrelated nested invocation.');access.actual('kernel',1,{hostNodeVisits:1});const token=Object.freeze({});calls.set(token,{name,args,parent,attempt:a,lease:r,root:parent?calls.get(parent).root:++epoch,closed:false,previous});active=token;return token;},
  visit(call,path,level){record(call);if(typeof path!=='string'||!Number.isSafeInteger(level)||level<0)fail('C2_SOURCE_VISIT','/observer','Actual bounded source visit required.');access.actual('kernel',1,{hostNodeVisits:1});},
  text(call,value){record(call);if(typeof value!=='string')fail('C2_SOURCE_TEXT','/observer','Actual source text required.');access.actual('kernel',Math.ceil(value.length/16));},
  key(call,value){record(call);if(typeof value!=='string')fail('C2_SOURCE_KEY','/observer','Only actual string field keys are supported.');access.actual('kernel',Math.ceil(value.length/16));},
  beforeOpaque(call,site,input){const r=record(call);if(![...stringify,...parse,...encode,...clone,...keys,...hashes,...constructs,...lookups].includes(site))fail('C2_OPAQUE_UNBOUND','/observer/'+site,'Actual opaque source coverage is unavailable; no missing-source allowance.');
   let keyCharge=null;if(keys.has(site)){source.ensureSafe(input,r.root);keyCharge=source.keyBound(input,site);}
   let n;if(keyCharge)n=0;else if(parse.has(site)||encode.has(site)||lookups.has(site)||site==='frozen.sha256'){if(typeof input!=='string')fail('C2_OPAQUE_INPUT','/observer','Actual source string required.');if(input.length>16000000)fail('C2_OPAQUE_LIMIT','/observer','Fixed source logical payload exceeds its conservative bound.');n=utf8Bytes(input);if(n>16000000)fail('C2_OPAQUE_LIMIT','/observer','Fixed source UTF8 payload exceeds its bound.');}else{source.ensureSafe(input,r.root);n=jsonBytes(input,16000000);}
   // Existing ceil(logical UTF8/64) transfer/hash policy. Full precharge is
   // explicitly conservative; it is never presented as engine internal steps.
   access.conservative('kernel',keyCharge?.reference??Math.ceil(n/64));const claim=Object.freeze({}),c={call,site,input,bound:n,closed:false,root:r.root};claims.set(claim,c);access.opaqueBegin(c);return claim;
  },
  afterOpaque(call,claim,result){const r=record(call),c=claims.get(claim);if(!c||c.call!==call||c.closed)fail('C2_OPAQUE_OWNERSHIP','/observer','Actual source opaque claim required once.');
   if(result&&typeof result.then==='function')fail('C2_ASYNC_SOURCE_UNBOUND','/observer','A Promise is not synchronous source completion.');
   c.closed=true;access.opaqueEnd(c);
   if(parse.has(c.site)||clone.has(c.site)||keys.has(c.site))source.markSafe(result,r.root);
   if(stringify.has(c.site)){if(typeof result!=='string')fail('C2_OPAQUE_RESULT','/observer','Actual JSON string required.');const actualEncodedBytes=utf8Bytes(result);access.movement(movement(r),actualEncodedBytes);source.noteEncoded(c.input,result,actualEncodedBytes);onSerializer(c.input,result,r,actualEncodedBytes);}
   else if(encode.has(c.site)){if(!(result instanceof Uint8Array)||result.byteLength!==c.bound)fail('C2_OPAQUE_RESULT','/observer','Actual UTF8 receiver length required.');access.movement(movement(r),result.byteLength);}
   else if(parse.has(c.site)||clone.has(c.site))access.movement(movement(r),c.bound);
  },
  failOpaque(call,claim,error){record(call);const c=claims.get(claim);if(!c||c.call!==call||c.closed)fail('C2_OPAQUE_OWNERSHIP','/observer','Actual failed source claim required.');c.closed=true;access.opaqueEnd(c);access.fail();},
  complete(call,value){const r=record(call);if(active!==call)fail('C2_SOURCE_PARENT','/observer','Complete the actual inner source call first.');if(value&&typeof value.then==='function')fail('C2_ASYNC_SOURCE_UNBOUND','/observer','Async source needs an actual asynchronous lifecycle hook.');onComplete(r,value);r.closed=true;active=r.previous;},
  fail(call,error){const r=calls.get(call);if(!r||r.closed)return;while(active){const x=calls.get(active);if(!x)break;x.closed=true;active=x.previous;if(x===r)break;}access.fail();}
 });return Object.freeze({backend:api,actualFrame(){const r=active?calls.get(active):null,ctx=access.peek();return r&&!r.closed&&ctx&&r.attempt===ctx.a&&r.lease===ctx.r?r:null;}});
}
