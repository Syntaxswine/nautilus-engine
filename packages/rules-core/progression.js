/**
 * BASIC progression v1. No species/classes/perks, world, clock, storage or RNG.
 * Bundle: {kind,version,profileId,character,baseline:{stats,skillPoints},
 *          level,xp,practice:{all 14 stat remainders},revision,receipts}.
 * Character remains portable character-v1; resources are never refilled.
 * create/open return copied state; serialize returns canonical JSON.
 * stage returns {ok,next,receipt,replayed,events,expected,reason,code}.
 * Preview keeps next unchanged and exposes {allocation,cost,remainingPoints,
 * character} under preview. XP is cumulative: threshold(L)=50*L*(L-1).
 *
 * Commands (positive safe-integer amounts; only canonical stat keys):
 * {id,expectedRevision,type:'xp',source:'kill'|'objective',sourceId,amount}
 * {id,expectedRevision,type:'practice',source:'running'|'shot'|'bandaging',
 *  sourceId,stat,amount}
 * {id,expectedRevision,type:'allocate',allocation:{stat:positiveInteger,...}}
 *
 * Retry the ORIGINAL complete command: identical ID/payload returns its old
 * receipt with the CURRENT state and no new events. Another command claiming
 * the same (source,sourceId), or a conflicting reused ID, rejects. Never prune
 * receipts: a full journal fails closed. The host owns committed useful-action
 * eligibility, diminishing returns, authenticated grants and atomic persistence.
 * Practice credits are illustrative tuning: 1000+100*(current stat-1) per
 * increment, grant 1..1000; reaching 100 discards excess/remainder. No practice
 * XP or spendable points are created. Only running/endurance, explicit shot
 * firearms/heavyWeapons, and useful bandaging/medical are initially supported.
 * All 14 remainders are required in saves; capped remainders are zero. Other
 * stats/skillPoints must advance through this journal, while the host may update
 * current resources/name without rewriting progression history.
 *
 * Host boundary: stage from the latest authoritative character/resources and
 * compare expected (full canonical source bundle), not revision alone. Injury,
 * spending or another character edit after preview must never be overwritten
 * by an old progression copy. Host resource-only edits do not rewrite history.
 */
import {STAT_DEFINITIONS,openCharacter,characterSheet,trainCharacter} from './characters.js';

export const BASIC_PROGRESSION_PROFILE=Object.freeze({id:'basic-progression-v1',version:1,
  featureId:'nautilus-basic-progression-v1',pointsPerLevel:15,xpPerLevelFactor:100,
  statCap:100,practiceThresholdBase:1000,practiceThresholdPerStat:100,
  maxXPGrant:1000000,maxPracticeGrant:1000,maxReceipts:4096,
  maxSkillPoints:1000000,maxSerializedCharacters:8000000});
const P=BASIC_PROGRESSION_PROFILE,stats=STAT_DEFINITIONS.map(stat=>stat.key),resourceKeys=['hp','ap','stamina'];
const outcomeKeys=['xpGained','levelsGained','pointsGained','pointsSpent','practiceGained','practiceSpent','practiceDiscarded','statGains'];
const sourceStats=Object.freeze({running:Object.freeze(['endurance']),shot:Object.freeze(['firearms','heavyWeapons']),bandaging:Object.freeze(['medical'])});
class ProgressionError extends TypeError{constructor(code,message){super(message);this.name='ProgressionError';this.code=code;}}
const fail=(code,message)=>{throw new ProgressionError(code,message);};
function fields(value,allowed,required=allowed,label='value'){
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('invalid-input',label+' must be a plain data object.');
  for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!allowed.includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))fail('invalid-input','Unsupported '+label+' field.');}
  for(const key of required)if(!Object.hasOwn(value,key))fail('invalid-input','Missing '+label+' field: '+key+'.');
}
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)fail('invalid-input','Invalid '+label+' safe integer.');return value;}
function identifier(value,label){if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/.test(value))fail('invalid-input','Invalid '+label+'.');return value;}
function dense(value,max,label){if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>max||Reflect.ownKeys(value).length!==value.length+1)fail('invalid-input',label+' must be a bounded dense data array.');for(let i=0;i<value.length;i++){const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d||!d.enumerable||!Object.hasOwn(d,'value'))fail('invalid-input',label+' cannot contain holes/accessors.');}return value;}
const zeros=()=>Object.fromEntries(stats.map(key=>[key,0]));
const threshold=value=>P.practiceThresholdBase+P.practiceThresholdPerStat*(value-1);
function statValues(value,label){fields(value,stats,undefined,label);return Object.fromEntries(stats.map(key=>[key,integer(value[key],1,P.statCap,label+' '+key)]));}
function characterData(value){
  fields(value,['version','id','name','stats','resources','skillPoints'],undefined,'character');statValues(value.stats,'character stats');fields(value.resources,resourceKeys,undefined,'character resources');
  const copy=openCharacter(value);
  return {version:copy.version,id:copy.id,name:copy.name,stats:Object.fromEntries(stats.map(key=>[key,copy.stats[key]])),resources:Object.fromEntries(resourceKeys.map(key=>[key,copy.resources[key]])),skillPoints:copy.skillPoints};
}
function requiredXP(level){const l=BigInt(level);return 50n*l*(l-1n);}
function levelFor(xp){
  const target=BigInt(xp);let low=1n,high=target/50n+2n;
  while(low<high){const middle=(low+high+1n)/2n;if(requiredXP(middle)<=target)low=middle;else high=middle-1n;}
  return Number(low);
}
function safeNumber(value,label){if(value>BigInt(Number.MAX_SAFE_INTEGER))fail('numeric-capacity',label+' exceeds the safe-integer capacity.');return Number(value);}
function allocationData(value){
  fields(value,stats,[],'allocation');if(Object.keys(value).length===0)fail('empty-allocation','Choose at least one positive stat allocation.');
  return Object.fromEntries(stats.filter(key=>Object.hasOwn(value,key)).map(key=>[key,integer(value[key],1,99,'allocation '+key)]));
}
function commandData(value){
  // Inspect descriptors before reading the discriminator or any user field.
  fields(value,['id','expectedRevision','type','source','sourceId','amount','stat','allocation'],['id','expectedRevision','type'],'progression command');
  const common={id:identifier(value.id,'command ID'),expectedRevision:integer(value.expectedRevision,0,P.maxReceipts,'expected revision'),type:value.type};
  if(value.type==='allocate'){fields(value,['id','expectedRevision','type','allocation'],undefined,'allocation command');return {...common,allocation:allocationData(value.allocation)};}
  if(value.type!=='xp'&&value.type!=='practice')fail('unsupported-command','Choose xp, practice or allocate.');
  const keys=['id','expectedRevision','type','source','sourceId','amount',...(value.type==='practice'?['stat']:[])];fields(value,keys,undefined,'reward command');
  const source=identifier(value.source,'source'),sourceId=identifier(value.sourceId,'source ID');
  if(value.type==='xp'){
    if(!['kill','objective'].includes(source))fail('invalid-source','XP requires a committed kill or objective source.');
    return {...common,source,sourceId,amount:integer(value.amount,1,P.maxXPGrant,'XP grant')};
  }
  if(!Object.hasOwn(sourceStats,source)||!sourceStats[source].includes(value.stat))fail('invalid-practice','Practice source/stat must be running/endurance, shot/firearms or heavyWeapons, or bandaging/medical.');
  return {...common,source,sourceId,stat:value.stat,amount:integer(value.amount,1,P.maxPracticeGrant,'practice grant')};
}
const sourceKey=command=>command.type==='allocate'?null:JSON.stringify([command.source,command.sourceId]);
const blankOutcome=()=>({xpGained:0,levelsGained:0,pointsGained:0,pointsSpent:0,practiceGained:0,practiceSpent:0,practiceDiscarded:0,statGains:{}});
function execute(model,command){
  const result=blankOutcome();
  if(command.type==='xp'){
    const xp=BigInt(model.xp)+BigInt(command.amount),nextXP=safeNumber(xp,'Total XP'),nextLevel=levelFor(nextXP),levels=nextLevel-model.level,points=levels*P.pointsPerLevel;
    if(model.skillPoints+points>P.maxSkillPoints)fail('point-capacity','Level reward exceeds character-v1 unspent-point capacity; no XP/reward was committed.');
    model.xp=nextXP;model.level=nextLevel;model.skillPoints+=points;result.xpGained=command.amount;result.levelsGained=levels;result.pointsGained=points;
  }else if(command.type==='allocate'){
    const cost=Object.values(command.allocation).reduce((sum,value)=>sum+value,0);
    if(cost>model.skillPoints)fail('insufficient-points','Allocation exceeds unspent stat points.');
    for(const [key,amount]of Object.entries(command.allocation))if(model.stats[key]+amount>P.statCap)fail('stat-cap','Allocation would exceed stat cap 100.');
    model.skillPoints-=cost;result.pointsSpent=cost;
    for(const [key,amount]of Object.entries(command.allocation)){model.stats[key]+=amount;result.statGains[key]=amount;if(model.stats[key]===P.statCap){result.practiceDiscarded+=model.practice[key];model.practice[key]=0;}}
  }else{
    const key=command.stat;if(model.stats[key]>=P.statCap)fail('stat-cap','That stat is already 100; no practice receipt/grant was committed.');
    const required=threshold(model.stats[key]),credits=model.practice[key]+command.amount;result.practiceGained=command.amount;
    if(credits>=required){model.stats[key]++;result.statGains[key]=1;result.practiceSpent=required;model.practice[key]=credits-required;if(model.stats[key]===P.statCap){result.practiceDiscarded=model.practice[key];model.practice[key]=0;}}
    else model.practice[key]=credits;
  }
  return result;
}
function receiptData(value){
  fields(value,['version','id','characterId','revision','command','outcome'],undefined,'progression receipt');
  if(value.version!==1)fail('invalid-receipt','Unsupported progression receipt version.');
  const command=commandData(value.command);fields(value.outcome,outcomeKeys,undefined,'receipt outcome');fields(value.outcome.statGains,stats,[],'receipt stat gains');
  const outcome=Object.fromEntries(outcomeKeys.filter(key=>key!=='statGains').map(key=>[key,integer(value.outcome[key],0,Number.MAX_SAFE_INTEGER,'receipt '+key)]));
  outcome.statGains=Object.fromEntries(stats.filter(key=>Object.hasOwn(value.outcome.statGains,key)).map(key=>[key,integer(value.outcome.statGains[key],1,99,'receipt stat gain')]));
  return {version:1,id:identifier(value.id,'receipt ID'),characterId:identifier(value.characterId,'receipt character ID'),revision:integer(value.revision,1,P.maxReceipts,'receipt revision'),command,outcome};
}
const modelOf=state=>({stats:{...state.character.stats},skillPoints:state.character.skillPoints,xp:state.xp,level:state.level,practice:{...state.practice}});
function validate(input){
  let value=input;if(typeof value==='string'){if(value.length>P.maxSerializedCharacters)fail('invalid-state','Progression JSON exceeds the bounded input size.');try{value=JSON.parse(value);}catch{fail('invalid-state','Invalid progression JSON.');}}
  fields(value,['kind','version','profileId','character','baseline','level','xp','practice','revision','receipts'],undefined,'progression state');
  if(value.kind!=='nautilus-basic-progression'||value.version!==1)fail('invalid-state','Unsupported basic progression state version/kind.');
  if(value.profileId!==P.id)fail('unsupported-profile','Unsupported immutable basic progression profile.');
  const character=characterData(value.character);fields(value.baseline,['stats','skillPoints'],undefined,'progression baseline');
  const baseline={stats:statValues(value.baseline.stats,'baseline stats'),skillPoints:integer(value.baseline.skillPoints,0,P.maxSkillPoints,'baseline points')};
  const level=integer(value.level,1,Number.MAX_SAFE_INTEGER,'level'),xp=integer(value.xp,0,Number.MAX_SAFE_INTEGER,'total XP'),revision=integer(value.revision,0,P.maxReceipts,'revision');
  fields(value.practice,stats,undefined,'practice remainders');const practice=Object.fromEntries(stats.map(key=>[key,integer(value.practice[key],0,character.stats[key]===P.statCap?0:threshold(character.stats[key])-1,'practice remainder '+key)]));
  dense(value.receipts,P.maxReceipts,'Progression receipts');if(revision!==value.receipts.length)fail('invalid-state','Revision must equal the complete durable receipt count.');
  const model={stats:{...baseline.stats},skillPoints:baseline.skillPoints,xp:0,level:1,practice:zeros()},receipts=[],commands=new Map(),sources=new Map();
  for(let index=0;index<value.receipts.length;index++){
    const receipt=receiptData(value.receipts[index]),command=receipt.command,key=sourceKey(command);
    if(receipt.id!==command.id||receipt.characterId!==character.id||receipt.revision!==index+1||command.expectedRevision!==index)fail('invalid-receipt','Receipt identity/revision/character chain is inconsistent.');
    if(commands.has(command.id)||key!==null&&sources.has(key))fail('invalid-receipt','Duplicate command or reward source in durable journal.');
    const expected=execute(model,command);if(JSON.stringify(receipt.outcome)!==JSON.stringify(expected))fail('invalid-receipt','Receipt reward/allocation/practice accounting is inconsistent.');
    receipts.push(receipt);commands.set(command.id,receipt);if(key!==null)sources.set(key,receipt);
  }
  if(level!==model.level||xp!==model.xp||character.skillPoints!==model.skillPoints||stats.some(key=>character.stats[key]!==model.stats[key]||practice[key]!==model.practice[key]))fail('invalid-state','XP, level, stat points, stats or practice do not match durable receipt accounting.');
  return {state:{kind:'nautilus-basic-progression',version:1,profileId:P.id,character,baseline,level,xp,practice,revision,receipts},commands,sources};
}
export function createProgression(character,options={}){
  fields(options,['profileId'],[],'progression options');if(Object.hasOwn(options,'profileId')&&options.profileId!==P.id)fail('unsupported-profile','Choose the immutable basic progression v1 profile.');
  const copy=characterData(character);
  return {kind:'nautilus-basic-progression',version:1,profileId:P.id,character:copy,baseline:{stats:{...copy.stats},skillPoints:copy.skillPoints},level:1,xp:0,practice:zeros(),revision:0,receipts:[]};
}
export const openProgression=input=>validate(input).state;
export const serializeProgression=state=>JSON.stringify(openProgression(state));
export function progressionSheet(input){
  const state=openProgression(input),floor=safeNumber(requiredXP(state.level),'Level XP floor'),next=safeNumber(requiredXP(state.level+1),'Next level XP');
  return {profileId:P.id,revision:state.revision,level:state.level,xp:state.xp,xpFloor:floor,xpNext:next,xpIntoLevel:state.xp-floor,xpForLevel:P.xpPerLevelFactor*state.level,xpToNext:next-state.xp,
    earnedPoints:(state.level-1)*P.pointsPerLevel,unspentPoints:state.character.skillPoints,character:characterSheet(state.character),
    practice:STAT_DEFINITIONS.map(stat=>({stat:stat.key,label:stat.label,value:state.character.stats[stat.key],remainder:state.practice[stat.key],threshold:threshold(state.character.stats[stat.key]),atCap:state.character.stats[stat.key]===P.statCap})),receiptCount:state.receipts.length};
}
function trainedCharacter(character,model,command,outcome){
  let next=characterData(character);
  if(command.type==='allocate')for(const [key,amount]of Object.entries(command.allocation))for(let n=0;n<amount;n++){const trained=trainCharacter(next,key);if(!trained.ok)fail('training-failed',trained.reason);next=trained.character;}
  else if(command.type==='practice'&&outcome.statGains[command.stat]){
    // Practice is free growth, not currency: use the existing training behavior
    // with a private one-point budget, then restore the real unspent pool.
    const realPoints=next.skillPoints,trained=trainCharacter({...next,skillPoints:1},command.stat);if(!trained.ok)fail('training-failed',trained.reason);next=trained.character;next.skillPoints=realPoints;
  }else next.skillPoints=model.skillPoints;
  if(next.skillPoints!==model.skillPoints||stats.some(key=>next.stats[key]!==model.stats[key])||resourceKeys.some(key=>next.resources[key]!==character.resources[key]))fail('training-failed','Training diverged from basic accounting or changed current resources.');
  return characterData(next);
}
const result=(state,expected,extra={})=>({ok:true,next:state,receipt:null,replayed:false,events:[],expected,reason:'',code:null,...extra});
function attempt(input,work){let state,expected=null;try{const checked=validate(input);state=checked.state;expected=JSON.stringify(state);return work(checked,expected);}catch(error){return {ok:false,next:state||null,receipt:null,replayed:false,events:[],expected,reason:error instanceof Error?error.message:String(error),code:error.code||'invalid-input'};}}
export function previewAllocation(input,allocation){return attempt(input,({state},expected)=>{
  const canonical=allocationData(allocation),command={id:'preview',expectedRevision:state.revision,type:'allocate',allocation:canonical},model=modelOf(state),outcome=execute(model,command),character=trainedCharacter(state.character,model,command,outcome);
  return result(state,expected,{preview:{allocation:canonical,cost:outcome.pointsSpent,remainingPoints:model.skillPoints,character}});
});}
export function stageProgression(input,specification){return attempt(input,({state,commands,sources},expected)=>{
  const command=commandData(specification),previous=commands.get(command.id);
  if(previous){if(JSON.stringify(previous.command)!==JSON.stringify(command))fail('command-conflict','Command ID was already committed with another payload.');return result(state,expected,{receipt:structuredClone(previous),replayed:true});}
  const key=sourceKey(command);if(key!==null&&sources.has(key))fail('source-conflict','This committed reward source was already claimed by another command.');
  if(command.expectedRevision!==state.revision)fail('stale-revision','Stage from the latest authoritative progression revision.');
  if(state.receipts.length>=P.maxReceipts)fail('receipt-capacity','Durable receipt journal is full; no receipts/rewards were pruned or committed.');
  const model=modelOf(state),outcome=execute(model,command),character=trainedCharacter(state.character,model,command,outcome),receipt={version:1,id:command.id,characterId:character.id,revision:state.revision+1,command,outcome};
  const next={...state,character,level:model.level,xp:model.xp,practice:model.practice,revision:receipt.revision,receipts:[...state.receipts,receipt]};
  return result(next,expected,{receipt:structuredClone(receipt),events:[{version:1,type:'basic-progression-applied',characterId:character.id,receiptId:receipt.id,revision:receipt.revision}]});
});}
