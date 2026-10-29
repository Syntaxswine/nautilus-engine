import {fields,finite,fail} from './validation.js';
export const ROCK_ITEM=Object.freeze({id:'item:rock',name:'Rock',kind:'throwable-distraction',units:'metres',stackable:false,consumable:false});
export const ROCK_CONTRACT=Object.freeze({id:'nautilus-rock-items-v1',version:1,stateVersion:1,noiseVersion:1,units:'metres'});
// Game tuning, not calibrated reach, ballistics or acoustics. Physics/time
// fields identify this saved simulation profile and cannot be silently changed.
export const ROCK_PROFILE=Object.freeze({id:'rock-distraction-v1',pickupReach:1.5,maxThrowRange:12,noiseRadius:8,gravity:9.81,radius:.055,stepHz:90,timeUnitsPerSecond:90000,maxAdvanceSeconds:1,maxFlightSeconds:10});
const tuning={pickupReach:[.25,3],maxThrowRange:[.5,30],noiseRadius:[0,50]};
export function profile(value={},complete=false){
  const keys=Object.keys(ROCK_PROFILE);fields(value,keys,complete?keys:[],'rock profile');
  const out={...ROCK_PROFILE,...value};
  for(const key of keys)if(tuning[key])finite(out[key],...tuning[key],key);else if(out[key]!==ROCK_PROFILE[key])fail('unsupported-profile','Unsupported rock physics/time profile: '+key+'.');
  return out;
}
export function durationUnits(dt){
  if(!Number.isFinite(dt)||dt<0||dt>ROCK_PROFILE.maxAdvanceSeconds)fail('invalid-dt','dt must be 0–1 seconds.');
  const scaled=dt*ROCK_PROFILE.timeUnitsPerSecond,units=Math.round(scaled);
  if((dt>0&&units===0)||Math.abs(scaled-units)>1e-8)fail('invalid-dt','dt must be a whole number of 1/90000-second time units; retain unsupported time in the host clock.');
  return units;
}
