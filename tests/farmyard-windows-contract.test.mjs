import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {moduleClosure} from '../tools/distribution.mjs';
import {windowContractFixture,sourceWindowProbe,sourceWindowMath} from '../tools/farmyard-window-contract-fixture.mjs';
import {partIdentity,decodePartIdentity,PART_IDENTITY} from '../packages/parts-core/identity.js';
import {negotiateCapabilities} from '../packages/map-core/requirements.js';
import {windowSystem,windowDefinition} from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/window-catalogue.js';
import {windowToWorld,windowToLocal,legacyWallSpan} from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/window-system.js';
const fixtureURL=new URL('./fixtures/farmyard-windows-contract/proposal.json',import.meta.url),fixture=()=>JSON.parse(fs.readFileSync(fixtureURL)),manifest=()=>JSON.parse(fs.readFileSync(new URL('../docs/reviews/farmyard-windows/source-audit.json',import.meta.url))),clone=value=>structuredClone(value);
function sourceState(data=fixture()){return {map:Array.from({length:data.grid.height},()=>Array(data.grid.width).fill('yard')),windows:clone(data.placements)};}

test('window proposal reuses the exact three-module headless source closure and leaves public capabilities unregistered',()=>{
  const audit=manifest();assert.equal(audit.engineBase,'e7cf702b794174d7a010ef3380efc36af5441104');assert.equal(audit.reviewedCommitIsAncestor,true);assert.equal(audit.closures.headless.modules.length,3);assert.equal(audit.closures.headless.bytes,16515);assert.equal(audit.editor.commit,'9f525026f3185e0dce8115ce3a69f3a175ec7cf4');assert.equal(audit.editor.adopted,false);
  for(const path of audit.closures.headless.modules){const record=audit.files.find(file=>file.path===path);assert.ok(record.existingEngineFile);assert.equal(record.sameAtReviewedCommit,true);const bytes=fs.readFileSync(new URL('../'+record.existingEngineFile,import.meta.url));assert.equal(bytes.length,record.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),record.gitBlob);}
  const entry=audit.files.find(file=>file.path.endsWith('/window-catalogue.js')).existingEngineFile,closure=moduleClosure([entry]);assert.equal(closure.length,3);assert.ok(closure.every(file=>!/three|solo-game|guard|renderer|view/.test(file)));
  const result=negotiateCapabilities(fixture().requirementsProposal);assert.equal(result.ok,false);assert.ok(result.errors.some(error=>error.code==='UNSUPPORTED_REQUIRED_FEATURE'));const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.equal(pkg.exports['./adapters/farmyard/windows'],undefined);
});

test('source-executed structural fixture reproduces byte-for-byte and remains an explicit proposal',()=>{
  const actual=windowContractFixture();assert.equal(fs.readFileSync(fixtureURL,'utf8'),JSON.stringify(actual,null,2)+'\n');assert.match(actual.status,/no engine pane API/);assert.equal(actual.mathProbe.sha256,sourceWindowMath().sha256);assert.doesNotMatch(sourceWindowMath().source,/\bimport\b|guard|navigation|attack\(/);assert.equal(actual.enginePacketProposal.expectedRevision,0);assert.equal(actual.engineReceiptProposal.command.id,actual.enginePacketProposal.id);assert.deepEqual(actual.engineReceiptProposal.effects,[]);assert.ok(actual.refusalVectors.includes('WINDOW_DOOR_CONFLICT'));assert.ok(actual.refusalVectors.includes('WINDOW_LEGACY_EXPORT_REFUSED'));
});

test('39 presets plus the separate explicit-dimension template preserve native scale and joined pane identities',()=>{
  const data=fixture();assert.equal(data.catalogue.presets,39);assert.equal(new Set(data.catalogue.ids).size,39);assert.equal(data.catalogue.ids.includes(data.catalogue.customTemplate),false);assert.equal(windowDefinition('window.full.clear.3m').height,2);assert.equal(windowDefinition('window.full.borderless.3m').height,2.12);const tall=windowDefinition(data.catalogue.customTemplate,{}, {width:20,height:10.6});assert.equal(tall.height,10.6);assert.equal(tall.width,20);assert.equal(tall.solids.length,0);assert.deepEqual(tall.panes.map(pane=>pane.id),['r0c0']);assert.equal(data.joins.paneIdsStable,true);assert.ok(Math.abs(data.joins.unjoinedPostWidth-.055)<1e-12);assert.ok(Math.abs(data.joins.joinedPostWidth-.0275)<1e-12);assert.equal(Number((data.catalogue.metrics.storeyHeight*5).toPrecision(12)),10.6,'Retain the source explicit storey conversion rounding.');
});

test('each quarter turn retains the same local pane and 20 covered edges with exact world-height bounds',()=>{
  const data=fixture();for(const record of data.rotations){const state=sourceState();state.windows=[clone(record.placement)];const compiled=windowSystem.compile(state)[0];assert.equal(compiled.edges.length,20);assert.deepEqual(compiled.edges,record.coveredEdges);assert.deepEqual(compiled.spec.panes.map(pane=>pane.id),record.paneIds);assert.equal(record.bounds.height,10.6);assert.equal(record.bounds.z0,0);const local=[1,9,.1],roundTrip=windowToLocal(record.placement,windowToWorld(record.placement,local));roundTrip.forEach((value,index)=>assert.ok(Math.abs(value-local[index])<1e-12));}
});

test('isolated original box/air math distinguishes glass, sill, mullion, lower wall and walking reservation',()=>{
  const data=fixture(),state=sourceState(data);for(const vector of data.queryVectors){const actual=sourceWindowProbe(state,vector.ray,vector.purpose)[0]??null;assert.deepEqual(actual,vector.expected,vector.id);}
  const get=id=>data.queryVectors.find(vector=>vector.id===id).expected;assert.equal(get('clear-projectile').kind,'glass');assert.equal(get('clear-flame').kind,'glass');assert.equal(get('clear-sight'),null);assert.equal(get('clear-walk').role,'sill','Source walking considers solid footprints regardless of member height.');for(const role of ['mullion','sill','lower-wall'])assert.equal(get('grid-'+role).role,role);assert.equal(get('grid-pane').paneId,'r0c0');
  const covered=new Set(data.content[0].coveredEdges);assert.equal(legacyWallSpan(data.content[0].coveredEdges[0],covered),null);assert.equal(legacyWallSpan('s:6:12',covered).max,6.5);assert.equal(legacyWallSpan('s:10:12',covered).min,9.5);
});

test('source break/restore facts retain independent damage, leave a walking reservation and never replay cosmetic events',()=>{
  const data=fixture(),life=data.sourceLifecycle;assert.equal(life.previewUnchanged,true);assert.equal(life.firstEvent.sequence,1);assert.equal(life.repeatedBreak,null);assert.equal(life.afterFirst.nextProjectile.placementId,'clear-b');assert.equal(life.afterFirst.walking.placementId,'clear-a');assert.equal(life.restoreHasEvents,false);assert.equal(life.saved.windowSequence,3);assert.equal(life.hostUnchanged,true);assert.equal(life.seedUnchanged,true);assert.deepEqual(life.saved.windowBreaks,{'clear-a':['r0c0'],'waist-grid':['r0c1'],'sheet-tall-a':['r0c0']});assert.equal(life.restoredBoxes.some(box=>box.windowId==='sheet-tall-a'&&box.kind==='glass'),false);assert.equal(life.restoredBoxes.some(box=>box.windowId==='sheet-tall-a'&&box.kind==='prop'&&box.role==='window-passage'),true);assert.equal(life.restoredBoxes.filter(box=>box.windowId==='waist-grid'&&box.kind==='glass').length,3);assert.equal(life.restoredBoxes.filter(box=>box.windowId==='sheet-tall-b'&&box.kind==='glass').length,1);assert.equal(life.cosmeticLimits.receipts,128,'This is source cosmetic history, not a durable engine journal.');
  const restored=windowSystem.restore({...sourceState(data),...clone(life.saved),windowEvents:[clone(life.firstEvent)]});assert.equal(windowSystem.breakPane(restored,'clear-a','r0c0',life.firstEvent.point),null);assert.equal(Object.hasOwn(restored,'windowEvents'),false);
});

test('existing part visual handles bind explicit short engine aliases while retaining full source placement/pane tuples',()=>{
  const data=fixture(),keys=new Set();for(const content of data.content)for(const pane of content.panes){const key=JSON.stringify([content.placementId,pane.paneId]);assert.equal(keys.has(key),false);keys.add(key);assert.deepEqual(decodePartIdentity(pane.visualId),{instanceId:content.engineInstanceId,kind:'visual',partId:'pane:'+pane.paneId});}
  const long=data.content.find(content=>content.placementId.length>PART_IDENTITY.maxInstanceLength);assert.ok(long);assert.throws(()=>partIdentity(long.placementId,'visual','pane:r0c0'));assert.ok(long.placementId.length<=96);assert.equal(data.placements.find(placement=>placement.id===long.placementId).id,long.placementId);assert.equal(PART_IDENTITY.kinds.includes('pane'),false,'The proposal must not silently extend closed parts-v1 kinds.');
});

test('source structural refusals and sealed headless imports execute without a game brain, renderer, storage or RNG',()=>{
  for(const mutate of [state=>state.windows.push(clone(state.windows[0])),state=>state.windows[0].rotation=45,state=>state.windows[0].z=1,state=>state.windows[0].x=.123,state=>state.windows[0].definitionId='missing',state=>state.windows[3].dimensions.width=20.5,state=>state.windows[3].dimensions.width=241,state=>state.windows[3].dimensions.height=0,state=>state.windows[3].dimensions.height=Infinity,state=>delete state.windows[3].dimensions,state=>state.windows[0].dimensions={width:3,height:2}]){const state=sourceState();mutate(state);assert.throws(()=>windowSystem.compile(state));}
  const state=sourceState();state.windowBreaks={'waist-grid':['missing']};assert.throws(()=>windowSystem.restore(state));const child=spawnSync(process.execPath,['--input-type=module','-e',`for(const key of ['window','document','navigator','THREE','fetch','localStorage'])Object.defineProperty(globalThis,key,{get(){throw Error(key)}});Math.random=()=>{throw Error('RNG')};Date.now=()=>{throw Error('clock')};const m=await import('./vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/window-catalogue.js');if(m.windowDefinition('window.full.clear.3m').width!==3)throw Error('definition');`],{encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(child.status,0,child.stderr);
});
