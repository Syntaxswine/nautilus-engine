import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fifteenStoryRecipe,makeFifteenStoryWorld} from '../tools/fixtures/fifteen-story.mjs';
import {compileWorld,openWorld,serializeWorld,worldRequirements} from '../packages/world-core/index.js';

const contains=(body,p)=>p.x>=body.min.x&&p.x<=body.max.x&&p.y>=body.min.y&&p.y<=body.max.y;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('the fifteen-story recipe is deterministic, copied, sparse and uses real native heights',()=>{
  const a=fifteenStoryRecipe(),b=fifteenStoryRecipe();assert.equal(JSON.stringify(a),JSON.stringify(b));
  assert.equal(globalThis.window,undefined);assert.equal(globalThis.document,undefined);
  assert.equal(a.occupiedTowerStories,15);assert.equal(a.floors.length,16);assert.equal(a.bodies.length<400,true);
  assert.equal(new Set(a.bodies.map(body=>body.id)).size,a.bodies.length);
  assert.equal(a.floors[9].height,19.08);assert.equal(a.floors[10].height,21.2);assert.equal(a.floors[15].height,31.8);
  assert.equal(a.floors[9].id,'floor:9');assert.equal(a.floors[10].id,'floor:10');assert.notEqual(a.floors[9].id,a.floors[10].id);
  for(const body of a.bodies)for(const axis of ['x','y','h']) {
    assert.ok(Number.isFinite(body.min[axis])&&Number.isFinite(body.max[axis]));assert.ok(body.max[axis]>body.min[axis]);
    assert.ok(body.min[axis]>=a.bounds.min[axis]&&body.max[axis]<=a.bounds.max[axis]);
  }
  for(const expectation of a.expectations)for(const p of [expectation.point,expectation.from,expectation.to].filter(Boolean))for(const axis of ['x','y','h'])assert.ok(p[axis]>=a.bounds.min[axis]&&p[axis]<=a.bounds.max[axis]);
  a.bodies[0].min.h=99;assert.equal(b.bodies[0].min.h,-.12);
});

test('every stair flight has supported endpoints and an open upper-floor shaft',()=>{
  const recipe=fifteenStoryRecipe(),bodies=new Map(recipe.bodies.map(body=>[body.id,body]));
  assert.equal(recipe.links.length,15);assert.ok(recipe.links.some(link=>link.from.floorId==='floor:9'&&link.to.floorId==='floor:10'));
  for(const link of recipe.links) {
    assert.equal(link.treads.length,14);
    for(const [endpoint,support]of [[link.from,bodies.get(link.lowerLanding)],[link.to,bodies.get(link.upperLanding)]]) {
      assert.equal(endpoint.floorId,support.floorId);assert.equal(support.support,true);assert.ok(contains(support,endpoint.position));close(endpoint.position.h,support.max.h);
    }
    const steps=link.treads.map(id=>bodies.get(id));close(steps.at(-1).max.h,link.to.position.h);
    for(let i=0;i<steps.length;i++) {
      close(steps[i].max.h-steps[i].min.h,.08);close(steps[i].max.h-(i?steps[i-1].max.h:link.from.position.h),2.12/14);
      if(i)close(steps[i-1].max.y,steps[i].min.y);
    }
    const upperBodies=recipe.bodies.filter(body=>body.floorId===link.to.floorId&&['floor','roof'].includes(body.role));
    assert.ok(upperBodies.every(body=>!contains(body,{x:6,y:7})),'Upper floor must not seal the stair opening');
  }
  assert.ok(2.12-.08>recipe.actors[0].height,'Repeated thin treads preserve native story headroom.');
});

test('high-floor actors fit real supports and door apertures without a floor-five clamp',()=>{
  const recipe=fifteenStoryRecipe(),bodies=new Map(recipe.bodies.map(body=>[body.id,body]));
  for(const actor of recipe.actors) {
    const support=bodies.get(actor.supportId),door=recipe.doors.find(door=>door.floorId===actor.floorId);
    assert.ok(contains(support,actor.position));close(actor.position.h,support.max.h);assert.ok(actor.height<door.opening.height);
    assert.equal(door.opening.height,1.65);assert.equal(actor.floorId,support.floorId);
  }
  const high=recipe.expectations.find(item=>item.id==='floor-14-impact');assert.equal(high.from.h,30.48);assert.equal(high.floorId,'floor:14');
  const low=recipe.expectations.find(item=>item.id==='low-neighbour-roof');assert.equal(low.height,4.24);assert.equal(bodies.get(low.contactId).role,'roof');
  assert.notEqual(low.floorId,recipe.roofDatum);assert.ok(recipe.actors.every(actor=>actor.position.h>10));
});

test('the deployed native fixture is reproducible, validates and preserves every height and global identity',()=>{
  const world=makeFifteenStoryWorld(),json=serializeWorld(world);
  assert.equal(fs.readFileSync(new URL('../examples/native-fifteen-story.world.json',import.meta.url),'utf8'),json+'\n');
  assert.equal(world.bounds.minHeightM,-.12);assert.equal(world.floors[15].elevationM,31.8);
  const ids=['floors','surfaces','entities','links'].flatMap(key=>world[key].map(record=>record.id));
  assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(openWorld(json),world);assert.equal(serializeWorld(openWorld(json)),json);
  assert.equal(world.entities[1].id,'tower:actor:10');assert.equal(world.entities[1].floorId,'floor:10');
  assert.equal(world.surfaces.find(surface=>surface.id==='neighbour:slab:2').role,'roof');
  assert.equal(compileWorld(world).stats().denseCells,0);assert.ok(Buffer.byteLength(json)<100_000);
  assert.equal(worldRequirements(world).required.length,4);
});

test('the real static provider confirms every native support, high impact, closed/open door and roof case',()=>{
  const world=makeFifteenStoryWorld(),recipe=fifteenStoryRecipe();
  for(const expectation of recipe.expectations) {
    const candidate=structuredClone(world);
    if(expectation.openDoor) {
      // An explicit new static pose, not a dynamic-door or movement capability.
      const door=candidate.surfaces.find(surface=>surface.id===expectation.openDoor),h=door.bounds.min.h;
      door.bounds={min:{x:10,y:9.94,h},max:{x:11,y:10.06,h:door.bounds.max.h}};
    }
    const query=compileWorld(candidate),hit=expectation.intent==='support'
      ?query.findSupport({position:expectation.point,maxDropM:1,requireFloor:true})
      :query.traceSegment({from:expectation.from,to:expectation.to});
    const expected=recipe.actors.some(actor=>actor.id===expectation.contactId)?expectation.contactId+':body':expectation.contactId;
    assert.equal(hit?.surfaceId,expected,expectation.id);
    assert.equal(hit.floorId??hit.anchorFloorId,expectation.floorId,expectation.id);
    if(expectation.height!==undefined)assert.equal(hit.point.h,expectation.height,expectation.id);
  }
  const query=compileWorld(world);
  assert.ok(query.linksFrom('floor:9').some(link=>link.to.floorId==='floor:10'));
  assert.equal(query.getFloor('floor:9').elevationM,19.08);
  assert.equal(query.getFloor('floor:10').elevationM,21.2);
  // A tread between declared floors is physical support without a guessed floor.
  const tread=world.surfaces.find(surface=>surface.id==='tower:stair:10:5');
  const point={x:6,y:(tread.bounds.min.y+tread.bounds.max.y)/2,h:tread.bounds.max.h+.01};
  assert.equal(query.findSupport({position:point,maxDropM:.1,requireFloor:false}).floorId,null);
  assert.equal(query.findSupport({position:point,maxDropM:.1,requireFloor:true}),null);
});
