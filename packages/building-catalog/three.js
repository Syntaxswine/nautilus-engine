// Renderer adapter: the host supplies its existing Three.js instance and atlas.
// No DOM, network access, absolute runtime paths, or private Three.js copy.
import {compileBuilding,MATERIALS,BUILDING_CONTRACT as C} from './index.js';
const add=(a,b)=>a.map((n,i)=>n+b[i]),sub=(a,b)=>a.map((n,i)=>n-b[i]),mul=(a,n)=>a.map(v=>v*n),lerp=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],length=a=>Math.hypot(...a),unit=a=>mul(a,1/(length(a)||1));
const slots=new Map(MATERIALS.map(m=>[m.id,m.tile]));
const aliases={floor:'wood',interior:'plaster',glass:null,metal:'copper'};
function cuts(len,phase=0){const values=[0];for(let n=Math.floor(phase)+1;n<phase+len-1e-7;n++)values.push(n-phase);values.push(len);return values;}
// Atlas cell offsets per material, resolved once: (col+inset, 3-row+inset).
const INSET=.012,SPAN=1-INSET*2,cells=new Map(),local=(value,mid)=>Math.max(0,Math.min(1,value-Math.floor(mid)));
function cellOf(material){let cell=cells.get(material);if(!cell){const tile=slots.get(aliases[material]||material)??0,col=tile%4,row=Math.floor(tile/4);cell=[col+INSET,3-row+INSET];cells.set(material,cell);}return cell;}
// Growable float32 storage. Storing a double rounds it exactly as the plain-array
// copy in Float32BufferAttribute did, so the attribute bytes are unchanged.
class Floats{
 constructor(){this.array=new Float32Array(768);this.length=0;}
 grow(n){if(this.length+n<=this.array.length)return;let size=this.array.length*2;while(size<this.length+n)size*=2;const next=new Float32Array(size);next.set(this.array.subarray(0,this.length));this.array=next;}
 values(){return this.array.subarray(0,this.length);}
}
// Scalar arithmetic below keeps the evaluation order of the vector helpers it
// replaces (hypot, cross, lerp, dot), so every vertex, normal and UV is bit-identical.
// Two pieces are kept for fidelity, not need: quad's flip test reads only a sign, so
// its leading 0 + cannot matter (-0 < 0 is false), and Math.hypot in emit could be a
// plain square root without changing any of the 96 shipped outputs.
class Surfaces{
 constructor(T,lod){this.T=T;this.lod=lod;this.batches=new Map();this.open=new Map();this.current={kind:'exterior',level:0};}
 channel(kind,level=0){this.current={kind,level};this.open=new Map();return this;}
 batch(material){let batch=this.open.get(material);if(batch)return batch;const key=material+':'+this.current.kind+':'+this.current.level;if(!this.batches.has(key))this.batches.set(key,{material,...this.current,positions:new Floats(),normals:new Floats(),uvs:new Floats()});batch=this.batches.get(key);this.open.set(material,batch);return batch;}
 uv(material,u,v,um=.5,vm=.5){const cell=cellOf(material);return[(cell[0]+local(u,um)*SPAN)/4,(cell[1]+local(v,vm)*SPAN)/4];}
 // One textured triangle and its face normal, as tri() always computed them.
 emit(mat,ax,ay,az,bx,by,bz,cx,cy,cz,u0,v0,u1,v1,u2,v2){
  const e1x=bx-ax,e1y=by-ay,e1z=bz-az,e2x=cx-ax,e2y=cy-ay,e2z=cz-az,nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x,len=Math.hypot(nx,ny,nz);
  if(len<1e-10)return;const inv=1/(len||1),x=nx*inv,y=ny*inv,z=nz*inv,batch=this.batch(mat),P=batch.positions,N=batch.normals,U=batch.uvs;
  if(P.length+9>P.array.length){P.grow(9);N.grow(9);}if(U.length+6>U.array.length)U.grow(6);const p=P.array,n=N.array,t=U.array,i=P.length,k=U.length;
  p[i]=ax;p[i+1]=ay;p[i+2]=az;p[i+3]=bx;p[i+4]=by;p[i+5]=bz;p[i+6]=cx;p[i+7]=cy;p[i+8]=cz;
  n[i]=n[i+3]=n[i+6]=x;n[i+1]=n[i+4]=n[i+7]=y;n[i+2]=n[i+5]=n[i+8]=z;
  t[k]=u0;t[k+1]=v0;t[k+2]=u1;t[k+3]=v1;t[k+4]=u2;t[k+5]=v2;P.length=N.length=i+9;U.length=k+6;
 }
 tri(a,b,c,mat,uvs=null){
  if(uvs){this.emit(mat,a[0],a[1],a[2],b[0],b[1],b[2],c[0],c[1],c[2],uvs[0][0],uvs[0][1],uvs[1][0],uvs[1][1],uvs[2][0],uvs[2][1]);return;}
  const e1x=b[0]-a[0],e1y=b[1]-a[1],e1z=b[2]-a[2],e2x=c[0]-a[0],e2y=c[1]-a[1],e2z=c[2]-a[2],nx=e1y*e2z-e1z*e2y,ny=e1z*e2x-e1x*e2z,nz=e1x*e2y-e1y*e2x,len=Math.hypot(nx,ny,nz);
  if(len<1e-10)return;const inv=1/(len||1);this.tiledTriangle(a,b,c,mat,[nx*inv,ny*inv,nz*inv]);
 }
 tiledTriangle(a,b,c,mat,n){let u=Math.abs(n[1])>.95?unit(sub([1,0,0],mul(n,n[0]))):unit([n[2],0,-n[0]]),v=unit(cross(n,u));if(v[1]<0){u=mul(u,-1);v=mul(v,-1);}const points=[a,b,c].map(p=>({p,uv:[dot(p,u),dot(p,v)]})),lo=[0,1].map(i=>Math.floor(Math.min(...points.map(p=>p.uv[i])))),hi=[0,1].map(i=>Math.ceil(Math.max(...points.map(p=>p.uv[i]))));
  const clip=(polygon,axis,bound,greater)=>{const result=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],inside=p=>greater?p.uv[axis]>=bound-1e-9:p.uv[axis]<=bound+1e-9,ai=inside(a),bi=inside(b);if(ai)result.push(a);if(ai!==bi){const t=(bound-a.uv[axis])/(b.uv[axis]-a.uv[axis]);result.push({p:lerp(a.p,b.p,t),uv:lerp(a.uv,b.uv,t)});}}return result;};
  for(let x=lo[0];x<hi[0];x++)for(let y=lo[1];y<hi[1];y++){let polygon=points;for(const[axis,bound,greater]of[[0,x,true],[0,x+1,false],[1,y,true],[1,y+1,false]])polygon=clip(polygon,axis,bound,greater);for(let i=1;i<polygon.length-1;i++){const t=[polygon[0],polygon[i],polygon[i+1]];this.tri(...t.map(p=>p.p),mat,t.map(p=>this.uv(mat,p.uv[0],p.uv[1],x+.5,y+.5)));}}
 }
 quad(a,b,c,d,mat,normal=null,phaseU=0,phaseV=0){
  const abx=b[0]-a[0],aby=b[1]-a[1],abz=b[2]-a[2],acx=c[0]-a[0],acy=c[1]-a[1],acz=c[2]-a[2];
  const flip=normal&&((0+(aby*acz-abz*acy)*normal[0])+(abz*acx-abx*acz)*normal[1])+(abx*acy-aby*acx)*normal[2]<0;
  const u=Math.hypot(abx,aby,abz),v=Math.hypot(d[0]-a[0],d[1]-a[1],d[2]-a[2]);if(u<1e-6||v<1e-6)return;
  if(Math.hypot(a[0]+c[0]-(b[0]+d[0]),a[1]+c[1]-(b[1]+d[1]),a[2]+c[2]-(b[2]+d[2]))>1e-6){if(flip){this.tri(a,c,b,mat);this.tri(a,d,c,mat);}else{this.tri(a,b,c,mat);this.tri(a,c,d,mat);}return;}
  // Cell corner (x,y) is lerp(lerp(a,b,x/u),lerp(d,c,x/u),y/v); each column edge is computed once.
  const us=cuts(u,phaseU),vs=cuts(v,phaseV),cell=cellOf(mat),dcx=c[0]-d[0],dcy=c[1]-d[1],dcz=c[2]-d[2];
  for(let i=0;i<us.length-1;i++){
   const u0=us[i],u1=us[i+1],t0=u0/u,t1=u1/u,um=(u0+u1)/2+phaseU,s0=(cell[0]+local(u0+phaseU,um)*SPAN)/4,s1=(cell[0]+local(u1+phaseU,um)*SPAN)/4;
   const l0x=a[0]+abx*t0,l0y=a[1]+aby*t0,l0z=a[2]+abz*t0,r0x=d[0]+dcx*t0,r0y=d[1]+dcy*t0,r0z=d[2]+dcz*t0;
   const l1x=a[0]+abx*t1,l1y=a[1]+aby*t1,l1z=a[2]+abz*t1,r1x=d[0]+dcx*t1,r1y=d[1]+dcy*t1,r1z=d[2]+dcz*t1;
   for(let j=0;j<vs.length-1;j++){
    const v0=vs[j],v1=vs[j+1],w0=v0/v,w1=v1/v,vm=(v0+v1)/2+phaseV,q0=(cell[1]+local(v0+phaseV,vm)*SPAN)/4,q1=(cell[1]+local(v1+phaseV,vm)*SPAN)/4;
    // Corners p0=(u0,v0), p1=(u1,v0), p2=(u1,v1), p3=(u0,v1).
    const p0x=l0x+(r0x-l0x)*w0,p0y=l0y+(r0y-l0y)*w0,p0z=l0z+(r0z-l0z)*w0,p1x=l1x+(r1x-l1x)*w0,p1y=l1y+(r1y-l1y)*w0,p1z=l1z+(r1z-l1z)*w0;
    const p2x=l1x+(r1x-l1x)*w1,p2y=l1y+(r1y-l1y)*w1,p2z=l1z+(r1z-l1z)*w1,p3x=l0x+(r0x-l0x)*w1,p3y=l0y+(r0y-l0y)*w1,p3z=l0z+(r0z-l0z)*w1;
    if(flip){this.emit(mat,p0x,p0y,p0z,p2x,p2y,p2z,p1x,p1y,p1z,s0,q0,s1,q1,s1,q0);this.emit(mat,p0x,p0y,p0z,p3x,p3y,p3z,p2x,p2y,p2z,s0,q0,s0,q1,s1,q1);}
    else{this.emit(mat,p0x,p0y,p0z,p1x,p1y,p1z,p2x,p2y,p2z,s0,q0,s1,q0,s1,q1);this.emit(mat,p0x,p0y,p0z,p2x,p2y,p2z,p3x,p3y,p3z,s0,q0,s1,q1,s0,q1);}
   }
  }
 }
 box(center,size,mat,yaw=0,bevel=false){const [x,y,z]=size.map(n=>n/2),cs=Math.cos(yaw),sn=Math.sin(yaw),P=p=>[center[0]+p[0]*cs+p[2]*sn,center[1]+p[1],center[2]-p[0]*sn+p[2]*cs];if(!bevel||this.lod==='game'||Math.min(...size)<.05){const faces=[[[x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z]],[[ -x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z]],[[ -x,y,-z],[-x,y,z],[x,y,z],[x,y,-z]],[[ -x,-y,z],[-x,-y,-z],[x,-y,-z],[x,-y,z]],[[ -x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],[[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]];for(const f of faces)this.quad(...f.map(P),mat,sub(P(f.reduce((s,p)=>add(s,mul(p,.25)),[0,0,0])),center));return;}
  // Authoring source retains bevel planes; game derivation removes them at the same bounds.
  const h=[x,y,z],r=Math.min(.025,Math.min(...size)*.18);for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){const a=(axis+1)%3,b=(axis+2)%3,points=[];for(const[sa,sb]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const q=[0,0,0];q[axis]=sign*h[axis];q[a]=sa*(h[a]-r);q[b]=sb*(h[b]-r);points.push(P(q));}const n=[0,0,0];n[axis]=sign;this.quad(...points,mat,sub(P(n),center));}
  for(let axis=0;axis<3;axis++){const a=(axis+1)%3,b=(axis+2)%3;for(const sa of[-1,1])for(const sb of[-1,1]){const points=[];for(const[end,t]of[[-1,0],[1,0],[1,1],[-1,1]]){const q=[0,0,0];q[axis]=end*(h[axis]-r);q[a]=sa*(h[a]-(t?r:0));q[b]=sb*(h[b]-(t?0:r));points.push(P(q));}this.quad(...points,mat,sub(points.reduce((s,p)=>add(s,mul(p,.25)),[0,0,0]),center));}}
  for(const sx of[-1,1])for(const sy of[-1,1])for(const sz of[-1,1]){const points=[[sx*x,sy*(y-r),sz*(z-r)],[sx*(x-r),sy*y,sz*(z-r)],[sx*(x-r),sy*(y-r),sz*z]].map(P),n=sub(points.reduce((s,p)=>add(s,mul(p,1/3)),[0,0,0]),center);if(dot(cross(sub(points[1],points[0]),sub(points[2],points[0])),n)<0)[points[1],points[2]]=[points[2],points[1]];this.tri(...points,mat);}
 }
 cylinder(center,r,h,mat,sides=this.lod==='authoring'?24:10){for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,p=[center[0]+Math.cos(a)*r,center[1]-h/2,center[2]+Math.sin(a)*r],q=[center[0]+Math.cos(b)*r,center[1]-h/2,center[2]+Math.sin(b)*r];this.quad(p,q,add(q,[0,h,0]),add(p,[0,h,0]),mat,sub([p[0],center[1],p[2]],center));this.tri(add(center,[0,h/2,0]),add(q,[0,h,0]),add(p,[0,h,0]),mat);this.tri(add(center,[0,-h/2,0]),p,q,mat);}}
 mesh(materials){const root=new this.T.Group();for(const b of this.batches.values()){const g=new this.T.BufferGeometry();g.setAttribute('position',new this.T.Float32BufferAttribute(b.positions.values(),3));g.setAttribute('normal',new this.T.Float32BufferAttribute(b.normals.values(),3));g.setAttribute('uv',new this.T.Float32BufferAttribute(b.uvs.values(),2));g.computeBoundingBox();g.computeBoundingSphere();const mesh=new this.T.Mesh(g,materials.get(b.material));mesh.name=b.kind+'-L'+b.level+'-'+b.material;mesh.userData={kind:b.kind,level:b.level,materialId:b.material};mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}return root;}
}
function materialsFor(T,atlas,b,grey){const result=new Map();for(const id of[...slots.keys(),'floor','interior','glass','metal']){const tint=id===b.wall||id===b.baseWall?b.tint||[1,1,1]:id==='floor'?[.78,.72,.6]:[1,1,1],material=new T.MeshStandardMaterial({color:grey?0xaaa99f:new T.Color(...tint),map:grey||id==='glass'?null:atlas||null,roughness:id==='glass'?.28:1,metalness:0,transparent:id==='glass',opacity:id==='glass'?(grey?.08:.58):1,side:id==='glass'?T.DoubleSide:T.FrontSide});if(id==='glass')material.color.set(grey?'#49524d':'#91aca8');result.set(id,material);}return result;}
function wallSurface(s,wall,b){const y=wall.level*C.floorSpacing,mat=wall.interior?'interior':wall.level===0&&b.baseWall?b.baseWall:b.wall,dx=(wall.b[0]-wall.a[0])/wall.length,dz=(wall.b[1]-wall.a[1])/wall.length,normal=[dz,0,-dx],lerp2=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],oa=wall.outerA||[wall.a[0]+dz*.08,wall.a[1]-dx*.08],ob=wall.outerB||[wall.b[0]+dz*.08,wall.b[1]-dx*.08],ia=wall.innerA||[wall.a[0]-dz*.08,wall.a[1]+dx*.08],ib=wall.innerB||[wall.b[0]-dz*.08,wall.b[1]+dx*.08],point=(u,v,outer)=>{const p=lerp2(outer?oa:ia,outer?ob:ib,u/wall.length);return[p[0],y+v,p[1]];};
 const us=[...new Set([0,wall.length,...wall.openings.flatMap(o=>[o.u0,o.u1])])].sort((a,b)=>a-b),vs=[...new Set([0,2,...wall.openings.flatMap(o=>[o.bottom,o.top])])].sort((a,b)=>a-b),solid=(i,j)=>i>=0&&j>=0&&i<us.length-1&&j<vs.length-1&&!wall.openings.some(o=>(us[i]+us[i+1])/2>o.u0&&(us[i]+us[i+1])/2<o.u1&&(vs[j]+vs[j+1])/2>=o.bottom&&(vs[j]+vs[j+1])/2<o.top);
 s.channel(wall.interior?'interior':'exterior',wall.level);for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){if(!solid(i,j))continue;const u0=us[i],u1=us[i+1],v0=vs[j],v1=vs[j+1];s.quad(point(u0,v0,true),point(u1,v0,true),point(u1,v1,true),point(u0,v1,true),mat,normal,(wall.phase||0)+u0,v0);s.quad(point(u1,v0,false),point(u0,v0,false),point(u0,v1,false),point(u1,v1,false),'interior',mul(normal,-1),u0,v0);if(!solid(i,j-1))s.quad(point(u0,v0,false),point(u1,v0,false),point(u1,v0,true),point(u0,v0,true),mat,[0,-1,0]);if(!solid(i,j+1))s.quad(point(u0,v1,true),point(u1,v1,true),point(u1,v1,false),point(u0,v1,false),mat,[0,1,0]);if(!solid(i-1,j)&&wall.interior||i>0&&!solid(i-1,j))s.quad(point(u0,v0,false),point(u0,v0,true),point(u0,v1,true),point(u0,v1,false),mat,[-dx,0,-dz]);if(!solid(i+1,j)&&wall.interior||i<us.length-2&&!solid(i+1,j))s.quad(point(u1,v0,true),point(u1,v0,false),point(u1,v1,false),point(u1,v1,true),mat,[dx,0,dz]);}
 // Fill the inherited slab interval along the envelope with an explicit narrow band.
 if(!wall.interior&&wall.level<b.stories-1)s.box([(wall.a[0]+wall.b[0])/2,y+2.06,(wall.a[1]+wall.b[1])/2],[wall.length,.12,.16],b.trim,-Math.atan2(dz,dx));
 return{point,normal,y,dx,dz};
}
function openings(s,wall,b,doors){const y=wall.level*C.floorSpacing,dx=(wall.b[0]-wall.a[0])/wall.length,dz=(wall.b[1]-wall.a[1])/wall.length,yaw=-Math.atan2(dz,dx)||0,P=(u,h,side=0)=>[wall.a[0]+dx*u+dz*side,y+h,wall.a[1]+dz*u-dx*side];s.channel('trim',wall.level);
 for(const o of wall.openings){const w=o.u1-o.u0,h=o.top-o.bottom,mid=(o.u0+o.u1)/2;for(const side of wall.interior?[0]:[-.09,.09]){s.box(P(o.u0-.035,(o.bottom+o.top)/2,side),[.07,h+.14,.07],b.trim,yaw,true);s.box(P(o.u1+.035,(o.bottom+o.top)/2,side),[.07,h+.14,.07],b.trim,yaw,true);s.box(P(mid,o.top+.035,side),[w+.14,.07,.07],b.trim,yaw,true);if(o.type==='window')s.box(P(mid,o.bottom-.035,side),[w+.2,.07,.12],b.trim,yaw,true);}
  if(o.type==='window'){s.channel('glazing',wall.level);s.box(P(mid,(o.bottom+o.top)/2),[w,h,.018],'glass',yaw);s.channel('trim',wall.level);s.box(P(mid,(o.bottom+o.top)/2,.1),[.035,h,.04],b.trim,yaw);s.box(P(mid,o.bottom+h*.5,.1),[w,.035,.04],b.trim,yaw);if(b.shutters&&!wall.interior)for(const sign of[-1,1])s.box(P(mid+sign*(w*.5+.23),(o.bottom+o.top)/2,.12),[.32,h,.05],b.wall,yaw,true);}
  else doors.push({id:o.id,level:wall.level,hinge:P(o.u0,0),yaw,width:w,height:h,loading:o.type==='loading',rooms:wall.rooms});
 }
}
function roof(s,p,b){const h=p.roofBase??p.stories*C.floorSpacing-.12,over=.28,x=p.x-over,z=p.z-over,w=p.w+over*2,d=p.d+over*2,axis=p.axis==='auto'?(w>=d?'x':'z'):p.axis,span=axis==='x'?d:w,run=axis==='x'?w:d,rise=Math.max(.55,Math.min(4,span*b.pitch)),mat=b.roof;const point=(along,across,height)=>axis==='x'?[x+along,h+height,z+across]:[x+across,h+height,z+along];s.channel('roof',p.detailLevel??p.stories-1);
 if(p.roof==='flat'){s.box([p.x+p.w/2,h+.06,p.z+p.d/2],[p.w+.25,.12,p.d+.25],b.roof);for(const[c,size]of[[[p.x+p.w/2,h+.24,p.z],[p.w,.35,.16]],[[p.x+p.w/2,h+.24,p.z+p.d],[p.w,.35,.16]],[[p.x,h+.24,p.z+p.d/2],[.16,.35,p.d]],[[p.x+p.w,h+.24,p.z+p.d/2],[.16,.35,p.d]]])s.box(c,size,b.wall,0,true);return;}
 if(['hip','mansard','pyramid'].includes(p.roof)){
  const y=h+.08,corners=[[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]],inset=p.roof==='pyramid'?Math.min(w,d)/2:p.roof==='mansard'?Math.min(w,d)*.23:Math.min(w,d)*.45,top=p.roof==='pyramid'?[[x+w/2,y+rise,z+d/2]]:[[x+inset,y+rise,z+inset],[x+w-inset,y+rise,z+inset],[x+w-inset,y+rise,z+d-inset],[x+inset,y+rise,z+d-inset]];
  if(top.length===1){for(let i=0;i<4;i++)s.tri(corners[i],top[0],corners[(i+1)%4],mat);}else{for(let i=0;i<4;i++)s.quad(corners[i],corners[(i+1)%4],top[(i+1)%4],top[i],mat,[0,1,0]);s.quad(...top,mat,[0,1,0]);}return;
 }
 let profile=p.roof==='gambrel'?[[0,0],[.19,.7],[.5,1],[.81,.7],[1,0]]:p.roof==='saltbox'?[[0,0],[.32,1],[1,0]]:p.roof==='shed'?[[0,1],[1,0]]:p.roof==='butterfly'?[[0,1],[.5,0],[1,1]]:p.roof==='sawtooth'?[[0,0],[.28,1],[.333,0],[.61,1],[.666,0],[.94,1],[1,0]]:[[0,0],[.5,1],[1,0]];
 profile=profile.map(([u,v])=>[u*span,v*rise]);for(let i=0;i<profile.length-1;i++){const[a,ah]=profile[i],[q,qh]=profile[i+1],surface=b.glazed||p.roof==='sawtooth'&&qh<ah?'glass':mat;s.quad(point(0,a,ah),point(run,a,ah),point(run,q,qh),point(0,q,qh),surface,[0,1,0]);if(surface!=='glass')s.quad(point(run,a,ah-.06),point(0,a,ah-.06),point(0,q,qh-.06),point(run,q,qh-.06),'dark-wood',[0,-1,0]);if(b.glazed){for(let t=0;t<=run;t+=1.1)s.quad(point(t-.03,a,ah+.025),point(t+.03,a,ah+.025),point(t+.03,q,qh+.025),point(t-.03,q,qh+.025),b.trim,[0,1,0]);s.box(point(run/2,a,ah+.025),axis==='x'?[run,.05,.05]:[.05,.05,run],b.trim);}if(s.lod==='authoring'&&surface!=='glass'){const slope=Math.hypot(q-a,qh-ah);for(let t=.35;t<slope;t+=.35){const f=t/slope,ac=a+(q-a)*f,hh=ah+(qh-ah)*f;s.box(point(run/2,ac,hh+.014),axis==='x'?[run,.028,.035]:[.035,.028,run],mat,0,true);}}}
 // Close gable/clerestory ends and the raised edge of shed/butterfly roofs.
 for(const at of[0,run])for(let i=0;i<profile.length-1;i++){const[a,ah]=profile[i],[q,qh]=profile[i+1],a0=point(at,a,0),b0=point(at,q,0),a1=point(at,a,ah),b1=point(at,q,qh),n=axis==='x'?[at?1:-1,0,0]:[0,0,at?1:-1];if(ah&&qh)s.quad(a0,b0,b1,a1,b.wall,n);else if(ah||qh){const pts=ah?[a0,b0,a1]:[a0,b0,b1];if(dot(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0])),n)<0)[pts[1],pts[2]]=[pts[2],pts[1]];s.tri(...pts,b.wall);}}
 for(const[a,ah]of[profile[0],profile.at(-1)])if(ah>0)s.quad(point(0,a,0),point(run,a,0),point(run,a,ah),point(0,a,ah),b.wall,axis==='x'?[0,0,a?1:-1]:[a?1:-1,0,0]);
 for(const at of[0,span])s.box(point(run/2,at,-.015),axis==='x'?[run,.12,.1]:[.1,.12,run],b.trim,0,true);
}
function porch(s,p,b){s.channel('porch',0);s.box([p.x+p.w/2,-.065,p.z+p.d/2],[p.w,.13,p.d],'stone');s.box([p.x+p.w/2,2.02,p.z+p.d/2],[p.w+.3,.12,p.d+.3],b.roof,0,true);const count=Math.max(2,Math.ceil(p.w/2.8));for(let i=0;i<=count;i++){const x=p.x+p.w*i/count;s.box([x,1,p.z],[.13,2,.13],b.trim,0,true);if(b.brackets){s.box([x+.15,1.82,p.z],[.35,.09,.1],b.trim,0,true);s.box([x,1.82,p.z+.15],[.1,.09,.35],b.trim,0,true);}}
 for(const z of[p.z,p.z+p.d])for(const side of[0,1]){const w=(p.w-1.6)/2,x=p.x+(side?p.w-w/2:w/2);s.box([x,.82,z],[w,.07,.08],b.trim,0,true);const n=Math.ceil(w/(s.lod==='authoring'?.3:.65));for(let i=0;i<n;i++)s.box([x-w/2+w*(i+.5)/n,.44,z],[.045,.7,.045],b.trim,0,true);}}
function details(s,b){const core=b.parts[0],top=core.stories*C.floorSpacing-.12,rise=Math.min(4,Math.min(core.w,core.d)*b.pitch);s.channel('details',core.stories-1);
 for(let i=0;i<(b.chimneys||0);i++){const x=core.x+core.w*(i+1)/(b.chimneys+1),z=core.z+core.d*.64,h=top+rise*.55;s.box([x,h+.7,z],[.65,1.4,.7],'brick',0,true);s.box([x,h+1.43,z],[.82,.12,.86],'stone',0,true);s.cylinder([x,h+1.65,z],.14,.32,'terracotta',s.lod==='authoring'?16:8);}
 for(let i=0;i<(b.dormers||0);i++){const x=core.x+core.w*(i+1)/(b.dormers+1),z=core.z+.75,y=top+rise*.38;s.box([x,y+.36,z],[1.1,.72,1.1],b.wall,0,true);s.box([x,y+.4,z-.56],[.62,.5,.025],'glass');roof(s,{x:x-.65,z:z-.65,w:1.3,d:1.3,stories:1,roof:'gable',axis:'z',roofBase:y+.72,detailLevel:core.stories-1},{...b,pitch:.4,parts:[core]});}
 if(b.belfry||b.cupola){const x=core.x+core.w*.5,z=core.z+core.d*.5,y=top+rise+.35;s.box([x,y,z],[1,.8,1],b.wall,0,true);for(const side of[-1,1])s.box([x,y,z+side*.51],[.55,.4,.025],'dark-wood');s.cylinder([x,y+.58,z],.7,.16,b.trim);for(let i=0;i<8;i++){const a=i*Math.PI/4,q=(i+1)*Math.PI/4;s.tri([x+Math.cos(a)*.75,y+.66,z+Math.sin(a)*.75],[x,y+1.4,z],[x+Math.cos(q)*.75,y+.66,z+Math.sin(q)*.75],b.roof);}}
 const tower=b.tower||b.turret;if(tower){const cx=tower.r?tower.x:tower.x+tower.w/2,cz=tower.r?tower.z:tower.z+tower.d/2,r=tower.r||Math.max(tower.w,tower.d)*.54,height=tower.stories*C.floorSpacing-.12;s.channel('tower',0);if(tower.r)s.cylinder([cx,height/2,cz],r,height,b.wall,8);else s.box([cx,height/2,cz],[tower.w,height,tower.d],b.wall,0,true);for(let level=0;level<tower.stories;level++){const y=level*C.floorSpacing+1.15;for(let i=0;i<(tower.r?8:4);i++){const a=(i+(tower.r?.5:0))/(tower.r?8:4)*Math.PI*2,rr=tower.r?r*Math.cos(Math.PI/8)+.015:(i%2?tower.d:tower.w)/2+.015,center=[cx+Math.cos(a)*rr,y,cz+Math.sin(a)*rr],yaw=Math.PI/2-a;s.box(center,[.55,.75,.035],'glass',yaw);for(const offset of[-.31,.31])s.box(add(center,[Math.cos(yaw)*offset,0,-Math.sin(yaw)*offset]),[.06,.87,.06],b.trim,yaw,true);}}for(let i=0;i<(tower.r?8:4);i++){const n=tower.r?8:4,a=(i+(tower.r?0:.5))/n*Math.PI*2,q=(i+1+(tower.r?0:.5))/n*Math.PI*2,rr=tower.r?r+.2:Math.max(tower.w,tower.d)*.78;s.tri([cx+Math.cos(a)*rr,height,cz+Math.sin(a)*rr],[cx,height+Math.max(1.2,r*1.4),cz],[cx+Math.cos(q)*rr,height,cz+Math.sin(q)*rr],b.roof);}}
 if(b.dome){s.channel('roof',core.stories-1);const cx=core.x+core.w*.5,cz=core.z+core.d*.5,r=Math.min(2.3,core.w*.2),y=top+rise*.5,sides=s.lod==='authoring'?32:12,rings=s.lod==='authoring'?12:5;for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const P=(k,l)=>{const a=k/sides*Math.PI*2,t=l/rings*Math.PI/2;return[cx+Math.cos(a)*Math.cos(t)*r,y+Math.sin(t)*r,cz+Math.sin(a)*Math.cos(t)*r];};s.quad(P(i,j),P(i+1,j),P(i+1,j+1),P(i,j+1),'copper',[0,1,0]);}}
 if(b.balcony){s.channel('balcony',1);const x=core.x+core.w*.5,w=core.w*.65,z=core.z-1;s.box([x,2.06,z],[w,.12,2],'wood');for(const zz of[z-1,z+1]){s.box([x,2.93,zz],[w,.07,.07],b.trim,0,true);for(let i=0;i<=Math.ceil(w/.7);i++)s.box([x-w/2+w*i/Math.ceil(w/.7),2.55,zz],[.05,.9,.05],b.trim,0,true);}}
 if(b.awning){s.channel('awning',0);s.box([core.x+core.w/2,1.9,core.z-.65],[core.w,.12,1.35],'green-metal',0,true);}
 if(b.loadingDock){s.channel('loading-dock',0);s.box([core.x+core.w/2,.25,core.z-1.3],[core.w,.5,2.6],'concrete');}
 if(b.waterwheel){s.channel('waterwheel',0);const x=core.x+core.w+.7,z=core.z+core.d*.7,y=1.4,n=s.lod==='authoring'?24:12;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,q=(i+1)/n*Math.PI*2;for(const xx of[x-.35,x+.35])s.quad([xx,y+Math.sin(a)*1.3,z+Math.cos(a)*1.3],[xx,y+Math.sin(q)*1.3,z+Math.cos(q)*1.3],[xx,y+Math.sin(q)*1.05,z+Math.cos(q)*1.05],[xx,y+Math.sin(a)*1.05,z+Math.cos(a)*1.05],'dark-wood',[xx<x?-1:1,0,0]);s.box([x,y+Math.sin(a)*1.3,z+Math.cos(a)*1.3],[.8,.16,.18],'wood');}s.box([x,y,z],[1,.16,.16],'dark-wood');}
}
export function createBuildingModel(T,input,{atlas=null,lod='game',grey=false}={}){
 if(!T?.BufferGeometry||!['game','authoring'].includes(lod))throw Error('Supply the host Three.js instance and a supported LOD.');const b=input?.floors?input:compileBuilding(input),s=new Surfaces(T,lod),doors=[],materials=materialsFor(T,atlas,b,grey);
 for(const floor of b.floors){s.channel('floor',floor.level);const cells=new Map(floor.cells.filter(c=>!floor.holes.some(h=>c.x+.25>h.x&&c.x+.25<h.x+h.w&&c.z+.25>h.z&&c.z+.25<h.z+h.d)).map(c=>[c.x+','+c.z,c]));for(const c of cells.values()){const x=c.x,z=c.z,y=floor.height,mat=['warehouse','workshop','service'].includes(b.layout)?'concrete':'floor';s.quad([x,y,z],[x+.5,y,z],[x+.5,y,z+.5],[x,y,z+.5],mat,[0,1,0],x,z);s.quad([x,y-.12,z],[x+.5,y-.12,z],[x+.5,y-.12,z+.5],[x,y-.12,z+.5],mat,[0,-1,0],x,z);for(const[dx,dz,a,q]of[[0,-.5,[x,y,z],[x+.5,y,z]],[.5,0,[x+.5,y,z],[x+.5,y,z+.5]],[0,.5,[x+.5,y,z+.5],[x,y,z+.5]],[-.5,0,[x,y,z+.5],[x,y,z]]])if(!cells.has((x+dx)+','+(z+dz)))s.quad(a,q,add(q,[0,-.12,0]),add(a,[0,-.12,0]),mat,[dx,0,dz]);}for(const wall of floor.walls){wallSurface(s,wall,b);openings(s,wall,b,doors);}}
 for(const stair of b.stairs){s.channel('stairs',stair.level);const n=14;for(let i=0;i<n;i++){const h=(i+1)*stair.height/n;s.box([stair.x+stair.w/2,stair.level*C.floorSpacing+h/2,stair.z+stair.d*(i+.5)/n],[stair.w,h,stair.d/n],'wood');}}
 for(const p of b.parts)roof(s,p,b);if(b.porch)porch(s,b.porch,b);if(b.bridge)porch(s,b.bridge,b);details(s,b);
 const root=s.mesh(materials);root.name=b.id;root.userData={assetId:b.id,contractVersion:1,lod,metresPerUnit:1,sourceReferences:b.refs,consumerIntegrated:false};const doorRoots=[];
 for(const door of doors){const leaf=new Surfaces(T,lod);leaf.channel('door-leaf',door.level);leaf.box([door.width/2,door.height/2,0],[door.width-.03,door.height,.04],door.loading?'blue-metal':'dark-wood',0,true);if(!door.loading)leaf.box([door.width-.12,.8,-.04],[.04,.05,.06],'metal',0,true);const pivot=leaf.mesh(materials);pivot.name=door.id;pivot.position.fromArray(door.hinge);pivot.rotation.y=door.yaw;pivot.userData={kind:'door',level:door.level,hingeYaw:door.yaw,...door};root.add(pivot);doorRoots.push(pivot);}
 root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root),bounds={min:box.min.toArray(),max:box.max.toArray()};let triangles=0;root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 return{root,building:b,bounds,triangles,lod,doorRoots,materials,
  setDoorsOpen(open){for(const pivot of doorRoots)pivot.rotation.y=pivot.userData.hingeYaw+(open?Math.PI*.44:0);root.updateMatrixWorld(true);},
  setView({roof=true,maxLevel=Infinity,cutaway=false}={}){for(const child of root.children){const {kind,level=0}=child.userData;child.visible=level<=maxLevel&&(roof||!['roof','details','tower'].includes(kind))&&(!cutaway||!['exterior','glazing','trim','tower'].includes(kind));}},
  dispose(){root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of materials.values())m.dispose();root.removeFromParent();}
 };
}
