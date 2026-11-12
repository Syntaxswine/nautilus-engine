import {VEHICLE_BODIES} from './catalogue.js';

// Saved author surfaces, in metres. Game geometry is reduced FROM these surfaces
// by tools/vehicle-art/bake.mjs, never independently re-tessellated at runtime.
export const SKIN_SIZE = 2048;
export const SKIN_RECTS = Object.freeze({side: [8, 8, 2032, 688], top: [8, 712, 2032, 672],
  front: [8, 1408, 1000, 632], rear: [1040, 1408, 1000, 632]});
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t * t * (3 - 2 * t);

export function vehicleProfile(body) {
  const h = body.heightM - (body.kind === 'suv' ? .064 : 0);
  if (body.id === 'hatchback') return {belt: .82, roof: [[-1.56,.90],[-1.12,h],[.29,h],[.87,.86]], windows: [[-1.25,-.46],[-.37,.62]], doors: [-.42,.66]};
  if (body.id === 'sedan') return {belt: .83, roof: [[-1.51,.89],[-.96,h],[.44,h],[1.11,.88]], windows: [[-1.16,-.35],[-.25,.78]], doors: [-.31,.80]};
  if (body.id === 'pickup') return {study01:true,belt:1.06,roof:[[-.16,1.09],[-.06,h],[.72,h],[1.25,1.10]],windows:[[-.025,1.12]],doors:[-.13,1.20],handles:[.12],bedEnd:-.26};
  if (body.id === 'crew-pickup') return {belt: 1.10, roof: [[-.68,1.19],[-.42,h],[1.11,h],[1.72,1.13]], windows: [[-.44,.20],[.29,1.39]], doors: [.24,1.45], bedEnd: -.78};
  if (body.id === 'cargo-van') return {study01:true,belt:1.09,rearHeight:1.97,roof:[[-2.35,2.00],[-2.15,h],[.94,h],[1.71,1.16]],windows:[[.64,1.47]],doors:[.53,1.55],handles:[.76],cargo:true};
  if (body.id === 'passenger-van') return {belt: 1.04, roof: [[-2.12,1.61],[-1.84,h],[.80,h],[1.62,1.08]], windows: [[-1.84,-.84],[-.73,.29],[.40,1.27]], doors: [.34,1.34]};
  if (body.id === 'utility-suv') return {study01:true,belt:1.07,rearHeight:1.78,roof:[[-2.07,1.81],[-1.88,h],[.61,h],[1.20,1.12]],windows:[[-1.83,-1.03],[-.91,-.11],[.01,.93]],doors:[-.97,-.055,1.0],handles:[-.72,.16]};
  return {belt: .96, roof: [[-1.91,1.13],[-1.36,h],[.44,h],[1.25,1]], windows: [[-1.55,-.46],[-.35,.95]], doors: [-.41,1.01]};
}

export function roofHeight(body, z) {
  const spec = vehicleProfile(body), half = body.lengthM / 2;
  const rear = spec.rearHeight ?? (spec.bedEnd ? spec.belt : Math.max(spec.belt-.09,spec.roof[0][1]-.10));
  const nodes = [[-half,rear], ...spec.roof, [half,spec.belt - (spec.study01 ? .01 : .07)]];
  if(spec.study01){
    // Flat windscreen and bonnet planes with small corner fillets, rather than
    // easing the whole windscreen into an S curve. Coordinates remain metres.
    const linear=at=>{at=clamp(at,-half,half);let j=nodes.findIndex(([z])=>z>=at);j=Math.max(1,j<0?nodes.length-1:j);const a=nodes[j-1],b=nodes[j];return a[1]+(b[1]-a[1])*clamp((at-a[0])/(b[0]-a[0]));};
    return (linear(z-.018)+2*linear(z)+linear(z+.018))/4;
  }
  const i = Math.max(0, nodes.findIndex(([at]) => at >= z) - 1), a = nodes[i], b = nodes[i + 1] ?? a;
  const t = ease(clamp((z-a[0]) / Math.max(.001,b[0]-a[0])));
  return a[1] + (b[1]-a[1]) * t;
}

export function sideWidth(body, z, y) {
  const spec=vehicleProfile(body),{belt}=spec, half = body.lengthM / 2;
  const end = ease(clamp((Math.abs(z) - half + .32) / .32));
  const cabin = clamp((y-belt) / Math.max(.05,roofHeight(body,z)-belt));
  const rocker = .046 * (1-clamp((y-.25)/.26));
  const swell = .013 * Math.sin(clamp((y-.26)/Math.max(.1,belt-.26))*Math.PI);
  if(spec.study01){
    const arch=Math.max(...body.axlesM.map(c=>Math.exp(-(((z-c)/.45)**4))));
    const crown=.027*arch*Math.exp(-(((y-body.wheelRadiusM-.30)/.30)**2));
    return body.widthM/2-.025-.065*end-.14*cabin-rocker+swell*.55+crown;
  }
  return body.widthM/2 - .14*end - .15*ease(cabin) - rocker + swell;
}

export function skinUV(body, face, [x,y,z]) {
  if(face.endsWith('-bumper'))return skinUV(body,face.slice(0,-7),[x*.84,clamp(y,.35,.45),z]);
  let u,v;
  if (face==='side') {u=z/body.lengthM+.5;v=1-y/2.12;}
  else if (face==='top') {u=z/body.lengthM+.5;v=x/body.widthM+.5;}
  else {u=(face==='front'?x:-x)/body.widthM+.5;v=1-y/2.12;}
  const [a,b,w,h]=SKIN_RECTS[face];
  return [(a+u*w)/SKIN_SIZE,1-(b+v*h)/SKIN_SIZE];
}

class Author {
  constructor(T,body){this.T=T;this.body=body;this.batches=new Map();}
  surface(name,nu,nv,point,uv,normal){
    const T=this.T,p=[],coords=[],idx=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
      const q=point(i/nu,j/nv);p.push(...q);coords.push(...uv(q,i/nu,j/nv));
    }
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
      const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;idx.push(a,b,c,b,d,c);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(coords,2));g.setIndex(idx);g.computeVertexNormals();
    if(normal){
      const n=g.attributes.normal,index=g.index;
      let dot=0;for(let i=0;i<n.count;i++)dot+=n.getX(i)*normal[0]+n.getY(i)*normal[1]+n.getZ(i)*normal[2];
      if(dot<0){for(let i=0;i<index.count;i+=3){const tmp=index.array[i+1];index.array[i+1]=index.array[i+2];index.array[i+2]=tmp;}g.computeVertexNormals();}
    }
    this.append(name,g);g.dispose();
  }
  append(name,g,matrix){
    if(!this.batches.has(name))this.batches.set(name,{p:[],n:[],uv:[],index:[]});
    const b=this.batches.get(name),first=b.p.length/3,T=this.T,p=new T.Vector3(),n=new T.Vector3();
    const normal=matrix?new T.Matrix3().getNormalMatrix(matrix):null;
    for(let i=0;i<g.attributes.position.count;i++){
      p.fromBufferAttribute(g.attributes.position,i);n.fromBufferAttribute(g.attributes.normal,i);
      if(matrix){p.applyMatrix4(matrix);n.applyNormalMatrix(normal);}
      b.p.push(p.x,p.y,p.z);b.n.push(n.x,n.y,n.z);b.uv.push(g.attributes.uv.getX(i),g.attributes.uv.getY(i));
    }
    for(const i of g.index.array)b.index.push(first+i);
  }
  rim(x,r,z,side){
    // One welded centre and closed rings avoid coincident pole vertices and
    // zero-area fan triangles that can leave dark wedges after simplification.
    const T=this.T,p=[x+side*.098,r,z],uv=[.75,.25],index=[],segments=64,rings=8;
    for(let j=1;j<=rings;j++)for(let i=0;i<segments;i++){
      const v=j/rings,t=i*Math.PI*2/segments,rr=r*.60*v;
      p.push(x+side*(.098-.020*Math.sin(v*Math.PI)**2),r+rr*Math.cos(t),z+rr*Math.sin(t));
      uv.push(.75+.225*v*Math.cos(t),.25+.225*v*Math.sin(t));
    }
    for(let i=0;i<segments;i++){
      const next=(i+1)%segments;index.push(0,1+i,1+next);
      for(let j=0;j<rings-1;j++){
        const a=1+j*segments+i,b=1+j*segments+next,c=a+segments,d=b+segments;
        index.push(a,c,b,b,c,d);
      }
    }
    if(side<0)for(let i=0;i<index.length;i+=3){const b=index[i+1];index[i+1]=index[i+2];index[i+2]=b;}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();this.append('details',g);g.dispose();
  }
  roundBox(position,size,radius,name='body',face='side'){
    // Six bevelled surfaces; the small radius affects silhouette, not decoration.
    const half=size.map(v=>v/2),inner=half.map(v=>Math.max(.001,v-radius));
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const a=(axis+1)%3,b=(axis+2)%3,n=[0,0,0];n[axis]=sign;
      this.surface(name,12,8,(u,v)=>{
        const q=[0,0,0];q[axis]=sign*half[axis];q[a]=(u*2-1)*half[a];q[b]=(v*2-1)*half[b];
        const c=q.map((x,i)=>clamp(x,-inner[i],inner[i]));
        const d=q.map((x,i)=>x-c[i]),len=Math.hypot(...d);
        return c.map((x,i)=>position[i]+x+d[i]/len*radius);
      },q=>name==='body'?skinUV(this.body,face,q):[.25+.42*(q[a]-position[a])/size[a],.25+.42*(q[b]-position[b])/size[b]],n);
    }
  }
  finish(){
    const result=new Map(),T=this.T;
    for(const [name,b]of this.batches){
      const g=new T.BufferGeometry();
      g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));
      g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));
      g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setIndex(b.index);
      g.computeBoundingBox();g.computeBoundingSphere();result.set(name,g);
    }return result;
  }
}

export function sculptRoadVehicle(T,id){
  const body=VEHICLE_BODIES.find(b=>b.id===id);if(!body)throw new RangeError('Unknown vehicle body: '+id);
  const a=new Author(T,body),spec=vehicleProfile(body),half=body.lengthM/2-(spec.study01 ? .07 : 0),r=body.wheelRadiusM;
  const sill=spec.study01?(body.id==='cargo-van'?.30:.34):.26;
  const bottom=z=>Math.max(sill,...body.axlesM.map(c=>Math.abs(z-c)<r+.078?r+Math.sqrt((r+.078)**2-(z-c)**2):sill));
  // Continuous sheet metal: windows are painted UV regions of these surfaces.
  for(const side of [-1,1]){
    a.surface('body',192,32,(u,v)=>{
      const z=(u*2-1)*half,y=bottom(z)+(roofHeight(body,z)-.055-bottom(z))*v;
      return [side*sideWidth(body,z,y),y,z];
    },q=>skinUV(body,'side',q),[side,0,0]);
  }
  const topStart=spec.bedEnd??-half;
  const topRanges=spec.study01&&spec.bedEnd?[[topStart,spec.roof[0][0],'top'],[spec.roof[0][0],spec.roof[1][0],'rear'],[spec.roof[1][0],half,'top']]:[[topStart,half,'top']];
  for(const [start,end,face]of topRanges)a.surface('body',Math.max(8,Math.round(192*(end-start)/(half-topStart))),24,(u,v)=>{
    const z=start+(end-start)*u,y=roofHeight(body,z),x=(v*2-1)*sideWidth(body,z,y-.055);
    return [x,y-.055*(2*v-1)**4,z];
  },q=>skinUV(body,face,q),face==='rear'?[0,.1,-1]:[0,1,0]);
  for(const side of [-1,1]){
    const z=side*half;
    a.surface('body',32,20,(u,v)=>{
      const top=roofHeight(body,z)-.055*(u*2-1)**4;
      const y=sill+(top-sill)*v;return [(u*2-1)*sideWidth(body,z,y),y,z];
    },q=>skinUV(body,side===1?'front':'rear',q),[0,0,side]);
  }
  if(spec.bedEnd){
    const rear=-half+.055,end=spec.bedEnd-.015,floor=spec.study01?.78:.72;
    a.surface('body',48,24,(u,v)=>[(v*2-1)*(body.widthM/2-.095),floor,rear+(end-rear)*u],q=>skinUV(body,'top',q),[0,1,0]);
    for(const side of [-1,1])a.surface('body',64,8,(u,v)=>{
      const z=rear+(end-rear)*u,y=floor+(roofHeight(body,z)-floor)*v;
      return [side*(sideWidth(body,z,y)-.075),y,z];
    },(q,u,v)=>skinUV(body,'side',[0,1.96+v*.08,q[2]]),[-side,0,0]);
    for(const z of [rear,end])a.surface('body',24,8,(u,v)=>[(u*2-1)*(body.widthM/2-.095),floor+(spec.belt-floor)*v,z],(_,u,v)=>skinUV(body,'side',[0,1.96+v*.08,(u*2-1)*half]),[0,0,z===rear?1:-1]);
    for(const side of [-1,1])a.roundBox([side*(body.widthM/2-.05),spec.belt-.025,(rear+end)/2],[.085,.065,end-rear],.025);
    if(spec.study01){
      const z=spec.roof[0][0];
      a.surface('body',24,12,(u,v)=>{const y=sill+(roofHeight(body,z)-.055-sill)*v;return[(u*2-1)*sideWidth(body,z,y),y,z];},(_,u,v)=>skinUV(body,'side',[0,1.96+v*.08,(u*2-1)*half]),[0,0,-1]);
    }
  }
  for(const z of body.axlesM)for(const side of [-1,1]){
    const x=side*(body.widthM/2-.102);
    const profile=[[.56,-.092],[.67,-.098],[.84,-.101],[.93,-.088],[.987,-.06],[1,-.025],
      [1,.025],[.987,.06],[.93,.088],[.84,.101],[.67,.098],[.56,.092]];
    const lathe=new T.LatheGeometry(profile.map(([rr,xx])=>new T.Vector2(rr*r,xx)),64);
    const m=new T.Matrix4().makeRotationZ(-Math.PI/2);m.setPosition(x,r,z);
    const uv=lathe.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,.02+.46*uv.getX(i),.02+.46*uv.getY(i));
    a.append('details',lathe,m);lathe.dispose();
    a.rim(x,r,z,side);
    a.surface('details',64,8,(u,v)=>{
      const angle=u*Math.PI,rad=r+.078;
      const zz=z+rad*Math.cos(angle),yy=r+rad*Math.sin(angle);
      return [side*((spec.study01?sideWidth(body,zz,yy):body.widthM/2-.025)-v*.16),yy,zz];
    },(_,u,v)=>[.02+.46*u,.02+.46*v],[-side,0,0]);
    if(spec.study01)a.surface('details',48,6,(u,v)=>{
      const rad=r+.078,zz=(u*2-1)*rad;
      return[side*(body.widthM/2-.235),r+v*Math.sqrt(Math.max(0,rad*rad-zz*zz)),z+zz];
    },(_,u,v)=>[.20+.04*u,.20+.04*v],[side,0,0]);
  }
  if(spec.study01)a.roundBox([0,.30,0],[body.widthM-.45,.07,body.lengthM-.42],.025,'details');
  else a.roundBox([0,.27,0],[body.widthM-.27,.12,body.lengthM-.24],.04,'details');
  if(spec.study01)for(const side of [-1,1])a.roundBox([0,.405,side*(body.lengthM/2-.055)],[body.widthM-.065,.17,.11],.035,'body',side===1?'front-bumper':'rear-bumper');
  for(const side of [-1,1]){
    const z=spec.windows.at(-1)[1]-.12,y=spec.belt+.14;
    const at=sideWidth(body,z,y)-.018,reach=.945-at;
    a.roundBox([side*(at+reach/2),y,z],[reach,.04,.10],.016,'details');
    a.roundBox([side*.956,y+.045,z-.026],[.058,.12,.17],.026,'body');
  }
  if(body.kind==='suv')for(const side of [-1,1]){
    for(const z of [-.92,.28])a.roundBox([side*.57,body.heightM-.068,z],[.052,.07,.10],.016,'details');
    a.roundBox([side*.57,body.heightM-.027,-.30],[.046,.054,1.40],.018,'details');
  }
  return a.finish();
}
