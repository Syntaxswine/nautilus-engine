// Actual fixed journal, owned head/selected/obligation facts. No second journal,
// full-history snapshot, caller count report, or reconstructed ticket is accepted.
import {createWindowAuthoringJournal,createWindowAuthoringJournalReadPort} from './kernel/runtime/packages/windows-authoring/journal.js';
import {kernelSourceAccess} from './kernel.js';
import {sourceAccess} from './owner.js';
import {fail,freeze} from '../data.js';
import {utf8Bytes} from '../budget.js';
const journals=new WeakMap(),heads=new WeakMap(),selections=new WeakMap(),obligations=new WeakMap();
export function actualJournalAccess(value,owner){const x=journals.get(value);if(!x||x.owner!==owner)fail('C2_HISTORY_OWNER_UNBOUND','/journal','Use the original actual same-owner journal adapter.');return x;}
export function createActualJournal(owner,kernel,{contextKey,maxEntries=64,maxBytes=16000000,maxDocumentBytes=8000000}={}){
 let activeHead=null;const selectedByWork=new WeakSet();
 const access=sourceAccess(owner),k=kernelSourceAccess(kernel,owner),{source,bridge,utilities}=k;
 const paid=()=>{access.current();access.actual('kernel',1,{hostNodeVisits:1});};
 const originalAttempt=work=>{const a=access.verifyAttempt(work),ctx=access.context();if(a!==ctx.attempt)fail('C2_HISTORY_ATTEMPT','/history','Same active original source attempt required.');return a;};
 const immutable=v=>{paid();if(v&&typeof v==='object'){for(const value of Object.values(v))immutable(value);Object.freeze(v);}return v;};
 function factForText(work,text){originalAttempt(work);paid();const cached=source.findEncoded(text);if(cached){const fact=kernel.documentFacts(cached.actualDocument??cached.document);if(!k.binding.codec.privateSourceFacts.verify(fact,text))fail('C2_HISTORY_FACTS_UNBOUND','/history','Cached source fact must match the actual record text.');return fact;}
  // A miss performs the complete source scan through the actual codec and its
  // continued C2 validator. Exhaustion refuses; an empty ResourceRef DTO cannot.
  const document=k.binding.domain.validateDocument(text),emitted=kernel.encodedDocument(document);
  access.conservative('kernel',Math.ceil(Math.max(utf8Bytes(text),utf8Bytes(emitted))/64));
  if(emitted!==text)fail('C2_HISTORY_ENCODING','/history','Actual journal records use the actual compact codec document text.');return kernel.documentFacts(document);
 }
 const observer=Object.freeze({
  owns(work){try{originalAttempt(work);return true;}catch{return false;}},
  open(work,name){originalAttempt(work);paid();let ended=false;const check=()=>{originalAttempt(work);if(ended)fail('C2_HISTORY_CALL_CLOSED','/history','Close each actual history call once.');};return Object.freeze({node(){check();paid();},digest(v){check();return utilities.digest(v,bridge);},freezeCopy(v){check();return immutable(utilities.data(v,bridge));},finish(){check();ended=true;},fail(){ended=true;access.fail();}});},
  documentFacts:factForText,
  verifyFact(work,fact,text){originalAttempt(work);paid();return k.binding.codec.privateSourceFacts.verify(fact,text);},
  copySelected(work,data){originalAttempt(work);paid();const copied=immutable(utilities.data(data,bridge)),d=k.binding.domain.validateDocument(copied.targetDocumentJSON),fact=kernel.documentFacts(d);if(fact.data.documentDigest!==copied.targetDocumentDigest||!k.binding.codec.privateSourceFacts.verify(fact,copied.targetDocumentJSON))fail('C2_HISTORY_SELECTION','/selected','The one actual selected target needs complete owned codec facts.');const result=Object.freeze({data:copied});selections.set(result,{owner,work,document:d,fact,journal:actual,head:activeHead});return result;},
  equalText(work,a,b){originalAttempt(work);access.conservative('kernel',Math.ceil(Math.max(utf8Bytes(a),utf8Bytes(b))/64));return a===b;},
  openObligations(work){originalAttempt(work);paid();const scannedHead=activeHead;const refs=new Map(),seen=new Set();let ended=false,records=0;return Object.freeze({fact(token){originalAttempt(work);if(ended)fail('C2_HISTORY_CALL_CLOSED','/obligations','The real obligation scan is closed.');const fact=source.factRecord(token);paid();records++;for(const ref of fact.resourceRefs){paid();const key=utilities.digest(ref,bridge);if(!seen.has(key)){seen.add(key);refs.set(key,ref);}}},finish(){originalAttempt(work);if(ended)fail('C2_HISTORY_CALL_CLOSED','/obligations','Finish the real scan once.');ended=true;const result=Object.freeze({data:immutable({kind:'nautilus-actual-journal-resource-obligations',version:1,records,resourceRefs:[...refs.values()].sort((a,b)=>a.artwork.id.localeCompare(b.artwork.id)||a.artwork.revision-b.artwork.revision)})});obligations.set(result,{owner,work,journal:actual,head:scannedHead});return result;},fail(){ended=true;access.fail();}});}
 });
 const initialText=kernel.encodedDocument(kernel.initialDocument),config={initialText,contextKey,maxEntries,maxBytes,maxDocumentBytes};
 const actual=bridge.run('session.journal.construct',()=>bridge.opaque('session.journal.construct',config,()=>createWindowAuthoringJournal(config)));
 const readPort=createWindowAuthoringJournalReadPort(actual,observer,bridge);let api;
 api=Object.freeze({
  journal:actual,
  inspectLive(input,work){originalAttempt(work);const raw=readPort.inspectLive(input,work);let head;const invoke=(name,w,...args)=>{originalAttempt(w);access.actual('kernel',8,{hostNodeVisits:8});const previous=activeHead;activeHead=head;try{return raw[name](w,...args);}finally{activeHead=previous;}};head=Object.freeze({data:raw.data,isCurrent:w=>invoke('isCurrent',w),copySelected(w){if(selectedByWork.has(w))fail('C2_HISTORY_SELECTION_LIMIT','/selected','At most one actual full selected target per original attempt.');selectedByWork.add(w);return invoke('copySelected',w);},scanObligations:w=>invoke('scanObligations',w),matchesOwnedTicket:(w,ticket,text)=>invoke('matchesOwnedTicket',w,ticket,text)});heads.set(head,{owner,work,journal:actual,action:input.action,raw});return head;},
  noteAccepted(work){originalAttempt(work);return readPort.noteAccepted(work);},
  requireHead(head,work){originalAttempt(work);const r=heads.get(head);if(!r||r.owner!==owner||r.work!==work||r.journal!==actual||!head.isCurrent(work))fail('C2_HISTORY_HEAD_UNBOUND','/head','Exact current head of the same actual journal and original attempt required.');return r;},
  requireSelected(value,work,head){originalAttempt(work);const r=selections.get(value);if(!r||r.owner!==owner||r.work!==work||r.journal!==actual||r.head!==head)fail('C2_HISTORY_SELECTION_UNBOUND','/selected','Use the actual once-copied full target.');return r;},
  requireObligations(value,work,head){originalAttempt(work);const r=obligations.get(value);if(!r||r.owner!==owner||r.work!==work||r.journal!==actual||r.head!==head)fail('C2_HISTORY_OBLIGATIONS_UNBOUND','/obligations','Use this same real journal paid scan.');return r;},
  state:()=>freeze({actualJournal:'BOUND',actualReadPort:'BOUND',ownedCodecFacts:'BOUND',historyArrays:'not exposed',authoringCapacity:'UNBOUND',actualWal:'UNBOUND'})
 });journals.set(api,{owner,kernel,actual,readPort,observer,heads,selections,obligations});return api;
}
