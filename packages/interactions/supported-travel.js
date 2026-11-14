// Optional supported walking: bounded plain-data paths, physical 3D distance.
// Actor wire fields remain unchanged; the host checkpoints an explicit travel receipt.
import {interactionData,object,id,number,integer,point,distance,samePoint,routeLength,routePoint,copy,fail} from './state.js';
export const SUPPORTED_WALK_CONTRACT=Object.freeze({id:'nautilus-supported-surface-walking-v1',version:1,profile:'supported-surface-v1',standardStoryM:2.12,naturalStepM:2.12/8,maxPathPoints:65,maxPathM:40});
const profiles={'natural-eighth-story-v1':2.12/8,'mount-dora-source-deck-v1':.4};
export function createSupportedWalkPolicy(options={}){
 const data=interactionData(options);object(data,['id','upM','downM'],'supported walk policy options',[]);const name=data.id??'natural-eighth-story-v1';if(typeof name!=='string'||!Object.hasOwn(profiles,name))fail('SUPPORTED_POLICY','Choose a named supported walking policy.');const bound=profiles[name],upM=data.upM??bound,downM=data.downM??bound;number(upM,0,bound,'maximum step up');number(downM,0,bound,'maximum step down');return Object.freeze({id:name,version:1,upM,downM});
}
export function supportedPolicy(value){const p=interactionData(value);object(p,['id','version','upM','downM'],'supported walk policy');if(p.version!==1)fail('SUPPORTED_POLICY','Keep a supported walking policy version.');const valid=createSupportedWalkPolicy({id:p.id,upM:p.upM,downM:p.downM});return copy(valid);}
export function supportedQuery(bindings,name,value){
 if(bindings?.worldId!==value.state.worldId||typeof bindings[name]!=='function')fail('MISSING_BINDING','Bind '+name+' for this supported world.');const result=interactionData(bindings[name](copy(value)));if(typeof result.ok!=='boolean')fail('INVALID_BINDING','Supported queries must return an explicit ok result.');if(!result.ok)fail(result.code||'BLOCKED',result.reason||'Supported walking is blocked.');return result;
}
export function supportPath(data,policy){
 object(data,['path','segments'],'supported path');if(!Array.isArray(data.path)||data.path.length<1||data.path.length>SUPPORTED_WALK_CONTRACT.maxPathPoints||!Array.isArray(data.segments)||data.segments.length!==data.path.length-1)fail('INVALID_BINDING','Supply a bounded supported path and segment kinds.');
 for(const node of data.path){object(node,['position','floorId','supportId'],'supported path node');point(node.position);id(node.floorId);id(node.supportId);}
 for(let i=0;i<data.segments.length;i++){const kind=data.segments[i],a=data.path[i].position,b=data.path[i+1].position,rise=b.h-a.h;if(!['surface','step'].includes(kind)||distance(a,b)<1e-9)fail('INVALID_BINDING','Supported path segments need real finite travel.');if(kind==='surface'&&rise!==0)fail('INVALID_BINDING','A level support segment must retain foot elevation.');if(kind==='step'&&(Math.abs(rise)<1e-9||rise>policy.upM+1e-9||-rise>policy.downM+1e-9))fail('STEP_BOUND','A real height transition must fit the selected explicit step policy.');}
 const lengthM=routeLength(data.path.map(p=>p.position));number(lengthM,0,SUPPORTED_WALK_CONTRACT.maxPathM,'supported path length');return lengthM;
}
export function openSupportedTravel(value,{state,actor,policy,geometryKey}){
 const v=interactionData(value);object(v,['kind','version','worldId','worldRevision','actorId','actorRevision','actorFloorId','policy','geometryKey','path','segments','stopAtEnd','distanceM','heading'],'supported travel');
 if(v.kind!=='nautilus-supported-travel'||v.version!==1)fail('SUPPORTED_TRAVEL_VERSION','Use supported travel version 1.');id(v.worldId);id(v.actorId);id(v.actorFloorId);integer(v.worldRevision,'supported world revision');integer(v.actorRevision,'supported actor revision');
 if(v.worldId!==state.worldId||v.worldRevision!==state.revision||v.actorId!==actor.id||v.actorRevision!==actor.revision||v.actorFloorId!==actor.floorId)fail('STALE_SUPPORTED_TRAVEL','Bind the exact actor/world state that retained this partial travel.');
 if(JSON.stringify(supportedPolicy(v.policy))!==JSON.stringify(policy)||v.geometryKey!==geometryKey)fail('SUPPORTED_TRAVEL_IDENTITY','Restore the same support policy and authoritative geometry.');
 object(v.heading,['x','y'],'supported heading');number(v.heading.x,-1,1,'supported heading x');number(v.heading.y,-1,1,'supported heading y');if(Math.abs(Math.hypot(v.heading.x,v.heading.y)-1)>1e-7)fail('INVALID_DATA','Retain a normalized supported heading.');
 if(typeof v.stopAtEnd!=='boolean')fail('INVALID_DATA','Retain an explicit supported path end policy.');const lengthM=supportPath({path:v.path,segments:v.segments},policy);number(v.distanceM,0,lengthM,'supported travel distance');if(lengthM===0||v.distanceM<=0||v.distanceM>=lengthM||!samePoint(routePoint(v.path.map(n=>n.position),v.distanceM),actor.position))fail('SUPPORTED_TRAVEL_POSE','The exact saved actor pose must match partial physical travel.');return v;
}
export function floorAfterTravel(path,fromM,toM,currentFloor){
 const stations=[0];for(let i=1;i<path.length;i++)stations.push(stations.at(-1)+distance(path[i-1].position,path[i].position));
 const crossed=stations.map((at,i)=>({at,i})).filter(({at})=>toM>=fromM?at>fromM+1e-8&&at<=toM+1e-8:at<fromM-1e-8&&at>=toM-1e-8).sort((a,b)=>toM>=fromM?a.at-b.at:b.at-a.at);
 return crossed.length?path[crossed.at(-1).i].floorId:currentFloor;
}
export function activeSupportedStep(travel){let station=0;for(let i=0;i<travel.segments.length;i++){const end=station+distance(travel.path[i].position,travel.path[i+1].position);if(travel.distanceM>station+1e-8&&travel.distanceM<end-1e-8)return travel.segments[i]==='step';station=end;}return false;}
