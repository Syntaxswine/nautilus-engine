import {PLAYER_PORTS,providerPort} from './descriptors.js';
import {data,refusal} from './data.js';

// Retained-host adapter, not actor bootstrap or a second movement/clock kernel.
export function createTrainPlayerProvider({host,inputElement,setUIPaused,onHudBounds,camera,title,id='retained.train-yard',content}) {
  if(!host?.connector||typeof host.walk!=='function'||typeof setUIPaused!=='function'||typeof onHudBounds!=='function')throw new TypeError('Bind retained train host, UI-only clock gate and HUD-bounds consumer.');
  const actors=['player'],owners=new Set();let gateValue=false;
  const ports=[PLAYER_PORTS.scene,PLAYER_PORTS.walking,PLAYER_PORTS.pause,PLAYER_PORTS.bounds,PLAYER_PORTS.trains];if(camera)ports.push(PLAYER_PORTS.camera);if(title)ports.push(PLAYER_PORTS.title);
  const identity=data(content);
  const scene={content:identity,actorIds:actors,inputElement,
    read(actorId){if(!actors.includes(actorId))throw Error('RETAINED_ACTOR_UNAVAILABLE: this yard walking binding supplies player only.');const s=host.connector.readForActor(actorId),actor=host.actors.find(a=>a.id===actorId);
      return {version:1,actorId,mode:s.mode,contextId:JSON.stringify([s.actorId,s.mode,s.trainId,s.carId,s.entranceId,s.cabFacing,s.expected.occupancyRevision,s.floorId]),walkingAllowed:s.walkingAllowed,position:data(s.position),transport:s.mode==='on-foot'?null:{kind:'train',connectorId:s.connectorId||'train',vehicleId:s.trainId},train:s.train?{id:s.trainId,stock:s.train.stock,speedMps:s.train.speedMps}:null,status:[{id:'health',label:'Health',value:String(actor.health)},{id:'ap',label:'AP',value:String(actor.ap)}]};},
    subscribe:fn=>host.connector.subscribe(fn)
  };
  function publishGate(){const next=owners.size>0;if(next!==gateValue){gateValue=next;setUIPaused(next);}}
  const pause={acquire(owner){let blocked=false,retired=false;return {setBlocked(value){if(retired)return;blocked=!!value;if(blocked)owners.add(owner);else owners.delete(owner);publishGate();},dispose(){if(retired)return;retired=true;owners.delete(owner);publishGate();}};}};
  const services={
    [PLAYER_PORTS.scene.id]:scene,
    [PLAYER_PORTS.walking.id]:{request(intent){if(intent.actorId!=='player')return refusal('ACTOR_UNSUPPORTED','Bind this mover for the selected actor.');const before=host.connector.readForActor('player'),result=host.walk(intent.vector.x,intent.vector.y,intent.seconds);return {version:1,ok:result.ok===true,committed:result.ok===true&&result.actor?.id==='player'&&result.actor.revision!==before.expected.actorRevision,code:result.code||null,reason:result.reason||null};}},
    [PLAYER_PORTS.pause.id]:pause,
    [PLAYER_PORTS.bounds.id]:{publish:bounds=>onHudBounds(data(bounds))},
    [PLAYER_PORTS.trains.id]:host.connector
  };
  if(camera)services[PLAYER_PORTS.camera.id]=camera;if(title)services[PLAYER_PORTS.title.id]=title;
  return Object.freeze({descriptor:{id,version:1,ports:ports.map(providerPort)},services});
}
