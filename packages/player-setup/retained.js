import {createTrainPlayerProvider} from '../player-ui/index.js';
import {SETUP_PORTS,output} from './configuration.js';
import {plain} from '../native-actors/data.js';
export {createRetainedFrameSource} from './clock.js';

// Publish already-working services once. No world/clock/command/save is created
// or stopped, and no host data is normalized or adopted into a new authority.
export function retainTrainYard({host,content,surface,clock,setUIPaused,camera,onHudBounds,id='retained.train-yard'}={}){
  if(!surface?.renderer||!surface?.scene||!surface?.camera||!surface?.canvas||typeof clock?.subscribe!=='function')throw Error('RETAINED_SERVICES: bind the shared surface and phased host clock.');
  if(camera&&typeof onHudBounds!=='function')throw Error('RETAINED_HUD_BOUNDS: supply the retained camera framing endpoint or select the default camera.');
  const provider=createTrainPlayerProvider({host,content,inputElement:surface.canvas,setUIPaused,onHudBounds:onHudBounds||(()=>{}),...(camera?{camera}:{}),id});
  const services={...provider.services,[SETUP_PORTS.surface.id]:surface,[SETUP_PORTS.clock.id]:clock,
    [SETUP_PORTS.pose.id]:{read(actorId){const actor=host.actors.find(a=>a.id===actorId),s=host.connector.readForActor(actorId);if(!actor)throw Error('RETAINED_ACTOR_UNAVAILABLE');return plain({actorId,revision:actor.revision,position:s.position,mode:s.mode});}}};
  // Let the default camera supply both endpoints unless the retained game binds
  // its own staged camera and HUD framing together explicitly.
  const ports=provider.descriptor.ports.filter(p=>!['nautilus.hud-bounds','nautilus.camera-settings'].includes(p.id));
  if(camera){ports.push(...provider.descriptor.ports.filter(p=>['nautilus.hud-bounds','nautilus.camera-settings'].includes(p.id)));}
  return Object.freeze({descriptor:{id,version:1,ports:[...ports,output(SETUP_PORTS.surface),output(SETUP_PORTS.clock),output(SETUP_PORTS.pose)]},services});
}
