// Bakes some of a site's bearings off the page's thread and posts each mean field as it lands.
// The page splits a bearing set across several of these; bearings do not depend on each other.
import {createWindGrid,voxelizeTriangles,fillEnclosed,bakeWindBearings} from '../packages/wind-core/index.js';
onmessage=({data})=>{
  const{generation}=data;
  try{
    const grid=createWindGrid(data.grid),{solid}=voxelizeTriangles(grid,data.triangles);fillEnclosed(grid,solid);
    for(const fromDeg of data.bearings){
      const started=performance.now();
      // One bearing per call, so each lands (and can be shown) as soon as it is done.
      const{fields:[field],unconverged:[missed]}=bakeWindBearings({grid,solid,bearings:[fromDeg],wind:data.wind,turbulence:data.turbulence,warmup:data.warmup,average:data.average,tolerance:data.tolerance});
      postMessage({type:'bearing',generation,fromDeg,field,unconverged:missed,seconds:(performance.now()-started)/1000},[field.velocity.buffer,field.solid.buffer]);
    }
    postMessage({type:'done',generation});
  }catch(error){postMessage({type:'error',generation,message:String(error?.message||error)});}
};
