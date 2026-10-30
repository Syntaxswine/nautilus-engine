// Complete retained-host boundary; no donor loader, guard policy or cost rules.
import {data,fields,plain,id,integer,finite,list,canonical,clone,freeze,fail} from '../../../windows-core/data.js';
import {WINDOW_GEOMETRY_CONTRACT as C,WINDOW_PANE_CONTRACT as P,WINDOW_HOST_SERVICES} from '../../../windows-core/contract.js';
import {readCompiled,openWindowGeometry,serializeWindowGeometry,inspectWindowGeometry} from '../../../windows-core/compiler.js';
import {openWindowState,serializeWindowState,windowStateBaseGeometry,windowStateGeometry,stageConfirmedWindowImpact,windowRequirements} from '../../../windows-core/state.js';
import {checkWindowImpact,windowReceiptId,createWindowImpactAuthority,retireWindowImpactAuthority,ownService,point,digest} from '../../../windows-core/impact.js';
import {sha256} from '../../../parts-core/hash.js';
import {queryWindowSegment} from '../../../windows-core/query.js';
const kind='nautilus-farmyard-window-host-save',setKeys=['seen','visible','detected'],saveKeys=['kind','version','geometry','windowState','sequenceOrigin','source','setFields'];
function copySource(input){
  if(!plain(input))fail('INVALID_SOURCE','/source','Retain the complete plain source save.');const source={},setFields=[];
  for(const key of Reflect.ownKeys(input)){
    const d=Object.getOwnPropertyDescriptor(input,key);if(typeof key!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))fail('INVALID_DATA','/source','Host fields must be own enumerable data.');let value=d.value;
    if(setKeys.includes(key)&&value&&Object.getPrototypeOf(value)===Set.prototype){if(Reflect.ownKeys(value).length)fail('INVALID_DATA','/source/'+key,'Only intrinsic unmodified source sets are supported.');setFields.push(key);value=Array.from(Set.prototype.values.call(value));}
    Object.defineProperty(source,key,{value,enumerable:true,writable:true,configurable:true});
  }
  setFields.sort((a,b)=>setKeys.indexOf(a)-setKeys.indexOf(b));return {source:data(source),setFields};
}
const restoreSource=(source,keys)=>{const copy=clone(source);for(const key of keys)copy[key]=new Set(copy[key]);return copy;};
function portable(input){
  const value=ownService(input,saveKeys,'/save'),copied=copySource(value.source),metadata=data(Object.fromEntries(saveKeys.filter(key=>key!=='source').map(key=>[key,value[key]])));
  list(metadata.setFields,3,'/setFields');if(new Set(metadata.setFields).size!==metadata.setFields.length||metadata.setFields.some(key=>!setKeys.includes(key))||canonical(metadata.setFields)!==canonical([...metadata.setFields].sort((a,b)=>setKeys.indexOf(a)-setKeys.indexOf(b))))fail('INVALID_SET_FIELDS','/setFields','Preserve explicit native set types in the documented order.');
  if(copied.setFields.length&&canonical(copied.setFields)!==canonical(metadata.setFields))fail('INVALID_SET_FIELDS','/setFields','Source set types and their saved representation disagree.');
  const save=data({...metadata,source:copied.source});if(save.kind!==kind||save.version!==1)fail('UNSUPPORTED_HOST_SAVE','/kind','Use the complete retained Farmyard pane host-save v1.');return save;
}
const live=save=>({...clone(save),source:restoreSource(save.source,save.setFields)});
export function farmyardWindowSourceToken(source){return sha256(JSON.stringify(copySource(source)));}
export const farmyardWindowHostToken=value=>sha256(JSON.stringify(portable(value)));
const doorKinds=new Set(['door','closed-door','door-open','door-closed','jail-door-open','jail-door-closed','locked-door','door-locked']);
const wallKinds=new Set(['wall','brick','concrete','corrugated']);
function edgeKind(kind,path){if(kind===undefined)return 'empty';if(doorKinds.has(kind))return 'door';if(wallKinds.has(kind))return 'wall';fail('UNSUPPORTED_EDGE_FACT',path,'Classify unfamiliar edge families deliberately; no name-prefix inference is permitted.');}
function checkSource(save,state,base){
  const s=save.source,g=readCompiled(base);if(!plain(s)||!plain(s.solo)||s.solo.version!==2)fail('INVALID_SOURCE','/source/solo','Retain the complete solo-v2 source.');
  for(const key of ['revision','seed','elapsed'])finite(s[key],'/source/'+key);integer(s.revision,0,Number.MAX_SAFE_INTEGER,'/source/revision');integer(save.sequenceOrigin,0,Number.MAX_SAFE_INTEGER,'/sequenceOrigin');integer(s.windowSequence,0,Number.MAX_SAFE_INTEGER,'/source/windowSequence');
  list(s.map,240,'/source/map');if(s.map.length!==g.world.grid.height||s.map.some(row=>!Array.isArray(row)||row.length!==g.world.grid.width||row.some(cell=>typeof cell!=='string')))fail('CONTENT_MISMATCH','/source/map','The complete retained grid must match the fixed window world.');
  for(const key of ['queue','log','units','windows','interactables'])list(s[key],key==='units'?128:key==='windows'?1024:65536,'/source/'+key);
  for(const key of setKeys)list(s[key],65536,'/source/'+key);
  if(!plain(s.edges)||!plain(s.windowBreaks)||s.edgeLocks!==undefined&&!plain(s.edgeLocks))fail('INVALID_SOURCE','/source','Retain explicit edges and broken masks; loading cannot repair missing fields.');
  if(canonical(s.windowBreaks)!==canonical(state.broken))fail('HOST_PANE_MISMATCH','/source/windowBreaks','Host masks and authoritative pane state must agree atomically.');
  if(s.windowSequence!==save.sequenceOrigin+state.receipts.filter(r=>r.outcome==='pane-broken').length)fail('HOST_PANE_MISMATCH','/source/windowSequence','Preserve the original sequence and every accepted break.');
  const normalized=s.windows.map((p,i)=>{if(!plain(p))fail('INVALID_SOURCE','/source/windows/'+i,'Use native placement records.');const copy=clone(p);delete copy.underlay;return copy;});
  if(canonical(normalized)!==canonical(g.document.placements))fail('CONTENT_MISMATCH','/source/windows','Retain exact placement order, IDs, joins, dimensions and appearance.');
  const actorIds=new Set();for(const [i,unit]of s.units.entries()){
    if(!plain(unit)||!plain(unit.ammo)||!Array.isArray(unit.pack))fail('INVALID_SOURCE','/source/units/'+i,'Retain complete actor resources and inventory.');
    for(const key of ['hp','ap','stamina','maxHp','maxAp','maxStamina','x','y'])finite(unit[key],'/source/units/'+i+'/'+key);
    if(typeof unit.id==='string')id(unit.id,'/source/units/'+i+'/id');else integer(unit.id,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,'/source/units/'+i+'/id');const key=JSON.stringify([typeof unit.id,unit.id]);if(actorIds.has(key)||!['squad','guard'].includes(unit.team))fail('INVALID_SOURCE','/source/units/'+i,'Retain unique typed actor identities and source teams.');actorIds.add(key);
    if(unit.z!==undefined&&unit.z!==0)fail('UNSUPPORTED_FLOOR','/source/units/'+i+'/z','The named pane host profile is ground-only.');
  }
  for(const record of g.content)for(const edge of record.coveredEdges){
    if(edgeKind(s.edges[edge],'/source/edges/'+edge)==='door'||Object.hasOwn(s.edgeLocks??{},edge)||(s.interactables??[]).some(item=>item?.edge===edge))fail('WINDOW_DOOR_CONFLICT','/source/edges/'+edge,'Covered edges cannot contain any native/jail door family, edge occupant or lock.');
    const p=s.windows.find(p=>p.id===record.placementId);if(p.underlay!==undefined){if(!plain(p.underlay)||Object.keys(p.underlay).some(e=>!record.coveredEdges.includes(e)))fail('INVALID_UNDERLAY','/source/windows','Retain only original covered edge underlays.');const old=p.underlay[edge];if(old!==undefined){const fact=g.edgeFacts.find(f=>f.edge===edge)?.underlay;if(edgeKind(old,'/source/windows/underlay')==='door'||!fact||fact.sourceKind!==old||fact.semantic!==edgeKind(old,'/source/windows/underlay')||fact.locked)fail('WINDOW_DOOR_CONFLICT','/source/windows/underlay','A preserved source underlay needs matching reviewed semantic facts and cannot contain a door.');}}
  }
}
const paneKey=save=>sha256(canonical({geometry:save.geometry,windowState:save.windowState}));
function decoded(input,definitions,cache){const save=typeof input==='string'?portable(data(input)):portable(input),key=paneKey(save);let proven=cache?.get(key);if(!proven){const base=openWindowGeometry(save.geometry,{definitions}),state=openWindowState(base,save.windowState);proven={base,state,geometry:windowStateGeometry(state)};if(cache){cache.set(key,proven);while(cache.size>2)cache.delete(cache.keys().next().value);}}checkSource(save,proven.state,proven.base);return {save,...proven,token:farmyardWindowHostToken(save)};}
export function createFarmyardWindowHostSave(state,source,options){const value=data(options);fields(value,['sequenceOrigin'],'/options');const copied=copySource(source),save=data({kind,version:1,geometry:JSON.parse(serializeWindowGeometry(windowStateBaseGeometry(state))),windowState:JSON.parse(serializeWindowState(state)),sequenceOrigin:value.sequenceOrigin,source:copied.source,setFields:copied.setFields});checkSource(save,state,windowStateBaseGeometry(state));return live(save);}
export function openFarmyardWindowHostSave(input,options){const {definitions}=ownService(options,['definitions'],'/options');return live(decoded(input,definitions).save);}
export function serializeFarmyardWindowHostSave(input,options){const {definitions}=ownService(options,['definitions'],'/options');return JSON.stringify(decoded(input,definitions).save);}
export function windowCompleteQueryToken(input){const value=data(input);fields(value,['hostToken','geometryDigest','contextToken','ray','hit'],'/query');return sha256(canonical(value));}
function errorMessage(error){try{if(typeof error==='string')return error.slice(0,512);if(error!==null&&['object','function'].includes(typeof error)){const d=Object.getOwnPropertyDescriptor(error,'message');if(d&&Object.hasOwn(d,'value')&&typeof d.value==='string')return d.value.slice(0,512);}}catch{}return 'Borrowed service threw without a safe data message.';}
function bindVersioned(input,required,optional=[]){const keys=Reflect.ownKeys(input??{});const value=ownService(input,keys,'/services');if(keys.some(k=>!['version',...required,...optional].includes(k))||value.version!==1)fail('UNSUPPORTED_HOST_SERVICE','/services','Use exact version-1 service bindings.');for(const key of required)if(typeof value[key]!=='function'&&key!=='definitions')fail('MISSING_BINDING','/services/'+key,'Bind the actual host service function.');if(!Object.hasOwn(value,'version')||required.some(k=>!Object.hasOwn(value,k)))fail('MISSING_BINDING','/services','A required host service is absent.');for(const key of optional)if(value[key]!==undefined&&typeof value[key]!=='function')fail('INVALID_BINDING','/services/'+key,'Optional presentation must be a function.');return value;}
export function connectFarmyardWindows(input){
  const services=ownService(input,WINDOW_HOST_SERVICES.map(s=>s.id),'/services'),fixed=bindVersioned(services[WINDOW_HOST_SERVICES[0].id],['definitions']),queries=bindVersioned(services[WINDOW_HOST_SERVICES[1].id],['capture','context']),impacts=bindVersioned(services[WINDOW_HOST_SERVICES[2].id],['confirm']),atomic=bindVersioned(services[WINDOW_HOST_SERVICES[3].id],['read','compareAndSwap']),publication=bindVersioned(services[WINDOW_HOST_SERVICES[4].id],['invalidate','publish'],['present']),saves=bindVersioned(services[WINDOW_HOST_SERVICES[5].id],['validate']);
  const fixedDefinitions=ownService(fixed.definitions,['sourceCommit','version','resolve'],'/definitions');let retired=false,operation=null;const validationCache=new Map();
  function run(task){if(retired)fail('DISPOSED','/binding','The connection is retired.');if(operation)fail('REENTRANT_OPERATION','/binding','Finish the active operation before reusing the connection.');const owner={};operation=owner;const active=()=>!retired&&operation===owner,check=()=>{if(!active())fail('DISPOSED','/binding','This operation no longer owns an active connection.');};try{return task({active,check});}finally{operation=null;}}
  function definitions(check){return {...fixedDefinitions,resolve(request){check();const result=fixedDefinitions.resolve(clone(request));check();return result;}};}
  function snapshot(check){check();const loan=atomic.read();check();return decoded(loan,definitions(check),validationCache);}
  function validate(save,operation,previousToken,check){const loan=clone({operation,save,previousToken}),before=JSON.stringify(loan);check();const accepted=saves.validate(loan);check();if(JSON.stringify(data(loan))!==before)fail('IMPURE_SAVE_VALIDATION','/services','Whole-save validation cannot mutate its detached loan.');if(accepted!==true)fail('HOST_SAVE_REFUSED','/source','The host did not accept the complete prospective save.');}
  function context(s,check){const source=restoreSource(s.save.source,s.save.setFields),loan=Object.freeze({source,geometry:freeze(inspectWindowGeometry(s.geometry))}),before=farmyardWindowSourceToken(source);check();const token=queries.context(loan);check();if(before!==farmyardWindowSourceToken(source))fail('IMPURE_GEOMETRY_QUERY','/services/context','A complete context lookup cannot mutate its detached source.');return digest(token,'/query/contextToken');}
  function capture(s,ray,check){
    queryWindowSegment(s.geometry,ray);s.contextToken=context(s,check);const source=restoreSource(s.save.source,s.save.setFields),loan=Object.freeze({source,geometry:freeze(inspectWindowGeometry(s.geometry)),ray:freeze(clone(ray))}),before=farmyardWindowSourceToken(source);
    check();const raw=queries.capture(loan);check();if(before!==farmyardWindowSourceToken(source))fail('IMPURE_GEOMETRY_QUERY','/services','The complete query cannot change its detached source.');
    const result=data(raw);fields(result,['hit','contextToken'],'/query');digest(result.contextToken,'/query/contextToken');if(result.contextToken!==s.contextToken)fail('STALE_QUERY_CONTEXT','/query/contextToken','The complete query must refer to the same captured world/actor/geometry context.');if(result.hit!==null){const h=result.hit;fields(h,['placementId','partId','paneId','definitionDigest','point','tEnter'],'/query/hit');id(h.placementId,'/query/hit/placementId');id(h.partId,'/query/hit/partId',32);if(h.paneId!==null)id(h.paneId,'/query/hit/paneId',32);digest(h.definitionDigest,'/query/hit/definitionDigest');point(h.point,'/query/hit/point');finite(h.tEnter,'/query/hit/tEnter');if(h.tEnter<=1e-7||h.tEnter>1)fail('INVALID_QUERY_HIT','/query/hit/tEnter','Use the exact positive native segment entry.');}
    const hostToken=farmyardWindowSourceToken(source),queryToken=windowCompleteQueryToken({hostToken,geometryDigest:s.geometry.geometryDigest,contextToken:s.contextToken,ray,hit:result.hit});return {hostToken,queryToken,contextToken:s.contextToken,geometryDigest:s.geometry.geometryDigest,geometryRevision:s.geometry.queryRevision,hit:result.hit};
  }
  run(({check})=>{const current=snapshot(check);context(current,check);validate(current.save,'connect',current.token,check);});
  function commit(current,next,result,recovery,lease,restore=false){
    const refused=(code,reason)=>({...result,ok:false,code,reason,next:current.state,hostNext:live(current.save),receipt:null,effects:[],consequences:[],committed:false,presentationErrors:[],publicationStopped:retired?'disposed':null});
    const unknown=(error,reason)=>({...refused('COMMIT_OUTCOME_UNKNOWN','Recover from authoritative persistence with the exact original command/save; do not allocate a new identity.'),committed:null,publicationStopped:'unknown',commitErrors:[{service:'compareAndSwap',reason,message:errorMessage(error)}],recovery:clone(recovery)});
    const expected={token:current.token,state:serializeWindowState(current.state),hostToken:farmyardWindowSourceToken(restoreSource(current.save.source,current.save.setFields)),geometryDigest:current.geometry.geometryDigest,contextToken:current.contextToken,queryToken:result.queryToken??null};
    let acknowledgement,writeOpen=true;lease.check();try{acknowledgement=atomic.compareAndSwap({expected:clone(expected),next:live(next.save),nextContextToken:next.contextToken,canCommit:()=>writeOpen&&lease.active()});}catch(error){return unknown(error,'threw');}finally{writeOpen=false;}
    if(acknowledgement!==true&&acknowledgement!==false)return unknown(acknowledgement,'non-boolean-return');if(!acknowledgement)return refused(retired?'DISPOSED':'STALE_HOST','The complete atomic host/state/context comparison or final write fence refused.');
    const presentationErrors=[],token=next.token;let publicationStopped=retired?'disposed':null;
    const effects=[['invalidate',()=>publication.invalidate(clone({receiptId:result.receipt?.id??recovery.token,geometryDigest:next.geometry.geometryDigest,geometryRevision:next.geometry.queryRevision}))],['publish',()=>publication.publish({receiptId:result.receipt?.id??recovery.token,geometry:inspectWindowGeometry(next.geometry),source:restoreSource(next.save.source,next.save.setFields)})]];
    if(!restore&&publication.present&&result.effects.length)effects.push(['present',()=>publication.present(clone({receiptId:result.receipt.id,effects:result.effects}))]);
    for(const [service,publish]of effects){if(!lease.active()){publicationStopped='disposed';break;}try{const currentNow=snapshot(lease.check);if(currentNow.token!==token||context(currentNow,lease.check)!==next.contextToken){publicationStopped='stale';break;}}catch(error){publicationStopped=retired?'disposed':'unavailable';if(!retired)presentationErrors.push({service:'read',message:errorMessage(error)});break;}try{publish();}catch(error){presentationErrors.push({service,message:errorMessage(error)});}if(!lease.active()){publicationStopped='disposed';break;}}
    return {...result,hostNext:live(next.save),committed:true,presentationErrors,publicationStopped};
  }
  function perform(input,lease){
    const request=checkWindowImpact(input),current=snapshot(lease.check);let stagedSource,query;
    const authority=createWindowImpactAuthority({version:1,confirm(loan){
      query=capture(current,request.confirmation.ray,lease.check);
      if(query.hostToken!==request.confirmation.hostToken||query.queryToken!==request.confirmation.queryToken)fail('STALE_QUERY_CONTEXT','/confirmation','The exact complete-world query/host tokens changed.');
      const h=query.hit;if(!h||['placementId','partId','paneId','definitionDigest'].some(key=>h[key]!==loan.hit[key])||['x','y','h'].some(key=>h.point?.[key]!==loan.hit.point[key])||h.tEnter!==loan.hit.tEnter)fail('NOT_NEAREST_WORLD_HIT','/confirmation','The retained complete world/actor query did not select this member.');
      const source=restoreSource(current.save.source,current.save.setFields),borrowed={command:clone(request),hit:clone(query.hit),source,query:clone(query)},before=farmyardWindowSourceToken(source),other=canonical({command:borrowed.command,hit:borrowed.hit,query:borrowed.query});lease.check();const response=impacts.confirm(borrowed);lease.check();
      if(before!==farmyardWindowSourceToken(source)||other!==canonical(data({command:borrowed.command,hit:borrowed.hit,query:borrowed.query})))fail('IMPURE_CONFIRMATION','/services','Confirm against a detached source copy and return a separate prospective host.');
      const confirmed=ownService(response,['attestation','sourceNext'],'/confirmationResult');stagedSource=copySource(confirmed.sourceNext);if(canonical(stagedSource.setFields)!==canonical(current.save.setFields))fail('INVALID_SET_FIELDS','/source','A pane impact cannot change retained set representation.');return confirmed.attestation;
    }});
    let result;try{result=stageConfirmedWindowImpact(current.geometry,current.state,request,{authority});}finally{retireWindowImpactAuthority(authority);}
    if(!result.ok||result.repeated)return {...result,hostNext:live(current.save),committed:false,presentationErrors:[],publicationStopped:null};
    const beforePane=data({...current.save,source:stagedSource.source});checkSource(beforePane,current.state,current.base);
    const source=clone(stagedSource.source);source.windowBreaks=clone(result.next.broken);if(result.receipt.outcome==='pane-broken'){source.windowSequence++;source.revision++;}
    const candidate={...current.save,windowState:JSON.parse(serializeWindowState(result.next)),source};validationCache.set(paneKey(candidate),{base:current.base,state:result.next,geometry:windowStateGeometry(result.next)});while(validationCache.size>2)validationCache.delete(validationCache.keys().next().value);
    const next=decoded(candidate,definitions(lease.check),validationCache);next.contextToken=context(next,lease.check);validate(next.save,'stage',current.token,lease.check);
    return commit(current,next,{...result,queryToken:query.queryToken},{operation:'perform',command:request,receiptId:windowReceiptId(request)},lease);
  }
  return Object.freeze({
    manifest(){return {id:'bound-farmyard-window-host',contractVersion:1,schemas:[{id:P.kind,versions:[1]}],capabilities:[{id:P.capability,versions:[1]},...WINDOW_HOST_SERVICES.map(s=>({id:s.id,versions:[1]}))]};},
    query(ray){const request=data(ray);return run(({check})=>{const current=snapshot(check);return clone({...capture(current,request,check),scope:{profileId:current.state.profileId,sceneId:current.state.sceneId,stateId:current.state.id,contentEpoch:current.state.contentEpoch,contentDigest:current.state.contentDigest,expectedRevision:current.state.revision}});});},
    perform(input){const request=checkWindowImpact(input);return run(lease=>perform(request,lease));},
    save(){return run(({check})=>{const current=snapshot(check);validate(current.save,'save',current.token,check);return JSON.stringify(current.save);});},
    restore(input){
      const captured=typeof input==='string'?data(input):portable(input);return run(lease=>{
        const current=snapshot(lease.check),next=decoded(captured,definitions(lease.check),validationCache),a=current.state,b=next.state;current.contextToken=context(current,lease.check);next.contextToken=context(next,lease.check);
        if(a.id!==b.id||a.sceneId!==b.sceneId||a.contentEpoch!==b.contentEpoch||a.contentDigest!==b.contentDigest||current.save.sequenceOrigin!==next.save.sequenceOrigin||canonical(current.save.setFields)!==canonical(next.save.setFields)||canonical(current.save.geometry)!==canonical(next.save.geometry)||a.receipts.length>b.receipts.length||a.receipts.some((r,i)=>canonical(r)!==canonical(b.receipts[i])))fail('RESTORE_HISTORY_CONFLICT','/windowState','Live adoption cannot rewind, replace scope/content/sequence origin or discard/change durable receipts.');
        validate(next.save,'restore',current.token,lease.check);const result={ok:true,code:null,reason:'',next:next.state,receipt:null,effects:[],consequences:[],repeated:current.token===next.token};
        if(result.repeated)return {...result,hostNext:live(current.save),committed:false,presentationErrors:[],publicationStopped:null};return commit(current,next,result,{operation:'restore',save:captured,token:next.token},lease,true);
      });
    },
    dispose(){retired=true;validationCache.clear();}
  });
}
