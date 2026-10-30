// Plain presentation boundary. Intentionally imports no core/kernel module.
export const WINDOW_PRESENTATION=Object.freeze({kind:'nautilus-window-presentation',version:1,profileId:'farmyard-quarter-turn-first-hit-pane-v1',sourceCommit:'251bf8094b5f9ebe44208443084c1a6d6658512a',sourceVersion:'industrial-windows/2'});
export function fail(code,message){const e=new Error(message);e.code=code;throw e;}
// Do not execute getters, retain caller loans, accept nonfinite values or silently
// JSON-repair unsupported input. Limits bound presentation validation, not saves.
export function plain(input){
  const seen=new Set();let nodes=0;
  function copy(v){
    if(++nodes>250000)fail('PROJECTION_LIMIT','Presentation data is too large.');
    if(v===null||typeof v==='boolean')return v;
    if(typeof v==='string'){if(v.length>8192)fail('PROJECTION_LIMIT','Presentation string is too large.');return v;}
    if(typeof v==='number'&&Number.isFinite(v))return v;
    if(typeof v!=='object'||seen.has(v))fail('INVALID_PROJECTION','Use finite acyclic plain data.');
    if(Object.getPrototypeOf(v)!==(Array.isArray(v)?Array.prototype:Object.prototype)&&Object.getPrototypeOf(v)!==null)fail('INVALID_PROJECTION','Use plain records/arrays.');
    seen.add(v);const out=Array.isArray(v)?[]:{};const descriptors=Object.getOwnPropertyDescriptors(v);
    for(const key of Reflect.ownKeys(descriptors)){
      if(key==='length'&&Array.isArray(v))continue;
      const d=descriptors[key];if(typeof key!=='string'||!d.enumerable||!('value'in d)||['__proto__','constructor','prototype'].includes(key))fail('INVALID_PROJECTION','Use plain enumerable data fields.');
      Object.defineProperty(out,key,{value:copy(d.value),enumerable:true,writable:true,configurable:true});
    }
    if(Array.isArray(v)&&Object.keys(out).length!==v.length)fail('INVALID_PROJECTION','Sparse arrays are unsupported.');
    seen.delete(v);return out;
  }
  return copy(input);
}
export const scopeKey=p=>JSON.stringify([p.scope.profileId,p.scope.sceneId,p.scope.stateId,p.scope.contentEpoch,p.scope.contentDigest]);
export const contentKey=p=>JSON.stringify(p.windows.map(w=>({...w,broken:undefined})));
export function projectAcceptedWindowPresentation(core,state){
  for(const key of ['serializeWindowState','windowStateGeometry','inspectWindowGeometry'])if(typeof core?.[key]!=='function')fail('MISSING_CORE_API','Borrow the actual installed core API: '+key);
  // These three calls MUST come from the module instance that owns state.
  const s=JSON.parse(core.serializeWindowState(state)),g=core.inspectWindowGeometry(core.windowStateGeometry(state));
  if(s.contentDigest!==g.contentDigest||s.geometryDigest!==g.geometryDigest||s.geometryRevision!==g.queryRevision||s.sceneId!==g.sceneId||s.profileId!==g.profileId)fail('PROJECTION_MISMATCH','Accepted state and geometry differ.');
  const last=s.receipts.at(-1),command=last?.command;
  return plain({kind:WINDOW_PRESENTATION.kind,version:1,
    scope:{profileId:s.profileId,sceneId:s.sceneId,stateId:s.id,contentEpoch:s.contentEpoch,contentDigest:s.contentDigest},
    revision:s.revision,geometryRevision:s.geometryRevision,geometryDigest:s.geometryDigest,
    windows:g.document.placements.map((placement,i)=>({placement,engineInstanceId:g.content[i].engineInstanceId,definitionDigest:g.content[i].definitionDigest,panes:g.content[i].panes,definition:g.resolvedDefinitions[i],broken:s.broken[placement.id]??[]})),
    latestReceipt:last?{id:last.id,revision:last.revision,outcome:last.outcome,placementId:command.placementId,paneId:command.paneId,point:command.confirmation.point,direction:command.confirmation.direction,cause:command.confirmation.cause}:null});
}
