import {identifyRange,detectRange,inCone,sightOf} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/perception.js';
import {fields,id,number,point,clamp,fail,copy,stable} from './data.js';
export const AWARENESS=Object.freeze({suspicious:25,identified:100,decay:2});
// Source-exact AFT rate: raw Sneak enters skill; the effective +20 bonus belongs
// to the range cap, not this second calculation.
export function awarenessRate({distance,exposure,light,contrast=0,perception=50,stealth=20,sneaking=false,running=false,moving=false,stance='standing',alert=false,concealment=0}){
  for(const [value,max]of [[distance,1e6],[exposure,1],[light,1],[contrast,1],[perception,100],[stealth,100],[concealment,1e6]])number(value,0,max);
  if(!['standing','kneeling','prone'].includes(stance)||[sneaking,running,moving,alert].some(v=>typeof v!=='boolean'))fail('STEALTH_DATA','Explicit awareness flags/stance required.');
  const skill=clamp(1+(perception-stealth)/100,.35,1.8),motion=moving?(running?1.65:1.2):.65,posture=stance==='prone'?.45:stance==='kneeling'?.75:1;
  return 8*clamp(1-distance/70,.12,1)*exposure*clamp(light+contrast*.35,.06,1)*skill*motion*posture*(sneaking?.55:1)*(alert?1.5:1)*Math.exp(-concealment*.35);
}
function observer(v){fields(v,['id','position','heading','perception','alert','ap','maxAp'],['species','cone']);id(v.id);point(v.position);number(v.heading,-180,180);number(v.perception,0,100);number(v.ap);number(v.maxAp,1);if(v.ap>v.maxAp||typeof v.alert!=='boolean')fail('STEALTH_DATA','Observer resources/alert are invalid.');if(v.species!==undefined&&!Object.hasOwn({horse:1,donkey:1,goat:1,cow:1,sheep:1,hen:1,'pig-foreman':1,'pig-director':1,skunk:1},v.species))fail('STEALTH_PROFILE','Unsupported sight species; supply an explicit cone without a species.');if(v.cone!==undefined)number(v.cone,0,360);return {...v,x:v.position.x,y:v.position.y};}
function target(v){fields(v,['id','position','mode','stance','rawSneak','moving','ap','maxAp']);id(v.id);point(v.position);if(!['walk','sneak','run'].includes(v.mode)||!['standing','kneeling','prone'].includes(v.stance)||typeof v.moving!=='boolean')fail('STEALTH_PROFILE','Unsupported target motion.');number(v.rawSneak,1,100);number(v.ap);number(v.maxAp,1);if(v.ap>v.maxAp)fail('STEALTH_DATA','Target AP exceeds its bound.');return {...v,x:v.position.x,y:v.position.y};}
export function previewAwareness(input){
  fields(input,['version','observer','target','visibility','concealment']);if(input.version!==1)fail('STEALTH_PROFILE','Use exposure observation v1.');
  const a=observer(input.observer),b=target(input.target),v=input.visibility;fields(v,['zones','light','contrast','spotlit']);
  if(a.id===b.id||!Array.isArray(v.zones)||new Set(v.zones).size!==v.zones.length||v.zones.some(z=>!['head','torso','legs'].includes(z))||typeof v.spotlit!=='boolean')fail('STEALTH_DATA','Supply distinct actors and visible body zones from authoritative host rays.');
  number(v.light,0,1);number(v.contrast,0,1);number(input.concealment,0,1e6);
  // AFT CHARACTER_RANGE is 60 m; its acquisition-rate falloff separately uses 70.
  const distance=Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y,a.position.h-b.position.h),effectiveSneak=Math.min(100,b.rawSneak+(b.mode==='sneak'?20:0)),cap=b.mode==='sneak'?Math.max(8,60-20-effectiveSneak*.2-(b.stance==='prone'?10:0)):60,
    adjustedDistance=distance+9*input.concealment,
    // Body rays, facing and lamp eligibility remain a single host observation.
    geometric=!v.zones.length?0:adjustedDistance<=identifyRange(a,b,cap)?2:b.moving&&adjustedDistance<=detectRange(a,b,cap)?1:0,
    ordinary=b.mode!=='sneak'&&inCone(a,b)&&distance<=60*sightOf(a).range&&v.zones.length>0&&v.light>=.25,
    candidate=v.zones.length&&(v.spotlit||ordinary)?2:geometric,
    exposure=v.zones.reduce((n,z)=>n+(z==='torso'?.5:.25),0),
    rate=candidate?awarenessRate({distance,exposure,light:v.light,contrast:v.contrast,perception:a.perception,stealth:b.rawSneak,sneaking:b.mode==='sneak',running:b.mode==='run',moving:b.moving,stance:b.stance,alert:a.alert,concealment:input.concealment}):0,
    immediate=!!candidate&&(v.spotlit||ordinary||candidate===2&&(distance<=1.5&&exposure>=.5||distance<=3&&v.light>=.25&&exposure>=.25));
  return {candidate,rate,exposure,light:v.light,rawSneak:b.rawSneak,effectiveSneak,concealment:input.concealment,distance,immediate,position:copy(b.position),observerId:a.id,targetId:b.id,signature:stable([input.observer,input.target]),observerAP:a.ap,observerMaxAP:a.maxAp,targetAP:b.ap,targetMaxAP:b.maxAp};
}
export function awarenessBoundary(previous,boundary,observation){
  fields(boundary,['kind'],['seconds','round']);
  if(boundary.kind==='time'){fields(boundary,['kind','seconds']);number(boundary.seconds,0,60);return {seconds:boundary.seconds,combat:false,round:0,spent:0};}
  if(boundary.kind!=='action')fail('STEALTH_BOUNDARY','Supply a confirmed host time or AP-action boundary.');
  fields(boundary,['kind','round']);number(boundary.round,0,1e9);if(!Number.isInteger(boundary.round))fail('STEALTH_BOUNDARY','Round is an integer.');
  let seconds=0,spent=previous?.combat?previous.spent:0;
  if(previous?.combat){
    if(previous.round!==boundary.round){if(previous.round>boundary.round)fail('STEALTH_BOUNDARY','Rounds cannot rewind without restoring the whole saved state.');seconds=Math.max(0,60-spent);spent=0;}
    else if(previous.signature!==observation.signature){seconds=Math.min(60*Math.max(Math.max(0,previous.observerAP-observation.observerAP)/observation.observerMaxAP,Math.max(0,previous.targetAP-observation.targetAP)/observation.targetMaxAP),60-spent);spent+=seconds;}
  }
  return {seconds,combat:true,round:boundary.round,spent};
}
export function applyAwareness(previous,observation,boundary){
  const timing=awarenessBoundary(previous,boundary,observation),score=observation.candidate?(observation.immediate?100:clamp((previous?.score??0)+observation.rate*timing.seconds,0,observation.candidate===2?100:99)):Math.max(0,(previous?.score??0)-AWARENESS.decay*timing.seconds),recognized=score>=100||!!previous?.lastKnown&&score>=25;
  return {observerId:observation.observerId,targetId:observation.targetId,score,lastKnown:observation.candidate===2&&recognized?copy(observation.position):copy(previous?.lastKnown??null),perceived:observation.candidate===2&&recognized?2:observation.candidate&&score>=25?1:0,...timing,signature:observation.signature,observerAP:observation.observerAP,targetAP:observation.targetAP};
}
