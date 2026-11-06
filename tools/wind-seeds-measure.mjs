// The registered measurement in docs/reviews/2026-11-04-wind-seeds.md: does averaging several
// gust seeds into one bake remove the seed bias that the baked-bearing record measured, at a
// fixed solver budget? Not a gate: it records numbers and verdicts.
//   node tools/wind-seeds-measure.mjs --out <dir> [--phase forcing|runs|compare|timing|all] [--sites single,street] [--dry]
//     [--jobs 4] [--yield 0.8|off] [--normal-priority] [--only single/b22.5-s1,check]
// Runs write each seed's running-mean snapshots under <dir>/runs and are skipped when present.
// forcing is the gusts alone, no solver: an estimate that preceded the registration.
//
// A light footprint on a shared machine (none of it changes a result; the solver is deterministic):
// - below-normal process priority, worker threads included (--normal-priority opts out);
// - a quarter of the logical processors by default (--jobs);
// - before each run starts, a wait while other processes use more than --yield of the machine
//   (default 0.8; runs already started carry on);
// - one persistent worker per job slot; the main thread builds each site once and workers get its
//   grid, solid cells and sources, so a worker loads wind-core alone, not three.js or the catalogue;
// - <dir>/STOP (or Ctrl+C) stops starting runs, lets the ones in flight finish, then exits;
// - <dir>/progress.json: done, total, in flight, the last load reading and an ETA.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';import {fileURLToPath} from 'node:url';
import * as W from '../packages/wind-core/index.js';
const T=isMainThread?await import('../packages/render-effects/three.js'):null,catalog=isMainThread?await import('../packages/building-catalog/three.js'):null;

const SELF=fileURLToPath(import.meta.url),ROOT=path.resolve(path.dirname(SELF),'..');
// The page's layouts, as tools/wind-bearings-measure.mjs builds them (its noise floor is the
// reproduction control below, so these lines must stay its lines).
const SITES={
  single:{margin:3,height:3,buildings:[{id:'rowan-family',x:0,z:0,turn:0}],roof:0},
  street:{margin:2,height:2.5,buildings:[{id:'narrow-court',x:-5,z:11.5,turn:0},{id:'batten-general-store',x:5,z:11,turn:0},{id:'mews-corner',x:-5,z:-9.5,turn:180},{id:'market-terrace',x:5,z:-10,turn:180}],roof:3,street:{x:5,y:1.5}}
};
// --dry shrinks every flow-through count 60-fold: a plumbing check whose numbers mean nothing.
const DRY=process.argv.includes('--dry')||Boolean(workerData?.dry),SCALE=DRY?1/60:1;
const SPEED=6,Z0=.25,WARMUP=1,TOLERANCE=2e-4,TRACK=20,PUFFS=400,SMOKE={rise:1.1,riseTime:5,spread:.12,jitter:.15};
const turbulence=seed=>({gain:1,lengthScale:20,modes:32,seed});
const SEEDS=[1,2,3,4,5,6,7,8],BEARINGS=W.evenBearings(8,22.5);
// Per-seed averaging windows in flow-throughs (each seed's run: 1 warm-up + 12 averaged).
const WINDOWS=[1,1.5,2.25,3,10/3,4,5.5,6,12],label=a=>a===10/3?'10/3':String(a),fileLabel=a=>label(a).replace('/','-');
// Arms: S seeds per bake, each averaged over a flow-throughs after its own 1 flow-through warm-up.
// Two bakes of an arm never share a seed; their plume separation is the arm's seed noise.
const ARMS=[
  {id:'1x12',S:1,a:12,budget:'total-13'},{id:'2x5.5',S:2,a:5.5,budget:'total-13'},{id:'3x10/3',S:3,a:10/3,budget:'total-13'},{id:'4x2.25',S:4,a:2.25,budget:'total-13'},
  {id:'3x4',S:3,a:4,budget:'averaging-12'},{id:'4x3',S:4,a:3,budget:'averaging-12'},
  {id:'1x3',S:1,a:3,budget:'default-4'},{id:'2x1',S:2,a:1,budget:'default-4'},
  {id:'1x1',S:1,a:1,budget:'single'},{id:'1x1.5',S:1,a:1.5,budget:'single'},{id:'1x6',S:1,a:6,budget:'single'}
];
const groups=S=>{const g=[];for(let n=0;n+S<=SEEDS.length;n+=S)g.push(SEEDS.slice(n,n+S));return g;};
const pairsOf=S=>{const g=groups(S),p=[];for(let n=0;n+1<g.length;n+=2)p.push([g[n],g[n+1]]);return p;};
const key=({fromDeg,seed})=>'b'+fromDeg+'-s'+seed;

// Main thread only: the site's models, voxels, sealed interiors and sources, built once.
function buildSite(name){
  const def=SITES[name],site=new T.Group(),holders=[];
  for(const b of def.buildings){const model=catalog.createBuildingModel(T,b.id),holder=new T.Group(),m=model.building;model.root.position.set(-m.width/2,0,-m.depth/2);holder.add(model.root);holder.position.set(b.x,0,b.z);holder.rotation.y=-b.turn*Math.PI/180;site.add(holder);holders.push({holder,model});}
  site.updateMatrixWorld(true);
  const triangles=W.objectTriangles(site),grid=W.windDomain(W.triangleBounds(triangles),{cell:1,fromDeg:0,upstream:def.margin,lateral:def.margin,downstream:def.margin,height:def.height,minimum:8}),{solid}=W.voxelizeTriangles(grid,triangles);W.fillEnclosed(grid,solid);
  const[nx,ny,nz]=grid.size,h=grid.cell,[ox,oy,oz]=grid.origin,at=(i,j,k)=>solid[i+nx*(j+ny*k)],I=x=>Math.floor((x-ox)/h),K=z=>Math.floor((z-oz)/h);
  // A source is the centre of the first air cell above the highest solid cell in its column.
  const above=(x,z)=>{const i=I(x),k=K(z);let top=-1;for(let j=0;j<ny;j++)if(at(i,j,k))top=j;return{x,y:oy+(top+1.5)*h,z};};
  const box=new T.Box3().setFromObject(holders[def.roof].holder),centre=box.getCenter(new T.Vector3()),sources=[{id:'roof',...above(centre.x,centre.z)}];
  if(def.street){const i=I(def.street.x),j=Math.floor((def.street.y-oy)/h);let k0=K(0),k1=k0;if(at(i,j,k0))throw Error('The street source column starts in a solid.');while(k0>0&&!at(i,j,k0-1))k0--;while(k1<nz-1&&!at(i,j,k1+1))k1++;
    sources.push({id:'street',x:def.street.x,y:def.street.y,z:oz+(k0+k1+1)/2*h});}
  for(const s of sources)if(at(I(s.x),Math.floor((s.y-oy)/h),K(s.z)))throw Error(name+' '+s.id+' source is inside a solid.');
  for(const{model}of holders)model.dispose();
  return{grid,solid,sources};
}
// What a worker receives for a site: plain data. Its grid is rebuilt with createWindGrid, which
// is all windDomain returns.
const siteData=name=>{const{grid,solid,sources}=buildSite(name);return{origin:[...grid.origin],cell:grid.cell,size:[...grid.size],solid,sources};};
const siteOf=d=>({grid:W.createWindGrid({origin:d.origin,cell:d.cell,size:d.size}),solid:d.solid,sources:d.sources});
// A smoke ensemble released together at t = 0 from source, then carried for steps; returns its
// centroid after every step (index 0 is the source). As in tools/wind-bearings-measure.mjs.
// With audit {field}, it also counts puff steps whose straight path crosses a solid cell of the
// field while both ends are in air (createSmoke tests only where a step ends), from the second
// step on; the audit only reads positions.
function plume(sample,source,{dt,steps,count=PUFFS,seed=1,blocked=null,spread=SMOKE.spread,jitter=SMOKE.jitter,audit=null}){
  const smoke=W.createSmoke({capacity:count,rate:(count+.5)/dt,lifetime:1e9,rise:SMOKE.rise,riseTime:SMOKE.riseTime,spread,jitter,seed,blocked});smoke.addEmitter(source);
  const path=new Float64Array((steps+1)*3);path.set([source.x,source.y,source.z]);const before=audit?new Float32Array(count*3):null;
  for(let n=1;n<=steps;n++){if(before&&n>1)before.set(smoke.positions.subarray(0,count*3));smoke.step(sample,dt);if(n===1){if(smoke.count!==count)throw Error('Released '+smoke.count+' of '+count+' puffs.');smoke.removeEmitter(0);}
    let x=0,y=0,z=0;const p=smoke.positions;for(let q=0;q<count;q++){x+=p[q*3];y+=p[q*3+1];z+=p[q*3+2];}path[n*3]=x/count;path[n*3+1]=y/count;path[n*3+2]=z/count;
    if(before&&n>1){audit.puffSteps+=count;for(let q=0,o=0;q<count;q++,o+=3){const d=solidPath(audit.field,before[o],before[o+1],before[o+2],p[o],p[o+1],p[o+2]);if(d>0){audit.tunnels++;audit.inside[d<.1?0:d<.25?1:d<.5?2:d<1?3:4]++;if(d>audit.max)audit.max=d;}}}}
  return path;
}
// How much of the segment a -> b lies inside solid cells of field when both ends are in air (0 if
// an end is solid: smoke refuses such a step, or the puff starts in a coarse voxel). A voxel
// walk (Amanatides and Woo 1987) over the cells the segment touches.
function solidPath(field,ax,ay,az,bx,by,bz){
  const{origin:[ox,oy,oz],cell:h,size:[nx,ny,nz],solid}=field,cellAt=(i,j,k)=>i>=0&&j>=0&&k>=0&&i<nx&&j<ny&&k<nz&&solid[i+nx*(j+ny*k)]!==0;
  let i=Math.floor((ax-ox)/h),j=Math.floor((ay-oy)/h),k=Math.floor((az-oz)/h);const ie=Math.floor((bx-ox)/h),je=Math.floor((by-oy)/h),ke=Math.floor((bz-oz)/h);
  if(cellAt(i,j,k)||cellAt(ie,je,ke))return 0;
  const dx=bx-ax,dy=by-ay,dz=bz-az,si=Math.sign(dx),sj=Math.sign(dy),sk=Math.sign(dz),length=Math.hypot(dx,dy,dz);
  const first=(p,o,c,s,d)=>d?((s>0?o+(c+1)*h:o+c*h)-p)/d:Infinity;
  let tx=first(ax,ox,i,si,dx),ty=first(ay,oy,j,sj,dy),tz=first(az,oz,k,sk,dz),inside=0;const ddx=dx?h/Math.abs(dx):Infinity,ddy=dy?h/Math.abs(dy):Infinity,ddz=dz?h/Math.abs(dz):Infinity;
  for(let guard=0;guard<256&&!(i===ie&&j===je&&k===ke);guard++){
    let t;if(tx<=ty&&tx<=tz){t=tx;if(t>1)break;i+=si;tx+=ddx;}else if(ty<=tz){t=ty;if(t>1)break;j+=sj;ty+=ddy;}else{t=tz;if(t>1)break;k+=sk;tz+=ddz;}
    if(cellAt(i,j,k))inside+=(Math.min(tx,ty,tz,1)-t)*length;
  }
  return inside;
}
// The audit's known answers: a wall of cells at i = 2 below y = 2, and one lone solid cell.
function auditSelfCheck(){
  const size=[6,3,6],solid=new Uint8Array(6*3*6),at=(i,j,k)=>i+6*(j+3*k);for(let k=0;k<6;k++)for(let j=0;j<2;j++)solid[at(2,j,k)]=1;solid[at(4,0,4)]=1;
  const field={origin:[0,0,0],cell:1,size,solid},cases=[
    ['through the wall in one step',[1.5,.5,1.5],[3.4,.5,1.5],1],['short of the wall',[1.2,.5,1.5],[1.9,.5,1.5],0],['ends inside the wall (refused, not a tunnel)',[1.5,.5,1.5],[2.5,.5,1.5],0],
    ['over the top of the wall',[1.5,2.5,1.5],[3.5,2.5,1.5],0],['backwards through the wall',[3.2,1.5,.5],[1.8,1.2,.9],Math.hypot(1.4,.3,.4)/1.4],
    ['diagonally through a lone cell',[3.9,.5,5.05],[5.05,.5,3.9],.95*Math.SQRT2],['clipping a lone cell\'s corner',[3.8,.5,4.7],[4.3,.5,5.2],.2*.5*Math.SQRT2],
    ['past the lone cell',[3.5,.5,5.2],[4.2,.5,5.9],0]];
  const rows=cases.map(([name,a,b,want])=>({name,want:+want.toFixed(9),got:+solidPath(field,...a,...b).toFixed(9)}));
  return{pass:rows.every(r=>Math.abs(r.want-r.got)<1e-9),rows};
}
// Machine load: the share of all logical processors busy, and the share this process used.
function cpuMark(){let idle=0,total=0;for(const c of os.cpus()){const t=c.times;idle+=t.idle;total+=t.user+t.nice+t.sys+t.idle+t.irq;}return{idle,total,own:process.cpuUsage(),at:performance.now()};}
function shares(a,b){const span=b.total-a.total,machine=span>0?1-(b.idle-a.idle)/span:0,own=((b.own.user-a.own.user)+(b.own.system-a.own.system))/1000/(b.at-a.at)/os.cpus().length;return{machine:+machine.toFixed(3),own:+own.toFixed(3),foreign:+Math.max(0,machine-own).toFixed(3)};}
function loadMeter(){
  let last=cpuMark();const samples=[];
  const timer=setInterval(()=>{const now=cpuMark();samples.push({...shares(last,now),rssMB:Math.round(process.memoryUsage().rss/2**20)});last=now;},15000);
  timer.unref();
  return{stop(){clearInterval(timer);const q=(v,f)=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(f*s.length))]:null;};
    const m=samples.map(s=>s.machine),o=samples.map(s=>s.own),f=samples.map(s=>s.foreign),r=samples.map(s=>s.rssMB);
    return{samples:samples.length,every:'15 s',machine:{median:q(m,.5),max:q(m,1)},own:{median:q(o,.5)},foreign:{median:q(f,.5),max:q(f,1)},rssMB:{median:q(r,.5),max:q(r,1)}};}};
}

// ---------- forcing: the gusts alone (no solver), averaged over the aloft box and a window
function forcingJob({fromDeg,seeds},{grid}){
  const[nx,ny,nz]=grid.size,h=grid.cell,[ox,,oz]=grid.origin,d=W.windDirection(fromDeg),flow=Math.max(nx,nz)*h/SPEED;
  const dt=W.createWindSolver({grid,solid:new Uint8Array(grid.cells),wind:{speed:SPEED,fromDeg,z0:Z0},turbulence:null}).dt*2;
  const points=[];for(let k=2;k<nz;k+=4)for(let j=0;j<ny;j++)if((j+.5)*h>=.6*ny*h&&j%2===0)for(let i=2;i<nx;i+=4)points.push([ox+(i+.5)*h,(j+.5)*h,oz+(k+.5)*h]);
  const w0=Math.round(WARMUP*SCALE*flow/dt),marks=WINDOWS.map(a=>Math.max(1,Math.round(a*SCALE*flow/dt))),end=w0+Math.max(...marks),out=[0,0,0],means=WINDOWS.map(()=>[]);
  for(let seed=1;seed<=seeds;seed++){
    const g=W.createInflowTurbulence({frictionVelocity:W.frictionVelocity(SPEED,Z0),direction:d,convection:SPEED,lengthScale:20,modes:32,seed,gain:1,kMin:Math.PI/(Math.max(nx,nz)*h),kMax:Math.PI/(2*h)});
    let sum=0;const at=new Map(marks.map((m,i)=>[w0+m,i]));
    for(let n=w0+1;n<=end;n++){let s=0;for(const p of points){g.sample(p[0],p[1],p[2],n*dt,out);s+=out[0]*d[0]+out[2]*d[1];}sum+=s/points.length;if(at.has(n))means[at.get(n)].push(sum/(n-w0));}
  }
  return{fromDeg,seeds,points:points.length,dt,flow,windows:Object.fromEntries(WINDOWS.map((a,i)=>[label(a),means[i]]))};
}

// ---------- one run: one seed at one bearing, 1 + 12 flow-throughs, running-mean snapshots
function runJob({site:name,fromDeg,seed,check},{grid,solid,sources}){
  const wind={speed:SPEED,fromDeg,z0:Z0},started=performance.now();
  if(check){// The library's own seed bake, for the bit-for-bit check: seeds 1-4, 2.25 flow-throughs each.
    const set=W.bakeWindBearings({grid,solid,bearings:[fromDeg],wind,turbulence:{gain:1,lengthScale:20,modes:32},seeds:check.seeds,warmup:WARMUP*SCALE,average:check.average*SCALE,tolerance:TOLERANCE});
    const f=set.fields[0];return{check:true,meta:{site:name,fromDeg,seeds:check.seeds,average:check.average,steps:f.steps,unconverged:set.unconverged[0],seconds:(performance.now()-started)/1000},velocity:f.velocity,solid:f.solid,transfer:[f.velocity.buffer,f.solid.buffer]};}
  const solver=W.createWindSolver({grid,solid,wind,turbulence:turbulence(seed),tolerance:TOLERANCE}),dt=solver.dt,flow=Math.max(grid.size[0],grid.size[2])*grid.cell/SPEED,steps=f=>Math.round(f*SCALE*flow/dt);
  let missed=0;for(let n=steps(WARMUP);n>0;n--)if(!solver.step().converged)missed++;
  solver.startAveraging();const marks=new Map(WINDOWS.map(a=>[Math.max(1,steps(a)),[]]));for(const a of WINDOWS)marks.get(Math.max(1,steps(a))).push(a);
  const total=Math.max(...marks.keys()),snapshots={},transfer=[];
  for(let n=1;n<=total;n++){if(!solver.step().converged)missed++;if(marks.has(n)){const f=W.bakeWindField(solver);for(const a of marks.get(n)){const v=marks.get(n).length>1?f.velocity.slice():f.velocity;snapshots[label(a)]=v;transfer.push(v.buffer);}}}
  const meta={site:name,fromDeg,seed,dt,steps:solver.steps,warmSteps:steps(WARMUP),marks:WINDOWS.map(a=>({average:label(a),averagedSteps:Math.max(1,steps(a))})),missed,seconds:(performance.now()-started)/1000,
    grid:{origin:[...grid.origin],cell:grid.cell,size:[...grid.size]},sources,cutOff:solver.cutOffCells};
  const fieldSolid=Uint8Array.from(solver.solid,v=>v?1:0);transfer.push(fieldSolid.buffer);
  return{meta,snapshots,solid:fieldSolid,transfer};
}
// A persistent worker: it takes jobs by message for as long as the main thread keeps it.
if(!isMainThread){const sites=Object.fromEntries(Object.entries(workerData.sites).map(([n,d])=>[n,siteOf(d)]));
  parentPort.on('message',({id,spec})=>{const{transfer=[],...result}=spec.forcing?forcingJob(spec,sites[spec.site]):runJob(spec,sites[spec.site]);parentPort.postMessage({id,result},transfer);});}

// ---------- files
const args=Object.fromEntries(process.argv.slice(2).reduce((list,arg,i,all)=>arg.startsWith('--')?[...list,[arg.slice(2),all[i+1]?.startsWith('--')||all[i+1]===undefined?true:all[i+1]]]:list,[]));
const out=path.resolve(String(args.out||'artifacts/wind-seeds')),jobs=Number(args.jobs||Math.max(1,Math.round(os.cpus().length/4))),sites=String(args.sites||'single,street').split(','),phase=String(args.phase||'all');
const yieldAt=args.yield==='off'?Infinity:Number(args.yield??.8),only=args.only?new Set(String(args.only).split(',')):null;
if(!(jobs>=1&&Number.isInteger(jobs))||!(yieldAt>0))throw Error('--jobs is a whole number from 1 and --yield a share above 0 (or off).');
const runDir=site=>path.join(out,'runs',site);
const CHECK={site:'single',fromDeg:22.5,seeds:[1,2,3,4],average:2.25},checkFile=()=>path.join(out,'runs','check-library.json');
const runName=spec=>spec.check?'check':spec.forcing?'forcing/'+spec.site+'/b'+spec.fromDeg:spec.site+'/'+key(spec);
function save(result){
  if(result.check){fs.mkdirSync(path.join(out,'runs'),{recursive:true});fs.writeFileSync(path.join(out,'runs','check-library.f32'),Buffer.from(result.velocity.buffer));fs.writeFileSync(path.join(out,'runs','check-library.solid'),result.solid);fs.writeFileSync(checkFile(),JSON.stringify(result.meta));return;}
  const{meta,snapshots,solid}=result,dir=runDir(meta.site),k=key(meta);fs.mkdirSync(dir,{recursive:true});
  for(const[a,v]of Object.entries(snapshots))fs.writeFileSync(path.join(dir,k+'-a'+a.replace('/','-')+'.f32'),Buffer.from(v.buffer,v.byteOffset,v.byteLength));
  fs.writeFileSync(path.join(dir,k+'.solid'),solid);fs.writeFileSync(path.join(dir,k+'.json'),JSON.stringify({meta}));
}
const has=spec=>spec.check?fs.existsSync(checkFile()):fs.existsSync(path.join(runDir(spec.site),key(spec)+'.json'));
function load(site,spec){
  const dir=runDir(site),k=key(spec),{meta}=JSON.parse(fs.readFileSync(path.join(dir,k+'.json'),'utf8')),solid=new Uint8Array(fs.readFileSync(path.join(dir,k+'.solid')));
  const field=a=>{const bytes=fs.readFileSync(path.join(dir,k+'-a'+fileLabel(a)+'.f32')),velocity=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),mark=meta.marks.find(m=>m.average===label(a));
    return{kind:W.WIND_FIELD_KIND,version:W.WIND_FIELD_VERSION,...meta.grid,axes:['x','height','z'],units:'m/s',wind:{speed:SPEED,fromDeg:spec.fromDeg,z0:Z0,referenceHeight:10},mean:true,averagedSteps:mark.averagedSteps,steps:meta.warmSteps+mark.averagedSteps,velocity,solid};};
  return{meta,field};
}

// ---------- the scheduler: persistent workers, a yield to other load, a clean stop, progress
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let stopping=false;
const stopFile=()=>path.join(out,'STOP'),stopAsked=()=>stopping||(stopping=fs.existsSync(stopFile()));
function progress(state,extra={}){try{fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({pid:process.pid,updated:new Date().toISOString(),state,jobs,priority:os.getPriority(),yieldAt:Number.isFinite(yieldAt)?yieldAt:'off',rssMB:Math.round(process.memoryUsage().rss/2**20),...extra},null,1));}catch{}}
async function pool(queue,onDone){
  const total=queue.length,names=[...new Set(queue.map(q=>q.site))],data=Object.fromEntries(names.map(n=>[n,siteData(n)]));
  const slots=Math.min(jobs,total),workers=Array.from({length:slots},()=>new Worker(SELF,{workerData:{dry:DRY,sites:data}}));
  const started=Date.now(),inFlight=new Map(),seconds={};let done=0,id=0,load=null,waiting=null;
  // Seconds per run by site, from runs already on disk and from this session.
  for(const n of names){seconds[n]=[];const dir=runDir(n);if(fs.existsSync(dir))for(const f of fs.readdirSync(dir))if(f.endsWith('.json'))try{seconds[n].push(JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')).meta.seconds);}catch{}}
  const median=v=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[s.length>>1]:null;};
  const report=state=>{const left=[...queue,...inFlight.values()],each=n=>median(seconds[n])??median(Object.values(seconds).flat())??null,work=left.reduce((s,q)=>s+(each(q.site)??0),0);
    progress(state,{phase,started:new Date(started).toISOString(),done,total,pending:queue.length,inFlight:[...inFlight.values()].map(runName),waiting,load,secondsPerRun:Object.fromEntries(names.map(n=>[n,each(n)])),
      etaMinutes:left.length&&each(left[0].site)!==null?+(work/Math.min(slots,left.length)/60).toFixed(1):null});};
  const ask=(w,spec)=>new Promise((resolve,reject)=>{const mine=id++,onMessage=m=>{if(m.id!==mine)return;w.off('message',onMessage);w.off('error',reject);resolve(m.result);};w.on('message',onMessage);w.once('error',reject);w.postMessage({id:mine,spec});});
  // Wait while other processes hold more than yieldAt of the machine; each reading spans 3 s.
  const yieldToLoad=async()=>{if(!Number.isFinite(yieldAt))return;for(;;){const a=cpuMark();await sleep(3000);load=shares(a,cpuMark());if(load.foreign<=yieldAt||stopAsked()){waiting=null;return;}waiting='other processes hold '+load.foreign+' of the machine (yield above '+yieldAt+')';report('waiting');await sleep(10000);}};
  report('running');
  try{
    await Promise.all(workers.map(async w=>{
      while(queue.length&&!stopAsked()){
        await yieldToLoad();if(stopAsked())break;const spec=queue.shift();if(!spec)break;
        inFlight.set(spec,spec);report('running');const result=await ask(w,spec);inFlight.delete(spec);done++;
        if(spec.site&&result.meta?.seconds)seconds[spec.site].push(result.meta.seconds);onDone(result,spec,done,total);report(stopping?'stopping':'running');
      }
    }));
  }finally{await Promise.all(workers.map(w=>w.terminate()));}
  report(stopping&&queue.length?'stopped':'done');
  return{done,total,stopped:stopping&&queue.length>0,minutes:+((Date.now()-started)/60000).toFixed(1)};
}
async function runPhase(){
  const meter=loadMeter(),started=Date.now(),queue=[{site:CHECK.site,fromDeg:CHECK.fromDeg,check:CHECK}].filter(s=>sites.includes(s.site));
  for(const site of sites)for(const fromDeg of BEARINGS)for(const seed of SEEDS)queue.push({site,fromDeg,seed});
  const pending=queue.filter(s=>!has(s)&&(!only||only.has(runName(s))));
  console.log(JSON.stringify({phase:'runs',pending:pending.length,jobs,cpus:os.cpus().length,priority:os.getPriority(),yieldAt:Number.isFinite(yieldAt)?yieldAt:'off'}));
  const summary=await pool(pending,(result,spec,done,total)=>{save(result);console.log(JSON.stringify({done,total,run:runName(spec),seconds:+result.meta.seconds.toFixed(1),steps:result.meta.steps,missed:result.meta.missed??result.meta.unconverged}));});
  const load=meter.stop();fs.mkdirSync(path.join(out,'runs'),{recursive:true});
  fs.writeFileSync(path.join(out,'runs','load-'+new Date(started).toISOString().replace(/[:.]/g,'-')+'.json'),JSON.stringify({started:new Date(started).toISOString(),minutes:summary.minutes,jobs,priority:os.getPriority(),yieldAt:Number.isFinite(yieldAt)?yieldAt:'off',done:summary.done,stopped:summary.stopped,load}));
  console.log(JSON.stringify({phase:summary.stopped?'runs stopped (STOP file or Ctrl+C); finished runs are kept':'runs done',load}));
}
async function forcingPhase(){
  const seeds=Number(args.seeds||(DRY?4:200)),queue=[];for(const site of sites)for(const fromDeg of[22.5,112.5,202.5,292.5])queue.push({forcing:true,site,fromDeg,seeds});const results=[];
  await pool(queue,(r,spec)=>results.push({site:spec.site,...r}));
  const summary={note:'The along-wind gust averaged over the aloft box (cells centred in the top 40 % of the domain, every 4th column, every 2nd layer) and over a window after 1 flow-through, frozen-convected as turbulence.js samples it. No solver.',seeds,sites:{}};
  for(const site of sites){const rows=results.filter(r=>r.site===site),sd={};
    for(const a of WINDOWS){const k=label(a);let v=0;for(const r of rows){const m=r.windows[k],mu=m.reduce((s,x)=>s+x,0)/m.length;v+=m.reduce((s,x)=>s+(x-mu)**2,0)/(m.length-1);}sd[k]=Math.sqrt(v/rows.length);}
    const p=(a,b)=>Math.log(sd[label(a)]**2/sd[label(b)]**2)/Math.log(b/a),r=(S,a,S0,a0)=>sd[label(a)]/Math.sqrt(S)/(sd[label(a0)]/Math.sqrt(S0));
    summary.sites[site]={points:rows[0].points,sd:Object.fromEntries(Object.entries(sd).map(([k,v])=>[k,+v.toFixed(4)])),p:{'3-12':+p(3,12).toFixed(3),'1-3':+p(1,3).toFixed(3),'1-12':+p(1,12).toFixed(3)},
      ratios:Object.fromEntries([['1x12/1x3',[1,12,1,3]],['2x5.5/1x12',[2,5.5,1,12]],['3x10/3/1x12',[3,10/3,1,12]],['4x2.25/1x12',[4,2.25,1,12]],['3x4/1x12',[3,4,1,12]],['4x3/1x12',[4,3,1,12]],['2x1/1x3',[2,1,1,3]]].map(([k,v])=>[k,+r(...v).toFixed(3)]))};}
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'forcing.json'),JSON.stringify(summary,null,1));console.log(JSON.stringify(summary,null,1));
}

// ---------- compare
const median=v=>{const s=[...v].sort((a,b)=>a-b),n=s.length;return n?n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2:NaN;};
const dist=(p,a,q,b)=>Math.hypot(p[a*3]-q[b*3],p[a*3+1]-q[b*3+1],p[a*3+2]-q[b*3+2]);
const fieldArm=field=>({sample:(x,y,z,out)=>W.sampleWindField(field,x,y,z,out),blocked:W.windFieldSolid(field)});
// The mean along-wind velocity over air cells centred in the top 40 % (aloft) or bottom 40 %
// (low) of the domain: linear in the field, so a seed mean's value is the mean of its seeds'.
function alongWind(field,fromDeg){
  const[nx,ny,nz]=field.size,h=field.cell,[dx,dz]=W.windDirection(fromDeg),v=field.velocity,s=field.solid,H=ny*h;let hi=0,nh=0,lo=0,nl=0;
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){const y=(j+.5)*h,top=y>=.6*H,bottom=y<.4*H;if(!top&&!bottom)continue;
    for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);if(s[c])continue;const u=v[c*3]*dx+v[c*3+2]*dz;if(top){hi+=u;nh++;}else{lo+=u;nl++;}}}
  return{aloft:hi/nh,low:lo/nl};
}
// The late-window mean from two running-mean snapshots of one run: steps m+1 .. n.
function lateField(early,whole){const m=early.averagedSteps,n=whole.averagedSteps,v=new Float32Array(whole.velocity.length);for(let i=0;i<v.length;i++)v[i]=(n*whole.velocity[i]-m*early.velocity[i])/(n-m);return{...whole,velocity:v,averagedSteps:n-m};}
function compare(){
  const results={rig:{cpu:os.cpus()[0].model,threads:os.cpus().length,node:process.version,platform:os.platform()+' '+os.release()},runs:{count:0,missed:0,seconds:[]},controls:{},field:{},plumes:[],transient:[],summary:{}};
  let nonFinite=0;const finite=p=>{for(const v of p)if(!Number.isFinite(v))nonFinite++;return p;};
  // Unregistered (added after the registration, read-only): steps that cross a solid cell.
  const BINS=['<0.1','0.1-0.25','0.25-0.5','0.5-1','>=1'];
  const tunnels={note:'Puff steps whose straight path crosses a solid cell while both ends are in air, from the second step on, over every plume the registered metrics use (not the reproduction rows); inside = the metres of that path inside solid cells. Read-only: it changes no plume.',selfCheck:auditSelfCheck(),plumes:0,puffSteps:0,tunnels:0,inside:Object.fromEntries(BINS.map(b=>[b,0])),max:0,bySource:{},worst:[]};
  if(!tunnels.selfCheck.pass)throw Error('The tunnelling audit misses a known answer: '+JSON.stringify(tunnels.selfCheck.rows.filter(r=>Math.abs(r.want-r.got)>=1e-9)));
  const audited=(field,source,label2,what,options)=>{const audit={field,puffSteps:0,tunnels:0,inside:[0,0,0,0,0],max:0},p=plume(fieldArm(field).sample,source,{...options,blocked:W.windFieldSolid(field),audit});
    tunnels.plumes++;tunnels.puffSteps+=audit.puffSteps;tunnels.tunnels+=audit.tunnels;tunnels.max=Math.max(tunnels.max,audit.max);
    const b=tunnels.bySource[label2]||={plumes:0,withTunnels:0,puffSteps:0,tunnels:0,inside:Object.fromEntries(BINS.map(x=>[x,0])),max:0};b.plumes++;b.puffSteps+=audit.puffSteps;b.tunnels+=audit.tunnels;b.max=Math.max(b.max,audit.max);
    BINS.forEach((x,n)=>{tunnels.inside[x]+=audit.inside[n];b.inside[x]+=audit.inside[n];});
    if(audit.tunnels){b.withTunnels++;tunnels.worst.push({source:label2,plume:what,tunnels:audit.tunnels,deep:audit.inside[3]+audit.inside[4],max:+audit.max.toFixed(3),puffSteps:audit.puffSteps});}return p;};
  const prior=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/reviews/evidence/wind-bearings-smoke/results.json'),'utf8')).noise;
  const reproduction=[];
  for(const site of sites){
    for(const fromDeg of BEARINGS){
      const runs=new Map(SEEDS.map(seed=>[seed,load(site,{fromDeg,seed})])),meta=runs.get(1).meta,dt=meta.dt,maxSteps=Math.ceil(TRACK/dt),g=meta.grid;
      for(const r of runs.values()){results.runs.count++;results.runs.missed+=r.meta.missed;results.runs.seconds.push(+r.meta.seconds.toFixed(1));if(r.meta.dt!==dt)throw Error('Seeds disagree on dt.');}
      const cache=new Map(),at=(seed,a)=>{const k=seed+'@'+label(a);if(!cache.has(k))cache.set(k,runs.get(seed).field(a));return cache.get(k);},bake=(seeds,a)=>W.averageWindFields(seeds.map(s=>at(s,a)));
      const limit=(p,k)=>{const x=p[k*3],y=p[k*3+1],z=p[k*3+2];return x<g.origin[0]+2||x>g.origin[0]+g.size[0]*g.cell-2||z<g.origin[2]+2||z>g.origin[2]+g.size[2]*g.cell-2||y>g.size[1]*g.cell-2;};
      const window=path=>{let end=maxSteps;for(let k=1;k<=maxSteps;k++)if(limit(path,k)){end=k-1;break;}return end;};
      // Field: every seed's along-wind speeds at every window.
      const cell=site+'@'+fromDeg;results.field[cell]=Object.fromEntries(WINDOWS.map(a=>[label(a),SEEDS.map(s=>{const u=alongWind(at(s,a),fromDeg);return{seed:s,aloft:+u.aloft.toFixed(5),low:+u.low.toFixed(5)};})]));
      const reference=bake(SEEDS,12);
      for(const source of meta.sources){
        const label2=site+'/'+source.id,ref=fieldArm(reference),refPath=finite(audited(reference,source,label2,fromDeg+' reference',{dt,steps:maxSteps})),end=window(refPath),L=dist(refPath,end,Float64Array.of(source.x,source.y,source.z),0);
        const paths=new Map(),pathOf=(seeds,a)=>{const k=seeds.join(',')+'@'+label(a);if(!paths.has(k))paths.set(k,finite(audited(bake(seeds,a),source,label2,fromDeg+' seeds '+k,{dt,steps:end})));return paths.get(k);};
        const row={source:label2,target:fromDeg,T_end:+(end*dt).toFixed(3),L_end:+L.toFixed(3),arms:{}};
        for(const arm of ARMS)row.arms[arm.id]=pairsOf(arm.S).map(([p,q])=>+dist(pathOf(p,arm.a),end,pathOf(q,arm.a),end).toFixed(4));
        // Null control: the reference against a bit-identical copy of itself.
        if(!results.controls[label2]){const copy={...reference,velocity:reference.velocity.slice()},c=fieldArm(copy),p=plume(c.sample,source,{dt,steps:end,blocked:c.blocked});let d=0;for(let k=0;k<=end;k++)d=Math.max(d,dist(p,k,refPath,k));results.controls[label2]={nullControlMax:d};}
        results.plumes.push(row);
        // Transient: the 8-seed mean of each early window against the 8-seed mean of the rest of the run.
        for(const a of[1,2.25]){const early=bake(SEEDS,a),late=W.averageWindFields(SEEDS.map(s=>lateField(at(s,a),at(s,12))));
          results.transient.push({source:label2,target:fromDeg,a:label(a),D_end:+dist(audited(early,source,label2,fromDeg+' early '+label(a),{dt,steps:end}),end,audited(late,source,label2,fromDeg+' late '+label(a),{dt,steps:end}),end).toFixed(4)});}
        // Reproduction: seeds 1 and 2 at the record's noise-floor bearings, with its window (truth = seed 1, 12 flow-throughs).
        if(fromDeg===22.5||fromDeg===202.5){const t=fieldArm(at(1,12)),truth=plume(t.sample,source,{dt,steps:maxSteps,blocked:t.blocked}),e0=window(truth),e1=Math.round(+(e0*dt).toFixed(3)/dt);
          for(const A of[1.5,3,6,12]){const a=fieldArm(at(1,A)),b=fieldArm(at(2,A)),D=+dist(plume(a.sample,source,{dt,steps:e1,blocked:a.blocked}),e1,plume(b.sample,source,{dt,steps:e1,blocked:b.blocked}),e1).toFixed(4),was=prior.find(x=>x.source===label2&&x.target===fromDeg&&x.average===A);
            reproduction.push({source:label2,target:fromDeg,average:A,D_end:D,record:was?.D_end??null,same:was?.D_end===D});}}
      }
    }
  }
  // The library's own 4-seed bake against the instrument's mean of the same seeds' snapshots.
  if(fs.existsSync(checkFile())&&sites.includes(CHECK.site)){const m=JSON.parse(fs.readFileSync(checkFile(),'utf8')),bytes=fs.readFileSync(path.join(out,'runs','check-library.f32')),lib=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    const mine=W.averageWindFields(CHECK.seeds.map(seed=>load(CHECK.site,{fromDeg:CHECK.fromDeg,seed}).field(CHECK.average))),solid=new Uint8Array(fs.readFileSync(path.join(out,'runs','check-library.solid')));
    results.controls.libraryCheck={...m,values:lib.length,identical:lib.length===mine.velocity.length&&lib.every((v,i)=>Object.is(v,mine.velocity[i]))&&solid.every((v,i)=>v===mine.solid[i])};}
  results.controls.reproduction={rows:reproduction.length,same:reproduction.filter(r=>r.same).length,table:reproduction};
  results.controls.nonFinite=nonFinite;
  tunnels.worst=tunnels.worst.sort((a,b)=>b.tunnels-a.tunnels).slice(0,20);results.tunnels=tunnels;
  verdicts(results);
  return results;
}

// ---------- the registered predictions and decision rules, as written
function verdicts(r){
  const sources=[...new Set(r.plumes.map(x=>x.source))],pick=(arm,source=null)=>r.plumes.filter(x=>!source||x.source===source).flatMap(x=>x.arms[arm]);
  const pooled=arm=>median(pick(arm)),bySource=arm=>Object.fromEntries(sources.map(s=>[s,+median(pick(arm,s)).toFixed(3)]));
  const table={};for(const arm of ARMS)table[arm.id]={S:arm.S,a:+arm.a.toFixed(4),budget:arm.budget,pairs:pick(arm.id).length,pooled:+pooled(arm.id).toFixed(3),bySource:bySource(arm.id)};
  r.summary.plumes=table;
  // Field: the across-seed SD of each along-wind speed, pooled over cells (equal weight).
  const sd=(which,a)=>{const cells=Object.values(r.field);let v=0;for(const c of cells){const x=c[label(a)].map(s=>s[which]),mu=x.reduce((s,y)=>s+y,0)/x.length;v+=x.reduce((s,y)=>s+(y-mu)**2,0)/(x.length-1);}return Math.sqrt(v/cells.length);};
  const fieldTable={};for(const which of['aloft','low']){fieldTable[which]={sd:Object.fromEntries(WINDOWS.map(a=>[label(a),+sd(which,a).toFixed(4)])),p:{}};
    const p=(a,b)=>+(Math.log(sd(which,a)**2/sd(which,b)**2)/Math.log(b/a)).toFixed(3);fieldTable[which].p={'3-12':p(3,12),'1-3':p(1,3),'1-12':p(1,12)};
    fieldTable[which].armSd=Object.fromEntries(ARMS.map(arm=>[arm.id,+(sd(which,arm.a)/Math.sqrt(arm.S)).toFixed(4)]));}
  r.summary.field=fieldTable;
  const ratio=(a,b)=>pooled(a)/pooled(b),fieldRatio=(a,b)=>fieldTable.aloft.armSd[a]/fieldTable.aloft.armSd[b];
  const P={};
  P.S1={pass:ratio('3x10/3','1x12')<=.7&&ratio('4x2.25','1x12')<=.7,'3x10/3':ratio('3x10/3','1x12'),'4x2.25':ratio('4x2.25','1x12'),'2x5.5':ratio('2x5.5','1x12')};
  P.S2={pass:ratio('1x12','1x3')>=.7,ratio:ratio('1x12','1x3')};
  P.S3={pass:ratio('3x4','1x12')<=.85&&ratio('4x3','1x12')<=.85,'3x4':ratio('3x4','1x12'),'4x3':ratio('4x3','1x12')};
  const s12=fieldTable.aloft.sd['12'],p312=fieldTable.aloft.p['3-12'];P.S4={pass:s12>=.15&&s12<=.5&&p312<.8,sd12:s12,p:p312};
  const roof=s=>s.endsWith('/roof'),roofRatio=(a,b)=>median(sources.filter(roof).flatMap(s=>pick(a,s)))/median(sources.filter(roof).flatMap(s=>pick(b,s)));
  P.S5={pass:['2x5.5','3x10/3','4x2.25','3x4','4x3'].every(a=>Math.abs(roofRatio(a,'1x12')-fieldRatio(a,'1x12'))<=.15),rows:Object.fromEntries(['2x5.5','3x10/3','4x2.25','3x4','4x3'].map(a=>[a,{plumeRoofs:+roofRatio(a,'1x12').toFixed(3),field:+fieldRatio(a,'1x12').toFixed(3)}]))};
  P.S6={pass:ratio('2x1','1x3')>=.9,ratio:ratio('2x1','1x3'),field:fieldRatio('2x1','1x3')};
  const tr=a=>median(r.transient.filter(x=>x.a===label(a)).map(x=>x.D_end));P.S7={pass:tr(2.25)<=pooled('4x2.25')&&tr(1)<=pooled('2x1'),'2.25':tr(2.25),'4x2.25':pooled('4x2.25'),'1':tr(1),'2x1':pooled('2x1')};
  const nul=Object.entries(r.controls).filter(([k,v])=>v?.nullControlMax!==undefined).every(([,v])=>v.nullControlMax===0);
  r.summary.controls={nullControl:nul,positive:{pass:pooled('1x1')>pooled('1x12'),'1x1':pooled('1x1'),'1x12':pooled('1x12')},nonFinite:r.controls.nonFinite,libraryCheck:r.controls.libraryCheck?.identical??null,reproduction:r.controls.reproduction.same+' of '+r.controls.reproduction.rows,unconverged:r.runs.missed};
  r.summary.predictions=Object.fromEntries(Object.entries(P).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([a,b])=>[a,typeof b==='number'?+b.toFixed(3):b]))]));
  // R5: the best S at the 13 flow-through budget, if its plume and field ratios both clear their bars.
  const best=['2x5.5','3x10/3','4x2.25'].map(a=>({arm:a,plume:ratio(a,'1x12'),field:fieldRatio(a,'1x12')})).sort((x,y)=>x.plume-y.plume)[0];
  r.summary.rules={R5:{...best,plume:+best.plume.toFixed(3),field:+best.field.toFixed(3),recommend:best.plume<=.85&&best.field<=.9?best.arm:'1x12 (a longer single-seed average)'},
    R6:{plume:+ratio('2x1','1x3').toFixed(3),field:+fieldRatio('2x1','1x3').toFixed(3),transient:P.S7.pass,default:ratio('2x1','1x3')<=.85&&fieldRatio('2x1','1x3')<=.9&&P.S7.pass?'seeds 2, average 1':'seeds 1 (unchanged)'}};
}

// ---------- timing: averaging cost and per-seed setup cost
function timing(){
  const{grid,solid}=buildSite('single'),wind={speed:SPEED,fromDeg:22.5,z0:Z0},rows=[];
  const fields=SEEDS.map(seed=>load('single',{fromDeg:22.5,seed}).field(12));
  const time=(name,run,{passes=9,warm=3}={})=>{const ms=[];for(let p=0;p<warm+passes;p++){const t=process.hrtime.bigint();run();const e=Number(process.hrtime.bigint()-t)/1e6;if(p>=warm)ms.push(e);}ms.sort((a,b)=>a-b);return{name,median:+ms[(passes-1)/2].toFixed(3),min:+ms[0].toFixed(3),max:+ms.at(-1).toFixed(3)};};
  for(const S of[2,4,8])rows.push(time('E7 averageWindFields of '+S+' fields ('+grid.cells+' cells), ms',()=>W.averageWindFields(fields.slice(0,S))));
  rows.push(time('E8 one seed\'s solver setup (createWindSolver: classify, precondition, first projection), ms',()=>W.createWindSolver({grid,solid,wind,turbulence:turbulence(1),tolerance:TOLERANCE})));
  const solver=W.createWindSolver({grid,solid,wind,turbulence:turbulence(1),tolerance:TOLERANCE});solver.run(20);
  rows.push(time('E9 one solver step with gusts (reference), ms',()=>solver.step(),{passes:21,warm:5}));
  return{rig:{cpu:os.cpus()[0].model,threads:os.cpus().length,node:process.version,platform:os.platform()+' '+os.release()},priority:os.getPriority(),rows};
}

if(isMainThread){
  fs.mkdirSync(out,{recursive:true});
  if(!args['normal-priority'])try{os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);}catch(error){console.warn('Could not lower the priority: '+error.message);}
  if((phase==='runs'||phase==='all'||phase==='forcing')&&fs.existsSync(stopFile())){console.log('A STOP file is waiting in '+out+'; remove it to run.');process.exit(0);}
  process.on('SIGINT',()=>{if(stopping)process.exit(130);stopping=true;console.log('Stopping: no new runs; the ones in flight finish first (Ctrl+C again to quit now).');});
  if(phase==='forcing')await forcingPhase();
  if(phase==='runs'||phase==='all')await runPhase();
  if((phase==='compare'||phase==='all')&&!stopping){const r=compare();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(r,null,1));console.log(JSON.stringify({summary:r.summary,tunnels:{plumes:r.tunnels.plumes,puffSteps:r.tunnels.puffSteps,tunnels:r.tunnels.tunnels}},null,1));}
  if(phase==='timing'){const meter=loadMeter(),r=timing();r.load=meter.stop();fs.writeFileSync(path.join(out,'timing.json'),JSON.stringify(r,null,1));console.log(JSON.stringify(r,null,1));}
}
