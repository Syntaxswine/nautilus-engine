// Plain-data surfaces: fixed 6d9dfeca artist foundation; original era atlas and geometry additions.
// No dependency on that collection or its assets. Native units; compact metre UVs or baked atlas UVs.
export const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,t)=>a.map(v=>v*t),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),unit=a=>mul(a,1/len(a)),lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export const VARIANT_MATERIALS=Object.freeze({
  adobe:{sheet:'era',tile:3,grid:2,repeat:3},clapboard:{sheet:'era',tile:2,grid:2,repeat:2.5},
  metal:{sheet:'era',tile:2,grid:2,repeat:2.5},shingle:{sheet:'era',tile:1,grid:2,repeat:2},
  timber:{sheet:'shared',tile:5,grid:4,repeat:1.5},wood:{sheet:'shared',tile:5,grid:4,repeat:1.5},
  log:{sheet:'shared',tile:5,grid:4,repeat:1.5},trim:{sheet:'shared',tile:5,grid:4,repeat:1.5},
  plaster:{sheet:'era',tile:3,grid:2,repeat:3},stone:{sheet:'era',tile:0,grid:2,repeat:2.5},
  brick:{sheet:'era',tile:0,grid:2,repeat:2.5},door:{sheet:'shared',tile:5,grid:4,repeat:1.5},
  iron:{sheet:null,tile:null,grid:1,repeat:1},wire:{sheet:null,tile:null,grid:1,repeat:1},
  glass:{sheet:null,tile:null,grid:1,repeat:1},earth:{sheet:'era',tile:3,grid:2,repeat:4}
});
for(const material of Object.values(VARIANT_MATERIALS))Object.freeze(material);
export class Surfaces {
  constructor(lod,uvMode='metres',theme='castle'){this.theme=theme;this.lod=lod;this.uvMode=uvMode;this.batches=new Map();this.kind='exterior';this.level=0;this.roofProof=[];}
  channel(kind,level){this.kind=kind;this.level=level;return this;}
  batch(material){const key=`${this.kind}:${this.level}:${material}`;if(!this.batches.has(key))this.batches.set(key,{kind:this.kind,level:this.level,material,positions:[],normals:[],uvs:[]});return this.batches.get(key);}
  emit(points,material,n,uvs){const b=this.batch(material);for(let i=0;i<3;i++){b.positions.push(...points[i]);b.normals.push(...n);b.uvs.push(...uvs[i]);}}
  triangle(a,b,c,material){const crossN=cross(sub(b,a),sub(c,a));if(len(crossN)<1e-10)return;const n=unit(crossN);
    let u=Math.abs(n[1])>.999?[1,0,0]:unit([n[2],0,-n[0]]),v=unit(cross(n,u));if(v[1]<0){u=mul(u,-1);v=mul(v,-1);}
    const spec=VARIANT_MATERIALS[material];if(!spec)throw Error('Unknown frontier-fort material: '+material);
    const vertices=[a,b,c].map(p=>({p,uv:[dot(p,u)/spec.repeat,dot(p,v)/spec.repeat]}));
    if(this.uvMode==='metres'||spec.tile===null){this.emit([a,b,c],material,n,vertices.map(q=>q.uv));return;}
    const tile=spec.tile,grid=spec.grid,col=tile%grid,row=grid-1-Math.floor(tile/grid),inset=.014;
    const low=[0,1].map(i=>Math.floor(Math.min(...vertices.map(q=>q.uv[i])))),high=[0,1].map(i=>Math.ceil(Math.max(...vertices.map(q=>q.uv[i]))));
    const clip=(polygon,axis,bound,greater)=>{const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],inside=q=>greater?q.uv[axis]>=bound-1e-9:q.uv[axis]<=bound+1e-9,ia=inside(a),ib=inside(b);if(ia)out.push(a);if(ia!==ib){const t=(bound-a.uv[axis])/(b.uv[axis]-a.uv[axis]);out.push({p:lerp(a.p,b.p,t),uv:lerp(a.uv,b.uv,t)});}}return out;};
    for(let x=low[0];x<high[0];x++)for(let y=low[1];y<high[1];y++){let polygon=vertices;for(const[axis,bound,greater]of[[0,x,true],[0,x+1,false],[1,y,true],[1,y+1,false]])polygon=clip(polygon,axis,bound,greater);
      for(let i=1;i<polygon.length-1;i++){const tri=[polygon[0],polygon[i],polygon[i+1]];if(len(cross(sub(tri[1].p,tri[0].p),sub(tri[2].p,tri[0].p)))<1e-10)continue;
        this.emit(tri.map(q=>q.p),material,n,tri.map(q=>[(col+inset+(q.uv[0]-x)*(1-2*inset))/grid,(row+inset+(q.uv[1]-y)*(1-2*inset))/grid]));}}
  }
  face(points,material,normal){if(dot(cross(sub(points[1],points[0]),sub(points[2],points[0])),normal)<0)points=[...points].reverse();
    if(this.kind==='roof')this.roofProof.push(points.map(p=>[...p]));for(let i=1;i<points.length-1;i++)this.triangle(points[0],points[i],points[i+1],material);}
  box(center,size,material,bevel=false){const h=size.map(v=>v/2),P=p=>add(center,p);
    if(!bevel||this.lod==='game'||Math.min(...size)<.035){const[x,y,z]=h;for(const[pts,n]of[
      [[[x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z]],[1,0,0]],[[[-x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z]],[-1,0,0]],
      [[[-x,y,-z],[-x,y,z],[x,y,z],[x,y,-z]],[0,1,0]],[[[-x,-y,z],[-x,-y,-z],[x,-y,-z],[x,-y,z]],[0,-1,0]],
      [[[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]],[0,0,1]],[[[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]],[0,0,-1]]])this.face(pts.map(P),material,n);return;}
    const r=Math.min(.018,Math.min(...size)*.16);
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const a=(axis+1)%3,b=(axis+2)%3,pts=[];for(const[sa,sb]of[[-1,-1],[1,-1],[1,1],[-1,1]]){const q=[0,0,0];q[axis]=sign*h[axis];q[a]=sa*(h[a]-r);q[b]=sb*(h[b]-r);pts.push(P(q));}const n=[0,0,0];n[axis]=sign;this.face(pts,material,n);}
    for(let axis=0;axis<3;axis++){const a=(axis+1)%3,b=(axis+2)%3;for(const sa of[-1,1])for(const sb of[-1,1]){const pts=[];for(const[end,t]of[[-1,0],[1,0],[1,1],[-1,1]]){const q=[0,0,0];q[axis]=end*(h[axis]-r);q[a]=sa*(h[a]-(t?r:0));q[b]=sb*(h[b]-(t?0:r));pts.push(P(q));}this.face(pts,material,sub(pts.reduce((s,p)=>add(s,mul(p,.25)),[0,0,0]),center));}}
    for(const sx of[-1,1])for(const sy of[-1,1])for(const sz of[-1,1]){const pts=[[sx*h[0],sy*(h[1]-r),sz*(h[2]-r)],[sx*(h[0]-r),sy*h[1],sz*(h[2]-r)],[sx*(h[0]-r),sy*(h[1]-r),sz*h[2]]].map(P);this.face(pts,material,sub(pts.reduce((s,p)=>add(s,mul(p,1/3)),[0,0,0]),center));}
  }
  cylinder(center,radius,height,material){const count=this.lod==='source'?16:8;for(let i=0;i<count;i++){const a=i/count*Math.PI*2,b=(i+1)/count*Math.PI*2,p=[center[0]+Math.cos(a)*radius,center[1]-height/2,center[2]+Math.sin(a)*radius],q=[center[0]+Math.cos(b)*radius,center[1]-height/2,center[2]+Math.sin(b)*radius];this.face([p,q,add(q,[0,height,0]),add(p,[0,height,0])],material,sub([p[0],center[1],p[2]],center));this.face([[center[0],center[1]+height/2,center[2]],add(p,[0,height,0]),add(q,[0,height,0])],material,[0,1,0]);this.face([[center[0],center[1]-height/2,center[2]],q,p],material,[0,-1,0]);}}
}
const inRect=(r,x,y)=>x>r.x-1e-9&&x<r.x+r.width-1e-9&&y>r.y-1e-9&&y<r.y+r.depth-1e-9;
export function unionPrism(s,rects,holes,top,thickness,topMat,sideMat='stone',bottomMat='plaster'){
  const xs=[...new Set([...rects,...holes].flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b),ys=[...new Set([...rects,...holes].flatMap(r=>[r.y,r.y+r.depth]))].sort((a,b)=>a-b),cells=new Set();
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;if(rects.some(r=>inRect(r,x,y))&&!holes.some(r=>inRect(r,x,y)))cells.add(i+','+j);}
  for(const key of cells){const[i,j]=key.split(',').map(Number),x=xs[i],z=ys[j],w=xs[i+1]-x,d=ys[j+1]-z,y=top,b=top-thickness;
    s.face([[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]],topMat,[0,1,0]);s.face([[x,b,z],[x+w,b,z],[x+w,b,z+d],[x,b,z+d]],bottomMat,[0,-1,0]);
    for(const[di,dj,a,c,n]of[[0,-1,[x,y,z],[x+w,y,z],[0,0,-1]],[1,0,[x+w,y,z],[x+w,y,z+d],[1,0,0]],[0,1,[x+w,y,z+d],[x,y,z+d],[0,0,1]],[-1,0,[x,y,z+d],[x,y,z],[-1,0,0]]])if(!cells.has((i+di)+','+(j+dj)))s.face([a,c,[c[0],b,c[2]],[a[0],b,a[2]]],sideMat,n);
  }
}
