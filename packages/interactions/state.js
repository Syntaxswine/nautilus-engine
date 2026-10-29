// Plain-data interaction sidecar. Portable maps and character sheets stay unchanged.
import {inputData} from '../world-core/validation.js';
export const INTERACTION_CONTRACT=Object.freeze({
  id:'nautilus-standard-interactions',version:1,capability:'nautilus-standard-interactions-v1',profile:'bounded-kinematic-v1',
  coordinates:'metres; x/y ground, h feet height',
  documentation:new URL('../../docs/standard-interactions.md',import.meta.url).href
});
export const copy=value=>structuredClone(value);
export const axes=['x','y','h'];
export function fail(code,message){const error=new Error(message);error.code=code;throw error;}
export function object(value,keys,name,required=keys){
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value))||Reflect.ownKeys(value).some(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return typeof key!=='string'||!keys.includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value');})||required.some(key=>!Object.hasOwn(value,key)))fail('INVALID_DATA','Invalid '+name+' fields.');
}
export function number(value,min,max,name){if(!Number.isFinite(value)||value<min||value>max)fail('INVALID_DATA','Invalid '+name+'.');}
export function integer(value,name){number(value,0,1e9,name);if(!Number.isInteger(value))fail('INVALID_DATA','Invalid '+name+'.');}
export function id(value,name='ID'){if(typeof value!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9_.:/-]{0,95}(?![\s\S])/.test(value))fail('INVALID_DATA','Invalid '+name+'.');}
export function label(value){if(typeof value!=='string'||!value.trim()||value.length>160)fail('INVALID_DATA','Provide a short label.');}
export function point(value){object(value,axes,'metre point');for(const axis of axes)number(value[axis],-65536,65536,'coordinate');}
export function box(value){object(value,['min','max'],'bounds');point(value.min);point(value.max);for(const axis of axes)if(value.min[axis]>=value.max[axis])fail('INVALID_DATA','Interaction bounds need positive volume.');}
export function boolean(value){if(typeof value!=='boolean')fail('INVALID_DATA','Expected a boolean.');}
export const distance=(a,b)=>Math.hypot(...axes.map(axis=>a[axis]-b[axis]));
export const samePoint=(a,b)=>distance(a,b)<1e-7;
export function landing(value){object(value,['floorId','surfaceId','position'],'landing');id(value.floorId);id(value.surfaceId);point(value.position);}
export function routeLength(path){return path.slice(1).reduce((total,p,index)=>total+distance(path[index],p),0);}
export function routePoint(path,distanceM){
  let remaining=distanceM;
  for(let index=1;index<path.length;index++){
    const length=distance(path[index-1],path[index]);
    if(length>0&&remaining<=length)return Object.fromEntries(axes.map(axis=>[axis,path[index-1][axis]+(path[index][axis]-path[index-1][axis])*remaining/length]));
    remaining-=length;
  }
  return copy(path.at(-1));
}
export function interactionData(value,allowText=false){
  if(typeof value==='string'&&(!allowText||value.length>4000000))fail('INVALID_DATA','Supply bounded interaction JSON data.');
  try{
    // Keep the existing four-million-character profile. The larger byte budget
    // accommodates valid Unicode; strict descriptors/JSON are checked before
    // serialization or cloning can invoke accessors or erase hidden data.
    const data=inputData(value,16000000);
    if(JSON.stringify(data).length>4000000)fail('INVALID_DATA','Interaction data is limited to four million JSON characters.');
    return data;
  }catch(error){fail('INVALID_DATA','Interaction input requires finite bounded plain JSON: '+error.message);}
}
export function openInteractionState(value){
  const state=interactionData(value,true);object(state,['kind','version','profile','worldId','revision','doors','stairs'],'interaction state');
  if(state.kind!==INTERACTION_CONTRACT.id||state.version!==1||state.profile!==INTERACTION_CONTRACT.profile)fail('UNSUPPORTED_PROFILE','Use standard interactions v1 with bounded-kinematic-v1.');
  id(state.worldId);integer(state.revision,'world revision');const seen=new Set();
  for(const key of ['doors','stairs']){
    if(!Array.isArray(state[key])||state[key].length>4096)fail('INVALID_DATA','Invalid '+key+' list.');
    for(const record of state[key]){
      id(record.id);if(seen.has(record.id))fail('INVALID_DATA','Interaction IDs must be unique.');seen.add(record.id);label(record.label);
      number(record.reachM,.05,10,'interaction reach');
      if(key==='doors'){
        object(record,['id','label','floorId','position','reachM','closedBounds','openBounds','motionBounds','open','locked'],'door');
        id(record.floorId);point(record.position);box(record.closedBounds);box(record.motionBounds);if(record.openBounds!==null)box(record.openBounds);
        boolean(record.open);boolean(record.locked);if(record.open&&record.locked)fail('INVALID_DATA','A locked door must be closed.');
        for(const bounds of [record.closedBounds,record.openBounds].filter(Boolean))for(const axis of axes)if(bounds.min[axis]<record.motionBounds.min[axis]||bounds.max[axis]>record.motionBounds.max[axis])fail('INVALID_DATA','Door motion bounds must contain both poses.');
      }else{
        object(record,['id','label','from','to','path','widthM','clearanceM','bidirectional','reachM'],'stairs');
        landing(record.from);landing(record.to);boolean(record.bidirectional);number(record.widthM,.1,20,'stair width');number(record.clearanceM,.1,20,'head clearance');
        if(record.from.floorId===record.to.floorId||record.from.position.h===record.to.position.h)fail('INVALID_DATA','Stairs must connect distinct floor heights.');
        if(!Array.isArray(record.path)||record.path.length<2||record.path.length>128)fail('INVALID_DATA','Provide 2–128 stair route points.');
        record.path.forEach(point);
        if(!samePoint(record.path[0],record.from.position)||!samePoint(record.path.at(-1),record.to.position))fail('INVALID_DATA','Stair route ends must match the declared landings.');
        const sign=Math.sign(record.to.position.h-record.from.position.h);
        for(let index=1;index<record.path.length;index++){
          const a=record.path[index-1],b=record.path[index];
          if(distance(a,b)<1e-7||(b.h-a.h)*sign<0||a.x===b.x&&a.y===b.y)fail('INVALID_DATA','Stairs require a monotonic walking route, including horizontal run.');
        }
        number(routeLength(record.path),.01,4096,'route length');
      }
    }
  }
  if(JSON.stringify(state).length>4000000)fail('INVALID_DATA','Interaction sidecars are limited to four million JSON characters. Split or migrate this authored set deliberately.');
  return state;
}
export function createInteractionState(options){
  const data=interactionData(options);object(data,['worldId','doors','stairs'],'interaction options',['worldId']);const {worldId,doors=[],stairs=[]}=data;
  return openInteractionState({kind:INTERACTION_CONTRACT.id,version:1,profile:INTERACTION_CONTRACT.profile,worldId,revision:0,doors,stairs});
}
export function serializeInteractionState(state){return JSON.stringify(openInteractionState(state));}
export function openInteractionActor(value){
  const actor=interactionData(value,true);object(actor,['id','revision','position','floorId','radiusM','heightM','speedMps','traversal'],'interaction actor');
  id(actor.id);integer(actor.revision,'actor revision');point(actor.position);id(actor.floorId);
  number(actor.radiusM,.05,5,'body radius');number(actor.heightM,.1,10,'body height');number(actor.speedMps,.01,20,'walk speed');
  if(actor.traversal!==null){
    const travel=actor.traversal;object(travel,['stairId','direction','distanceM','path'],'traversal');id(travel.stairId);
    if(![1,-1].includes(travel.direction))fail('INVALID_DATA','Invalid stair direction.');
    if(!Array.isArray(travel.path)||travel.path.length<3||travel.path.length>129)fail('INVALID_DATA','Invalid saved traversal route.');
    travel.path.forEach(point);number(routeLength(travel.path),0,4106,'saved route length');number(travel.distanceM,0,routeLength(travel.path),'travel distance');
    if(!samePoint(actor.position,routePoint(travel.path,travel.distanceM)))fail('INVALID_DATA','Saved actor position does not match stair progress.');
  }
  return actor;
}
export function createInteractionActor(options){
  const data=interactionData(options);object(data,['id','position','floorId','radiusM','heightM','speedMps'],'actor options',['id','position','floorId']);const {id:actorId,position,floorId,radiusM=.25,heightM=1.7,speedMps=2}=data;
  return openInteractionActor({id:actorId,revision:0,position,floorId,radiusM,heightM,speedMps,traversal:null});
}
export function serializeInteractionActor(actor){return JSON.stringify(openInteractionActor(actor));}
export function bump(value){if(value.revision>=1e9)fail('REVISION_LIMIT','Checkpoint and migrate the revision before further actions.');value.revision++;}

export function interactionRequirements(input){openInteractionState(input);return {schema:{id:INTERACTION_CONTRACT.id,version:1},required:[{id:INTERACTION_CONTRACT.capability,minVersion:1,maxVersion:1}],optional:[]};}
