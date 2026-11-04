import {createWindSolver} from './solver.js';
import {WIND_FIELD_KIND,WIND_FIELD_VERSION,bakeWindField,sampleWindField,encodeWindField,decodeWindField} from './field.js';
// Baked bearing sets: the mean field at several bearings on one grid, so a game can blow smoke
// at any bearing without running the solver. The solver has no speed scale of its own (no
// viscosity, no buoyancy; the time step, gusts and pressure tolerance all scale with U), so a
// field baked at U0 is exact at U once multiplied by U / U0.
export const WIND_BEARINGS_KIND='nautilus-wind-bearings';
export const WIND_BEARINGS_VERSION=1;
// linear: weights 1 - t and t; slows the free stream by up to cos(gap/2) between bake bearings.
// slerp: weights sin((1 - t) gap) / sin gap and sin(t gap) / sin gap; the free stream is exact
// in speed and direction, and flow that both neighbours share is sped up by as much.
// keep-speed: linear, then each cell's horizontal speed is restored toward the weighted mean of
// the neighbours' speeds, by at most 1 / cos(gap/2); no longer exactly divergence-free.
export const BEARING_BLENDS=Object.freeze(['linear','slerp','keep-speed']);
const turn=deg=>((deg%360)+360)%360;
// count bearings evenly spaced from start, ascending in [0, 360).
export function evenBearings(count=8,start=0){
  if(!Number.isInteger(count)||count<1||count>360)throw Error('A bearing set has 1 to 360 bearings.');if(!Number.isFinite(start))throw Error('The first bearing must be finite.');
  return Array.from({length:count},(_,n)=>turn(start+n*360/count)).sort((a,b)=>a-b);
}
function checkBearings(set){
  if(set?.kind!==WIND_BEARINGS_KIND||set.version!==WIND_BEARINGS_VERSION)throw Error('Not a version '+WIND_BEARINGS_VERSION+' Nautilus wind bearing set.');
  const{bearings,fields}=set;if(!Array.isArray(bearings)||!Array.isArray(fields)||!fields.length||fields.length!==bearings.length)throw Error('A bearing set needs one baked field per bearing.');
  const a=fields[0],cells=a?.size?.[0]*a?.size?.[1]*a?.size?.[2];
  for(const[n,f]of fields.entries()){
    const b=bearings[n],w=f?.wind;
    if(f?.kind!==WIND_FIELD_KIND||f.version!==WIND_FIELD_VERSION||!(f.velocity instanceof Float32Array)||!(f.solid instanceof Uint8Array)||f.velocity.length!==cells*3||f.solid.length!==cells)throw Error('Bearing '+n+' is not a baked wind field.');
    if(!(b>=0&&b<360)||n&&!(b>bearings[n-1]))throw Error('Bearings must be distinct and ascending in [0, 360).');
    if(f.cell!==a.cell||f.size.some((v,i)=>v!==a.size[i])||f.origin.some((v,i)=>v!==a.origin[i]))throw Error('Every bearing must share one grid.');
    if(!w||w.fromDeg!==b||!(w.speed>0)||w.speed!==a.wind.speed||w.z0!==a.wind.z0||w.referenceHeight!==a.wind.referenceHeight)throw Error('Bearing '+n+' must be baked at its own bearing with the set\'s speed and terrain.');
  }
  return set;
}
// Bakes the mean field at each bearing on one grid (give it equal margins on every side). Each
// bearing starts from the bare inflow profile, warms up for `warmup` flow-throughs (the longer
// horizontal side over the reference speed) and averages over `average` more, so no bearing
// depends on the order of the bake. Viscosity and a fixed dt are not offered: either would give
// the bake a speed scale of its own.
export function bakeWindBearings({grid,solid,bearings=8,wind={},turbulence={gain:1},warmup=1,average=3,tolerance,advection,cfl,maxIterations,onBearing=null}={}){
  const list=Array.isArray(bearings)?bearings.map(turn).sort((a,b)=>a-b):evenBearings(bearings);
  if(!list.length||list.some((b,n)=>!Number.isFinite(b)||n&&b===list[n-1]))throw Error('Bake bearings must be finite and distinct.');
  if(!(wind.speed>0))throw Error('A bake needs a positive reference speed.');
  if(!(warmup>=0&&Number.isFinite(warmup))||!(average>0&&Number.isFinite(average)))throw Error('Warm-up and averaging are flow-throughs: warmup >= 0 and average > 0.');
  const fields=[],unconverged=[],flow=Math.max(grid?.size?.[0],grid?.size?.[2])*grid?.cell/wind.speed;
  for(const[index,fromDeg]of list.entries()){
    const solver=createWindSolver({grid,solid,wind:{...wind,fromDeg},turbulence,tolerance,advection,cfl,maxIterations}),steps=f=>Math.round(f*flow/solver.dt);let missed=0;
    for(let n=steps(warmup);n>0;n--)if(!solver.step().converged)missed++;
    solver.startAveraging();for(let n=Math.max(1,steps(average));n>0;n--)if(!solver.step().converged)missed++;
    const field=bakeWindField(solver);fields.push(field);unconverged.push(missed);onBearing?.({index,count:list.length,fromDeg,field,unconverged:missed});
  }
  return{kind:WIND_BEARINGS_KIND,version:WIND_BEARINGS_VERSION,bearings:list,warmup,average,unconverged,fields};
}
// The two baked bearings either side of fromDeg, i then j clockwise, t of the way from i to j.
function bracket(bearings,fromDeg){
  const n=bearings.length,theta=turn(fromDeg);if(n===1)return{i:0,j:0,t:0,gap:0};
  let i=n-1;for(let k=0;k<n&&bearings[k]<=theta;k++)i=k;
  const j=(i+1)%n,gap=turn(bearings[j]-bearings[i]);return{i,j,t:turn(theta-bearings[i])/gap,gap};
}
// The mean field at any bearing and speed (m/s at the set's reference height), blended from the
// two baked bearings either side. The result is an ordinary wind field on the set's grid, so
// sampleWindField and advectTracers take it unchanged; pass the previous result as `into` to
// reuse its buffers. At a baked bearing it is that field times speed / baked speed.
export function blendWindBearings(set,{fromDeg,speed,blend='slerp'}={},into=null){
  checkBearings(set);if(!BEARING_BLENDS.includes(blend))throw Error('Blend is one of '+BEARING_BLENDS.join(', ')+'.');
  if(!Number.isFinite(fromDeg))throw Error('Wind bearing must be finite.');if(!(speed>=0&&Number.isFinite(speed)))throw Error('Wind speed must be finite and non-negative.');
  const{bearings,fields}=set,a=fields[0],cells=a.solid.length,{i,j,t,gap}=bracket(bearings,fromDeg),s=speed/a.wind.speed;
  let wa=1-t,wb=t,limit=1;
  if(gap&&blend!=='linear'){const d=gap*Math.PI/180;if(!(gap<180))throw Error(blend+' needs bake bearings less than 180 degrees apart.');if(blend==='slerp'){wa=Math.sin((1-t)*d)/Math.sin(d);wb=Math.sin(t*d)/Math.sin(d);}else limit=1/Math.cos(d/2);}
  const out=into||{kind:WIND_FIELD_KIND,version:WIND_FIELD_VERSION,axes:['x','height','z'],units:'m/s',velocity:new Float32Array(cells*3),solid:new Uint8Array(cells)};
  if(!(out.velocity instanceof Float32Array)||out.velocity.length!==cells*3||!(out.solid instanceof Uint8Array)||out.solid.length!==cells)throw Error('Blend into a field from the same bearing set.');
  const va=fields[i].velocity,vb=fields[j].velocity,sa=fields[i].solid,sb=fields[j].solid,v=out.velocity,solid=out.solid,ka=wa*s,kb=wb*s,ua=wa!==0,ub=wb!==0;
  for(let c=0,o=0;c<cells;c++,o+=3){
    if(ua&&sa[c]||ub&&sb[c]){solid[c]=1;v[o]=v[o+1]=v[o+2]=0;continue;}
    let x=ka*va[o]+kb*vb[o],z=ka*va[o+2]+kb*vb[o+2];
    if(limit>1){const h=Math.hypot(x,z);if(h>0){let g=(ka*Math.hypot(va[o],va[o+2])+kb*Math.hypot(vb[o],vb[o+2]))/h;if(g>limit)g=limit;if(g>1){x*=g;z*=g;}}}
    solid[c]=0;v[o]=x;v[o+1]=ka*va[o+1]+kb*vb[o+1];v[o+2]=z;
  }
  return Object.assign(out,{origin:[...a.origin],cell:a.cell,size:[...a.size],wind:{speed,fromDeg,z0:a.wind.z0,referenceHeight:a.wind.referenceHeight},mean:true,
    blend:{mode:blend,bearings:[bearings[i],bearings[j]],weights:[wa,wb]}});
}
// A host's handle on a bearing set: sample() reads the current blend, and setWind() blends again
// only when the bearing or speed changes. One trilinear lookup per sample either way.
export function createWindBearingSampler(set,{fromDeg,speed,blend='slerp'}={}){
  checkBearings(set);let field=null,key='';
  const api={
    get field(){return field;},get fromDeg(){return field.wind.fromDeg;},get speed(){return field.wind.speed;},
    setWind({fromDeg:bearing=field.wind.fromDeg,speed:u=field.wind.speed}={}){const next=bearing+' '+u;if(next!==key){field=blendWindBearings(set,{fromDeg:bearing,speed:u,blend},field);key=next;}return api;},
    sample(x,y,z,out=[0,0,0]){return sampleWindField(field,x,y,z,out);}
  };
  return api.setWind({fromDeg:fromDeg??set.bearings[0],speed:speed??set.fields[0].wind.speed});
}
// JSON-safe form: each bearing's field in the wind field encoding.
export function encodeWindBearings(set){checkBearings(set);return{...set,fields:set.fields.map(encodeWindField)};}
export function decodeWindBearings(json){
  const record=typeof json==='string'?JSON.parse(json):json;if(!Array.isArray(record?.fields))throw Error('Not a Nautilus wind bearing set.');
  return checkBearings({...record,fields:record.fields.map(decodeWindField)});
}
