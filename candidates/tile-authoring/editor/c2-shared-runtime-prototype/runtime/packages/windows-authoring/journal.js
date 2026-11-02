// PRIVATE C2 shared-runtime prototype. Exact0e7 default algorithm; optional instrumentation only.
// Headless extraction of 136e3ae7227b8b280e452fc9bcd5f11c3d91ac02 / apps/editor/part-authoring-journal.js.
// Semantic algorithm retained; factory renamed and editor-only comments replaced.
import {bindPrivateObservation,observedEncode} from '../../observation.js';
const journalReadOwners=new WeakMap();
const observationError=message=>{const e=new TypeError(message);e.code='C2_HISTORY_COUNTER_UNBOUND';throw e;};
export function createWindowAuthoringJournalReadPort(journal,observer,sourceObservation=undefined){
  const owner=journalReadOwners.get(journal);if(!owner)observationError('Borrow the actual PRIVATE journal instance.');
  for(const key of ['owns','open','documentFacts','verifyFact','copySelected','equalText','openObligations']){const d=Object.getOwnPropertyDescriptor(observer??{},key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='function')observationError('Missing actual history observer: '+key);}
  return owner(observer,bindPrivateObservation(sourceObservation));
}
const size=text=>new TextEncoder().encode(text).length;

export function createWindowAuthoringJournal({initialText,contextKey,maxEntries=64,maxBytes=16_000_000,maxDocumentBytes=8_000_000}) {
  let sourceObserver=null;
  const observe=(name,task)=>sourceObserver?sourceObserver.run('journal.'+name,()=>{sourceObserver.visit('/journal/'+name,0);return task();}):task();
  const encodedSize=value=>sourceObserver?observe('utf8',()=>observedEncode(sourceObserver,value,'journal.utf8.encode').length):size(value);
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>256||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>64_000_000||!Number.isSafeInteger(maxDocumentBytes)||maxDocumentBytes<1||maxDocumentBytes>64_000_000)throw Error('Use bounded editor history/document budgets.');
  const checkText=text=>{if(typeof text!=='string'||!text.length||encodedSize(text)>maxDocumentBytes)throw Error('Supply a validated, bounded serialized authoring document.');return text;};
  const checkContext=value=>{if(typeof value!=='string'||!value.length||value.length>512)throw Error('Supply the pinned compiler/definitions/profile context key.');return value;};
  let text=checkText(initialText),context=checkContext(contextKey),revision=0,ordinal=0,pending=null,compilation=null,past=[],future=[];
  const record=value=>({text:value,bytes:encodedSize(value)});
  const historyBytes=()=>sourceObserver?observe('historyBytes',()=>{let total=0;for(const item of past){sourceObserver.visit('/journal/past',0);total+=item.bytes;}for(const item of future){sourceObserver.visit('/journal/future',0);total+=item.bytes;}return total;}):[...past,...future].reduce((total,item)=>total+item.bytes,0);
  const trim=()=>{while(past.length+future.length&&(past.length+future.length>maxEntries||historyBytes()>maxBytes)){if(past.length)past.shift();else future.shift();}};
  const cancel=()=>{const existed=!!pending;pending=null;ordinal++;return existed;};
  function begin(action,target) {
    cancel();if(target===null&&(action==='undo'||action==='redo'))return null;
    const ticket=Object.freeze({action,targetText:checkText(target),baseRevision:revision,contextKey:context,ordinal});
    pending=ticket;return ticket;
  }
  const current=ticket=>!!ticket&&ticket===pending&&ticket.ordinal===ordinal&&ticket.baseRevision===revision&&ticket.contextKey===context;
  const journal=Object.freeze({
    get snapshot(){if(sourceObserver&&!sourceObserver.active)return observe('snapshot',()=>journal.snapshot);sourceObserver?.visit('/journal/snapshot',0);return Object.freeze({text,revision,contextKey:context,compilation,pending,
      compilationCurrent:!!compilation&&compilation.contextKey===context,
      history:Object.freeze({undo:past.length,redo:future.length,bytes:historyBytes(),maxEntries,maxBytes})});},
    beginEdit(target){return observe('beginEdit',()=>begin('edit',target));},
    beginOpen(target){return observe('beginOpen',()=>begin('open',target));},
    beginUndo(){return observe('beginUndo',()=>begin('undo',past.at(-1)?.text??null));},
    beginRedo(){return observe('beginRedo',()=>begin('redo',future.at(-1)?.text??null));},
    beginRebuild(){return observe('beginRebuild',()=>begin('rebuild',text));},
    cancel(){return observe('cancel',cancel);},
    setContext(next) {
      if(sourceObserver&&!sourceObserver.active)return observe('setContext',()=>journal.setContext(next));sourceObserver?.visit('/journal/setContext',0);
      checkContext(next);if(next===context)return false;
      cancel();context=next;return true;
    },
    reject(ticket){if(sourceObserver&&!sourceObserver.active)return observe('reject',()=>journal.reject(ticket));sourceObserver?.visit('/journal/reject',0);if(!current(ticket))return false;pending=null;return true;},
    accept(ticket,artifact) {
      if(sourceObserver&&!sourceObserver.active)return observe('accept',()=>journal.accept(ticket,artifact));sourceObserver?.visit('/journal/accept',0);
      if(!current(ticket))return {ok:false,code:'EDITOR_STALE_PREPARATION',revision};
      if(!artifact||typeof artifact!=='object')throw Error('Accept only a successfully prepared immutable compiler result.');
      const changed=ticket.targetText!==text;
      switch(ticket.action) {
        case 'edit': if(changed){past.push(record(text));future=[];}break;
        case 'open': past=[];future=[];break;
        case 'undo': past.pop();future.push(record(text));break;
        case 'redo': future.pop();past.push(record(text));break;
        case 'rebuild': break;
        default: throw Error('Unknown editor journal action.');
      }
      trim();text=ticket.targetText;compilation=Object.freeze({contextKey:context,value:artifact});pending=null;
      if(changed||ticket.action==='open')revision++;
      return {ok:true,changed,revision};
    }
  });
  // Static facts alias the actual records; they cannot select or replace a head.
  const factCache=new WeakMap();let currentRecord=null;
  const capture=()=>({text,context,revision,ordinal,pending,undo:past.at(-1)??null,redo:future.at(-1)??null,undoLength:past.length,redoLength:future.length});
  const same=s=>text===s.text&&context===s.context&&revision===s.revision&&ordinal===s.ordinal&&pending===s.pending&&past.length===s.undoLength&&future.length===s.redoLength&&(past.at(-1)??null)===s.undo&&(future.at(-1)??null)===s.redo;
  journalReadOwners.set(journal,(observer,source)=>{
    if(sourceObserver&&sourceObserver!==source)observationError('Keep the same constructor-bound source observer.');
    sourceObserver=source;
    const owns=work=>observer.owns(work)===true;
    const facts=(work,record)=>{
      let fact=factCache.get(record);
      if(fact&&observer.verifyFact(work,fact,record.text)===true)return fact;
      fact=observer.documentFacts(work,record.text);
      if(!fact||observer.verifyFact(work,fact,record.text)!==true)observationError('Require actual codec-owned document facts or a paid scan.');
      const data=fact.data;if(!data||typeof data.documentDigest!=='string'||!Number.isSafeInteger(data.encodedBytes)||data.encodedBytes<0||data.encodedBytes>maxDocumentBytes||record.bytes!==null&&data.encodedBytes!==record.bytes)observationError('The actual record bytes and owned codec facts disagree.');
      if(record.bytes===null)record.bytes=data.encodedBytes;
      factCache.set(record,fact);return fact;
    };
    return Object.freeze({
      inspectLive(input,work){
        if(!owns(work))observationError('Use the same live owned attempt.');
        const call=observer.open(work,'journal.inspectLive'),s=capture();let copied=false;
        try{
          const d=input&&typeof input==='object'?Object.getOwnPropertyDescriptor(input,'action'):null;
          if(!d||!Object.hasOwn(d,'value')||!d.enumerable||Reflect.ownKeys(input).length!==1||![Object.prototype,null].includes(Object.getPrototypeOf(input))||!['edit','undo','redo'].includes(d.value))observationError('Supply one own history action.');
          const action=d.value,selected=action==='undo'?s.undo:action==='redo'?s.redo:null;
          if(!currentRecord||currentRecord.text!==s.text)currentRecord={text:s.text,bytes:null};
          let undoBytes=0,redoBytes=0;for(const item of past){call.node();undoBytes+=item.bytes;}for(const item of future){call.node();redoBytes+=item.bytes;}
          const cf=facts(work,currentRecord),uf=s.undo?facts(work,s.undo):null,rf=s.redo?facts(work,s.redo):null;
          const metadata=f=>f?{documentDigest:f.data.documentDigest,encodedBytes:f.data.encodedBytes}:null;
          const data={kind:'nautilus-editor-live-history-inspection',version:1,generation:s.ordinal,revision:s.revision,contextKey:s.context,currentDocumentDigest:cf.data.documentDigest,currentDocumentBytes:cf.data.encodedBytes,undo:{entries:s.undoLength,encodedBytes:undoBytes,head:metadata(uf)},redo:{entries:s.redoLength,encodedBytes:redoBytes,head:metadata(rf)},pendingTicket:s.pending!==null,limits:{maxEntries,maxBytes,maxDocumentBytes}};
          data.stateDigest=call.digest(data);const frozen=call.freezeCopy(data);if(!same(s))observationError('History changed while its actual source was observed.');
          const head=Object.freeze({data:frozen,
            isCurrent(candidateWork){return candidateWork===work&&owns(work)&&same(s);},
            copySelected(candidateWork){if(candidateWork!==work||!owns(work)||!same(s)||copied)observationError('Selection is stale or already copied.');copied=true;if(!selected)return null;return observer.copySelected(work,{action,generation:s.ordinal,inspectionDigest:frozen.stateDigest,targetDocumentJSON:selected.text,targetDocumentDigest:(action==='undo'?uf:rf).data.documentDigest});},
            matchesOwnedTicket(candidateWork,ticket,targetText){return candidateWork===work&&owns(work)&&current(ticket)&&ticket.ordinal===s.ordinal+1&&ticket.baseRevision===s.revision&&ticket.contextKey===s.context&&ticket.action===action&&text===s.text&&context===s.context&&revision===s.revision&&past.length===s.undoLength&&future.length===s.redoLength&&(past.at(-1)??null)===s.undo&&(future.at(-1)??null)===s.redo&&observer.equalText(work,ticket.targetText,targetText)&&(action==='edit'||!!selected&&observer.equalText(work,targetText,selected.text));},
            scanObligations(candidateWork){
              if(candidateWork!==work||!owns(work)||!same(s))observationError('History obligations are stale.');
              const scan=observer.openObligations(work);try{
                scan.fact(facts(work,currentRecord));for(const item of past)scan.fact(facts(work,item));for(const item of future)scan.fact(facts(work,item));
                if(!same(s))observationError('History changed during actual obligation scan.');return scan.finish();
              }catch(error){scan.fail(error);throw error;}
            }});
          call.finish(frozen);return head;
        }catch(error){call.fail(error);throw error;}
      },
      noteAccepted(work){
        if(!owns(work))observationError('Record facts need the original owned attempt.');
        const call=observer.open(work,'journal.noteAccepted'),s=capture();try{
          if(!currentRecord||currentRecord.text!==s.text)currentRecord={text:s.text,bytes:null};
          // Facts normally already exist in the actual codec owner from target
          // validation/serialization. Missing facts require its paid path here.
          facts(work,currentRecord);if(s.undo)facts(work,s.undo);if(s.redo)facts(work,s.redo);
          if(!same(s))observationError('History changed during accepted-record fact binding.');call.finish(null);return true;
        }catch(error){call.fail(error);throw error;}
      }
    });
  });
  return journal;
}
