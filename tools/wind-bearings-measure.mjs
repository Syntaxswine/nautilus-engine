// The registered measurement in docs/reviews/2026-11-04-wind-bearings-smoke.md: how far smoke
// carried by blended bearing bakes strays from smoke in the exact-bearing field and in the live
// solver, and what a tracer sample costs. Not a gate: it records numbers and verdicts.
//   node tools/wind-bearings-measure.mjs --out <dir> [--jobs 6] [--sites single,street] [--phase runs|compare|timing|all]
// Runs write each bearing's mean-field snapshots under <dir>/runs and are skipped when present.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';import {fileURLToPath} from 'node:url';
import * as T from '../packages/render-effects/three.js';
import {createBuildingModel} from '../packages/building-catalog/three.js';
import * as W from '../packages/wind-core/index.js';

const SELF=fileURLToPath(import.meta.url);
// The page's layouts (examples/wind-field.js): footprint centres, compass turns, margins.
const SITES={
  single:{margin:3,height:3,buildings:[{id:'rowan-family',x:0,z:0,turn:0}],roof:0},
  street:{margin:2,height:2.5,buildings:[{id:'narrow-court',x:-5,z:11.5,turn:0},{id:'batten-general-store',x:5,z:11,turn:0},{id:'mews-corner',x:-5,z:-9.5,turn:180},{id:'market-terrace',x:5,z:-10,turn:180}],roof:3,street:{x:5,y:1.5}}
};
// --dry shrinks every flow-through count 60-fold and the tracking to 1 s: a plumbing check whose
// numbers mean nothing. Averages keep their registered labels.
const DRY=process.argv.includes('--dry')||Boolean(workerData?.dry),SCALE=DRY?1/60:1;
const SPEED=6,Z0=.25,AVERAGES=[1.5,3,6,12],WARMUP=1,TOLERANCE=2e-4,BATCH_EVERY=DRY?.1:1,TRACK=DRY?1:20,LIVE_PUFFS=100,PUFFS=400;
const SMOKE={rise:1.1,riseTime:5,spread:.12,jitter:.15};
const turbulence=seed=>({gain:1,lengthScale:20,modes:32,seed});
const key=({fromDeg,seed,speed})=>'b'+fromDeg+'-s'+seed+'-u'+speed;

function buildSite(name){
  const def=SITES[name],site=new T.Group(),holders=[];
  for(const b of def.buildings){const model=createBuildingModel(T,b.id),holder=new T.Group(),m=model.building;model.root.position.set(-m.width/2,0,-m.depth/2);holder.add(model.root);holder.position.set(b.x,0,b.z);holder.rotation.y=-b.turn*Math.PI/180;site.add(holder);holders.push({holder,model});}
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
const solidTest=(grid,solid)=>W.windFieldSolid({origin:grid.origin,cell:grid.cell,size:grid.size,solid});
// A smoke ensemble released together at t = 0 from source, then carried for steps; returns
// its centroid after every step (index 0 is the source).
function plume(sample,source,{dt,steps,count=PUFFS,seed=1,blocked=null,spread=SMOKE.spread,jitter=SMOKE.jitter}){
  const smoke=W.createSmoke({capacity:count,rate:(count+.5)/dt,lifetime:1e9,rise:SMOKE.rise,riseTime:SMOKE.riseTime,spread,jitter,seed,blocked});smoke.addEmitter(source);
  const path=new Float64Array((steps+1)*3);path.set([source.x,source.y,source.z]);
  for(let n=1;n<=steps;n++){smoke.step(sample,dt);if(n===1){if(smoke.count!==count)throw Error('Released '+smoke.count+' of '+count+' puffs.');smoke.removeEmitter(0);}
    let x=0,y=0,z=0;const p=smoke.positions;for(let q=0;q<count;q++){x+=p[q*3];y+=p[q*3+1];z+=p[q*3+2];}path[n*3]=x/count;path[n*3+1]=y/count;path[n*3+2]=z/count;}
  return path;
}

// ---------- one run: warm-up, averaging with snapshots, live batches in the running field
function runJob({site,fromDeg,seed,speed,check}){
  const{grid,solid,sources}=buildSite(site),wind={speed,fromDeg,z0:Z0},started=performance.now();
  const solver=W.createWindSolver({grid,solid,wind,turbulence:turbulence(seed),tolerance:TOLERANCE}),dt=solver.dt,flow=Math.max(grid.size[0],grid.size[2])*grid.cell/speed,steps=f=>Math.round(f*SCALE*flow/dt);
  let missed=0;for(let n=steps(WARMUP);n>0;n--)if(!solver.step().converged)missed++;
  solver.startAveraging();const marks=new Map(AVERAGES.map(a=>[Math.max(1,steps(a)),a])),total=Math.max(...marks.keys()),track=Math.ceil(TRACK/dt),snapshots={},transfer=[];
  const live=sources.map(()=>[]),active=[],blocked=solidTest(grid,solver.solid),sample=(x,y,z,out)=>solver.sample(x,y,z,out);let batch=0;
  for(let n=1;n<=total;n++){
    const t=(n-1)*dt;
    if(t>=batch*BATCH_EVERY&&n-1+track<=total){for(const[s,source]of sources.entries())active.push({s,source,released:t,n:0,path:new Float32Array((track+1)*3),smoke:W.createSmoke({capacity:LIVE_PUFFS,rate:(LIVE_PUFFS+.5)/dt,lifetime:1e9,...SMOKE,seed:1000+batch,blocked})});batch++;}
    if(!solver.step().converged)missed++;
    for(let a=active.length-1;a>=0;a--){const b=active[a],sm=b.smoke;if(b.n===0){sm.addEmitter(b.source);b.path.set([b.source.x,b.source.y,b.source.z]);}
      sm.step(sample,dt);if(b.n===0){if(sm.count!==LIVE_PUFFS)throw Error('Released '+sm.count+' live puffs.');sm.removeEmitter(0);}b.n++;let x=0,y=0,z=0;for(let q=0;q<sm.count;q++){x+=sm.positions[q*3];y+=sm.positions[q*3+1];z+=sm.positions[q*3+2];}
      b.path[b.n*3]=x/sm.count;b.path[b.n*3+1]=y/sm.count;b.path[b.n*3+2]=z/sm.count;if(b.n===track){live[b.s].push({released:+b.released.toFixed(4),path:Array.from(b.path,v=>+v.toFixed(4))});active.splice(a,1);}}
    if(marks.has(n)){const f=W.bakeWindField(solver);snapshots[marks.get(n)]=f.velocity;transfer.push(f.velocity.buffer);}
  }
  const meta={site,fromDeg,seed,speed,dt,steps:solver.steps,warmSteps:steps(WARMUP),marks:[...marks].map(([n,a])=>({average:a,averagedSteps:n})),missed,seconds:(performance.now()-started)/1000,
    grid:{origin:[...grid.origin],cell:grid.cell,size:[...grid.size]},sources,cutOff:solver.cutOffCells};
  // The instrument's bake must be the library's: one bearing per site, bit for bit.
  if(check){const set=W.bakeWindBearings({grid,solid,bearings:[fromDeg],wind,turbulence:turbulence(seed),warmup:WARMUP*SCALE,average:3*SCALE,tolerance:TOLERANCE}),a=set.fields[0].velocity,b=snapshots[3];
    meta.libraryCheck={values:a.length,identical:a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]))};}
  const fieldSolid=Uint8Array.from(solver.solid,v=>v?1:0);transfer.push(fieldSolid.buffer);
  return{meta,live,snapshots,solid:fieldSolid,transfer};
}
if(!isMainThread){const{transfer,...result}=runJob(workerData);parentPort.postMessage(result,transfer);}

// ---------- files
const args=Object.fromEntries(process.argv.slice(2).reduce((list,arg,i,all)=>arg.startsWith('--')?[...list,[arg.slice(2),all[i+1]?.startsWith('--')||all[i+1]===undefined?true:all[i+1]]]:list,[]));
const out=path.resolve(String(args.out||'artifacts/wind-bearings')),jobs=Number(args.jobs||Math.max(1,os.cpus().length/2-2)),sites=String(args.sites||'single,street').split(','),phase=String(args.phase||'all');
const runDir=site=>path.join(out,'runs',site);
function save(result){const{meta,live,snapshots,solid}=result,dir=runDir(meta.site),k=key(meta);fs.mkdirSync(dir,{recursive:true});
  for(const[a,v]of Object.entries(snapshots))fs.writeFileSync(path.join(dir,k+'-a'+a+'.f32'),Buffer.from(v.buffer,v.byteOffset,v.byteLength));
  fs.writeFileSync(path.join(dir,k+'.solid'),solid);fs.writeFileSync(path.join(dir,k+'.json'),JSON.stringify({meta,live}));}
const has=(site,spec)=>fs.existsSync(path.join(runDir(site),key(spec)+'.json'));
function load(site,spec){const dir=runDir(site),k=key(spec),{meta,live}=JSON.parse(fs.readFileSync(path.join(dir,k+'.json'),'utf8')),solid=new Uint8Array(fs.readFileSync(path.join(dir,k+'.solid')));
  const field=a=>{const bytes=fs.readFileSync(path.join(dir,k+'-a'+a+'.f32')),velocity=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),mark=meta.marks.find(m=>m.average===a);
    return{kind:W.WIND_FIELD_KIND,version:W.WIND_FIELD_VERSION,...meta.grid,axes:['x','height','z'],units:'m/s',wind:{speed:spec.speed,fromDeg:spec.fromDeg,z0:Z0,referenceHeight:10},mean:true,averagedSteps:mark.averagedSteps,steps:meta.warmSteps+mark.averagedSteps,velocity,solid};};
  return{meta,live,field};}

const bearings16=W.evenBearings(16),quarter=W.evenBearings(8,11.25),mid8=W.evenBearings(8,22.5);
function specs(site){
  const list=[...bearings16,...quarter].map(fromDeg=>({site,fromDeg,seed:1,speed:SPEED,check:fromDeg===0}));
  for(const fromDeg of[22.5,202.5])list.push({site,fromDeg,seed:2,speed:SPEED});
  if(site==='single')for(const speed of[3,9])list.push({site,fromDeg:225,seed:1,speed});
  return list;
}
async function runPhase(){
  const queue=sites.flatMap(specs).filter(s=>!has(s.site,s)),total=queue.length;let done=0;
  console.log(JSON.stringify({phase:'runs',pending:total,jobs,cpus:os.cpus().length}));
  await Promise.all(Array.from({length:Math.min(jobs,total)},async()=>{
    while(queue.length){const spec=queue.shift();
      const result=await new Promise((resolve,reject)=>{const w=new Worker(SELF,{workerData:{...spec,dry:DRY}});w.once('message',resolve);w.once('error',reject);w.once('exit',code=>{if(code)reject(Error('Run '+key(spec)+' exited '+code));});});
      save(result);done++;console.log(JSON.stringify({done,total,site:spec.site,run:key(spec),seconds:+result.meta.seconds.toFixed(1),steps:result.meta.steps,missed:result.meta.missed,libraryCheck:result.meta.libraryCheck}));}
  }));
}

// ---------- compare
const median=v=>{const s=[...v].sort((a,b)=>a-b),n=s.length;return n?n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2:NaN;};
const dist=(p,a,q,b)=>Math.hypot(p[a*3]-q[b*3],p[a*3+1]-q[b*3+1],p[a*3+2]-q[b*3+2]);
const heading=(p,q,k,s)=>{const a=Math.atan2(p[k*3+2]-s.z,p[k*3]-s.x),b=Math.atan2(q[k*3+2]-s.z,q[k*3]-s.x);return Math.abs(((a-b)*180/Math.PI%360+540)%360-180);};
function uniformWind(fromDeg,speed){const[dx,dz]=W.windDirection(fromDeg),denominator=Math.log((10+Z0)/Z0);return(x,y,z,out)=>{const u=y<=0?0:speed*Math.log((y+Z0)/Z0)/denominator;out[0]=u*dx;out[1]=0;out[2]=u*dz;return out;};}
const scaled=(field,k)=>({...field,velocity:Float32Array.from(field.velocity,v=>v*k)});
function compare(){
  const results={rig:{cpu:os.cpus()[0].model,threads:os.cpus().length,node:process.version,platform:os.platform()+' '+os.release()},rows:[],noise:[],live:[],speed:null,controls:{},summary:{}};
  let nonFinite=0;const finite=p=>{for(const v of p)if(!Number.isFinite(v))nonFinite++;return p;};
  for(const site of sites){
    const cache=new Map(),run=spec=>{const k=key(spec);if(!cache.has(k))cache.set(k,load(site,spec));return cache.get(k);},base=run({fromDeg:0,seed:1,speed:SPEED}),{meta}=base,dt=meta.dt,maxSteps=Math.ceil(TRACK/dt);
    const g=meta.grid,limit=k=>{return(p)=>{const x=p[k*3],y=p[k*3+1],z=p[k*3+2];return x<g.origin[0]+2||x>g.origin[0]+g.size[0]*g.cell-2||z<g.origin[2]+2||z>g.origin[2]+g.size[2]*g.cell-2||y>g.size[1]*g.cell-2;};};
    const setOf=(list,A)=>({kind:W.WIND_BEARINGS_KIND,version:W.WIND_BEARINGS_VERSION,bearings:list,warmup:WARMUP,average:A,unconverged:list.map(()=>0),fields:list.map(b=>run({fromDeg:b,seed:1,speed:SPEED}).field(A))});
    const sets={8:{3:setOf(W.evenBearings(8),3),12:setOf(W.evenBearings(8),12)},16:{3:setOf(bearings16,3),12:setOf(bearings16,12)}};
    const fieldArm=field=>({sample:(x,y,z,out)=>W.sampleWindField(field,x,y,z,out),blocked:W.windFieldSolid(field)});
    for(const source of meta.sources){
      const label=site+'/'+source.id;
      for(const[set,targets]of[[8,mid8],[16,quarter],[8,quarter]]){
        for(const fromDeg of targets){
          const truthRun=run({fromDeg,seed:1,speed:SPEED}),truth=truthRun.field(12),truthArm=fieldArm(truth),truthPath=finite(plume(truthArm.sample,source,{dt,steps:maxSteps,blocked:truthArm.blocked}));
          let end=maxSteps;for(let k=1;k<=maxSteps;k++)if(limit(k)(truthPath)){end=k-1;break;}
          const L=dist(truthPath,end,Float64Array.of(source.x,source.y,source.z),0),row={source:label,set,target:fromDeg,kind:set===8&&targets===quarter?'quarter':'midpoint',T_end:+(end*dt).toFixed(3),L_end:+L.toFixed(3),arms:{}};
          const line={dt,steps:end,count:1,spread:0,jitter:0},truthLine=finite(plume(truthArm.sample,source,{...line,blocked:truthArm.blocked}));
          const add=(name,sample,blocked)=>{const p=finite(plume(sample,source,{dt,steps:end,blocked}));let worst=0;for(let k=0;k<=end;k++)worst=Math.max(worst,dist(p,k,truthPath,k));
            const centre=finite(plume(sample,source,{...line,blocked}));
            row.arms[name]={D_end:+dist(p,end,truthPath,end).toFixed(4),rel:+(dist(p,end,truthPath,end)/L).toFixed(5),D_max:+worst.toFixed(4),heading:+heading(p,truthPath,end,source).toFixed(3),centreline:+dist(centre,end,truthLine,end).toFixed(4)};return p;};
          const gap=360/set;
          for(const A of[3,12]){for(const blend of W.BEARING_BLENDS){const f=W.blendWindBearings(sets[set][A],{fromDeg,speed:SPEED,blend});add(blend+'-'+A,...Object.values(fieldArm(f)));}
            const near=sets[set][A].fields[sets[set][A].bearings.indexOf(Math.floor(fromDeg/gap)*gap)];add('nearest-'+A,...Object.values(fieldArm(near)));}
          add('exact-3',...Object.values(fieldArm(truthRun.field(3))));
          add('uniform',uniformWind(fromDeg,SPEED),null);
          // Null control: the truth against a bit-identical copy of itself.
          if(!results.controls[label]){const copy={...truth,velocity:truth.velocity.slice()},p=plume(fieldArm(copy).sample,source,{dt,steps:end,blocked:fieldArm(copy).blocked});let d=0;for(let k=0;k<=end;k++)d=Math.max(d,dist(p,k,truthPath,k));results.controls[label]={nullControlMax:d};}
          // Live smoke in the running solver at this bearing, against the slerp bake and the truth.
          if(row.kind==='midpoint'){
            const batches=truthRun.live[meta.sources.indexOf(source)],mean=new Float64Array((end+1)*3);if(!batches?.length)throw Error('No live batches for '+label+' at '+fromDeg);
            for(const b of batches)for(let k=0;k<=end*3+2;k++)mean[k]+=b.path[k]/batches.length;
            let scatter=0;for(const b of batches)scatter+=(b.path[end*3]-mean[end*3])**2+(b.path[end*3+1]-mean[end*3+1])**2+(b.path[end*3+2]-mean[end*3+2])**2;scatter=Math.sqrt(scatter/batches.length);
            const baked=fieldArm(W.blendWindBearings(sets[set][3],{fromDeg,speed:SPEED,blend:'slerp'})),slerp3=plume(baked.sample,source,{dt,steps:end,blocked:baked.blocked});
            // Supplementary, added after the runs and outside P7: the other blends against the same live mean.
            const toLive=blend=>{const a=fieldArm(W.blendWindBearings(sets[set][3],{fromDeg,speed:SPEED,blend}));return+dist(plume(a.sample,source,{dt,steps:end,blocked:a.blocked}),end,mean,end).toFixed(4);};
            results.live.push({source:label,set,target:fromDeg,batches:batches.length,T_end:row.T_end,scatter:+scatter.toFixed(4),slerp3ToLive:+dist(slerp3,end,mean,end).toFixed(4),truthToLive:+dist(truthPath,end,mean,end).toFixed(4),
              supplementary:{linear3ToLive:toLive('linear'),keepSpeed3ToLive:toLive('keep-speed'),uniformToLive:+dist(plume(uniformWind(fromDeg,SPEED),source,{dt,steps:end}),end,mean,end).toFixed(4)}});
          }
          results.rows.push(row);
        }
      }
      // Noise floor: seed 2 against seed 1 at the same bearing and averaging.
      for(const fromDeg of[22.5,202.5]){const one=run({fromDeg,seed:1,speed:SPEED}),two=run({fromDeg,seed:2,speed:SPEED}),truthRow=results.rows.find(r=>r.source===label&&r.set===8&&r.target===fromDeg&&r.kind==='midpoint'),end=Math.round(truthRow.T_end/dt);
        for(const A of AVERAGES){const a=fieldArm(one.field(A)),b=fieldArm(two.field(A)),p=plume(a.sample,source,{dt,steps:end,blocked:a.blocked}),q=plume(b.sample,source,{dt,steps:end,blocked:b.blocked});results.noise.push({source:label,target:fromDeg,average:A,D_end:+dist(p,end,q,end).toFixed(4)});}}
    }
    // Speed: 225 degrees baked at 3, 6 and 9 m/s.
    if(site==='single'){
      const at=speed=>run({fromDeg:225,seed:1,speed}),six=at(6),exact=AVERAGES.map(A=>{const a=at(3).field(A).velocity,b=six.field(A).velocity;let same=0;for(let i=0;i<a.length;i++)if(Object.is(2*a[i],b[i]))same++;return{average:A,values:a.length,exact:same};});
      // The window comes from the 9 m/s plume itself, by the rule that sets T_end.
      const source=meta.sources[0],nine=at(9).field(12),from6=scaled(six.field(12),1.5),dt9=at(9).meta.dt,cap=Math.ceil(TRACK/dt9),a9=fieldArm(nine),a6=fieldArm(from6),reference=plume(a9.sample,source,{dt:dt9,steps:cap,blocked:a9.blocked});
      let end=cap;for(let k=1;k<=cap;k++)if(limit(k)(reference)){end=k-1;break;}
      const p=reference,q=plume(a6.sample,source,{dt:dt9,steps:end,blocked:a6.blocked});
      let largest=0;for(let i=0;i<nine.velocity.length;i++)largest=Math.max(largest,Math.abs(nine.velocity[i]-from6.velocity[i]));
      results.speed={exact,nineVsScaled:{D_end:+dist(p,end,q,end).toFixed(4),T_end:+(end*dt9).toFixed(3),largestDifference:+largest.toFixed(5)}};
    }
  }
  results.controls.nonFinite=nonFinite;
  verdicts(results);
  return results;
}

// ---------- the registered predictions and decision rules, as written
function verdicts(r){
  const sources=[...new Set(r.rows.map(x=>x.source))],pick=(source,set,kind,arm,f='D_end')=>r.rows.filter(x=>x.source===source&&x.set===set&&x.kind===kind).map(x=>x.arms[arm][f]);
  const m=(source,set,kind,arm,f)=>median(pick(source,set,kind,arm,f)),pooled=(set,kind,arm)=>median(sources.flatMap(s=>pick(s,set,kind,arm)));
  const noise=(source,A)=>median(r.noise.filter(x=>x.source===source&&x.average===A).map(x=>x.D_end)),pooledNoise=A=>median(r.noise.filter(x=>x.average===A).map(x=>x.D_end));
  const each=f=>Object.fromEntries(sources.map(s=>[s,f(s)])),all=o=>Object.values(o).every(v=>v.pass);
  const table={};
  for(const s of sources){table[s]={};for(const arm of['slerp-12','linear-12','keep-speed-12','nearest-12','slerp-3','linear-3','keep-speed-3','nearest-3','exact-3','uniform'])table[s][arm]={mid8:+m(s,8,'midpoint',arm).toFixed(3),mid8rel:+m(s,8,'midpoint',arm,'rel').toFixed(4),quarter8:+m(s,8,'quarter',arm).toFixed(3),mid16:+m(s,16,'midpoint',arm).toFixed(3)};
    table[s].noise=Object.fromEntries(AVERAGES.map(A=>[A,+noise(s,A).toFixed(3)]));table[s].L_end=+median(r.rows.filter(x=>x.source===s&&x.set===8&&x.kind==='midpoint').map(x=>x.L_end)).toFixed(2);}
  r.summary.medians=table;
  const P={};
  P.P1=each(s=>{const a=m(s,8,'midpoint','nearest-12'),b=m(s,8,'midpoint','slerp-12');return{pass:a>2*b,nearest:a,slerp:b};});
  P.P2=each(s=>{const a=m(s,8,'midpoint','uniform'),b=m(s,8,'midpoint','slerp-12');return{pass:a>2*b,uniform:a,slerp:b};});
  P.P3=each(s=>{const sl=m(s,8,'midpoint','slerp-12'),li=m(s,8,'midpoint','linear-12'),ke=m(s,8,'midpoint','keep-speed-12');return{pass:sl<li&&Math.abs(ke-sl)<=.25*sl,slerp:sl,linear:li,keepSpeed:ke};});
  P.P4=each(s=>{const a=m(s,16,'midpoint','slerp-12'),b=m(s,8,'midpoint','slerp-12');return{pass:a<b,slerp16:a,slerp8:b};});
  P.P5=each(s=>{const rel=m(s,8,'midpoint','slerp-12','rel'),bound=s.endsWith('/street')?.1:.05;return{pass:rel<=bound,rel,bound};});
  P.P6=each(s=>{const n3=noise(s,3),n12=noise(s,12),b=m(s,8,'midpoint','slerp-12');return{pass:n3>b&&n12/n3>=.3&&n12/n3<=.7,noise3:n3,noise12:n12,ratio:n12/n3,slerp8:b};});
  P.P7=each(s=>{const rows=r.live.filter(x=>x.source===s&&x.set===8),inside=rows.filter(x=>x.slerp3ToLive<x.scatter).length;return{pass:inside>=7,inside,of:rows.length};});
  P.P8=r.speed?{pass:r.speed.exact.every(x=>x.exact===x.values)&&r.speed.nineVsScaled.D_end<noise('single/roof',12),exact:r.speed.exact,nine:r.speed.nineVsScaled,noise12:noise('single/roof',12)}:null;
  r.summary.predictions=Object.fromEntries(Object.entries(P).map(([k,v])=>[k,v&&('pass'in v)?v:{pass:all(v),bySource:v}]));
  const sl=pooled(8,'midpoint','slerp-12'),li=pooled(8,'midpoint','linear-12'),ke=pooled(8,'midpoint','keep-speed-12'),s16=pooled(16,'midpoint','slerp-12'),n12=pooledNoise(12),n3=pooledNoise(3);
  // Slerp unless keep-speed is more than 10 % lower or linear is lower; if both, the lower of them.
  const rivals=[['keep-speed',ke,ke<.9*sl],['linear',li,li<sl]].filter(x=>x[2]).sort((a,b)=>a[1]-b[1]),defaultBlend=rivals.length?rivals[0][0]:'slerp';
  let average=3;if(!(n3<=sl)){average=pooledNoise(6)<=sl?6:pooledNoise(12)<=sl?12:'neither 6 nor 12 reaches it';}
  r.summary.rules={R1:{slerp:sl,linear:li,keepSpeed:ke,default:defaultBlend},R2:{slerp16:s16,slerp8:sl,noise12:n12,recommend:s16<.5*sl&&sl>n12?16:8},R3:{noise3:n3,noise6:pooledNoise(6),noise12:n12,slerp8:sl,average},
    R4:Object.entries(P.P2).filter(([,v])=>!v.pass).map(([s])=>s)};
}

// ---------- timing (E1-E6)
function timing(){
  const site='single',load1=spec=>load(site,spec),near=[0,22.5].map(fromDeg=>load1({fromDeg,seed:1,speed:SPEED}).field(3)),set={kind:W.WIND_BEARINGS_KIND,version:W.WIND_BEARINGS_VERSION,bearings:[0,22.5],warmup:1,average:3,unconverged:[0,0],fields:near};
  const field=W.blendWindBearings(set,{fromDeg:11.25,speed:SPEED}),g=field,random=W.seededRandom(77),N=1e6,P=new Float64Array(N*3);
  for(let n=0;n<N;n++){P[n*3]=g.origin[0]+random()*g.size[0]*g.cell;P[n*3+1]=random()*g.size[1]*g.cell;P[n*3+2]=g.origin[2]+random()*g.size[2]*g.cell;}
  const time=(name,run,{passes=9,warm=3,per=N}={})=>{const ns=[];let check=0;for(let p=0;p<warm+passes;p++){const t=process.hrtime.bigint();check+=run();const e=Number(process.hrtime.bigint()-t);if(p>=warm)ns.push(e/per);}ns.sort((a,b)=>a-b);
    return{name,median:+ns[(passes-1)/2].toFixed(2),min:+ns[0].toFixed(2),max:+ns.at(-1).toFixed(2),check:+check.toFixed(3)};};
  const out=[0,0,0],a=[0,0,0],b=[0,0,0],d=Math.PI/8,wa=Math.sin(.5*d)/Math.sin(d),wb=wa,uni=uniformWind(11.25,SPEED);
  const rows=[];
  rows.push(time('E1 sampleWindField, blended field',()=>{let s=0;for(let n=0;n<N;n++){W.sampleWindField(field,P[n*3],P[n*3+1],P[n*3+2],out);s+=out[0];}return s;}));
  rows.push(time('E2 two bakes sampled and blended per call',()=>{let s=0;for(let n=0;n<N;n++){W.sampleWindField(near[0],P[n*3],P[n*3+1],P[n*3+2],a);W.sampleWindField(near[1],P[n*3],P[n*3+1],P[n*3+2],b);out[0]=wa*a[0]+wb*b[0];out[1]=wa*a[1]+wb*b[1];out[2]=wa*a[2]+wb*b[2];s+=out[0];}return s;}));
  rows.push(time('E3 uniform log law',()=>{let s=0;for(let n=0;n<N;n++){uni(P[n*3],P[n*3+1],P[n*3+2],out);s+=out[0];}return s;}));
  const{grid,solid}=buildSite(site),solver=W.createWindSolver({grid,solid,wind:{speed:SPEED,fromDeg:11.25,z0:Z0},turbulence:turbulence(1),tolerance:TOLERANCE});solver.run(20);
  rows.push(time('E4 live solver.sample',()=>{let s=0;for(let n=0;n<N;n++){solver.sample(P[n*3],P[n*3+1],P[n*3+2],out);s+=out[0];}return s;}));
  const source=load1({fromDeg:0,seed:1,speed:SPEED}).meta.sources[0],dt=solver.dt,blocked=W.windFieldSolid(field),sample=(x,y,z,o)=>W.sampleWindField(field,x,y,z,o);
  // Setup and the release step stay outside the clock; 40 steps of 1,000 puffs are timed.
  {const ns=[];for(let p=0;p<12;p++){const smoke=W.createSmoke({capacity:1000,rate:1000.5/dt,lifetime:1e9,...SMOKE,seed:3+p,blocked});smoke.addEmitter(source);smoke.step(sample,dt);smoke.removeEmitter(0);
    const t=process.hrtime.bigint();for(let k=0;k<40;k++)smoke.step(sample,dt);const e=Number(process.hrtime.bigint()-t);if(smoke.count!==1000)throw Error('Lost puffs in E5.');if(p>=3)ns.push(e/40/1000);}
    ns.sort((a,b)=>a-b);rows.push({name:'E5 createSmoke.step per puff (1,000 puffs, spread, blocked)',median:+ns[4].toFixed(2),min:+ns[0].toFixed(2),max:+ns.at(-1).toFixed(2)});}
  for(const blend of W.BEARING_BLENDS){let turn=0;const into=W.blendWindBearings(set,{fromDeg:5,speed:SPEED,blend});rows.push(time('E6 blendWindBearings '+blend+' per call ('+field.solid.length+' cells)',()=>{turn=(turn+1)%20;W.blendWindBearings(set,{fromDeg:1+turn,speed:SPEED,blend},into);return into.velocity[3];},{per:1,passes:21,warm:5}));}
  return{rig:{cpu:os.cpus()[0].model,threads:os.cpus().length,node:process.version,platform:os.platform()+' '+os.release()},positions:N,cells:field.solid.length,rows};
}

if(isMainThread){
  fs.mkdirSync(out,{recursive:true});
  if(phase==='runs'||phase==='all')await runPhase();
  if(phase==='compare'||phase==='all'){const r=compare();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(r,null,1));console.log(JSON.stringify({summary:r.summary,controls:r.controls,speed:r.speed},null,1));}
  if(phase==='timing'){const r=timing();fs.writeFileSync(path.join(out,'timing.json'),JSON.stringify(r,null,1));console.log(JSON.stringify(r,null,1));}
}
