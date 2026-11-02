import {fail,vector} from './common.mjs';
import {surfaceFromCurrentPose,worldToSurface,graphicUV,maskContains,sampleGraphic,composeLayers} from '../c2-decoder-proof/sampler.mjs';
export {worldToSurface,graphicUV,maskContains,sampleGraphic,composeLayers};
export function currentSurfaceMatrix(surface,owner){
 vector(surface.originM,3,'surface origin');if(surface.axes?.length!==2)fail('SOURCE_AXES');surface.axes.forEach(x=>vector(x,3,'surface basis'));const [u,v]=surface.axes,dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);if(Math.abs(dot(u,u)-1)>1e-12||Math.abs(dot(v,v)-1)>1e-12||Math.abs(dot(u,v))>1e-12||u[2]!==0||v[2]!==0||surface.normal?.join(',')!=='0,0,1')fail('SOURCE_AXES');
 vector(owner.origin,3,'current owner origin');if(![0,1,2,3].includes(owner.transform?.quarterTurns)||typeof owner.transform.mirrorX!=='boolean')fail('CURRENT_POSE');
 const f=p=>surfaceFromCurrentPose(p,surface,owner),o=f([0,0,0]),x=f([1,0,0]),y=f([0,1,0]),z=f([0,0,1]);return [x[0]-o[0],x[1]-o[1],0,0,y[0]-o[0],y[1]-o[1],1,0,z[0]-o[0],z[1]-o[1],0,0,o[0],o[1],-(owner.origin[2]+surface.originM[2]),1];
}
export function clippedCellArea(loop,i,j,grid){const min=[grid.originM[0]+i*grid.cellSizeM[0],grid.originM[1]+j*grid.cellSizeM[1]],max=min.map((x,k)=>x+grid.cellSizeM[k]);let polygon=loop.map(p=>p.slice());for(let k=0;k<2;k++)for(const upper of [false,true]){const bound=(upper?max:min)[k],next=[];for(let n=0;n<polygon.length;n++){const a=polygon[n],b=polygon[(n+1)%polygon.length],insideA=upper?a[k]<=bound:a[k]>=bound,insideB=upper?b[k]<=bound:b[k]>=bound;if(insideA)next.push(a);if(insideA!==insideB){const t=(bound-a[k])/(b[k]-a[k]);next.push(a.map((x,m)=>x+(b[m]-x)*t));}}polygon=next;}return Math.abs(polygon.reduce((s,a,n)=>{const b=polygon[(n+1)%polygon.length];return s+a[0]*b[1]-a[1]*b[0];},0)/2);}
