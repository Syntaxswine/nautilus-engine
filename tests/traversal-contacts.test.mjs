import test from 'node:test';import assert from 'node:assert/strict';
import {contactShape,boundsContactShape,contactOverlap,contactSeparation,castContact,moveWithContacts,translateContactShape} from '../packages/traversal-core/index.js';
const box=(id,x,y,w,d)=>boundsContactShape(id,{min:{x,y,h:0},max:{x:x+w,y:y+d,h:2}});
const disc=(x,y)=>contactShape({id:'walker',points:[{x,y}],radiusM:.28,minH:0,maxH:1.8});
const near=(a,b,e=1e-5)=>assert.ok(Math.abs(a-b)<e,`${a} ≠ ${b}`);
test('disc sweeps thin wall, slides requested tangent more slowly and stops head-on',()=>{
 const wall=box('wall',2,-10,.02,20),shape=disc(1,0),delta={x:3,y:2},r=moveWithContacts(shape,delta,[wall]);
 assert.equal(r.blocked,true);assert.ok(r.delta.x<=.720001);assert.ok(r.delta.y>1&&r.delta.y<2);assert.equal(contactOverlap(r.shape,wall),null);
 const head=moveWithContacts(shape,{x:10,y:0},[wall]);near(head.delta.x,.72);near(head.delta.y,0);
 assert.ok(castContact(shape,{x:100,y:0},wall).time<.008);
});
test('actual rounded corners pass where the inherited square body refused',()=>{
 const wall=box('corner',2,2,1,1),shape=disc(1.79,1.79);assert.equal(contactOverlap(shape,wall),null);
 assert.equal(castContact(shape,{x:-1,y:0},wall),null);
 assert.ok(contactOverlap(disc(1.81,1.81),wall));
});
test('glancing both sides, reverse and flush recovery have no invented shoulder',()=>{
 for(const side of [-1,1])for(const direction of [-1,1]){
  const wall=side>0?box('wall',2,-20,.01,40):box('wall',-2.01,-20,.01,40),shape=disc(side*1.72,0);
  const r=moveWithContacts(shape,{x:side*.3,y:direction*1.2},[wall]);near(r.delta.x,0);near(r.delta.y,direction*1.2*.72);
  assert.equal(contactOverlap(r.shape,wall),null);const away=moveWithContacts(r.shape,{x:-side*.2,y:0},[wall]);near(away.delta.x,-side*.2);
  const stopped=moveWithContacts(shape,{x:side,y:0},[wall]);near(stopped.distanceM,0);
 }
});
test('closed corners, circles and a second blocker stop every slide segment',()=>{
 const obstacles=[box('vertical',2,-20,.01,40),box('horizontal',-20,2,40,.01)],r=moveWithContacts(disc(1,1),{x:5,y:5},obstacles);
 assert.ok(r.delta.x<=.720001&&r.delta.y<=.720001);for(const o of obstacles)assert.equal(contactOverlap(r.shape,o),null);
 const b=disc(3,0),hit=castContact(disc(0,0),{x:20,y:0},b);near(hit.time,(3-.56)/20);
 assert.equal(castContact(disc(0,.6),{x:20,y:0},b),null);
});
test('oriented bodies use convex narrow phase instead of final world AABB',()=>{
 const angle=Math.PI/4,c=Math.cos(angle),s=Math.sin(angle),shape=contactShape({id:'car',points:[[-1,-2],[1,-2],[1,2],[-1,2]].map(([x,y])=>({x:x*c+y*s,y:-x*s+y*c})),minH:0,maxH:1.5});
 const wall=box('clear-corner',1.8,1.8,.1,.1);assert.equal(contactOverlap(shape,wall),null);assert.equal(castContact(shape,{x:.1,y:.1},wall),null);
 const hit=box('real-hit',-.05,-.05,.1,.1);assert.ok(contactOverlap(shape,hit));
});
test('deterministic sustained tangential motion stays outside and bounded',()=>{
 const wall=box('wall',2,-100,.01,200),run=()=>{let shape=disc(1.72,0),distance=0;for(let i=0;i<120;i++){const r=moveWithContacts(shape,{x:.03,y:.04},[wall]);assert.equal(contactOverlap(r.shape,wall),null);assert.ok(r.distanceM<=.05+1e-8);distance+=r.distanceM;shape=r.shape;}return {shape,distance};};
 const a=run(),b=run();assert.deepEqual(a,b);near(a.distance,120*.04*.72);assert.throws(()=>moveWithContacts(a.shape,{x:1,y:0},[wall],{profile:'invented'}),/PROFILE/);
 assert.equal(contactOverlap(translateContactShape(disc(0,0),{x:2,y:0}),wall)?.id,'wall');
});
test('contact normals and saved movement round-trip through ordinary JSON without negative zero',()=>{
 const shape=contactShape({id:'zero',points:[{x:-0,y:-0}],radiusM:-0,minH:-0,maxH:1});assert.deepEqual(JSON.parse(JSON.stringify(shape)),shape);
 const touching=contactSeparation(box('a',0,0,1,1),box('b',1,0,1,1));assert.deepEqual(JSON.parse(JSON.stringify(touching)),touching);
 for(const delta of [{x:1,y:.2},{x:-1,y:.2},{x:.2,y:1},{x:.2,y:-1}]){
  const wall=Math.abs(delta.x)===1?box('wall',delta.x>0?2:-2.01,-20,.01,40):box('wall',-20,delta.y>0?2:-2.01,40,.01),shape=disc(Math.abs(delta.x)===1?Math.sign(delta.x)*1.72:0,Math.abs(delta.y)===1?Math.sign(delta.y)*1.72:0),result=moveWithContacts(shape,delta,[wall]);
  assert.ok(result.contacts.length);assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
 }
});
