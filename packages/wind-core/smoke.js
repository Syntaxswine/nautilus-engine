import {advectTracers} from './field.js';
import {seededRandom} from './turbulence.js';
// Smoke for games: emitters release puffs that ride any wind sample(x, y, z, out), live or
// baked. A puff rises while it is warm (an upward drift of rise * exp(-age / riseTime) m/s,
// standing in for buoyancy; it does not lift the air), spreads by a random walk of `spread`
// m^2/s and expires after `lifetime` seconds or on leaving `bounds`. With blocked(x, y, z) it
// does not step from air into a solid. One seeded stream drives the jitter and the walk, so
// the same seed and the same calls give the same smoke.
export function createSmoke({capacity=2048,lifetime=26,rate=14,rise=1.1,riseTime=5,spread=.12,jitter=.15,seed=1,bounds=null,blocked=null}={}){
  if(!Number.isInteger(capacity)||capacity<1||capacity>1000000)throw Error('Smoke capacity is 1 to 1,000,000 puffs.');
  if(!(lifetime>0)||!(spread>=0)||!(jitter>=0)||!Number.isFinite(lifetime+spread+jitter))throw Error('Smoke needs a positive lifetime and non-negative spread and jitter.');
  if(bounds!==null&&!(bounds?.min?.length===3&&bounds?.max?.length===3&&[...bounds.min,...bounds.max].every(Number.isFinite)))throw Error('Smoke bounds are {min:[x,y,z], max:[x,y,z]} in metres.');
  if(blocked!==null&&typeof blocked!=='function')throw Error('blocked is a function (x, y, z) returning true inside solids.');
  const checkSource=(r,u,tau)=>{if(!(r>=0&&Number.isFinite(r))||!(u>=0&&Number.isFinite(u))||!(tau>0))throw Error('An emitter needs a finite rate and rise of at least 0 and a positive riseTime.');};
  checkSource(rate,rise,riseTime);
  const positions=new Float32Array(capacity*3),ages=new Float32Array(capacity),warmth=new Float32Array(capacity),cooling=new Float32Array(capacity),up=new Float32Array(capacity),before=blocked?new Float32Array(capacity*3):null;
  let random=seededRandom(seed),count=0,dropped=0,time=0;const emitters=[];
  const remove=n=>{const last=--count,o=n*3,l=last*3;positions[o]=positions[l];positions[o+1]=positions[l+1];positions[o+2]=positions[l+2];ages[n]=ages[last];warmth[n]=warmth[last];cooling[n]=cooling[last];};
  const outside=(x,y,z)=>bounds!==null&&(x<bounds.min[0]||x>bounds.max[0]||y<bounds.min[1]||y>bounds.max[1]||z<bounds.min[2]||z>bounds.max[2]);
  const api={
    positions,ages,get count(){return count;},get dropped(){return dropped;},get time(){return time;},get emitters(){return emitters.map(({debt,...e})=>({...e}));},
    // A source at (x, y, z) in metres; rate in puffs per second; rise and riseTime as above.
    addEmitter({x,y,z,rate:r=rate,rise:u=rise,riseTime:tau=riseTime}={}){if(![x,y,z].every(Number.isFinite))throw Error('An emitter sits at a finite x, y, z.');checkSource(r,u,tau);const e={x,y,z,rate:r,rise:u,riseTime:tau,debt:0};emitters.push(e);return emitters.length-1;},
    moveEmitter(index,{x,y,z}){const e=emitters[index];if(!e||![x,y,z].every(Number.isFinite))throw Error('Move an existing emitter to a finite x, y, z.');e.x=x;e.y=y;e.z=z;return api;},
    removeEmitter(index){if(!emitters[index])throw Error('No emitter '+index+'.');emitters.splice(index,1);return api;},
    // Puffs go; emitters and the random stream stay. reset() also rewinds the stream and the clock.
    clear(){count=0;for(const e of emitters)e.debt=0;return api;},
    reset(){api.clear();random=seededRandom(seed);dropped=0;time=0;return api;},
    step(sample,dt){
      if(typeof sample!=='function')throw Error('Smoke needs a wind sample(x, y, z, out) function.');if(!(dt>=0&&Number.isFinite(dt)))throw Error('The smoke time step must be finite and non-negative.');
      for(const e of emitters){e.debt+=e.rate*dt;
        for(;e.debt>=1;e.debt--){if(count>=capacity){dropped++;continue;}const o=count*3;
          positions[o]=e.x+jitter*(2*random()-1);positions[o+1]=e.y;positions[o+2]=e.z+jitter*(2*random()-1);ages[count]=0;warmth[count]=e.rise;cooling[count]=e.riseTime;count++;}}
      // The rise at the middle of the step, which the midpoint advection uses.
      for(let n=0;n<count;n++)up[n]=warmth[n]*Math.exp(-(ages[n]+.5*dt)/cooling[n]);
      if(before)before.set(positions.subarray(0,count*3));
      advectTracers(sample,positions,dt,{count,rise:up,spread,random:spread>0?random:null});
      // A puff that would step from air into a solid waits where it was; its walk and rise move
      // it on later. One already inside (a source in a coarse voxel) moves freely until it is out.
      if(before)for(let n=0,o=0;n<count;n++,o+=3)if(blocked(positions[o],positions[o+1],positions[o+2])&&!blocked(before[o],before[o+1],before[o+2])){positions[o]=before[o];positions[o+1]=before[o+1];positions[o+2]=before[o+2];}
      for(let n=0;n<count;n++){const o=n*3;ages[n]+=dt;if(ages[n]>lifetime||outside(positions[o],positions[o+1],positions[o+2])){remove(n);n--;}}
      time+=dt;return count;
    }
  };
  return api;
}
// The box a wind field covers, as smoke bounds.
export function windFieldBounds(field){const{origin:o,cell:h,size:s}=field;return{min:[...o],max:[o[0]+s[0]*h,o[1]+s[1]*h,o[2]+s[2]*h]};}
// A blocked(x, y, z) test from a wind field's solid flags; positions outside the field are air.
export function windFieldSolid(field){
  const{origin:o,cell:h,size:[nx,ny,nz],solid}=field;
  return(x,y,z)=>{const i=Math.floor((x-o[0])/h),j=Math.floor((y-o[1])/h),k=Math.floor((z-o[2])/h);return i>=0&&j>=0&&k>=0&&i<nx&&j<ny&&k<nz&&solid[i+nx*(j+ny*k)]!==0;};
}
