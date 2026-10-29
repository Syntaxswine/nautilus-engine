import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCharacter,STAT_DEFINITIONS} from '../packages/rules-core/characters.js';
import {BASIC_PROGRESSION_PROFILE as P,createProgression,openProgression,serializeProgression,progressionSheet,previewAllocation,stageProgression} from '../packages/rules-core/progression.js';
const initial=(options={})=>createProgression(createCharacter({id:'validation-actor',resources:{hp:1,ap:0,stamina:0},...options}));
const xp=(state,amount=100,id='award',sourceId='objective')=>({id,expectedRevision:state.revision,type:'xp',source:'objective',sourceId,amount});
const stage=(state,command)=>{const result=stageProgression(state,command);assert.ok(result.ok,result.reason);return result.next;};
const fixture=name=>fs.readFileSync(new URL('./fixtures/basic-progression/'+name,import.meta.url),'utf8');

test('golden bundles restore exact injury, spent resources, points, receipts and every practice remainder',()=>{
  for(const name of ['initial-injured-v1.json','mid-campaign-v1.json','practice-cap-v1.json']){
    const wire=fixture(name),value=JSON.parse(wire),state=openProgression(wire);assert.deepEqual(state,value);assert.equal(JSON.stringify(state,null,2)+'\n',wire);assert.deepEqual(openProgression(serializeProgression(state)),state);
    assert.equal(state.character.version,1);assert.equal(Object.keys(state.character.stats).length,14);assert.equal(Object.keys(state.practice).length,14);
  }
  const mid=openProgression(fixture('mid-campaign-v1.json'));assert.deepEqual(mid.character.resources,{hp:37,ap:0,stamina:6.5});assert.equal(mid.character.skillPoints,11);assert.equal(mid.practice.endurance,1000);assert.equal(mid.practice.firearms,1000);assert.equal(mid.practice.medical,400);assert.equal(mid.level,2);assert.equal(mid.xp,100);
  const capped=openProgression(fixture('practice-cap-v1.json'));assert.equal(capped.character.stats.endurance,100);assert.equal(capped.practice.endurance,0);assert.equal(capped.character.skillPoints,7);assert.deepEqual(capped.character.resources,{hp:1,ap:0,stamina:0});
});

test('journal replay rejects tampered XP/level/point/stat/practice/reward accounting and missing/future state',()=>{
  const valid=openProgression(fixture('mid-campaign-v1.json'));
  const changes=[value=>{value.version=2;},value=>{value.profileId='basic-progression-v2';},value=>{value.kind='other';},value=>{value.level++;},value=>{value.xp++;},value=>{value.character.skillPoints++;},value=>{value.character.stats.medical++;},value=>{value.practice.medical++;},value=>{delete value.practice.climbing;},value=>{value.practice.future=0;},value=>{value.revision--;},value=>{value.receipts.pop();},value=>{value.receipts[0].outcome.pointsGained++;},value=>{value.receipts[0].command.amount++;},value=>{value.receipts[0].characterId='another-actor';},value=>{value.receipts[1].command.expectedRevision=0;},value=>{value.receipts[2].id=value.receipts[1].id;value.receipts[2].command.id=value.receipts[1].id;},value=>{value.receipts[2].command.source='running';value.receipts[2].command.sourceId=value.receipts[1].command.sourceId;value.receipts[2].command.stat='endurance';},value=>{value.baseline.skillPoints++;},value=>{delete value.character.resources.ap;},value=>{value.character.resources.hp=NaN;},value=>{value.character.species='invented';},value=>{value.perks=[];}];
  for(const mutate of changes){const invalid=structuredClone(valid);mutate(invalid);const before=structuredClone(invalid);assert.throws(()=>openProgression(invalid));assert.throws(()=>serializeProgression(invalid));assert.deepEqual(invalid,before);}
  const capped=openProgression(fixture('practice-cap-v1.json'));capped.practice.endurance=1;assert.throws(()=>openProgression(capped));
  for(const value of [null,[],{},'{','null','x'.repeat(P.maxSerializedCharacters+1)])assert.throws(()=>openProgression(value));
  const result=stageProgression({...valid,version:99},xp(valid));assert.equal(result.ok,false);assert.equal(result.next,null);assert.equal(result.receipt,null);assert.deepEqual(result.events,[]);
});

test('save/command/receipt accessors, hidden fields, symbols and sparse arrays reject without invocation',()=>{
  let invoked=0;const valid=openProgression(fixture('mid-campaign-v1.json'));
  for(const path of [[],['character'],['character','stats'],['character','resources'],['baseline'],['practice'],['receipts',0],['receipts',0,'command'],['receipts',0,'outcome']]){
    const state=structuredClone(valid);let target=state;for(const key of path)target=target[key];const key=Object.keys(target)[0];Object.defineProperty(target,key,{get(){invoked++;return 1;},enumerable:true});assert.throws(()=>openProgression(state));
  }
  assert.equal(invoked,0);
  for(const mutate of [state=>{state[Symbol('future')]=1;},state=>{Object.defineProperty(state.character,'future',{value:1});},state=>{delete state.receipts[1];},state=>{state.receipts.extra=true;}]){const state=structuredClone(valid);mutate(state);assert.throws(()=>openProgression(state));}
  const command=xp(valid);Object.defineProperty(command,'type',{get(){invoked++;return 'xp';},enumerable:true});const rejected=stageProgression(valid,command);assert.equal(rejected.ok,false);assert.equal(invoked,0);assert.deepEqual(rejected.next,valid);
  const allocation={};Object.defineProperty(allocation,'medical',{get(){invoked++;return 1;},enumerable:true});assert.equal(previewAllocation(valid,allocation).ok,false);assert.equal(invoked,0);
});

test('every command type rejects invalid/stale grants, unsupported practice causes, aliases and cap overflow atomically',()=>{
  const state=initial({skillPoints:10}),before=serializeProgression(state);
  const invalid=[{...xp(state),amount:0},{...xp(state),amount:-1},{...xp(state),amount:1.5},{...xp(state),amount:NaN},{...xp(state),amount:P.maxXPGrant+1},{...xp(state),amount:Number.MAX_SAFE_INTEGER},{...xp(state),source:'loot'},{...xp(state),expectedRevision:1},{...xp(state),sourceId:''},{...xp(state),type:'perk'},{id:'running-wrong',expectedRevision:0,type:'practice',source:'running',sourceId:'segment',stat:'agility',amount:1},{id:'shot-wrong',expectedRevision:0,type:'practice',source:'shot',sourceId:'shot',stat:'explosives',amount:1},{id:'bandage-wrong',expectedRevision:0,type:'practice',source:'bandaging',sourceId:'treatment',stat:'endurance',amount:1},{id:'too-fast',expectedRevision:0,type:'practice',source:'running',sourceId:'segment',stat:'endurance',amount:P.maxPracticeGrant+1},{id:'alias',expectedRevision:0,type:'allocate',allocation:{shooting:1}},{id:'unknown',expectedRevision:0,type:'allocate',allocation:{species:1}},{id:'overspend',expectedRevision:0,type:'allocate',allocation:{strength:11}}];
  for(const command of invalid){const result=stageProgression(state,command);assert.equal(result.ok,false);assert.equal(serializeProgression(result.next),before);assert.deepEqual(result.events,[]);assert.equal(result.receipt,null);assert.equal(serializeProgression(state),before);}
  const nearCap=initial({stats:{medical:99},skillPoints:2}),overflow=stageProgression(nearCap,{id:'cap',expectedRevision:0,type:'allocate',allocation:{medical:2}});assert.equal(overflow.ok,false);assert.equal(overflow.code,'stat-cap');assert.deepEqual(overflow.next,nearCap);
  const pointsFull=initial({skillPoints:P.maxSkillPoints}),reward=stageProgression(pointsFull,xp(pointsFull));assert.equal(reward.ok,false);assert.equal(reward.code,'point-capacity');assert.deepEqual(reward.next,pointsFull);
});

test('useful running/explicit weapon shots/bandaging have isolated remainders and progressively harder thresholds',()=>{
  let state=initial({stats:{endurance:1,firearms:1,heavyWeapons:1,medical:1},skillPoints:9});const originalResources=structuredClone(state.character.resources);
  for(const [index,source,stat]of [[0,'running','endurance'],[1,'shot','firearms'],[2,'shot','heavyWeapons'],[3,'bandaging','medical']])state=stage(state,{id:'practice-'+index,expectedRevision:state.revision,type:'practice',source,sourceId:'useful-'+index,stat,amount:1000});
  assert.equal(state.xp,0);assert.equal(state.level,1);assert.equal(state.character.skillPoints,9);assert.deepEqual(state.character.resources,originalResources);
  for(const stat of ['endurance','firearms','heavyWeapons','medical'])assert.equal(state.character.stats[stat],2);
  const sheet=progressionSheet(state);assert.equal(sheet.practice.find(row=>row.stat==='endurance').threshold,1100);assert.equal(sheet.practice.find(row=>row.stat==='climbing').threshold,5900);
  const high=progressionSheet(initial({stats:{endurance:99}}));assert.equal(high.practice.find(row=>row.stat==='endurance').threshold,10800);
  const running=state.receipts[0].command,conflict=stageProgression(state,{id:'different-running',expectedRevision:state.revision,type:'practice',source:running.source,sourceId:running.sourceId,stat:'endurance',amount:1000});assert.equal(conflict.ok,false);assert.equal(conflict.code,'source-conflict');
});

test('source identity tuples and canonical allocation order cannot collide or duplicate rewards',()=>{
  let state=initial();state=stage(state,{id:'id:kill:a',expectedRevision:0,type:'xp',source:'kill',sourceId:'objective:a',amount:100});state=stage(state,{id:'id:objective:a',expectedRevision:1,type:'xp',source:'objective',sourceId:'kill:a',amount:100});
  assert.equal(state.xp,200);assert.equal(state.receipts.length,2);
  const original={id:'ordered-allocation',expectedRevision:state.revision,type:'allocate',allocation:{medical:1,strength:1}},first=stageProgression(state,original);assert.ok(first.ok,first.reason);
  const retry=stageProgression(first.next,{...original,allocation:{strength:1,medical:1}});assert.ok(retry.ok,retry.reason);assert.equal(retry.replayed,true);assert.deepEqual(retry.receipt,first.receipt);assert.deepEqual(retry.next,first.next);
  const changedType=stageProgression(first.next,{id:'ordered-allocation',expectedRevision:original.expectedRevision,type:'xp',source:'kill',sourceId:'different',amount:1});assert.equal(changedType.ok,false);assert.equal(changedType.code,'command-conflict');
});

test('maximum-sized journal fails closed without pruning; an existing receipt still replays at capacity',()=>{
  const state=initial(),template=stageProgression(state,xp(state,1,'capacity-0','capacity-source-0')).receipt;let level=1,points=0;
  for(let index=0;index<P.maxReceipts;index++){
    const total=index+1,nextLevel=total>=50*(level+1)*level?level+1:level,levels=nextLevel-level;level=nextLevel;points+=levels*15;
    const receipt=structuredClone(template);receipt.id='capacity-'+index;receipt.revision=index+1;receipt.command={id:receipt.id,expectedRevision:index,type:'xp',source:'objective',sourceId:'capacity-source-'+index,amount:1};receipt.outcome.levelsGained=levels;receipt.outcome.pointsGained=levels*15;state.receipts.push(receipt);
  }
  state.revision=P.maxReceipts;state.level=level;state.xp=P.maxReceipts;state.character.skillPoints=points;const canonical=openProgression(state),before=serializeProgression(canonical);
  const rejected=stageProgression(canonical,xp(canonical,1,'after-capacity','unused-source'));assert.equal(rejected.ok,false);assert.equal(rejected.code,'receipt-capacity');assert.equal(serializeProgression(rejected.next),before);assert.equal(rejected.next.receipts.length,P.maxReceipts);
  const command=canonical.receipts.at(-1).command,retry=stageProgression(canonical,command);assert.ok(retry.ok,retry.reason);assert.equal(retry.replayed,true);assert.deepEqual(retry.receipt,canonical.receipts.at(-1));assert.equal(serializeProgression(retry.next),before);
});

test('basic progression imports and executes with browser globals, clock and RNG sealed off',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url)),code=`for(const key of ['document','window','navigator','localStorage','sessionStorage','indexedDB','THREE'])Object.defineProperty(globalThis,key,{get(){throw Error('Forbidden '+key);}});Math.random=()=>{throw Error('Implicit RNG');};Date.now=()=>{throw Error('Implicit clock');};const {createCharacter}=await import('./packages/rules-core/characters.js');const core=await import('./packages/rules-core/progression.js');const state=core.createProgression(createCharacter({id:'node-progression',resources:{hp:1,ap:0,stamina:0}}));const result=core.stageProgression(state,{id:'node-award',expectedRevision:0,type:'xp',source:'objective',sourceId:'node-objective',amount:100});if(!result.ok||result.next.character.skillPoints!==15||result.next.character.resources.hp!==1)throw Error(result.reason);`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr);
  const scan=spawnSync(process.execPath,['--experimental-vm-modules','tests/helpers/headless-closure.mjs','--entry','packages/rules-core/progression.js'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(scan.status,0,scan.stderr);assert.deepEqual(JSON.parse(scan.stdout).violations,[]);
});
