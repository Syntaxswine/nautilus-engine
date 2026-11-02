// UI CONFORMANCE DOUBLE v1. No tile kernel, checkpoint, CAS, save, renderer,
// geometry, gesture routing or gameplay proof. Logs UI calls and injects snapshots.
import {SMART_TILE_INTERFACE,smartTileActions} from '../../../apps/editor/smart-tile/contract.js';
const copy=value=>structuredClone(value);
export function createSmartTileUIFixture(){
  const calls=[],listeners=new Set(),behaviors=new Map();
  let disposed=0,throwsOnRead=false,unsubscribeThrows=false;
  let snapshot={
    version:SMART_TILE_INTERFACE.version,phase:'idle',tool:'rectangle',selectedOwnerId:null,
    draft:null,reviewId:null,requestId:null,recoveryId:null,revision:0,checkpointSerial:0,
    history:{undo:0,redo:0,bytes:0,maxEntries:64,maxBytes:16000000},
    floor:{id:'ground',label:'G',elevationM:.37,mode:'manual'},
    owners:[
      {id:'paving-a',recipeId:'shared-paving',locked:false,shapeKind:'region',skinId:'stone.original',floorId:'ground'},
      {id:'paving-b',recipeId:'shared-paving',locked:true,shapeKind:'region',skinId:'stone.original',floorId:'ground'}
    ],
    readiness:{authoring:'UI fixture — not evaluated',saveability:'UI fixture — not persisted',shape:'No kernel in this fixture',visual:'No tile renderer in this fixture',query:'Not provided',support:'Not provided',navigation:'Not provided',fire:'Not provided',water:'Not provided',game:'Not provided'},
    diagnostics:[],resources:{acceptedRoots:0,candidateRoots:0,retiringRoots:0,triangles:0,cells:0}
  };
  const flags=()=>{snapshot.actions=smartTileActions({phase:snapshot.phase,manual:snapshot.floor.mode==='manual',selected:!!snapshot.selectedOwnerId,hasDraft:!!snapshot.draft,undo:snapshot.history.undo,redo:snapshot.history.redo});};
  flags();
  const notify=()=>{for(const listener of [...listeners])listener(copy(snapshot));};
  const patch=(value,{deriveActions=true}={})=>{snapshot={...snapshot,...copy(value)};if(deriveActions)flags();notify();};
  const invoke=(name,args,normal)=>{
    calls.push({name,args:copy(args)});
    if(behaviors.has(name))return behaviors.get(name)(...args);
    return normal?.();
  };
  const adapter={
    getSnapshot(){if(throwsOnRead)throw Error('Fixture read fault');return copy(snapshot);},
    subscribe(listener){listeners.add(listener);listener(copy(snapshot));return()=>{listeners.delete(listener);if(unsubscribeThrows)throw Error('Fixture unsubscribe fault');};},
    setTool(tool){return invoke('setTool',[tool],()=>{patch({tool,phase:'idle',draft:null,reviewId:null});return {ok:true};});},
    selectOwner(id){return invoke('selectOwner',[id],()=>{patch({selectedOwnerId:id});return {ok:true};});},
    setDraft(draft){return invoke('setDraft',[draft],()=>{patch({draft,tool:draft.tool,phase:'draft',reviewId:null});return {ok:true};});},
    review(){return invoke('review',[],()=>{patch({phase:'review',reviewId:'fixture-review-1',requestId:'fixture-request-1'});return Promise.resolve({ok:true,reviewId:'fixture-review-1',requestId:'fixture-request-1'});});},
    apply(reviewId){return invoke('apply',[reviewId],()=>{patch({phase:'idle',draft:null,reviewId:null,revision:snapshot.revision+1});return Promise.resolve({ok:true,committed:true,requestId:snapshot.requestId});});},
    cancel(reason){return invoke('cancel',[reason],()=>{patch({phase:'idle',draft:null,reviewId:null});return {ok:true};});},
    undo(){return invoke('undo',[],()=>Promise.resolve({ok:true,committed:true,requestId:'fixture-undo'}));},
    redo(){return invoke('redo',[],()=>Promise.resolve({ok:true,committed:true,requestId:'fixture-redo'}));},
    save(){return invoke('save',[],()=>({ok:true,checkpointJSON:'{"uiFixtureOnly":true,"notAnAuthoringCheckpoint":true}'}));},
    open(value){return invoke('open',[value],()=>Promise.resolve({ok:true}));},
    recover(requestId){return invoke('recover',[requestId],()=>Promise.resolve({ok:true,committed:true,requestId}));},
    retryPresentation(){return invoke('retryPresentation',[],()=>Promise.resolve({ok:true}));},
    dispose(){disposed++;}
  };
  return Object.freeze({version:1,label:'UI conformance double only',adapter,calls,
    patch,peek:()=>copy(snapshot),on:(name,callback)=>behaviors.set(name,callback),
    readFault:value=>{throwsOnRead=value;},unsubscribeFault:value=>{unsubscribeThrows=value;},
    diagnostics:()=>({subscriptions:listeners.size,adapterDisposeCalls:disposed}),
    clearCalls:()=>{calls.length=0;}
  });
}
