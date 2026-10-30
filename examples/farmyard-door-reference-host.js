import {createFarmyardGrenadeState,previewGrenade,grenadeAffects} from '@nautilus-engine/map-core/grenades';
import * as D from '@nautilus-engine/map-core/adapters/farmyard/doors';
import {createWorld,compileWorld} from '@nautilus-engine/map-core/world';
import {createInteractionQueries} from '@nautilus-engine/map-core/interactions';
import {inputData} from '../packages/world-core/validation.js';
export const ACTIVE_KEY='nautilus:farmyard-door-reference:active:v1',SAVE_KEY='nautilus:farmyard-door-reference:save:v1';
const copy=value=>structuredClone(value),doorFields=['id','name','x','y','edge','swing','range','open'];
const restore=(source,keys)=>{const host=copy(source);for(const key of keys)host[key]=new Set(host[key]);return host;};

// Fixed reference layout only. Current leaf geometry comes from the public
// adapter, never a second copy of its footprint formula or a donor runtime.
export function createReferenceGeometry(input){
 const fixture=inputData(input),base=fixture.context,edges=new Set(base.doors.map(door=>door.edge)),ids=new Set(base.doors.map(door=>door.id));
 const fixed=host=>JSON.stringify([host.map,Object.entries(host.edges).filter(([edge])=>!edges.has(edge)),host.props,host.obstacles,host.worldBounds]);
 const expected=fixed(fixture.source),staticBoxes=fixture.geometry.filter(box=>!ids.has(box.interactionId));let stamp=null,cached=null;
 return host=>{
  if(fixed(host)!==expected)throw Error('This reference retains its fixed authored ground layout; use another reviewed host for changed scenery.');
  const doors=host.interactables.filter(object=>object.kind==='door').map(object=>Object.fromEntries(doorFields.map(key=>[key,object[key]])));
  for(const edge of edges)if(!doors.some(door=>door.edge===edge)&&Object.hasOwn(host.edges,edge))throw Error('A deleted reference door must remove its source edge.');
  for(const door of doors){const original=base.doors.find(value=>value.id===door.id);if(!original||doorFields.some(key=>key!=='open'&&door[key]!==original[key]))throw Error('Use the fixed source leaf identities and frames.');}
  const next=JSON.stringify(doors);if(next!==stamp){const state=D.createFarmyardDoorState({id:'reference-geometry',...base,doors});cached=[...copy(staticBoxes),...D.farmyardDoorColliders(state)];stamp=next;}
  return copy(cached);
 };
}
export function referenceQueries(host,geometry){
 const bounds=host.worldBounds,world=createWorld({id:'door-reference-world',name:'Door reference ground',widthM:host.map[0].length,depthM:host.map.length,floorCount:1,storyHeightM:2.12,groundHeightM:0,heightM:4});
 world.surfaces=[{id:'ground',floorId:'floor-0',role:'floor',bounds:{min:{x:bounds.x,y:bounds.y,h:0},max:{x:bounds.x+bounds.w,y:bounds.y+bounds.h,h:0}},supports:true,supportFloorId:'floor-0'},...geometry.map((box,index)=>({id:'solid-'+index,floorId:'floor-0',role:'solid',bounds:{min:{x:box.x0,y:box.y0,h:box.z0??0},max:{x:box.x1,y:box.y1,h:box.height}},supports:false,supportFloorId:null}))];
 const mover=unit=>({id:'reference-slot-'+host.units.indexOf(unit),revision:0,position:{x:unit.x,y:unit.y,h:0},floorId:'floor-0',radiusM:.23,heightM:1.7,speedMps:1,traversal:null});
 const compiled=compileWorld(world),walking=createInteractionQueries(world,{actors:()=>host.units.filter(unit=>unit.hp>0).map(mover)});
 return {trace:(from,to)=>compiled.traceSegment({from,to}),walk(from,to){const actor=mover(host.units.find(unit=>unit.team==='squad'));return walking.walk({state:{doors:[]},actor,from:{...from,h:0},to:{...to,h:0}});}};
}
export function createFarmyardDoorReferenceHost({fixture,storage,write=(key,value)=>storage.setItem(key,value),commandId=kind=>kind+':'+crypto.randomUUID(),present=()=>{},publish=()=>{}}={}){
 if(!storage||typeof storage.getItem!=='function'||typeof write!=='function')throw Error('Supply synchronous durable reference storage.');
 const definition=inputData(fixture),geometry=createReferenceGeometry(definition),source=restore(definition.source,definition.setFields),project=host=>D.projectFarmyardDoorContext(host,{geometry:geometry(host)});
 let current={doorState:D.createFarmyardDoorState({id:'farmyard-door-reference',...project(source)}),host:source},activeStamp=storage.getItem(ACTIVE_KEY),pending=null,conflict=false,lastCommand=null,disposed=false,mutating=false,kind='action',queries=null,queryStamp=null;
 const stats={writes:0,routePublications:0,visibilityPublications:0,colliderPublications:0,presentations:0};
 const serial=pair=>D.serializeFarmyardDoorHostSave(pair.doorState,pair.host,{geometry:geometry(pair.host)}),decode=wire=>D.openFarmyardDoorHostSave(wire,{geometryForHost:geometry});
 current=decode(serial(current));
 const ready=()=>{if(disposed)throw Error('Reference host is disposed.');if(mutating)throw Error('The reference transaction is already running.');if(pending||conflict)throw Error('Reconcile the active save outcome before another action.');};
 const tokens=()=>({state:D.serializeFarmyardDoorState(current.doorState),context:D.farmyardDoorContextToken(project(current.host)),host:D.farmyardDoorHostToken(current.host)});
 const same=(a,b)=>['state','context','host'].every(key=>a[key]===b[key]);
 function adopt(transaction){current=decode(transaction.wire);if(transaction.key===ACTIVE_KEY)activeStamp=transaction.wire;pending=null;conflict=false;queries=null;if(transaction.kind==='load'||transaction.kind==='adopt-active')lastCommand=copy(current.doorState.receipts.filter(receipt=>receipt.type==='action').at(-1)?.command??null);}
 function persist(pair,expected,{key=ACTIVE_KEY,operation=kind,canCommit=()=>!disposed}={}){
  if(!same(expected,tokens())||storage.getItem(ACTIVE_KEY)!==activeStamp){conflict=true;return false;}
  const wire=serial(pair);decode(wire);const transaction={key,kind:operation,before:storage.getItem(key),wire};pending=transaction;
  if(disposed||!canCommit()){pending=null;return false;}
  try{stats.writes++;write(key,wire,canCommit);}catch{throw Error('Save outcome unknown; reconcile before retrying.');}
  adopt(transaction);return true;
 }
 const consumer={id:'door-reference-retained-fixture',contractVersion:1,schemas:[{id:D.FARMYARD_DOOR_CONTRACT.schemaId,versions:[1]}],capabilities:[D.FARMYARD_DOOR_CONTRACT.capability,...D.FARMYARD_DOOR_COMPONENT.requiredHostServices].map(id=>({id,versions:[1]}))};
 const binding=D.connectFarmyardDoors({consumer,read:()=>current,geometry,compareAndSwap:candidate=>persist({doorState:candidate.doorState,host:candidate.host},candidate.expected,{canCommit:candidate.canCommit}),invalidateRoutes:value=>{stats.routePublications++;publish('routes',copy(value));},publishVisibility:value=>{stats.visibilityPublications++;publish('visibility',copy(value));},publishColliders:value=>{stats.colliderPublications++;publish('colliders',copy(value));},present:value=>{stats.presentations++;present(copy(value));}});
 function transaction(operation,run){ready();mutating=true;kind=operation;try{return run();}finally{mutating=false;kind='action';}}
 function changeHost(edit,operation='context'){
  return transaction(operation,()=>{const expected=tokens(),next=copy(current.host);edit(next);const command={version:1,id:commandId('context'),expectedRevision:current.doorState.revision,...project(next)},staged=D.adoptFarmyardDoorHost(current.doorState,next,command,{geometry:geometry(next)});if(!staged.ok)return copy(staged);const committed=persist({doorState:staged.next,host:staged.hostNext},expected);return {ok:committed,committed,code:committed?null:'STALE_HOST'};});
 }
 const host={
  snapshot(){return copy(current);},geometry(){return geometry(current.host);},
  command(doorId,action){ready();return {version:1,id:commandId('door'),expectedRevision:current.doorState.revision,actorId:current.doorState.control.actorId,doorId,action};},
  preview(command){ready();return copy(binding.preview(command));},
  perform(command){return transaction('action',()=>{const value=inputData(command);lastCommand=copy(value);return binding.perform(value);});},
  retry(){if(!lastCommand)throw Error('No door command is available to retry.');return host.perform(copy(lastCommand));},
  move(x,y){ready();if(![x,y].every(Number.isFinite)||Math.hypot(x,y)>.251)throw Error('Reference steps are limited to .25 m.');const actor=current.host.units.find(unit=>unit.team==='squad');if(actor.stance!=='standing')throw Error('Reference steps support the standing fixture actor; retain a reviewed game mover for other stances.');const to={x:actor.x+x,y:actor.y+y},result=host.queries().walk(actor,to);if(!result.ok)return result;return changeHost(next=>{const unit=next.units.find(value=>value.id===actor.id);unit.x=to.x;unit.y=to.y;unit.isMoving=false;next.queue=[];next.revision++;},'movement');},
  queries(){const next=JSON.stringify([geometry(current.host),current.host.units.map(unit=>[unit.id,unit.x,unit.y,unit.hp])]);if(!queries||queryStamp!==next){queries=referenceQueries(current.host,geometry(current.host));queryStamp=next;}return queries;},
  probes(){const geometry=host.geometry(),source=current.host,actor=source.units.find(unit=>unit.team==='squad'),target={x:5.75,y:4},from={x:3.75,y:4,h:1};const state=createFarmyardGrenadeState(source,{id:'door-query-proof',geometry}),grenade=previewGrenade(state,{actorId:actor.id,point:target});return {movement:host.queries().walk({x:3.75,y:4},{x:5.25,y:4}).ok,sight:!host.queries().trace(from,{...target,h:1.5}),projectile:!host.queries().trace(from,{...target,h:.9}),grenade:{ok:grenade.ok,code:grenade.code,trajectory:grenade.trajectory},blastAcrossDoor:grenadeAffects(state,{x:3.75,y:4},target),geometry};},
  // Explicit review controls mutate only retained fixture facts. Rules still run
  // through the adapter; these are not production mission/AI handlers.
  review(edit){return changeHost(edit,'review-context');},
  save(){return transaction('save',()=>{const wire=serial(current);if(!persist(current,tokens(),{key:SAVE_KEY,operation:'save'}))throw Error('Active record changed.');return wire;});},
  load(){return transaction('load',()=>{const wire=storage.getItem(SAVE_KEY);if(wire===null)throw Error('There is no saved reference.');const pair=decode(wire);if(!persist(pair,tokens(),{operation:'load'}))throw Error('Active record changed.');return host.snapshot();});},
  reconcile(){if(disposed||mutating)throw Error('Reference host is unavailable.');if(!pending)return {ok:true,outcome:'unchanged'};const transaction=pending,stored=storage.getItem(transaction.key);if(stored===transaction.wire){adopt(transaction);return {ok:true,outcome:'committed',kind:transaction.kind};}if(stored===transaction.before){pending=null;conflict=false;return {ok:true,outcome:'refused',kind:transaction.kind};}conflict=true;throw Error('The active record matches neither known outcome. Validate and adopt the active record explicitly.');},
  adoptActive(){if(disposed||mutating)throw Error('Reference host is unavailable.');conflict=true;const wire=storage.getItem(ACTIVE_KEY);if(wire===null)throw Error('No active reference exists.');decode(wire);adopt({wire,key:ACTIVE_KEY,kind:'adopt-active'});return host.snapshot();},
  diagnostics(){return {...stats,pending:!!pending,pendingKind:pending?.kind??null,conflict,lastCommand:copy(lastCommand),disposed};},
  dispose(){if(disposed)return;disposed=true;binding.dispose();queries=null;}
 };
 return Object.freeze(host);
}
