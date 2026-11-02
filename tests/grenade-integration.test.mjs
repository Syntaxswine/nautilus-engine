import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {engineManifest,schemaDocuments} from '../packages/map-core/contract-manifest.js';
import {negotiateCapabilities} from '../packages/map-core/capabilities.js';
import {distribution} from '../tools/distribution.mjs';
import {sharedAsset} from '../packages/assets/index.js';
import {GRENADE_CONTRACT,GRENADE_COMPONENT,createGrenadeExample,grenadeRequirements,assertGrenadeCompatible} from '../packages/grenades-core/index.js';

test('grenade requirements use the shared compatibility contract and require actual host bindings',()=>{
 const state=createGrenadeExample(),requirements=grenadeRequirements(state);
 assert.deepEqual(Object.keys(requirements).sort(),['optional','required','schema']);
 assert.equal(requirements.schema.id,GRENADE_CONTRACT.schemaId);
 const manifest=engineManifest();
 assert.equal(negotiateCapabilities(requirements,manifest).ok,false,'engine code alone does not supply a durable game host');
 assert.throws(()=>assertGrenadeCompatible(state,manifest));
 const host={...manifest,id:'installed-grenade-host',capabilities:[...manifest.capabilities,...GRENADE_COMPONENT.requiredHostServices.map(id=>({id,versions:[1],description:'Explicit retained-host promise'}))]};
 assert.equal(negotiateCapabilities(requirements,host).ok,true);
 assert.deepEqual(assertGrenadeCompatible(state,host),state);
 const document=schemaDocuments().find(item=>item.id===GRENADE_CONTRACT.schemaId);
 assert.ok(document);assert.equal(JSON.parse(fs.readFileSync(new URL(document.url))).$id,document.uri);
 assert.throws(()=>{GRENADE_COMPONENT.capabilities[0].version=999;},TypeError);
 const core=distribution('core');
 for(const file of ['packages/grenades-core/index.js','packages/grenades-core/aim.js','docs/grenades.md'])assert.ok(core.files.includes(file),file);
 assert.equal(core.files.some(file=>file.startsWith('vendor/farmyard-grenades/')),false);
 for(const id of ['./grenades/ui','./grenades/style.css','./grenades/view'])assert.equal(Object.hasOwn(core.exports,id),false,'Headless profile excludes '+id);
 assert.equal(core.files.some(file=>file.startsWith('packages/grenade-ui/')),false);
});

test('grenade preview, commit, context checkpoint, reload and aim execute with ambient services sealed',()=>{
 const urls=['../packages/grenades-core/index.js','../packages/grenades-core/aim.js'].map(file=>new URL(file,import.meta.url).href);
 const source='('+sealed.toString()+')('+JSON.stringify(urls)+')';
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',windowsHide:true,timeout:15000});
 assert.equal(result.status,0,result.stderr||result.error?.message);
 assert.deepEqual(JSON.parse(result.stdout),{forbiddenReads:0,grenades:2,hp:37,ap:1.25,repeated:true});
});

async function sealed(urls){
 const assert=(await import('node:assert/strict')).default;
 let forbiddenReads=0;
 const deny=name=>{forbiddenReads++;throw Error('Forbidden ambient service: '+name);};
 for(const name of ['window','document','self','navigator','localStorage','sessionStorage','indexedDB','fetch','XMLHttpRequest','WebSocket','Worker','Image','THREE','performance','crypto','setTimeout','setInterval','requestAnimationFrame'])Object.defineProperty(globalThis,name,{configurable:true,get(){return deny(name);}});
 const NativeDate=Date;Object.defineProperty(globalThis,'Date',{configurable:true,value:class extends NativeDate{constructor(){super(0);deny('Date');}static now(){return deny('Date.now');}}});
 Object.defineProperty(Math,'random',{configurable:true,value:()=>deny('Math.random')});
 const [api,controls]=await Promise.all(urls.map(url=>import(url)));
 let state=api.createGrenadeExample();const command={version:1,id:'sealed-throw',expectedRevision:state.revision,actorId:state.control.actorId,point:{x:23,y:10}};
 const preview=api.previewGrenade(state,command);assert.equal(preview.ok,true);assert.equal(preview.cost,2.5);
 const staged=api.stageGrenade(state,command);assert.equal(staged.ok,true);state=staged.next;
 const current=api.grenadeContext(state);const hostActor=current.actors.find(actor=>actor.id===current.control.actorId);hostActor.hp=37;hostActor.ap=1.25;hostActor.stamina=22.5;
 const adopted=api.adoptGrenadeContext(state,{version:1,id:'host-injury',expectedRevision:state.revision,...current});assert.equal(adopted.ok,true);state=api.openGrenadeState(api.serializeGrenadeState(adopted.next));
 const replay=api.stageGrenade(state,command);assert.equal(replay.ok,true);assert.equal(replay.repeated,true);
 const actor=replay.next.actors.find(actor=>actor.id===replay.next.control.actorId);assert.equal(actor.stamina,22.5);assert.equal(actor.grenades,2);
 const aim=new controls.GrenadeAim();aim.start();const point=aim.aim({x:18,y:10},{x:1,y:1},10);assert.ok(Math.abs(Math.hypot(point.x-18,point.y-10)-10)<1e-8);aim.cancel();
 assert.equal(forbiddenReads,0);
 process.stdout.write(JSON.stringify({forbiddenReads,grenades:actor.grenades,hp:actor.hp,ap:actor.ap,repeated:replay.repeated}));
}

test('grenade discovery binds the public item, logic profile and explicit host checklist without pulling visuals into core',()=>{
 const asset=sharedAsset('item:grenade');
 assert.equal(asset.entry,'./grenades/three');assert.equal(asset.factory,'createGrenadeModel');assert.equal(asset.logicEntry,'./grenades');
 assert.equal(asset.guide,GRENADE_COMPONENT.guide);assert.equal(asset.profile,GRENADE_COMPONENT.profile);assert.deepEqual(asset.requiredHostServices,[...GRENADE_COMPONENT.requiredHostServices]);
 assert.equal(asset.capability.id,GRENADE_CONTRACT.capability);assert.equal(asset.dimensions.metresPerUnit,1);
 const core=distribution('core'),renderer=distribution('renderer');
 assert.equal(Object.hasOwn(core.exports,'./grenades/three'),false);assert.equal(core.files.some(file=>file.startsWith('packages/grenade-visuals/')),false);
 assert.equal(renderer.exports['./grenades/three'],'./packages/grenade-visuals/three.js');
 const pin=JSON.parse(fs.readFileSync(new URL('../upstream.json',import.meta.url))).aft.root+'/dist/';
 for(const file of ['tactics/horse-10k-data.json','assets/characters/lowpoly-proof/horse-worker-model-paint-v1.png','assets/equipment/painted-ui/grenade-surface.png'])assert.ok(renderer.files.includes(pin+file),file);
 assert.equal(renderer.files.some(file=>file.startsWith('vendor/farmyard-grenades/')||file.startsWith('vendor/farmyard-grenade-visuals/')),false);
});
