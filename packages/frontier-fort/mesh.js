import {compileFrontier,FRONTIER_CONTRACT,transformPoint,validateLayout} from './index.js';
import {FRONTIER_BUILDINGS,FRONTIER_PARTS,frontierRecipe,frontierPart,WALK} from './designs.js';
import {frontierLayout} from './layouts.js';
import {Surfaces,unionPrism,add,sub,mul,cross,dot,len,unit,lerp} from './geometry.js';
import {emitJoinedRoof,emitGableInfill} from './roofs.js';
export {FRONTIER_MATERIALS} from './geometry.js';
const Y=2.12;
const checkOptions=(lod,uvMode)=>{if(!['game','source'].includes(lod)||!['metres','atlas'].includes(uvMode))throw Error('Unsupported art detail / UV mode.');};
export function appendTransformed(s,batches,origin=[0,0,0],yaw=0){
  const c=Math.cos(yaw),sn=Math.sin(yaw),prior=[s.kind,s.level];
  for(const batch of batches){s.channel(batch.kind,batch.level);const out=s.batch(batch.material);
    for(let i=0;i<batch.positions.length;i+=3){const[x,y,z]=batch.positions.slice(i,i+3),[nx,ny,nz]=batch.normals.slice(i,i+3);
      out.positions.push(origin[0]+x*c+z*sn,origin[1]+y,origin[2]-x*sn+z*c);out.normals.push(nx*c+nz*sn,ny,-nx*sn+nz*c);}
    out.uvs.push(...batch.uvs);
  }s.channel(...prior);
}
export function beam(s,a,b,width,depth,material='wood'){
  const axis=unit(sub(b,a)),ref=Math.abs(axis[1])>.95?[1,0,0]:[0,1,0],u=mul(unit(cross(axis,ref)),width/2),v=mul(unit(cross(axis,u)),depth/2),
    pts=p=>[add(add(p,u),v),add(sub(p,u),v),sub(sub(p,u),v),sub(add(p,u),v)],A=pts(a),B=pts(b);
  s.face([...A].reverse(),material,mul(axis,-1));s.face(B,material,axis);
  for(let i=0;i<4;i++){const j=(i+1)%4;s.face([A[i],A[j],B[j],B[i]],material,sub(mul(add(A[i],A[j]),.5),a));}
}
function orientedBox(s,center,size,material,yaw=0,bevel=true){
  const temp=new Surfaces(s.lod,s.uvMode);temp.channel(s.kind,s.level);temp.box([0,0,0],size,material,bevel);appendTransformed(s,[...temp.batches.values()],center,yaw);
}
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
export function wallShell(s,w,b,all){
  const dx=(w.b[0]-w.a[0])/w.length,dz=(w.b[1]-w.a[1])/w.length,n=[dz,0,-dx],half=.08,
    prev=w.interior?null:all.find(q=>q!==w&&!q.interior&&same(q.b,w.a)),next=w.interior?null:all.find(q=>q!==w&&!q.interior&&same(q.a,w.b)),
    miter=(p,q,side)=>{const k=q?.normal||w.normal,den=1+w.normal[0]*k[0]+w.normal[1]*k[1];
      return den<.1?[...p]:[p[0]+(w.normal[0]+k[0])*side/den,p[1]+(w.normal[1]+k[1])*side/den];},
    oa=miter(w.a,prev,half),ob=miter(w.b,next,half),ia=miter(w.a,prev,-half),ib=miter(w.b,next,-half),
    P=(u,h,outer)=>{const p=lerp(outer?oa:ia,outer?ob:ib,u/w.length);return[p[0],w.level*Y+h,p[1]];},
    us=[...new Set([0,w.length,...w.openings.flatMap(o=>[o.u0,o.u1])])].sort((a,b)=>a-b),
    vs=[...new Set([0,2,Y,...w.openings.flatMap(o=>[o.bottom,o.top])])].filter(v=>v>=0&&v<=Y).sort((a,b)=>a-b),
    solid=(i,j)=>i>=0&&j>=0&&i<us.length-1&&j<vs.length-1&&!w.openings.some(o=>(us[i]+us[i+1])/2>o.u0&&(us[i]+us[i+1])/2<o.u1&&(vs[j]+vs[j+1])/2>o.bottom&&(vs[j]+vs[j+1])/2<o.top);
  const mat=w.interior?'plaster':w.level>=(b.recipe.upperWallFrom||1)&&b.recipe.upperWall?b.recipe.upperWall:b.recipe.wall;
  for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){
    if(!solid(i,j))continue;const a=us[i],q=us[i+1],lo=vs[j],hi=vs[j+1];
    s.channel(w.interior?'interior':lo>=2?'datum-band':'exterior',w.level);
    s.face([P(a,lo,true),P(q,lo,true),P(q,hi,true),P(a,hi,true)],mat,n);
    s.face([P(q,lo,false),P(a,lo,false),P(a,hi,false),P(q,hi,false)],w.level>=(b.recipe.upperWallFrom||1)&&b.recipe.upperWall?'timber':'plaster',mul(n,-1));
    if(!solid(i,j-1))s.face([P(a,lo,false),P(q,lo,false),P(q,lo,true),P(a,lo,true)],mat,[0,-1,0]);
    if(!solid(i,j+1))s.face([P(a,hi,true),P(q,hi,true),P(q,hi,false),P(a,hi,false)],mat,[0,1,0]);
    if(!solid(i-1,j)&&(w.interior||i>0))s.face([P(a,lo,false),P(a,lo,true),P(a,hi,true),P(a,hi,false)],mat,[-dx,0,-dz]);
    if(!solid(i+1,j)&&(w.interior||i<us.length-2))s.face([P(q,lo,true),P(q,lo,false),P(q,hi,false),P(q,hi,true)],mat,[dx,0,dz]);
  }
}
function windowTrim(s,o,b){
  const[dx,dz]=o.direction,n=[dz,0,-dx],yaw=-Math.atan2(dz,dx),P=(u,h,side=0)=>[o.origin[0]+dx*u+dz*side,o.origin[1]+h,o.origin[2]+dz*u-dx*side],
    width=o.u1-o.u0,height=o.top-o.bottom,mid=(o.u0+o.u1)/2,box=(u,h,side,size,mat='trim')=>orientedBox(s,P(u,h,side),size,mat,yaw);
  s.channel('facade-trim',o.level);
  for(const side of[-.09,.09]){
    for(const u of[o.u0-.028,o.u1+.028])box(u,(o.bottom+o.top)/2,side,[.055,height+.11,.06]);
    for(const h of[o.bottom-.028,o.top+.028])box(mid,h,side,[width+.11,.055,.06]);
    if(o.glazed&&(side>0||s.lod==='source')){
      for(let i=1;i<o.columns;i++)box(o.u0+width*i/o.columns,(o.bottom+o.top)/2,side,[.025,height,.03]);
      for(let i=1;i<o.rows;i++)box(mid,o.bottom+height*i/o.rows,side,[width,.025,.03]);
    }
  }
  box(mid,o.bottom-.08,.13,[width+.22,.09,.22],'wood');
  if(o.glazed){s.channel('glazing',o.level);const p=[P(o.u0,o.bottom),P(o.u1,o.bottom),P(o.u1,o.top),P(o.u0,o.top)];s.face(p,'glass',n);s.face([...p].reverse(),'glass',mul(n,-1));}
  if(s.lod==='source'){s.channel('facade-trim',o.level);box(mid,o.top+.08,.115,[width+.22,.05,.16]);}
}
export function portalGeometry(s,p){
  const[dx,dz]=p.direction,yaw=-Math.atan2(dz,dx),P=(u,h)=>[p.point[0]+dx*u,p.base+h,p.point[1]+dz*u],
    gate=p.style==='gate',sally=p.style==='sally',jamb=gate?.18:sally?.08:.05,hinge=gate?.24:sally?.12:.075,thickness=gate?.12:sally?.08:.045,
    box=(u,h,size,mat)=>orientedBox(s,P(u,h),size,mat,yaw),paired=p.type==='paired',leaves=[],height=p.height;
  s.channel('portal-trim',p.level);
  for(const u of[-p.width/2+jamb/2,p.width/2-jamb/2])box(u,height/2,[jamb,height,gate?.3:.19],'wood');
  box(0,height-jamb/2,[p.width,jamb,gate?.32:.19],'wood');
  if(p.type==='doorway')return [];
  const leafWidth=paired?(p.width-2*hinge-.012)/2:p.width-2*hinge-.012,leafHeight=height-jamb-.02;
  for(const[at,sign,side]of paired?[[-p.width/2+hinge,1,'left'],[p.width/2-hinge,-1,'right']]:[[-p.width/2+hinge,1,'single']]){
    const leaf={id:p.id+':'+side,openingId:p.id,level:p.level,pivot:P(at,.01),yaw,sign,swingSign:-sign,side,
      paired,public:p.public,style:p.style,width:leafWidth,height:leafHeight,thickness,hingeInset:hinge,roughWidth:p.width,roughHeight:p.height,
      angleRange:[0,90],clearOpenWidth:paired?p.width-2*(hinge+thickness/2+.09):p.width-hinge-thickness/2-jamb,clearOpenHeight:p.height-jamb};
    leaves.push(makeLeaf(leaf,s.lod,s.uvMode));
  }return leaves;
}
function makeLeaf(leaf,lod,uvMode){
  const s=new Surfaces(lod,uvMode),w=leaf.width,h=leaf.height,sign=leaf.sign,gate=['gate','sally'].includes(leaf.style),t=leaf.thickness;
  s.channel('door',leaf.level);s.box([sign*w/2,h/2,0],[w,h,t],'door',true);
  for(const side of[-1,1]){
    for(const y of[.2,h/2,h-.2])s.box([sign*w/2,y,side*(t/2+.025)],[w-.04,.08,.05],gate?'iron':'wood',true);
    if(gate)beam(s,[sign*.08,.28,side*(t/2+.025)],[sign*(w-.08),h-.28,side*(t/2+.025)],.085,.035,'wood');
    s.box([sign*(w-.12),h*.48,side*(t/2+.06)],[.055,.09,.06],'iron',true);
    if(lod==='source'){
      for(let u=.2;u<w-.1;u+=.2)s.box([sign*u,h/2,side*(t/2+.004)],[.012,h-.06,.008],'wood',true);
      for(const y of[.2,h/2,h-.2])for(const x of[.13,w-.13])s.cylinder([sign*x,y,side*(t/2+.055)],.018,.026,'iron');
    }
  }return {...leaf,batches:[...s.batches.values()]};
}
export function stairGeometry(s,{x=0,y=0,base=0,fromLevel=0,material='wood'}={}){
  const temp=new Surfaces(s.lod,s.uvMode),n=7,step=Y/14,run=2.8;temp.channel('stairs',fromLevel);
  for(let i=0;i<n;i++){
    const h=(i+1)*step;temp.box([.65,h/2,(i+.5)*run/n],[1.3,h,run/n],material,true);
    const h2=(n+i+1)*step;temp.box([2.35,(Y/2+h2)/2,run-(i+.5)*run/n],[1.3,h2-Y/2,run/n],material,true);
  }
  temp.box([1.5,Y/2-.06,3.4],[3,.12,1.2],material);
  for(const side of[0,3]){
    const a=[side,(side?Y:0)+.86,0],b=[side,Y/2+.86,run];beam(temp,a,b,.05,.05,'wood');
    for(let i=0;i<=7;i++){const at=i/7*run,h=side?Y-at/run*Y/2:at/run*Y/2;temp.box([side,h+.4,at],[.045,.8,.045],'wood',true);}
  }appendTransformed(s,[...temp.batches.values()],[x+3,base,y+4],Math.PI);
}
function rail(s,a,b,base,style='rail',height=.9){
  const A=[a[0],base,a[1]],B=[b[0],base,b[1]],length=len(sub(B,A));if(length<.02)return;
  s.channel(style==='masonry'?'roof-parapet':'guards',Math.round(base/Y));
  if(style==='masonry'){const yaw=-Math.atan2(b[1]-a[1],b[0]-a[0]);orientedBox(s,lerp(add(A,[0,height/2,0]),add(B,[0,height/2,0]),.5),[length,height,.16],'adobe',yaw);
    beam(s,add(A,[0,height+.025,0]),add(B,[0,height+.025,0]),.12,.2,'adobe');return;}
  for(const h of[height*.45,height])beam(s,add(A,[0,h,0]),add(B,[0,h,0]),.065,.07,'wood');
  const count=Math.max(1,Math.ceil(length/(s.lod==='source'?.65:1.5)));
  for(let i=0;i<=count;i++){const p=lerp(A,B,(.04+i*(length-.08)/count)/length);s.box(add(p,[0,height/2,0]),[.09,height,.09],'wood',true);}
  if(style==='solid')orientedBox(s,lerp(add(A,[0,height*.48,0]),add(B,[0,height*.48,0]),.5),[length,height*.9,.08],'timber',-Math.atan2(b[1]-a[1],b[0]-a[0]));
}
function guardedRect(s,r,b=null,style='rail',height=.9){
  const gaps=(r.gaps||[]).filter(g=>!g.socket||b?.recipe.openInterfaces?.includes(g.socket)),level=r.level,base=level*Y,
    edges=[['front',[r.x,r.y],[r.x+r.width,r.y]],['east',[r.x+r.width,r.y],[r.x+r.width,r.y+r.depth]],
      ['back',[r.x,r.y+r.depth],[r.x+r.width,r.y+r.depth]],['west',[r.x,r.y],[r.x,r.y+r.depth]]];
  for(const[edge,a,c]of edges){
    const horizontal=a[1]===c[1],length=Math.hypot(c[0]-a[0],c[1]-a[1]),cuts=[0,length,...gaps.filter(g=>g.edge===edge).flatMap(g=>[g.from,g.to])];
    const rooms=b?.floors[level]?.rooms.filter(q=>q.type!=='terrace')||[];
    for(const q of rooms)cuts.push(...(horizontal?[q.x-r.x,q.x+q.width-r.x]:[q.y-r.y,q.y+q.depth-r.y]).filter(t=>t>0&&t<length));
    cuts.sort((a,b)=>a-b);
    for(let i=0;i<cuts.length-1;i++){
      const lo=cuts[i],hi=cuts[i+1],mid=(lo+hi)/2,p=lerp(a,c,mid/length);
      if(hi-lo<1e-7||gaps.some(g=>g.edge===edge&&mid>g.from&&mid<g.to))continue;
      if(rooms.some(q=>p[0]>=q.x-1e-7&&p[0]<=q.x+q.width+1e-7&&p[1]>=q.y-1e-7&&p[1]<=q.y+q.depth+1e-7))continue;
      rail(s,lerp(a,c,lo/length),lerp(a,c,hi/length),base,style,height);
    }
  }
}
function holeGuards(s,b){
  for(const f of b.floors)for(const h of f.holes){
    const occupied=(x,z)=>f.slabRects.some(r=>x>r.x-1e-7&&x<r.x+r.width+1e-7&&z>r.y-1e-7&&z<r.y+r.depth+1e-7)&&!f.holes.some(q=>x>q.x&&x<q.x+q.width&&z>q.y&&z<q.y+q.depth);
    for(const[x,side]of[[h.x,-1],[h.x+h.width,1]])for(let z=h.y;z<h.y+h.depth;z+=.5)
      if(occupied(x+side*.04,z+.25))rail(s,[x,z],[x,z+.5],f.height);
    for(let x=h.x;x<h.x+h.width;x+=.5)if(occupied(x+.25,h.y-.04))rail(s,[x,h.y],[x+.5,h.y],f.height);
  }
}
function porch(s,p,b=null){
  for(const level of p.levels||[0]){
    const base=level*Y,occupied=b?.floors[level]?.slabRects.some(r=>p.x>=r.x&&p.y>=r.y&&p.x+p.width<=r.x+r.width&&p.y+p.depth<=r.y+r.depth);
    if(!occupied){s.channel('floor',level);unionPrism(s,[p],[],base,.12,'wood');}
    s.channel('structure',level);
    for(let x=p.x;x<=(p.repeatable?p.x+p.width-1e-7:p.x+p.width+1e-7);x+=p.pitch){
      s.box([x,base+1,p.y+.18],[.16,2,.16],'wood',true);
      s.box([x,base+2.06,p.y+.18],[.28,.12,.25],'wood',true);
      if(s.lod==='source')for(const sign of[-1,1])if(x+sign*.4>p.x&&x+sign*.4<p.x+p.width)
        beam(s,[x,base+1.65,p.y+.18],[x+sign*.4,base+1.98,p.y+.18],.065,.065,'wood');
    }
    s.box([p.x+p.width/2,base+2.06,p.y+.18],[p.width,.12,.22],'wood',true);
    if(p.roof){
      s.channel('roof',level+1);unionPrism(s,[{x:p.x-.2,y:p.y-.2,width:p.width+.4,depth:p.depth+.2}],[],base+Y,.08,'shingle','wood','wood');
    }
  }
}
function flueAndVigas(s,b){
  const r=b.recipe;
  if(r.wall==='adobe'){
    s.channel('roof-trim',1);
    const body=b.floors[0].rooms.filter(q=>q.type!=='terrace'),front=Math.min(...body.map(q=>q.y)),back=Math.max(...body.map(q=>q.y+q.depth)),
      left=Math.min(...body.map(q=>q.x)),right=Math.max(...body.map(q=>q.x+q.width));
    for(let x=left+1.5;x<right;x+=3)for(const z of[front-.18,back+.18])orientedBox(s,[x,Y-.08,z],[.12,.14,.45],'wood');
  }
  if(['frontier-headquarters','frontier-commanders-quarters'].includes(b.id)){
    s.channel('service',2);const x=b.id==='frontier-headquarters'?7.5:6,z=6,top=6.05;
    s.box([x,4.3,z],[.55,3.5,.55],'brick',true);s.box([x,top-.08,z],[.75,.16,.75],'stone',true);s.box([x,top+.01,z],[.4,.02,.4],'iron');
  }
}
function pointedLog(s,x,z,base=0,bodyTop=3.12,seed=0){
  const n=s.lod==='source'?16:8,r=.125,tip=3.12+.21+(seed%4)*.03,center=[x,base,z];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,A=[x+Math.cos(a)*r,base,z+Math.sin(a)*r],B=[x+Math.cos(b)*r,base,z+Math.sin(b)*r],
      C=[B[0],bodyTop,B[2]],D=[A[0],bodyTop,A[2]];
    s.face([A,B,C,D],'log',[Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);
    s.face([D,C,[x,tip,z]],'log',[Math.cos((a+b)/2),.3,Math.sin((a+b)/2)]);
    s.face([center,B,A],'log',[0,-1,0]);
  }
}
function stockade(s,length,{platform=false,opening=null}={}){
  s.channel('stockade',0);
  const count=Math.round(length/.25);
  for(let i=0;i<count;i++){
    const x=(i+.5)*.25,inGate=opening&&x>opening.lo&&x<opening.hi;
    pointedLog(s,x,0,inGate?2.12:0,3.12,i);
  }
  if(opening){
    for(const[x,w]of[[0,opening.lo],[opening.hi,length-opening.hi]])s.box([x+w/2,1.56,.055],[w,3.12,.07],'log');
    s.box([length/2,(opening.height+3.12)/2,.055],[length,3.12-opening.height,.07],'log');
  }else s.box([length/2,1.56,.055],[length,3.12,.07],'log');
  s.channel('structure',0);
  for(const h of[.55,2.75]){
    if(opening&&h<opening.height)for(const[x,w]of[[0,opening.lo],[opening.hi,length-opening.hi]])s.box([x+w/2,h,.18],[w,.13,.16],'wood',true);
    else s.box([length/2,h,.18],[length,.13,.16],'wood',true);
  }
  const depth=platform?3:1.66;s.channel('walkway',1);
  unionPrism(s,[{x:0,y:.16,width:length,depth:depth-.16}],[],Y,.12,'wood','wood','wood');
  s.channel('structure',0);
  for(let x=.3;x<length;x+=1.5){if(opening&&x>opening.lo-.1&&x<opening.hi+.1)continue;s.box([x,1,.9],[.14,2,.14],'wood',true);beam(s,[x,1.35,.9],[x,1.98,depth-.2],.1,.1,'wood');}
  if(platform){
    rail(s,[0,3],[.65,3],Y);rail(s,[3.65,3],[length,3],Y);
    rail(s,[0,1.66],[0,3],Y);rail(s,[length,1.66],[length,3],Y);
  }else rail(s,[0,1.66],[length,1.66],Y);
}
function corner(s,u=false){
  const a=new Surfaces(s.lod,s.uvMode);stockade(a,6);
  // Rebuild the L/U decks as one union, omitting the straight inside rails at the turn.
  const body=[...a.batches.values()].filter(b=>!['walkway','guards'].includes(b.kind));
  appendTransformed(s,body);appendTransformed(s,body,[0,0,6],Math.PI/2);
  if(u)appendTransformed(s,body,[6,0,0],-Math.PI/2);
  s.channel('stockade',0);pointedLog(s,0,0,0,3.12,3);
  if(u)pointedLog(s,6,0,0,3.12,2);
  s.channel('walkway',1);const rects=[{x:0,y:.16,width:6,depth:1.5},{x:.16,y:0,width:1.5,depth:6}];
  if(u)rects.push({x:4.34,y:0,width:1.5,depth:6});
  unionPrism(s,rects,[],Y,.12,'wood','wood','wood');
  rail(s,[1.66,1.66],[u?4.34:6,1.66],Y);rail(s,[1.66,1.66],[1.66,6],Y);
  if(u)rail(s,[4.34,1.66],[4.34,6],Y);
}
function stairPart(s,material='wood',openSide=null,landingDepth=1){
  const end=4+landingDepth;
  s.channel('floor',0);unionPrism(s,[{x:0,y:0,width:3,depth:end}],[],0,.12,'stone');
  stairGeometry(s,{material});s.channel('walkway',1);unionPrism(s,[{x:0,y:4,width:3,depth:landingDepth}],[],Y,.12,material);
  if(openSide!=='west')rail(s,[0,4],[0,end],Y);if(openSide!=='east')rail(s,[3,4],[3,end],Y);
  if(openSide)rail(s,[0,end],[3,end],Y);
}
function shellData(p){
  return {schema:FRONTIER_CONTRACT.schema,version:1,id:p.id,name:p.name,collection:'nautilus-frontier-fort-v1',
    sourceId:'paragon-user-reference',width:p.width,depth:p.depth,levels:p.kind==='gate'?2:2,
    contract:structuredClone(FRONTIER_CONTRACT),interfaces:structuredClone(p.interfaces||[]),
    recipe:{...structuredClone(p),wall:'timber',roofMaterial:'shingle',tint:{wall:[.92,.83,.65],wood:[.66,.66,.56],trim:[.51,.55,.48],roof:[.92,.91,.85]}},
    floors:[],portals:[],windows:[],stairs:[],roofs:[],consumerSupport:{editorProvider:false,collision:false,navigation:false,fire:false},
    sourcePolicy:'Original modular frontier-fort part. Explicit native dimensions and connector contract; no historical measurement claim.'};
}
function finish(s,b,leaves,roofProofs,lod,uvMode){
  const data={schema:'nautilus-frontier-fort-mesh',version:1,lod,uvMode,building:b,batches:[...s.batches.values()],doorLeaves:leaves,roofProofs};
  data.metrics=meshStats(data);data.bounds=data.metrics.bounds;delete data.metrics.bounds;
  if(data.bounds.max[0]-data.bounds.min[0]>240||data.bounds.max[2]-data.bounds.min[2]>240)throw Error('Complete asset bounds exceed 240 m.');
  return data;
}
export function meshStats(data){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let triangles=0;
  const grow=p=>p.forEach((v,i)=>{min[i]=Math.min(min[i],v);max[i]=Math.max(max[i],v);});
  for(const batch of data.batches)for(let i=0;i<batch.positions.length;i+=3){grow(batch.positions.slice(i,i+3));triangles+=1/3;}
  for(const leaf of data.doorLeaves){const c=Math.cos(leaf.yaw),sn=Math.sin(leaf.yaw);
    for(const batch of leaf.batches)for(let i=0;i<batch.positions.length;i+=3){const[x,y,z]=batch.positions.slice(i,i+3);
      grow([leaf.pivot[0]+x*c+z*sn,leaf.pivot[1]+y,leaf.pivot[2]-x*sn+z*c]);triangles+=1/3;}}
  return {triangles:Math.round(triangles),draws:data.batches.length+data.doorLeaves.reduce((n,l)=>n+l.batches.length,0),bounds:{min,max},
    rooms:data.building.floors.reduce((n,f)=>n+f.rooms.filter(r=>!r.omitSlab&&r.type!=='terrace').length,0),windows:data.building.windows?.length||0};
}
export function buildFrontierMesh(input,{lod='game',uvMode='metres'}={}){
  checkOptions(lod,uvMode);
  if(typeof input==='string'&&input.startsWith('frontier-fort-'))return buildFrontierLayout(input,{lod,uvMode});
  if(typeof input==='string'&&FRONTIER_PARTS.some(p=>p.id===input))return buildFrontierPart(input,{lod,uvMode});
  if(input?.schema&&input.schema!==FRONTIER_CONTRACT.schema)throw Error('Unsupported frontier blueprint schema.');
  const b=input?.schema?structuredClone(input):compileFrontier(input),s=new Surfaces(lod,uvMode),leaves=[],roofProofs=[];
  for(const f of b.floors){
    s.channel('floor',f.level);unionPrism(s,f.slabRects,f.holes,f.height,.12,'wood');
    for(const w of f.walls)wallShell(s,w,b,f.walls);
  }
  for(const o of b.windows)windowTrim(s,o,b);
  for(const p of b.portals)leaves.push(...portalGeometry(s,p));
  for(const stair of b.stairs)stairGeometry(s,{x:stair.rect.x,y:stair.rect.y,base:stair.base,fromLevel:stair.fromLevel});
  holeGuards(s,b);
  for(const p of b.recipe.porches||[])porch(s,p,b);
  for(const a of b.roofs){
    const result=emitJoinedRoof(s,[a],b.recipe.roofMaterial,beam);roofProofs.push(result.proof);emitGableInfill(s,b,result.facets);
    s.channel('roof-trim',a.level);
    for(const r of a.components){const span=r.depth+.5,run=r.width+.5,inset=r.type==='hip'?span/2:0;
      if(run>2*inset)beam(s,[r.x-.25+inset,a.datum+r.rise+.025,r.y+r.depth/2],[r.x+r.width+.25-inset,a.datum+r.rise+.025,r.y+r.depth/2],.08,.06,b.recipe.roofMaterial);}
  }
  for(const r of b.recipe.flatRoofs||[]){
    s.channel('roof',r.level);s.roofProof=[];unionPrism(s,[r],[],r.level*Y,.12,'earth','adobe','plaster');
    roofProofs.push({id:b.id+':flat-roof',kind:'flat-terrace',faces:s.roofProof});
    guardedRect(s,r,b,'masonry',r.parapet);
  }
  for(const r of b.recipe.deckGuards||[])guardedRect(s,r,b,'solid',.95);
  if(b.recipe.separateStair){
    const r=b.recipe.separateStair,temp=new Surfaces(lod,uvMode);stairPart(temp,r.material,r.openLandingSide,r.landingDepth||1);appendTransformed(s,[...temp.batches.values()],[r.x,0,r.y]);
  }
  if(b.recipe.externalStair){s.channel('floor',0);unionPrism(s,[{x:0,y:0,width:3,depth:5}],[],0,.12,'stone');}
  if(b.recipe.cornerButtresses){s.channel('structure',0);for(const[x,z,w,d]of[[5.75,3,.5,.5],[3,5.75,.5,.5]])
    s.box([x,1,z],[w,2,d],'stone',true);}
  flueAndVigas(s,b);return finish(s,b,leaves,roofProofs,lod,uvMode);
}
export function buildFrontierPart(id,{lod='game',uvMode='metres'}={}){
  checkOptions(lod,uvMode);
  const p=frontierPart(id),b=shellData(p),s=new Surfaces(lod,uvMode),leaves=[];
  if(p.kind==='stockade')stockade(s,p.length);
  else if(p.kind==='corner'||p.kind==='u')corner(s,p.kind==='u');
  else if(p.kind==='platform'){
    stockade(s,6,{platform:true});const temp=new Surfaces(lod,uvMode);stairPart(temp);appendTransformed(s,[...temp.batches.values()],[3.65,0,8],Math.PI);
  }else if(p.kind==='sally'){
    stockade(s,6,{opening:{lo:1.5,hi:4.5,height:2}});
    const portal={id:id+':rear-gate',level:0,point:[3,0],base:0,width:3,height:2,type:'paired',style:'sally',public:true,direction:[1,0],normal:[0,-1]};
    b.portals.push(portal);leaves.push(...portalGeometry(s,portal));
  }else if(p.kind==='stair')stairPart(s);
  else if(p.kind==='porch')porch(s,{x:0,y:0,width:3,depth:3,pitch:3,levels:[0],repeatable:true});
  else if(p.kind==='post'){s.channel('structure',0);s.box([0,1,0],[.16,2,.16],'wood',true);s.box([0,2.06,0],[.28,.12,.25],'wood',true);}
  else if(p.kind==='gate'){
    const portal={id:id+':gate',level:0,point:[2,0],base:0,width:4,height:4.12,type:'paired',style:'gate',public:true,direction:[1,0],normal:[0,-1]};
    b.portals.push(portal);leaves.push(...portalGeometry(s,portal));
  }
  return finish(s,b,leaves,[],lod,uvMode);
}
export function buildFrontierLayout(input,{lod='game',uvMode='metres'}={}){
  checkOptions(lod,uvMode);
  const layout=typeof input==='string'?frontierLayout(input):structuredClone(input),proof=validateLayout(layout);if(proof.errors.length)throw Error(proof.errors.join(' '));
  const b=shellData({id:layout.id,name:layout.name,width:layout.width,depth:layout.depth,interfaces:[]}),s=new Surfaces(lod,uvMode),leaves=[],roofProofs=[],cache=new Map();
  layout.connections=proof.connections;b.layout=layout;b.levels=3;
  for(const instance of layout.instances){
    const opened=[...(instance.openInterfaces||[])].sort(),key=instance.assetId+':'+JSON.stringify(opened);
    let data=cache.get(key);if(!data){const recipe=opened.length?{...frontierRecipe(instance.assetId),openInterfaces:opened}:instance.assetId;
      data=buildFrontierMesh(recipe,{lod,uvMode});cache.set(key,data);}
    appendTransformed(s,data.batches,instance.position,instance.yaw);
    for(const leaf of data.doorLeaves)leaves.push({...structuredClone(leaf),id:instance.id+':'+leaf.id,openingId:instance.id+':'+leaf.openingId,
      pivot:transformPoint(leaf.pivot,instance),yaw:leaf.yaw+instance.yaw,instanceId:instance.id});
    for(const r of data.roofProofs)roofProofs.push({...r,id:instance.id+':'+r.id,faces:r.faces.map(face=>face.map(p=>transformPoint(p,instance)))});
  }
  b.cosmeticGround={height:-.005,policy:'5 mm visual bias below the native floor datum; no terrain/collision capability.'};
  s.channel('ground',0);s.face([[0,-.005,0],[layout.width,-.005,0],[layout.width,-.005,layout.depth],[0,-.005,layout.depth]],'earth',[0,1,0]);
  b.assemblyProof=proof;return finish(s,b,leaves,roofProofs,lod,uvMode);
}
