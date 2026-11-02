import test from 'node:test';
import assert from 'node:assert/strict';
import {partIdentity,decodePartIdentity,PART_IDENTITY} from '../packages/parts-core/identity.js';
import {apertureReadiness} from '../packages/parts-core/clearance.js';
import {createWorld,openWorld} from '../packages/world-core/index.js';
import {createInteractionState,openInteractionState} from '../packages/interactions/index.js';

test('generated part IDs reversibly preserve source delimiters and remain unique across bounded identity kinds',()=>{
  const ids=new Map(),keys=['a','a:b','a/b','a-b','a_b','A','b:c','front/door'];
  for(const instanceId of keys)for(const kind of PART_IDENTITY.kinds)for(const partId of keys){const identity=partIdentity(instanceId,kind,partId),tuple={instanceId,kind,partId};assert.ok(identity.length<=96);assert.match(identity,/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}(?![\s\S])/);assert.ok(!ids.has(identity));ids.set(identity,tuple);assert.deepEqual(decodePartIdentity(identity),tuple);assert.equal(partIdentity(instanceId,kind,partId),identity);}
  assert.notEqual(partIdentity('a:b','door','c'),partIdentity('a','door','b:c'));assert.notEqual(partIdentity('a/b','door','c'),partIdentity('a-b','door','c'));
});
test('generated-ID limits reject instead of truncating, and canonical decoding rejects aliases',()=>{
  const generated=partIdentity('a'.repeat(24),'attachment','b'.repeat(32));assert.ok(generated.length<=96);assert.equal(decodePartIdentity(generated).partId.length,32);
  for(const [instance,kind,part]of [['a'.repeat(25),'door','b'],['a','door','b'.repeat(33)],['a\n','door','b'],['a','unknown','b'],['a','door','b\n']])assert.throws(()=>partIdentity(instance,kind,part),error=>error.code==='INVALID_PART_ID'&&error.diagnostics[0].action.includes('never'));
  for(const bad of ['fp:door:YQ==:Yg','fp:door:YR:Yg','fp:door::Yg','anything'])assert.throws(()=>decodePartIdentity(bad));
});
test('the same generated identities bind strict world floor/surface and interaction references without substitution',()=>{
  const world=createWorld({id:partIdentity('house/1','instance','root'),name:'Identity compatibility',widthM:10,depthM:10,floorCount:1,storyHeightM:2.12,groundHeightM:0,heightM:4}),floorId=partIdentity('house/1','floor','ground'),surfaceId=partIdentity('house/1','surface','floor/0');world.floors[0].id=floorId;world.surfaces=[{id:surfaceId,floorId,role:'floor',bounds:{min:{x:0,y:0,h:0},max:{x:10,y:10,h:0}},supports:true,supportFloorId:floorId}];assert.equal(openWorld(world).surfaces[0].id,surfaceId);
  const door={id:partIdentity('house/1','door','front/door'),label:'Front',floorId,position:{x:5,y:5,h:0},reachM:1,closedBounds:{min:{x:5,y:4,h:0},max:{x:5.1,y:6,h:1.65}},openBounds:null,motionBounds:{min:{x:5,y:4,h:0},max:{x:5.1,y:6,h:1.65}},open:false,locked:false};const state=createInteractionState({worldId:world.id,doors:[door]});assert.deepEqual(openInteractionState(state).doors[0],door);
});
test('measured aperture readiness rejects the 1.65m/1.7m mismatch and wider bodies without rescaling',()=>{
  const input={body:{radiusM:.25,heightM:1.7},aperture:{widthM:1,heightM:1.65}},before=structuredClone(input);assert.equal(apertureReadiness(input).code,'APERTURE_BODY_TOO_TALL');assert.deepEqual(input,before);
  assert.deepEqual(apertureReadiness({...input,aperture:{widthM:1,heightM:1.85}}),{ok:true});assert.equal(apertureReadiness({body:{radiusM:.6,heightM:1.7},aperture:{widthM:1,heightM:1.85}}).code,'APERTURE_BODY_TOO_WIDE');assert.deepEqual(input,before);
});
