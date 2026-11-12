// UV layout and painted-detail composition. Master brushwork was made with
// imagegen (prompt/provenance.json); shapes here keep paint registered to metal.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {VEHICLE_BODIES} from '../../packages/vehicle-visuals/catalogue.js';
import {vehicleProfile,roofHeight,SKIN_RECTS} from '../../packages/vehicle-visuals/sculpt.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
let sharp;
try{sharp=createRequire(import.meta.url)('sharp');}catch{
 const modules=process.env.CODEX_NODE_MODULES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
 sharp=createRequire(path.join(modules,'sharp/package.json'))('sharp');
}
const dir=path.join(root,'packages/vehicle-visuals/skins'),master=path.join(root,'tools/vehicle-art/paint-master.png');
fs.mkdirSync(dir,{recursive:true});
fs.mkdirSync(path.join(root,'artifacts/road-vehicles'),{recursive:true});
const all=await sharp(master).resize(1024,1024).toBuffer(),patches={};
for(const [id,x,y]of [['enamel',0,0],['glass',512,0],['rubber',0,512],['metal',512,512]]){
  let patch=sharp(all).extract({left:x,top:y,width:512,height:512});
  if(id==='enamel')patch=patch.linear(1.15,25);
  patches[id]='data:image/png;base64,'+(await patch.png().toBuffer()).toString('base64');
}
const svg=(w,h,body)=>Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><defs>'+Object.entries(patches).map(([id,uri])=>'<pattern id="'+id+'" patternUnits="userSpaceOnUse" width="1024" height="1024">'+['','translate(1024 0) scale(-1 1)','translate(0 1024) scale(1 -1)','translate(1024 1024) scale(-1 -1)'].map(transform=>'<image href="'+uri+'" width="512" height="512" transform="'+transform+'"/>').join('')+'</pattern>').join('')+'</defs>'+body+'</svg>');
const fmt=n=>Number(n.toFixed(3));
const poly=points=>'M'+points.map(p=>p.map(fmt).join(',')).join('L')+'Z';
const line=points=>'M'+points.map(p=>p.map(fmt).join(',')).join('L');
const report=[];
for(const body of VEHICLE_BODIES){
 const spec=vehicleProfile(body),w=body.widthM/2,half=body.lengthM/2;
 const color=['<rect width="2048" height="2048" fill="url(#enamel)"/>'],mask=['<rect width="2048" height="2048" fill="white"/>'];
 const xy=(face,z,y)=>{const [a,b,ww,hh]=SKIN_RECTS[face];return [a+(z/body.lengthM+.5)*ww,b+(1-y/2.12)*hh];};
 const top=(z,x)=>{const [a,b,ww,hh]=SKIN_RECTS.top;return[a+(z/body.lengthM+.5)*ww,b+(x/body.widthM+.5)*hh];};
 const end=(face,x,y)=>{const[a,b,ww,hh]=SKIN_RECTS[face];return[a+(x/body.widthM+.5)*ww,b+(1-y/2.12)*hh];};
 const shape=(d,fill,stroke='#333c3c',width=3)=>{
  color.push('<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linejoin="round"/>');
  mask.push('<path d="'+d+'" fill="black" stroke="black" stroke-width="'+(width+1)+'" stroke-linejoin="round"/>');
 };
 const ink=(points,col='#666963',width=2,opacity=1)=>{
  const d=line(points);color.push('<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+width+'" opacity="'+opacity+'" stroke-linecap="round" stroke-linejoin="round"/>');
  mask.push('<path d="'+d+'" fill="none" stroke="black" stroke-width="'+width+'" opacity="'+opacity+'"/>');
 };
 const rect=(face,x1,y1,x2,y2,fill,stroke,width)=>shape(poly([end(face,x1,y1),end(face,x2,y1),end(face,x2,y2),end(face,x1,y2)]),fill,stroke,width);
 for(const side of [-1,1]){
  const z0=side*half,z1=side*(half-.21);
  shape(poly([xy('side',z0,.33),xy('side',z1,.33),xy('side',z1,.48),xy('side',z0,.48)]),'url(#rubber)','#46504a',1);
  ink([xy('side',z0,.465),xy('side',z1,.465)],'#b1b5a6',3);
 }
 // Side glass is painted directly into the continuous metal's skin.
 for(const [start,stop]of spec.windows){
  const points=[xy('side',start,spec.belt+.065),xy('side',stop,spec.belt+.065)];
  for(let i=24;i>=0;i--){const z=start+(stop-start)*i/24;points.push(xy('side',z,Math.max(spec.belt+.12,roofHeight(body,z)-.105)));}
  shape(poly(points),'url(#glass)','#343e3f',7);
  ink([xy('side',start+.035,spec.belt+.079),xy('side',stop-.035,spec.belt+.079)],'#abb7b2',2.2);
 }
 // Narrow bright belt edge, rocker strip and drawn door shut lines/handles.
 ink([xy('side',-half+.22,spec.belt-.018),xy('side',half-.20,spec.belt-.018)],'#a4a99b',3,.75);
 ink([xy('side',-half+.22,spec.belt-.036),xy('side',half-.20,spec.belt-.036)],'#4c5652',1.8,.7);
 ink([xy('side',-half+.23,.315),xy('side',half-.23,.315)],'#454d49',8,.9);
 for(const z of spec.doors){
  ink([xy('side',z,spec.belt+.055),xy('side',z+.018,.51),xy('side',z-.06,.36)],'#464e49',2.4,.88);
  const handle=[xy('side',z-.25,spec.belt-.10),xy('side',z-.10,spec.belt-.10)];
  ink(handle,'#303d3c',9);ink(handle.map(([x,y])=>[x,y-2]),'#aab2aa',4);
 }
 if(spec.cargo){
  const a=-1.86,b=.55;
  ink([xy('side',a,1.8),xy('side',b,1.8),xy('side',b,.38),xy('side',a,.38),xy('side',a,1.8)],'#626d66',2.4,.85);
  ink([xy('side',a+.03,1.76),xy('side',b-.04,1.76)],'#dfded0',3,.7);
  ink([xy('side',a+.2,1.22),xy('side',b-.18,1.22)],'#9da697',3,.8);
 }
 // Arch lip and short ochre/dust scumbling at the sill, both painted.
 for(const axle of body.axlesM){
  const points=[];for(let i=0;i<=64;i++){const t=i*Math.PI/64;points.push(xy('side',axle+(body.wheelRadiusM+.092)*Math.cos(t),body.wheelRadiusM+(body.wheelRadiusM+.092)*Math.sin(t)));}
  ink(points,'#c9c9b9',6,.65);ink(points.map(([x,y])=>[x,y+2]),'#414b47',2,.8);
 }
 for(let j=0;j<35;j++){
  const z=-half+.25+(body.lengthM-.5)*j/35,y=.36+.12*(.5+.5*Math.sin(j*5.7));
  ink([xy('side',z,y),xy('side',z+.025+(j%5)*.008,y+.008)],j%3?'#c0ae8a':'#6d7264',1.4,.25);
 }
 // Windscreens are top-skin regions on the sloping bonnet/roof/hatch surface.
 for(const front of [true,false]){
  if(!front&&spec.cargo)continue;
  const segment=front?spec.roof.slice(-2):spec.roof.slice(0,2);
  const z0=segment[0][0]+.045,z1=segment[1][0]-.045;
  if(z1-z0>.04){
   const near=front?w-.18:w-.19,far=w-.24;
   shape(poly([top(z0,-far),top(z1,-near),top(z1,near),top(z0,far)]),'url(#glass)','#354141',6);
   if(front)for(const side of [-1,1])ink([top(z1-.035,side*.45),top(z1-.14,side*.12)],'#354141',3);
  }
 }
 // Roof seams, bonnet shut line and open-bed floor corrugation are painted.
 const bonnet=spec.roof.at(-1)[0]+.035;
 ink([top(bonnet,-w+.19),top(bonnet,w-.19)],'#666f65',2,.7);
 for(const side of [-1,1])ink([top(bonnet+.05,side*(w-.23)),top(half-.18,side*(w-.23))],'#d8d7c3',3,.6);
 if(spec.bedEnd)for(let j=-4;j<=4;j++){
  ink([top(-half+.14,j*.16),top(spec.bedEnd-.12,j*.16)],'#666e65',4,.8);
  ink([top(-half+.14,j*.16+.012),top(spec.bedEnd-.12,j*.16+.012)],'#dad8bf',2,.7);
 }
 // Front and rear skins: inset lights, grille, bumper and licence panel.
 for(const face of ['front','rear']){
  const y=spec.belt-.20,front=face==='front';
  rect(face,-w+.13,.33,w-.13,.48,'url(#rubber)','#3d4642',2);
  ink([end(face,-w+.19,.465),end(face,w-.19,.465)],'#b1b5a6',5);
  rect(face,-.17,.335,.17,.425,'#c1bea0','#424b45',3);
  for(const side of [-1,1]){
   const centre=side*(w-.32),hw=body.kind==='car'?.22:.18;
   rect(face,centre-hw,y-.07,centre+hw,y+.085,front?'#dcd8b4':'#99483b','#333e3c',6);
   for(let j=0;j<4;j++)ink([end(face,centre-hw+.018,y-.045+j*.028),end(face,centre+hw-.018,y-.045+j*.028)],front?'#f0e5c8':'#c16c52',1.7,.7);
   rect(face,centre+side*.12-.027,y-.06,centre+side*.12+.027,y+.073,front?'#b89155':'#c48c60','#5c5b4b',1);
  }
  if(front){
   rect(face,-w*.34,y-.09,w*.34,y+.10,'url(#rubber)','#48524b',4);
   for(let j=0;j<4;j++)ink([end(face,-w*.31,y-.067+j*.043),end(face,w*.31,y-.067+j*.043)],'#a4ae9e',2.6,.85);
  }else{
   ink([end(face,-w+.16,spec.belt-.02),end(face,w-.16,spec.belt-.02)],'#5b665c',2.5);
   ink([end(face,-.08,spec.belt-.12),end(face,.08,spec.belt-.12)],'#454f49',7);
   if(body.kind==='van'||body.id==='utility-suv'){
    const rearTop=roofHeight(body,-half);
    if(!spec.cargo)for(const side of [-1,1])rect(face,side*.36-.29,spec.belt+.04,side*.36+.29,rearTop-.13,'url(#glass)','#354141',7);
    ink([end(face,0,.49),end(face,0,rearTop-.07)],'#515e56',3);
   }
  }
 }
 const rgb=await sharp(svg(2048,2048,color.join(''))).removeAlpha().raw().toBuffer();
 const alpha=await sharp(svg(2048,2048,mask.join(''))).removeAlpha().greyscale().raw().toBuffer();
 const rgba=Buffer.alloc(2048*2048*4);
 for(let i=0;i<alpha.length;i++){rgba[i*4]=rgb[i*3];rgba[i*4+1]=rgb[i*3+1];rgba[i*4+2]=rgb[i*3+2];rgba[i*4+3]=alpha[i];}
 const target=path.join(dir,body.id+'.png');
 await sharp(rgba,{raw:{width:2048,height:2048,channels:4}}).png().toFile(target);
 if(body.id==='hatchback')await sharp(rgb,{raw:{width:2048,height:2048,channels:3}}).jpeg({quality:92}).toFile(path.join(root,'artifacts/road-vehicles/hatchback-skin.jpg'));
 report.push({id:body.id,sha256:createHash('sha256').update(fs.readFileSync(target)).digest('hex')});
 console.log('Painted '+body.id+' skin');
}
// Shared rubber/metal skin. Rim holes, dish rings and nuts are painted here.
let detail='<rect width="1024" height="1024" fill="url(#rubber)"/><rect x="512" y="512" width="512" height="512" fill="url(#metal)"/>';
for(let x=0;x<512;x+=24)detail+='<path d="M'+x+',744l10,23l-5,32M'+(x+10)+',745l-4,22l9,31" fill="none" stroke="#252f2d" stroke-width="3" opacity=".8"/>';
detail+='<circle cx="768" cy="768" r="221" fill="none" stroke="#bfc4b6" stroke-width="14"/><circle cx="768" cy="768" r="194" fill="none" stroke="#555e59" stroke-width="6"/>';
for(let j=0;j<5;j++){
 const t=j*Math.PI*2/5,x=768+135*Math.cos(t),y=768+135*Math.sin(t);
 detail+='<ellipse cx="'+x+'" cy="'+y+'" rx="33" ry="25" fill="#3b4745" transform="rotate('+j*72+' '+x+' '+y+')"/>';
 detail+='<circle cx="'+(768+67*Math.cos(t))+'" cy="'+(768+67*Math.sin(t))+'" r="9" fill="#dad8c3" stroke="#535b53" stroke-width="4"/>';
}
detail+='<circle cx="768" cy="768" r="31" fill="#919b91" stroke="#424e48" stroke-width="6"/>';
await sharp(svg(1024,1024,detail)).png().toFile(path.join(dir,'running-gear.png'));
fs.writeFileSync(path.join(root,'artifacts/road-vehicles/skin-hashes.json'),JSON.stringify(report,null,2)+'\n');
