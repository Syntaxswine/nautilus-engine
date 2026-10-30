import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrenadeExample,serializeGrenadeState,grenadeTrajectory,GrenadeCompatibilityError} from '../packages/grenades-core/index.js';
import {GrenadeAim,FIELD_CAMERA,screenToGround,grenadeCameraFrame} from '../packages/grenades-core/aim.js';
import * as Original from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/grenade-controls.js';
const view=aim=>({active:aim.active,point:aim.point,offset:aim.offset});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10);

test('aim arming, neutral hold, explicit cancellation and exact source dead-zone math never touch game state',()=>{
 const state=createGrenadeExample(),before=serializeGrenadeState(state),aim=new GrenadeAim(),source=new Original.GrenadeAim(),origin={x:5.25,y:24.1};
 for(const item of [aim,source])item.start();assert.deepEqual(view(aim),view(source));assert.equal(aim.point,null);
 for(const offset of [{x:.05,y:.05},{x:.12,y:0},{x:.56,y:0},{x:.7,y:-.4},{x:0,y:0},{x:1,y:1},{x:-2,y:3}]){
  const untouched=structuredClone(offset);assert.deepEqual(aim.aim(origin,offset,10),source.aim(origin,offset,10));assert.deepEqual(view(aim),view(source));assert.deepEqual(offset,untouched);
 }
 aim.cancel();source.cancel();assert.deepEqual(view(aim),view(source));assert.equal(aim.aim(origin,{x:1,y:0},10),null);
 assert.equal(serializeGrenadeState(state),before);assert.deepEqual(origin,{x:5.25,y:24.1});
});

test('keyboard nudge uses explicit dt and reaches max range with no diagonal bonus or release drift',()=>{
 const aim=new GrenadeAim(),source=new Original.GrenadeAim(),origin={x:19,y:14};aim.start();source.start();
 for(let i=0;i<12;i++)assert.deepEqual(aim.nudge(origin,{x:1,y:-1},10,.05),source.nudge(origin,{x:1,y:-1},10,.05));
 const held={...aim.point};assert.deepEqual(aim.nudge(origin,{x:0,y:0},10,1),held);
 for(let i=0;i<100;i++){aim.nudge(origin,{x:1,y:-1},10,.05);source.nudge(origin,{x:1,y:-1},10,.05);}
 assert.deepEqual(view(aim),view(source));near(Math.hypot(aim.point.x-origin.x,aim.point.y-origin.y),10);
 for(const offset of [{x:1,y:0},{x:0,y:-1},{x:1,y:1},{x:-2,y:3}]){const point=aim.aim(origin,offset,10);near(Math.hypot(point.x-origin.x,point.y-origin.y),10);}
});

test('fixed screen axes and portrait/landscape camera framing exactly equal the preserved original',()=>{
 assert.deepEqual(FIELD_CAMERA,Original.FIELD_CAMERA);
 for(const [x,y]of [[1,0],[0,1],[-.25,.8],[0,0]])assert.deepEqual(screenToGround(x,y),Original.screenToGround(x,y));
 const right=screenToGround(1,0),down=screenToGround(0,1);near(Math.hypot(right.x,right.y),1);near(right.x*down.x+right.y*down.y,0);
 const a={x:19,y:14},b={x:26,y:7},points=grenadeTrajectory(a,b);
 for(let i=0;i<32;i++)points.push({x:b.x+Math.cos(i/32*Math.PI*2)*5,y:b.y+Math.sin(i/32*Math.PI*2)*5,z:0});
 for(const viewport of [{width:390,height:844,left:16,right:374,top:130,bottom:450},{width:844,height:390,left:16,right:828,top:120,bottom:190},{width:1200,height:900}])assert.deepEqual(grenadeCameraFrame(points,viewport,13),Original.grenadeCameraFrame(points,viewport,13));
});

test('public aim/camera boundaries reject invalid finite/versionless shape inputs before accessors or toJSON execute',()=>{
 const aim=new GrenadeAim();aim.start();const origin={x:2,y:3};let calls=0;
 const getter={get x(){calls++;throw Error('getter');},y:1};
 const toxic={x:1,y:2,toJSON(){calls++;throw Error('toJSON');}};
 for(const fn of [()=>aim.aim(getter,{x:1,y:0},10),()=>aim.aim(origin,toxic,10),()=>grenadeCameraFrame([getter],{width:390,height:844},13)])assert.throws(fn,error=>error instanceof GrenadeCompatibilityError&&error.code==='INVALID_DATA');
 assert.equal(calls,0);
 for(const fn of [()=>aim.aim({x:1,y:2,z:1},{x:1,y:0},10),()=>aim.nudge(origin,{x:1,y:0},10,-.1),()=>aim.aim(origin,{x:1,y:0},11),()=>screenToGround(NaN,0),()=>grenadeCameraFrame([],{width:390,height:844},13),()=>grenadeCameraFrame([{x:1,y:2}],{width:0,height:844},13),()=>grenadeCameraFrame([{x:1,y:2}],{width:390,height:844},0)])assert.throws(fn,GrenadeCompatibilityError);
});
