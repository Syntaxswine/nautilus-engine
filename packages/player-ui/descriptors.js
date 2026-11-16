import {data,frozen} from './data.js';

export const PLAYER_UI_CONTRACT=frozen({id:'nautilus-player-ui',version:1,stage:1,configuration:'nautilus-player-ui-configuration',action:'nautilus-player-action',controlContext:'nautilus-player-control-context',bootstrap:'retained providers only; automatic defaults belong to Stage2'});
const port=(id,direction,role,schema,units='none',frame='none',required=true)=>({id,service:{id,version:1},direction,role,schema,units,frame,cardinality:'one',ownership:'borrowed endpoint',lifetime:'composition',required});
export const PLAYER_PORTS=frozen({
  scene:port('nautilus.player-scene','input','confirmed-state','urn:nautilus:player-scene:1','metres; m/s','world-x-y-h'),
  walking:port('nautilus.walk-intent','output','request','urn:nautilus:walk-intent:1','normalised vector; seconds','world-ground-x-y'),
  pause:port('nautilus.ui-pause','output','request','urn:nautilus:ui-pause-gate:1'),
  bounds:port('nautilus.hud-bounds','output','confirmed-state','urn:nautilus:hud-safe-bounds:1','CSS pixels','viewport-client'),
  trains:port('nautilus.train-connector','input','confirmed-state','urn:nautilus:train-connector:1','metres; m/s','world-x-y-h'),
  vehicles:port('nautilus.road-vehicle-connector','input','confirmed-state','urn:nautilus:road-vehicle-connector:1','metres; m/s; radians; normalised throttle/steering','world-x-y-h; car-relative +forward/+right'),
  camera:port('nautilus.camera-settings','output','request','urn:nautilus:camera-settings:1','relative zoom','view'),
  title:port('nautilus.title-flow','input','confirmed-state','urn:nautilus:title-flow:1')
});
const choice=(id,label,values,initial,change='live')=>({id,label,type:'enum',values,default:initial,change});
export const PLAYER_COMPONENTS=frozen([
  {id:'player.shell',version:1,label:'Player interface',ports:[PLAYER_PORTS.scene,PLAYER_PORTS.pause,PLAYER_PORTS.bounds],settings:[choice('skin','Material',['farmyard','tinderbox'],'farmyard'),choice('layout','Controls layout',['auto','desktop','phone'],'auto','pause'),choice('actions','Action presentation',['text','icon-text','pictogram'],'icon-text')]},
  {id:'player.walking',version:1,label:'Walking',ports:[PLAYER_PORTS.walking],settings:[{id:'pace',label:'Walking pace',type:'number',min:.5,max:1,step:.1,default:1,change:'live',units:'request scale; no actor-stat changes'}]},
  {id:'player.trains',version:1,label:'Train controls',ports:[PLAYER_PORTS.trains],settings:[choice('steamProfile','Steam controls',['compact-notched','classic'],'compact-notched','pause'),{id:'muted',label:'Mute train sounds',type:'boolean',default:false,change:'live'}]},
  {id:'player.vehicles',version:1,label:'Road vehicle controls',ports:[PLAYER_PORTS.vehicles],settings:[]},
  {id:'player.camera',version:1,label:'Camera',ports:[PLAYER_PORTS.camera],settings:[choice('mode','Camera',['follow','overview'],'follow'),{id:'zoom',label:'View distance',type:'number',min:.7,max:1.5,step:.1,default:1,change:'live',units:'relative zoom'}]},
  {id:'player.title',version:1,label:'Title flow',ports:[PLAYER_PORTS.title],settings:[]}
].map(component=>({...component,guide:component.id==='player.vehicles'?'docs/road-vehicles.md':'packages/player-ui/README.md',usageCard:component.id==='player.vehicles'?'packages/vehicle-core/usage-card.json':'packages/player-ui/usage-card.json'})));
export function playerDescriptors() {return data(PLAYER_COMPONENTS);}
export function providerPort(port) {return {...data(port),direction:port.direction==='input'?'output':'input'};}
export function compatiblePort(consumer,provider) {
  return consumer.id===provider.id&&consumer.service.id===provider.service.id&&consumer.service.version===provider.service.version&&consumer.direction!==provider.direction&&['role','schema','units','frame','cardinality','lifetime'].every(k=>consumer[k]===provider[k]);
}
export const PLAYER_PRESETS=frozen([
  {id:'farmyard-phone',label:'Farmyard phone',settings:{'player.shell':{skin:'farmyard',layout:'phone'},'player.walking':{pace:1},'player.trains':{steamProfile:'classic'}}},
  {id:'tinderbox-cab',label:'Tinderbox cab',settings:{'player.shell':{skin:'tinderbox',layout:'phone'},'player.walking':{pace:.8},'player.trains':{steamProfile:'compact-notched'}}},
  {id:'desktop',label:'Desktop workshop',settings:{'player.shell':{skin:'farmyard',layout:'desktop'},'player.walking':{pace:1},'player.trains':{steamProfile:'compact-notched'}}}
]);
