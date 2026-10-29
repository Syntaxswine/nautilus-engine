import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const scanner=fileURLToPath(new URL('./helpers/headless-closure.mjs',import.meta.url));
const entries={runtime:'packages/runtime-core/index.js',world:'packages/world-core/index.js',
  farmyard:'packages/adapters/farmyard/rules.js',floorNavigation:'packages/floor-navigation/index.js'};
function scan(directory=root){return spawnSync(process.execPath,['--experimental-vm-modules',scanner,'--root',directory],{encoding:'utf8',windowsHide:true,timeout:15000});}
function assertDiscovered(report){
  for(const [group,entry] of Object.entries(entries)){
    assert.ok(report.groups[group].entries.includes(entry),entry+' must be a discovered public headless entry');
    assert.ok(report.groups[group].modules>0,group+' must have an inspected closure');
  }
  for(const file of ['packages/floor-navigation/dom.js','packages/floor-navigation/style.css']) assert.equal(report.files.includes(file),false,file+' is optional UI outside the headless set');
}

test('default public-export scan includes all modular headless entries and excludes the optional DOM binding',()=>{
  const result=scan();assert.equal(result.status,0,result.stderr||result.error?.message);
  const report=JSON.parse(result.stdout);assertDiscovered(report);assert.deepEqual(report.violations,[]);
});

test('modular public entries import and work with browser, storage, RNG, ambient clocks and timers sealed',()=>{
  // This separate process prevents forbidden globals or module caches from leaking
  // into another test. It imports real public entry files, with no donor fixtures.
  const source='('+exerciseSealed.toString()+')('+JSON.stringify(Object.values(entries).map(file=>new URL('../'+file,import.meta.url).href))+')';
  const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:root,encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(result.status,0,result.stderr||result.error?.message);
  assert.deepEqual(JSON.parse(result.stdout),{order:['world','floors'],supportFloor:'floor-15',accuracy:70.75,selectedFloor:'floor-15',forbiddenReads:0});
});

async function exerciseSealed(urls){
  const assert=(await import('node:assert/strict')).default;
  let forbiddenReads=0;
  const forbidden=name=>{forbiddenReads++;throw Error('Forbidden ambient dependency: '+name);};
  for(const name of ['window','document','self','navigator','localStorage','sessionStorage','indexedDB','caches',
    'fetch','XMLHttpRequest','WebSocket','EventSource','Worker','SharedWorker','BroadcastChannel','Image',
    'HTMLCanvasElement','OffscreenCanvas','WebGLRenderingContext','WebGL2RenderingContext','THREE',
    'crypto','performance','Temporal','setTimeout','setInterval','setImmediate','queueMicrotask',
    'requestAnimationFrame','cancelAnimationFrame']){
    Object.defineProperty(globalThis,name,{configurable:true,get(){return forbidden(name);}});
  }
  const NativeDate=Date;
  Object.defineProperty(globalThis,'Date',{configurable:true,value:class extends NativeDate{
    constructor(){super(0);forbidden('new Date');}
    static now(){return forbidden('Date.now');}
  }});
  Object.defineProperty(Math,'random',{configurable:true,value:()=>forbidden('Math.random')});
  Object.defineProperty(process,'hrtime',{configurable:true,value:()=>forbidden('process.hrtime')});
  Object.defineProperty(process,'uptime',{configurable:true,value:()=>forbidden('process.uptime')});
  assert.throws(()=>globalThis.document,/Forbidden ambient/);
  assert.throws(()=>Date.now(),/Forbidden ambient/);assert.throws(()=>new Date(),/Forbidden ambient/);
  assert.throws(()=>Math.random(),/Forbidden ambient/);assert.throws(()=>globalThis.performance,/Forbidden ambient/);
  forbiddenReads=0;

  const [runtime,world,farmyard,floors]=await Promise.all(urls.map(url=>import(url)));
  const state=world.createWorld({id:'sealed-world',name:'Explicit upper floor',widthM:20,depthM:20,
    floorCount:32,storyHeightM:2.12,groundHeightM:0,heightM:80});
  const upper=state.floors[15];
  state.surfaces.push({id:'upper-panel',floorId:upper.id,role:'floor',
    bounds:{min:{x:2,y:2,h:upper.elevationM},max:{x:10,y:10,h:upper.elevationM}},supports:true,supportFloorId:upper.id});
  const reloaded=world.openWorld(world.serializeWorld(state));
  assert.deepEqual(world.validateWorld(reloaded),[]);
  const requirements=world.worldRequirements(reloaded);
  world.assertWorldCompatible(reloaded,{id:'sealed-host',contractVersion:1,
    schemas:[{id:requirements.schema.id,versions:[1]}],capabilities:requirements.required.map(item=>({id:item.id,versions:[1]}))});
  const query=world.compileWorld(reloaded);
  const support=query.findSupport({position:{x:4,y:4,h:upper.elevationM+.5},maxDropM:1,requireFloor:true});
  assert.equal(support.floorId,upper.id);assert.equal(support.point.h,upper.elevationM);
  const hit=query.traceSegment({from:{x:4,y:4,h:upper.elevationM+1},to:{x:4,y:4,h:upper.elevationM-1}});
  assert.equal(hit.surfaceId,'upper-panel');assert.equal(hit.point.h,upper.elevationM);

  const actor={id:0,statVersion:2,weapon:'assault',ap:-0.00000005,
    stats:{strength:31,endurance:42,dexterity:40,agility:60,intelligence:50,perception:65,
      mechanical:25,medical:40,firearms:81,heavyWeapons:30,explosives:45,leadership:30,sneak:55,climbing:50}};
  Object.defineProperty(actor,'hp',{get(){throw Error('Host HP must remain unread');},enumerable:true});
  const numbers=farmyard.deriveFarmyardStats(actor),copied=farmyard.withFarmyardDerivedStats(actor);
  assert.deepEqual(numbers,{maxHp:81,maxAp:12,maxStamina:92,damageResistance:5,accuracy:70.75,medical:45,stealth:55,perception:65});
  assert.equal(copied.id,0);assert.equal(copied.ap,-0.00000005);assert.equal(Object.hasOwn(copied,'stamina'),false);
  assert.deepEqual(Object.getOwnPropertyDescriptor(copied,'hp'),Object.getOwnPropertyDescriptor(actor,'hp'));
  assert.equal(farmyard.farmyardWeaponAccuracy(actor),70.75);
  assert.equal(farmyard.farmyardEffectiveSkill(actor,'mechanical'),30);
  assert.equal(farmyard.farmyardDamageAfterResistance(actor,17.5),12.5);

  let hostTime=100;
  const events=[],configuration={version:1,selected:['floors'],modules:[
    {id:'floors',version:1,provides:[{id:'floor.navigation',version:1}],requires:[
      {id:'world.query',minVersion:1,maxVersion:1},{id:'host.time',minVersion:1,maxVersion:1}]},
    {id:'world',version:1,provides:[{id:'world.query',version:1}]}],
    hosts:[{id:'host',version:1,provides:[{id:'host.time',version:1}]}]};
  const planned=runtime.planModules(configuration);assert.equal(planned.ok,true);assert.deepEqual(planned.plan.order,['world','floors']);
  assert.deepEqual(runtime.assertModulePlan(configuration),planned.plan);
  const running=await runtime.startModules(configuration,{hostServices:{host:{'host.time':()=>hostTime}},factories:{
    world:()=>({services:{'world.query':query},prepare(){events.push('world.prepare');},start(){events.push('world.start');},stop(){events.push('world.stop');},dispose(){events.push('world.dispose');}}),
    floors:context=>{
      assert.equal(context.services['world.query'],query);
      const controller=floors.createFloorNavigation({floors:reloaded.floors,selectedId:reloaded.floors[0].id});
      const wheel=floors.createFloorWheel();
      return {services:{'floor.navigation':{controller,wheel,time:context.services['host.time']}},
        prepare(){events.push('floors.prepare');},start(){events.push('floors.start');},stop(){events.push('floors.stop');},dispose(){controller.dispose();events.push('floors.dispose');}};
    }
  }});
  assert.deepEqual(events,['world.prepare','floors.prepare','world.start','floors.start']);
  const navigation=running.service('floors','floor.navigation');
  assert.equal(navigation.wheel.step({deltaY:-20,time:navigation.time()}),0);hostTime=110;
  const step=navigation.wheel.step({deltaY:-25,time:navigation.time()});assert.equal(step,1);
  navigation.controller.step(step,{source:'wheel'});assert.equal(navigation.controller.state.selectedId,'floor-1');
  assert.equal(floors.floorKeyStep({key:'PageUp'}),1);
  navigation.controller.setCharacter({id:'host-player',floorId:upper.id});navigation.controller.followCharacter();
  assert.equal(navigation.controller.state.mode,floors.FLOOR_MODES.character);
  assert.equal(navigation.controller.visibleFloors.length,5);
  const selectedFloor=navigation.controller.state.selectedId;
  const stop=running.stop();assert.equal(running.stop(),stop);assert.equal((await stop).ok,true);assert.equal(running.state,'disposed');
  assert.deepEqual(events.slice(4),['floors.stop','floors.dispose','world.stop','world.dispose']);
  assert.throws(()=>navigation.controller.select('floor-0'),/disposed/);
  assert.equal(forbiddenReads,0,'No attempted ambient access may be swallowed and concealed by a fallback');
  process.stdout.write(JSON.stringify({order:planned.plan.order,supportFloor:support.floorId,accuracy:numbers.accuracy,selectedFloor,forbiddenReads}));
}

test('new-entry default discovery excludes an exported DOM binding but catches it through a disguised runtime reexport',()=>{
  const temporaryRoot=fs.realpathSync(os.tmpdir()),directory=fs.mkdtempSync(path.join(temporaryRoot,'nautilus-modular-headless-'));
  try{
    const exports=Object.fromEntries(Object.entries(entries).map(([name,file])=>['./'+name,'./'+file]));
    exports['./floors/dom']='./packages/floor-navigation/dom.js';
    exports['./floors/style.css']='./packages/floor-navigation/style.css';
    fs.writeFileSync(path.join(directory,'package.json'),JSON.stringify({exports}));
    for(const [name,file] of Object.entries(entries)){
      const target=path.join(directory,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,'export const '+name+'=1;');
    }
    fs.writeFileSync(path.join(directory,'packages/floor-navigation/dom.js'),"export const mount=()=>document.createElement('section');");
    fs.writeFileSync(path.join(directory,'packages/floor-navigation/style.css'),'.floor-nav { display: block; }');
    const clean=scan(directory);assert.equal(clean.status,0,clean.stderr);assertDiscovered(JSON.parse(clean.stdout));
    fs.writeFileSync(path.join(directory,entries.runtime),"export {mount} from './bridge.js';");
    fs.writeFileSync(path.join(directory,'packages/runtime-core/bridge.js'),"export {mount} from '../floor-navigation/dom.js';");
    const bad=scan(directory);assert.notEqual(bad.status,0);
    assert.match(bad.stderr,/Renderer\/browser module in public core: packages\/runtime-core\/index\.js -> packages\/runtime-core\/bridge\.js -> packages\/floor-navigation\/dom\.js/);
  }finally{
    const resolved=fs.realpathSync(directory);
    if(path.dirname(resolved)!==temporaryRoot||!path.basename(resolved).startsWith('nautilus-modular-headless-'))throw Error('Unexpected modular-headless cleanup target.');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});
