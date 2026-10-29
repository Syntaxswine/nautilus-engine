// Bounded artist roof envelopes. This is not the shared editor's arbitrary roof solver.
import {add,sub,mul,cross,dot,len,unit,lerp} from './geometry.js';
const EPS=1e-8,point=(p)=>[p[0],p[2]],area=p=>p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-b[0]*a[1];},0)/2;
function clean(p){
  const result=p.filter((q,i)=>!i||Math.hypot(q[0]-p[i-1][0],q[1]-p[i-1][1])>EPS);
  if(result.length>1&&Math.hypot(result[0][0]-result.at(-1)[0],result[0][1]-result.at(-1)[1])<EPS)result.pop();
  return result.length>=3&&Math.abs(area(result))>1e-9?result:[];
}
function clip(poly,value,positive=true){
  const out=[];for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],va=value(a)*(positive?1:-1),vb=value(b)*(positive?1:-1),ia=va>=-EPS,ib=vb>=-EPS;
    if(ia)out.push(a);if(ia!==ib){const t=va/(va-vb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }return clean(out);
}
const halfPlane=(a,b)=>p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function subtract(poly,cutter){
  let inside=poly;const outside=[];
  for(let i=0;i<cutter.length&&inside.length;i++){
    const value=halfPlane(cutter[i],cutter[(i+1)%cutter.length]),out=clip(inside,value,false);
    if(out.length)outside.push(out);inside=clip(inside,value,true);
  }return outside;
}
const inside=(poly,p)=>poly.every((a,i)=>halfPlane(a,poly[(i+1)%poly.length])(p)>=-1e-6);
function facet(vertices,id){
  let poly=vertices.map(point);if(area(poly)<0){poly=poly.reverse();vertices=[...vertices].reverse();}
  const n=cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]));
  if(Math.abs(n[1])<EPS)throw Error('Roof top must be a finite height field.');
  const height=p=>vertices[0][1]-(n[0]*(p[0]-vertices[0][0])+n[2]*(p[1]-vertices[0][2]))/n[1];
  return {id,poly,height,normal:unit(n[1]<0?mul(n,-1):n)};
}
function components(r,datum){
  const oh=r.overhang??.25,l=r.leftOverhang??oh,f=r.frontOverhang??oh,rt=r.rightOverhang??oh,k=r.backOverhang??oh,
    x=r.x-l,z=r.y-f,w=r.width+l+rt,d=r.depth+f+k,y=datum,facets=[];
  const F=(pts,suffix)=>facets.push(facet(pts,r.id+':'+suffix));
  if(r.type==='gable'){
    const alongX=r.axis==='x',run=alongX?w:d,span=alongX?d:w,P=(a,b,h)=>alongX?[x+a,y+h,z+b]:[x+b,y+h,z+a],
      A=P(0,0,0),B=P(run,0,0),C=P(run,span,0),D=P(0,span,0),E=P(0,span/2,r.rise),G=P(run,span/2,r.rise);
    F([A,B,G,E],'near');F([C,D,E,G],'far');
  }else if(r.type==='hip'){
    const alongX=w>=d,run=alongX?w:d,span=alongX?d:w,P=(a,b,h)=>alongX?[x+a,y+h,z+b]:[x+b,y+h,z+a],
      A=P(0,0,0),B=P(run,0,0),C=P(run,span,0),D=P(0,span,0),E=P(span/2,span/2,r.rise),G=P(run-span/2,span/2,r.rise);
    F([A,B,G,E],'near');F([B,C,G],'end');F([C,D,E,G],'far');F([D,A,E],'start');
  }else throw Error('Use one of the authored gable or hip roof components.');
  return facets;
}
export function joinedRoofFacets(assemblies){
  const source=assemblies.flatMap(a=>(a.components||[]).flatMap(r=>components(r,a.datum))),visible=[];
  for(let i=0;i<source.length;i++){
    const face=source[i];let pieces=[face.poly];
    for(let j=0;j<source.length&&pieces.length;j++){
      if(i===j)continue;const other=source[j],diff=p=>other.height(p)-face.height(p),
        values=other.poly.map(diff),coplanar=values.every(v=>Math.abs(v)<EPS);
      if(coplanar&&j>i||Math.max(...values)<EPS&&!coplanar)continue;
      const cut=coplanar?other.poly:clip(other.poly,diff);
      if(cut.length)pieces=pieces.flatMap(p=>subtract(p,cut));
    }
    for(const poly of pieces)visible.push({...face,poly});
  }
  return visible;
}
export function roofHeight(facets,p){const h=facets.filter(f=>inside(f.poly,p)).map(f=>f.height(p));return h.length?Math.max(...h):null;}
const edgePoint=(a,b,p)=>{
  const d=[b[0]-a[0],b[1]-a[1]],n=d[0]*d[0]+d[1]*d[1],t=((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/n;
  return Math.abs(halfPlane(a,b)(p))<1e-6&&t>EPS&&t<1-EPS?t:null;
};
export function roofBoundary(facets){
  const all=facets.flatMap(f=>f.poly),edges=[];
  for(const f of facets)for(let i=0;i<f.poly.length;i++){
    const a=f.poly[i],b=f.poly[(i+1)%f.poly.length],cuts=[0,1,...all.map(p=>edgePoint(a,b,p)).filter(t=>t!==null)].sort((x,y)=>x-y);
    for(let k=0;k<cuts.length-1;k++){
      if(cuts[k+1]-cuts[k]<EPS)continue;
      const p=lerp(a,b,cuts[k]),q=lerp(a,b,cuts[k+1]),m=lerp(p,q,.5),length=Math.hypot(q[0]-p[0],q[1]-p[1]),
        sample=[m[0]+(q[1]-p[1])/length*1e-5,m[1]-(q[0]-p[0])/length*1e-5];
      if(!facets.some(other=>inside(other.poly,sample)))edges.push({a:p,b:q,face:f});
    }
  }return edges;
}
export function emitJoinedRoof(s,assemblies,material,beam){
  const faces=joinedRoofFacets(assemblies),boundary=roofBoundary(faces),level=assemblies[0].level;
  s.channel('roof',level);s.roofProof=[];
  for(const f of faces){
    const top=f.poly.map(p=>[p[0],f.height(p),p[1]]);s.face(top,material,[0,1,0]);
    s.face(top.map(p=>add(p,[0,-.08,0])),'wood',[0,-1,0]);
  }
  for(const e of boundary){
    const a=[e.a[0],e.face.height(e.a),e.a[1]],b=[e.b[0],e.face.height(e.b),e.b[1]];
    s.face([a,b,add(b,[0,-.08,0]),add(a,[0,-.08,0])],material,[b[2]-a[2],0,a[0]-b[0]]);
  }
  const proof={id:assemblies.map(a=>a.id).join('+'),kind:'joined-envelope',faces:s.roofProof,visibleFacets:faces.length,
    policy:'Higher coplanar roof envelope; buried overlapping facets removed. Thin closed shell; infill is separate.'};
  s.channel('roof-trim',level);
  for(const e of boundary){
    const a=[e.a[0],e.face.height(e.a)-.11,e.a[1]],b=[e.b[0],e.face.height(e.b)-.11,e.b[1]];
    if(len(sub(a,b))>.02)beam(s,a,b,.1,.11,'trim');
  }
  // Fine seams stay within the existing outline; source reduction keeps the same settled form.
  if(s.lod==='source')for(const f of faces){
    const low=Math.min(...f.poly.map(p=>p[0])),high=Math.max(...f.poly.map(p=>p[0]));
    for(let x=Math.ceil(low/.5)*.5;x<high;x+=.5){
      const hits=[];for(let i=0;i<f.poly.length;i++){const a=f.poly[i],b=f.poly[(i+1)%f.poly.length];
        if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))hits.push(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]));}
      hits.sort((a,b)=>a-b);if(hits.length>=2&&hits.at(-1)-hits[0]>.1)
        beam(s,[x,f.height([x,hits[0]+.04])+.005,hits[0]+.04],[x,f.height([x,hits.at(-1)-.04])+.005,hits.at(-1)-.04],.012,.012,material);
    }
  }
  return {facets:faces,boundary,proof};
}
export function emitGableInfill(s,b,facets){
  const floor=b.floors.at(-1),base=b.levels*2.12;
  for(const w of floor.walls.filter(w=>!w.interior)){
    const dx=(w.b[0]-w.a[0])/w.length,dz=(w.b[1]-w.a[1])/w.length,n=[dz,0,-dx],cuts=[0,w.length];
    for(const f of facets)for(const p of f.poly){
      const t=((p[0]-w.a[0])*dx+(p[1]-w.a[1])*dz);if(t>0&&t<w.length)cuts.push(t);
    }
    cuts.sort((a,b)=>a-b);s.channel('gable-infill',floor.level);
    for(let i=0;i<cuts.length-1;i++){
      const lo=cuts[i],hi=cuts[i+1];if(hi-lo<1e-7)continue;
      const p=[w.a[0]+dx*lo,w.a[1]+dz*lo],q=[w.a[0]+dx*hi,w.a[1]+dz*hi],
        hp=Math.max(base,(roofHeight(facets,p)??base)-.08),hq=Math.max(base,(roofHeight(facets,q)??base)-.08);
      if(Math.max(hp,hq)-base<1e-6)continue;
      const A=[p[0],base,p[1]],B=[q[0],base,q[1]],C=[q[0],hq,q[1]],D=[p[0],hp,p[1]],
        outer=[A,B,C,D].map(a=>add(a,mul(n,.08))),inner=[A,B,C,D].map(a=>add(a,mul(n,-.08)));
      s.face(outer,b.recipe.wall,n);s.face(inner,'plaster',mul(n,-1));s.face([outer[3],outer[2],inner[2],inner[3]],b.recipe.wall,[0,1,0]);
    }
  }
}
