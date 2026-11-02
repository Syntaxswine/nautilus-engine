import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createCharacter,openCharacter,CHARACTER_VERSION} from '@nautilus-engine/map-core/rules';
import {createProgression,openProgression,serializeProgression,stageProgression} from '@nautilus-engine/map-core/rules/progression';
import {engineManifest,SCHEMA_IDS,FEATURE_IDS,schemaDocuments} from '@nautilus-engine/map-core/contracts';
import {negotiateCapabilities} from '@nautilus-engine/map-core/capabilities';
import {createMapDocument,blueprintRequirements} from '@nautilus-engine/map-core';

test('progression uses a separate published schema and capability without altering map requirements',()=>{
 assert.equal(CHARACTER_VERSION,1);assert.equal(SCHEMA_IDS.progression,'nautilus-progression');assert.equal(FEATURE_IDS.progression,'nautilus-basic-progression-v1');
 const need={schema:{id:SCHEMA_IDS.progression,version:1},required:[{id:FEATURE_IDS.progression,minVersion:1,maxVersion:1}],optional:[]};
 assert.equal(negotiateCapabilities(need).ok,true);
 const unsupported=engineManifest();unsupported.capabilities=unsupported.capabilities.filter(entry=>entry.id!==FEATURE_IDS.progression);
 assert.equal(negotiateCapabilities(need,unsupported).errors[0].code,'UNSUPPORTED_REQUIRED_FEATURE');
 unsupported.capabilities.push({id:FEATURE_IDS.progression,versions:[1]});unsupported.schemas=unsupported.schemas.filter(entry=>entry.id!==SCHEMA_IDS.progression);
 assert.equal(negotiateCapabilities(need,unsupported).errors[0].code,'UNSUPPORTED_SCHEMA');
 assert.equal(blueprintRequirements(JSON.parse(createMapDocument('Unchanged map contract').export())).required.some(entry=>entry.id===FEATURE_IDS.progression),false);
 const entry=schemaDocuments().find(item=>item.id===SCHEMA_IDS.progression);assert.ok(entry);
 const schema=JSON.parse(fs.readFileSync(new URL(entry.url),'utf8'));assert.equal(schema.$id,entry.uri);assert.equal(schema.additionalProperties,false);
});

test('public progression entry preserves wounded/depleted character-v1 and durable rewards',()=>{
 const actor=createCharacter({id:'public-operative',resources:{hp:0,ap:0,stamina:0}}),initial=createProgression(actor);
 const award={id:'public-objective',expectedRevision:0,type:'xp',source:'objective',sourceId:'mission:entry',amount:300};
 const earned=stageProgression(initial,award);assert.equal(earned.ok,true,earned.reason);assert.equal(earned.next.level,3);assert.equal(earned.next.character.skillPoints,30);
 const spent=stageProgression(earned.next,{id:'public-allocation',expectedRevision:earned.next.revision,type:'allocate',allocation:{strength:5,endurance:5,agility:5}});assert.equal(spent.ok,true,spent.reason);
 const restored=openProgression(serializeProgression(spent.next));assert.deepEqual(restored.character.resources,actor.resources);assert.equal(restored.character.skillPoints,15);
 const replay=stageProgression(restored,award);assert.equal(replay.ok,true,replay.reason);assert.equal(serializeProgression(replay.next),serializeProgression(restored));assert.deepEqual(replay.receipt,earned.receipt);
 assert.throws(()=>openCharacter({...actor,level:3}));assert.throws(()=>openProgression({...restored,futurePerks:[]}));assert.throws(()=>openProgression({...restored,version:99}));
 assert.deepEqual(initial.character,actor);assert.equal(initial.xp,0);
});

test('progression loads and stages in a fresh Node process without browser, clock or random access',()=>{
 const url=new URL('../packages/rules-core/progression.js',import.meta.url).href,character=new URL('../packages/rules-core/characters.js',import.meta.url).href;
 const source=`for(const name of ['document','window','localStorage','sessionStorage'])Object.defineProperty(globalThis,name,{get(){throw Error('Forbidden global '+name)}});Date.now=()=>{throw Error('Forbidden clock')};Math.random=()=>{throw Error('Forbidden random')};const rules=await import(${JSON.stringify(character)}),p=await import(${JSON.stringify(url)});const actor=rules.createCharacter({id:'headless-operative',resources:{hp:1,ap:0,stamina:0}}),s=p.createProgression(actor),r=p.stageProgression(s,{id:'headless-objective',expectedRevision:0,type:'xp',source:'objective',sourceId:'headless:mission',amount:100});if(!r.ok||r.next.level!==2||r.next.character.skillPoints!==15||r.next.character.resources.hp!==1)throw Error('Headless progression failed');p.openProgression(p.serializeProgression(r.next));`;
 execFileSync(process.execPath,['--input-type=module','-e',source],{windowsHide:true,timeout:15000,stdio:'pipe'});
});
