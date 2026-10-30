// Reproducible authored inputs, diagnostics and complete mid-stair checkpoint.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {partsConformanceFixture} from '../packages/parts-core/fixtures.js';
import {compileParts,createPartsRuntime,createPartsQueries,previewPartsAction,applyPartsAction,serializePartsRuntime,openPartsRuntime,claimPartsEvents,pendingPartsEvents} from '../packages/parts-core/index.js';
import {createInteractionActor} from '../packages/interactions/index.js';
const root=fileURLToPath(new URL('../',import.meta.url)),folder=path.join(root,'tests/fixtures/parts'),json=value=>JSON.stringify(value,null,2)+'\n',digest=value=>createHash('sha256').update(value).digest('hex');
function compile(fixture){const result=compileParts(fixture.document,{definitions:fixture.definitions,bodyProfile:fixture.bodyProfile});if(!result.ok)throw Error(JSON.stringify(result));return result.scene;}
export function partsFixtureFiles(){
  const files=new Map(),summary={version:1,status:'conformance-only',bodyProfile:null,variants:[],diagnostics:[]};
  for(const variant of ['single','transformed','second-layout']){const fixture=partsConformanceFixture({variant}),scene=compile(fixture);if(variant==='single'){files.set('definitions.json',json(fixture.definitions));summary.bodyProfile=fixture.bodyProfile;}files.set(variant+'.json',json(fixture.document));summary.variants.push({variant,sceneId:scene.id,surfaces:scene.world.surfaces.length,doors:scene.interactions.doors.length,stairs:scene.interactions.stairs.length,renderBindings:scene.renderBindings.length,worldSha256:digest(JSON.stringify(scene.world)),renderSha256:digest(JSON.stringify(scene.renderBindings))});}
  const fixture=partsConformanceFixture(),scene=compile(fixture);files.set('compiled-single.json',json(scene));let runtime=createPartsRuntime(scene,{actors:[createInteractionActor({id:'player',floorId:'floor-0',position:{x:4.5,y:1.5,h:0}})]}),sequence=0;
  const queries=createPartsQueries(scene,{actors:()=>runtime.actors}),act=request=>{const proposed=previewPartsAction(scene,runtime,{id:'fixture-'+(++sequence),actorId:'player',...request},queries);if(!proposed.ok)throw Error(JSON.stringify(proposed));const accepted=applyPartsAction(scene,runtime,proposed.command,queries);if(!accepted.ok)throw Error(JSON.stringify(accepted));runtime=accepted.runtime;};
  act({kind:'interact',targetId:scene.interactions.doors[0].id});
  for(const [direction,seconds]of [[{x:0,y:1},1],[{x:0,y:1},1],[{x:1,y:0},.25],[{x:0,y:1},.25]])act({kind:'walk',direction,seconds});
  act({kind:'interact',targetId:scene.interactions.stairs[0].id});act({kind:'advance',seconds:.5});
  const pending=pendingPartsEvents(scene,runtime),claimed=claimPartsEvents(scene,runtime,{id:'fixture-effects',sceneId:scene.id,expectedRevision:runtime.revision,eventIds:pending.map(event=>event.id)});if(!claimed.ok)throw Error(JSON.stringify(claimed));runtime=claimed.runtime;
  const hostData={character:{hp:37,ap:0,stamina:6.5},clock:{seconds:4.75},rng:{cursor:2,stream:[.2,.5]}},wire=serializePartsRuntime(scene,runtime,hostData),restored=openPartsRuntime(scene,wire);
  files.set('mid-stair-save.json',wire+'\n');summary.midStair={sceneId:scene.id,revision:runtime.revision,position:runtime.actors[0].position,traversal:runtime.actors[0].traversal,wireBytes:Buffer.byteLength(wire),wireSha256:digest(wire),claimedEvents:runtime.claimedEvents,restoreEvents:restored.events};
  for(const [name,change]of [
    ['unsupported-scale',f=>{f.document.instances[0].transform.scale=2;}],
    ['missing-aperture',f=>{f.document.connections.find(connection=>connection.kind==='door-aperture').to=null;}],
    ['misaligned-door',f=>{f.document.instances[0].children.find(instance=>instance.id==='a-door').transform.x++;}],
    ['blocked-slab-hole',f=>{f.document.instances[0].children.find(instance=>instance.id==='a-upper').parameters.stairHole=false;}],
    ['oversized-body',f=>{f.bodyProfile.heightM=2;}]
  ]){const f=partsConformanceFixture();change(f);const rejected=compileParts(f.document,{definitions:f.definitions,bodyProfile:f.bodyProfile});if(rejected.ok)throw Error('Expected rejected fixture '+name);summary.diagnostics.push({name,status:rejected.status,diagnostics:rejected.diagnostics});}
  files.set('acceptance.json',json(summary));return files;
}
export function checkPartsFixtures(){for(const [file,value]of partsFixtureFiles())if(fs.readFileSync(path.join(folder,file),'utf8')!==value)throw Error('Parts fixture drift: '+file);}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);if(invoked){if(process.argv.includes('--write')){fs.mkdirSync(folder,{recursive:true});for(const [file,value]of partsFixtureFiles())fs.writeFileSync(path.join(folder,file),value);}else checkPartsFixtures();console.log('Verified authored/compiled parts fixtures and content-bound mid-stair save'+(process.argv.includes('--write')?' (written)':''));}
