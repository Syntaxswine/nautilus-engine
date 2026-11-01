import {createWindowAuthoringJournal} from './journal.js';
import {boundedData,fields,fail,failure} from './data.js';
import {prepareWindowAuthoring,readPrepared,serializeWindowAuthoring,inspectWindowAuthoring,windowAuthoringReadiness} from './prepare.js';
import {commandCandidate} from './commands.js';

// Owns authored text/history and resource-free preparations only. UI-owned
// acquisition is staged outside this object, then the exact candidate accepts.
// No runtime connection, state constructor, impact journal or renderer is owned.
export function createWindowAuthoringDocument(input,options={}) {
  const settings=boundedData(options);fields(settings,['contextKey','maxHistoryEntries','maxHistoryBytes'],'/options',[]);
  let queryRevision=0;
  const initial=prepareWindowAuthoring(input,{queryRevision}),contextKey=Object.hasOwn(settings,'contextKey')?settings.contextKey:'window-authoring-v1:251bf8094b5f9ebe44208443084c1a6d6658512a:industrial-windows/2';
  const journal=createWindowAuthoringJournal({initialText:serializeWindowAuthoring(readPrepared(initial).document),contextKey,maxEntries:Object.hasOwn(settings,'maxHistoryEntries')?settings.maxHistoryEntries:64,maxBytes:Object.hasOwn(settings,'maxHistoryBytes')?settings.maxHistoryBytes:16_000_000});
  journal.accept(journal.beginRebuild(),initial);const candidates=new WeakMap();
  const current=()=>journal.snapshot.compilation.value;
  const attempt=run=>{try{return run();}catch(error){return failure(error);}};
  function stage(ticket,preparation) {
    const candidate=Object.freeze({kind:'window-authoring-candidate',version:1,prepared:preparation,baseRevision:ticket.baseRevision,contextKey:ticket.contextKey});
    candidates.set(candidate,{ticket,preparation});return {ok:true,candidate};
  }
  function prepareText(begin) {
    const ticket=begin();if(!ticket)return {ok:false,code:'AUTHORING_HISTORY_EMPTY',diagnostics:[]};
    try{return stage(ticket,prepareWindowAuthoring(ticket.targetText,{queryRevision:++queryRevision}));}
    catch(error){journal.reject(ticket);throw error;}
  }
  function accept(candidate) {
    const found=candidates.get(candidate);
    if(!found)return {ok:false,code:'AUTHORING_UNKNOWN_CANDIDATE',diagnostics:[]};
    const result=journal.accept(found.ticket,found.preparation);candidates.delete(candidate);
    if(!result.ok)return {...result,code:'AUTHORING_STALE_PREPARATION'};
    return {...result,history:{...journal.snapshot.history}};
  }
  function prepare(command) {
    journal.cancel();
    return attempt(()=>{
      const next=commandCandidate(current(),command),preparation=prepareWindowAuthoring(next,{queryRevision:++queryRevision}),text=serializeWindowAuthoring(readPrepared(preparation).document);
      if(text===journal.snapshot.text)fail('AUTHORING_NO_CHANGE','/command','This command makes no authored change.');
      return stage(journal.beginEdit(text),preparation);
    });
  }
  const api={
    get snapshot(){const s=journal.snapshot;return {document:structuredClone(readPrepared(current()).document),revision:s.revision,contextKey:s.contextKey,preparationCurrent:s.compilationCurrent,prepared:s.compilationCurrent?current():null,history:{...s.history},pending:!!s.pending};},
    serialize(){return journal.snapshot.text;},
    inspect(){return {...inspectWindowAuthoring(current()),preparationCurrent:journal.snapshot.compilationCurrent};},
    readiness(){const result=windowAuthoringReadiness(current());return {...result,preparationCurrent:journal.snapshot.compilationCurrent};},
    prepare,accept,
    apply(command){const result=prepare(command);return result.ok?accept(result.candidate):result;},
    prepareOpen(value){journal.cancel();return attempt(()=>{const preparation=prepareWindowAuthoring(value,{queryRevision:++queryRevision});return stage(journal.beginOpen(serializeWindowAuthoring(readPrepared(preparation).document)),preparation);});},
    prepareUndo(){return attempt(()=>prepareText(()=>journal.beginUndo()));},
    prepareRedo(){return attempt(()=>prepareText(()=>journal.beginRedo()));},
    prepareRebuild(){return attempt(()=>prepareText(()=>journal.beginRebuild()));},
    undo(){const result=api.prepareUndo();return result.ok?accept(result.candidate):result;},
    redo(){const result=api.prepareRedo();return result.ok?accept(result.candidate):result;},
    open(value){const result=api.prepareOpen(value);return result.ok?accept(result.candidate):result;},
    reject(candidate){const found=candidates.get(candidate);if(!found)return false;candidates.delete(candidate);return journal.reject(found.ticket);},
    isCurrent(candidate){const found=candidates.get(candidate);return !!found&&found.ticket===journal.snapshot.pending;},
    cancel(){return journal.cancel();},
    setContext(value){return journal.setContext(value);}
  };
  return Object.freeze(api);
}
