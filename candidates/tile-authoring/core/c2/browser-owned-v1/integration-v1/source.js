// Actual continued complete C2 source/query validation. All work goes through
// the one current private owner; readonly purposes never construct a plan.
import * as ActualTiles from '../../../../../../packages/tiles-core/index.js';
import {Budget,readData,fields,shape,hash,equal,freeze,fail,clone} from '../data.js';
import {jsonBytes,utf8Bytes} from '../budget.js';
import {validateDocument,sourceProjection,pin,recordKey} from '../model.js';
import {validateAppearanceDocument,supportedRecord} from '../operations.js';
import {finishData} from '../output.js';
import {sourceAccess} from './owner.js';
const own=(v,k)=>{const d=Object.getOwnPropertyDescriptor(v??{},k);if(!d||!Object.hasOwn(d,'value'))fail('C2_SOURCE_DATA','/'+k,'Own data required.');return d.value;};
export function createContinuedSource(owner,{tiles=ActualTiles}={}){
 if(tiles!==ActualTiles)fail('C2_ACTUAL_CORE_REQUIRED','/tiles','Use the actual pinned public tiles namespace.');
 let lastValidated=null;
 const access=sourceAccess(owner),documents=new WeakMap(),facts=new WeakMap(),safeValues=new WeakSet(),emitted=new Map(),bridges=new WeakMap(),pendingDocuments=new WeakMap(),transientSafe=new WeakMap(),treeInfo=new WeakMap(),byDigest=new Map();
 function budget(){const sink=access.coreSink();const b=sink.budget??new Budget({},sink);if(!sink.budget)sink.setBudget(b);else b.attach(sink);return b;}
 function safeTree(v,epoch=null){access.actual('kernel',1,{hostNodeVisits:1});if(!v||typeof v!=='object')return true;if(safeValues.has(v))return true;const keys=Reflect.ownKeys(v),enumerable=keys.filter(k=>Object.getOwnPropertyDescriptor(v,k)?.enumerable);treeInfo.set(v,{ownKeyBytes:jsonBytes(keys),keyBytes:jsonBytes(enumerable),values:enumerable.length});let stable=Object.isFrozen(v);for(const k of enumerable)if(!safeTree(Object.getOwnPropertyDescriptor(v,k).value,epoch))stable=false;if(stable)safeValues.add(v);else if(epoch!==null)transientSafe.set(v,epoch);return stable;}
 function dimensions(v,b,depth=0){b.take();let nodes=1,maxDepth=depth;if(v&&typeof v==='object')for(const x of Object.values(v)){const z=dimensions(x,b,depth+1);nodes+=z.nodes;maxDepth=Math.max(maxDepth,z.depth);}return {nodes,depth:maxDepth};}
 function query(fact,subject,b){
  const records=subject?.kind==='nautilus-tile-authoring-source'?(equal(tiles,subject,sourceProjection(fact.document),b)?[...fact.index.all.values()]:(fail('STALE_SOURCE','/subject','Exact complete source projection required.'))):(shape(tiles,'pin',subject,b),[fact.index.resolve(subject)]);
  const seen=new Set(),profiles=new Set(),artwork=[],unavailable=[];
  for(let i=0;i<records.length;i++){b.take();const r=records[i],key=recordKey(r);if(seen.has(key))continue;seen.add(key);for(const req of r.body.requires)profiles.add(req);try{supportedRecord(tiles,r,b);}catch(e){if(!e?.diagnostics||e.code?.includes('LIMIT')||e.code?.startsWith('C2_'))throw e;unavailable.push(...e.diagnostics);}if(r.kind==='nautilus-tile-preset'){records.push(fact.index.resolve(r.body.definition,'nautilus-recipe-definition'));for(const m of r.body.defaultMarks)records.push(fact.index.resolve(m.graphic.artwork,'nautilus-tile-artwork'));}if(r.kind==='nautilus-tile-artwork')artwork.push(r);}
  const result={kind:'nautilus-tile-authoring-requirements',version:1,subjectDigest:hash(tiles,subject,b),requiredProfiles:[...profiles].sort(),requiredResources:artwork.map(pin),unavailable};shape(tiles,'requirementsResult',result,b);return finishData(result,b);
 }
 function validate(input){
  const b=budget(),rawDocument=own(input,'document'),already=documents.get(rawDocument);let fact,subject;
  if(already){b.take();fact=already;const v=readData({subject:own(input,'subject')},b,b.limits.sourceBytes);subject=v.subject;}
  else{
   const v=readData(input,b,b.limits.inputBytes);fields(v,['document','subject'],'/source');b.take(Math.ceil(jsonBytes(v.document,b.limits.sourceBytes)/64));
   const index=validateDocument(tiles,v.document,b);validateAppearanceDocument(tiles,v.document,b);
   const document=freeze(v.document);fact={document,index,digest:hash(tiles,document,b),logicalBytes:jsonBytes(document,b.limits.sourceBytes),dimensions:dimensions(document,b),texts:new Set(),resourceRefs:freeze(clone(document.resourceRefs,b))};documents.set(document,fact);byDigest.set(fact.digest,fact);while(byDigest.size>64)byDigest.delete(byDigest.keys().next().value);safeTree(document);subject=v.subject;
   // Raw input was inspected but remains caller-owned. Do not cache its mutable
   // identity or a shallow freeze as complete validation proof.
  }
  if(rawDocument&&typeof rawDocument==='object'){pendingDocuments.set(rawDocument,fact);lastValidated=rawDocument;}
  return {fact,result:query(fact,subject,b)};
 }
 const api=Object.freeze({
  actualValidatedDocument(){if(!lastValidated||!Object.isFrozen(lastValidated))fail('C2_VALIDATED_SOURCE_UNBOUND','/document','Actual fixed codec validation and freeze must complete.');api.adoptActualValidatedDocument(lastValidated);return lastValidated;},
  registerBridge(bridge,actualFrame){if(typeof actualFrame!=='function')fail('C2_SOURCE_UNBOUND','/bridge','Actual private source frame required.');bridges.set(bridge,actualFrame);},
  validateSource(deps,input,{observer}){if(!bridges.get(observer)?.()||own(deps,'tiles')!==tiles)fail('C2_VALIDATION_COUNTER_UNBOUND','/observer','Use this actual continued-source bridge and tiles namespace.');return validate(input).result;},
  markSafe(v,epoch){safeTree(v,epoch);},isSafe:v=>v===null||typeof v!=='object'||safeValues.has(v),
  ensureSafe(value,epoch){
   // This is paid descriptor preflight for the REAL Kernel opaque call, not a
   // replacement codec or a full metadata copy into Core. Known actual producer
   // trees and immutable strings are reused; no returned count grants credit.
   const active=new Set();let nodes=0;function walk(v,depth){access.actual('kernel',1,{hostNodeVisits:1});if(++nodes>1000000||depth>40)fail('C2_PREFLIGHT_LIMIT','/source','Actual Host descriptor bound exhausted.');if(v===null||typeof v==='boolean')return;if(typeof v==='number'){if(!Number.isFinite(v)||Object.is(v,-0))fail('C2_PREFLIGHT_NUMBER','/source','Finite values required.');return;}if(typeof v==='string')return;if(typeof v!=='object'||active.has(v))fail('C2_PREFLIGHT_DATA','/source','Acyclic own data required.');if(safeValues.has(v)||transientSafe.get(v)===epoch)return;const array=Array.isArray(v),proto=Object.getPrototypeOf(v);if(array?proto!==Array.prototype:![Object.prototype,null].includes(proto))fail('C2_PREFLIGHT_DATA','/source','Plain original data required.');const keys=Reflect.ownKeys(v),visible=[];active.add(v);for(const k of keys){if(array&&k==='length')continue;const d=Object.getOwnPropertyDescriptor(v,k);if(typeof k!=='string'||!d?.enumerable||!Object.hasOwn(d,'value')||array&&!/^(0|[1-9][0-9]*)$/.test(k))fail('C2_PREFLIGHT_DESCRIPTOR','/source','No getters/symbols/hidden data.');access.actual('kernel',Math.ceil(k.length/16));visible.push(k);walk(d.value,depth+1);}if(array&&(visible.length!==v.length||visible.some((k,i)=>String(i)!==k)))fail('C2_PREFLIGHT_ARRAY','/source','Dense exact arrays required.');active.delete(v);treeInfo.set(v,{ownKeyBytes:jsonBytes(keys),keyBytes:jsonBytes(visible),values:visible.length});transientSafe.set(v,epoch);}
   walk(value,0);
  },
  documentDigest(value){const f=documents.get(value);if(!f)fail('C2_SOURCE_FACT_UNBOUND','/document','Actual complete source fact required.');budget().take();return f.digest;},
  documentFor(value){return documents.get(value)?.document??null;},
  logicalBytes(value){const f=documents.get(value)??pendingDocuments.get(value);return f?.logicalBytes??null;},
  keyBound(value,site){const info=treeInfo.get(value);if(!info)return null;return site==='data.freeze-values'?{reference:info.values,bytes:0}:{reference:Math.ceil((site==='data.own-keys'?info.ownKeyBytes:info.keyBytes)/64),bytes:0};},
  adoptActualValidatedDocument(document){if(documents.has(document)){documents.get(document).actualDocument=document;return;}const b=budget(),direct=pendingDocuments.get(document),digest=direct?(b.take(),direct.digest):hash(tiles,document,b),fact=direct??byDigest.get(digest);if(!fact||fact.digest!==digest||!Object.isFrozen(document))fail('C2_VALIDATED_SOURCE_UNBOUND','/document','Require actual fixed codec validation output and its complete C2 source fact.');documents.set(document,fact);fact.actualDocument=document;safeTree(document);},
  noteEncoded(document,text,actualEncodedBytes=undefined){let fact=documents.get(document);if(!fact&&Object.isFrozen(document)){fact=pendingDocuments.get(document);if(fact){documents.set(document,fact);safeTree(document);}}if(!fact||typeof text!=='string')return;const b=budget(),bytes=actualEncodedBytes??utf8Bytes(text);if(bytes!==fact.logicalBytes)fail('C2_ENCODING_FACT_MISMATCH','/documentFacts','Actual compact document text differs from the complete validated document length.');b.take(1);fact.texts.add(text);while(fact.texts.size>4)fact.texts.delete(fact.texts.values().next().value);emitted.set(text,fact);while(emitted.size>64)emitted.delete(emitted.keys().next().value);},
  facts:{
   read(document,{observer,documentDigest}){if(!bridges.get(observer)?.())fail('C2_HISTORY_FACTS_UNBOUND','/observer','Actual continued observer required.');const b=budget();let fact=documents.get(document);if(!fact&&Object.isFrozen(document)){fact=pendingDocuments.get(document);if(fact){documents.set(document,fact);safeTree(document);}}if(!fact||documentDigest!==fact.digest||!fact.texts.size)fail('C2_HISTORY_FACTS_UNBOUND','/documentFacts','Require a complete paid source plus an actual codec-owned document serialization; no predicted byte/count fact.');b.take(4);const data=freeze({documentDigest:fact.digest,encodedBytes:fact.logicalBytes,...fact.dimensions,resourceRefs:fact.resourceRefs,resourceRefsDigest:hash(tiles,fact.resourceRefs,b)}),token=freeze({data});facts.set(token,fact);return token;},
   verify(token,text){const b=budget();b.take();const fact=facts.get(token);return !!fact&&fact.texts.has(text)&&emitted.get(text)===fact;}
  },
  factRecord(token){const fact=facts.get(token);if(!fact)fail('C2_HISTORY_FACTS_UNBOUND','/fact','Use actual owned codec source facts.');return fact;},
  findEncoded(text){const b=budget();b.take();return emitted.get(text)??null;},
  inspectText(text){const b=budget(),d=readData(text,b,b.limits.sourceBytes),first=d.authoring?.library?.definitions?.[0]??d.authoring?.library?.presets?.[0]??d.authoring?.library?.artwork?.[0],q=validate({document:d,subject:first?pin(first):sourceProjection(d)});return q.fact.document;},
  state:()=>Object.freeze({continuedCompleteSource:'BOUND',authoringPlanFromReadonly:false,C1Fallback:false,actualCodecFacts:'requires actual paid codec serialization',native:'UNBOUND'})
 });return api;
}
