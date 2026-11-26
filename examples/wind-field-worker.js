// Runs the wind solver off the page's thread and posts cell-centred snapshots.
import {createWindGrid,voxelizeTriangles,fillEnclosed,createWindSolver,bakeWindField,encodeWindField} from '../packages/wind-core/index.js';
let solver=null,running=true,timer=0,sentAt=0,warmUntil=0,generation=0,blockage=0,lastTick=0,simPerSecond=0;
const schedule=()=>{if(!timer&&solver&&running)timer=setTimeout(loop,0);};
// Averaging starts once air has crossed the domain, so the mean forgets the start-up flow.
function flowThrough(){const g=solver.grid,w=solver.wind;return Math.max(g.size[0],g.size[2])*g.cell/Math.max(w.speed,.5);}
function post(){
  const velocity=solver.cellVelocities(),mean=solver.averagedSteps>0?solver.cellVelocities({mean:true}):null,last=solver.last;
  postMessage({type:'field',generation,velocity,mean,stats:{steps:solver.steps,time:solver.time,dt:solver.dt,iterations:last.iterations,divergence:last.divergence,converged:last.converged,
    milliseconds:last.milliseconds??0,averagedSteps:solver.averagedSteps,averagedTime:solver.averagedSteps*solver.dt,warmUntil,blockage,simPerSecond,maxSpeed:solver.maxSpeed()}},mean?[velocity.buffer,mean.buffer]:[velocity.buffer]);
  sentAt=performance.now();
}
function loop(){
  timer=0;if(!solver||!running)return;
  const start=performance.now(),before=solver.time;
  do solver.step();while(performance.now()-start<45);
  const now=performance.now();if(lastTick)simPerSecond=(solver.time-before)/((now-lastTick)/1000);lastTick=now;
  if(!solver.averaging&&solver.time>=warmUntil)solver.startAveraging();
  if(now-sentAt>110)post();
  schedule();
}
onmessage=({data})=>{
  try{
    if(data.type==='site'){
      clearTimeout(timer);timer=0;solver=null;generation=data.generation;
      const started=performance.now(),grid=createWindGrid(data.grid),{solid,marked}=voxelizeTriangles(grid,data.triangles),enclosed=fillEnclosed(grid,solid);
      solver=createWindSolver({grid,solid,wind:data.wind,turbulence:data.turbulence,tolerance:data.tolerance});
      blockage=solver.blockage();warmUntil=solver.time+flowThrough();lastTick=0;
      postMessage({type:'ready',generation,solid:Uint8Array.from(solver.solid,v=>v?1:0),marked,enclosed,cutOff:solver.cutOffCells,milliseconds:performance.now()-started});
      post();schedule();
    }else if(data.type==='wind'&&solver){
      solver.setWind({...data.wind,turbulence:data.turbulence});blockage=solver.blockage();warmUntil=solver.time+flowThrough();solver.stopAveraging();post();
    }else if(data.type==='run'){running=data.running;lastTick=0;if(running)schedule();else{clearTimeout(timer);timer=0;}}
    else if(data.type==='restart'&&solver){solver.reset();warmUntil=flowThrough();solver.stopAveraging();post();}
    else if(data.type==='export'&&solver){postMessage({type:'export',text:JSON.stringify(encodeWindField(bakeWindField(solver,{mean:true})))});}
  }catch(error){postMessage({type:'error',message:String(error?.message||error)});}
};
