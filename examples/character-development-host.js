import {openCharacter,characterSheet,deriveStats,STAT_DEFINITIONS} from '../packages/rules-core/index.js';
import {exampleEncounter} from '../packages/rules-core/example.js';
import {
 BASIC_PROGRESSION_PROFILE,createProgression,openProgression,serializeProgression,
 progressionSheet,previewAllocation,stageProgression
} from '../packages/rules-core/progression.js';

export const MAX_IMPORT_BYTES=BASIC_PROGRESSION_PROFILE.maxSerializedCharacters*4;
const copy=value=>structuredClone(value);
const definitions={
 running:{type:'practice',source:'running',stat:'endurance',amount:250,label:'Running'},
 shot:{type:'practice',source:'shot',stat:'firearms',amount:250,label:'Shooting'},
 bandaging:{type:'practice',source:'bandaging',stat:'medical',amount:250,label:'Bandaging'},
 kill:{type:'xp',source:'kill',amount:60,label:'Kill confirmed'},
 objective:{type:'xp',source:'objective',amount:300,label:'Objective completed'}
};
// Reuse the existing rules-example identity/stats; only its labelled sample
// injury/exhaustion values differ. No roster, class, species or model is added.
function referenceCharacter(){
 const original=exampleEncounter().attack.character;
 return openCharacter({...original,resources:{hp:37,ap:0,stamina:12}});
}


const sourceNames={running:'Running',shot:'Shooting',bandaging:'Bandaging',kill:'Kill confirmed',objective:'Objective completed'};
const statLabel=key=>STAT_DEFINITIONS.find(stat=>stat.key===key)?.label||key;
function describe(receipt){
 const {command,outcome}=receipt;
 if(command.type==='allocate')return 'Allocated '+outcome.pointsSpent+(outcome.pointsSpent===1?' point: ':' points: ')+Object.entries(outcome.statGains).map(([key,value])=>statLabel(key)+' +'+value).join(', ')+'.';
 if(command.type==='xp')return sourceNames[command.source]+' · +'+outcome.xpGained+' XP'+(outcome.pointsGained?' · +'+outcome.pointsGained+' development points':'')+'.';
 return sourceNames[command.source]+' · '+statLabel(command.stat)+' +'+outcome.practiceGained+' practice'+(outcome.statGains[command.stat]?' · stat +'+outcome.statGains[command.stat]:'')+'.';
}
function project(state,character=state.character){
 const sheet=progressionSheet(state),view=characterSheet(character),derived=deriveStats(character);
 return {
  name:view.name,level:sheet.level,points:view.skillPoints,rewardPoints:BASIC_PROGRESSION_PROFILE.pointsPerLevel,
  xp:{total:sheet.xp,within:sheet.xpIntoLevel,needed:sheet.xpForLevel,toNext:sheet.xpToNext},
  resources:view.resources,
  stats:view.stats.map(stat=>{
   const progress=sheet.practice.find(row=>row.stat===stat.key);
   const receipt=state.receipts.filter(receipt=>receipt.command.type==='practice'&&receipt.command.stat===stat.key).at(-1);
   return {...stat,practice:{current:progress.remainder,threshold:progress.threshold,atCap:progress.atCap,reason:receipt?sourceNames[receipt.command.source]+' · +'+receipt.outcome.practiceGained+' practice':''}};
  }),
  derived:[['damageResistance','Damage resistance'],['medical','Effective medical'],['mechanical','Effective mechanical'],['perception','Perception'],['stealth','Stealth']].map(([key,label])=>({key,label,value:derived[key]})),
  recent:state.receipts.map(receipt=>({id:receipt.id,text:describe(receipt)}))
 };
}
export function createDevelopmentHost({saved}={}){
 let state=saved===undefined?createProgression(referenceCharacter()):openProgression(saved);
 // Inspect the durable journal, including imported IDs. Revision is just the
 // starting ordinal; an existing source/command ID is always skipped.
 function identity(type,source){
  const used=new Set(state.receipts.flatMap(receipt=>[receipt.id,receipt.command.id,receipt.command.sourceId]).filter(Boolean));
  let ordinal=state.revision+1,id,sourceId;
  do{id='example-command-'+type+'-'+ordinal;sourceId='example-outcome-'+(source||type)+'-'+ordinal;ordinal++;}while(used.has(id)||used.has(sourceId));
  return {id,sourceId};
 }
 function commit(command){
  const result=stageProgression(state,command);
  if(!result.ok)return {ok:false,error:result.reason,code:result.code};
  if(result.expected!==serializeProgression(state))return {ok:false,error:'Character changed. Review the latest record and try again.',code:'stale-host'};
  const next=openProgression(result.next);
  state=next;
  const outcome=result.receipt?.outcome;
  return {ok:true,replayed:result.replayed,message:result.receipt?describe(result.receipt):'Character record updated.',levelsGained:result.replayed?0:outcome?.levelsGained||0,pointsAwarded:result.replayed?0:outcome?.pointsGained||0,receipt:copy(result.receipt)};
 }
 function outcome(key){
  const definition=definitions[key];if(!definition)return {ok:false,error:'Choose one of the listed sample outcomes.'};
  const ids=identity(definition.type,definition.source);
  return commit({id:ids.id,expectedRevision:state.revision,type:definition.type,source:definition.source,sourceId:ids.sourceId,amount:definition.amount,...(definition.type==='practice'?{stat:definition.stat}:{})});
 }
 function allocate(allocation){
  const {id}=identity('allocate');return commit({id,expectedRevision:state.revision,type:'allocate',allocation:copy(allocation)});
 }
 function preview(allocation){
  const result=previewAllocation(state,allocation);
  // .next is the unchanged source. Project the actual hypothetical character
  // directly; never forge a progression bundle with unreceipted stat changes.
  return result.ok?{ok:true,cost:result.preview.cost,remainingPoints:result.preview.remainingPoints,after:project(state,result.preview.character)}:{ok:false,error:result.reason,code:result.code};
 }
 const lastOutcome=()=>state.receipts.filter(receipt=>receipt.command.type!=='allocate').at(-1);
 function replay(){const previous=lastOutcome();return previous?commit(copy(previous.command)):{ok:false,error:'Record a sample outcome first.'};}
 return {inspect:()=>copy(project(state)),state:()=>openProgression(state),serialize:()=>serializeProgression(state),outcome,allocate,preview,replay,get canReplay(){return !!lastOutcome();}};
}
