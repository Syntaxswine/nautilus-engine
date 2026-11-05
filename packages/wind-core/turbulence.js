// Synthetic inflow turbulence: a sum of random Fourier modes (Kraichnan 1970; Smirnov, Shi
// and Celik 2001), each divergence-free, with energies from the von Karman spectrum and the
// pattern convected with the reference wind (Taylor's frozen turbulence). Standard
// deviations follow the neutral surface layer: 2.5, 1.9 and 1.25 u* along-wind, lateral and
// vertical (Panofsky and Dutton 1984). 2.5 u* is close to the Eurocode intensity 1/ln(z/z0).
export const SURFACE_LAYER_SIGMA=Object.freeze([2.5,1.9,1.25]);
export function seededRandom(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function createInflowTurbulence({frictionVelocity,direction,convection,lengthScale=20,modes=48,kMin,kMax,seed=1,gain=1}){
  if(!(frictionVelocity>=0)||!(convection>=0)||!(lengthScale>0)||!(kMin>0&&kMax>kMin)||!Number.isInteger(modes)||modes<1||modes>512||!(gain>=0))throw Error('Invalid inflow turbulence settings.');
  const random=seededRandom(seed),gauss=()=>Math.sqrt(-2*Math.log(1-random()))*Math.cos(2*Math.PI*random());
  const K=new Float64Array(modes*3),P=new Float64Array(modes*3),Q=new Float64Array(modes*3),omega=new Float64Array(modes);
  const perpendicular=(d,out,o,scale)=>{let x,y,z,l;do{const a=[gauss(),gauss(),gauss()];x=d[1]*a[2]-d[2]*a[1];y=d[2]*a[0]-d[0]*a[2];z=d[0]*a[1]-d[1]*a[0];l=Math.hypot(x,y,z);}while(l<1e-9);out[o]=x/l*scale;out[o+1]=y/l*scale;out[o+2]=z/l*scale;};
  for(let n=0;n<modes;n++){
    const k=kMin*(kMax/kMin)**((n+.5)/modes),dk=k*Math.log(kMax/kMin)/modes,kl=k*lengthScale,energy=kl**4/(1+kl*kl)**(17/6),a=Math.sqrt(energy*dk);
    const cy=2*random()-1,phi=2*Math.PI*random(),sy=Math.sqrt(1-cy*cy),d=[sy*Math.cos(phi),cy,sy*Math.sin(phi)];
    K[n*3]=k*d[0];K[n*3+1]=k*d[1];K[n*3+2]=k*d[2];perpendicular(d,P,n*3,a*gauss());perpendicular(d,Q,n*3,a*gauss());
    omega[n]=gauss()*convection/lengthScale;
  }
  const raw=(x,y,z,t,out)=>{let gx=0,gy=0,gz=0;const X=x-convection*direction[0]*t,Z=z-convection*direction[1]*t;
    for(let n=0,o=0;n<modes;n++,o+=3){const phase=K[o]*X+K[o+1]*y+K[o+2]*Z+omega[n]*t,c=Math.cos(phase),s=Math.sin(phase);gx+=P[o]*c+Q[o]*s;gy+=P[o+1]*c+Q[o+1]*s;gz+=P[o+2]*c+Q[o+2]*s;}
    out[0]=gx;out[1]=gy;out[2]=gz;return out;};
  // Each wind-frame component is scaled to its target on a fixed sample of points. The
  // unequal scales leave the field slightly divergent; the solver's projection removes that.
  const[dx,dz]=direction,probe=seededRandom(seed^0x9e3779b9),g=[0,0,0],sum=[0,0,0],span=4*lengthScale,count=2048;
  for(let n=0;n<count;n++){raw(probe()*span,probe()*span,probe()*span,probe()*span/Math.max(convection,1e-3),g);const along=g[0]*dx+g[2]*dz,lateral=g[2]*dx-g[0]*dz;sum[0]+=along*along;sum[1]+=lateral*lateral;sum[2]+=g[1]*g[1];}
  const[su,sv,sw]=SURFACE_LAYER_SIGMA.map((s,a)=>sum[a]>0?s*frictionVelocity*gain/Math.sqrt(sum[a]/count):0);
  return Object.freeze({
    sigma:Object.freeze(SURFACE_LAYER_SIGMA.map(s=>s*frictionVelocity*gain)),lengthScale,modes,seed,
    // Fluctuation (m/s, world x/height/z) at a point and time; it fades to zero at the ground.
    sample(x,y,z,t,out=[0,0,0]){raw(x,y,z,t,out);const ramp=y<=0?0:1-Math.exp(-y),along=(out[0]*dx+out[2]*dz)*su*ramp,lateral=(out[2]*dx-out[0]*dz)*sv*ramp,vertical=out[1]*sw*ramp;
      out[0]=along*dx-lateral*dz;out[1]=vertical;out[2]=along*dz+lateral*dx;return out;}
  });
}
