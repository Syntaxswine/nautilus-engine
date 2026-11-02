// Private pure candidate. No registration or commit authority.
import * as C1 from '../../../../packages/tile-authoring-core/index.js';
import {Budget,readData,corePort,fail,refusal} from './data.js';
import {STAGE_A,PROFILES,CAPS,LIMITS} from './contract.js';
import {parsePlanInput,deriveAppearancePlan,finishPlan} from './planning.js';
export {bindTileAuthoringTarget} from './target.js';
export {createRectangleDefinition} from '../../../../packages/tile-authoring-core/index.js';
export {sealTileContentRecord} from './model.js';
export {inspectTileAuthoringRequirements} from './requirements.js';
export function planTileAuthoring(actual,input){
 let requestId='invalid-request';try{
  const b=new Budget(),t=corePort(actual),raw=readData(input,b,b.limits.inputBytes);
  const command=typeof raw.command==='string'?readData(raw.command,b,b.limits.commandBytes,{chargeInput:false}):raw.command;requestId=command?.requestId??raw.appearanceSource?.original?.requestId;
  if(!Object.hasOwn(raw,'appearanceSource')){
   if(command?.operations?.some(x=>STAGE_A.includes(x.kind)||['stroke.group','owner.remove'].includes(x.kind)))fail('C2_HOST_PROFILE_UNBOUND','/appearanceSource','Old Host calls cannot opt into C2 through availableProfiles strings.');
   return C1.planTileAuthoring(actual,raw);
  }
  // The outer object was already strictly copied once. Charge the per-field finite reads.
  const v=parsePlanInput(raw,b,{alreadyRead:true}),p=deriveAppearancePlan(t,v,b);return finishPlan(t,p,b);
 }catch(e){return refusal(requestId,e);}
}
export function tileAuthoringDiscovery(){return Object.freeze({kind:'nautilus-tile-authoring-c2-private-discovery',version:1,checkpoint:'A',publicRegistration:false,committable:false,profiles:PROFILES,operations:STAGE_A,limits:LIMITS,allocationCaps:CAPS,geometryPreparation:false,combinedPlacement:false,decoder:false,renderer:false,hostAuthority:false});}
