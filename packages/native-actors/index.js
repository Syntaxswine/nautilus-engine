import {NATIVE_ACTORS} from './catalogue.js';
import {plain,immutable,id,number,point,fields} from './data.js';
immutable(NATIVE_ACTORS);
export const NATIVE_ACTOR_CONTRACT=immutable({id:'nautilus-native-actors',version:1,profile:'native-mammal-walk-v1',units:'metres',frame:'world-x-y-h',roles:['idle','walk'],animation:'confirmed distance; no command authority',guide:'packages/native-actors/README.md',usageCard:'packages/native-actors/usage-card.json'});
export function listNativeActors(){return plain(NATIVE_ACTORS);}
export function nativeActor(model,roles=['idle','walk']){const spec=NATIVE_ACTORS.find(a=>a.id===model);if(!spec)throw Object.assign(Error('Native actor unavailable: '+model+'. Choose goat or donkey.'),{code:'ACTOR_MODEL_UNAVAILABLE'});
  if(!Array.isArray(roles)||!roles.length||new Set(roles).size!==roles.length||roles.some(role=>!spec.roles.includes(role)))throw Object.assign(Error('The selected native actor supplies idle/walk only; bind a reviewed provider for other animation roles.'),{code:'ACTOR_ROLE_UNAVAILABLE'});return plain(spec);}
export function confirmedActorPose(input){const p=plain(input);fields(p,['actorId','revision','position','mode']);id(p.actorId);number(p.revision,0,1e9);if(!Number.isInteger(p.revision)||!['on-foot','driver','rider'].includes(p.mode))throw Error('Use a confirmed actor revision/mode.');point(p.position);return p;}
export function nativeActorResources(model){const spec=nativeActor(model);return [spec.data,spec.paint].map(r=>({...r,url:new URL('../../'+r.path,import.meta.url).href}));}
