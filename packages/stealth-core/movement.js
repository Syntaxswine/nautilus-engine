import {openCharacter} from '../rules-core/index.js';
import {fields,number,fail} from './data.js';
export const MOVEMENT_MODES=Object.freeze({walk:Object.freeze({speed:1,apMultiplier:1}),run:Object.freeze({speed:2,apMultiplier:.5}),sneak:Object.freeze({speed:.5,apMultiplier:1.5})});
export const STANCE_MOVE_AP=Object.freeze({standing:2,kneeling:4,prone:8});
export function movementMode(mode,stance){if(!Object.hasOwn(MOVEMENT_MODES,mode)||!Object.hasOwn(STANCE_MOVE_AP,stance))fail('STEALTH_PROFILE','Unsupported movement mode or stance.');}
export function previewStealthMove(character,input){
  const actor=openCharacter(character);fields(input,['version','mode','stance','distanceM','terrainCost','injuryMultiplier','loadMultiplier','walkSpeedMps','chargeAP']);
  if(input.version!==1||typeof input.chargeAP!=='boolean')fail('STEALTH_PROFILE','Use movement specification v1 with an explicit AP policy.');
  const {mode,stance,distanceM,terrainCost,injuryMultiplier,loadMultiplier,walkSpeedMps,chargeAP}=input;movementMode(mode,stance);
  number(distanceM,0,40);number(terrainCost,0,100);number(injuryMultiplier,1,100);number(loadMultiplier,1,100);number(walkSpeedMps,.01,20);
  // AFT applies movement mode before injury. Load affects stamina independently.
  const ap=chargeAP?STANCE_MOVE_AP[stance]*distanceM*terrainCost*MOVEMENT_MODES[mode].apMultiplier*injuryMultiplier:0,
    stamina=distanceM*loadMultiplier*(stance==='prone'?3:mode==='run'?4:mode==='sneak'?2:1),
    staminaRequired=stance==='prone'||mode!=='walk',rawSneak=actor.stats.sneak,effectiveSneak=Math.min(100,rawSneak+(mode==='sneak'?20:0)),
    code=actor.resources.hp<=0?'ACTOR_INACTIVE':actor.resources.ap+1e-8<ap?'INSUFFICIENT_AP':staminaRequired&&actor.resources.stamina+1e-8<stamina?'INSUFFICIENT_STAMINA':null;
  return {ok:!code,code,profile:'aft-exposure-v1',speedMps:walkSpeedMps*MOVEMENT_MODES[mode].speed,requestedCosts:{ap,stamina},costs:{ap,stamina:Math.min(actor.resources.stamina,stamina)},rawSneak,effectiveSneak,noiseRadiusM:mode==='sneak'?3:10,staminaRequired};
}
