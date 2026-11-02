import test from 'node:test';
import assert from 'node:assert/strict';
import {planModules,assertModulePlan,startModules,ModuleConfigurationError,ModuleStartError} from '../packages/runtime-core/index.js';

const provides=(id,version=1)=>({id,version});
const requires=(id,optional=false,minVersion=1,maxVersion=1)=>({id,minVersion,maxVersion,optional});
const module=(id,services=[],needs=[])=>({id,version:1,provides:services.map(item=>typeof item==='string'?provides(item):item),requires:needs});
const config=(modules,selected,extra={})=>({version:1,modules,selected,...extra});

test('a single selected library plans alone and never selects unrelated rendering',()=>{
  const request=config([module('rules',['stat.math']),module('renderer',['render.scene'])],['rules']);
  const original=structuredClone(request),result=planModules(request);
  assert.equal(result.ok,true);assert.deepEqual(result.plan.order,['rules']);assert.deepEqual(result.plan.hosts,[]);
  result.plan.modules[0].provides[0].version=99;
  assert.deepEqual(request,original);assert.equal(assertModulePlan(request).modules[0].provides[0].version,1);
});

test('dependency closure is deterministic and exposes transitive providers before activation',()=>{
  const modules=[module('item',['item.actions'],[requires('world.query')]),module('world',['world.query'],[requires('geometry')]),module('geometry',['geometry'])];
  const a=assertModulePlan(config(modules,['item'])),b=assertModulePlan(config([...modules].reverse(),['item']));
  assert.deepEqual(a,b);assert.deepEqual(a.order,['geometry','world','item']);
  assert.deepEqual(a.bindings.map(item=>[item.consumer,item.provider]),[['item','world'],['world','geometry']]);
});

test('all active hard version ranges are joined before provider selection regardless of module naming',()=>{
  for(const [wide,tight]of [['a.wide','z.tight'],['z.wide','a.tight']]){
    const modules=[module(wide,[],[requires('world',false,1,2)]),module(tight,[],[requires('world',false,2,2)]),module('world.one',[provides('world',1)]),module('world.two',[provides('world',2)])];
    const result=planModules(config(modules,[wide,tight]));assert.equal(result.ok,true,JSON.stringify(result.errors));
    assert.equal(result.plan.order.includes('world.one'),false);assert.ok(result.plan.bindings.every(item=>item.provider==='world.two'));
  }
});

test('ambiguity is deferred until newly activated dependencies finish narrowing hard ranges',()=>{
  const modules=[module('a',[],[requires('world',false,1,2)]),module('z',[],[requires('feature')]),module('feature',['feature'],[requires('world',false,2,2)]),module('world.one',[provides('world',1)]),module('world.two',[provides('world',2)])];
  const result=planModules(config(modules,['a','z']));assert.equal(result.ok,true);assert.equal(result.plan.order.includes('world.one'),false);
});

test('an explicit host binding retains the old service despite an available engine replacement',async()=>{
  const world={sweep:()=>({hit:false}),disposeCalls:0,dispose(){this.disposeCalls++;}};
  const request=config([module('item',['item.actions'],[requires('world.query')]),module('engine.world',['world.query'])],['item'],{
    hosts:[{id:'host.world',version:1,provides:[provides('world.query')]}],bindings:{'world.query':'host.world'}
  });
  let replacements=0;
  const runtime=await startModules(request,{hostServices:{'host.world':{'world.query':world}},factories:{
    item:({services})=>({services:{'item.actions':{world:services['world.query']}}}),
    'engine.world':()=>{replacements++;throw Error('Unselected module must not start.');}
  }});
  assert.equal(runtime.service('item','item.actions').world,world);assert.equal(replacements,0);
  assert.deepEqual(runtime.plan.order,['item']);assert.equal((await runtime.stop()).ok,true);assert.equal(world.disposeCalls,0);
});

test('missing, ambiguous, incompatible and cyclic plans fail before any factory runs',async()=>{
  const cases=[
    [config([module('actor',[],[requires('world')])],['actor']),'MISSING_SERVICE'],
    [config([module('actor',[],[requires('world')]),module('world.a',['world']),module('world.b',['world'])],['actor']),'AMBIGUOUS_SERVICE'],
    [config([module('a',[],[requires('world')]),module('b',[],[requires('world',false,2,2)]),module('world',['world'])],['a','b']),'INCOMPATIBLE_SERVICE'],
    [config([module('a',['a'],[requires('b')]),module('b',['b'],[requires('a')])],['a']),'DEPENDENCY_CYCLE']
  ];
  for(const [request,code]of cases){
    const result=planModules(request);assert.equal(result.ok,false);assert.ok(result.errors.some(item=>item.code===code),JSON.stringify(result));
    let calls=0;await assert.rejects(startModules(request,{factories:{a:()=>{calls++;},actor:()=>{calls++;}}}),ModuleConfigurationError);assert.equal(calls,0);
  }
});

test('optional modules stay unselected until explicitly bound, then acquire their dependencies',()=>{
  const modules=[module('ui',[],[requires('audio',true)]),module('audio',['audio'],[requires('transport')]),module('transport',['transport'])];
  const off=planModules(config(modules,['ui']));assert.equal(off.ok,true);assert.deepEqual(off.plan.order,['ui']);assert.equal(off.warnings[0].code,'OPTIONAL_MISSING_SERVICE');
  const on=planModules(config(modules,['ui'],{bindings:{audio:'audio'}}));assert.equal(on.ok,true);assert.deepEqual(on.plan.order,['transport','audio','ui']);assert.deepEqual(on.warnings,[]);
});

test('an optional relationship can use a module selected later through another required dependency',()=>{
  const modules=[module('a',[],[requires('support',true)]),module('z',[],[requires('feature',true)]),module('feature',['feature'],[requires('support')]),module('support',['support'])];
  const result=planModules(config(modules,['a','z'],{bindings:{feature:'feature'}}));
  assert.equal(result.ok,true);assert.deepEqual(result.warnings,[]);
  assert.ok(result.plan.bindings.some(item=>item.consumer==='a'&&item.provider==='support'));
});

test('hard requirements from explicit optional activations take precedence over opportunistic optional matches',()=>{
  const modules=[module('a',[],[requires('world',true)]),module('z',[],[requires('feature',true)]),module('feature',['feature'],[requires('world',false,2,2)])];
  const hosts=[{id:'host.one',version:1,provides:[provides('world',1)]},{id:'host.two',version:1,provides:[provides('world',2)]}];
  const result=planModules(config(modules,['a','z'],{hosts,bindings:{feature:'feature'}}));
  assert.equal(result.ok,true);assert.ok(result.plan.bindings.some(item=>item.consumer==='feature'&&item.provider==='host.two'));
  assert.equal(result.plan.bindings.some(item=>item.consumer==='a'),false);assert.equal(result.warnings[0].code,'OPTIONAL_INCOMPATIBLE_SERVICE');
});

test('strict bounded configuration rejects accessors, sparse arrays, unknown fields and future versions',()=>{
  let reads=0;const getter=config([],[]);Object.defineProperty(getter,'bindings',{enumerable:true,get(){reads++;return {};}});
  assert.equal(planModules(getter).ok,false);assert.equal(reads,0);
  for(const request of [
    {...config([],[]),version:2}, {...config([],[]),typo:1},config([module('a')],['a','a']),
    config([],Array(1)),config([],[{toString:'do not coerce'}]),config([module('constructor')],[]),
    config([module('a')],['a'],{bindings:{missing:'a'}}),config(Array.from({length:129},(_,i)=>module('m'+i)),[]),
    config([],[],{hosts:null}),config([],[],{bindings:null}),config([{...module('a'),requires:null}],['a']),
    config([module('a\n')],['a\n']),config([module('a\r\n')],['a\r\n']),
    config([module('a',[provides('service\n')])],['a']),config([module('a',[],[requires('service\r\n')])],['a'])
  ])assert.equal(planModules(request).ok,false);
  assert.throws(()=>assertModulePlan({...config([],[]),version:2}),ModuleConfigurationError);
});

test('graph diagnostics point to the actual requirement in the input arrays',()=>{
  const request=config([module('actor',[],[requires('world')])],['actor']);
  const result=planModules(request),error=result.errors.find(item=>item.code==='MISSING_SERVICE');
  assert.equal(error.path,'/modules/0/requires/0');assert.equal(error.moduleId,'actor');assert.equal(error.serviceId,'world');
  let target=request;for(const segment of error.path.slice(1).split('/'))target=target[segment];assert.deepEqual(target,requires('world'));
});

test('service IDs matching ordinary prototype members remain explicit data',async()=>{
  const request=config([module('consumer',[],[requires('toString')])],['consumer'],{hosts:[{id:'host',version:1,provides:[provides('toString')]}]});
  const runtime=await startModules(request,{hostServices:{host:{toString:'a real host service'}},factories:{consumer:({services})=>{assert.equal(services.toString,'a real host service');return {services:{}};}}});
  assert.equal((await runtime.stop()).ok,true);
});

test('missing implementations and implementation accessors reject before preparation',async()=>{
  const request=config([module('a'),module('b')],['a','b']);let calls=0;
  await assert.rejects(startModules(request,{factories:{a:()=>{calls++;return {services:{}};}}}),error=>error instanceof ModuleConfigurationError&&error.diagnostics.some(item=>item.code==='MISSING_FACTORY'));
  assert.equal(calls,0);
  const implementations={};Object.defineProperty(implementations,'factories',{enumerable:true,get(){calls++;return {};}});
  await assert.rejects(startModules(request,implementations),ModuleConfigurationError);assert.equal(calls,0);
  for(const invalid of [{factories:null},{hostServices:null}])await assert.rejects(startModules(config([],[]),invalid),ModuleConfigurationError);
});

test('factories return synchronous data handles and do not assimilate a handle then accessor',async()=>{
  let reads=0;
  const handle={services:{}};Object.defineProperty(handle,'then',{enumerable:true,get(){reads++;return undefined;}});
  const request=config([module('a')],['a']);
  await assert.rejects(startModules(request,{factories:{a:()=>handle}}),ModuleStartError);assert.equal(reads,0);
  await assert.rejects(startModules(request,{factories:{a:()=>Promise.resolve({services:{}})}}),ModuleStartError);
});

test('preparation is dependency-ordered, starts happen afterward and shutdown disposes dependents first',async()=>{
  const events=[],request=config([module('a',['a']),module('b',['b'],[requires('a')])],['b']);
  const factories=Object.fromEntries(['a','b'].map(id=>[id,context=>({
    services:{[id]:{id}},prepare(){events.push('prepare '+id);if(id==='b')assert.equal(context.services.a.id,'a');},
    start(){events.push('start '+id);},stop(){events.push('stop '+id);},dispose(){events.push('dispose '+id);}
  })]));
  const runtime=await startModules(request,{factories});assert.equal(runtime.state,'running');
  const plan=runtime.plan;plan.order.reverse();assert.deepEqual(runtime.plan.order,['a','b']);
  const first=runtime.stop(),second=runtime.stop();assert.equal(first,second);assert.equal((await first).ok,true);assert.equal(runtime.state,'disposed');
  assert.deepEqual(events,['prepare a','prepare b','start a','start b','stop b','dispose b','stop a','dispose a']);
  await runtime.stop();assert.equal(events.length,8);assert.throws(()=>runtime.service('a','a'),/not running/);
});

test('failed preparation disposes partial resources and already-prepared dependencies without starting them',async()=>{
  const events=[],request=config([module('a',['a']),module('b',[],[requires('a')])],['b']);
  await assert.rejects(startModules(request,{factories:{
    a:()=>({services:{a:{}},prepare(){events.push('prepare a');},start(){events.push('start a');},dispose(){events.push('dispose a');}}),
    b:()=>({services:{},prepare(){events.push('prepare b');throw Error('load failed');},dispose(){events.push('dispose b');}})
  }}),error=>error instanceof ModuleStartError&&error.moduleId==='b'&&error.phase==='prepare'&&error.cleanup.ok);
  assert.deepEqual(events,['prepare a','prepare b','dispose b','dispose a']);
});

test('failed start stops the partially-started provider and cleans up all prepared handles',async()=>{
  const events=[],request=config([module('a',['a']),module('b',[],[requires('a')]),module('c',[],[requires('a')])],['b','c']);
  const factories=Object.fromEntries(['a','b','c'].map(id=>[id,()=>({services:id==='a'?{a:{}}:{},start(){events.push('start '+id);if(id==='b')throw Error('start failed');},stop(){events.push('stop '+id);},dispose(){events.push('dispose '+id);}})]));
  await assert.rejects(startModules(request,{factories}),error=>error instanceof ModuleStartError&&error.phase==='start'&&error.cleanup.ok);
  assert.deepEqual(events,['start a','start b','dispose c','stop b','dispose b','stop a','dispose a']);
});

test('cleanup failures are reported while every remaining dependent/provider is still attempted',async()=>{
  const events=[],request=config([module('a',['a']),module('b',[],[requires('a')])],['b']);
  const runtime=await startModules(request,{factories:{
    a:()=>({services:{a:{}},stop(){events.push('stop a');},dispose(){events.push('dispose a');}}),
    b:()=>({services:{},stop(){events.push('stop b');throw Error('stop blocked');},dispose(){events.push('dispose b');throw Error('dispose blocked');}})
  }});
  const report=await runtime.stop();assert.equal(report.ok,false);assert.equal(runtime.state,'cleanup-failed');assert.equal(report.errors.length,2);
  assert.deepEqual(events,['stop b','dispose b','stop a','dispose a']);assert.ok(Object.isFrozen(report));assert.equal(await runtime.stop(),report);
});

test('a synchronous stop reentry shares the same shutdown instead of repeating hooks',async()=>{
  let runtime,reentered;const events=[];
  runtime=await startModules(config([module('a')],['a']),{factories:{a:()=>({services:{},stop(){events.push('stop');reentered=runtime.stop();},dispose(){events.push('dispose');}})}});
  const initial=runtime.stop();await initial;assert.equal(reentered,initial);assert.deepEqual(events,['stop','dispose']);assert.equal(runtime.state,'disposed');
});

test('error-message accessors cannot abort rollback or shutdown of other resources',async()=>{
  let reads=0;const fault=new Error();Object.defineProperty(fault,'message',{get(){reads++;throw Error('formatting failed');}});
  const events=[],request=config([module('a',['a']),module('b',[],[requires('a')])],['b']);
  const factories={
    a:()=>({services:{a:{}},dispose(){events.push('dispose a');}}),
    b:()=>({services:{},stop(){throw fault;},dispose(){events.push('dispose b');}})
  };
  const runtime=await startModules(request,{factories});const report=await runtime.stop();assert.equal(report.ok,false);
  assert.equal(reads,0);assert.deepEqual(events,['dispose b','dispose a']);assert.equal(runtime.state,'cleanup-failed');
  const broken={...factories,b:()=>({services:{},prepare(){throw fault;},dispose(){events.push('rollback b');}})};
  await assert.rejects(startModules(request,{factories:broken}),error=>error instanceof ModuleStartError&&error.cleanup.ok&&error.message.includes('Provider hook failed.'));
  assert.equal(reads,0);
});

test('declared exports are checked after preparation and invalid exports still dispose their owner',async()=>{
  let disposed=0;
  await assert.rejects(startModules(config([module('a',['a'])],['a']),{factories:{a:()=>({services:{wrong:{}},dispose(){disposed++;}})}}),error=>error instanceof ModuleStartError&&error.cleanup.ok);
  assert.equal(disposed,1);
});

test('empty composition has no services or global lifetime and is explicitly disposable',async()=>{
  const runtime=await startModules(config([],[]));assert.deepEqual(runtime.plan.order,[]);assert.equal((await runtime.stop()).ok,true);
  assert.equal(globalThis.document,undefined);assert.equal(globalThis.window,undefined);
});
