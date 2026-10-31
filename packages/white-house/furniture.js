import {furnishingById} from './plan.js';
// Settled detailed source. The game derivative drops small trim and reduces the
// radial samples; fabrics, carving and parquet remain painted albedo, never bump.
export function furnish(b,id,finish='blue'){
 const spec=furnishingById(id),[w,h,d]=spec.size,wood='mahogany',cloth=['blue','red','green','gold'].includes(finish)?finish:'blue',B=(x,y,z,a,c,e,m=wood)=>b.box([x,y,z],[a,c,e],m),C=(x,y,z,r,height,m=wood,top=r)=>b.cylinder([x,y,z],r,height,m,top);
 const legs=(width,depth,height=.45,mat=wood)=>{for(const x of [-1,1])for(const z of [-1,1]){C(x*(width/2-.075),height/2,z*(depth/2-.075),.045,height,mat,.03);if(b.lod==='authoring')C(x*(width/2-.075),.12,z*(depth/2-.075),.065,.04,'gold');}};
 const frame=(width,height,depth=.12)=>{B(0,height/2,0,width,height,depth,'gold');B(0,height/2,depth/2+.006,width-.12,height-.12,.015,id.endsWith('mirror')?'mirror':'landscape');};
 if(['empire-armchair','empire-settee','chaise','dining-chair','office-chair','bench','theater-seat','garden-bench'].includes(id)){
  const seat=.43,back=id==='bench'?.0:h-.52;legs(w,d,seat,id==='garden-bench'?'bronze':wood);B(0,.43,0,w,.12,d,id==='garden-bench'?'mahogany':cloth);
  if(back>0){B(0,.53+back/2,-d/2+.055,w,.08+back,.10,id==='office-chair'?'leather':wood);B(0,.53+back/2,-d/2+.12,w-.1,back-.08,.07,id==='office-chair'?'leather':cloth);}
  if(['empire-armchair','empire-settee','chaise','theater-seat','office-chair'].includes(id))for(const s of [-1,1]){B(s*(w/2-.04),.7,0,.07,.1,d,'gold');C(s*(w/2-.04),.56,d/2-.1,.025,.25,'gold');}
  if(b.lod==='authoring'){B(0,.35,0,w-.05,.045,d-.05,'gold');if(back>0)B(0,h-.025,-d/2+.04,w,.045,.12,'gold');}
 }else if(['resolute-desk','writing-desk','conference-table','banquet-table','round-table','console','side-table','piano-stool'].includes(id)){
  if(id==='round-table'){C(0,h-.04,0,w/2,.08,'marble');C(0,(h-.1)/2,0,.16,h-.1,wood,.09);B(0,.05,0,w*.65,.08,.2);B(0,.05,0,.2,.08,d*.65);}
  else{B(0,h-.055,0,w,.11,d,id==='console'?'marble':wood);if(id==='resolute-desk'){B(-.69,.48,0,.52,.92,d-.1);B(.69,.48,0,.52,.92,d-.1);B(0,.55,-.4,.9,.7,.10,'panel');for(const x of [-.69,.69])for(let i=0;i<3;i++){B(x,.2+i*.25,.46,.45,.20,.025,'panel');B(x,.2+i*.25,.48,.13,.025,.03,'gold');}}else legs(w,d,h-.12);}
  if(b.lod==='authoring'){B(0,h-.16,0,w,.045,d,'gold');if(id==='resolute-desk')for(let i=0;i<7;i++)B(-.8+i*.27,.5,-.52,.035,.58,.025,'gold');}
 }else if(['bookcase','china-cabinet','credenza','dresser','bedside-cabinet','kitchen-counter','refrigerator','range'].includes(id)){
  const kitchen=['kitchen-counter','refrigerator','range'].includes(id);B(0,h/2,0,w,h,d,kitchen?'ivory':wood);
  if(['bookcase','china-cabinet'].includes(id)){for(let row=0;row<4;row++){B(0,.25+row*.4,d/2+.02,w-.13,.025,.08,'gold');for(let j=0;j<10;j++){const height=.18+(j%3)*.04;B(-w/2+.15+j*(w-.3)/10,.27+row*.4+height/2,d/2+.03,(w-.4)/12,height,.04,id==='bookcase'?['red','blue','green','gold'][j%4]:'marble');}}B(0,h/2,d/2+.08,.035,h-.08,.025,'gold');}
  else if(id==='range'){for(const x of [-.22,.22])for(const z of [-.2,.2])C(x,h+.005,z,.12,.02,'bronze');B(0,h*.42,d/2+.01,w*.72,h*.45,.02,'dark');}
  else if(id==='refrigerator'){B(0,h*.68,d/2+.02,w-.08,.02,.02,'bronze');B(w*.3,h*.45,d/2+.04,.035,.4,.04,'bronze');}
  else{for(let i=0;i<3;i++){B(0,.17+i*h/3,d/2+.015,w-.1,.025,.025,kitchen?'bronze':'gold');B(0,.24+i*h/3,d/2+.04,.18,.025,.025,'gold');}B(0,h+.025,0,w,.05,d,kitchen?'marble':wood);}
 }else if(id==='four-poster-bed'){
  legs(w,d,.35);B(0,.39,0,w,.22,d);B(0,.58,0,w-.08,.20,d-.08,'drapery');B(0,.7,.3,w-.08,.08,d*.7,cloth);for(const x of [-.45,.45])B(x,.74,-d*.30,.65,.18,.42,'drapery');B(0,.85,-d/2+.08,w,.7,.12,wood);for(const x of [-w/2,w/2])for(const z of [-d/2,d/2]){C(x,h/2,z,.045,h,wood);b.sphere([x,h+.04,z],[.065,.065,.065],'gold');}B(0,h,-d/2,w,.10,.10,'gold');B(0,h,d/2,w,.10,.10,'gold');
 }else if(id==='grand-piano'){
  const points=[[-1.15,-.75],[.8,-.75],[1.15,-.3],[.95,.55],[.1,.85],[-1.15,.85]];b.prism(points,.72,.98,'mahogany');legs(2.1,1.4,.72,'gold');B(-.95,1.01,0,.25,.06,1.5,'ivory');for(let i=0;i<18;i++)B(-1,1.055,-.7+i*.08,.10,.035,.025,'bronze');b.prism(points,1.05,1.10,'mahogany',[-.20,0,0]);C(.2,1.1,-.5,.018,.45,'gold');
 }else if(['chandelier','wall-sconce','table-lamp','floor-lamp','garden-lantern'].includes(id)){
  const tall=id==='chandelier'?1.0:h;C(0,tall/2,0,.035,tall,'gold');C(0,.04,0,w*.3,.08,'gold');
  if(id==='chandelier'||id==='wall-sconce'){for(let i=0;i<(id==='chandelier'?8:3);i++){const a=i*Math.PI*2/(id==='chandelier'?8:3),r=w*.35,x=Math.sin(a)*r,z=Math.cos(a)*r;B(x/2,.35,z/2,.04,.04,r,'gold');C(x,.5,z,.025,.3,'gold');b.sphere([x,.7,z],[.06,.12,.06],'glass');if(b.lod==='authoring')for(let j=0;j<3;j++)b.sphere([x,.25-j*.07,z],[.035,.055,.035],'glass');}C(0,.35,0,w*.26,.06,'gold');}
  else{C(0,h*.78,0,w*.48,h*.35,id==='garden-lantern'?'glass':'drapery',w*.3);if(id==='garden-lantern')for(const x of [-.18,.18])B(x,h*.8,0,.025,h*.35,.025,'bronze');}
 }else if(['gilt-mirror','small-mirror','framed-landscape'].includes(id))frame(w,h);
 else if(id==='fireplace'){B(0,.72,0,w,1.44,d,'marble');B(0,.52,d/2+.01,w*.65,.9,.025,'dark');B(0,1.45,.02,w+.12,.12,d+.12,'panel');for(const x of [-w*.43,w*.43])B(x,.7,d/2+.04,.12,1.35,.09,'panel');B(0,.15,d/2+.08,w*.55,.08,.12,'bronze');}
 else if(id==='drapery-bay'){for(const x of [-w*.42,w*.42]){B(x,h/2,0,w*.19,h,.15,'drapery');B(x,h*.38,.09,w*.22,.07,.04,'gold');}B(0,h-.15,0,w,.3,.2,cloth);B(0,h+.02,0,w+.1,.07,.07,'gold');}
 else if(['blue-oval-rug','red-area-rug'].includes(id)){if(id==='blue-oval-rug')b.ellipse([0,.015,0],[w/2,.012,d/2],'blue-rug');else B(0,.015,0,w,.025,d,'red-rug');}
 else if(id==='flag'){C(0,h/2,0,.018,h,'gold');C(0,.04,0,.18,.08,'gold');B(.32,h-.4,0,.6,.6,.015,'blue');for(let i=0;i<6;i++)B(.32,h-.13-i*.09,.012,.6,.045,.012,i%2?'ivory':'red');b.sphere([0,h+.03,0],[.05,.05,.05],'gold');}
 else if(id==='lectern'){B(0,.55,0,.55,1.1,.4);B(0,1.12,0,.8,.1,.55);B(0,.73,.22,.35,.35,.02,'blue');}
 else if(id==='press-camera'){for(const [x,z]of [[-.3,.25],[.3,.25],[0,-.3]])b.beam([x,0,z],[0,1.3,0],.035,'bronze');B(0,1.45,0,.38,.27,.5,'bronze');C(0,1.45,.35,.10,.22,'dark');}
 else if(id==='monitor'){B(0,h/2,0,w,h,.08,'bronze');B(0,h/2,.05,w-.08,h-.08,.02,'blue');}
 else if(id==='telephone'){B(0,.05,0,w,.10,d,'bronze');B(0,.14,0,w,.05,.09,'bronze');}
 else if(id==='vase-flowers'||id==='urn'){C(0,h*.25,0,w*.24,h*.5,'marble',w*.42);for(let i=0;i<7;i++){const a=i*2.4,r=i*.025;b.sphere([Math.sin(a)*r,h*.64+Math.sin(i)*.04,Math.cos(a)*r],[w*.18,h*.16,w*.18],id==='urn'?'foliage':i%3?'flower':'foliage');}}
 else if(id==='clock'){B(0,h*.35,0,w,h*.7,d);b.sphere([0,h*.7,0],[w*.4,h*.3,d*.6],'gold');B(0,h*.67,d*.65,w*.43,h*.43,.01,'ivory');B(0,h*.73,d*.7,.015,h*.15,.015,'bronze');}
 else if(id==='basin'){C(0,.4,0,.1,.8,'marble');b.ellipse([0,.83,0],[w/2,.08,d/2],'marble');C(0,.94,-.15,.02,.16,'gold');}
 else if(id==='toilet'){b.ellipse([0,.25,.08],[.20,.25,.30],'marble');b.ellipse([0,.48,.08],[.23,.04,.30],'ivory');b.ellipse([0,.50,.08],[.13,.015,.20],'dark');B(0,.62,-.27,.40,.38,.18,'marble');}
 else if(id==='bath-stall'){for(const x of [-.48,.48])B(x,.95,0,.04,1.9,2,'panel');B(0,.95,.96,.96,1.9,.04,'panel');B(.40,.95,1.01,.05,.08,.06,'gold');}
 else if(id==='bathtub'){B(0,.25,0,w,.5,d,'marble');B(0,.51,0,w-.12,.025,d-.12,'water');for(const x of [-w/2,w/2])B(x,.55,0,.10,.12,d+.1,'marble');}
 else if(id==='fence-panel'){B(0,.45,0,w,.05,.06,'bronze');B(0,1.55,0,w,.05,.06,'bronze');for(let i=0;i<9;i++){const x=-w/2+i*w/8;B(x,.95,0,.025,1.9,.04,'bronze');if(b.lod==='authoring')b.sphere([x,1.92,0],[.04,.07,.04],'bronze');}}
 else throw Error('Unimplemented furnishing '+id);
 return spec;
}
