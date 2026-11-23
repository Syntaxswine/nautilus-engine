import test from 'node:test';import assert from 'node:assert/strict';
import {createGroundHost} from './host.js';import {defaultRecipe,goldenRecipe,fixtureById} from './registry.js';
import {stealthBlueprint,projectStealthMap} from './stealth-plot.js';import {createChecklist} from './runner.js';
import {openDocument} from '@nautilus-engine/map-core';
const recipe=()=>goldenRecipe(fixtureById('golden-foliage-stealth'),defaultRecipe());
const action=(h,id)=>h.actions.request(id,h.actions.read().context);
test('real portable brush edits invalidate projected queries on paint/clear/undo/redo/reload',()=>{
  const h=createGroundHost({recipe:recipe(),spawn:{x:11.5,y:27.5,h:0}}),doc=openDocument(stealthBlueprint());
  try{const depth=()=>h.readStealth().observation.concealment;assert(depth()>0);let revision=0;
    for(const edit of [()=>doc.apply({tool:'clear-foliage',start:{x:5,y:10,z:0},end:{x:11,y:12,z:0}}),()=>doc.undo(),()=>doc.redo(),()=>doc.undo()]){edit();const p=h.prepareFoliage(doc.export());assert(p.ok,p.reason);assert(p.commit().ok);assert.equal(h.readStealth().mapRevision,++revision);assert.equal(depth()>0,revision%2===0);}
    const saved=h.read(),restored=createGroundHost({recipe:recipe(),checkpoint:saved});try{assert.deepEqual(restored.read(),saved);assert.equal(restored.readStealth().observation.concealment,depth());}finally{restored.dispose();}
  }finally{h.dispose();}
});
test('unsupported geometry, occupied brush and stale staging preserve complete live state and durable writes',()=>{
  let writes=0;const h=createGroundHost({recipe:recipe(),persist:()=>writes++});
  try{const before=h.save(),bad=stealthBlueprint();bad.terrain[30][30]='water';assert.equal(h.prepareFoliage(bad).ok,false);assert.equal(h.save(),before);assert.equal(writes,0);
    const doc=openDocument(stealthBlueprint());assert(doc.apply({tool:'foliage-cover',start:{x:4,y:4,z:0},options:{foliagePreset:'thicket-v1',foliageDensity:100}}).ok);assert.equal(h.prepareFoliage(doc.export()).ok,false);assert.equal(h.save(),before);assert.equal(writes,0);
    const p=h.prepareFoliage(stealthBlueprint({brush:false}));assert(p.ok);action(h,'stealth/turn');const turned=h.save();assert.equal(p.commit().code,'STALE_PREPARATION');assert.equal(h.save(),turned);assert.equal(writes,1);
  }finally{h.dispose();}
});
test('stationary turns and refused movement retain travel and spent resources; whole moving host save restores exactly',()=>{
  const h=createGroundHost({recipe:recipe()});let restored;
  try{action(h,'stealth/stance');for(let i=0;i<8;i++){assert(h.walk('player',{x:1,y:0},.05).ok);h.advance(.05);}const before=h.read(),phase=h.readPose().travelM;action(h,'stealth/turn');assert.equal(h.readPose().travelM,phase);assert.deepEqual(h.read().resources,before.resources);
    const turn=h.read();assert.equal(h.walk('player',{x:1,y:0},10).ok,false);assert.deepEqual(h.read(),turn);
    restored=createGroundHost({recipe:recipe(),checkpoint:h.read()});assert.deepEqual(restored.read(),h.read());assert.deepEqual(restored.readPose(),h.readPose());
    for(let i=0;i<4;i++)for(const host of [h,restored]){assert(host.walk('player',{x:0,y:1},.05).ok);host.advance(.05);}assert.deepEqual(restored.read(),h.read(),'Saved command streams, observations, geometry and resources must replay identically.');
    const stale=h.offer(),request={commandId:'posture-retry',actionId:'stealth/mode',offer:stale},receipt=h.requestAction(request),after=h.save();assert(receipt.ok);assert(h.requestAction(request).repeated);assert.equal(h.save(),after);
  }finally{restored?.dispose();h.dispose();}
});
test('golden compares confirmed awareness/hearing and preserves original fixtures',()=>{
  const c=createChecklist();c.select(['golden-foliage-stealth','golden-door-passage','golden-rock-recovery']);const r=c.run();for(const f of Object.values(r.results))assert.equal(f.status,'passed',f.reason||f.fixture.id);
});
test('missing stealth or walking observations are unavailable before execution, never passed',()=>{for(const profile of ['without-stealth','without-traversal']){const r=defaultRecipe();r.observers.profile=profile;const c=createChecklist(r);c.select(['golden-foliage-stealth']);const result=c.run().results['golden-foliage-stealth'];assert.equal(result.status,'unavailable');assert.equal(result.command,null);assert.match(result.reason,/Missing observations/);}});
test('application binds separate nearest sight/shot contacts and refuses rays outside its geometry scope',()=>{
  const h=createGroundHost({recipe:recipe(),spawn:{x:11.5,y:27.5,h:0}}),doc=openDocument(stealthBlueprint({brush:false}));
  try{assert(doc.apply({tool:'foliage-cover',start:{x:6,y:10,z:0},end:{x:7,y:12,z:0},options:{foliagePreset:'thicket-v1',foliageDensity:80}}).ok);const p=h.prepareFoliage(doc.export());assert(p.ok,p.reason);assert(p.commit().ok);const rays=h.readStealth().rays;assert.equal(rays.sight.material,'foliage');assert.equal(rays.shot.material,'wood');assert(rays.shot.distance>rays.sight.distance);
    assert.throws(()=>h.queryStealthRay({x:40,y:20,h:1},{x:41,y:20,h:1},'shot'),/declared flat west plot/);
  }finally{h.dispose();}
});
test('Try from the crawl profile can explicitly return to the unchanged rock and road fixtures',()=>{const current=recipe();for(const id of ['golden-rock-recovery','golden-road-handling']){const next=goldenRecipe(fixtureById(id),current);assert(!next.plots.some(p=>p.fixture==='stealth-yard'));}});
test('source trunk cells block the conservative body while a wide neighboring gap walks; dense and bog cells block',()=>{
  const doc=openDocument(stealthBlueprint({brush:false}));assert(doc.apply({tool:'foliage-cover',start:{x:7,y:0,z:0},end:{x:15,y:9,z:0},options:{foliagePreset:'woodland-v1',foliageDensity:100}}).ok);
  const projected=projectStealthMap(doc.export()),trunk=projected.snapshot.cell({x:10,y:4,level:0});assert.equal(trunk.cover[1],false);assert.equal(trunk.blocked,true);
  const blocked=createGroundHost({recipe:recipe(),spawn:{x:15.5,y:20.5,h:0}}),gap=createGroundHost({recipe:recipe(),spawn:{x:15.5,y:24.5,h:0}});
  try{for(const h of [blocked,gap]){const p=h.prepareFoliage(doc.export());assert(p.ok,p.reason);assert(p.commit().ok);}for(let i=0;i<12;i++){blocked.walk('player',{x:1,y:0},.1);gap.walk('player',{x:1,y:0},.1);}assert(blocked.read().actor.position.x<=16.6);assert(gap.read().actor.position.x>19.5);const before=blocked.read(),pose=blocked.readPose();blocked.walk('player',{x:1,y:0},.1);assert.deepEqual(blocked.read().resources,before.resources);assert.equal(blocked.readPose().travelM,pose.travelM);
    for(const preset of ['thicket-v1','wetland-v1','bog-v1']){const d=openDocument(stealthBlueprint({brush:false}));assert(d.apply({tool:'foliage-cover',start:{x:9,y:8,z:0},options:{foliagePreset:preset,foliageDensity:80}}).ok);assert(projectStealthMap(d.export()).snapshot.cell({x:9,y:8,level:0}).blocked);}
  }finally{blocked.dispose();gap.dispose();}
});
