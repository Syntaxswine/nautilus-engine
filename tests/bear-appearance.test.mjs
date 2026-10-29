import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {blankMap,loadBlueprint,parseMap,createBlockDocument,engineManifest,negotiateCapabilities,generateConnectedMap} from '../packages/map-core/index.js';
import {createAppearance,openAppearance,serializeAppearance,appearanceRequirements,assertAppearanceCompatible,exportLegacyAppearance,AppearanceDocument,createAppearanceDocument,rotateAppearanceBlock,placeAppearanceBlock,APPEARANCE_CONTRACT} from '../packages/appearance-core/index.js';
import {listSharedAssets} from '../packages/assets/index.js';
import {bearAsset,BEAR_WEAPONS,BEAR_OUTFITS} from '../packages/actors-bear/index.js';
import {createTinderboxScene} from '../packages/adapters/tinderbox/index.js';
import {appearanceGolden,workflowGolden} from './fixtures/bear/build-fixtures.mjs';
const actor=(changes={})=>({id:'bear-fixture',species:'bear',outfit:'red-hats',weapon:'rpg',role:'npc',x:12,y:12,z:0,heading:90,authored:{character:{id:'npc-bear',displayName:'Authored bear',faction:'host-policy',canTalk:true,dialogueRef:'host-dialogue'},resources:{hp:37,ap:0,stamina:6.5},future:{preserve:[1,2,'unchanged']}},...changes});
const block=()=>JSON.parse(createBlockDocument('Bear test block').export());
const accepted=(document,command)=>{const staged=document.apply(command);assert.ok(staged.ok,staged.error);return staged;};
test('bear discovery is additive and outfit/equipment identities agree with strict appearance schema',()=>{
  const bear=listSharedAssets().find(entry=>entry.id==='people:bear');assert.deepEqual(bear,bearAsset());assert.equal(listSharedAssets().filter(entry=>entry.id==='people:bear').length,1);
  const schema=JSON.parse(fs.readFileSync(new URL('../schemas/appearance-document-v1.schema.json',import.meta.url),'utf8'));assert.deepEqual(schema.$defs.actor.properties.weapon.enum,[...BEAR_WEAPONS]);assert.deepEqual(schema.$defs.actor.properties.outfit.enum,[...BEAR_OUTFITS]);assert.equal(schema.properties.kind.const,APPEARANCE_CONTRACT.schemaId);
});
test('appearance preview/place/edit/rotate/select/undo/redo/save retains real species, roles and exact authored resources',()=>{
  const blueprint=block(),document=createAppearanceDocument(blueprint),before=document.export(),command={type:'place',actor:actor()};const preview=document.preview(command);assert.ok(preview.ok,preview.error);assert.equal(document.export(),before);assert.deepEqual(document.history(),{undo:0,redo:0});
  const committed=accepted(document,command);committed.next.actors[0].authored.resources.hp=100;assert.equal(document.actors[0].authored.resources.hp,37);assert.equal(document.inspect(12,12,0).type,'appearance-actor');assert.equal(document.actors[0].species,'bear');assert.deepEqual(document.blueprint,blueprint);
  accepted(document,{type:'update',id:'bear-fixture',patch:{outfit:'normal',weapon:'hmg',role:'guard'}});assert.ok(document.rotate('bear-fixture').ok);assert.equal(document.actors[0].heading,180);const saved=document.export(),state=document.snapshot();assert.deepEqual(openAppearance(saved),state);assert.deepEqual(state.actors[0].authored,actor().authored);
  assert.ok(document.undo());assert.equal(document.actors[0].heading,90);assert.ok(document.redo());assert.equal(document.export(),saved);
  const restored=new AppearanceDocument(saved);assert.deepEqual(restored.actors,state.actors);const copied=restored.actors;copied[0].authored.resources.hp=100;assert.equal(restored.actors[0].authored.resources.hp,37);
});
test('unsupported selection, duplicate anchors/IDs, ungrounded placement and failed imports reject atomically with redo intact',()=>{
  const document=createAppearanceDocument(block());accepted(document,{type:'place',actor:actor()});accepted(document,{type:'update',id:'bear-fixture',patch:{heading:180}});document.undo();const before=document.export(),history=document.history(),revision=document.revision;
  for(const command of [{type:'place',actor:actor({id:'other'})},{type:'place',actor:actor({x:13})},{type:'update',id:'bear-fixture',patch:{species:'horse'}},{type:'update',id:'bear-fixture',patch:{outfit:'generic-uniform'}},{type:'update',id:'bear-fixture',patch:{weapon:'unknown'}},{type:'update',id:'bear-fixture',patch:{z:2}},{type:'update',id:'bear-fixture',patch:{heading:360}},{type:'remove',id:'bear-fixture',expectedRevision:0}]){assert.equal(document.apply(command).ok,false);assert.equal(document.export(),before);assert.deepEqual(document.history(),history);assert.equal(document.revision,revision);}
  assert.throws(()=>document.open({...document.snapshot(),version:2}),/version 1/);assert.equal(document.export(),before);assert.deepEqual(document.history(),history);assert.ok(document.redo());
});
test('base edits remain atomic when they remove support and preserve unknown authored base metadata when accepted',()=>{
  const blueprint=block();blueprint.metadata={future:'retain exact base value'};blueprint.upper[0]['12,12']='floor';const document=createAppearanceDocument(blueprint,[actor({z:1})]),before=document.export();
  const rejected=document.apply({type:'base',command:{tool:'erase-tile',start:{x:12,y:12,z:1}}});assert.equal(rejected.ok,false);assert.equal(document.export(),before);
  accepted(document,{type:'base',command:{tool:'floor',start:{x:2,y:2,z:0},options:{kind:'floor'}}});assert.deepEqual(document.blueprint.metadata,blueprint.metadata);assert.deepEqual(document.actors[0].authored,actor().authored);
});
test('map capture, four block rotations and replacement/copy preserve every appearance field and provide ID remapping',()=>{
  const map=blankMap('Bear transfer'),source=actor({x:36,y:36});const document=createAppearanceDocument(map,[source]),captured=document.capture(1,1);assert.equal(captured.actors[0].x,12);assert.equal(captured.actors[0].y,12);let turned=captured;for(let i=0;i<4;i++)turned=rotateAppearanceBlock(turned);assert.deepEqual(turned.actors,captured.actors);
  const result=placeAppearanceBlock(document.snapshot(),captured,2,2);assert.equal(result.document.actors.length,2);assert.equal(result.idMap[source.id],source.id+'-copy-1');assert.equal(result.document.actors[1].x,60);assert.deepEqual(result.document.actors[1].authored,source.authored);
  const before=document.export();assert.ok(document.place(captured,2,2).ok);assert.ok(document.undo());assert.equal(document.export(),before);assert.ok(document.redo());assert.equal(document.actors.length,2);
  const bad=structuredClone(captured);bad.actors[0].x=24;const current=document.export();assert.equal(document.place(bad,2,2).ok,false);assert.equal(document.export(),current);
});
test('legacy schema/enum behavior stays intact; negotiated consumers reject unknown bear data before accepting',()=>{
  const legacy=blankMap('Legacy intact'),appearance=createAppearance(legacy,[actor()]),manifest=engineManifest(),requirements=appearanceRequirements(appearance);assert.ok(negotiateCapabilities(requirements,manifest).ok);assert.deepEqual(assertAppearanceCompatible(appearance,manifest),appearance);
  const unsupported=structuredClone(manifest);unsupported.capabilities=unsupported.capabilities.filter(entry=>entry.id!==APPEARANCE_CONTRACT.featureId);assert.throws(()=>assertAppearanceCompatible(appearance,unsupported),error=>error.diagnostics.some(item=>item.code==='UNSUPPORTED_REQUIRED_FEATURE'));
  assert.throws(()=>loadBlueprint(appearance),error=>error.code==='UNSUPPORTED_APPEARANCE');assert.throws(()=>parseMap(JSON.stringify(appearance)),/appearance API/);assert.throws(()=>createTinderboxScene(appearance,{}),error=>error.code==='UNSUPPORTED_CAPABILITY');assert.throws(()=>exportLegacyAppearance(appearance),error=>error.code==='APPEARANCE_DOWNGRADE_REFUSED');
  assert.deepEqual(exportLegacyAppearance(createAppearance(legacy)),legacy);assert.deepEqual(loadBlueprint(legacy),legacy);
  const bare=structuredClone(legacy);bare.guards.push({x:12,y:12,z:0,heading:90,species:'bear',weapon:'rifle',outfit:'normal'});assert.throws(()=>loadBlueprint(bare));
  const appearanceBlock=createAppearance(block(),[actor()]),before=structuredClone(appearanceBlock);assert.throws(()=>generateConnectedMap([appearanceBlock],17));assert.deepEqual(appearanceBlock,before);
});
test('golden appearance data and headless sealed imports preserve exact plain data without implicit rendering or loading',()=>{
  const golden=createAppearance(block(),[actor()]),wire=serializeAppearance(golden);assert.deepEqual(openAppearance(wire),golden);
  let reads=0;const accessor=structuredClone(golden);Object.defineProperty(accessor.actors[0].authored,'getter',{enumerable:true,get(){reads++;return 1;}});assert.throws(()=>openAppearance(accessor));assert.equal(reads,0);
  const root=fileURLToPath(new URL('../',import.meta.url)),source=`for(const key of ['document','window','navigator','localStorage','sessionStorage','indexedDB','THREE','fetch'])Object.defineProperty(globalThis,key,{get(){throw Error('Forbidden '+key);}});Math.random=()=>{throw Error('Implicit RNG')};Date.now=()=>{throw Error('Implicit clock')};const a=await import('./packages/actors-bear/index.js');const p=await import('./packages/appearance-core/index.js');const m=await import('./packages/map-core/index.js');if(a.bearAsset().id!=='people:bear')throw Error('Discovery');const d=p.createAppearanceDocument(m.blankMap('Headless'));p.openAppearance(d.export());`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr);
  const closure=spawnSync(process.execPath,['--experimental-vm-modules','tests/helpers/headless-closure.mjs','--entry','packages/actors-bear/index.js','--entry','packages/appearance-core/index.js'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(closure.status,0,closure.stderr);assert.deepEqual(JSON.parse(closure.stdout).violations,[]);
});
test('committed appearance and authoring goldens reproduce exact saved data and deterministic workflow digest',()=>{
  const wire=fs.readFileSync(new URL('./fixtures/bear/appearance-block-v1.json',import.meta.url),'utf8');assert.equal(JSON.stringify(appearanceGolden(),null,2)+'\n',wire);assert.deepEqual(openAppearance(wire),JSON.parse(wire));
  const expected=JSON.parse(fs.readFileSync(new URL('./fixtures/bear/authoring-workflow-v1.json',import.meta.url),'utf8'));assert.deepEqual(workflowGolden(),expected);
});
test('appearance history bounds entries and the live-plus-history byte budget without losing accepted undo states',()=>{
  const small=createAppearanceDocument(block(),[actor()]);for(let index=0;index<32;index++)accepted(small,{type:'update',id:'bear-fixture',patch:{heading:index}});const before=small.export();assert.equal(small.apply({type:'update',id:'bear-fixture',patch:{heading:40}}).code,'APPEARANCE_HISTORY_CAPACITY');assert.equal(small.export(),before);assert.equal(small.history().undo,32);for(let index=0;index<32;index++)assert.equal(small.undo(),true);for(let index=0;index<32;index++)assert.equal(small.redo(),true);assert.equal(small.export(),before);
  const actors=Array.from({length:32},(_,index)=>actor({id:'large-'+index,x:1+index%16,y:1+Math.floor(index/16),authored:{payload:'x'.repeat(64000)}})),large=createAppearanceDocument(block(),actors);let count=0,result;
  while(count<32){result=large.apply({type:'update',id:'large-0',patch:{heading:count}});if(!result.ok)break;count++;}assert.equal(result.code,'APPEARANCE_HISTORY_CAPACITY');assert.ok(count>0&&count<32);const saved=large.export();assert.ok((large.history().undo+1)*Buffer.byteLength(saved)<=APPEARANCE_CONTRACT.maxHistoryBytes);for(let index=0;index<count;index++)assert.equal(large.undo(),true);for(let index=0;index<count;index++)assert.equal(large.redo(),true);assert.equal(large.export(),saved);large.clearHistory();accepted(large,{type:'update',id:'large-0',patch:{heading:90}});
});
