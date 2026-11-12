import {mountVectorControl} from '../player-ui/walking.js';
const bad=(code,reason)=>({version:1,ok:false,committed:false,code,reason});
/** Borrowed connector, ordinary shared vector gesture, no clock/scene ownership. */
export function mountVehicleControls(container,{connector,actorId,inScope,onError=()=>{}}){
 if(connector?.contract?.id!=='nautilus-road-vehicle-connector'||connector.contract.version!==1||!connector.readForActor||!connector.dispatch||!connector.release||!connector.actions)throw Error('VEHICLE_CONNECTOR: bind the version1 road connector.');
 const owner='vehicle-ui/'+globalThis.crypto.randomUUID(),actions=connector.actions(actorId);let blocked=true,retired=false;
 const releaseInput=()=>connector.release(owner);
 const vector=mountVectorControl(container,{inScope,kind:'vehicle',onRelease:releaseInput});
 const read=()=>connector.readForActor(actorId);
 function requestControl(control,offer){if(retired||blocked)return bad('VEHICLE_INPUT_BLOCKED','This car control does not own input.');const s=read();if(s.mode!=='driver')return bad('VEHICLE_DRIVER_ONLY','Only a confirmed driver can steer.');if(offer!==JSON.stringify(s.expected))return bad('STALE_VEHICLE_LEASE','Refresh the confirmed driver control offer.');try{return connector.dispatch({version:1,type:'control',actorId,owner,expected:s.expected,...control});}catch(e){onError(e);return bad('VEHICLE_CONTROL_SCHEMA',e.message);}}
 return Object.freeze({element:vector.element,owner,releaseInput,
   setBlocked(value){blocked=!!value||retired;vector.setEnabled(!blocked&&read().mode==='driver');if(blocked)releaseInput();},
   readActionView(){const view=actions.read();return {...view,actions:view.actions.map(a=>({...a,enabled:!blocked&&a.enabled}))};},
   requestAction(id,offer){return retired||blocked?bad('VEHICLE_INPUT_BLOCKED','This car action does not own input.'):actions.request(id,offer);},
   readControlView:()=>({version:1,blocked,owner,snapshot:read(),offer:JSON.stringify(read().expected)}),requestControl,
   advanceInput(){if(blocked||retired)return;const s=read();if(s.mode!=='driver')return;const v=vector.read(),held=vector.isHeld();if(held||s.lease?.owner===owner)return requestControl({throttle:-v.y,steering:v.x,held},JSON.stringify(s.expected));},
   focus:()=>vector.focus(),
   dispose(){if(retired)return;retired=true;blocked=true;vector.dispose();releaseInput();}
 });
}
