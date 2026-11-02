// Actual private Kernel constructor and source-fact adapter. Original algorithms
// execute in the fixed 4ade source closure, not a substitute codec or journal.
import {createTileAuthoringCheckpointCodec} from './kernel/runtime/apps/editor/tile-authoring/checkpoint.js';
import {createSmartTileAuthority,createPrivateAuthorityObservationPort} from './kernel/runtime/apps/editor/smart-tile/authority.js';
import {createSmartTileSession} from './kernel/runtime/apps/editor/smart-tile/session.js';
import {bindPrivateObservation} from './kernel/runtime/observation.js';
import {createContinuedSource} from './source.js';
import {createKernelBackend} from './kernel-backend.js';
import {sourceAccess} from './owner.js';
import {createTileAuthoringSessionProfile} from './root-profile.js';
import {invokeRootProfileSource} from './root-profile-helpers.js';
import {createOrdinaryCore} from './ordinary/index.js';
import {createActualSessionJournal} from './journal.js';
import {SMART_TILE_LIMITS} from './kernel/deps/apps/editor/smart-tile/contract.js';
import {fail,freeze} from '../data.js';
const actualKernels=new WeakMap();
export function kernelSourceAccess(value,owner){const x=actualKernels.get(value);if(!x||x.owner!==owner)fail('C2_KERNEL_SOURCE_UNBOUND','/kernel','Use the actual fixed same-owner Kernel source binding.');return x;}
// Named source-private Host port. It authenticates producer identities and
// returns only the constructor/guard operations; no raw codec or observer.
export function kernelConstructionSourceForHost(kernel,input){
 const record=actualKernels.get(kernel);if(!record||!input||typeof input!=='object')fail('C2_HOST_CONSTRUCTION_UNBOUND','/kernel','Actual same-owner source Kernel required.');
 const slots={};for(const key of Reflect.ownKeys(input)){const d=Object.getOwnPropertyDescriptor(input,key);if(typeof key!=='string'||!['owner','authority','profile'].includes(key)||!d?.enumerable||!Object.hasOwn(d,'value'))fail('C2_HOST_CONSTRUCTION_UNBOUND','/binding','Closed own constructor binding required.');slots[key]=d.value;}
 if(slots.owner!==record.owner)fail('C2_HOST_CONSTRUCTION_UNBOUND','/owner','The Host must borrow this exact source owner.');const authority=record.authorities.get(slots.authority),profile=record.profiles.get(slots.profile);if(!authority||!profile)fail('C2_HOST_CONSTRUCTION_UNBOUND','/binding','Actual same-Kernel authority and original Root profile handles required.');record.access.current();
 return Object.freeze({
  kind:'nautilus-private-kernel-host-construction-source',version:1,
  readAuthority:()=>kernel.readAuthority(slots.authority),authorityToken:()=>kernel.authorityToken(slots.authority),authorityObservation:()=>kernel.authorityObservation(slots.authority),
  constructSessionJournal:({checkpoint,options})=>kernel.constructSessionJournal({authority:slots.authority,checkpoint,options}),
  documentFacts:kernel.documentFacts,encodedDocument:kernel.encodedDocument,requireCheckpoint:kernel.requireCheckpoint,checkpointEncoding:kernel.checkpointEncoding,
  matchesActualAuthority(value){record.access.current();return value===authority.actual;},
  matchesActualCodec(value){record.access.current();return value===record.binding.codec;},
  matchesActualProfile(value){record.access.current();return value===profile.original||value===profile.value;}
 });
}
export function createActualKernelSource(owner,{deps,initialDocument}){
 const access=sourceAccess(owner);if(access.current().a.source!==initialDocument)fail('C2_SOURCE_IDENTITY','/initialDocument','Begin on this exact original document before actual construction.');const source=createContinuedSource(owner,{tiles:deps.tiles}),checkpoints=new WeakMap(),encodings=new WeakMap(),documentFacts=new WeakMap(),documentEncodings=new WeakMap(),authorities=new WeakMap(),rawAuthorities=new WeakMap(),sessions=new WeakMap(),profiles=new WeakMap();let authorityCount=0;let bridge=null,binding=null;
 const hooks=createKernelBackend(owner,source,{
  onComplete(call,value){
   if(['v3.open','v3.create','v3.stage','v3.settle','codec.open','codec.create','codec.stage','codec.settle'].includes(call.name)&&value?.kind==='nautilus-tile-authoring-editor-checkpoint'){
    source.adoptActualValidatedDocument(value.document);source.markSafe(value,call.root);const ctx=access.context();checkpoints.set(value,{value,owner,codec:binding?.codec??null,attempt:ctx.attempt,entry:call.name,args:call.args});
   }
   if(['v3.domain.validateDocument','codec.targetDocument'].includes(call.name)&&value?.kind==='nautilus-tile-workbench-document')source.adoptActualValidatedDocument(value);if(['v3.domain.validateDocument','codec.targetDocument','host.data'].includes(call.name))source.markSafe(value,call.root);
  },
  onSerializer(input,text,call,encodedBytes){if(input&&typeof input==='object'){if(checkpoints.has(input))encodings.set(input,{text,entry:call.name,attempt:access.context().attempt});if(input.kind==='nautilus-tile-workbench-document')documentEncodings.set(input,{text,encodedBytes});}}
 });
 bridge=bindPrivateObservation({version:1,backend:hooks.backend});source.registerBridge(bridge,hooks.actualFrame);
 const privateWork={version:1,observation:bridge,validateSource:source.validateSource,documentFacts:source.facts};
 binding=createTileAuthoringCheckpointCodec(deps,initialDocument,privateWork);const acceptedInitial=source.actualValidatedDocument();access.bindSourceAlias(initialDocument,acceptedInitial,source.documentDigest(acceptedInitial));access.bindFixedKernel(bridge);
 const utilities=binding.codec.privateObservation.utilities;
 const codec=Object.freeze(Object.fromEntries(['open','create','serialize','token','stage','settle','inspectRecovery'].map(name=>[name,binding.codec[name]])));
 const domain=Object.freeze({...binding.domain});
 const ownConfig=(value,keys,required=keys)=>{if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('C2_CONSTRUCTION_DATA','/construct','Own configuration required.');const out={};for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!keys.includes(key)||!d?.enumerable||!Object.hasOwn(d,'value'))fail('C2_CONSTRUCTION_DATA','/construct','No unknown/accessor construction fields.');out[key]=d.value;}for(const key of required)if(!Object.hasOwn(out,key))fail('C2_CONSTRUCTION_DATA','/'+key,'Required construction field.');return out;};
 const authorityRecord=handle=>{const record=authorities.get(handle);if(!record)fail('C2_AUTHORITY_SOURCE_UNBOUND','/authority','Actual constructor-owned same-kernel authority handle required.');return record;};
 const ordinary=createOrdinaryCore(owner),profileContext={observer:bridge,tiles:deps.tiles};
 const authoringPort=Object.freeze({...ordinary,inspectTileAuthoringRequirements(tiles,input){if(tiles!==deps.tiles)fail('C2_ACTUAL_CORE_REQUIRED','/tiles','Original actual tiles namespace required.');return bridge.run('source.requirements',()=>source.validateSource(deps,input,{observer:bridge}));}});
 const api=Object.freeze({
  codec,domain,initialDocument:acceptedInitial,
  ordinaryCore:ordinary,
  constructAuthoringProfile(input){access.current();const options=ownConfig(input,['finishCatalogue','resourcePorts','inspection'],['finishCatalogue','resourcePorts']);const original=invokeRootProfileSource(profileContext,'construct',()=>createTileAuthoringSessionProfile({...deps,authoring:authoringPort},{...options,binding}));const value={};for(const [name,entry]of Object.entries(original))value[name]=typeof entry==='function'?(...args)=>invokeRootProfileSource(profileContext,name,entry,args):entry;const handle=Object.freeze({});profiles.set(handle,{value:Object.freeze(value),original,owner,kernel:api,actualC2Composition:null});return handle;},
  requireAuthoringProfile(handle){if(!profiles.has(handle))fail('C2_ROOT_PROFILE_UNBOUND','/profile','Actual constructor-owned Root profile required.');return true;},
  constructAuthority(input){access.current();const {services}=ownConfig(input,['services']),ports=ownConfig(services,['read','write']);if(typeof ports.read!=='function'||typeof ports.write!=='function')fail('C2_AUTHORITY_SERVICES','/services','Original synchronous source services required.');access.conservative('kernel',64);const actual=bridge.run('authority.construct',()=>createSmartTileAuthority(deps,ports,{codec:binding.codec})),observation=createPrivateAuthorityObservationPort(actual),handle=Object.freeze({});const record={actual,observation,owner,kernel:api,sessionJournal:null};authorities.set(handle,record);rawAuthorities.set(actual,record);authorityCount++;return handle;},
  readAuthority(handle){return authorityRecord(handle).actual.read();},
  authorityToken(handle){return authorityRecord(handle).actual.token();},
  requireAuthority(handle){authorityRecord(handle);return true;},
  ownsActualAuthority(actual){access.current();return rawAuthorities.has(actual);},
  authorityObservation(handle){const r=authorityRecord(handle);return Object.freeze({currentInvocation(){access.current();return r.observation.currentInvocation();},isCurrentInvocation(fact){access.current();return r.observation.isCurrentInvocation(fact);},resultFact(value){access.current();return r.observation.resultFact(value);},failureFact(error){access.current();return r.observation.failureFact(error);}});},
  constructSessionJournal(input){
   access.current();const v=ownConfig(input,['authority','checkpoint','options']),record=authorityRecord(v.authority);api.requireCheckpoint(v.checkpoint);
   if(record.sessionJournal)fail('C2_SESSION_JOURNAL_EXISTS','/journal','Construct the original actual session history once.');
   if(v.checkpoint.journal.pending!==null)fail('C2_JOURNAL_PENDING','/checkpoint','Reconcile the actual original pending ID first.');
   if(record.actual.read()!==v.checkpoint)fail('C2_JOURNAL_AUTHORITY','/checkpoint','History starts from the exact current settled actual authority checkpoint.');
   const options=ownConfig(v.options,['initialText','contextKey','maxEntries','maxBytes','maxDocumentBytes']);
   if(options.contextKey!=='smart-tile-session-v3'||options.maxEntries!==SMART_TILE_LIMITS.historyEntries||options.maxBytes!==SMART_TILE_LIMITS.historyBytes||options.maxDocumentBytes!==SMART_TILE_LIMITS.checkpointBytes)fail('C2_JOURNAL_OPTIONS','/options','Use the unchanged original session history options.');
   const result=createActualSessionJournal(owner,api,v.checkpoint,options);record.sessionJournal=result;return result;
  },
  async constructSession(input){
   const v=ownConfig(input,['authority','profile','floorController','presentation','newId','providerToken','retireInput'],['authority','profile','floorController','presentation']),a=authorityRecord(v.authority),profile=profiles.get(v.profile);access.current();
   if(!profile||!profile.actualC2Composition)fail('C2_SESSION_PROFILE_UNBOUND','/profile','The actual Root profile/Host/phase producer has not been paired. A frozen callback object is not an owned source profile.');
   const result=await createSmartTileSession(deps,{...v,authority:a.actual,codec:binding.codec,profile:profile.value});access.current();sessions.set(result,{authority:a,profile,owner,kernel:api});return result;
  },
  requireSession(value){if(!sessions.has(value))fail('C2_SESSION_SOURCE_UNBOUND','/session','Use this actual source-constructed session.');return true;},
  documentFacts(document){const d=binding.domain.validateDocument(document),cached=documentFacts.get(d);if(cached){access.actual('kernel',1,{hostNodeVisits:1});return cached;}let encoded=documentEncodings.get(d);if(!encoded){const text=utilities.stringify(d);encoded=documentEncodings.get(d);if(!encoded)fail('C2_ENCODING_FACTS_UNBOUND','/document','Require the actual codec serializer.');}source.noteEncoded(d,encoded.text,encoded.encodedBytes);const text=encoded.text,fact=binding.codec.privateSourceFacts.read(d);if(!binding.codec.privateSourceFacts.verify(fact,text))fail('C2_HISTORY_FACTS_UNBOUND','/documentFacts','Actual source fact must verify exact actual serialized text.');documentFacts.set(d,fact);return fact;},
  encodedDocument(document){const d=binding.domain.validateDocument(document),cached=documentEncodings.get(d);if(cached){access.actual('kernel',1,{hostNodeVisits:1});source.noteEncoded(d,cached.text,cached.encodedBytes);return cached.text;}return utilities.stringify(d);},
  requireCheckpoint(value){const r=checkpoints.get(value);if(!r||r.codec&&r.codec!==binding.codec)fail('C2_CHECKPOINT_UNBOUND','/checkpoint','Use an actual checkpoint produced by this fixed codec.');return true;},
  checkpointEncoding(value){const r=checkpoints.get(value),e=encodings.get(value);if(!r||!e)fail('C2_ENCODING_FACTS_UNBOUND','/checkpoint','Actual owned complete checkpoint serialization is required.');return freeze({text:e.text,entry:e.entry});},
  requireNative(){fail('C2_NATIVE_SOURCE_UNBOUND','/native','Actual paired Artist/Native/decoder source hook identity is unavailable.');},
  state:()=>freeze({kind:'nautilus-private-actual-source-binding',version:1,kernelSourceCommit:'4ade3ea02084472b30d036e8a0561e473aa84f3f',rootSourceCommit:'648cad33c3e0e1f36b4313b1492b1a750492ece4',actualKernelHooks:'BOUND',continuedC2Source:'BOUND',oneOwner:true,authoritySource:authorityCount?'BOUND':'UNBOUND',hostAuthority:'UNBOUND',Artist:'UNBOUND',Native:'UNBOUND',Decoder:'UNBOUND',publicActivation:false}),
 });
 actualKernels.set(api,{owner,access,source,bridge,hooks,binding,utilities,documentFacts,documentEncodings,authorities,rawAuthorities,sessions,profiles,ordinary,authoringPort});return api;
}
