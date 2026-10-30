// Original native box parts with the established atlas and source/game edge policy.
// Bevel construction follows the artist's reviewed building-catalog/three.js at
// 78d37b6cd3ba5de5c25d4922b4ba301b13491caa; no donor bytes or runtime are changed.
import {MATERIALS} from '../../packages/building-catalog/index.js';
const add = (a,b) => a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), mul=(a,v)=>a.map(x=>x*v);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const tiles=new Map(MATERIALS.map(material=>[material.id,material.tile]));
function polygons(size, bevel) {
  const half=size.map(n=>n/2),[x,y,z]=half,faces=[];
  if(!bevel)return [
    [[x,-y,-z],[x,y,-z],[x,y,z],[x,-y,z]], [[-x,-y,z],[-x,y,z],[-x,y,-z],[-x,-y,-z]],
    [[-x,y,-z],[-x,y,z],[x,y,z],[x,y,-z]], [[-x,-y,z],[-x,-y,-z],[x,-y,-z],[x,-y,z]],
    [[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]], [[x,-y,-z],[-x,-y,-z],[-x,y,-z],[x,y,-z]]
  ];
  const r=Math.min(.015,Math.min(...size)*.15);
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const a=(axis+1)%3,b=(axis+2)%3;
    faces.push([[-1,-1],[1,-1],[1,1],[-1,1]].map(([sa,sb])=>{const p=[0,0,0];p[axis]=sign*half[axis];p[a]=sa*(half[a]-r);p[b]=sb*(half[b]-r);return p;}));
  }
  for(let axis=0;axis<3;axis++){const a=(axis+1)%3,b=(axis+2)%3;
    for(const sa of [-1,1])for(const sb of [-1,1])faces.push([[-1,0],[1,0],[1,1],[-1,1]].map(([end,t])=>{const p=[0,0,0];p[axis]=end*(half[axis]-r);p[a]=sa*(half[a]-(t?r:0));p[b]=sb*(half[b]-(t?0:r));return p;}));
  }
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1])faces.push([[sx*x,sy*(y-r),sz*(z-r)],[sx*(x-r),sy*y,sz*(z-r)],[sx*(x-r),sy*(y-r),sz*z]]);
  return faces;
}
export function boxGeometryData(node,{lod='game'}={}) {
  if(!['game','authoring'].includes(lod))throw Error('Use game or authoring native geometry.');
  const size=sub(node.max,node.min),center=mul(add(node.min,node.max),.5),positions=[],normals=[],uvs=[];
  if(size.some(n=>!(n>0)))throw Error('A visual box must have positive native dimensions.');
  const tile=tiles.get(node.material);if(tile===undefined)throw Error('Unknown existing paint tile: '+node.material);
  const emit=(a,b,c,n,uv)=>{for(const [p,i]of [[a,0],[b,1],[c,2]]){positions.push(...add(p,center));normals.push(...n);uvs.push(...uv[i]);}};
  const atlasUV=(u,v,midU,midV)=>{const inset=.012,frac=(p,mid)=>Math.max(0,Math.min(1,p-Math.floor(mid)));return[(tile%4+inset+frac(u,midU)*(1-2*inset))/4,(3-Math.floor(tile/4)+inset+frac(v,midV)*(1-2*inset))/4];};
  for(let polygon of polygons(size,lod==='authoring'&&!['slab','stepped-contact-mesh'].includes(node.role)&&Math.min(...size)>.05)){
    let normal=cross(sub(polygon[1],polygon[0]),sub(polygon[2],polygon[0]));
    const centre=polygon.reduce((s,p)=>add(s,mul(p,1/polygon.length)),[0,0,0]);
    if(dot(normal,centre)<0){polygon=polygon.slice().reverse();normal=mul(normal,-1);}
    normal=mul(normal,1/Math.hypot(...normal));
    const major=normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs))),axes=major===1?[0,2]:major===0?[2,1]:[0,1];
    const points=polygon.map(p=>({p,uv:[p[axes[0]]+center[axes[0]],p[axes[1]]+center[axes[1]]]}));
    const lower=[0,1].map(i=>Math.floor(Math.min(...points.map(p=>p.uv[i])))),upper=[0,1].map(i=>Math.ceil(Math.max(...points.map(p=>p.uv[i]))));
    const clip=(poly,axis,bound,greater)=>{const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=p=>greater?p.uv[axis]>=bound-1e-10:p.uv[axis]<=bound+1e-10,ai=inside(a),bi=inside(b);if(ai)out.push(a);if(ai!==bi){const t=(bound-a.uv[axis])/(b.uv[axis]-a.uv[axis]);out.push({p:add(a.p,mul(sub(b.p,a.p),t)),uv:a.uv.map((n,j)=>n+(b.uv[j]-n)*t)});}}return out;};
    for(let u=lower[0];u<upper[0];u++)for(let v=lower[1];v<upper[1];v++){
      let poly=points;for(const [axis,bound,greater]of [[0,u,true],[0,u+1,false],[1,v,true],[1,v+1,false]])poly=clip(poly,axis,bound,greater);
      for(let i=1;i<poly.length-1;i++){const triangle=[poly[0],poly[i],poly[i+1]];if(Math.hypot(...cross(sub(triangle[1].p,triangle[0].p),sub(triangle[2].p,triangle[0].p)))<1e-10)continue;emit(...triangle.map(p=>p.p),normal,triangle.map(p=>atlasUV(...p.uv,u+.5,v+.5)));}
    }
  }
  return {positions,normals,uvs,triangles:positions.length/9,bounds:{min:[...node.min],max:[...node.max]},lod};
}
