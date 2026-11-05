import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../packages/render-effects/three.js';
import {DESIGNS} from '../packages/building-catalog/index.js';
import {createBuildingModel} from '../packages/building-catalog/three.js';
import * as W from '../packages/wind-core/index.js';

// Twelve triangles of an axis-aligned box; omit lists faces to leave open ('top', ...).
function boxTriangles([x0,y0,z0],[x1,y1,z1],omit=[]){
  const c=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],faces={bottom:[0,1,5,4],top:[3,7,6,2],front:[0,3,2,1],back:[4,5,6,7],left:[0,4,7,3],right:[1,2,6,5]},out=[];
  for(const[name,[a,b,q,d]]of Object.entries(faces))if(!omit.includes(name))out.push(...c[a],...c[b],...c[q],...c[a],...c[q],...c[d]);
  return Float32Array.from(out);
}
const cellOf=(grid,x,y,z)=>{const[nx,ny]=grid.size,h=grid.cell;return Math.floor((x-grid.origin[0])/h)+nx*(Math.floor((y-grid.origin[1])/h)+ny*Math.floor((z-grid.origin[2])/h));};

test('the inflow follows the neutral log law and meteorological bearings',()=>{
  assert.ok(Math.abs(W.profileSpeed(10,6,.25)-6)<1e-12);assert.equal(W.profileSpeed(0,6,.25),0);
  for(let y=.5;y<40;y+=.5)assert.ok(W.profileSpeed(y+.5,6,.25)>W.profileSpeed(y,6,.25));
  assert.equal(W.frictionVelocity(6,.25),.41*6/Math.log(10.25/.25));
  assert.deepEqual(W.windDirection(0),[0,1]);assert.deepEqual(W.windDirection(90),[-1,0]);assert.deepEqual(W.windDirection(180),[0,-1]);assert.deepEqual(W.windDirection(270),[1,0]);
  assert.ok(Object.is(W.windDirection(180)[0],0));assert.equal(W.bearingName(225),'SW');assert.equal(W.bearingName(359),'N');
  assert.equal(W.TERRAIN.open.z0,.03);assert.equal(W.terrainRoughness('closed'),1);
  assert.throws(()=>W.profileSpeed(5,6,0));assert.throws(()=>W.terrainRoughness('desert'));assert.throws(()=>W.windDirection(NaN));
});

test('the voxelizer marks exactly the cells a surface touches and seals what it encloses',()=>{
  const grid=W.createWindGrid({origin:[0,0,0],cell:1,size:[8,6,7]});
  const closed=W.voxelizeTriangles(grid,boxTriangles([2.25,0,1.25],[5.75,3.5,4.75]));
  assert.equal(closed.marked,56);assert.equal(W.fillEnclosed(grid,closed.solid),8);
  for(let k=0;k<7;k++)for(let j=0;j<6;j++)for(let i=0;i<8;i++){const inside=i>=2&&i<=5&&j<=3&&k>=1&&k<=4;assert.equal(Boolean(closed.solid[i+8*(j+6*k)]),inside,'cell '+[i,j,k]);}
  const open=W.voxelizeTriangles(grid,boxTriangles([2.25,0,1.25],[5.75,3.5,4.75],['top']));assert.equal(W.fillEnclosed(grid,open.solid),0);
  // A courtyard walled right to the grid's sides is open only to the sky, and stays air.
  const yard=W.createWindGrid({origin:[0,0,0],cell:1,size:[8,4,8]}),walls=new Uint8Array(yard.cells);
  for(let k=0;k<8;k++)for(let j=0;j<4;j++)for(let i=0;i<8;i++)if(i===0||i===7||k===0||k===7)walls[i+8*(j+4*k)]=1;
  assert.equal(W.fillEnclosed(yard,walls),0);
  // A thin wall at 30 degrees, closed into a prism, still separates inside from outside.
  const prism=new T.Mesh(new T.BoxGeometry(5,3,4));prism.rotation.y=Math.PI/6;prism.position.set(12,1.5,12);
  const g=W.createWindGrid({origin:[0,0,0],cell:.5,size:[48,12,48]}),thin=W.voxelizeTriangles(g,W.objectTriangles(prism));assert.ok(W.fillEnclosed(g,thin.solid)>100);
  assert.equal(thin.solid[cellOf(g,12,1.5,12)],2);assert.equal(thin.solid[cellOf(g,12,1.5,16)],0);
  assert.throws(()=>W.voxelizeTriangles(grid,new Float32Array(8)));assert.throws(()=>W.createWindGrid({cell:1,size:[1,4,4]}));
});

test('every catalogue building voxelizes airtight at 1 m and 0.5 m, and the probe can fail',()=>{
  const probe=(model,triangles,cell)=>{
    const grid=W.windDomain(W.triangleBounds(triangles),{cell,upstream:1,lateral:1,downstream:1,height:1.5,minimum:3}),{solid}=W.voxelizeTriangles(grid,triangles);W.fillEnclosed(grid,solid);
    let open=0;for(const f of model.building.floors)for(const c of f.cells)if(!solid[cellOf(grid,c.x+.25,f.height+1,c.z+.25)])open++;return open;
  };
  let leaksWithoutGlass=0;
  for(const d of DESIGNS){
    const model=createBuildingModel(T,d.id),triangles=W.objectTriangles(model.root);
    for(const cell of[1,.5])assert.equal(probe(model,triangles,cell),0,d.id+' at '+cell+' m lets outside air into a room');
    if(leaksWithoutGlass<3)leaksWithoutGlass+=probe(model,W.objectTriangles(model.root,{include:kind=>kind!=='glazing'}),.5)>0;
    model.dispose();
  }
  assert.ok(leaksWithoutGlass>=3,'with the window glass removed, rooms must open to the wind');
});

test('an empty site carries the inflow profile unchanged at any bearing',()=>{
  for(const step of['projection','reflection'])for(const fromDeg of[0,90,230,317.5]){
    const grid=W.createWindGrid({origin:[-8,0,-7],cell:1,size:[16,8,14]}),s=W.createWindSolver({grid,solid:new Uint8Array(grid.cells),wind:{speed:6,fromDeg,z0:.25},step});
    s.run(25);const{u,v,w}=s.faces(),[nx,ny,nz]=grid.size;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){const a=s.inflowAt(j+.5);for(let i=0;i<=nx;i++)assert.equal(u[i+(nx+1)*(j+ny*k)],Math.fround(a[0]));for(let i=0;i<nx;i++)assert.equal(w[i+nx*(j+ny*k)],Math.fround(a[2]));}
    assert.ok(v.every(x=>x===0));assert.equal(s.last.iterations,0);assert.equal(s.flux().imbalance,0);
  }
});

function blockSolver({H=4,fromDeg=270,turbulence=null,size=[10,4,7],origin=[-3,0,-3.5],step='projection'}={}){
  const grid=W.createWindGrid({origin:origin.map(f=>f*H),cell:1,size:size.map(f=>f*H)}),[nx,ny,nz]=grid.size,solid=new Uint8Array(grid.cells);
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=grid.origin[0]+i+.5,y=j+.5,z=grid.origin[2]+k+.5;if(x>0&&x<H&&y<H&&Math.abs(z)<H/2)solid[i+nx*(j+ny*k)]=1;}
  return W.createWindSolver({grid,solid,wind:{speed:5,fromDeg,z0:.1},turbulence,step});
}
test('projection leaves no divergence and balances the flux around a block',()=>{
  for(const step of['projection','reflection']){
    const s=blockSolver({fromDeg:250,step});
    for(let n=0;n<30;n++){const r=s.step();assert.ok(r.converged);assert.ok(r.divergence<=1e-4);}
    const{u,v,w}=s.faces(),[nx,ny,nz]=s.grid.size;let worst=0;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);if(s.solid[c])continue;worst=Math.max(worst,Math.abs(u[i+1+(nx+1)*(j+ny*k)]-u[i+(nx+1)*(j+ny*k)]+v[i+nx*(j+1+(ny+1)*k)]-v[i+nx*(j+(ny+1)*k)]+w[c+nx*ny]-w[c]));}
    const scale=Math.max(5,W.profileSpeed(ny,5,.1));assert.ok(worst<=1e-4*scale*1.0001,step+' max face divergence '+worst);assert.ok(s.flux().imbalance<1e-3);
    assert.ok(s.blockage()>0&&s.blockage()<.1);
  }
});

// Signs set from the physics: the windward face stagnates with downwash below, the lee
// recirculates, and the air over the roof speeds up. The first stagnation check (u < 0.5 U
// at 0.25 H upstream) failed, 0.69 at 4 cells per height and 0.56 at 6: the slowed zone is
// shorter than assumed, so the check now pins the approach to the face itself. At 4 cells
// per height the lee did not reverse at 1.5 H (u = +0.20); 6 cells resolve it.
test('a block in the wind stagnates, recirculates behind and speeds up over its roof',()=>{
  const H=6,s=blockSolver({H,size:[8,3,5],origin:[-2.5,0,-2.5]});s.run(250);s.startAveraging();s.run(250);
  const m=(x,y,z)=>s.sample(x,y,z,[0,0,0],{mean:true}),profile=y=>s.inflowAt(y)[0],approach=[-.5,-.25,-.05].map(f=>m(f*H,.5*H,0)[0]);
  assert.ok(approach[0]>approach[1]&&approach[1]>approach[2]&&approach[2]<.25*profile(.5*H),'stagnation on the windward face: '+approach);
  assert.ok(m(-.15*H,.3*H,0)[1]<0,'downwash on the windward face');
  assert.ok(m(1.5*H,.25*H,0)[0]<0,'reverse flow in the lee');
  assert.ok(m(.5*H,1.5*H,0)[0]>profile(1.5*H),'speed-up over the roof');
});

// Ghia, Ghia and Shin (1982), Re = 100, centrelines of a unit cavity with a unit lid.
const GHIA_U=[[.9766,.84123],[.9688,.78871],[.9609,.73722],[.9531,.68717],[.8516,.23151],[.7344,.00332],[.6172,-.13641],[.5,-.20581],[.4531,-.2109],[.2813,-.15662],[.1719,-.1015],[.1016,-.06434],[.0703,-.04775],[.0625,-.04192],[.0547,-.03717]];
const GHIA_V=[[.9688,-.05906],[.9609,-.07391],[.9531,-.08864],[.9453,-.10313],[.9063,-.16914],[.8594,-.22445],[.8047,-.24533],[.5,.05454],[.2344,.17527],[.2266,.17507],[.1563,.16077],[.0938,.12317],[.0781,.1089],[.0703,.10091],[.0625,.09233]];
test('the lid-driven cavity at Re 100 matches Ghia, Ghia and Shin on a 32 x 32 grid',()=>{
  const n=32,h=1/n,grid=W.createWindGrid({origin:[0,0,0],cell:h,size:[n,n,1]});
  const s=W.createWindSolver({grid,solid:new Uint8Array(grid.cells),speedScale:1,viscosity:.01,dt:.5*h,tolerance:1e-7,
    boundaries:{xMin:{type:'wall'},xMax:{type:'wall'},yMin:{type:'wall'},yMax:{type:'wall',velocity:[1,0,0]},zMin:{type:'slip'},zMax:{type:'slip'}}});
  s.run(1500);const out=[0,0,0];
  for(const[y,ref]of GHIA_U)assert.ok(Math.abs(s.sample(.5,y,h/2,out)[0]-ref)<.02,'u at y='+y);
  for(const[x,ref]of GHIA_V)assert.ok(Math.abs(s.sample(x,.5,h/2,out)[1]-ref)<.02,'v at x='+x);
});

// The Taylor-Green vortex is exact and steady in a slip box [0, pi]^2 without viscosity, so
// any energy it loses is the scheme's. Energy kept after one turnover at 32 cells.
function taylorGreen(advection,viscosity,options={}){
  const n=32,h=Math.PI/n,grid=W.createWindGrid({origin:[0,0,0],cell:h,size:[n,n,1]}),slip={type:'slip'};
  const s=W.createWindSolver({grid,solid:new Uint8Array(grid.cells),boundaries:{xMin:slip,xMax:slip,yMin:slip,yMax:slip,zMin:slip,zMax:slip},speedScale:1,viscosity,advection,tolerance:1e-8,...options});
  s.setFlow((x,y)=>[Math.sin(x)*Math.cos(y),-Math.cos(x)*Math.sin(y),0]);
  const energy=()=>{const{u,v}=s.faces();let e=0;for(const a of u)e+=a*a;for(const a of v)e+=a*a;return e;},e0=energy();s.run(Math.round(2*Math.PI/s.dt));return{ratio:energy()/e0,t:s.time};
}
// Measured at CFL 1: MacCormack keeps 0.769, semi-Lagrangian 0.644. The loss halves with dt and
// does not change with the grid at fixed dt: it is the first-order split between advection and
// projection. The floors below are pins on those measurements. With nu = 0.01 the run loses the
// exact viscous factor on top (measured 0.798 against exp(-4 nu t) = 0.778); the absolute check,
// viscous run against exp(-4 nu t) within 5 %, failed at 21 % for the same splitting reason.
test('a Taylor-Green vortex: MacCormack keeps more energy than semi-Lagrangian, and viscosity takes its exact share',()=>{
  const mc=taylorGreen('maccormack',0),sl=taylorGreen('semi-lagrangian',0),viscous=taylorGreen('maccormack',.01);
  assert.ok(mc.ratio>.74,'MacCormack kept '+mc.ratio);assert.ok(sl.ratio<mc.ratio-.08,'semi-Lagrangian kept '+sl.ratio);
  assert.ok(Math.abs(viscous.ratio/mc.ratio/Math.exp(-4*.01*viscous.t)-1)<.05,'viscous share '+viscous.ratio/mc.ratio);
  assert.throws(()=>taylorGreen('upwind',0));
});

// Advection-reflection on the same vortex, pre-registered in docs/wind-field.md before it ran.
// Measured at CFL 1: MacCormack keeps 0.9974, and with nu = 0.01 the run sits 0.26 % below the
// exact exp(-4 nu t), so the absolute check that failed above now holds. The last projection
// removes 8.1e-5 per turnover (derived: 8.4e-5) against the plain split's 0.232; most of what
// is left is the limiter's reverts to semi-Lagrangian. Without the reflection, two half steps
// keep 0.868, as the plain split does at CFL 0.5.
test('advection-reflection keeps the energy the split loses, and viscosity then takes the exact decay',()=>{
  const mc=taylorGreen('maccormack',0,{step:'reflection'}),viscous=taylorGreen('maccormack',.01,{step:'reflection'});
  assert.ok(mc.ratio>.99,'reflection kept '+mc.ratio);
  assert.ok(Math.abs(viscous.ratio/Math.exp(-4*.01*viscous.t)-1)<.02,'viscous run against exp(-4 nu t): '+viscous.ratio);
  assert.throws(()=>taylorGreen('maccormack',0,{step:'leapfrog'}));
});

test('gusts enter through the inflow faces and the samples beyond them',()=>{
  const s=blockSolver({turbulence:{gain:1,modes:24,seed:2}}),[nx,ny]=s.grid.size,face=(nx+1)*(8+ny*14);let lo=Infinity,hi=-Infinity,sum=0,sum2=0,n=0;
  for(let step=0;step<40;step++){s.step();const u=s.faces().u[face];lo=Math.min(lo,u);hi=Math.max(hi,u);if(step>=10){const w=s.sample(s.grid.origin[0]+2,8,0)[2];sum+=w;sum2+=w*w;n++;}}
  // Measured: the inflow face ranges over 2.9 m/s; lateral gusts two cells in have 0.67 m/s
  // RMS against sigma_v 0.84. Without the beyond-the-side samples they fall to 0.27.
  assert.ok(hi-lo>.5,'inflow face range '+(hi-lo));assert.ok(Math.sqrt(sum2/n-(sum/n)**2)>.5*s.turbulence.sigma[1],'lateral gust RMS');
});

test('the preconditioned pressure solve stays quick from a cold start',()=>{
  // A speed pin: MIC(0) needs 24 iterations here, plain incomplete Cholesky 40.
  assert.ok(blockSolver().last.iterations<=30);
});

test('conservative marking is exact for a tilted plane and a sliver triangle',()=>{
  const grid=W.createWindGrid({origin:[0,0,0],cell:1,size:[10,10,10]}),c=14.3,P=(x,y)=>[x,y,(c-x-2*y)/3];let exact=0;
  const{marked}=W.voxelizeTriangles(grid,Float32Array.from([...P(-100,-100),...P(300,-100),...P(-100,300)]));
  for(let k=0;k<10;k++)for(let j=0;j<10;j++)for(let i=0;i<10;i++){let lo=Infinity,hi=-Infinity;for(const a of[0,1])for(const b of[0,1])for(const d of[0,1]){const s=i+a+2*(j+b)+3*(k+d)-c;lo=Math.min(lo,s);hi=Math.max(hi,s);}if(lo<=0&&hi>=0)exact++;}
  assert.equal(marked,exact);
  // Against 200,000 points on a sliver: every touched cell marked and nothing extra.
  const g=W.createWindGrid({origin:[0,0,0],cell:1,size:[12,12,12]}),A=[1.3,1.7,2.2],B=[10.6,9.1,3.4],C=[2.1,2.9,9.8],sliver=W.voxelizeTriangles(g,Float32Array.of(...A,...B,...C)),hit=new Set(),r=W.seededRandom(1);
  for(let n=0;n<200000;n++){let s=r(),t=r();if(s+t>1){s=1-s;t=1-t;}const p=[0,1,2].map(q=>A[q]+s*(B[q]-A[q])+t*(C[q]-A[q]));hit.add(Math.floor(p[0])+12*(Math.floor(p[1])+12*Math.floor(p[2])));}
  for(const cell of hit)assert.ok(sliver.solid[cell]);assert.ok(sliver.marked<=hit.size+2,'marked '+sliver.marked+' of '+hit.size+' touched');
});

test('gusts are frozen patterns carried with the wind',()=>{
  const g=W.createInflowTurbulence({frictionVelocity:.5,direction:[1,0],convection:5,lengthScale:20,modes:48,kMin:.02,kMax:2,seed:5}),r=W.seededRandom(3),a=[0,0,0],b=[0,0,0];let carried=0,still=0;
  for(let n=0;n<2000;n++){const x=r()*300,y=20+r()*40,z=r()*300,t=r()*100;g.sample(x,y,z,t,a);g.sample(x+5,y,z,t+1,b);carried+=(a[0]-b[0])**2;g.sample(x,y,z,t+1,b);still+=(a[0]-b[0])**2;}
  assert.ok(carried/still<.5,'a point moving with the wind sees less change, ratio '+carried/still);
});

test('tracers keep their radius through a full turn of solid-body rotation',()=>{
  const rot=(x,y,z,o)=>{o[0]=-z;o[1]=0;o[2]=x;return o;},p=Float32Array.of(1,1,0),steps=126;
  for(let n=0;n<steps;n++)W.advectTracers(rot,p,2*Math.PI/steps);
  assert.ok(Math.abs(Math.hypot(p[0],p[2])-1)<1e-3);assert.ok(Math.abs(p[0]-1)<.01&&Math.abs(p[2])<.01);
});

// A reset clears every warm start, so a run after it repeats a fresh run bit for bit.
test('identical runs are bit-identical, turbulence included, and a reset run repeats a fresh one',()=>{
  for(const step of['projection','reflection']){
    const make=()=>blockSolver({turbulence:{gain:1,modes:16,seed:3},step}),run=s=>{s.run(12);return s.faces();},again=make();again.run(7);again.reset();
    const a=run(make()),b=run(make()),c=run(again);
    for(const key of['u','v','w'])for(const other of[b,c])assert.equal(Buffer.compare(Buffer.from(a[key].buffer),Buffer.from(other[key].buffer)),0,step+' '+key);
  }
});

test('synthetic gusts carry the surface-layer standard deviations',()=>{
  const u=.5,g=W.createInflowTurbulence({frictionVelocity:u,direction:[1,0],convection:5,lengthScale:20,modes:64,kMin:.02,kMax:2,seed:5}),random=W.seededRandom(9),sum=[0,0,0],out=[0,0,0];let n=0;
  for(;n<20000;n++){g.sample(random()*400,20+random()*50,random()*400,random()*400,out);for(let a=0;a<3;a++)sum[a]+=out[a]*out[a];}
  const sigma=sum.map(s=>Math.sqrt(s/n));
  assert.deepEqual(g.sigma,W.SURFACE_LAYER_SIGMA.map(s=>s*u));
  for(const[a,expected]of[[0,2.5*u],[2,1.9*u],[1,1.25*u]])assert.ok(Math.abs(sigma[a]/expected-1)<.15,'component '+a+' sigma '+sigma[a]);
  assert.ok(g.sample(3,0,4,1).every(v=>v===0));
});

test('a block in gusty wind still projects cleanly and the gusts reach the site',()=>{
  const s=blockSolver({turbulence:{gain:1,modes:24,seed:2}});let low=Infinity,high=-Infinity;
  for(let n=0;n<60;n++){const r=s.step();assert.ok(r.converged);if(n>30){const u=s.sample(-2*4,4,0)[0];low=Math.min(low,u);high=Math.max(high,u);}}
  assert.ok(high-low>.3,'the upwind wind should fluctuate, range '+(high-low));
});

test('the mean field is the arithmetic mean of the steps it averaged',()=>{
  const s=blockSolver({fromDeg:235,turbulence:{gain:1,modes:12,seed:4}});s.run(8);s.startAveraging();const sum=new Float64Array(s.grid.cells*3);
  for(let n=0;n<6;n++){s.step();const v=s.cellVelocities();for(let i=0;i<v.length;i++)sum[i]+=v[i];}
  const mean=s.cellVelocities({mean:true});assert.equal(s.averagedSteps,6);
  for(let i=0;i<mean.length;i++)assert.ok(Math.abs(mean[i]-sum[i]/6)<1e-5,'cell value '+i);
});

test('a baked field round-trips through JSON and samples like the solver',()=>{
  const s=blockSolver({fromDeg:200});s.run(10);s.startAveraging();s.run(5);
  const field=W.bakeWindField(s),copy=W.decodeWindField(JSON.parse(JSON.stringify(W.encodeWindField(field))));
  assert.equal(field.mean,true);assert.equal(field.averagedSteps,5);assert.equal(Buffer.compare(Buffer.from(field.velocity.buffer),Buffer.from(copy.velocity.buffer)),0);assert.deepEqual([...copy.solid],[...field.solid]);
  const[nx,ny]=field.size,c=5+nx*(3+ny*9),x=field.origin[0]+5.5,y=3.5,z=field.origin[2]+9.5,out=W.sampleWindField(copy,x,y,z);
  for(let a=0;a<3;a++)assert.equal(out[a],field.velocity[c*3+a]);
  assert.equal(W.bakeWindField(blockSolver()).mean,false);assert.throws(()=>W.decodeWindField({...W.encodeWindField(field),version:2}));
});

test('both samplers return zero anywhere inside a solid cell, and the air beside it keeps moving',()=>{
  // One marked cell in a 6 m box: the trilinear stencils of points inside it reach into the air around it.
  const grid=W.createWindGrid({origin:[0,0,0],cell:1,size:[6,6,6]}),solid=new Uint8Array(grid.cells);solid[2+6*(2+6*2)]=1;
  const s=W.createWindSolver({grid,solid,wind:{speed:6,fromDeg:270,z0:.25}});s.run(4);s.startAveraging();s.run(4);
  const field=W.bakeWindField(s),copy=W.decodeWindField(JSON.parse(JSON.stringify(W.encodeWindField(field)))),out=[0,0,0],zero=[0,0,0];
  for(const p of[[2.1,2.1,2.1],[2.9,2.5,2.05],[2.5,2.95,2.5],[2,2,2],[2.99,2.01,2.99]]){
    assert.deepEqual(s.sample(...p,out),zero,'solver at '+p);assert.deepEqual(s.sample(...p,out,{mean:true}),zero,'solver mean at '+p);
    assert.deepEqual(W.sampleWindField(field,...p,out),zero,'field at '+p);assert.deepEqual(W.sampleWindField(copy,...p,out),zero,'decoded field at '+p);
  }
  // The control: points just outside the cell, whose stencils include it, keep their flow.
  for(const p of[[1.9,2.1,2.1],[2.5,3.05,2.5],[2.5,2.5,1.95]]){assert.ok(Math.hypot(...s.sample(...p,out))>.5,'solver air at '+p);assert.ok(Math.hypot(...W.sampleWindField(field,...p,out))>.5,'field air at '+p);}
  // Outside the grid nothing changes: beyond the inflow side the solver gives the profile, and a field uses its nearest edge.
  const profile=s.inflowAt(2.5);s.sample(-.5,2.5,2.5,out);for(let a=0;a<3;a++)assert.ok(Math.abs(out[a]-profile[a])<1e-12,'inflow component '+a);
  assert.deepEqual(W.sampleWindField(field,-.5,2.5,2.5,out),W.sampleWindField(field,.5,2.5,2.5,[0,0,0]));
});

test('tracers ride a uniform wind exactly, rise, spread reproducibly and stay above ground',()=>{
  const wind=(x,y,z,out)=>{out[0]=2;out[1]=-1;out[2]=-1;return out;},p=Float32Array.of(0,5,0,3,.05,3);
  for(let n=0;n<10;n++)W.advectTracers(wind,p,.1,{rise:Float32Array.of(.5,0)});
  // Positions are Float32, so ten steps carry a few 1e-7 of rounding each.
  assert.ok(Math.abs(p[0]-2)<1e-5&&Math.abs(p[1]-4.5)<1e-5&&Math.abs(p[2]+1)<1e-5);assert.equal(p[4],0);
  const spread=seed=>{const q=new Float32Array(30);W.advectTracers(wind,q,.1,{spread:.2,random:W.seededRandom(seed)});return q;};
  assert.deepEqual(spread(4),spread(4));assert.notDeepEqual(spread(4),spread(5));
  assert.throws(()=>W.advectTracers(wind,p,.1,{spread:.1}));
});

test('model triangles come out in world space for placed Nautilus buildings',()=>{
  const model=createBuildingModel(T,'canal-studio'),holder=new T.Group();holder.add(model.root);holder.position.set(10,0,5);holder.rotation.y=Math.PI/2;
  const triangles=W.objectTriangles(holder),bounds=W.triangleBounds(triangles),box=new T.Box3().setFromObject(holder);
  assert.equal(triangles.length/9,model.triangles);
  for(let a=0;a<3;a++){assert.ok(Math.abs(bounds.min[a]-box.min.getComponent(a))<1e-4);assert.ok(Math.abs(bounds.max[a]-box.max.getComponent(a))<1e-4);}
  const roofs=W.objectTriangles(holder,{include:kind=>kind==='roof'});assert.ok(roofs.length>0&&roofs.length<triangles.length);
  model.dispose();
});

test('turning the wind reclassifies the sides and air cut off from every outlet turns solid',()=>{
  const s=blockSolver();assert.equal(s.boundaries.xMin.type,'inflow');assert.equal(s.boundaries.zMin.type,'slip');
  s.setWind({fromDeg:0});assert.equal(s.boundaries.zMin.type,'inflow');assert.equal(s.boundaries.zMax.type,'outflow');assert.equal(s.boundaries.xMin.type,'slip');assert.ok(s.step().converged);
  // A pocket open only to the inflow side: air could enter and never leave.
  const grid=W.createWindGrid({origin:[0,0,0],cell:1,size:[12,6,10]}),solid=new Uint8Array(grid.cells),[nx,ny]=grid.size;
  for(let k=2;k<=6;k++)for(let j=0;j<4;j++)for(let i=0;i<5;i++)if(k===2||k===6||j===3||i===4)solid[i+nx*(j+ny*k)]=1;
  const pocket=W.createWindSolver({grid,solid,wind:{speed:4,fromDeg:270,z0:.1}});
  assert.equal(pocket.cutOffCells,4*3*3);assert.ok(pocket.step().converged);assert.equal(pocket.solid[1+nx*(1+ny*4)],3);
});

test('wind domains surround a site with height-scaled margins and refuse oversize grids',()=>{
  const g=W.windDomain({min:[0,0,0],max:[10,6,8]},{cell:1,fromDeg:270,upstream:2,lateral:2,downstream:5,height:3});
  assert.deepEqual(g.origin,[-12,0,-12]);assert.deepEqual(g.size,[52,18,32]);
  assert.throws(()=>W.windDomain({min:[0,0,0],max:[400,20,400]},{cell:.25}));
  assert.throws(()=>W.createWindSolver({grid:g,solid:new Uint8Array(3),wind:{speed:5,fromDeg:0,z0:.1}}));
  assert.throws(()=>W.createWindSolver({grid:g,solid:new Uint8Array(g.cells),boundaries:W.windBoundaries(0),speedScale:0}));
});
