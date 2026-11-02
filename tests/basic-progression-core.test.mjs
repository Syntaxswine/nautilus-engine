import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacter,trainCharacter,STAT_DEFINITIONS} from '../packages/rules-core/characters.js';
import {BASIC_PROGRESSION_PROFILE,createProgression,openProgression,serializeProgression,progressionSheet,previewAllocation,stageProgression} from '../packages/rules-core/progression.js';
const actor=(options={})=>createCharacter({id:'progression-actor',name:'Basic fixture',resources:{hp:30,ap:0,stamina:4},...options});
const xp=(state,amount,id='xp-1',sourceId='objective-1')=>({id,expectedRevision:state.revision,type:'xp',source:'objective',sourceId,amount});
const apply=(state,command)=>{const result=stageProgression(state,command);assert.ok(result.ok,result.reason);return result;};

test('basic cumulative XP boundaries, overflow and multi-level rewards award exactly 15 points per level',()=>{
  for(const [amount,level,points]of [[99,1,0],[100,2,15],[299,2,15],[300,3,30],[600,4,45],[5500,11,150]]){
    const state=createProgression(actor()),before=serializeProgression(state),result=apply(state,xp(state,amount));assert.equal(result.next.level,level);assert.equal(result.next.xp,amount);assert.equal(result.next.character.skillPoints,points);assert.equal(serializeProgression(state),before);assert.deepEqual(result.next.character.resources,state.character.resources);
    const sheet=progressionSheet(result.next);assert.equal(sheet.earnedPoints,points);assert.equal(sheet.xpForLevel,100*level);assert.deepEqual(openProgression(serializeProgression(result.next)),result.next);
  }
  let state=createProgression(actor());state=apply(state,xp(state,99)).next;state=apply(state,xp(state,201,'xp-2','objective-2')).next;assert.equal(state.level,3);assert.equal(state.character.skillPoints,30);assert.equal(state.xp,300);
  assert.equal(BASIC_PROGRESSION_PROFILE.pointsPerLevel,15);assert.equal(progressionSheet(state).character.stats.length,14);
});

test('allocation preview is pure, whole allocation is atomic and committed growth retains trainCharacter/resource behavior',()=>{
  let state=createProgression(actor({skillPoints:2}));state=apply(state,xp(state,100)).next;const before=serializeProgression(state),allocation={strength:2,endurance:1,medical:3},preview=previewAllocation(state,allocation);
  assert.ok(preview.ok,preview.reason);assert.equal(preview.preview.cost,6);assert.equal(preview.preview.remainingPoints,11);assert.equal(serializeProgression(preview.next),before);assert.equal(serializeProgression(state),before);assert.deepEqual(preview.events,[]);
  let expected=state.character;for(const [stat,count]of Object.entries(allocation))for(let n=0;n<count;n++)expected=trainCharacter(expected,stat).character;
  const result=apply(state,{id:'allocation-1',expectedRevision:state.revision,type:'allocate',allocation});assert.deepEqual(result.next.character,expected);assert.deepEqual(result.next.character.resources,{hp:30,ap:0,stamina:4});assert.equal(result.receipt.outcome.pointsSpent,6);
  for(const invalid of [{strength:100},{strength:18},{strength:1,unknown:1},{shooting:1},{strength:0},{strength:1.5},{}]){const rejected=previewAllocation(state,invalid);assert.equal(rejected.ok,false);assert.equal(serializeProgression(rejected.next),before);}
});

test('practice remainders persist, grow slowly, never mint XP/points, and discard excess at stat 100',()=>{
  let state=createProgression(actor({stats:{endurance:99},skillPoints:7}));const resources=structuredClone(state.character.resources);
  for(let n=0;n<11;n++)state=apply(state,{id:'practice-'+n,expectedRevision:state.revision,type:'practice',source:'running',sourceId:'segment-'+n,stat:'endurance',amount:1000}).next;
  assert.equal(state.character.stats.endurance,100);assert.equal(state.practice.endurance,0);assert.equal(state.xp,0);assert.equal(state.level,1);assert.equal(state.character.skillPoints,7);assert.deepEqual(state.character.resources,resources);assert.equal(state.receipts.at(-1).outcome.practiceDiscarded,200);
  const restored=openProgression(serializeProgression(state));assert.deepEqual(restored,state);assert.equal(Object.keys(state.practice).length,STAT_DEFINITIONS.length);
  const capped=stageProgression(state,{id:'practice-cap',expectedRevision:state.revision,type:'practice',source:'running',sourceId:'segment-cap',stat:'endurance',amount:1});assert.equal(capped.ok,false);assert.equal(capped.code,'stat-cap');assert.deepEqual(capped.next,state);
});

test('identical old command retry returns its original receipt with current state; reused command/source conflicts reject',()=>{
  const initial=createProgression(actor()),command=xp(initial,100),first=apply(initial,command);let state=apply(first.next,{id:'allocate-after',expectedRevision:1,type:'allocate',allocation:{medical:1}}).next;
  const replay=stageProgression(state,command);assert.ok(replay.ok,replay.reason);assert.equal(replay.replayed,true);assert.deepEqual(replay.receipt,first.receipt);assert.deepEqual(replay.next,state);assert.deepEqual(replay.events,[]);
  for(const conflict of [{...command,amount:101},{...command,expectedRevision:state.revision},{...command,id:'another-command',expectedRevision:state.revision}]){const result=stageProgression(state,conflict);assert.equal(result.ok,false);assert.deepEqual(result.next,state);assert.equal(result.receipt,null);}
  const stale=stageProgression(state,{id:'new-stale',expectedRevision:0,type:'xp',source:'kill',sourceId:'new-source',amount:1});assert.equal(stale.ok,false);assert.equal(stale.code,'stale-revision');
});

test('stage from latest resources and full-source CAS cannot overwrite post-preview injury or spending',()=>{
  const state=createProgression(actor({skillPoints:3})),allocation={strength:1},preview=previewAllocation(state,allocation);assert.ok(preview.ok);
  const latest=openProgression(state);latest.character.resources.hp=5;latest.character.resources.stamina=0;assert.equal(latest.revision,state.revision);
  const command={id:'allocate-latest',expectedRevision:state.revision,type:'allocate',allocation},old=apply(state,command),current=apply(latest,command);
  assert.notEqual(old.expected,serializeProgression(latest));assert.equal(current.expected,serializeProgression(latest));assert.deepEqual(current.next.character.resources,{hp:5,ap:0,stamina:0});assert.equal(current.next.character.version,1);
});
