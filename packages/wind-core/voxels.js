import {windDirection} from './profile.js';
// A wind grid is a box of cubic cells over the ground plane. Cell (i,j,k) spans
// origin + [i,i+1]*cell on x, [j,j+1] on height y and [k,k+1] on z; index i + nx*(j + ny*k).
export const WIND_GRID_LIMITS=Object.freeze({minCells:2,maxCells:4000000});
export function createWindGrid({origin=[0,0,0],cell=1,size}={}){
  if(!Array.isArray(origin)||origin.length!==3||!origin.every(Number.isFinite))throw Error('A wind grid origin is [x, y, z] in metres.');
  if(!(Number.isFinite(cell)&&cell>0&&cell<=10))throw Error('Wind grid cells must be (0, 10] m.');
  if(!Array.isArray(size)||size.length!==3||!size.every(n=>Number.isInteger(n)&&n>=1))throw Error('A wind grid size is three positive integers.');
  const[nx,ny,nz]=size,cells=nx*ny*nz;
  if(nx<WIND_GRID_LIMITS.minCells||ny<WIND_GRID_LIMITS.minCells||cells>WIND_GRID_LIMITS.maxCells)throw Error('Wind grids need at least 2 cells on x and height and at most '+WIND_GRID_LIMITS.maxCells+' cells.');
  return Object.freeze({origin:Object.freeze([...origin]),cell,size:Object.freeze([...size]),cells});
}
// Akenine-Moller's separating-axis test for a triangle against a cube centred at the
// origin. Touching counts as overlap, so the marked surface is conservative: a face
// path of air cells cannot cross a marked surface.
function separated(hs,px,py,pz,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z){
  const p0=px*v0x+py*v0y+pz*v0z,p1=px*v1x+py*v1y+pz*v1z,p2=px*v2x+py*v2y+pz*v2z,r=hs*(Math.abs(px)+Math.abs(py)+Math.abs(pz));
  return Math.min(p0,p1,p2)>r||Math.max(p0,p1,p2)<-r;
}
function overlaps(hs,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z,nx,ny,nz){
  if(Math.min(v0x,v1x,v2x)>hs||Math.max(v0x,v1x,v2x)<-hs)return false;
  if(Math.min(v0y,v1y,v2y)>hs||Math.max(v0y,v1y,v2y)<-hs)return false;
  if(Math.min(v0z,v1z,v2z)>hs||Math.max(v0z,v1z,v2z)<-hs)return false;
  if(Math.abs(nx*v0x+ny*v0y+nz*v0z)>hs*(Math.abs(nx)+Math.abs(ny)+Math.abs(nz)))return false;
  const e0x=v1x-v0x,e0y=v1y-v0y,e0z=v1z-v0z,e1x=v2x-v1x,e1y=v2y-v1y,e1z=v2z-v1z,e2x=v0x-v2x,e2y=v0y-v2y,e2z=v0z-v2z;
  // The nine edge axes X x e, Y x e and Z x e.
  return!(separated(hs,0,-e0z,e0y,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)||separated(hs,e0z,0,-e0x,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)||separated(hs,-e0y,e0x,0,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)
    ||separated(hs,0,-e1z,e1y,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)||separated(hs,e1z,0,-e1x,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)||separated(hs,-e1y,e1x,0,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)
    ||separated(hs,0,-e2z,e2y,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)||separated(hs,e2z,0,-e2x,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z)||separated(hs,-e2y,e2x,0,v0x,v0y,v0z,v1x,v1y,v1z,v2x,v2y,v2z));
}
// positions: flat world-space triangles [x0,y0,z0, x1,y1,z1, x2,y2,z2, ...] in metres.
// Marks every cell a triangle touches as solid (1). Degenerate triangles are skipped.
export function voxelizeTriangles(grid,positions,solid=new Uint8Array(grid.cells)){
  if(!positions||positions.length%9)throw Error('Triangles are a flat list of 9 coordinates each.');
  if(!(solid instanceof Uint8Array)||solid.length!==grid.cells)throw Error('The solid mask must be a Uint8Array with one entry per cell.');
  const[nx,ny,nz]=grid.size,h=grid.cell,[ox,oy,oz]=grid.origin,hs=h*.5*(1+1e-6),clamp=(v,n)=>v<0?0:v>n-1?n-1:v;let marked=0,skipped=0;
  for(let t=0;t<positions.length;t+=9){
    const ax=positions[t],ay=positions[t+1],az=positions[t+2],bx=positions[t+3],by=positions[t+4],bz=positions[t+5],qx=positions[t+6],qy=positions[t+7],qz=positions[t+8];
    if(!(Number.isFinite(ax)&&Number.isFinite(ay)&&Number.isFinite(az)&&Number.isFinite(bx)&&Number.isFinite(by)&&Number.isFinite(bz)&&Number.isFinite(qx)&&Number.isFinite(qy)&&Number.isFinite(qz)))throw Error('Triangle coordinates must be finite.');
    const ux=bx-ax,uy=by-ay,uz=bz-az,wx=qx-bx,wy=qy-by,wz=qz-bz,nX=uy*wz-uz*wy,nY=uz*wx-ux*wz,nZ=ux*wy-uy*wx;
    if(nX*nX+nY*nY+nZ*nZ<1e-24){skipped++;continue;}
    const i0=Math.floor((Math.min(ax,bx,qx)-ox)/h-1e-6),i1=Math.floor((Math.max(ax,bx,qx)-ox)/h+1e-6),j0=Math.floor((Math.min(ay,by,qy)-oy)/h-1e-6),j1=Math.floor((Math.max(ay,by,qy)-oy)/h+1e-6),k0=Math.floor((Math.min(az,bz,qz)-oz)/h-1e-6),k1=Math.floor((Math.max(az,bz,qz)-oz)/h+1e-6);
    if(i1<0||j1<0||k1<0||i0>nx-1||j0>ny-1||k0>nz-1)continue;
    for(let k=clamp(k0,nz),ke=clamp(k1,nz);k<=ke;k++)for(let j=clamp(j0,ny),je=clamp(j1,ny);j<=je;j++)for(let i=clamp(i0,nx),ie=clamp(i1,nx);i<=ie;i++){
      const c=i+nx*(j+ny*k);if(solid[c])continue;
      const cx=ox+(i+.5)*h,cy=oy+(j+.5)*h,cz=oz+(k+.5)*h;
      if(overlaps(hs,ax-cx,ay-cy,az-cz,bx-cx,by-cy,bz-cz,qx-cx,qy-cy,qz-cz,nX,nY,nZ)){solid[c]=1;marked++;}
    }
  }
  return{solid,marked,skipped};
}
// Air connected (through faces) to the sides or top of the domain stays air. Sealed
// pockets such as closed interiors become solid (2): wind cannot reach them, and a
// pressure system for an isolated pocket would have no outflow to anchor it.
export function fillEnclosed(grid,solid){
  const[nx,ny,nz]=grid.size,n=grid.cells,seen=new Uint8Array(n),queue=new Int32Array(n);let tail=0;
  const push=c=>{if(!solid[c]&&!seen[c]){seen[c]=1;queue[tail++]=c;}};
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){push(nx*(j+ny*k));push(nx-1+nx*(j+ny*k));}
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){push(i+nx*j);push(i+nx*(j+ny*(nz-1)));}
  for(let k=0;k<nz;k++)for(let i=0;i<nx;i++)push(i+nx*(ny-1+ny*k));
  for(let head=0;head<tail;head++){
    const c=queue[head],i=c%nx,j=Math.floor(c/nx)%ny,k=Math.floor(c/(nx*ny));
    if(i>0)push(c-1);if(i<nx-1)push(c+1);if(j>0)push(c-nx);if(j<ny-1)push(c+nx);if(k>0)push(c-nx*ny);if(k<nz-1)push(c+nx*ny);
  }
  let filled=0;for(let c=0;c<n;c++)if(!solid[c]&&!seen[c]){solid[c]=2;filled++;}
  return filled;
}
export function solidFraction(solid){let s=0;for(let c=0;c<solid.length;c++)if(solid[c])s++;return s/solid.length;}
// Domain around a site's bounds {min:[x,y,z], max:[x,y,z]} for a given wind bearing.
// Margins are multiples of the tallest height H, with a floor in metres. Practical
// guidelines ask for roughly 5H upstream and laterally and 15H downstream (Franke et al.,
// COST 732); these defaults are smaller to stay interactive, and the solver reports blockage.
export function windDomain(bounds,{cell=1,fromDeg=0,upstream=2,lateral=2,downstream=5,height=3,minimum=6}={}){
  if(!bounds||![...bounds.min||[],...bounds.max||[]].every(Number.isFinite)||bounds.min.length!==3||bounds.max.length!==3)throw Error('Site bounds are {min:[x,y,z], max:[x,y,z]} in metres.');
  const H=Math.max(bounds.max[1],cell),m=f=>Math.max(f*H,minimum),[dx,dz]=windDirection(fromDeg);
  const side=d=>d>.2?[m(upstream),m(downstream)]:d<-.2?[m(downstream),m(upstream)]:[m(lateral),m(lateral)];
  const[xLo,xHi]=side(dx),[zLo,zHi]=side(dz),top=Math.max(height*H,H+minimum);
  const x0=Math.floor((bounds.min[0]-xLo)/cell)*cell,z0=Math.floor((bounds.min[2]-zLo)/cell)*cell;
  const size=[Math.ceil((bounds.max[0]+xHi-x0)/cell),Math.ceil(top/cell),Math.ceil((bounds.max[2]+zHi-z0)/cell)];
  return createWindGrid({origin:[x0,0,z0],cell,size});
}
