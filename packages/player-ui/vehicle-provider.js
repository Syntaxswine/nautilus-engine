import {PLAYER_PORTS,providerPort} from './descriptors.js';
import {vehicleBounds} from '../vehicle-core/index.js';
/** Retained car host; services/clock/surface remain borrowed. */
export function createVehiclePlayerProvider({host,inputElement,setUIPaused,onHudBounds,camera,id='retained.vehicle-yard',content}={}){
 if(!host?.connector?.readForActor||!host.walk||typeof setUIPaused!=='function'||typeof onHudBounds!=='function')throw Error('VEHICLE_PLAYER_BINDINGS');
 const owners=new Set();let gate=false;const publish=()=>{const next=owners.size>0;if(next!==gate){gate=next;setUIPaused(next);}};
 const scene={content:structuredClone(content),actorIds:host.actorIds,inputElement,actionProviders:[],
   read(actorId){const s=host.connector.readForActor(actorId),r=host.read(actorId).resources,v=s.vehicle;return {version:1,actorId,mode:s.mode,contextId:s.contextId,walkingAllowed:s.walkingAllowed,position:s.position,transport:s.vehicleId?{kind:'road-vehicle',connectorId:s.connectorId,vehicleId:s.vehicleId,seatId:s.seatId}:null,cameraFrame:v?{version:1,kind:'road-vehicle',connectorId:s.connectorId,vehicleId:v.id,centre:{...v.position},headingRad:v.headingRad,bounds:vehicleBounds(v)}:null,status:Object.entries(r||{}).filter(([,v])=>typeof v==='number').map(([id,value])=>({id,label:id,value:String(value)}))};},subscribe:fn=>host.subscribe(fn)};
 const ports=[PLAYER_PORTS.scene,PLAYER_PORTS.walking,PLAYER_PORTS.pause,PLAYER_PORTS.bounds,PLAYER_PORTS.vehicles,...(camera?[PLAYER_PORTS.camera]:[])];
 const services={[PLAYER_PORTS.scene.id]:scene,[PLAYER_PORTS.walking.id]:{request:i=>host.walk(i.actorId,i.vector,i.seconds)},[PLAYER_PORTS.bounds.id]:{publish:onHudBounds},[PLAYER_PORTS.vehicles.id]:host.connector,
   [PLAYER_PORTS.pause.id]:{acquire(owner){let retired=false;return {setBlocked(value){if(retired)return;if(value)owners.add(owner);else owners.delete(owner);publish();},dispose(){if(retired)return;retired=true;owners.delete(owner);publish();}};}}};
 if(camera)services[PLAYER_PORTS.camera.id]=camera;
 return Object.freeze({descriptor:{id,version:1,ports:ports.map(providerPort)},services});
}
