import test from 'node:test';import assert from 'node:assert/strict';
import * as W from '../packages/wind-core/index.js';

// A block 4 m wide, 8 m deep and 4 m tall in the middle of a square site, with equal margins
// so one grid serves every bearing.
function blockSite(){
  const grid=W.createWindGrid({origin:[-16,0,-16],cell:1,size:[32,12,32]}),[nx,ny,nz]=grid.size,solid=new Uint8Array(grid.cells);
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=grid.origin[0]+i+.5,y=j+.5,z=grid.origin[2]+k+.5;if(Math.abs(x)<2&&y<4&&Math.abs(z)<4)solid[i+nx*(j+ny*k)]=1;}
  return{grid,solid};
}
const bakeBlock=(speed,options={})=>W.bakeWindBearings({...blockSite(),bearings:4,wind:{speed,z0:.1},turbulence:{gain:1,modes:16,seed:3},warmup:.3,average:.3,...options});
let cached=null;const block=()=>cached||=bakeBlock(4);
const emptySet=bearings=>{const grid=W.createWindGrid({origin:[-6,0,-5],cell:1,size:[12,6,10]});return W.bakeWindBearings({grid,solid:new Uint8Array(grid.cells),bearings,wind:{speed:6,z0:.25},turbulence:null,warmup:0,average:.2});};
const angleOf=(x,z)=>((Math.atan2(-x,z)*180/Math.PI)+360)%360,angleGap=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
const uniform=(u,v,w)=>(x,y,z,out)=>{out[0]=u;out[1]=v;out[2]=w;return out;};

test('bake bearings are evenly spaced, each baked at its own bearing for the flow-throughs asked',()=>{
  assert.deepEqual(W.evenBearings(8),[0,45,90,135,180,225,270,315]);assert.deepEqual(W.evenBearings(3,300),[60,180,300]);assert.deepEqual(W.evenBearings(16).slice(0,3),[0,22.5,45]);
  assert.throws(()=>W.evenBearings(0));assert.throws(()=>W.evenBearings(2.5));assert.throws(()=>W.evenBearings(4,NaN));
  assert.throws(()=>W.bakeWindBearings({...blockSite(),bearings:[0,360],wind:{speed:4,z0:.1}}),/distinct/);assert.throws(()=>W.bakeWindBearings({...blockSite(),wind:{speed:0,z0:.1}}),/positive/);
  assert.throws(()=>W.bakeWindBearings({...blockSite(),wind:{speed:4,z0:.1},average:0}),/flow-throughs/);
  // 0.3 flow-throughs of 32 m at 4 m/s with dt = h / U(12 m) = 0.2406 s is 10 steps each.
  const set=block();assert.deepEqual(set.bearings,[0,90,180,270]);assert.deepEqual(set.fields.map(f=>[f.steps,f.averagedSteps,f.mean]),Array(4).fill([20,10,true]));assert.deepEqual(set.unconverged,[0,0,0,0]);
  // Above twice the block's height the mean wind blows from the bearing it was baked at.
  for(const[n,f]of set.fields.entries()){let x=0,z=0;for(let k=0;k<32;k++)for(let j=8;j<12;j++)for(let i=0;i<32;i++){const o=3*(i+32*(j+12*k));x+=f.velocity[o];z+=f.velocity[o+2];}
    assert.ok(angleGap(angleOf(x,z),set.bearings[n])<3,'bearing '+set.bearings[n]+' blows from '+angleOf(x,z));assert.equal(f.wind.fromDeg,set.bearings[n]);}
  // A starved pressure solve is counted, not hidden.
  assert.ok(W.bakeWindBearings({...blockSite(),bearings:[45],wind:{speed:4,z0:.1},turbulence:null,warmup:0,average:.1,maxIterations:1}).unconverged[0]>0);
});

// The solver has no speed scale of its own: dt = cfl h / U, the gusts' u*, convection and
// frequencies and the pressure tolerance all scale with U. Doubling U is exact in binary, so a
// bake at twice the speed is twice the bake, value for value. A fixed dt or any viscosity would
// break this.
test('a bake at twice the speed is exactly twice the bake, gusts included, and blending scales to it',()=>{
  const slow=block(),fast=bakeBlock(8);
  assert.deepEqual(fast.fields.map(f=>f.steps),slow.fields.map(f=>f.steps));
  for(const[n,f]of fast.fields.entries()){let moving=0;for(let c=0;c<f.velocity.length;c++){assert.equal(f.velocity[c],2*slow.fields[n].velocity[c]);if(f.velocity[c])moving++;}assert.ok(moving>f.velocity.length/2);
    const blended=W.blendWindBearings(slow,{fromDeg:slow.bearings[n],speed:8});assert.ok(blended.velocity.every((v,c)=>v===f.velocity[c]));assert.deepEqual([...blended.solid],[...f.solid]);}
});

// On an empty site every bake carries the inflow profile exactly, so the blends must meet their
// stated free-stream behaviour anywhere between bake bearings: slerp exact in speed and
// direction; linear slowed to |(1 - t) d_i + t d_j| and turned to that vector; keep-speed turned
// like linear but at full speed.
test('between bake bearings slerp keeps the free stream exactly and linear slows it by the chord',()=>{
  const set=emptySet(W.evenBearings(8)),out=[0,0,0],gap=Math.PI/4;
  for(const fromDeg of[22.5,33.75,-22.5,382.5,200]){
    const theta=((fromDeg%360)+360)%360,start=Math.floor(theta/45)*45,t=(theta-start)/45,chord=Math.hypot(1-t+t*Math.cos(gap),t*Math.sin(gap)),bent=start+Math.atan2(t*Math.sin(gap),1-t+t*Math.cos(gap))*180/Math.PI;
    for(const blend of W.BEARING_BLENDS){
      const f=W.blendWindBearings(set,{fromDeg,speed:9,blend});
      for(const y of[.5,2.5,5.5]){
        W.sampleWindField(f,0,y,0,out);const U=W.profileSpeed(y,9,.25),speed=Math.hypot(out[0],out[2]),angle=angleOf(out[0],out[2]);
        assert.ok(Math.abs(speed/U-(blend==='linear'?chord:1))<1e-5,blend+' at '+fromDeg+': speed '+speed/U+' of U');
        assert.ok(angleGap(angle,blend==='slerp'?theta:bent)<1e-4,blend+' at '+fromDeg+' blows from '+angle);assert.equal(out[1],0);
      }
    }
  }
  // At the midpoint the chord is cos(gap / 2); the wrap from 315 to 0 blends the last and first bakes.
  const mid=W.blendWindBearings(set,{fromDeg:22.5,speed:6,blend:'linear'});assert.ok(Math.abs(Math.hypot(mid.velocity[0],mid.velocity[2])/W.profileSpeed(.5,6,.25)-Math.cos(Math.PI/8))<1e-5);
  const wrap=W.blendWindBearings(set,{fromDeg:-22.5,speed:6});assert.deepEqual(wrap.blend.bearings,[315,0]);assert.ok(Math.abs(wrap.blend.weights[0]-wrap.blend.weights[1])<1e-15);
  assert.deepEqual(W.blendWindBearings(set,{fromDeg:382.5,speed:6}).blend.bearings,[0,45]);assert.deepEqual(W.blendWindBearings(set,{fromDeg:0,speed:6}).blend.weights,[1,0]);
  // A set that starts east of north wraps the other way: north lies between 270 and 90.
  const east=W.blendWindBearings(emptySet([90,180,270]),{fromDeg:0,speed:6,blend:'linear'});assert.deepEqual(east.blend.bearings,[270,90]);assert.deepEqual(east.blend.weights,[.5,.5]);
  // A calm is a calm, and a lone bearing serves every bearing.
  assert.ok(W.blendWindBearings(set,{fromDeg:10,speed:0}).velocity.every(v=>v===0));
  const lone=emptySet([90]);assert.ok(W.blendWindBearings(lone,{fromDeg:200,speed:3}).velocity.every((v,c)=>v===lone.fields[0].velocity[c]/2));
  assert.throws(()=>W.blendWindBearings(emptySet([0,180]),{fromDeg:90,speed:6,blend:'slerp'}),/180/);assert.throws(()=>W.blendWindBearings(set,{fromDeg:90,speed:6,blend:'nearest'}),/Blend/);
  assert.throws(()=>W.blendWindBearings(set,{fromDeg:NaN,speed:6}),/bearing/);assert.throws(()=>W.blendWindBearings(set,{fromDeg:90,speed:-1}),/speed/);
});

// Where the neighbours agree keep-speed leaves the linear blend; where they part it restores
// the speed lost, by at most 1 / cos(gap / 2), and it never touches the vertical.
test('keep-speed restores no more than the free-stream loss, and a cell solid in either neighbour is still',()=>{
  const set=block(),limit=1/Math.cos(Math.PI/4),linear=W.blendWindBearings(set,{fromDeg:45,speed:4,blend:'linear'}),keep=W.blendWindBearings(set,{fromDeg:45,speed:4,blend:'keep-speed'});
  let restored=0,capped=0;
  for(let c=0,o=0;c<keep.solid.length;c++,o+=3){
    if(keep.solid[c])continue;const g=Math.hypot(keep.velocity[o],keep.velocity[o+2])/Math.hypot(linear.velocity[o],linear.velocity[o+2]);assert.equal(keep.velocity[o+1],linear.velocity[o+1]);if(!Number.isFinite(g))continue;
    assert.ok(g>=1-1e-6&&g<=limit*(1+1e-6),'gain '+g);if(g>1+1e-3)restored++;if(g>limit*(1-1e-6))capped++;
  }
  assert.ok(restored>keep.solid.length/4&&capped>0,'restored '+restored+', capped '+capped);
  // Solid flags may differ between bearings (air cut off from every outlet at one of them).
  const a=set.fields[0],b={...set.fields[1],solid:set.fields[1].solid.slice(),velocity:set.fields[1].velocity.slice()},cell=5+32*(6+12*5);b.solid[cell]=1;b.velocity.fill(0,cell*3,cell*3+3);
  const mixed={...set,fields:[a,b,...set.fields.slice(2)]};
  for(const blend of W.BEARING_BLENDS){const f=W.blendWindBearings(mixed,{fromDeg:45,speed:4,blend});assert.equal(f.solid[cell],1);assert.deepEqual([...f.velocity.subarray(cell*3,cell*3+3)],[0,0,0]);
    assert.equal(W.blendWindBearings(mixed,{fromDeg:0,speed:4,blend}).solid[cell],0,'at its own bearing a field keeps its own solids');}
});

test('a bearing set round-trips through JSON and refuses sets that do not fit together',()=>{
  const set=block(),copy=W.decodeWindBearings(JSON.stringify(W.encodeWindBearings(set)));
  assert.deepEqual(copy.bearings,set.bearings);for(const[n,f]of copy.fields.entries()){assert.equal(Buffer.compare(Buffer.from(f.velocity.buffer),Buffer.from(set.fields[n].velocity.buffer)),0);assert.deepEqual([...f.solid],[...set.fields[n].solid]);}
  const shifted=W.bakeWindBearings({grid:W.createWindGrid({origin:[-15,0,-16],cell:1,size:[32,12,32]}),solid:new Uint8Array(32*12*32),bearings:[0],wind:{speed:4,z0:.1},turbulence:null,warmup:0,average:.1}).fields[0];
  const swap=(n,f)=>({...set,fields:set.fields.map((g,m)=>m===n?f:g)}),first=set.fields[0];
  for(const[bad,reason]of[[{...set,kind:'nautilus-wind-field'},/Not a version/],[{...set,version:2},/Not a version/],[{...set,fields:set.fields.slice(1)},/one baked field per bearing/],
    [{...set,bearings:[...set.bearings].reverse(),fields:[...set.fields].reverse()},/ascending/],[swap(0,shifted),/share one grid/],[swap(0,{...first,wind:{...first.wind,fromDeg:10}}),/own bearing/],
    [swap(1,{...set.fields[1],wind:{...set.fields[1].wind,speed:5}}),/own bearing/],[swap(2,{...set.fields[2],velocity:set.fields[2].velocity.subarray(3)}),/not a baked wind field/]]){
    assert.throws(()=>W.blendWindBearings(bad,{fromDeg:30,speed:4}),reason);assert.throws(()=>W.createWindBearingSampler(bad),reason);}
  assert.throws(()=>W.decodeWindBearings(JSON.stringify({...W.encodeWindBearings(set),version:2})),/Not a version/);assert.throws(()=>W.decodeWindBearings({fields:[]}),/Not a version/);
  assert.throws(()=>W.blendWindBearings(set,{fromDeg:30,speed:4},{velocity:new Float32Array(3),solid:new Uint8Array(1)}),/same bearing set/);
});

test('the bearing sampler reads the current blend and blends again only when the wind changes',()=>{
  const set=block(),sampler=W.createWindBearingSampler(set,{fromDeg:60,speed:6,blend:'linear'}),random=W.seededRandom(8),out=[0,0,0];
  assert.equal(sampler.fromDeg,60);assert.equal(sampler.speed,6);
  for(const wind of[{fromDeg:60,speed:6},{fromDeg:300,speed:2},{fromDeg:300,speed:7.5}]){
    sampler.setWind(wind);const field=W.blendWindBearings(set,{...wind,blend:'linear'});
    for(let n=0;n<200;n++){const x=-16+32*random(),y=10*random(),z=-16+32*random();assert.deepEqual(sampler.sample(x,y,z,out),W.sampleWindField(field,x,y,z));}}
  sampler.field.velocity.fill(0);sampler.setWind({fromDeg:300,speed:7.5});assert.ok(sampler.field.velocity.every(v=>v===0),'an unchanged wind must not blend again');
  sampler.setWind({speed:7.4});assert.ok(sampler.field.velocity.some(v=>v!==0));assert.equal(sampler.fromDeg,300);
  assert.equal(W.createWindBearingSampler(set).fromDeg,set.bearings[0]);assert.equal(W.createWindBearingSampler(set).field.blend.mode,'slerp');
});

test('smoke rides the wind, rises as it cools by the midpoint rule and leaves on time',()=>{
  const smoke=W.createSmoke({rate:10,rise:1.2,riseTime:4,spread:0,jitter:0,lifetime:3,seed:1});smoke.addEmitter({x:1,y:2,z:3});
  for(let n=0;n<8;n++)smoke.step(uniform(2,0,-1),.25);
  assert.equal(smoke.count,20,'2.5 puffs a step, the remainder carried');
  // The first puffs are 2 s old. Each step adds dt times the rise at the step's middle age.
  let oldest=-1,midpoint=0;for(let n=0;n<smoke.count;n++)if(smoke.ages[n]===2)oldest=n;for(let k=0;k<8;k++)midpoint+=.25*1.2*Math.exp(-(.25*k+.125)/4);
  const o=oldest*3;assert.ok(oldest>=0&&Math.abs(smoke.positions[o]-5)<1e-5&&Math.abs(smoke.positions[o+2]-1)<1e-5);
  assert.ok(Math.abs(smoke.positions[o+1]-2-midpoint)<1e-5,'rise '+(smoke.positions[o+1]-2)+' against '+midpoint);assert.ok(Math.abs(midpoint-1.2*4*(1-Math.exp(-.5)))<5e-4);
  for(let n=0;n<40;n++)smoke.step(uniform(2,0,-1),.25);
  assert.equal(smoke.count,30);assert.ok([...smoke.ages.subarray(0,smoke.count)].every(a=>a>0&&a<=3));
  // The climb at 1 s and at 4 s of age: 1.2 e^(-age / 4).
  const one=W.createSmoke({rate:1,rise:1.2,riseTime:4,spread:0,jitter:0}),still=uniform(0,0,0),climb=()=>{const y=one.positions[1];one.step(still,.01);return(one.positions[1]-y)/.01;};
  one.addEmitter({x:0,y:0,z:0});one.step(still,1);assert.equal(one.count,1);assert.ok(Math.abs(climb()-1.2*Math.exp(-1.005/4))<1e-3);one.step(still,2.99);assert.ok(Math.abs(climb()-1.2*Math.exp(-4.005/4))<1e-3);
  // Puffs that swap places on expiry keep their own warmth: a cold source's puffs never climb.
  const pair=W.createSmoke({rate:7,lifetime:1.3,spread:0,jitter:0});pair.addEmitter({x:0,y:1,z:0,rise:0});pair.addEmitter({x:0,y:5,z:0,rise:2,rate:3});
  for(let n=0;n<60;n++)pair.step(uniform(1,0,0),.1);let cold=0;
  for(let n=0;n<pair.count;n++){const y=pair.positions[n*3+1];if(y<3){assert.equal(y,1);cold++;}else assert.ok(y>5);}assert.ok(cold>5);
});

test('smoke is reproducible from its seed, spreads at its diffusivity, stays out of solids and inside its bounds',()=>{
  const run=(seed,{blocked=null,max=10}={})=>{const s=W.createSmoke({seed,spread:.3,jitter:.5,bounds:{min:[-10,0,-10],max:[max,20,10]},blocked});s.addEmitter({x:-6,y:1,z:0,rate:30});s.addEmitter({x:-4,y:4,z:-6,rise:0});for(let n=0;n<60;n++)s.step(uniform(1.5,0,.5),.1);return s;};
  const live=s=>s.positions.subarray(0,s.count*3),a=run(4),b=run(4),c=run(5);
  assert.equal(a.count,b.count);assert.deepEqual(live(a),live(b));assert.notDeepEqual(live(a),live(c).subarray(0,a.count*3));
  a.reset();for(let n=0;n<60;n++)a.step(uniform(1.5,0,.5),.1);assert.deepEqual(live(a),live(b));assert.equal(a.time,b.time);
  // Bounds: a box that ends at x = 0 keeps no puff past it; the open run has many there.
  const boxed=run(4,{max:0});let past=0;for(let n=0;n<b.count;n++)if(b.positions[n*3]>0)past++;assert.ok(past>20);for(let n=0;n<boxed.count;n++)assert.ok(boxed.positions[n*3]<=0);
  // A wall across the wind at 0 < x < 1: without the solid test puffs pass through it.
  const wall=(x,y,z)=>x>0&&x<1&&y<12,count=(s,where)=>{let n=0;for(let p=0;p<s.count;p++)if(where(s.positions[p*3],s.positions[p*3+1],s.positions[p*3+2]))n++;return n;},beyond=(x,y)=>x>1&&y<11;
  const walled=run(4,{blocked:wall});assert.ok(count(b,beyond)>10&&count(b,wall)>0,'the falsifier: puffs cross an unchecked wall');assert.equal(count(walled,wall),0);assert.equal(count(walled,beyond),0);
  // A source inside a solid (a coarse roof voxel) still lets its puffs out: with a net climb of
  // 0.6-0.8 m/s, every puff is above y = 2 m within 0.7 s.
  const roof=(x,y,z)=>y<2,buried=W.createSmoke({rate:20,rise:1,spread:0,jitter:.2,blocked:roof});buried.addEmitter({x:0,y:1.6,z:0});for(let n=0;n<40;n++)buried.step(uniform(.5,-.2,0),.1);
  let out=0,stuck=0;for(let p=0;p<buried.count;p++)if(buried.ages[p]>.75){if(buried.positions[p*3+1]>=2)out++;else stuck++;}assert.ok(out>40&&stuck===0,'buried source: '+out+' out, '+stuck+' stuck');
  // A random walk of K m^2/s spreads a puff by 2 K t on each axis.
  const walk=W.createSmoke({capacity:4000,rate:2000,rise:0,jitter:0,spread:.3,seed:9});walk.addEmitter({x:0,y:50,z:0});for(let n=0;n<10;n++)walk.step(uniform(1,0,0),.1);
  let ratio=0;for(let n=0;n<walk.count;n++)ratio+=walk.positions[n*3+2]**2/(2*.3*walk.ages[n]);ratio/=walk.count;assert.ok(Math.abs(ratio-1)<.06,'lateral variance over 2Kt: '+ratio);
  // Jitter scatters new puffs within its half-width around the source, at the source's height.
  const scatter=W.createSmoke({rate:100,jitter:.5,spread:0,rise:0});scatter.addEmitter({x:2,y:1,z:-3});scatter.step(uniform(0,0,0),.1);
  const xs=[...scatter.positions.subarray(0,30)].filter((_,i)=>i%3===0);assert.equal(scatter.count,10);assert.ok(xs.every(x=>Math.abs(x-2)<=.5)&&Math.max(...xs)-Math.min(...xs)>.2);
});

test('smoke counts what it drops, refuses bad settings and reads solids from a wind field',()=>{
  const s=W.createSmoke({capacity:5,rate:10,jitter:0,spread:0});s.addEmitter({x:0,y:1,z:0});s.step(uniform(1,0,0),1);assert.equal(s.count,5);assert.equal(s.dropped,5);
  assert.equal(s.addEmitter({x:3,y:1,z:0,rate:2,rise:0,riseTime:1}),1);assert.deepEqual(s.emitters[1],{x:3,y:1,z:0,rate:2,rise:0,riseTime:1});s.moveEmitter(1,{x:4,y:1,z:0});assert.equal(s.emitters[1].x,4);s.removeEmitter(0);assert.equal(s.emitters.length,1);
  s.clear();assert.equal(s.count,0);s.step(uniform(0,0,0),.5);assert.equal(s.count,1);
  for(const bad of[{capacity:0},{lifetime:0},{spread:-1},{rate:-1},{riseTime:0},{bounds:{min:[0,0],max:[1,1,1]}},{blocked:true}])assert.throws(()=>W.createSmoke(bad),undefined,JSON.stringify(bad));
  assert.throws(()=>s.addEmitter({x:0,y:NaN,z:0}));assert.throws(()=>s.step(null,.1));assert.throws(()=>s.step(uniform(0,0,0),-1));assert.throws(()=>s.removeEmitter(7));assert.throws(()=>s.moveEmitter(3,{x:0,y:0,z:0}));
  // Cell 4 of a 3 x 2 x 3 grid of 2 m cells is i = 1, j = 1, k = 0.
  const field={origin:[0,0,0],cell:2,size:[3,2,3],solid:Uint8Array.from({length:18},(_,c)=>c===4?1:0)};assert.deepEqual(W.windFieldBounds(field),{min:[0,0,0],max:[6,4,6]});
  const solid=W.windFieldSolid(field);assert.equal(solid(3,3,1),true);assert.equal(solid(3,1,1),false);assert.equal(solid(1,3,1),false);assert.equal(solid(-1,3,1),false);assert.equal(solid(3,3,7),false);
});
