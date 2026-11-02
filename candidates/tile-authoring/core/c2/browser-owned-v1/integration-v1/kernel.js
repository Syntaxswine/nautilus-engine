// Actual private Kernel constructor and source-fact adapter. Original algorithms
// execute in the fixed 4ade source closure, not a substitute codec or journal.
import {createTileAuthoringCheckpointCodec} from './kernel/runtime/apps/editor/tile-authoring/checkpoint.js';
import {bindPrivateObservation} from './kernel/runtime/observation.js';
import {createContinuedSource} from './source.js';
import {createKernelBackend} from './kernel-backend.js';
import {sourceAccess} from './owner.js';
import {fail,freeze} from '../data.js';
const actualKernels=new WeakMap();
export function kernelSourceAccess(value,owner){const x=actualKernels.get(value);if(!x||x.owner!==owner)fail('C2_KERNEL_SOURCE_UNBOUND','/kernel','Use the actual fixed same-owner Kernel source binding.');return x;}
export function createActualKernelSource(owner,{deps,initialDocument}){
 const access=sourceAccess(owner);if(access.current().a.source!==initialDocument)fail('C2_SOURCE_IDENTITY','/initialDocument','Begin on this exact original document before actual construction.');const source=createContinuedSource(owner,{tiles:deps.tiles}),checkpoints=new WeakMap(),encodings=new WeakMap(),documentFacts=new WeakMap();let bridge=null,binding=null;
 const hooks=createKernelBackend(owner,source,{
  validateEntry(name,args){if(['host.data','host.digest','host.utf8'].includes(name)&&args[1]!==bridge)fail('C2_SOURCE_OBSERVER_REQUIRED','/utilities','Pass the same actual observer to the fixed utility body.');},
  onComplete(call,value){
   if(['v3.open','v3.create','v3.stage','v3.settle','codec.open','codec.create','codec.stage','codec.settle'].includes(call.name)&&value?.kind==='nautilus-tile-authoring-editor-checkpoint'){
    source.adoptActualValidatedDocument(value.document);source.markSafe(value,call.root);const ctx=access.context();checkpoints.set(value,{value,owner,codec:binding?.codec??null,attempt:ctx.attempt,entry:call.name,args:call.args});
   }
   if(['v3.domain.validateDocument','codec.targetDocument'].includes(call.name)&&value?.kind==='nautilus-tile-workbench-document')source.adoptActualValidatedDocument(value);if(['v3.domain.validateDocument','codec.targetDocument','host.data'].includes(call.name))source.markSafe(value,call.root);
  },
  onSerializer(input,text,call){if(input&&typeof input==='object'&&checkpoints.has(input))encodings.set(input,{text,entry:call.name,attempt:access.context().attempt});}
 });
 bridge=bindPrivateObservation({version:1,backend:hooks.backend});source.registerBridge(bridge,hooks.actualFrame);
 const privateWork={version:1,observation:bridge,validateSource:source.validateSource,documentFacts:source.facts};
 binding=createTileAuthoringCheckpointCodec(deps,initialDocument,privateWork);const acceptedInitial=source.actualValidatedDocument();access.bindSourceAlias(initialDocument,acceptedInitial,source.documentDigest(acceptedInitial));access.bindFixedKernel(bridge);
 const utilities=binding.codec.privateObservation.utilities;
 const codec=Object.freeze(Object.fromEntries(['open','create','serialize','token','stage','settle','inspectRecovery'].map(name=>[name,binding.codec[name]])));
 const domain=Object.freeze({...binding.domain});
 const api=Object.freeze({
  codec,domain,initialDocument:acceptedInitial,
  documentFacts(document){const d=binding.domain.validateDocument(document),cached=documentFacts.get(d);if(cached){access.actual('kernel',1,{hostNodeVisits:1});return cached;}const text=utilities.stringify(d);utilities.bytes(text,bridge);const fact=binding.codec.privateSourceFacts.read(d);if(!binding.codec.privateSourceFacts.verify(fact,text))fail('C2_HISTORY_FACTS_UNBOUND','/documentFacts','Actual source fact must verify exact actual serialized text.');documentFacts.set(d,fact);return fact;},
  encodedDocument(document){const d=binding.domain.validateDocument(document),text=utilities.stringify(d);utilities.bytes(text,bridge);return text;},
  requireCheckpoint(value){const r=checkpoints.get(value);if(!r||r.codec&&r.codec!==binding.codec)fail('C2_CHECKPOINT_UNBOUND','/checkpoint','Use an actual checkpoint produced by this fixed codec.');return true;},
  checkpointEncoding(value){const r=checkpoints.get(value),e=encodings.get(value);if(!r||!e)fail('C2_ENCODING_FACTS_UNBOUND','/checkpoint','Actual owned complete checkpoint serialization is required.');return freeze({text:e.text,entry:e.entry});},
  requireNative(){fail('C2_NATIVE_SOURCE_UNBOUND','/native','Actual paired Artist/Native/decoder source hook identity is unavailable.');},
  state:()=>freeze({kind:'nautilus-private-actual-source-binding',version:1,kernelSourceCommit:'4ade3ea02084472b30d036e8a0561e473aa84f3f',actualKernelHooks:'BOUND',continuedC2Source:'BOUND',oneOwner:true,hostAuthority:'UNBOUND',Artist:'UNBOUND',Native:'UNBOUND',Decoder:'UNBOUND',publicActivation:false}),
 });
 actualKernels.set(api,{owner,access,source,bridge,hooks,binding,utilities,documentFacts});return api;
}
