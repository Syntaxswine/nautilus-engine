// Original deterministic native-metre mesh recipes. No Three, DOM or donor art.
import {equipmentSpec,equipmentFinish,equipmentPose} from './specs.js';
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
 const batches=new Map(),anchors={};let part='static';
 function uv(material,p){const cell=PAINT_CELLS[material],x=cell%4,y=Math.floor(cell/4);return [(x+.045+.91*p[0])/4,1-(y+.045+.91*p[1])/2];}
 function tri(material,a,b,c,ta=[0,0],tb=[1,0],tc=[1,1],normals){const normal=cross(sub(b,a),sub(c,a));if(Math.hypot(...normal)<1e-12)return;const key=part+'.'+material;if(!batches.has(key))batches.set(key,{key,part,material,positions:[],normals:[],uvs:[]});const m=batches.get(key),n=unit(normal);[a,b,c].forEach((p,i)=>{m.positions.push(...p);m.normals.push(...(normals?.[i]||n));m.uvs.push(...uv(material,[ta,tb,tc][i]));});}
 function quad(material,a,b,c,d,ta=[0,0],tb=[1,0],tc=[1,1],td=[0,1],normals){tri(material,a,b,c,ta,tb,tc,normals?.slice(0,3));tri(material,a,c,d,ta,tc,td,normals&&[normals[0],normals[2],normals[3]]);}
 function box(material,center,size){const [x,y,z]=center,[a,b,c]=size.map(x=>x/2);const v=[[-a,-b,-c],[a,-b,-c],[a,b,-c],[-a,b,-c],[-a,-b,c],[a,-b,c],[a,b,c],[-a,b,c]].map(p=>add(p,[x,y,z]));for(const f of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])quad(material,...f.map(i=>v[i]));}
 function rod(material,a,b,r0,r1=r0,n=12){const axis=unit(sub(b,a)),u=unit(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[0,1,0])),v=cross(axis,u);for(let j=0;j<n;j++){const at=(t,r,theta)=>add(t,add(mul(u,Math.cos(theta)*r),mul(v,Math.sin(theta)*r))),t=j*TAU/n,s=(j+1)*TAU/n,p=at(a,r0,t),q=at(a,r0,s),r=at(b,r1,s),w=at(b,r1,t),ns=[t,s,s,t].map(theta=>unit(add(mul(u,Math.cos(theta)),mul(v,Math.sin(theta)))));quad(material,p,q,r,w,[j/n,0],[(j+1)/n,0],[(j+1)/n,1],[j/n,1],ns);tri(material,a,q,p);tri(material,b,w,r);}}
 function sphere(material,c,r,sy=1,n=20,rings=8,sz=1){for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const f=(t,p)=>add(c,[Math.sin(t)*Math.cos(p)*r,Math.cos(t)*r*sy,Math.sin(t)*Math.sin(p)*r*sz]),a=f(j*Math.PI/rings,i*TAU/n),b=f((j+1)*Math.PI/rings,i*TAU/n),d=f(j*Math.PI/rings,(i+1)*TAU/n),cc=f((j+1)*Math.PI/rings,(i+1)*TAU/n);quad(material,a,d,cc,b,[i/n,j/rings],[(i+1)/n,j/rings],[(i+1)/n,(j+1)/rings],[i/n,(j+1)/rings]);}}
 function ring(material,c,radius,tube,n=36,m=6){for(let i=0;i<n;i++)for(let j=0;j<m;j++){const f=(a,b)=>add(c,[(radius+tube*Math.cos(b))*Math.cos(a),(radius+tube*Math.cos(b))*Math.sin(a),tube*Math.sin(b)]);quad(material,f(i*TAU/n,j*TAU/m),f((i+1)*TAU/n,j*TAU/m),f((i+1)*TAU/n,(j+1)*TAU/m),f(i*TAU/n,(j+1)*TAU/m));}}
 // Rounded extruded outline with a real forged bevel, optionally bowed in +Z.
 function plate(material,outline,thickness=.035,bevel=.008,center=[0,0,0],edge='steel',bow=0){if(outline.reduce((a,p,i)=>a+p[0]*outline[(i+1)%outline.length][1]-outline[(i+1)%outline.length][0]*p[1],0)<0)outline=outline.slice().reverse();const n=outline.length,c=outline.reduce((a,b)=>[a[0]+b[0]/n,a[1]+b[1]/n],[0,0]),lo=[Math.min(...outline.map(p=>p[0])),Math.min(...outline.map(p=>p[1]))],hi=[Math.max(...outline.map(p=>p[0])),Math.max(...outline.map(p=>p[1]))],p=(i,z,inner=false)=>{const a=outline[(i+n)%n],v=sub(a,c),l=Math.hypot(...v)||1;const x=a[0]-(inner?v[0]/l*bevel:0),y=a[1]-(inner?v[1]/l*bevel:0);return add([x,y,z+bow*(1-Math.min(1,(x/.4)**2))],center);},uvp=v=>[(v[0]-lo[0])/(hi[0]-lo[0]),1-(v[1]-lo[1])/(hi[1]-lo[1])];for(const [a,b,cc] of triangulate(outline)){tri(material,p(a,thickness/2,true),p(b,thickness/2,true),p(cc,thickness/2,true),uvp(outline[a]),uvp(outline[b]),uvp(outline[cc]));tri(material,p(cc,-thickness/2,true),p(b,-thickness/2,true),p(a,-thickness/2,true),uvp(outline[cc]),uvp(outline[b]),uvp(outline[a]));}for(let i=0;i<n;i++){const k=(i+1)%n;quad(edge,p(i,0),p(k,0),p(k,thickness/2,true),p(i,thickness/2,true));quad(edge,p(k,0),p(i,0),p(i,-thickness/2,true),p(k,-thickness/2,true));}}
 function blade(y0,tip,width,{leaf=false,groove=false}={}){const ys=[y0,y0+.055,y0+(tip-y0)*.32,tip-.105,tip],ws=[width*.82,width,leaf?width*1.22:width*.94,width*.45,.0008];for(let j=0;j<ys.length-1;j++){const section=(k)=>{const t=Math.min(1,ws[k]/width/.7);return [[-ws[k],ys[k],0],[-ws[k]*.68,ys[k],.009*t],[0,ys[k],.017*t],[ws[k]*.68,ys[k],.009*t],[ws[k],ys[k],0],[ws[k]*.68,ys[k],-.009*t],[0,ys[k],-.017*t],[-ws[k]*.68,ys[k],-.009*t]];};const a=section(j),b=section(j+1);for(let i=0;i<8;i++){const k=(i+1)%8;quad('steel',a[i],a[k],b[k],b[i],[i/8,j/4],[(i+1)/8,j/4],[(i+1)/8,(j+1)/4],[i/8,(j+1)/4]);}}if(groove){for(const z of [-.0175,.0175])plate('iron',[[-.004,y0+.1],[.004,y0+.1],[.003,tip-.18],[0,tip-.13],[-.003,tip-.18]],.0007,.0001,[0,0,z],'iron');}}
 function grip(y0,y1,r=.022){rod('leather',[0,y0,0],[0,y1,0],r,r*.96,16);const count=Math.ceil((y1-y0)/.018);for(let i=0;i<count;i++){const y=y0+(i+.5)*(y1-y0)/count;rod('leather',[0,y-.002,0],[0,y+.002,0],r*1.035,r*1.03,16);}rod('brass',[0,y0-.008,0],[0,y0+.004,0],r*1.12);rod('brass',[0,y1-.004,0],[0,y1+.008,0],r*1.12);}
 function rivet(x,y,z,r=.008){rod('iron',[x,y,z-.006],[x,y,z],r,r,10);sphere('steel',[x,y,z],r,.48,10,4);}
 function gripBack(){for(const x of [-.065,.065]){box('iron',[x,0,.075],[.018,.07,.068]);rod('iron',[x,0,.063],[x*.846,0,0],.012);}rod('leather',[-.055,0,0],[.055,0,0],.017,.017,16);}
 function armBack(){box('leather',[0,-.16,.09],[.20,.15,.025]);rod('leather',[-.09,-.16,.09],[-.09,-.16,-.035],.018);rod('leather',[.09,-.16,.09],[.09,-.16,-.035],.018);rod('leather',[-.09,-.16,-.035],[.09,-.16,-.035],.016);box('brass',[.075,-.16,-.04],[.035,.043,.008]);}
 function arrow(crossbow=false){part='projectile';const length=crossbow?.58:.72;rod('wood',[0,0,0],[0,0,length-.055],crossbow?.0048:.0038,crossbow?.0048:.0038,8);rod('iron',[0,0,length-.065],[0,0,length],.012,.0003,8);for(let i=0;i<3;i++){const a=i*TAU/3,u=[Math.cos(a)*.020,Math.sin(a)*.020,0];quad('cloth',[0,0,.025],add(u,[0,0,.035]),add(u,[0,0,.12]),[0,0,.145]);}part='static';}
 function bentLimb(name,points,width,depth,material='wood'){part=name;const frames=points.map((p,i)=>{const tangent=unit(sub(points[Math.min(points.length-1,i+1)],points[Math.max(0,i-1)])),side=unit(cross(tangent,[0,0,1]));const w=width*(1-.60*i/(points.length-1));return [add(p,add(mul(side,-w/2),[0,0,-depth/2])),add(p,add(mul(side,w/2),[0,0,-depth/2])),add(p,add(mul(side,w/2),[0,0,depth/2])),add(p,add(mul(side,-w/2),[0,0,depth/2]))];});for(let i=0;i<frames.length-1;i++)for(let k=0;k<4;k++)quad(k===0?'iron':material,frames[i][k],frames[i+1][k],frames[i+1][(k+1)%4],frames[i][(k+1)%4],[k/4,i/(frames.length-1)],[k/4,(i+1)/(frames.length-1)],[(k+1)/4,(i+1)/(frames.length-1)],[(k+1)/4,i/(frames.length-1)]);quad('iron',...frames[0]);quad('iron',...frames.at(-1).slice().reverse());part='static';}

 if(['knife','short-sword','sword'].includes(id)){
  const knife=id==='knife',short=id==='short-sword',tip=knife?.32:short?.67:1.02,width=knife?.023:short?.043:.037;
  blade(.105,tip,width,{leaf:short,groove:!knife});grip(knife?-.065:-.095,.077,knife?.018:.022);
  if(knife){plate('iron',[[-.045,.077],[.045,.077],[.041,.099],[-.04,.099]],.028,.006);plate('wood',[[-.020,-.10],[.020,-.10],[.020,-.071],[-.020,-.071]],.034,.003);}
  else{plate('iron',[[-(short?.105:.15),.058],[-.025,.087],[.025,.087],[(short?.105:.15),.058],[(short?.108:.153),.087],[.027,.116],[-.027,.116],[-(short?.108:.153),.087]],.032,.009);rod('brass',[0,.073,0],[0,.109,0],.028,.027);sphere('iron',[0,-.127,0],short?.032:.038,1,16,6);sphere('brass',[0,-.128,.028],.012,.7,12,4);}
 }
 if(['axe','pick','blacksmith-hammer'].includes(id)){
  const axe=id==='axe',pick=id==='pick',bottom=axe?-.13:pick?-.35:-.39,top=axe?.69:pick?.79:.78;
  rod('wood',[0,bottom,0],[0,top,0],axe?.024:.027,axe?.019:.024,16);grip(bottom+.02,.13,axe?.025:.028);
  if(axe){plate('iron',[[-.07,.61],[-.035,.70],[.08,.70],[.213,.768],[.251,.72],[.267,.63],[.247,.47],[.19,.38],[.16,.53],[.06,.58]],.065,.019,[0,0,0],'steel');rod('iron',[0,.58,0],[0,.71,0],.041,.037,16);plate('steel',[[.213,.762],[.25,.713],[.261,.629],[.241,.48],[.194,.39],[.187,.443],[.211,.52],[.226,.63],[.217,.716]],.004,.0001,[0,0,.026]);}
  else if(pick){plate('iron',[[-.40,.61],[-.30,.72],[-.12,.80],[.09,.80],[.13,.765],[.235,.765],[.257,.735],[.24,.704],[.09,.707],[-.10,.729],[-.25,.684]],.062,.012);rod('iron',[0,.68,0],[0,.82,0],.046,.039,16);plate('steel',[[-.40,.61],[-.29,.707],[-.16,.755],[-.12,.767],[-.23,.732]],.002,.0001,[0,0,.031]);box('steel',[.247,.736,0],[.025,.071,.075]);}
  else{rod('iron',[-.21,.735,0],[.21,.735,0],.103,.103,8);rod('steel',[-.235,.735,0],[-.198,.735,0],.086,.103,8);rod('steel',[.198,.735,0],[.235,.735,0],.103,.086,8);rod('iron',[0,.65,0],[0,.845,0],.050,.045,12);box('wood',[0,.838,0],[.044,.013,.027]);}
  rod('iron',[0,top-.21,0],[0,top-.17,0],.031,.032);rivet(0,top-.1,.047,.007);
 }
 if(id==='mace'){
  rod('iron',[0,-.13,0],[0,.68,0],.018,.023,16);grip(-.10,.105,.023);sphere('iron',[0,-.135,0],.033,.8,16,6);rod('brass',[0,.375,0],[0,.405,0],.039,.043);rod('iron',[0,.405,0],[0,.66,0],.039,.025,16);
  const outline=[[.03,.405],[.095,.438],[.119,.53],[.091,.62],[.028,.665]];
  for(let i=0;i<6;i++){const angle=i*TAU/6,c=Math.cos(angle),s=Math.sin(angle),saved=part;part='flange-'+i;plate('steel',outline,.014,.006);const list=[...batches.values()].filter(x=>x.part===part);for(const m of list)for(let k=0;k<m.positions.length;k+=3){const x=m.positions[k],z=m.positions[k+2];m.positions[k]=x*c-z*s;m.positions[k+2]=x*s+z*c;const nx=m.normals[k],nz=m.normals[k+2];m.normals[k]=nx*c-nz*s;m.normals[k+2]=nx*s+nz*c;}part=saved;}
  sphere('brass',[0,.671,0],.024,.7,12,4);
 }
 if(id==='spear'||id==='halberd'){
  const halberd=id==='halberd',bottom=halberd?-.90:-.85,shaftTop=halberd?1.18:1.12;
  rod('wood',[0,bottom+.055,0],[0,shaftTop,0],.023,.019,16);rod('iron',[0,bottom,0],[0,bottom+.11,0],.012,.025);grip(-.09,.12,.024);grip(.35,.51,.023);
  rod('iron',[0,shaftTop-.13,0],[0,shaftTop+.025,0],.027,.022,16);
  if(!halberd){blade(1.10,1.40,.049,{leaf:true});for(const z of [-.023,.023])plate('iron',[[-.008,.90],[.008,.90],[.008,1.13],[-.008,1.13]],.006,.001,[0,0,z]);}
  else{blade(1.16,1.46,.028);plate('iron',[[.015,1.02],[.08,1.11],[.21,1.22],[.275,1.15],[.29,1.04],[.267,.915],[.22,.84],[.18,.95],[.07,1.0]],.040,.014);plate('steel',[[.21,1.215],[.27,1.148],[.284,1.039],[.26,.92],[.222,.851],[.22,.896],[.24,.966],[.253,1.04],[.246,1.128]],.005,.001,[0,0,.016]);plate('iron',[[-.025,1.16],[-.11,1.18],[-.23,1.16],[-.28,1.08],[-.23,1.095],[-.17,1.115],[-.03,1.11]],.032,.008);for(const z of [-.025,.025])plate('iron',[[-.013,.77],[.013,.77],[.017,1.19],[-.017,1.19]],.008,.002,[0,0,z]);for(const y of [.81,.95,1.08])rivet(0,y,.033,.007);}
 }
 if(id==='bow'){
  plate('wood',[[-.025,-.14],[.025,-.14],[.037,-.06],[.026,.05],[.010,.071],[-.008,.078],[-.008,.125],[.030,.142],[.020,.17],[-.019,.16],[-.034,.08],[-.035,-.06]],.045,.005);grip(-.065,.055,.025);box('iron',[-.004,.100,-.005],[.030,.013,.045]);
  const points=sign=>Array.from({length:17},(_,i)=>{const t=i/16;return [0,sign*(.13+.59*t-.06*draw*t*t),-.025-.16*Math.sin(t*Math.PI/2)+.068*t**8-draw*.13*Math.sin(t*Math.PI/2)];});
  const upper=points(1),lower=points(-1),nock=[0,.11,-.15-.43*draw];bentLimb('limb.upper',upper,.047,.025);bentLimb('limb.lower',lower,.047,.025);
  for(const [name,points] of [['upper',upper],['lower',lower]]){part='string.'+name;rod('cloth',points.at(-1),nock,.0016,.0016,6);part='static';anchors['limb.'+name]=points.at(-1);}
  arrow();anchors['string.nock']=nock;anchors['projectile.nock']=nock;anchors['projectile.tip']=add(nock,[0,0,.72]);
 }
 if(id==='crossbow'){
  // Stock is made from tapering sections instead of a rectangular toy block.
  const sections=[[-.43,.05,.052],[-.31,.07,.050],[-.16,.032,.045],[.05,.035,.048],[.44,.028,.038],[.63,.025,.025]];
  for(let i=0;i<sections.length-1;i++){const [z,w,h]=sections[i],[z1,w1,h1]=sections[i+1],v=[[ -w,.11-h,z],[w,.11-h,z],[w,.11+h,z],[-w,.11+h,z]],u=[[-w1,.11-h1,z1],[w1,.11-h1,z1],[w1,.11+h1,z1],[-w1,.11+h1,z1]];for(let k=0;k<4;k++)quad('wood',v[k],v[(k+1)%4],u[(k+1)%4],u[k]);if(i===0)quad('wood',...v.slice().reverse());if(i===sections.length-2)quad('wood',...u);}
  for(const x of [-.009,.009])box('iron',[x,.17,.25],[.006,.020,.73]);for(const x of [-.016,.016])box('brass',[x,.16,.20],[.007,.010,.56]);rod('leather',[0,-.055,-.01],[0,.09,.03],.028,.033,12);plate('iron',[[-.04,.058],[.035,.058],[.045,-.03],[.021,-.070],[-.038,-.060]],.014,.007,[0,0,.015]);rod('iron',[0,.08,.02],[0,.003,.065],.009);for(const x of [-.047,.047])box('iron',[x,.16,.54],[.055,.08,.11]);box('iron',[0,.105,.54],[.15,.025,.11]);
  const points=sign=>Array.from({length:15},(_,i)=>{const t=i/14;return [sign*(.04+.39*t-.035*draw*t*t),.15,.56-.10*Math.sin(t*Math.PI/2)-.055*draw*Math.sin(t*Math.PI/2)];});const left=points(-1),right=points(1),nock=[0,.18,.415-.255*draw];bentLimb('limb.left',left,.046,.022,'iron');bentLimb('limb.right',right,.046,.022,'iron');for(const [name,points] of [['left',left],['right',right]]){part='string.'+name;rod('cloth',points.at(-1),nock,.002,.002,6);part='static';anchors['limb.'+name]=points.at(-1);}
  rod('iron',[-.065,.13,.59],[-.065,.13,.75],.009);rod('iron',[.065,.13,.59],[.065,.13,.75],.009);rod('iron',[-.065,.13,.75],[.065,.13,.75],.009);box('leather',[0,.085,-.426],[.108,.105,.02]);arrow(true);anchors['string.nock']=nock;anchors['projectile.nock']=nock;anchors['projectile.tip']=add(nock,[0,0,.58]);
 }
 if(id==='round-wood-shield'){
  const radius=.34;for(let i=0;i<7;i++){const x0=-radius+i*radius*2/7+.001,x1=-radius+(i+1)*radius*2/7-.001,outline=[],points=5;for(let j=0;j<=points;j++){const x=x0+(x1-x0)*j/points;outline.push([x,Math.sqrt(Math.max(0,radius*radius-x*x))]);}for(let j=points;j>=0;j--){const x=x0+(x1-x0)*j/points;outline.push([x,-Math.sqrt(Math.max(0,radius*radius-x*x))]);}plate(finish==='teal'&&i%3!==1?'teal':'wood',outline,.033,.002,[0,0,.105],'iron',.018);}
  ring('iron',[0,0,.12],.338,.014,56,6);ring('steel',[0,0,.13],.338,.004,56,4);rod('iron',[0,0,.117],[0,0,.151],.095,.080,32);sphere('iron',[0,0,.151],.080,1,28,10,.52);
  // The boss back is buried in the planks; a low dome, not an ornamental spike.
  for(let i=0;i<12;i++){const a=i*TAU/12;rivet(Math.cos(a)*.309,Math.sin(a)*.309,.141,.006);}for(const x of [-.12,.12])box('wood',[x,0,.094],[.040,.48,.032]);gripBack();
 }
 if(id==='emblem-metal-shield'){
  const outline=[[-.222,.305],[.222,.305],[.220,.055],[.175,-.115],[0,-.305],[-.175,-.115],[-.220,.055]];
  plate('iron',outline,.040,.012,[0,0,.105],'brass',.026);const inner=outline.map(p=>p.map(v=>v*.89));plate(finish==='red'?'red':'teal',inner,.004,.002,[0,0,.130],'brass',.024);
  // Original heraldic relief: rising sun over a chevron, physically shallow.
  plate('brass',[[-.13,-.035],[0,.115],[.13,-.035],[.10,-.075],[0,.055],[-.10,-.075]],.006,.002,[0,0,.160]);sphere('brass',[0,.172,.164],.042,.80,20,6,.15);
  for(let i=0;i<7;i++){const a=(i+1)*Math.PI/8;rod('brass',[Math.cos(a)*.058,.172+Math.sin(a)*.052,.165],[Math.cos(a)*.081,.172+Math.sin(a)*.073,.165],.004,.004,6);}
  for(const [x,y] of [[-.19,.27],[.19,.27],[-.18,.04],[.18,.04],[0,-.255]])rivet(x,y,.149,.006);gripBack();armBack();
 }
 if(id==='tower-shield'){
  const outline=[[-.31,-.49],[.31,-.49],[.31,.64],[.27,.74],[.15,.80],[-.15,.80],[-.27,.74],[-.31,.64]];
  plate('iron',outline,.052,.012,[0,0,.100],'iron',.035);for(let i=0;i<7;i++){const x=-.265+i*.088,top=i===0||i===6?.647:i===1||i===5?.745:.775,bottom=-.455;box(i%3===1?'wood':'teal',[x,(top+bottom)/2,.177-.03*(x/.31)**2],[.085,top-bottom,.013]);}plate('iron',outline,.007,.006,[0,0,.072],'iron',.03);for(const x of [-.292,.292])box('iron',[x,.11,.158],[.024,1.18,.025]);box('iron',[0,-.48,.16],[.60,.035,.048]);rod('iron',[0,-.47,.192],[0,.755,.192],.022,.019,12);for(const y of [-.31,.17,.60]){box('wood',[0,y,.087],[.54,.046,.032]);for(const x of [-.24,.24])rivet(x,y,.181,.007);}gripBack();armBack();
 }
 if(id==='riot-shield'){
  const outline=[[-.28,-.46],[.28,-.46],[.30,-.40],[.30,.61],[.25,.69],[-.25,.69],[-.30,.61],[-.30,-.40]];
  if(finish==='opaque'){plate('iron',[[-.28,-.46],[.28,-.46],[.30,-.40],[.30,.36],[-.30,.36],[-.30,-.40]],.012,.004,[0,0,.123],'iron',.025);plate('iron',[[-.30,.52],[.30,.52],[.30,.61],[.25,.69],[-.25,.69],[-.30,.61]],.012,.004,[0,0,.123],'iron',.025);for(const x of [-.255,.255])box('iron',[x,.44,.136],[.09,.16,.012]);plate('glass',[[-.21,.36],[.21,.36],[.21,.52],[-.21,.52]],.010,.002,[0,0,.126],'glass',.025);}else plate('glass',outline,.012,.004,[0,0,.123],'glass',.025);
  for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];rod('iron',[a[0],a[1],.125],[b[0],b[1],.125],.010,.010,8);}
  box('iron',[0,-.37,.145],[.54,.105,.014]);box('iron',[0,.57,.143],[.51,.043,.014]);for(const y of [-.12,.15])for(const x of [-.10,.10])rivet(x,y,.164,.009);gripBack();armBack();
 }
 anchors['grip.main']=[0,0,0];if(spec.off)anchors['grip.off']=spec.off.slice();if(id==='bow')anchors['grip.off']=anchors['string.nock'].slice();for(const [key,value] of Object.entries(spec.surfaces))anchors[key]=value.slice();
 // Fold rotationally authored flanges back into static material batches.
 for(const [key,m] of [...batches])if(m.part.startsWith('flange-')){const target='static.'+m.material;if(!batches.has(target))batches.set(target,{key:target,part:'static',material:m.material,positions:[],normals:[],uvs:[]});const n=batches.get(target);for(const field of ['positions','normals','uvs'])n[field].push(...m[field]);batches.delete(key);}
 return {batches:[...batches.values()],anchors,projectilePosition:anchors['projectile.nock']||null,loaded};
}
export function equipmentGeometryBounds(geometry,{includeHidden=true}={}){
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const m of geometry.batches){if(m.part==='projectile'&&!includeHidden&&!geometry.loaded)continue;const t=m.part==='projectile'?geometry.projectilePosition:[0,0,0];for(let i=0;i<m.positions.length;i+=3)for(let k=0;k<3;k++){const n=m.positions[i+k]+t[k];min[k]=Math.min(min[k],n);max[k]=Math.max(max[k],n);}}return {min,max};
}
