// Original deterministic native-metre mesh recipes. No Three, DOM or donor art.
import {equipmentSpec,equipmentFinish,equipmentPose} from './specs.js';
import {equipmentPaintUV,MATERIAL_PAINT_REGION} from './paint-layout.js';
const TAU=Math.PI*2;
const unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const mul=(a,s)=>a.map(x=>x*s);
// Ear clipping preserves concave beards/hooks and the open chevron relief.
function triangulate(points){const remaining=points.map((_,i)=>i),out=[],turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let budget=points.length**2;
 while(remaining.length>3&&budget-->0){let clipped=false;for(let j=0;j<remaining.length;j++){const a=remaining[(j+remaining.length-1)%remaining.length],b=remaining[j],c=remaining[(j+1)%remaining.length];if(turn(points[a],points[b],points[c])<=1e-12)continue;const inside=remaining.some(k=>k!==a&&k!==b&&k!==c&&turn(points[a],points[b],points[k])>=-1e-12&&turn(points[b],points[c],points[k])>=-1e-12&&turn(points[c],points[a],points[k])>=-1e-12);if(inside)continue;out.push([a,b,c]);remaining.splice(j,1);clipped=true;break;}if(!clipped)throw Error('EQUIPMENT_OUTLINE: non-simple art outline.');}
 if(remaining.length===3)out.push(remaining.slice());return out;
}
export const PAINT_CELLS={steel:0,iron:1,wood:2,leather:3,brass:4,teal:5,cloth:6,red:7,glass:1};
export function buildEquipmentGeometry(id,{draw=0,loaded=false,finish='standard'}={}){
 const spec=equipmentSpec(id);equipmentFinish(spec,finish);if(spec.ranged)equipmentPose(spec,{draw,loaded});
 const batches=new Map(),anchors={};let part='static',skin=null,surface=null;
 function paint(name,fn){const previous=skin;skin=name;try{return fn();}finally{skin=previous;}}
 function faces(front,back,fn,bounds){const previous=surface;surface={front,back,bounds};try{return fn();}finally{surface=previous;}}
 function tri(material,a,b,c,ta=[0,0],tb=[1,0],tc=[1,1],normals){const normal=cross(sub(b,a),sub(c,a));if(Math.hypot(...normal)<1e-12)return;const key=part+'.'+material,region=skin||MATERIAL_PAINT_REGION[material];if(!batches.has(key))batches.set(key,{key,part,material,positions:[],normals:[],uvs:[],paintRegions:[]});const m=batches.get(key),n=unit(normal);if(!m.paintRegions.includes(region))m.paintRegions.push(region);[a,b,c].forEach((p,i)=>{m.positions.push(...p);m.normals.push(...(normals?.[i]||n));m.uvs.push(...equipmentPaintUV(region,[ta,tb,tc][i]));});}
 function quad(material,a,b,c,d,ta=[0,0],tb=[1,0],tc=[1,1],td=[0,1],normals){tri(material,a,b,c,ta,tb,tc,normals?.slice(0,3));tri(material,a,c,d,ta,tc,td,normals&&[normals[0],normals[2],normals[3]]);}
 function box(material,center,size){const [x,y,z]=center,[a,b,c]=size.map(x=>x/2);const v=[[-a,-b,-c],[a,-b,-c],[a,b,-c],[-a,b,-c],[-a,-b,c],[a,-b,c],[a,b,c],[-a,b,c]].map(p=>add(p,[x,y,z]));for(const f of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])quad(material,...f.map(i=>v[i]));}
 function rod(material,a,b,r0,r1=r0,n=12){const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[0,1,0])),v=cross(axis,u);for(let j=0;j<n;j++){const at=(t,r,theta)=>add(t,add(mul(u,Math.cos(theta)*r),mul(v,Math.sin(theta)*r))),t=j*TAU/n,s=(j+1)*TAU/n,p=at(a,r0,t),q=at(a,r0,s),r=at(b,r1,s),w=at(b,r1,t),ns=[t,s,s,t].map(theta=>unit(add(mul(u,Math.cos(theta)),mul(v,Math.sin(theta)))));quad(material,p,q,r,w,[j/n,1],[(j+1)/n,1],[(j+1)/n,0],[j/n,0],ns);tri(material,a,q,p);tri(material,b,w,r);}}
 function sphere(material,c,r,sy=1,n=20,rings=8,sz=1){for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const f=(t,p)=>add(c,[Math.sin(t)*Math.cos(p)*r,Math.cos(t)*r*sy,Math.sin(t)*Math.sin(p)*r*sz]),a=f(j*Math.PI/rings,i*TAU/n),b=f((j+1)*Math.PI/rings,i*TAU/n),d=f(j*Math.PI/rings,(i+1)*TAU/n),cc=f((j+1)*Math.PI/rings,(i+1)*TAU/n);quad(material,a,d,cc,b,[i/n,j/rings],[(i+1)/n,j/rings],[(i+1)/n,(j+1)/rings],[i/n,(j+1)/rings]);}}
 function ring(material,c,radius,tube,n=36,m=6){for(let i=0;i<n;i++)for(let j=0;j<m;j++){const f=(a,b)=>add(c,[(radius+tube*Math.cos(b))*Math.cos(a),(radius+tube*Math.cos(b))*Math.sin(a),tube*Math.sin(b)]);quad(material,f(i*TAU/n,j*TAU/m),f((i+1)*TAU/n,j*TAU/m),f((i+1)*TAU/n,(j+1)*TAU/m),f(i*TAU/n,(j+1)*TAU/m));}}
 // Rounded extruded outline with a real forged bevel, optionally bowed in +Z.
 function plate(material,outline,thickness=.035,bevel=.008,center=[0,0,0],edge='steel',bow=0){if(outline.reduce((a,p,i)=>a+p[0]*outline[(i+1)%outline.length][1]-outline[(i+1)%outline.length][0]*p[1],0)<0)outline=outline.slice().reverse();const n=outline.length,c=outline.reduce((a,b)=>[a[0]+b[0]/n,a[1]+b[1]/n],[0,0]),lo=surface?.bounds?.slice(0,2)||[Math.min(...outline.map(p=>p[0])),Math.min(...outline.map(p=>p[1]))],hi=surface?.bounds?.slice(2)||[Math.max(...outline.map(p=>p[0])),Math.max(...outline.map(p=>p[1]))],p=(i,z,inner=false)=>{const a=outline[(i+n)%n],v=sub(a,c),l=Math.hypot(...v)||1;const x=a[0]-(inner?v[0]/l*bevel:0),y=a[1]-(inner?v[1]/l*bevel:0);return add([x,y,z+bow*(1-Math.min(1,(x/.4)**2))],center);},uvp=v=>[(v[0]-lo[0])/(hi[0]-lo[0]),1-(v[1]-lo[1])/(hi[1]-lo[1])];for(const [a,b,cc] of triangulate(outline)){paint(surface?.front||skin||MATERIAL_PAINT_REGION[material],()=>tri(material,p(a,thickness/2,true),p(b,thickness/2,true),p(cc,thickness/2,true),uvp(outline[a]),uvp(outline[b]),uvp(outline[cc])));paint(surface?.back||skin||MATERIAL_PAINT_REGION[material],()=>tri(material,p(cc,-thickness/2,true),p(b,-thickness/2,true),p(a,-thickness/2,true),uvp(outline[cc]),uvp(outline[b]),uvp(outline[a])));}for(let i=0;i<n;i++){const k=(i+1)%n;quad(edge,p(i,0),p(k,0),p(k,thickness/2,true),p(i,thickness/2,true));quad(edge,p(k,0),p(i,0),p(i,-thickness/2,true),p(k,-thickness/2,true));}}
 function blade(y0,tip,width,{leaf=false}={}){const ys=[y0,y0+.055,y0+(tip-y0)*.32,tip-.105,tip],ws=[width*.82,width,leaf?width*1.22:width*.94,width*.45,.0008],maximum=Math.max(...ws),uv=p=>[(p[0]+maximum)/(maximum*2),1-(p[1]-y0)/(tip-y0)];for(let j=0;j<ys.length-1;j++){const section=(k)=>{const t=Math.min(1,ws[k]/width/.7);return [[-ws[k],ys[k],0],[-ws[k]*.68,ys[k],.009*t],[0,ys[k],.017*t],[ws[k]*.68,ys[k],.009*t],[ws[k],ys[k],0],[ws[k]*.68,ys[k],-.009*t],[0,ys[k],-.017*t],[-ws[k]*.68,ys[k],-.009*t]];};const a=section(j),b=section(j+1);for(let i=0;i<8;i++){const k=(i+1)%8;paint(i<4?'front':'back',()=>quad('steel',a[i],a[k],b[k],b[i],uv(a[i]),uv(a[k]),uv(b[k]),uv(b[i])));}}}
 // Smooth functional grasp; all wrap ridges/stitches/collars are in the skin.
 function grip(y0,y1,r=.022){rod('leather',[0,y0,0],[0,y1,0],r,r*.96,12);}
 function gripBack(){for(const x of [-.065,.065]){box('iron',[x,0,.075],[.018,.07,.068]);rod('iron',[x,0,.063],[x*.846,0,0],.012);}rod('leather',[-.055,0,0],[.055,0,0],.017,.017,16);}
 function armBack(){paint('pad',()=>box('leather',[0,-.16,.09],[.20,.15,.025]));rod('leather',[-.09,-.16,.09],[-.09,-.16,-.035],.018);rod('leather',[.09,-.16,.09],[.09,-.16,-.035],.018);rod('leather',[-.09,-.16,-.035],[.09,-.16,-.035],.016);}
 function arrow(crossbow=false){part='projectile';const length=crossbow?.58:.72;rod('wood',[0,0,0],[0,0,length-.055],crossbow?.0048:.0038,crossbow?.0048:.0038,8);rod('iron',[0,0,length-.065],[0,0,length],.012,.0003,8);for(let i=0;i<3;i++){const a=i*TAU/3,u=[Math.cos(a)*.020,Math.sin(a)*.020,0];quad('cloth',[0,0,.025],add(u,[0,0,.035]),add(u,[0,0,.12]),[0,0,.145]);}part='static';}
 function bentLimb(name,points,width,depth,material='wood'){part=name;const frames=points.map((p,i)=>{const tangent=unit(sub(points[Math.min(points.length-1,i+1)],points[Math.max(0,i-1)])),side=unit(cross(tangent,[0,0,1]));const w=width*(1-.60*i/(points.length-1));return [add(p,add(mul(side,-w/2),[0,0,-depth/2])),add(p,add(mul(side,w/2),[0,0,-depth/2])),add(p,add(mul(side,w/2),[0,0,depth/2])),add(p,add(mul(side,-w/2),[0,0,depth/2]))];});for(let i=0;i<frames.length-1;i++)for(let k=0;k<4;k++)quad(k===0?'iron':material,frames[i][k],frames[i+1][k],frames[i+1][(k+1)%4],frames[i][(k+1)%4],[0,name==='limb.upper'?1-i/(frames.length-1):i/(frames.length-1)],[0,name==='limb.upper'?1-(i+1)/(frames.length-1):(i+1)/(frames.length-1)],[1,name==='limb.upper'?1-(i+1)/(frames.length-1):(i+1)/(frames.length-1)],[1,name==='limb.upper'?1-i/(frames.length-1):i/(frames.length-1)]);quad('iron',...frames[0]);quad('iron',...frames.at(-1).slice().reverse());part='static';}

 if(['knife','short-sword','sword'].includes(id)){
  const knife=id==='knife',short=id==='short-sword',tip=knife?.32:short?.67:1.02,width=knife?.023:short?.043:.037;
  blade(.105,tip,width,{leaf:short,groove:!knife});grip(knife?-.065:-.095,.077,knife?.018:.022);
  if(knife){plate('iron',[[-.045,.077],[.045,.077],[.041,.099],[-.04,.099]],.028,.006);plate('wood',[[-.020,-.10],[.020,-.10],[.020,-.071],[-.020,-.071]],.034,.003);}
  else{plate('iron',[[-(short?.105:.15),.058],[-.025,.087],[.025,.087],[(short?.105:.15),.058],[(short?.108:.153),.087],[.027,.116],[-.027,.116],[-(short?.108:.153),.087]],.032,.009);rod('brass',[0,.073,0],[0,.109,0],.028,.027);sphere('iron',[0,-.127,0],short?.032:.038,1,12,5);}
 }
 if(['axe','pick','blacksmith-hammer'].includes(id)){
  const axe=id==='axe',pick=id==='pick',bottom=axe?-.13:pick?-.35:-.39,top=axe?.69:pick?.79:.78;
  rod('wood',[0,bottom,0],[0,top,0],axe?.024:.027,axe?.019:.024,16);grip(bottom+.02,.13,axe?.025:.028);
  if(axe){faces('front','back',()=>plate('iron',[[-.07,.61],[-.035,.70],[.08,.70],[.213,.768],[.251,.72],[.267,.63],[.247,.47],[.19,.38],[.16,.53],[.06,.58]],.065,.019,[0,0,0],'steel'));rod('iron',[0,.58,0],[0,.71,0],.041,.037,12);}
  else if(pick){faces('front','back',()=>plate('iron',[[-.40,.61],[-.30,.72],[-.12,.80],[.09,.80],[.13,.765],[.235,.765],[.257,.735],[.24,.704],[.09,.707],[-.10,.729],[-.25,.684]],.062,.012));rod('iron',[0,.68,0],[0,.82,0],.046,.039,12);box('steel',[.247,.736,0],[.025,.071,.075]);}
  else{paint('front',()=>{rod('iron',[-.21,.735,0],[.21,.735,0],.103,.103,8);rod('steel',[-.235,.735,0],[-.198,.735,0],.086,.103,8);rod('steel',[.198,.735,0],[.235,.735,0],.103,.086,8);});rod('iron',[0,.65,0],[0,.845,0],.050,.045,12);box('wood',[0,.838,0],[.044,.013,.027]);}
  rod('iron',[0,top-.21,0],[0,top-.17,0],.031,.032);
 }
 if(id==='mace'){
  rod('iron',[0,-.13,0],[0,.68,0],.018,.023,16);grip(-.10,.105,.023);sphere('iron',[0,-.135,0],.033,.8,16,6);rod('brass',[0,.375,0],[0,.405,0],.039,.043);rod('iron',[0,.405,0],[0,.66,0],.039,.025,16);
  const outline=[[.03,.405],[.095,.438],[.119,.53],[.091,.62],[.028,.665]];
  for(let i=0;i<6;i++){const angle=i*TAU/6,c=Math.cos(angle),s=Math.sin(angle),saved=part;part='flange-'+i;faces('front','back',()=>plate('steel',outline,.014,.006));const list=[...batches.values()].filter(x=>x.part===part);for(const m of list)for(let k=0;k<m.positions.length;k+=3){const x=m.positions[k],z=m.positions[k+2];m.positions[k]=x*c-z*s;m.positions[k+2]=x*s+z*c;const nx=m.normals[k],nz=m.normals[k+2];m.normals[k]=nx*c-nz*s;m.normals[k+2]=nx*s+nz*c;}part=saved;}
  sphere('brass',[0,.671,0],.024,.7,12,4);
 }
 if(id==='spear'||id==='halberd'){
  const halberd=id==='halberd',bottom=halberd?-.90:-.85,shaftTop=halberd?1.18:1.12;
  rod('wood',[0,bottom+.055,0],[0,shaftTop,0],.023,.019,16);rod('iron',[0,bottom,0],[0,bottom+.11,0],.012,.025);grip(-.09,.12,.024);grip(.35,.51,.023);
  rod('iron',[0,shaftTop-.13,0],[0,shaftTop+.025,0],.027,.022,16);
  if(!halberd)blade(1.10,1.40,.049,{leaf:true});
  else{blade(1.16,1.46,.028);faces('aux','aux',()=>plate('iron',[[.015,1.02],[.08,1.11],[.21,1.22],[.275,1.15],[.29,1.04],[.267,.915],[.22,.84],[.18,.95],[.07,1.0]],.040,.014));faces('pad','pad',()=>plate('iron',[[-.025,1.16],[-.11,1.18],[-.23,1.16],[-.28,1.08],[-.23,1.095],[-.17,1.115],[-.03,1.11]],.032,.008));}
 }
 if(id==='bow'){
  paint('shaft',()=>plate('wood',[[-.025,-.14],[.025,-.14],[.037,-.06],[.026,.05],[.010,.071],[-.008,.078],[-.008,.125],[.030,.142],[.020,.17],[-.019,.16],[-.034,.08],[-.035,-.06]],.045,.005));grip(-.065,.055,.025);box('iron',[-.004,.100,-.005],[.030,.013,.045]);
  const points=sign=>Array.from({length:17},(_,i)=>{const t=i/16;return [0,sign*(.13+.59*t-.06*draw*t*t),-.025-.16*Math.sin(t*Math.PI/2)+.068*t**8-draw*.13*Math.sin(t*Math.PI/2)];});
  const upper=points(1),lower=points(-1),nock=[0,.11,-.15-.43*draw];paint('front',()=>bentLimb('limb.upper',upper,.047,.025));paint('back',()=>bentLimb('limb.lower',lower,.047,.025));
  for(const [name,points] of [['upper',upper],['lower',lower]]){part='string.'+name;rod('cloth',points.at(-1),nock,.0016,.0016,6);part='static';anchors['limb.'+name]=points.at(-1);}
  arrow();anchors['string.nock']=nock;anchors['projectile.nock']=nock;anchors['projectile.tip']=add(nock,[0,0,.72]);
 }
 if(id==='crossbow'){
  // Stock is made from tapering sections instead of a rectangular toy block.
  const sections=[[-.43,.05,.052],[-.31,.07,.050],[-.16,.032,.045],[.05,.035,.048],[.44,.028,.038],[.63,.025,.025]];
  for(let i=0;i<sections.length-1;i++){const [z,w,h]=sections[i],[z1,w1,h1]=sections[i+1],v=[[ -w,.11-h,z],[w,.11-h,z],[w,.11+h,z],[-w,.11+h,z]],u=[[-w1,.11-h1,z1],[w1,.11-h1,z1],[w1,.11+h1,z1],[-w1,.11+h1,z1]];for(let k=0;k<4;k++)paint(k===2?'aux':'shaft',()=>quad('wood',v[k],v[(k+1)%4],u[(k+1)%4],u[k]));if(i===0)quad('wood',...v.slice().reverse());if(i===sections.length-2)quad('wood',...u);}
  for(const x of [-.009,.009])box('iron',[x,.17,.25],[.006,.020,.73]);for(const x of [-.016,.016])box('brass',[x,.16,.20],[.007,.010,.56]);rod('leather',[0,-.055,-.01],[0,.09,.03],.028,.033,12);plate('iron',[[-.04,.058],[.035,.058],[.045,-.03],[.021,-.070],[-.038,-.060]],.014,.007,[0,0,.015]);rod('iron',[0,.08,.02],[0,.003,.065],.009);for(const x of [-.047,.047])box('iron',[x,.16,.54],[.055,.08,.11]);box('iron',[0,.105,.54],[.15,.025,.11]);
  const points=sign=>Array.from({length:15},(_,i)=>{const t=i/14;return [sign*(.04+.39*t-.035*draw*t*t),.15,.56-.10*Math.sin(t*Math.PI/2)-.055*draw*Math.sin(t*Math.PI/2)];});const left=points(-1),right=points(1),nock=[0,.18,.415-.255*draw];paint('front',()=>bentLimb('limb.left',left,.046,.022,'iron'));paint('back',()=>bentLimb('limb.right',right,.046,.022,'iron'));for(const [name,points] of [['left',left],['right',right]]){part='string.'+name;rod('cloth',points.at(-1),nock,.002,.002,6);part='static';anchors['limb.'+name]=points.at(-1);}
  rod('iron',[-.065,.13,.59],[-.065,.13,.75],.009);rod('iron',[.065,.13,.59],[.065,.13,.75],.009);rod('iron',[-.065,.13,.75],[.065,.13,.75],.009);box('leather',[0,.085,-.426],[.108,.105,.02]);arrow(true);anchors['string.nock']=nock;anchors['projectile.nock']=nock;anchors['projectile.tip']=add(nock,[0,0,.58]);
 }
 if(id==='round-wood-shield'){
  const outline=Array.from({length:48},(_,i)=>[Math.cos(i*TAU/48)*.34,Math.sin(i*TAU/48)*.34]);
  faces('front','back',()=>plate('wood',outline,.033,.002,[0,0,.105],'iron',.018));
  ring('iron',[0,0,.12],.338,.014,48,6);rod('iron',[0,0,.117],[0,0,.151],.095,.080,20);sphere('iron',[0,0,.151],.080,1,20,6,.52);
  // Board seams, rear braces and rim fasteners live solely in front/back skins.
  gripBack();
 }
 if(id==='emblem-metal-shield'){
  const outline=[[-.222,.305],[.222,.305],[.220,.055],[.175,-.115],[0,-.305],[-.175,-.115],[-.220,.055]];
  faces('front','back',()=>plate('iron',outline,.040,.012,[0,0,.105],'brass',.026));
  // Gold sun/chevron, bevel highlights and every decorative fastener are paint.
  gripBack();armBack();
 }
 if(id==='tower-shield'){
  const outline=[[-.31,-.49],[.31,-.49],[.31,.64],[.27,.74],[.15,.80],[-.15,.80],[-.27,.74],[-.31,.64]];
  faces('front','back',()=>plate('wood',outline,.052,.012,[0,0,.100],'iron',.035));
  // The pavise centre rib affects form; planks, braces, nails and trim do not.
  paint('aux',()=>rod('wood',[0,-.47,.192],[0,.755,.192],.022,.019,12));gripBack();armBack();
 }
 if(id==='riot-shield'){
  const outline=[[-.28,-.46],[.28,-.46],[.30,-.40],[.30,.61],[.25,.69],[-.25,.69],[-.30,.61],[-.30,-.40]];
  if(finish==='opaque'){faces('front','back',()=>{plate('iron',[[-.28,-.46],[.28,-.46],[.30,-.40],[.30,.36],[-.30,.36],[-.30,-.40]],.012,.004,[0,0,.123],'iron',.025);plate('iron',[[-.30,.52],[.30,.52],[.30,.61],[.25,.69],[-.25,.69],[-.30,.61]],.012,.004,[0,0,.123],'iron',.025);},[-.30,-.46,.30,.69]);for(const x of [-.255,.255])box('iron',[x,.44,.136],[.09,.16,.012]);plate('glass',[[-.21,.36],[.21,.36],[.21,.52],[-.21,.52]],.010,.002,[0,0,.126],'glass',.025);}else faces('front','back',()=>plate('glass',outline,.012,.004,[0,0,.123],'glass',.025));
  for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];rod('iron',[a[0],a[1],.125],[b[0],b[1],.125],.010,.010,8);}
  box('iron',[0,-.37,.145],[.54,.105,.014]);box('iron',[0,.57,.143],[.51,.043,.014]);gripBack();armBack();
 }
 anchors['grip.main']=[0,0,0];if(spec.off)anchors['grip.off']=spec.off.slice();if(id==='bow')anchors['grip.off']=anchors['string.nock'].slice();for(const [key,value] of Object.entries(spec.surfaces))anchors[key]=value.slice();
 // Fold rotationally authored flanges back into static material batches.
 for(const [key,m] of [...batches])if(m.part.startsWith('flange-')){const target='static.'+m.material;if(!batches.has(target))batches.set(target,{key:target,part:'static',material:m.material,positions:[],normals:[],uvs:[],paintRegions:[]});const n=batches.get(target);for(const field of ['positions','normals','uvs'])n[field].push(...m[field]);for(const region of m.paintRegions)if(!n.paintRegions.includes(region))n.paintRegions.push(region);batches.delete(key);}
 return {batches:[...batches.values()],anchors,projectilePosition:anchors['projectile.nock']||null,loaded};
}
export function equipmentGeometryBounds(geometry,{includeHidden=true}={}){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const m of geometry.batches){if(m.part==='projectile'&&!includeHidden&&!geometry.loaded)continue;const t=m.part==='projectile'?geometry.projectilePosition:[0,0,0];for(let i=0;i<m.positions.length;i+=3)for(let k=0;k<3;k++){const n=m.positions[i+k]+t[k];min[k]=Math.min(min[k],n);max[k]=Math.max(max[k],n);}}return {min,max};
}
