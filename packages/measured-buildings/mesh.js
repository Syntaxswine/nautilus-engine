import {compileMeasured} from './index.js';
import {Surfaces,unionPrism,add,sub,mul,dot,cross,len,unit,lerp} from './geometry.js';
export {MEASURED_MATERIALS} from './geometry.js';
const Y=2.12;
export function appendTransformed(target,source,origin=[0,0,0],yaw=0,kind=null) {
  const c=Math.cos(yaw),sn=Math.sin(yaw),prior=[target.kind,target.level];
  for(const batch of source.batches.values()) {
    target.channel(kind||batch.kind,batch.level);const b=target.batch(batch.material);
    for(let i=0;i<batch.positions.length;i+=3) {
      const[x,y,z]=batch.positions.slice(i,i+3),[nx,ny,nz]=batch.normals.slice(i,i+3);
      b.positions.push(origin[0]+x*c+z*sn,origin[1]+y,origin[2]-x*sn+z*c);
      b.normals.push(nx*c+nz*sn,ny,-nx*sn+nz*c);
    }
    for(const value of batch.uvs)b.uvs.push(value);
  }
  target.channel(...prior);
}
function localBox(s,center,size,material,yaw=0,bevel=true) {
  const temp=new Surfaces(s.lod,s.uvMode);temp.channel(s.kind,s.level);temp.box([0,0,0],size,material,bevel);appendTransformed(s,temp,center,yaw);
}
export function beam(s,a,b,width,depth,material='wood') {
  const axis=unit(sub(b,a)),ref=Math.abs(axis[1])>.95?[1,0,0]:[0,1,0],u=mul(unit(cross(axis,ref)),width/2),v=mul(unit(cross(axis,u)),depth/2),
    pts=(p)=>[add(add(p,u),v),add(sub(p,u),v),sub(sub(p,u),v),sub(add(p,u),v)],A=pts(a),B=pts(b);
  s.face([...A].reverse(),material,mul(axis,-1));s.face(B,material,axis);
  for(let i=0;i<4;i++){const j=(i+1)%4;s.face([A[i],A[j],B[j],B[i]],material,sub(mul(add(A[i],A[j]),.5),a));}
}
function miter(w,point,neighbor,side) {
  const n=w.normal,p=neighbor?.normal||n,denom=1+n[0]*p[0]+n[1]*p[1];
  return [point[0]+(n[0]+p[0])*side/denom,point[1]+(n[1]+p[1])*side/denom];
}
const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
export function wallSurface(s,w,b,all,leaves) {
  const base=w.level*Y,dx=(w.b[0]-w.a[0])/w.length,dz=(w.b[1]-w.a[1])/w.length,n=[dz,0,-dx],yaw=-Math.atan2(dz,dx),half=.08,
    prev=w.interior?null:all.find(q=>q!==w&&!q.interior&&same(q.b,w.a)),next=w.interior?null:all.find(q=>q!==w&&!q.interior&&same(q.a,w.b)),
    oa=miter(w,w.a,prev,half),ob=miter(w,w.b,next,half),ia=miter(w,w.a,prev,-half),ib=miter(w,w.b,next,-half),
    P=(u,h,outer)=>{const p=lerp(outer?oa:ia,outer?ob:ib,u/w.length);return[p[0],base+h,p[1]];},
    local=(u,h,side=0)=>[w.a[0]+dx*u+dz*side,base+h,w.a[1]+dz*u-dx*side],
    us=[...new Set([0,w.length,...w.openings.flatMap(o=>[o.u0,o.u1])])].sort((a,b)=>a-b),
    vs=[...new Set([0,2,...(!w.interior?[Y]:[]),...w.openings.flatMap(o=>[o.bottom,o.top])])].filter(v=>v>=0&&v<=(w.interior?2:Y)).sort((a,b)=>a-b),
    solid=(i,j)=>i>=0&&j>=0&&i<us.length-1&&j<vs.length-1&&!w.openings.some(o=>(us[i]+us[i+1])/2>o.u0&&(us[i]+us[i+1])/2<o.u1&&(vs[j]+vs[j+1])/2>o.bottom&&(vs[j]+vs[j+1])/2<o.top);
  for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++) {
    if(!solid(i,j))continue;const a=us[i],q=us[i+1],lo=vs[j],hi=vs[j+1],mat=w.interior?'plaster':b.recipe.wall;
    s.channel(w.interior?'interior':lo>=2?'datum-band':'exterior',w.level);
    s.face([P(a,lo,true),P(q,lo,true),P(q,hi,true),P(a,hi,true)],mat,n);
    s.face([P(q,lo,false),P(a,lo,false),P(a,hi,false),P(q,hi,false)],'plaster',mul(n,-1));
    if(!solid(i,j-1))s.face([P(a,lo,false),P(q,lo,false),P(q,lo,true),P(a,lo,true)],mat,[0,-1,0]);
    if(!solid(i,j+1))s.face([P(a,hi,true),P(q,hi,true),P(q,hi,false),P(a,hi,false)],mat,[0,1,0]);
    if(!solid(i-1,j)&&(w.interior||i>0))s.face([P(a,lo,false),P(a,lo,true),P(a,hi,true),P(a,hi,false)],mat,[-dx,0,-dz]);
    if(!solid(i+1,j)&&(w.interior||i<us.length-2))s.face([P(q,lo,true),P(q,lo,false),P(q,hi,false),P(q,hi,true)],mat,[dx,0,dz]);
  }
  const box=(u,h,side,size,mat='sash',bevel=true)=>localBox(s,local(u,h,side),size,mat,yaw,bevel);
  for(const o of w.openings) {
    const width=o.u1-o.u0,height=o.top-o.bottom,mid=(o.u0+o.u1)/2;
    s.channel(w.interior?'interior-trim':'facade-trim',w.level);
    if(o.type==='window') {
      if(o.continuation)continue;
      const fullHeight=o.fullHeight||height,low=o.bottom;
      s.channel('glazing',w.level);const points=[local(o.u0,low),local(o.u1,low),local(o.u1,low+fullHeight),local(o.u0,low+fullHeight)];
      s.face(points,'glass',n);s.face([...points].reverse(),'glass',mul(n,-1));s.channel('facade-trim',w.level);
      for(const side of[-.095,.095]) {
        for(const u of[o.u0-.03,o.u1+.03])box(u,low+fullHeight/2,side,[.06,fullHeight+.12,.05]);
        for(const h of[low-.025,low+fullHeight+.025])box(mid,h,side,[width+.12,.05,.05]);
        const cols=o.columns||b.recipe.window.columns,rows=o.rows||b.recipe.window.rows;
        if(side>0||s.lod==='source'){
          for(let c=1;c<cols;c++)box(o.u0+width*c/cols,low+fullHeight/2,side,[.024,fullHeight,.038]);
          for(let row=1;row<rows;row++)box(mid,low+fullHeight*row/rows,side,[width,.028,.038]);
        }
      }
      box(mid,low-.09,.13,[width+.22,.1,.24],b.recipe.wall==='granite'?'granite':'stone');
      box(mid,low+fullHeight+.09,.1,[width+.24,.13,.18],b.recipe.wall==='granite'?'granite':'stone');
      if(b.recipe.window.profile==='hospital-keystone')box(mid,low+fullHeight+.15,.15,[.15,.21,.22],'stone');
    } else {
      const paired=o.type==='paired',jamb=paired?.065:.05,clear=width-2*jamb,leafWidth=paired?(clear-.008)/2:clear-.012,leafHeight=height-jamb-.018;
      for(const u of[o.u0+jamb/2,o.u1-jamb/2])box(u,o.bottom+height/2,0,[jamb,height,.18],'door');
      box(mid,o.top-jamb/2,0,[width,jamb,.18],'door');
      if(o.type==='doorway')continue;
      for(const[at,sign,side]of paired?[[o.u0+jamb,1,'left'],[o.u1-jamb,-1,'right']]:[[o.u0+jamb,1,'single']])
        leaves.push({id:o.id+':'+side,openingId:o.id,level:w.level,pivot:local(at,o.bottom+.009),yaw,sign,swingSign:sign,side,
          paired,public:!!o.public,width:leafWidth,height:leafHeight,thickness:.045,live:!!o.public||paired});
      if(o.public&&paired) {
        s.channel('facade-trim',w.level);
        for(const u of[o.u0-.15,o.u1+.15])box(u,.93,.15,[.2,1.86,.3],b.recipe.wall==='granite'?'granite':'stone');
        box(mid,1.94,.15,[width+.5,.12,.32],b.recipe.wall==='granite'?'granite':'stone');
      }
    }
  }
}
export function leafMesh(leaf,lod,uvMode) {
  const s=new Surfaces(lod,uvMode),w=leaf.width,h=leaf.height,sign=leaf.sign;s.channel('door',leaf.level);
  s.box([sign*w/2,h/2,0],[w,h,leaf.thickness],'door',true);
  for(const side of[-1,1]) {
    for(const y of[h*.28,h*.71])s.box([sign*w/2,y,side*(leaf.thickness/2+.009)],[w*.72,h*.3,.018],'door',true);
    s.box([sign*(w-.09),h*.48,side*(leaf.thickness/2+.035)],[.045,.055,.05],'iron',true);
  }
  if(leaf.paired&&leaf.side==='left')s.box([sign*(w-.012),h/2,-leaf.thickness/2-.018],[.04,h,.028],'door',true);
  return {...leaf,batches:[...s.batches.values()]};
}
export function stairGeometry(s,stair) {
  const temp=new Surfaces(s.lod,s.uvMode),n=7,step=Y/14,run=2.8;temp.channel('stairs',stair.fromLevel);
  for(let i=0;i<n;i++) {
    const h=(i+1)*step;temp.box([.65,h/2,(i+.5)*run/n],[1.3,h,run/n],'wood',true);
    const h2=(n+i+1)*step;temp.box([2.35,(Y/2+h2)/2,run-(i+.5)*run/n],[1.3,h2-Y/2,run/n],'wood',true);
  }
  temp.box([1.5,Y/2-.06,3.4],[3,.12,1.2],'wood');
  for(const side of[0,3]) {
    const a=[side,(side?Y:0)+.86,0],b=[side,Y/2+.86,run];beam(temp,a,b,.04,.05,'iron');
    for(let i=0;i<=7;i++){const at=i/7*run,h=(side?Y-at/run*Y/2:at/run*Y/2);temp.box([side,h+.4,at],[.035,.8,.035],'iron');}
  }
  // Half-turn gives both flight attachments the rear core landing at y + 4.
  appendTransformed(s,temp,[stair.rect.x+3,stair.base,stair.rect.y+4],Math.PI);
}
export function guards(s,b) {
  for(const f of b.floors)for(const h of f.holes) {
    s.channel('interior-trim',f.level);
    for(const x of[h.x,h.x+h.width]) {
      s.box([x,f.height+.82,h.y+h.depth/2],[.04,.06,h.depth],'iron');
      for(let z=.4;z<h.depth;z+=.4)s.box([x,f.height+.4,h.y+z],[.025,.8,.025],'iron');
    }
    if(h.kind==='atrium')for(const z of[h.y,h.y+h.depth]){
      s.box([h.x+h.width/2,f.height+.82,z],[h.width,.06,.04],'iron');
      for(let x=.4;x<h.width;x+=.4)s.box([h.x+x,f.height+.4,z],[.025,.8,.025],'iron');
    }
    // Core wall encloses the front; the rear landing remains open at the exit.
  }
}
function hipRoof(s,r,material) {
  const [left,front,right,back]=r.overhang||[.3,.3,.3,.3],x=r.x-left,z=r.y-front,w=r.width+left+right,d=r.depth+front+back,
    y=r.datum,axis=w>=d?'x':'z',run=Math.max(w,d),span=Math.min(w,d),inset=Math.min(span/2,run/2),
    P=(a,c,h)=>axis==='x'?[x+a,y+h,z+c]:[x+c,y+h,z+a],A=P(0,0,0),B=P(run,0,0),C=P(run,span,0),D=P(0,span,0),
    E=P(inset,span/2,r.rise),F=P(run-inset,span/2,r.rise);
  s.face([A,B,F,E],material,[0,1,0]);s.face([B,C,F],material,[0,1,0]);s.face([C,D,E,F],material,[0,1,0]);s.face([D,A,E],material,[0,1,0]);
  // Underside closes the shell, with a finite .08 m fascia. Roof joins abut the taller wall.
  s.face([[A[0],y-.08,A[2]],[D[0],y-.08,D[2]],[C[0],y-.08,C[2]],[B[0],y-.08,B[2]]],'plaster',[0,-1,0]);
  for(const [p,q]of[[A,B],[B,C],[C,D],[D,A]])s.face([p,[p[0],y-.08,p[2]],[q[0],y-.08,q[2]],q],material,[q[2]-p[2],0,p[0]-q[0]]);
  s.channel('roof-trim',r.level);for(const [p,q]of[[A,B],[B,C],[C,D],[D,A]])beam(s,add(p,[0,-.11,0]),add(q,[0,-.11,0]),.13,.14,'stone');
  beam(s,add(E,[0,.02,0]),add(F,[0,.02,0]),.1,.08,material);
  if(s.lod==='source') {
    // Relief uses narrow strips; settled outer silhouette remains the same.
    for(const [p,q]of[[A,E],[B,F],[C,F],[D,E]])beam(s,lerp(p,q,.025),lerp(p,q,.98),.055,.018,material);
  }
}
function gableRoof(s,r,material) {
  const [l,f,q,k]=r.overhang,x=r.x-l,z=r.y-f,w=r.width+l+q,d=r.depth+f+k,y=r.datum,mid=z+d/2,
    A=[x,y,z],B=[x+w,y,z],C=[x+w,y,z+d],D=[x,y,z+d],E=[x,y+r.rise,mid],F=[x+w,y+r.rise,mid];
  s.face([A,B,F,E],material,[0,1,0]);s.face([C,D,E,F],material,[0,1,0]);
  s.face([[x,y-.08,z],[x,y-.08,z+d],[x+w,y-.08,z+d],[x+w,y-.08,z]],'plaster',[0,-1,0]);
  s.face([A,E,D,[x,y-.08,z+d],[x,y-.08,z]],'granite',[-1,0,0]);
  s.face([B,[x+w,y-.08,z],[x+w,y-.08,z+d],C,F],'granite',[1,0,0]);
  for(const[p,c]of[[A,B],[D,C]])s.face([p,c,add(c,[0,-.08,0]),add(p,[0,-.08,0])],material,[0,0,p[2]<mid?-1:1]);
  s.channel('roof-trim',r.level);for(const[p,c]of[[A,B],[D,C],[A,E],[E,D],[B,F],[F,C]])beam(s,p,c,.13,.13,'granite');
  beam(s,add(E,[0,.03,0]),add(F,[0,.03,0]),.12,.08,'slate');
}
export function doricColumn(s,{x=0,y=0,base=0,spanLevels=3,level=0,radius=.34,material='granite'}={}) {
  const h=spanLevels*Y-.12,count=s.lod==='source'?32:12,profile=[[0,radius*1.24],[.12,radius*1.24],[.2,radius],
    [h-.36,radius*.78],[h-.28,radius],[h-.17,radius*1.16],[h,radius*1.3]];
  s.channel('columns',level);
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,b=(i+1)/count*Math.PI*2,[lo,rl]=profile[j],[hi,rh]=profile[j+1],P=(r,t,z)=>[x+Math.cos(t)*r,base+z,y+Math.sin(t)*r];
    s.face([P(rl,a,lo),P(rl,b,lo),P(rh,b,hi),P(rh,a,hi)],material,[Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);
    if(!j)s.face([[x,base,y],P(rl,b,lo),P(rl,a,lo)],material,[0,-1,0]);
    if(j===profile.length-2)s.face([[x,base+h,y],P(rh,a,hi),P(rh,b,hi)],material,[0,1,0]);
  }
}
export function marketStall(s,{x=0,y=7,backward=false,level=0}={}) {
  const base=level*Y,z=y+(backward?.325:-.325);s.channel('stall',level);
  s.box([x+.975,base+.39,z],[1.65,.78,.65],'door',true);
  s.box([x+.975,base+.81,z],[1.8,.06,.75],'wood',true);
  s.box([x+.975,base+.42,z+(backward?-.338:.338)],[1.4,.52,.03],'wood',true);
  if(s.lod==='source')for(let i=0;i<4;i++)s.box([x+.45+i*.35,base+.42,z+(backward?-.36:.36)],[.035,.52,.025],'door',true);
}
export function longSpanTruss(s,{x=0,y=0,datum=0,span=14,rise=1.7,level=3}={}) {
  s.channel('roof-truss',level);const a=[x,datum+.08,y],b=[x,datum+.08,y+span],c=[x,datum+rise,y+span/2];
  for(const[p,q]of[[a,b],[a,c],[c,b],[c,[x,datum+.08,y+span/2]]])beam(s,p,q,.14,.18,'wood');
  for(const sign of[-1,1])beam(s,[x,datum+.08,y+span/2],[x,datum+rise*.5,y+span/2+sign*span/4],.09,.1,'wood');
  for(const p of[a,b,c])s.box(p,[.19,.19,.19],'iron',true);
}
function domeRoof(s,r) {
  const cx=r.x+r.width/2,cz=r.y+r.depth/2,rx=r.width/2-.3,rz=7.5,base=r.datum+.5,rise=r.rise,sides=s.lod==='source'?32:16,rings=s.lod==='source'?12:6;
  // A native rectangular ceiling annulus carries the dome; its open centre is deliberate.
  unionPrism(s,[{x:r.x-.2,y:r.y-.2,width:r.width+.4,depth:r.depth+.4}],
    [{x:cx-6,y:cz-4,width:12,depth:8}],r.datum,.12,'granite','granite','plaster');
  const P=(i,j,inside=false)=>{const a=i/sides*Math.PI*2,t=j/rings*Math.PI/2;return[cx+Math.cos(a)*Math.cos(t)*(rx-(inside?.08:0)),base+Math.sin(t)*(rise-(inside?.08:0)),cz+Math.sin(a)*Math.cos(t)*(rz-(inside?.08:0))];};
  for(let i=0;i<sides;i++) {
    const a=P(i,0),b=P(i+1,0),ia=P(i,0,true),ib=P(i+1,0,true),lo=p=>[p[0],r.datum,p[2]];
    s.face([lo(a),lo(b),b,a],'granite',[a[0]-cx,0,a[2]-cz]);
    s.face([lo(ib),lo(ia),ia,ib],'plaster',[cx-a[0],0,cz-a[2]]);
    s.face([lo(a),lo(ia),lo(ib),lo(b)],'granite',[0,-1,0]);
    for(let j=0;j<rings;j++)for(const inside of[false,true]) {
      const p=P(i,j,inside),q=P(i+1,j,inside),A=P(i,j+1,inside),B=P(i+1,j+1,inside),normal=[p[0]-cx,(p[1]-base)*3,p[2]-cz].map(v=>inside?-v:v);
      if(j===rings-1)s.face([p,q,[cx,base+rise-(inside?.08:0),cz]],inside?'plaster':'copper',normal);
      else s.face([p,q,B,A],inside?'plaster':'copper',normal);
    }
  }
  s.channel('roof-trim',r.level);const peak=base+rise;
  s.cylinder([cx,peak+.06,cz],.75,.12,'granite');
  for(let i=0;i<8;i++) {
    const a=i/8*Math.PI*2,b=(i+1)/8*Math.PI*2,A=[cx+Math.cos(a)*.65,peak+.12,cz+Math.sin(a)*.65],B=[cx+Math.cos(b)*.65,peak+.12,cz+Math.sin(b)*.65];
    s.face([A,B,add(B,[0,.8,0]),add(A,[0,.8,0])],'glass',[A[0]-cx,0,A[2]-cz]);
    beam(s,A,add(A,[0,.8,0]),.05,.05,'sash');
    s.face([[cx+Math.cos(a)*.8,peak+.92,cz+Math.sin(a)*.8],[cx,peak+1.35,cz],[cx+Math.cos(b)*.8,peak+.92,cz+Math.sin(b)*.8]],'copper',[Math.cos(a),1,Math.sin(a)]);
  }
  s.cylinder([cx,peak+1.5,cz],.035,.3,'iron');
  if(s.lod==='source')for(let i=0;i<16;i++)for(let j=0;j<rings-1;j++)beam(s,P(i*sides/16,j,true),P(i*sides/16,j+1,true),.035,.04,'plaster');
}
function marketDetails(s,b) {
  if(b.id!=='quincy-market-hall')return;
  for(const portico of b.recipe.porticoes) {
    const x=portico.columnX;s.channel('portico',0);unionPrism(s,[portico],[],0,.12,'granite','granite');
    for(const z of[3.3,7.1,10.9,14.7])doricColumn(s,{x,y:z,spanLevels:3,radius:.36});
    s.channel('roof-trim',3);s.box([x,6.3,9],[.45,.12,15.1],'granite',true);
  }
  for(const x0 of[0,87]) {
    for(let x=x0+.2;x<x0+66;x+=3)for(const z of[7,11])doricColumn(s,{x,y:z,spanLevels:2,radius:.11,material:'iron'});
    s.channel('structure',0);for(const z of[7,11])s.box([x0+33,3.97,z],[66,.3,.25],'wood',true);
    for(let i=0;i<22;i++){marketStall(s,{x:x0+i*3,y:7});marketStall(s,{x:x0+i*3,y:11,backward:true});}
    for(let x=x0+3;x<x0+66;x+=6)longSpanTruss(s,{x,y:2,datum:6.36,span:14,rise:1.7,level:3});
  }
  for(const level of[0,1,2,3]) {
    s.channel('facade-trim',level);
    for(const x of[66,87])for(const z of[0,18])s.box([x,level*Y+1,z],[.3,2,.22],'granite',true);
  }
}
export function veranda(s,b) {
  for(const v of b.recipe.balconies||[])for(const level of v.levels) {
    const base=level*Y;s.channel('balcony',level);unionPrism(s,[v],[],base,.12,'wood','stone');
    const count=Math.round(v.width/v.step);
    for(let i=0;i<=count;i++) {
      const x=v.x+i*v.step,z=v.y+v.depth-.08;
      s.box([x,base+1,z],[.16,2,.16],'sash',true);s.box([x,base+2.06,z],[.22,.12,.22],'stone',true);
      if(level>0&&i<count){const center=x+v.step/2;s.box([center,base+.8,z],[v.step,.07,.08],'stone',true);
        const density=s.lod==='source'?.2:.5;for(let u=.25;u<v.step;u+=density)s.box([x+u,base+.4,z],[.045,.8,.045],'sash',true);}
    }
    s.box([v.x+v.width/2,base+2.06,v.y+v.depth-.08],[v.width,.12,.18],'stone',true);
  }
}
function hospitalDetail(s,b) {
  if(b.id!=='ellis-hospital-two')return;
  // Alternating quoins preserve the surveyed masonry rhythm without rescaling modules.
  for(const f of b.floors) {
    s.channel('facade-trim',f.level);
    const corners=f.level===2?[[9,0],[39,0],[9,12],[39,12]]:[[0,0],[48,0],[0,30],[9,30],[39,30],[48,30]];
    for(const [x,z]of corners)for(let row=0;row<5;row++) {
      const h=f.height+.22+row*.4;s.box([x,h,z],[row%2?.25:.42,.18,row%2?.42:.25],'stone',true);
    }
  }
  s.channel('service',3);
  for(const x of[15,33]) {
    s.box([x,8.6,6],[.8,2.1,.8],'brick',true);s.box([x,9.67,6],[1,.14,1],'stone',true);
    s.box([x,9.75,6],[.6,.018,.6],'iron');
  }
}
export function industrialBay(s,{x=3,y=0,base=0,spanLevels=2,level=0}={}) {
  const top=spanLevels*Y-.12;s.channel('structure',level);
  s.cylinder([x,base+top/2,y+7.5],.085,top,'iron');
  s.box([x,base+.065,y+7.5],[.3,.13,.3],'iron',true);
  s.box([x,base+top-.08,y+7.5],[.38,.16,.38],'iron',true);
  s.box([x,base+top-.15,y+7.5],[.3,.3,15],'wood',true);
  for(const z of[.22,14.78])s.box([x,base+top-.15,y+z],[.5,.3,.42],'stone',true);
  if(s.lod==='source')for(const sign of[-1,1])beam(s,[x,base+top-.7,y+7.5],[x,base+top-.28,y+7.5+sign*.65],.05,.06,'iron');
}
function millDetails(s,b) {
  if(b.id!=='boott-mill-four')return;
  for(const level of[0,2,4])for(let x=3;x<54;x+=6)industrialBay(s,{x,level,base:level*Y,spanLevels:level<4?2:1});
  s.channel('roof-trim',5);
  const perimeter=[[0,0],[60,0],[60,7],[54,7],[54,15],[0,15]];
  for(let i=0;i<perimeter.length;i++){const a=perimeter[i],q=perimeter[(i+1)%perimeter.length],n=Math.hypot(q[0]-a[0],q[1]-a[1]);
    beam(s,[...a.slice(0,1),10.72,a[1]],[q[0],10.72,q[1]],.24,.28,'brick');
    beam(s,[a[0],10.88,a[1]],[q[0],10.88,q[1]],.08,.35,'stone');
    if(s.lod==='source')for(let u=.25;u<n;u+=.55)s.box([a[0]+(q[0]-a[0])*u/n,10.47,a[1]+(q[1]-a[1])*u/n],[.1,.12,.1],'brick',true);
  }
}
export function meshStats(data) {
  let triangles=0;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  function grow(p){for(let k=0;k<3;k++){min[k]=Math.min(min[k],p[k]);max[k]=Math.max(max[k],p[k]);}}
  for(const batch of data.batches)for(let i=0;i<batch.positions.length;i+=3){grow(batch.positions.slice(i,i+3));triangles+=1/3;}
  for(const leaf of data.doorLeaves)for(const batch of leaf.batches) {
    const c=Math.cos(leaf.yaw),sn=Math.sin(leaf.yaw);
    for(let i=0;i<batch.positions.length;i+=3){const[x,y,z]=batch.positions.slice(i,i+3);grow([leaf.pivot[0]+x*c+z*sn,leaf.pivot[1]+y,leaf.pivot[2]-x*sn+z*c]);triangles+=1/3;}
  }
  return {triangles:Math.round(triangles),draws:data.batches.length+data.doorLeaves.reduce((n,l)=>n+l.batches.length,0),bounds:{min,max}};
}
export function buildMeasuredMesh(input,{lod='game',uvMode='metres'}={}) {
  if(!['game','source'].includes(lod)||!['metres','atlas'].includes(uvMode))throw Error('Use a supported measured-building LOD and UV mode.');
  const b=input?.schema?structuredClone(input):compileMeasured(input),s=new Surfaces(lod,uvMode),leaves=[];
  for(const f of b.floors) {
    s.channel('floor',f.level);unionPrism(s,f.slabRects,f.holes,f.height,.12,'wood');
    for(const w of f.walls)wallSurface(s,w,b,f.walls,leaves);
  }
  for(const stair of b.stairs)stairGeometry(s,stair);guards(s,b);veranda(s,b);hospitalDetail(s,b);millDetails(s,b);marketDetails(s,b);
  const roofProofs=[],handled=new Set();
  for(const r of b.roofs) {
    if(handled.has(r.id))continue;
    s.channel('roof',r.level);s.roofProof=[];
    if(r.type==='hip')hipRoof(s,r,b.recipe.roofMaterial);
    else if(r.type==='gable')gableRoof(s,r,b.recipe.roofMaterial);
    else if(r.type==='dome')domeRoof(s,r);
    else if(r.type==='flat'){
      const group=b.roofs.filter(q=>q.type==='flat'&&q.level===r.level);for(const q of group)handled.add(q.id);
      unionPrism(s,group.map(q=>({x:q.x-.16,y:q.y-.16,width:q.width+.32,depth:q.depth+.32})),[],r.datum,.12,b.recipe.roofMaterial);
    }
    roofProofs.push({id:r.id,faces:s.roofProof});
  }
  const doorLeaves=[],fixedLeaves=[];
  for(const leaf of leaves) {
    const data=leafMesh(leaf,lod,uvMode);
    if(leaf.live)doorLeaves.push(data);
    else {const{batches,...descriptor}=data;fixedLeaves.push(descriptor);appendTransformed(s,{batches:new Map(batches.map((batch,i)=>[i,batch]))},leaf.pivot,leaf.yaw,'door-static');}
  }
  const data={schema:'nautilus-measured-art-mesh',version:1,lod,uvMode,building:b,batches:[...s.batches.values()],doorLeaves,fixedLeaves,roofProofs};
  const stats=meshStats(data);data.bounds=stats.bounds;data.metrics={triangles:stats.triangles,draws:stats.draws,
    rooms:b.floors.reduce((n,f)=>n+f.rooms.filter(r=>!r.omitSlab).length,0),windows:b.floors.reduce((n,f)=>n+f.walls.flatMap(w=>w.openings).filter(o=>o.type==='window'&&!o.continuation).length,0)};
  if(data.bounds.max[0]-data.bounds.min[0]>240||data.bounds.max[2]-data.bounds.min[2]>240)throw Error('Complete mesh bounds exceed the full map.');
  return data;
}
