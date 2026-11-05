import {profileSpeed,frictionVelocity,windDirection,REFERENCE_HEIGHT} from './profile.js';
import {createInflowTurbulence} from './turbulence.js';
// Incompressible flow on a staggered (MAC) grid: u on x faces, v (height) on y faces,
// w on z faces, pressure at cell centres. Each step advects velocity with the
// MacCormack scheme of Selle et al. (2008), optionally diffuses it, then projects it
// onto divergence-free fields with MIC(0)-preconditioned conjugate gradients
// (Bridson, Fluid Simulation for Computer Graphics). No turbulence model is applied:
// the limiter's numerical dissipation stands in for subgrid mixing (implicit LES).
export const WIND_SOLVER_VERSION=1;
export const BOUNDARY_TYPES=Object.freeze(['inflow','outflow','slip','wall']);
const SIDES=['xMin','xMax','yMin','yMax','zMin','zMax'],FIXED=0,FREE=1,INFLOW=2,OPEN=3;
// Sides facing into the wind receive the profile; sides it leaves through are open at
// pressure 0; sides parallel to it are slip planes. The ground and the lid default to slip,
// so the inflow profile is carried unchanged across an empty site.
export function windBoundaries(fromDeg,{ground='slip',top='slip'}={}){
  const[dx,dz]=windDirection(fromDeg),side=(d,low)=>({type:d===0?'slip':(low?d>0:d<0)?'inflow':'outflow'});
  return{xMin:side(dx,true),xMax:side(dx,false),yMin:{type:ground},yMax:{type:top},zMin:side(dz,true),zMax:side(dz,false)};
}
function checkBoundaries(b){
  if(!b||typeof b!=='object')throw Error('Boundaries name a type for each of '+SIDES.join(', ')+'.');
  const out={};for(const side of SIDES){const s=b[side];if(!s||!BOUNDARY_TYPES.includes(s.type))throw Error('Unsupported boundary for '+side+'.');
    const velocity=s.velocity===undefined?[0,0,0]:s.velocity;if(!Array.isArray(velocity)||velocity.length!==3||!velocity.every(Number.isFinite))throw Error('A wall velocity is [u, v, w] in m/s.');
    out[side]=Object.freeze({type:s.type,velocity:Object.freeze([...velocity])});}
  if(['yMin','yMax'].some(side=>out[side].type==='inflow'))throw Error('The ground and lid cannot be inflow boundaries.');
  return Object.freeze(out);
}
// Trilinear interpolation over an array with dims (sx,sy,sz), clamped at its edges. With a
// range array it also records the min and max of the eight values used (for the limiter).
function sampler(sx,sy,sz){
  const di=sx>1?1:0,dj=sy>1?sx:0,dk=sz>1?sx*sy:0,mx=sx-1,my=sy-1,mz=sz-1,ix=Math.max(0,sx-2),iy=Math.max(0,sy-2),iz=Math.max(0,sz-2);
  return(a,fx,fy,fz,range)=>{
    if(fx<0)fx=0;else if(fx>mx)fx=mx;if(fy<0)fy=0;else if(fy>my)fy=my;if(fz<0)fz=0;else if(fz>mz)fz=mz;
    let i=fx|0,j=fy|0,k=fz|0;if(i>ix)i=ix;if(j>iy)j=iy;if(k>iz)k=iz;
    const tx=fx-i,ty=fy-j,tz=fz-k,c=i+sx*(j+sy*k),a000=a[c],a100=a[c+di],a010=a[c+dj],a110=a[c+dj+di],a001=a[c+dk],a101=a[c+dk+di],a011=a[c+dk+dj],a111=a[c+dk+dj+di];
    if(range){let lo=a000,hi=a000;
      if(a100<lo)lo=a100;else if(a100>hi)hi=a100;if(a010<lo)lo=a010;else if(a010>hi)hi=a010;if(a110<lo)lo=a110;else if(a110>hi)hi=a110;
      if(a001<lo)lo=a001;else if(a001>hi)hi=a001;if(a101<lo)lo=a101;else if(a101>hi)hi=a101;if(a011<lo)lo=a011;else if(a011>hi)hi=a011;if(a111<lo)lo=a111;else if(a111>hi)hi=a111;
      range[0]=lo;range[1]=hi;}
    const b00=a000+(a100-a000)*tx,b10=a010+(a110-a010)*tx,b01=a001+(a101-a001)*tx,b11=a011+(a111-a011)*tx,c0=b00+(b10-b00)*ty,c1=b01+(b11-b01)*ty;
    return c0+(c1-c0)*tz;
  };
}
export function createWindSolver(options={}){
  const{grid,solid:mask,wind=null,viscosity=0,cfl=1,tolerance=1e-4,maxIterations=800,advection='maccormack'}=options;
  if(!['maccormack','semi-lagrangian'].includes(advection))throw Error('Advection is maccormack or semi-lagrangian.');
  const corrected=advection==='maccormack';
  if(!grid||!Array.isArray(grid.size))throw Error('createWindSolver needs a wind grid.');
  if(!(mask instanceof Uint8Array)||mask.length!==grid.cells)throw Error('The solid mask must be a Uint8Array with one entry per cell.');
  if(!(viscosity>=0&&Number.isFinite(viscosity)))throw Error('Viscosity must be a finite non-negative m^2/s.');
  if(!(cfl>0&&cfl<=4))throw Error('The CFL number must be in (0, 4].');
  if(!(tolerance>0&&tolerance<1))throw Error('The pressure tolerance is a fraction of the reference speed in (0, 1).');
  const[nx,ny,nz]=grid.size,h=grid.cell,origin=grid.origin,nxy=nx*ny,cells=grid.cells,NU=(nx+1)*ny*nz,NV=nx*(ny+1)*nz,NW=nx*ny*(nz+1),most=Math.max(NU,NV,NW);
  const base=Uint8Array.from(mask),solid=new Uint8Array(cells);
  let u=new Float32Array(NU),v=new Float32Array(NV),w=new Float32Array(NW),un=new Float32Array(NU),vn=new Float32Array(NV),wn=new Float32Array(NW);
  const tu=new Uint8Array(NU),tv=new Uint8Array(NV),tw=new Uint8Array(NW),mu=new Float32Array(NU),mv=new Float32Array(NV),mw=new Float32Array(NW);
  const F=new Float32Array(most),MN=new Float32Array(most),MX=new Float32Array(most),T1=new Float32Array(most),T2=new Float32Array(most);
  const p=new Float64Array(cells+nxy),r=new Float64Array(cells),z=new Float64Array(cells+nxy),s=new Float64Array(cells+nxy),q=new Float64Array(cells),precon=new Float64Array(cells),diag=new Uint8Array(cells),px=new Uint8Array(cells),py=new Uint8Array(cells),pz=new Uint8Array(cells);
  const ax=new Float64Array(cells),ay=new Float64Array(cells),az=new Float64Array(cells);
  let sides,inflow,inflowComp,gust=null,turbulence=null,scale,dt,pinned=-1,cutOff=0,steps=0,time=0,averaged=0,windState=null,last=Object.freeze({iterations:0,divergence:0,converged:true});
  const lu=sampler(nx+1,ny,nz),lv=sampler(nx,ny+1,nz),lw=sampler(nx,ny,nz+1),RANGE=new Float64Array(2),G=[0,0,0];
  // Inflow at a cell-unit point: the profile plus any synthetic turbulence at the current time.
  const inflowAt=(comp,X,Y,Z,t)=>{const y=Y<0?0:Y*h,mean=inflowComp(comp,y);return gust?mean+gust.sample(origin[0]+X*h,y,origin[2]+Z*h,t,G)[comp]:mean;};
  // Prescribed velocity for points outside the domain beyond an inflow or wall side; NaN
  // where the side only clamps (slip, outflow).
  const outside=(comp,X,Y,Z)=>{
    const hit=X<0?sides.xMin:X>nx?sides.xMax:Z<0?sides.zMin:Z>nz?sides.zMax:Y<0?sides.yMin:Y>ny?sides.yMax:null;
    if(!hit||hit.type==='slip'||hit.type==='outflow')return NaN;
    return hit.type==='inflow'?inflowAt(comp,X,Y,Z,time):hit.velocity[comp];
  };
  // With turbulence, the inflow faces' normal velocity follows the fluctuating inflow.
  function updateInflow(t){
    if(!gust)return;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(const i of[0,nx]){const f=i+(nx+1)*(j+ny*k);if(tu[f]===INFLOW)u[f]=inflowAt(0,i,j+.5,k+.5,t);}
    for(const k of[0,nz])for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+ny*k);if(tw[f]===INFLOW)w[f]=inflowAt(2,i+.5,j+.5,k,t);}
  }
  // Samples at cell-unit positions (X, Y, Z) from the grid origin.
  const su=(a,X,Y,Z,range)=>{if(X<0||X>nx||Y<0||Y>ny||Z<0||Z>nz){const b=outside(0,X,Y,Z);if(b===b){if(range)range[0]=range[1]=b;return b;}}return lu(a,X,Y-.5,Z-.5,range);};
  const sv=(a,X,Y,Z,range)=>{if(X<0||X>nx||Y<0||Y>ny||Z<0||Z>nz){const b=outside(1,X,Y,Z);if(b===b){if(range)range[0]=range[1]=b;return b;}}return lv(a,X-.5,Y,Z-.5,range);};
  const sw=(a,X,Y,Z,range)=>{if(X<0||X>nx||Y<0||Y>ny||Z<0||Z>nz){const b=outside(2,X,Y,Z);if(b===b){if(range)range[0]=range[1]=b;return b;}}return lw(a,X-.5,Y-.5,Z,range);};
  const faceType=(side,cell)=>{if(solid[cell])return FIXED;const t=sides[side].type;return t==='inflow'?INFLOW:t==='outflow'?OPEN:FIXED;};
  // Classifies every face, writes fixed face values, finds air cut off from every open
  // side and builds the pressure matrix and its preconditioner.
  function classify(){
    solid.set(base);
    for(let pass=0;pass<2;pass++){
      for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<=nx;i++){const f=i+(nx+1)*(j+ny*k),c=i+nx*(j+ny*k);tu[f]=i===0?faceType('xMin',c):i===nx?faceType('xMax',c-1):!solid[c-1]&&!solid[c]?FREE:FIXED;}
      for(let k=0;k<nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+(ny+1)*k),c=i+nx*(j+ny*k);tv[f]=j===0?faceType('yMin',c):j===ny?faceType('yMax',c-nx):!solid[c-nx]&&!solid[c]?FREE:FIXED;}
      for(let k=0;k<=nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+ny*k),c=f;tw[f]=k===0?faceType('zMin',c):k===nz?faceType('zMax',c-nxy):!solid[c-nxy]&&!solid[c]?FREE:FIXED;}
      if(pass)break;
      // Air reaches the pressure anchor only through free faces; cells it cannot reach (a
      // pocket fed only by inflow, say) would make the system singular, so they become solid.
      const seen=new Uint8Array(cells),queue=new Int32Array(cells);let tail=0,anyOpen=false;
      const visit=c=>{if(!solid[c]&&!seen[c]){seen[c]=1;queue[tail++]=c;}};
      for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);if(solid[c])continue;
        if(tu[i+(nx+1)*(j+ny*k)]===OPEN||tu[i+1+(nx+1)*(j+ny*k)]===OPEN||tv[i+nx*(j+(ny+1)*k)]===OPEN||tv[i+nx*(j+1+(ny+1)*k)]===OPEN||tw[c]===OPEN||tw[c+nxy]===OPEN){anyOpen=true;visit(c);}}
      pinned=-1;
      if(!anyOpen){for(let c=0;c<cells;c++)if(!solid[c]){pinned=c;visit(c);break;}}
      for(let head=0;head<tail;head++){const c=queue[head],i=c%nx,j=Math.floor(c/nx)%ny,k=Math.floor(c/nxy);
        if(i<nx-1&&tu[i+1+(nx+1)*(j+ny*k)]===FREE)visit(c+1);if(i>0&&tu[i+(nx+1)*(j+ny*k)]===FREE)visit(c-1);
        if(j<ny-1&&tv[i+nx*(j+1+(ny+1)*k)]===FREE)visit(c+nx);if(j>0&&tv[i+nx*(j+(ny+1)*k)]===FREE)visit(c-nx);
        if(k<nz-1&&tw[c+nxy]===FREE)visit(c+nxy);if(k>0&&tw[c]===FREE)visit(c-nxy);}
      cutOff=0;for(let c=0;c<cells;c++)if(!solid[c]&&!seen[c]){solid[c]=3;cutOff++;}
      if(!cutOff)break;
    }
    for(let f=0;f<NU;f++)if(tu[f]===FIXED)u[f]=0;for(let f=0;f<NV;f++)if(tv[f]===FIXED)v[f]=0;for(let f=0;f<NW;f++)if(tw[f]===FIXED)w[f]=0;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){const y=(j+.5)*h,a=inflow(y);for(let i=0;i<=nx;i++){const f=i+(nx+1)*(j+ny*k);if(tu[f]===INFLOW)u[f]=a[0];}for(let i=0;i<nx;i++){const f=i+nx*(j+ny*k);if(tw[f]===INFLOW)w[f]=a[2];const g=i+nx*(j+ny*nz);if(k===nz-1&&tw[g]===INFLOW)w[g]=a[2];}}
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);
      if(solid[c]){diag[c]=px[c]=py[c]=pz[c]=0;p[c]=0;continue;}
      const a=tu[i+(nx+1)*(j+ny*k)],b=tu[i+1+(nx+1)*(j+ny*k)],e=tv[i+nx*(j+(ny+1)*k)],g=tv[i+nx*(j+1+(ny+1)*k)],m=tw[c],n=tw[c+nxy],live=t=>t===FREE||t===OPEN?1:0;
      diag[c]=live(a)+live(b)+live(e)+live(g)+live(m)+live(n)+(c===pinned?1:0);px[c]=b===FREE?1:0;py[c]=g===FREE?1:0;pz[c]=n===FREE?1:0;}
    const tau=.97,sigma=.25;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);if(solid[c]){precon[c]=0;continue;}
      let e=diag[c];
      if(i>0&&px[c-1]){const m=precon[c-1];e-=m*m+tau*(py[c-1]+pz[c-1])*m*m;}
      if(j>0&&py[c-nx]){const m=precon[c-nx];e-=m*m+tau*(px[c-nx]+pz[c-nx])*m*m;}
      if(k>0&&pz[c-nxy]){const m=precon[c-nxy];e-=m*m+tau*(px[c-nxy]+py[c-nxy])*m*m;}
      if(e<sigma*diag[c])e=diag[c];precon[c]=1/Math.sqrt(e);}
    for(let c=0;c<cells;c++){ax[c]=px[c]?precon[c]:0;ay[c]=py[c]?precon[c]:0;az[c]=pz[c]?precon[c]:0;}
  }
  // z = M^-1 r with the incomplete Cholesky factor; returns z.r. Coupling weights ax/ay/az are
  // precon where the +x/+y/+z face is free, else 0. Vectors carry nxy zeros of padding, so
  // reads past the last cell are harmless.
  function applyPreconditioner(){
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);if(solid[c]){q[c]=0;continue;}
      let t=r[c];if(i>0)t+=ax[c-1]*q[c-1];if(j>0)t+=ay[c-nx]*q[c-nx];if(k>0)t+=az[c-nxy]*q[c-nxy];q[c]=t*precon[c];}
    let dot=0;
    for(let k=nz-1;k>=0;k--)for(let j=ny-1;j>=0;j--)for(let i=nx-1;i>=0;i--){const c=i+nx*(j+ny*k);if(solid[c]){z[c]=0;continue;}
      const value=(q[c]+ax[c]*z[c+1]+ay[c]*z[c+nx]+az[c]*z[c+nxy])*precon[c];z[c]=value;dot+=value*r[c];}
    return dot;
  }
  // out = A x: each live face contributes (x_c - x_neighbour), with ghost pressure 0 on open
  // sides. Returns x.out.
  function multiply(x,out){
    let dot=0;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);if(solid[c]){out[c]=0;continue;}
      let t=diag[c]*x[c]-px[c]*x[c+1]-py[c]*x[c+nx]-pz[c]*x[c+nxy];if(i>0)t-=px[c-1]*x[c-1];if(j>0)t-=py[c-nx]*x[c-nx];if(k>0)t-=pz[c-nxy]*x[c-nxy];out[c]=t;dot+=x[c]*t;}
    return dot;
  }
  // Pressure p is scaled by dt/(rho h), so a face update is u -= p_right - p_left and the
  // residual is the remaining divergence as a face-velocity sum (m/s).
  function project(){
    let maxR=0;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const c=i+nx*(j+ny*k);if(solid[c]){r[c]=0;continue;}
      r[c]=-(u[i+1+(nx+1)*(j+ny*k)]-u[i+(nx+1)*(j+ny*k)]+v[i+nx*(j+1+(ny+1)*k)]-v[i+nx*(j+(ny+1)*k)]+w[c+nxy]-w[c]);}
    multiply(p,q);for(let c=0;c<cells;c++){r[c]-=q[c];const a=Math.abs(r[c]);if(a>maxR)maxR=a;}
    const limit=tolerance*scale;let iterations=0;
    if(maxR>limit){
      let sigma=applyPreconditioner();s.set(z);
      while(iterations<maxIterations){
        iterations++;const sq=multiply(s,q);
        if(!(sq>0))break;const alpha=sigma/sq;maxR=0;
        for(let c=0;c<cells;c++){p[c]+=alpha*s[c];r[c]-=alpha*q[c];const a=Math.abs(r[c]);if(a>maxR)maxR=a;}
        if(maxR<=limit)break;
        const next=applyPreconditioner(),beta=next/sigma;sigma=next;for(let c=0;c<cells;c++)s[c]=z[c]+beta*s[c];
      }
    }
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<=nx;i++){const f=i+(nx+1)*(j+ny*k),t=tu[f];if(t!==FREE&&t!==OPEN)continue;const c=i+nx*(j+ny*k);u[f]-=(i<nx?p[c]:0)-(i>0?p[c-1]:0);}
    for(let k=0;k<nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+(ny+1)*k),t=tv[f];if(t!==FREE&&t!==OPEN)continue;const c=i+nx*(j+ny*k);v[f]-=(j<ny?p[c]:0)-(j>0?p[c-nx]:0);}
    for(let k=0;k<=nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+ny*k),t=tw[f];if(t!==FREE&&t!==OPEN)continue;w[f]-=(k<nz?p[f]:0)-(k>0?p[f-nxy]:0);}
    return{iterations,divergence:maxR/scale,converged:maxR<=limit};
  }
  // MacCormack: forward semi-Lagrangian F, a backward trace of F, half the round-trip
  // error added back; reverting to F where the correction leaves the forward stencil's range.
  // advection:'semi-lagrangian' keeps F alone: half the cost, first order, more diffusive.
  // The other two components at a face are the mean of their four nearest faces, which is
  // exactly the clamped trilinear value there.
  function advect(){
    const a=dt/h,NX=nx+1,NY=ny+1,R=RANGE;
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<=nx;i++){const f=i+NX*(j+ny*k);if(tu[f]!==FREE&&tu[f]!==OPEN){F[f]=u[f];continue;}
      const i0=i>0?i-1:0,i1=i<nx?i:nx-1,vb=nx*(j+NY*k),wb=nx*(j+ny*k),U=u[f],V=.25*(v[i0+vb]+v[i1+vb]+v[i0+vb+nx]+v[i1+vb+nx]),W=.25*(w[i0+wb]+w[i1+wb]+w[i0+wb+nxy]+w[i1+wb+nxy]);
      T1[f]=V;T2[f]=W;F[f]=su(u,i-a*U,j+.5-a*V,k+.5-a*W,R);MN[f]=R[0];MX[f]=R[1];}
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<=nx;i++){const f=i+NX*(j+ny*k);if(tu[f]!==FREE&&tu[f]!==OPEN){un[f]=u[f];continue;}if(!corrected){un[f]=F[f];continue;}
      const U=u[f],c=F[f]+.5*(U-su(F,i+a*U,j+.5+a*T1[f],k+.5+a*T2[f],null));un[f]=c<MN[f]||c>MX[f]?F[f]:c;}
    for(let k=0;k<nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+NY*k);if(tv[f]!==FREE&&tv[f]!==OPEN){F[f]=v[f];continue;}
      const j0=j>0?j-1:0,j1=j<ny?j:ny-1,u0=i+NX*(j0+ny*k),u1=i+NX*(j1+ny*k),w0=i+nx*(j0+ny*k),w1=i+nx*(j1+ny*k),V=v[f],U=.25*(u[u0]+u[u0+1]+u[u1]+u[u1+1]),W=.25*(w[w0]+w[w1]+w[w0+nxy]+w[w1+nxy]);
      T1[f]=U;T2[f]=W;F[f]=sv(v,i+.5-a*U,j-a*V,k+.5-a*W,R);MN[f]=R[0];MX[f]=R[1];}
    for(let k=0;k<nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+NY*k);if(tv[f]!==FREE&&tv[f]!==OPEN){vn[f]=v[f];continue;}if(!corrected){vn[f]=F[f];continue;}
      const V=v[f],c=F[f]+.5*(V-sv(F,i+.5+a*T1[f],j+a*V,k+.5+a*T2[f],null));vn[f]=c<MN[f]||c>MX[f]?F[f]:c;}
    for(let k=0;k<=nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+ny*k);if(tw[f]!==FREE&&tw[f]!==OPEN){F[f]=w[f];continue;}
      const k0=k>0?k-1:0,k1=k<nz?k:nz-1,u0=i+NX*(j+ny*k0),u1=i+NX*(j+ny*k1),v0=i+nx*(j+NY*k0),v1=i+nx*(j+NY*k1),W=w[f],U=.25*(u[u0]+u[u0+1]+u[u1]+u[u1+1]),V=.25*(v[v0]+v[v0+nx]+v[v1]+v[v1+nx]);
      T1[f]=U;T2[f]=V;F[f]=sw(w,i+.5-a*U,j+.5-a*V,k-a*W,R);MN[f]=R[0];MX[f]=R[1];}
    for(let k=0;k<=nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+ny*k);if(tw[f]!==FREE&&tw[f]!==OPEN){wn[f]=w[f];continue;}if(!corrected){wn[f]=F[f];continue;}
      const W=w[f],c=F[f]+.5*(W-sw(F,i+.5+a*T1[f],j+.5+a*T2[f],k+a*W,null));wn[f]=c<MN[f]||c>MX[f]?F[f]:c;}
    let t=u;u=un;un=t;t=v;v=vn;vn=t;t=w;w=wn;wn=t;
  }
  // Explicit viscous diffusion, substepped for stability. A wall's tangential ghost mirrors
  // through the wall velocity (no slip); slip and outflow sides mirror the value itself
  // (no shear); an inflow side mirrors through the inflow profile.
  const ghost=(side,comp,value,Y)=>{const b=sides[side];return b.type==='wall'?2*b.velocity[comp]-value:b.type==='inflow'?2*inflowComp(comp,Y<0?0:Y*h)-value:value;};
  function diffuseComponent(a,types,comp,sx,sy,sz,offset,count,lambda){
    const sxy=sx*sy,low=['xMin','yMin','zMin'],high=['xMax','yMax','zMax'];
    for(let n=0;n<count;n++){
      F.set(a.subarray(0,a.length));
      for(let k=0;k<sz;k++)for(let j=0;j<sy;j++)for(let i=0;i<sx;i++){const f=i+sx*(j+sy*k),t=types[f];if(t!==FREE&&t!==OPEN)continue;
        const c=F[f],Y=j+offset[1];let sum=0,terms=0;
        for(let axis=0;axis<3;axis++){const size=axis===0?sx:axis===1?sy:sz;if(size===1&&axis!==comp)continue;
          const idx=axis===0?i:axis===1?j:k,stride=axis===0?1:axis===1?sx:sxy;
          sum+=(idx>0?F[f-stride]:axis===comp?c:ghost(low[axis],comp,c,axis===1?0:Y))+(idx<size-1?F[f+stride]:axis===comp?c:ghost(high[axis],comp,c,axis===1?ny:Y));terms+=2;}
        a[f]=c+lambda*(sum-terms*c);}
    }
  }
  function diffuse(){
    if(!viscosity)return;
    const dims=(nx>1)+(ny>1)+(nz>1),total=viscosity*dt/(h*h),count=Math.max(1,Math.ceil(total*2*dims/.9)),lambda=total/count;
    diffuseComponent(u,tu,0,nx+1,ny,nz,[0,.5,.5],count,lambda);diffuseComponent(v,tv,1,nx,ny+1,nz,[.5,0,.5],count,lambda);diffuseComponent(w,tw,2,nx,ny,nz+1,[.5,.5,0],count,lambda);
  }
  function configure(next){
    if(next.wind){
      const{speed,fromDeg,z0,referenceHeight=REFERENCE_HEIGHT}=next.wind,dir=windDirection(fromDeg),along=[dir[0],0,dir[1]];profileSpeed(1,speed,z0,referenceHeight);
      windState=Object.freeze({speed,fromDeg,z0,referenceHeight});
      // The same arithmetic as profileSpeed, without its argument checks.
      const denominator=Math.log((referenceHeight+z0)/z0);
      inflowComp=(comp,y)=>y<=0?0:speed*Math.log((y+z0)/z0)/denominator*along[comp];
      inflow=y=>[inflowComp(0,y),0,inflowComp(2,y)];
      sides=checkBoundaries(next.boundaries||windBoundaries(fromDeg,next));
      scale=Math.max(speed,profileSpeed(ny*h,speed,z0,referenceHeight),1e-3);
      // Turbulence settings persist across setWind unless replaced; gain 0 or null is off.
      if(next.turbulence!==undefined)turbulence=next.turbulence===null?null:{...next.turbulence};
      gust=turbulence&&turbulence.gain!==0&&speed>0?createInflowTurbulence({frictionVelocity:frictionVelocity(speed,z0,referenceHeight),direction:dir,convection:speed,
        lengthScale:turbulence.lengthScale??20,modes:turbulence.modes??48,seed:turbulence.seed??1,gain:turbulence.gain??1,kMin:Math.PI/(Math.max(nx,nz)*h),kMax:Math.PI/(2*h)}):null;
    }else{
      if(typeof next.inflow!=='function'&&next.inflow!==undefined)throw Error('A custom inflow is a function of height returning [u, v, w].');
      inflow=next.inflow||(()=>[0,0,0]);inflowComp=(comp,y)=>inflow(y)[comp];windState=null;sides=checkBoundaries(next.boundaries);
      if(!(next.speedScale>0))throw Error('Without wind settings, give speedScale: the characteristic speed in m/s.');scale=next.speedScale;
    }
    dt=options.dt===undefined?cfl*h/scale:options.dt;if(!(dt>0&&Number.isFinite(dt)))throw Error('The time step must be positive.');
    classify();
  }
  // Starts from the inflow profile everywhere in the air, made divergence-free.
  function reset(){
    u.fill(0);v.fill(0);w.fill(0);p.fill(0);steps=0;time=0;averaged=0;mu.fill(0);mv.fill(0);mw.fill(0);
    for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){const a=inflow((j+.5)*h);for(let i=0;i<=nx;i++){const f=i+(nx+1)*(j+ny*k);if(tu[f]!==FIXED)u[f]=a[0];}for(let i=0;i<nx;i++){if(tw[i+nx*(j+ny*k)]!==FIXED)w[i+nx*(j+ny*k)]=a[2];if(k===nz-1&&tw[i+nx*(j+ny*nz)]!==FIXED)w[i+nx*(j+ny*nz)]=a[2];}}
    last=Object.freeze(project());
  }
  configure(options);reset();
  function accumulate(){averaged++;const f=1/averaged;for(let n=0;n<NU;n++)mu[n]+=(u[n]-mu[n])*f;for(let n=0;n<NV;n++)mv[n]+=(v[n]-mv[n])*f;for(let n=0;n<NW;n++)mw[n]+=(w[n]-mw[n])*f;}
  let averaging=false;
  const api={
    grid,
    get dt(){return dt;},get time(){return time;},get steps(){return steps;},get wind(){return windState;},get boundaries(){return sides;},
    get solid(){return solid;},get cutOffCells(){return cutOff;},get averagedSteps(){return averaged;},get last(){return last;},
    get turbulence(){return gust?Object.freeze({sigma:gust.sigma,lengthScale:gust.lengthScale,modes:gust.modes,seed:gust.seed}):null;},
    step(){const started=globalThis.performance?.now?.()??0;advect();diffuse();updateInflow(time+dt);const result=project();steps++;time+=dt;if(averaging)accumulate();
      last=Object.freeze({...result,milliseconds:(globalThis.performance?.now?.()??0)-started});return last;},
    run(count){for(let n=0;n<count;n++)api.step();return last;},
    reset(){reset();return api;},
    // Sets every free face from velocity(x, y, z) -> [u, v, w] (m/s, world metres), then projects.
    setFlow(velocity){if(typeof velocity!=='function')throw Error('setFlow needs velocity(x, y, z) returning [u, v, w].');const[ox,oy,oz]=origin;
      for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<=nx;i++){const f=i+(nx+1)*(j+ny*k);if(tu[f]===FREE||tu[f]===OPEN)u[f]=velocity(ox+i*h,oy+(j+.5)*h,oz+(k+.5)*h)[0];}
      for(let k=0;k<nz;k++)for(let j=0;j<=ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+(ny+1)*k);if(tv[f]===FREE||tv[f]===OPEN)v[f]=velocity(ox+(i+.5)*h,oy+j*h,oz+(k+.5)*h)[1];}
      for(let k=0;k<=nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const f=i+nx*(j+ny*k);if(tw[f]===FREE||tw[f]===OPEN)w[f]=velocity(ox+(i+.5)*h,oy+(j+.5)*h,oz+k*h)[2];}
      p.fill(0);averaged=0;mu.fill(0);mv.fill(0);mw.fill(0);last=Object.freeze(project());return api;},
    // Changing the bearing reclassifies the sides; the flow continues from its current state.
    // next may also carry turbulence settings (null turns them off).
    setWind(next={}){if(!windState)throw Error('This solver was created with custom boundaries.');const{turbulence:t,...wind}=next;
      configure({wind:{...windState,...wind},turbulence:t});averaged=0;mu.fill(0);mv.fill(0);mw.fill(0);updateInflow(time);last=Object.freeze(project());return api;},
    startAveraging(){averaging=true;averaged=0;mu.fill(0);mv.fill(0);mw.fill(0);return api;},
    stopAveraging(){averaging=false;return api;},
    get averaging(){return averaging;},
    // Velocity (m/s) at world (x, y, z), interpolated from the faces; zero inside solids.
    sample(x,y,z,out=[0,0,0],{mean=false}={}){const X=(x-origin[0])/h,Y=(y-origin[1])/h,Z=(z-origin[2])/h,i=Math.floor(X),j=Math.floor(Y),k=Math.floor(Z);
      if(i>=0&&j>=0&&k>=0&&i<nx&&j<ny&&k<nz&&solid[i+nx*(j+ny*k)]){out[0]=out[1]=out[2]=0;return out;}
      const a=mean?mu:u,b=mean?mv:v,c=mean?mw:w;out[0]=su(a,X,Y,Z,null);out[1]=sv(b,X,Y,Z,null);out[2]=sw(c,X,Y,Z,null);return out;},
    // Cell-centred [u,v,w] per cell (index i + nx*(j + ny*k)), zero in solids.
    cellVelocities({mean=false,out=new Float32Array(cells*3)}={}){const a=mean?mu:u,b=mean?mv:v,c=mean?mw:w;
      for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const n=i+nx*(j+ny*k),o=n*3;if(solid[n]){out[o]=out[o+1]=out[o+2]=0;continue;}
        out[o]=.5*(a[i+(nx+1)*(j+ny*k)]+a[i+1+(nx+1)*(j+ny*k)]);out[o+1]=.5*(b[i+nx*(j+(ny+1)*k)]+b[i+nx*(j+1+(ny+1)*k)]);out[o+2]=.5*(c[n]+c[n+nxy]);}
      return out;},
    // Face arrays for diagnostics and tests; treat them as read-only.
    faces({mean=false}={}){return mean?{u:mu,v:mv,w:mw}:{u,v,w};},
    faceTypes(){return{u:tu,v:tv,w:tw,FIXED,FREE,INFLOW,OPEN};},
    inflowAt(y){return inflow(y);},
    // Net volume flux through the domain sides (m^3/s): inflow, outflow and their imbalance.
    flux(){let inflowSum=0,outflowSum=0;const area=h*h,add=(value,sign)=>{const f=value*sign*area;if(f>0)inflowSum+=f;else outflowSum-=f;};
      for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){add(u[(nx+1)*(j+ny*k)],1);add(u[nx+(nx+1)*(j+ny*k)],-1);}
      for(let k=0;k<nz;k++)for(let i=0;i<nx;i++){add(v[i+nx*(ny+1)*k],1);add(v[i+nx*(ny+(ny+1)*k)],-1);}
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){add(w[i+nx*j],1);add(w[i+nx*(j+ny*nz)],-1);}
      return{inflow:inflowSum,outflow:outflowSum,imbalance:inflowSum?Math.abs(inflowSum-outflowSum)/inflowSum:0};},
    // Fraction of the domain's cross-section, normal to the wind, that solids block.
    blockage(){if(!windState)return 0;const[dx,dz]=windDirection(windState.fromDeg);let ax=0,az=0;
      for(let k=0;k<nz;k++)for(let j=0;j<ny;j++){for(let i=0;i<nx;i++)if(solid[i+nx*(j+ny*k)]){ax++;break;}}
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){for(let k=0;k<nz;k++)if(solid[i+nx*(j+ny*k)]){az++;break;}}
      return(Math.abs(dx)*ax+Math.abs(dz)*az)/(Math.abs(dx)*ny*nz+Math.abs(dz)*nx*ny);},
    maxSpeed(){let m=0;for(let n=0;n<NU;n++)m=Math.max(m,Math.abs(u[n]));for(let n=0;n<NV;n++)m=Math.max(m,Math.abs(v[n]));for(let n=0;n<NW;n++)m=Math.max(m,Math.abs(w[n]));return m;}
  };
  return api;
}
