// Reproducible source/game surfaces. No Three.js, DOM, storage or global RNG.
import {compileHPlan,offsetHContour} from './index.js';
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,t)=>a.map(v=>v*t),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(...a),unit=a=>mul(a,1/len(a)),lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export const H_PLAN_MATERIALS=Object.freeze({brick:{tile:1},stone:{tile:2},plaster:{tile:0},wood:{tile:5},sash:{tile:0},door:{tile:14},iron:{tile:14},glass:{tile:null},felt:{tile:null}});
class Surfaces {
  constructor(lod,uvMode='metres'){this.lod=lod;this.uvMode=uvMode;this.batches=new Map();this.kind='exterior';this.level=0;this.roofProof=[];}
  channel(kind,level){this.kind=kind;this.level=level;return this;}
  batch(material){const key=`${this.kind}:${this.level}:${material}`;if(!this.batches.has(key))this.batches.set(key,{kind:this.kind,level:this.level,material,positions:[],normals:[],uvs:[]});return this.batches.get(key);}
  emit(points,material,n,uvs){const b=this.batch(material);for(let i=0;i<3;i++){b.positions.push(...points[i]);b.normals.push(...n);b.uvs.push(...uvs[i]);}}
  triangle(a,b,c,material){const crossN=cross(sub(b,a),sub(c,a));if(len(crossN)<1e-10)return;const n=unit(crossN);
    let u=Math.abs(n[1])>.999?[1,0,0]:unit([n[2],0,-n[0]]),v=unit(cross(n,u));if(v[1]<0){u=mul(u,-1);v=mul(v,-1);}
    const vertices=[a,b,c].map(p=>({p,uv:[dot(p,u),dot(p,v)]}));
    if(this.uvMode==='metres'||['felt','stone','glass'].includes(material)){this.emit([a,b,c],material,n,vertices.map(q=>q.uv.map(v=>material==='felt'?v/2:v)));return;}
    const tile=H_PLAN_MATERIALS[material].tile,col=tile%4,row=3-Math.floor(tile/4),inset=.012;
    const low=[0,1].map(i=>Math.floor(Math.min(...vertices.map(q=>q.uv[i])))),high=[0,1].map(i=>Math.ceil(Math.max(...vertices.map(q=>q.uv[i]))));
    const clip=(polygon,axis,bound,greater)=>{const out=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],inside=q=>greater?q.uv[axis]>=bound-1e-9:q.uv[axis]<=bound+1e-9,ia=inside(a),ib=inside(b);if(ia)out.push(a);if(ia!==ib){const t=(bound-a.uv[axis])/(b.uv[axis]-a.uv[axis]);out.push({p:lerp(a.p,b.p,t),uv:lerp(a.uv,b.uv,t)});}}return out;};
    for(let x=low[0];x<high[0];x++)for(let y=low[1];y<high[1];y++){let polygon=vertices;for(const[axis,bound,greater]of[[0,x,true],[0,x+1,false],[1,y,true],[1,y+1,false]])polygon=clip(polygon,axis,bound,greater);
      for(let i=1;i<polygon.length-1;i++){const tri=[polygon[0],polygon[i],polygon[i+1]];if(len(cross(sub(tri[1].p,tri[0].p),sub(tri[2].p,tri[0].p)))<1e-10)continue;
        this.emit(tri.map(q=>q.p),material,n,tri.map(q=>[(col+inset+(q.uv[0]-x)*(1-2*inset))/4,(row+inset+(q.uv[1]-y)*(1-2*inset))/4]));}}
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
function unionPrism(s,rects,holes,top,thickness,topMat,sideMat='stone',bottomMat='plaster'){
  const xs=[...new Set([...rects,...holes].flatMap(r=>[r.x,r.x+r.width]))].sort((a,b)=>a-b),ys=[...new Set([...rects,...holes].flatMap(r=>[r.y,r.y+r.depth]))].sort((a,b)=>a-b),cells=new Set();
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;if(rects.some(r=>inRect(r,x,y))&&!holes.some(r=>inRect(r,x,y)))cells.add(i+','+j);}
  for(const key of cells){const[i,j]=key.split(',').map(Number),x=xs[i],z=ys[j],w=xs[i+1]-x,d=ys[j+1]-z,y=top,b=top-thickness;
    s.face([[x,y,z],[x+w,y,z],[x+w,y,z+d],[x,y,z+d]],topMat,[0,1,0]);s.face([[x,b,z],[x+w,b,z],[x+w,b,z+d],[x,b,z+d]],bottomMat,[0,-1,0]);
    for(const[di,dj,a,c,n]of[[0,-1,[x,y,z],[x+w,y,z],[0,0,-1]],[1,0,[x+w,y,z],[x+w,y,z+d],[1,0,0]],[0,1,[x+w,y,z+d],[x,y,z+d],[0,0,1]],[-1,0,[x,y,z+d],[x,y,z],[-1,0,0]]])if(!cells.has((i+di)+','+(j+dj)))s.face([a,c,[c[0],b,c[2]],[a[0],b,a[2]]],sideMat,n);
  }
}
function ring(s,contour,inner,outer,bottom,top,material){const A=offsetHContour(contour,outer),B=offsetHContour(contour,inner);for(let i=0;i<contour.length;i++){const j=(i+1)%contour.length,a=A[i],b=A[j],c=B[j],d=B[i],p=(q,h)=>[q[0],h,q[1]],n=[contour[j][1]-contour[i][1],0,contour[i][0]-contour[j][0]];
  s.face([p(a,top),p(b,top),p(c,top),p(d,top)],material,[0,1,0]);s.face([p(a,bottom),p(b,bottom),p(c,bottom),p(d,bottom)],material,[0,-1,0]);
  s.face([p(a,bottom),p(b,bottom),p(b,top),p(a,top)],material,n);s.face([p(d,bottom),p(c,bottom),p(c,top),p(d,top)],material,mul(n,-1));}}
function wall(s,w,b,leaves){const y=w.level*2.12,dx=(w.b[0]-w.a[0])/w.length,dz=(w.b[1]-w.a[1])/w.length,n=[dz,0,-dx],th=w.interior?.06:.08;
  const oa=w.outerA||[w.a[0]+dz*th,w.a[1]-dx*th],ob=w.outerB||[w.b[0]+dz*th,w.b[1]-dx*th],ia=w.innerA||[w.a[0]-dz*th,w.a[1]+dx*th],ib=w.innerB||[w.b[0]-dz*th,w.b[1]+dx*th];
  const P=(u,h,outer)=>{const p=lerp(outer?oa:ia,outer?ob:ib,u/w.length);return [p[0],y+h,p[1]];},us=[...new Set([0,w.length,...w.openings.flatMap(o=>[o.u0,o.u1])])].sort((a,b)=>a-b),vs=[...new Set([0,2,...(!w.interior&&w.level===0?[.48]:[]),...w.openings.flatMap(o=>[o.bottom,o.top])])].sort((a,b)=>a-b);
  const solid=(i,j)=>i>=0&&j>=0&&i<us.length-1&&j<vs.length-1&&!w.openings.some(o=>(us[i]+us[i+1])/2>o.u0&&(us[i]+us[i+1])/2<o.u1&&(vs[j]+vs[j+1])/2>o.bottom&&(vs[j]+vs[j+1])/2<o.top);
  for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){if(!solid(i,j))continue;const a=us[i],c=us[i+1],lo=vs[j],hi=vs[j+1],mat=w.interior?'plaster':w.level===0&&hi<=.48?'stone':'brick';
    s.channel(w.interior?'interior':'exterior',w.level);s.face([P(a,lo,true),P(c,lo,true),P(c,hi,true),P(a,hi,true)],mat,n);s.face([P(c,lo,false),P(a,lo,false),P(a,hi,false),P(c,hi,false)],'plaster',mul(n,-1));
    if(!solid(i,j-1))s.face([P(a,lo,false),P(c,lo,false),P(c,lo,true),P(a,lo,true)],mat,[0,-1,0]);if(!solid(i,j+1))s.face([P(a,hi,true),P(c,hi,true),P(c,hi,false),P(a,hi,false)],mat,[0,1,0]);
    if(!solid(i-1,j)&&(w.interior||i>0))s.face([P(a,lo,false),P(a,lo,true),P(a,hi,true),P(a,hi,false)],mat,[-dx,0,-dz]);if(!solid(i+1,j)&&(w.interior||i<us.length-2))s.face([P(c,lo,true),P(c,lo,false),P(c,hi,false),P(c,hi,true)],mat,[dx,0,dz]);
  }
  const yaw=-Math.atan2(dz,dx),local=(u,h,side=0)=>[w.a[0]+dx*u+dz*side,y+h,w.a[1]+dz*u-dx*side];
  function localBox(u,h,side,size,material,bevel=true){const temp=new Surfaces(s.lod,s.uvMode);temp.channel(w.interior?'interior-trim':'facade-trim',w.level);temp.box([0,0,0],size,material,bevel);appendTransformed(s,temp,local(u,h,side),yaw);}
  for(const o of w.openings){const width=o.u1-o.u0,height=o.top-o.bottom,mid=(o.u0+o.u1)/2;
    if(o.type==='window'){
      s.channel('glazing',w.level);const q=[local(o.u0,o.bottom),local(o.u1,o.bottom),local(o.u1,o.top),local(o.u0,o.top)];s.face(q,'glass',n);s.face([...q].reverse(),'glass',mul(n,-1));
      for(const side of s.lod==='source'?[-.095,.095]:[.095]){for(const u of [o.u0-.026,o.u1+.026])localBox(u,(o.bottom+o.top)/2,side,[.052,height+.1,.045],'sash');for(const h of[o.bottom-.025,o.top+.025,(o.bottom+o.top)/2])localBox(mid,h,side,[width+.1,.05,.045],'sash');}
      localBox(mid,o.bottom-.065,.12,[width+.22,.08,.2],'stone');localBox(mid,o.top+.09,.1,[width+.22,.12,.16],'stone');
      if(b.recipe.cornice==='stone-course')localBox(mid,o.top+.17,.12,[.13,.12,.18],'stone');
    }else if(o.type==='paired-entry'){
      const f=o.frame,clear=width-2*f.jamb,leafWidth=(clear-o.leaf.gap)/2,leafHeight=height-f.head-.018;
      for(const u of[o.u0+f.jamb/2,o.u1-f.jamb/2])localBox(u,height/2,0,[f.jamb,height,f.depth],'door');localBox(mid,o.top-f.head/2,0,[width,f.head,f.depth],'door');
      for(const[u,sign,side]of[[o.u0+f.jamb,1,'left'],[o.u1-f.jamb,-1,'right']])leaves.push({id:o.id+':'+side,entryId:o.id,side,level:w.level,pivot:local(u,o.bottom),yaw,swingSign:sign,width:leafWidth,height:leafHeight,thickness:o.leaf.thickness,sign,paired:true});
      // Recessed paired timber leaves sit behind a separate masonry entrance portal.
      for(const u of[o.u0-.15,o.u1+.15])localBox(u,.95,.14,[.2,1.9,.3],'stone');localBox(mid,1.96,.14,[width+.5,.12,.32],'stone');
    }else if(o.type!=='doorway'){
      for(const u of[o.u0-.03,o.u1+.03])localBox(u,height/2,0,[.06,height+.08,.16],'door');localBox(mid,o.top+.03,0,[width+.12,.06,.16],'door');
      leaves.push({id:o.id,entryId:o.id,side:'single',level:w.level,pivot:local(o.u0,0),yaw,swingSign:1,width:width-.025,height:height-.02,thickness:.04,sign:1,paired:false});
    }
  }
}
function appendTransformed(target,source,origin,yaw){const c=Math.cos(yaw),sn=Math.sin(yaw);for(const batch of source.batches.values()){const prior=[target.kind,target.level];target.channel(batch.kind,batch.level);const b=target.batch(batch.material);for(let i=0;i<batch.positions.length;i+=3){const[x,y,z]=batch.positions.slice(i,i+3),[nx,ny,nz]=batch.normals.slice(i,i+3);b.positions.push(origin[0]+x*c+z*sn,origin[1]+y,origin[2]-x*sn+z*c);b.normals.push(nx*c+nz*sn,ny,-nx*sn+nz*c);}b.uvs.push(...batch.uvs);target.channel(...prior);}}
function leafData(leaf,lod,uvMode){const s=new Surfaces(lod,uvMode),w=leaf.width,h=leaf.height,sign=leaf.sign;s.channel('door',leaf.level);s.box([sign*w/2,h/2+.009,0],[w,h,leaf.thickness],'door',true);
  for(const side of[-1,1]){for(const y of[h*.28,h*.71])s.box([sign*w/2,y,side*(leaf.thickness/2+.009)],[w*.72,h*.3,.018],'door',true);s.box([sign*(w-.09),h*.48,side*(leaf.thickness/2+.035)],[.045,.055,.05],'iron',true);}
  if(leaf.paired&&leaf.side==='left')s.box([sign*(w-.012),h/2,-leaf.thickness/2-.018],[.04,h,.028],'door',true);
  return {...leaf,batches:[...s.batches.values()]};}
function staircase(s,stair){const r=stair.rect,base=stair.fromFloor*2.12,n=stair.risers/2,step=stair.rise/stair.risers,run=stair.run;
  s.channel('stairs',stair.fromFloor);
  for(let i=0;i<n;i++){const h=(i+1)*step;s.box([r.x+.475,base+h/2,r.y+(i+.5)*run/n],[.95,h,run/n],'wood');const h2=(n+i+1)*step;s.box([r.x+1.725,base+(stair.rise/2+h2)/2,r.y+run-(i+.5)*run/n],[.95,h2-stair.rise/2,run/n],'wood');}
  s.box([r.x+1.1,base+stair.rise/2-.06,r.y+run+.5],[2.2,.12,1],'wood');
  // Thin handrails and the upper-floor hole guards are visual joinery only.
  for(const x of[r.x+.035,r.x+2.165]){for(let i=0;i<=7;i++){const along=i*run/7,high=base+(x<r.x+1?along/run*1.06:2.12-along/run*1.06);s.box([x,high+.43,r.y+along],[.035,.86,.035],'iron');}
    const highA=base+(x<r.x+1?0:2.12)+.88,highB=base+1.06+.88;const a=[x,highA,r.y],b=[x,highB,r.y+run],z=[.025,0,0];s.face([sub(a,z),add(a,z),add(b,z),sub(b,z)],'iron',[0,1,0]);}
}
export function buildHPlanMesh(input,{lod='game',uvMode='metres'}={}){
  if(!['game','source'].includes(lod)||!['metres','atlas'].includes(uvMode))throw Error('Use supported H-plan detail and UV modes.');const b=input?.floors?structuredClone(input):compileHPlan(input),s=new Surfaces(lod,uvMode),leaves=[];
  for(const f of b.floors){s.channel('floor',f.level);unionPrism(s,b.masses,f.holes,f.height,.12,'wood');for(const w of f.walls)wall(s,w,b,leaves);
    // A continuous slab-edge band, following the union perimeter only.
    if(f.level>0){s.channel('facade-trim',f.level);ring(s,f.contour,-.065,.12,f.height-.13,f.height-.035,'stone');}}
  for(const stair of b.stairs)staircase(s,stair);
  // Cut slab holes exactly at the stair-core rectangle; guard all exposed sides
  // except the front landing where the stair flight arrives.
  for(const f of b.floors.filter(f=>f.level>0))for(const hole of f.holes){s.channel('interior-trim',f.level);for(const x of[hole.x,hole.x+hole.width]){s.box([x,f.height+.76,hole.y+hole.depth/2],[.045,.05,hole.depth],'iron');const count=Math.ceil(hole.depth/.35);for(let i=0;i<=count;i++)s.box([x,f.height+.38,hole.y+hole.depth*i/count],[.025,.76,.025],'iron');}s.box([hole.x+hole.width/2,f.height+.76,hole.y+hole.depth],[hole.width,.05,.045],'iron');}
  const over=b.roof.overhang,roofRects=b.masses.map(r=>({x:r.x-over,y:r.y-over,width:r.width+over*2,depth:r.depth+over*2}));
  s.channel('roof',b.stories);unionPrism(s,roofRects,[],b.roof.height,.12,'felt','stone','plaster');const roofProof=s.roofProof.map(p=>p.map(v=>[...v]));
  s.channel('parapet',b.stories);ring(s,b.floors[0].contour,-.08,.08,b.roof.height,b.roof.height+b.recipe.parapet,'brick');
  ring(s,b.floors[0].contour,-.12,.14,b.roof.height+b.recipe.parapet,b.roof.height+b.recipe.parapet+.075,'stone');
  s.channel('cornice',b.stories);ring(s,b.floors[0].contour,.06,.26,b.roof.height-.18,b.roof.height-.07,b.recipe.cornice==='restrained-timber'?'door':'stone');
  ring(s,b.floors[0].contour,.04,.19,b.roof.height-.28,b.roof.height-.18,'stone');
  if(lod==='source'){ring(s,b.floors[0].contour,.04,.21,b.roof.height-.34,b.roof.height-.29,'stone');for(const w of b.floors[0].walls.filter(w=>!w.interior)){const count=Math.floor(w.length/.55),dx=(w.b[0]-w.a[0])/w.length,dy=(w.b[1]-w.a[1])/w.length;for(let i=0;i<count;i++)s.box([w.a[0]+dx*w.length*(i+.5)/count+w.normal[0]*.16,b.roof.height-.24,w.a[1]+dy*w.length*(i+.5)/count+w.normal[1]*.16],[.09,.13,.09],'stone',true);}}
  // Rear/service detail remains restrained; drain pipes stand clear of corner
  // masonry and have no water/fire simulation binding.
  s.channel('service',b.stories);for(const x of[.2,b.width-.2]){s.cylinder([x,b.roof.height/2,b.depth+.14],.04,b.roof.height,'iron');s.box([x,b.roof.height-.12,b.depth+.17],[.2,.24,.15],'iron',true);}
  for(const flue of b.serviceFeatures){s.box([flue.x,b.roof.height+flue.height/2,flue.y],[flue.width,flue.height,flue.depth],'brick',true);s.box([flue.x,b.roof.height+flue.height+.045,flue.y],[flue.width+.12,.09,flue.depth+.12],'stone',true);s.box([flue.x,b.roof.height+flue.height+.093,flue.y],[flue.width-.18,.006,flue.depth-.18],'iron');}
  const allLeaves=leaves.map(leaf=>leafData(leaf,lod,uvMode)),doorLeaves=allLeaves.filter(leaf=>leaf.paired),fixedLeaves=[];
  // Only the paired public entry needs live pivots in this art adapter. Keep
  // single-leaf descriptors, while batching their closed poses by floor/material.
  for(const leaf of allLeaves.filter(leaf=>!leaf.paired)){const{batches,...descriptor}=leaf;fixedLeaves.push(descriptor);appendTransformed(s,{batches:new Map(batches.map((batch,i)=>[i,{...batch,kind:'door-static'}]))},leaf.pivot,leaf.yaw);}
  const batches=[...s.batches.values()];
  let triangles=0;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  const grow=(p)=>{for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}};
  for(const batch of batches){triangles+=batch.positions.length/9;for(let i=0;i<batch.positions.length;i+=3)grow(batch.positions.slice(i,i+3));}
  for(const leaf of doorLeaves){const c=Math.cos(leaf.yaw),sn=Math.sin(leaf.yaw);for(const batch of leaf.batches){triangles+=batch.positions.length/9;for(let i=0;i<batch.positions.length;i+=3){const[x,y,z]=batch.positions.slice(i,i+3);grow([leaf.pivot[0]+x*c+z*sn,leaf.pivot[1]+y,leaf.pivot[2]-x*sn+z*c]);}}}
  return {schema:'nautilus-h-plan-art-mesh',version:1,id:b.id,lod,uvMode,building:b,batches,doorLeaves,fixedLeaves,roofProof,bounds:{min,max},metrics:{triangles,vertices:triangles*3,
    drawCalls:batches.length+doorLeaves.reduce((n,d)=>n+d.batches.length,0),apartments:b.floors.reduce((n,f)=>n+f.apartments.length,0),windows:b.windows.length}};
}
