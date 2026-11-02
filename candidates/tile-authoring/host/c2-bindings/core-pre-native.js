// Review-only pairing against fixed Corebfd. No authority/session constructor,
// Native phase, final binder, source-read issuance, writer or second meter.
import {createActualKernelSource,createActualJournal,createContinuedCore} from '../../core/c2/browser-owned-v1/integration-v1/index.js';
import {need,own} from './data.js';

export function createActualPreNativeSource(input){
 const {owner,bootstrap,deps,initialDocument,presentationProfile}=own(input,['owner','bootstrap','deps','initialDocument','presentationProfile']);
 const d=own(deps,['tiles','mapCore','authoring']);
 // The real Core factory authenticates owner and actual tiles membership
 // before invoking any method on this purported owner. No caller ready flag.
 const continuedCore=createContinuedCore(owner,{tiles:d.tiles,presentationProfile});
 const initial=owner.snapshot(bootstrap);need(initial.purpose==='bootstrap'&&initial.requestId===null&&initial.phase==='source','C2_HOST_BOOTSTRAP');
 const kernel=createActualKernelSource(owner,{deps:d,initialDocument}),checkpoint=kernel.codec.create(kernel.initialDocument);
 kernel.codec.serialize(checkpoint);kernel.requireCheckpoint(checkpoint);
 let actualJournal=null,journalStarted=false;
 const api={kernel,checkpoint,continuedCore,
  constructOriginalJournal(options){
   const config=own(options,['initialText','contextKey','maxEntries','maxBytes','maxDocumentBytes']);
   const current=owner.snapshot(bootstrap);need(!journalStarted&&current.purpose==='bootstrap'&&current.phase==='source','C2_HOST_SINGLE_JOURNAL');
   // Current Core can seed only kernel.initialDocument. Refuse any actual
   // session/cold-recovery source which differs; never silently reset history.
   need(config.initialText===kernel.encodedDocument(kernel.initialDocument),'C2_HOST_JOURNAL_SOURCE_UNBOUND');journalStarted=true;
   actualJournal=createActualJournal(owner,kernel,{contextKey:config.contextKey,maxEntries:config.maxEntries,maxBytes:config.maxBytes,maxDocumentBytes:config.maxDocumentBytes});
   return Object.freeze({journal:actualJournal.journal,historyRead:actualJournal});
  },
  requireOriginalJournal(value){need(actualJournal&&value===actualJournal,'C2_HOST_FOREIGN_JOURNAL');return actualJournal;},
  state(){return Object.freeze({actualCoreSource:'BOUND',actualRegisteredJournal:actualJournal?'BOUND':journalStarted?'UNRESOLVED':'UNBOUND',sameOwner:true,productionHost:'UNBOUND',liveSession:'UNBOUND',sourceReadOwner:'UNBOUND',observedAuthority:'UNBOUND',Native:'UNBOUND',finalBind:'UNBOUND',actualWal:'UNBOUND'});}
 };
 return Object.freeze(api);
}
