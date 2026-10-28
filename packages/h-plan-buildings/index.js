// Descriptive, headless art assembly; not a portable map or gameplay compiler.
import {H_PLAN_RECIPES} from './designs.js';
export {H_PLAN_RECIPES};
export const H_PLAN_CONTRACT = Object.freeze({version:1,metresPerUnit:1,grid:.5,wallHeight:2,
  wallThickness:.16,slab:.12,floorSpacing:2.12,groundAxes:['x','y'],renderAxes:['x','height','y'],
  origin:'Front-left footprint corner; facade/cornice extend beyond it',
  status:'Original source/art descriptors. No fire, navigation, collision, evacuation or code-compliance claim.'});
const S=.5, key=(x,y)=>`${x},${y}`, inside=(r,x,y)=>x>=r.x-1e-8&&x<r.x+r.width-1e-8&&y>=r.y-1e-8&&y<r.y+r.depth-1e-8;
const rect=(x,y,width,depth)=>({x,y,width,depth});
export function hPlanRecipe(id) {const recipe=H_PLAN_RECIPES.find(r=>r.id===id);if(!recipe)throw Error('Unknown H-plan asset: '+id);return structuredClone(recipe);}
export function hPlanErrors(r) {
  if(!r||r.version!==1||!/^[-a-z0-9]+$/.test(r.id||''))return ['Expected an H-plan art recipe version 1 and portable ID.'];
  const errors=[];
  if(![r.wing,r.court,r.depth,r.connector].every(n=>Number.isFinite(n)&&Number.isInteger(n/S))||r.wing<5.5||r.court<6||r.depth<16||r.connector<4||r.connector>r.depth-8)errors.push('Use finite half-metre H dimensions with two substantial open courts.');
  const unitDepth=r.cores==='central'?r.depth/2:(r.depth-r.connector)/2,bedDepth=(unitDepth-Math.round(unitDepth)*.5)/r.bedrooms;
  if(!Number.isInteger(r.depth)||!Number.isInteger(r.connector)||!Number.isInteger(bedDepth/S))errors.push('Court and room boundaries must remain on the half-metre plan grid.');
  if(!Number.isInteger(r.stories)||r.stories<3||r.stories>5||!['central','paired'].includes(r.cores)||![1,2].includes(r.bedrooms))errors.push('Unsupported storey or circulation recipe.');
  if(!Number.isInteger(r.seed)||r.seed<0||r.seed>0xffffffff||!Number.isFinite(r.parapet)||r.parapet<.3||r.parapet>1)errors.push('Invalid appearance seed or parapet height.');
  if(r.wall!=='brick'||!['restrained-timber','stone-course','brick-and-stone'].includes(r.cornice)||![r.brickTint,r.stoneTint,r.trimTint].every(t=>Array.isArray(t)&&t.length===3&&t.every(n=>Number.isFinite(n)&&n>=0&&n<=1.5)))errors.push('Unsupported H-plan painted material or trim profile.');
  if(typeof r.name!=='string'||!Array.isArray(r.refs)||!r.refs.length||r.refs.some(id=>typeof id!=='string'||!id))errors.push('H-plan recipes need a name and source-reference IDs.');
  if(2*r.wing+r.court>64||r.depth>64)errors.push('H-plan assets are bounded to 64 metres.');
  return errors;
}
function trace(cells) {
  const edges=[];
  for(const c of cells.values())for(const[dx,dy,a,b]of[[0,-1,[c.x,c.y],[c.x+S,c.y]],[1,0,[c.x+S,c.y],[c.x+S,c.y+S]],[0,1,[c.x+S,c.y+S],[c.x,c.y+S]],[-1,0,[c.x,c.y+S],[c.x,c.y]]])if(!cells.has(key(c.ix+dx,c.iy+dy)))edges.push({a,b});
  const from=new Map(edges.map((e,i)=>[e.a.join(','),i])),points=[];let index=0;
  do{const edge=edges[index];points.push(edge.a);index=from.get(edge.b.join(','));if(index===undefined)throw Error('Broken H perimeter.');}while(index!==0&&points.length<=edges.length);
  if(points.length!==edges.length)throw Error('H footprint must have one closed perimeter.');
  return points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0]);});
}
export function offsetHContour(points,distance) {
  return points.map((b,i)=>{const a=points[(i+points.length-1)%points.length],c=points[(i+1)%points.length],u=[Math.sign(b[0]-a[0]),Math.sign(b[1]-a[1])],v=[Math.sign(c[0]-b[0]),Math.sign(c[1]-b[1])];
    return [b[0]+distance*(u[1]+v[1]),b[1]-distance*(u[0]+v[0])];});
}
function roomRects(w,d,beds) {
  const split=Math.round(d*.5/S)*S,service=w-2,bathEnd=split+1.5;
  const rooms=[{key:'living',name:'Living / dining',habitable:true,rects:[rect(0,0,w,split)]},
    {key:'entry',name:'Entry / kitchen',habitable:false,rects:[rect(w-1,split,1,1.5),rect(service,bathEnd,2,d-bathEnd)]},
    {key:'wash',name:'Washroom',habitable:false,rects:[rect(service,split,1,1.5)]}];
  const bedDepth=(d-split)/beds;
  for(let i=0;i<beds;i++)rooms.push({key:'bed'+(i+1),name:'Bedroom '+(i+1),habitable:true,rects:[rect(0,split+i*bedDepth,service,bedDepth)]});
  return rooms;
}
const localRect=(r,unit,side,rear)=>rect(side==='west'?unit.x+r.x:unit.x+unit.width-r.x-r.width,
  rear?unit.y+unit.depth-r.y-r.depth:unit.y+r.y,r.width,r.depth);
function partitions(cells,level,rooms,apartments) {
  const groups=new Map();
  for(const c of cells.values())for(const[dx,dy]of[[1,0],[0,1]]){const n=cells.get(key(c.ix+dx,c.iy+dy));if(!n||n.roomId===c.roomId)continue;
    const pair=[c.roomId,n.roomId].sort(),axis=dx?'y':'x',fixed=(dx?c.x+S:c.y+S),start=dx?c.y:c.x,id=pair.join('|')+axis+fixed;
    if(!groups.has(id))groups.set(id,{pair,axis,fixed,starts:[]});groups.get(id).starts.push(start);
  }
  const walls=[];
  for(const g of groups.values()){g.starts.sort((a,b)=>a-b);let start=g.starts[0],end=start+S;
    const add=()=>{const length=end-start,a=g.axis==='x'?[start,g.fixed]:[g.fixed,start],b=g.axis==='x'?[end,g.fixed]:[g.fixed,end],pair=g.pair.map(id=>rooms.find(r=>r.id===id)),wall={id:`L${level}-partition-${walls.length}`,a,b,length,level,interior:true,rooms:g.pair,openings:[]};
      const unit=pair.find(r=>r.unitId),circulation=pair.find(r=>!r.unitId),same=pair[0].unitId&&pair[0].unitId===pair[1].unitId;
      let width=0,mid=(start+end)/2,type='doorway';
      if(unit&&circulation&&unit.role==='entry'){width=1;type='unit-door';const apartment=apartments.find(u=>u.id===unit.unitId);if(apartment&&g.axis==='x')mid=apartment.side==='west'?apartment.rect.x+apartment.rect.width-1:apartment.rect.x+1;}
      else if(same&&pair.some(r=>r.role==='entry'))width=Math.min(.8,length-.2);
      if(width>=.65&&length>=width+.1){mid=Math.max(start+width/2+.05,Math.min(end-width/2-.05,mid));wall.openings.push({id:wall.id+'-opening',type,u0:mid-start-width/2,u1:mid-start+width/2,bottom:0,top:type==='unit-door'?1.72:1.7,rooms:g.pair});}
      walls.push(wall);
    };
    for(const next of g.starts.slice(1)){if(Math.abs(next-end)<1e-8)end+=S;else{add();start=next;end=next+S;}}add();
  }
  return walls;
}
export function compileHPlan(input) {
  const recipe=typeof input==='string'?hPlanRecipe(input):structuredClone(input),errors=hPlanErrors(recipe);if(errors.length)throw Error(errors.join(' '));
  const {wing:w,court:g,depth:d,connector:c,stories}=recipe,W=w*2+g,front=(d-c)/2,rear=front+c;
  const masses=[rect(0,0,w,d),rect(w+g,0,w,d),rect(w,front,g,c)],courts=[{id:'front-court',...rect(w,0,g,front),opensTo:'street'}, {id:'rear-court',...rect(w,rear,g,d-rear),opensTo:'yard'}];
  const coreRect=(cx)=>rect(cx-1.1,front+1,2.2,2.9);
  const cores=recipe.cores==='central'?[{id:'core-central',rect:coreRect(w+g/2),serves:'four flats per landing'}]:[
    {id:'core-west',rect:coreRect(w-1.4),serves:'two flats per landing'}, {id:'core-east',rect:coreRect(w+g+1.4),serves:'two flats per landing'}];
  const floors=[],stairs=[],windows=[],doors=[];
  for(let level=0;level<stories;level++){
    const apartments=[],rooms=[],cells=new Map(),landingId=`L${level}-landing`;
    for(const side of ['west','east'])for(const back of [false,true]){
      const unitDepth=recipe.cores==='central'?d/2:front,unit=rect(side==='west'?0:w+g,back?d-unitDepth:0,w,unitDepth),id=`${recipe.id}-L${level+1}-${side[0].toUpperCase()}${back?'R':'F'}`;
      const apartment={id,side,position:back?'rear':'front',rect:unit,area:unit.width*unit.depth,roomIds:[],entryId:null,windowIds:[],coreIds:recipe.cores==='central'?['core-central']:[side==='west'?'core-west':'core-east']};
      for(const r of roomRects(w,unitDepth,recipe.bedrooms)){const room={id:id+'-'+r.key,unitId:id,role:r.key,name:r.name,habitable:r.habitable,rects:r.rects.map(q=>localRect(q,unit,side,back)),windowIds:[]};rooms.push(room);apartment.roomIds.push(room.id);}
      apartments.push(apartment);
    }
    rooms.push({id:landingId,unitId:null,role:'landing',name:recipe.cores==='central'?'Shared stair landing':'Linked stair landings',habitable:false,rects:[],windowIds:[]});
    const roomAt=(x,y)=>rooms.find(r=>r.unitId&&r.rects.some(q=>inside(q,x,y)))?.id||landingId;
    for(let ix=0;ix<W/S;ix++)for(let iy=0;iy<d/S;iy++){const x=ix*S,y=iy*S;if(masses.some(q=>inside(q,x+S/2,y+S/2)))cells.set(key(ix,iy),{ix,iy,x,y,roomId:roomAt(x+S/2,y+S/2)});}
    const contour=trace(cells),outer=offsetHContour(contour,.08),inner=offsetHContour(contour,-.08),walls=[];
    for(let i=0;i<contour.length;i++){
      const a=contour[i],b=contour[(i+1)%contour.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dy=(b[1]-a[1])/length,normal=[dy,-dx].map(n=>n===0?0:n);
      const wall={id:`L${level}-exterior-${i}`,a,b,length,level,interior:false,outerA:outer[i],outerB:outer[(i+1)%contour.length],innerA:inner[i],innerB:inner[(i+1)%contour.length],normal,openings:[]};
      const entryFace=a[1]===front&&b[1]===front&&Math.min(a[0],b[0])===w;
      const serviceFace=a[1]===rear&&b[1]===rear&&Math.min(a[0],b[0])===w;
      if(level===0&&(entryFace||serviceFace)){
        const width=entryFace?2:1.0,mid=length/2;
        const opening={id:recipe.id+(entryFace?'-paired-entry':'-rear-service'),type:entryFace?'paired-entry':'service-door',u0:mid-width/2,u1:mid+width/2,bottom:0,top:1.85,rooms:[landingId,'outside'],roughDimensionsIncludeFrame:true,
          ...(entryFace?{doorContract:'h-plan-paired-door-art-v1',frame:{jamb:.065,head:.065,depth:.18},leaf:{thickness:.045,gap:.008,split:.5},openDegrees:{left:0,right:0},swing:'outward',sharedComponentDependency:'Pending shared paired-door contract; descriptors are art-local.'}:{})};
        wall.openings.push(opening);doors.push({...opening,wallId:wall.id,level});
      }
      const n=Math.max(1,Math.floor(length/2.4));
      for(let j=0;j<n;j++){
        const mid=length*(j+.5)/n,x=a[0]+dx*mid-normal[0]*.25,y=a[1]+dy*mid-normal[1]*.25,room=rooms.find(r=>r.id===roomAt(x,y));
        const width=room?.role==='wash'?.55:1.0,u0=mid-width/2,u1=mid+width/2;
        if(u0<.32||u1>length-.32||wall.openings.some(o=>u0<o.u1+.22&&u1>o.u0-.22))continue;
        const exteriorPoint=[a[0]+dx*mid+normal[0]*.6,a[1]+dy*mid+normal[1]*.6],court=courts.find(q=>inside(q,...exteriorPoint));
        const opening={id:wall.id+'-window-'+j,type:'window',u0,u1,bottom:room?.role==='wash'?1.1:.55,top:1.66,roomId:room.id,unitId:room.unitId,exposure:court?court.id:'street-or-yard',outward:normal,exteriorPoint};
        wall.openings.push(opening);windows.push({...opening,wallId:wall.id,level});room.windowIds.push(opening.id);
        if(room.unitId)apartments.find(u=>u.id===room.unitId).windowIds.push(opening.id);
      }
      walls.push(wall);
    }
    walls.push(...partitions(cells,level,rooms,apartments));
    for(const wall of walls.filter(q=>q.interior))for(const opening of wall.openings){doors.push({...opening,wallId:wall.id,level});if(opening.type==='unit-door'){const unitId=rooms.find(r=>r.id===opening.rooms.find(id=>rooms.find(q=>q.id===id)?.unitId))?.unitId;if(unitId)apartments.find(u=>u.id===unitId).entryId=opening.id;}}
    const holes=level>0?cores.map(core=>({coreId:core.id,...core.rect})):[];
    floors.push({level,height:level*2.12,apartments,rooms,walls,contour,cells:[...cells.values()].map(({x,y,roomId})=>({x,y,roomId})),holes,
      landing:{id:landingId,coreIds:cores.map(q=>q.id),description:recipe.cores==='central'?'Four dwellings open directly onto a compact landing around one U stair.':'Two dwellings per wing landing; two U stairs linked by an unlined central connector.'}});
    if(level<stories-1)for(const core of cores)stairs.push({id:`${core.id}-L${level}`,coreId:core.id,fromFloor:level,toFloor:level+1,rect:{...core.rect},rise:2.12,risers:14,flightWidth:.95,gap:.3,run:1.68,midLandingDepth:1.0,upperLandingY:core.rect.y,sourceOnly:true});
  }
  const b={version:1,id:recipe.id,name:recipe.name,recipe,contract:H_PLAN_CONTRACT,width:W,depth:d,stories,masses,courts,cores,floors,stairs,windows,doors,
    roof:{id:recipe.id+'-H-roof',style:'flat-parapet',height:stories*2.12,thickness:.12,overhang:.16,contour:offsetHContour(floors[0].contour,.16),parapetHeight:recipe.parapet,
      constructionIntent:'Painted membrane over a closed H-plan slab. No pitched-junction solver or physical roof void is represented.',firestopIntent:'Potential concealed roof-void/firestop locations are source notes only; no fire substrate or rated assembly.'},
    serviceFeatures:[.32,1.68].map((fraction,i)=>({id:recipe.id+'-flue-'+i,kind:'decorative-roof-flue',x:fraction<1?w*fraction:W-w*(2-fraction),y:d-1.4,width:.65,depth:.75,height:.85,shaftRepresented:false,consumerBinding:false})),
    circulation:recipe.cores==='central'?'Single central stair / four flats per landing':'Two linked point cores / two flats per core landing',
    sourceReferences:[...recipe.refs],consumerIntegrated:false};
  for(const f of floors)for(const u of f.apartments){if(!u.entryId||!u.windowIds.length)throw Error('Unit lost its entry or exterior exposure: '+u.id);for(const id of u.roomIds){const room=f.rooms.find(r=>r.id===id);if(room.habitable&&!room.windowIds.length)throw Error('Habitable room has no exterior window: '+id);}}
  return b;
}

export function hPlanFloorSvg(input,level=0) {
  const b=input?.floors?input:compileHPlan(input),floor=b.floors[level];if(!floor)throw Error('Unknown floor.');
  const colors=['#e2b783','#9bbfba','#c0afd0','#c2c68d'],xml=value=>String(value).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])),name=xml(b.name);
  const p=[],scale=28,pad=40,W=b.width*scale+pad*2,H=b.depth*scale+pad*2;
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name} floor ${level+1}"><rect width="100%" height="100%" fill="#f2eee3"/><g transform="translate(${pad} ${pad}) scale(${scale})">`);
  p.push(`<path d="M${floor.contour.map(v=>v.join(',')).join('L')}Z" fill="#d6d8cb"/>`);
  for(const [i,u]of floor.apartments.entries()){p.push(`<rect x="${u.rect.x}" y="${u.rect.y}" width="${u.rect.width}" height="${u.rect.depth}" fill="${colors[i]}"/>`);for(const id of u.roomIds){const r=floor.rooms.find(q=>q.id===id),q=[...r.rects].sort((a,b)=>b.width*b.depth-a.width*a.depth)[0];p.push(`<text x="${q.x+q.width/2}" y="${q.y+q.depth/2}" text-anchor="middle" font-family="sans-serif" font-size=".24" fill="#253a35">${r.role==='wash'?'Bath':r.name}</text>`);}p.push(`<text x="${u.rect.x+u.rect.width/2}" y="${u.rect.y+.35}" text-anchor="middle" font-family="sans-serif" font-size=".28" font-weight="bold">${u.id.split('-L')[1]}</text>`);}
  for(const w of floor.walls){p.push(`<path d="M${w.a}L${w.b}" stroke="#263c35" stroke-width="${w.interior?.08:.16}"/>`);const dx=(w.b[0]-w.a[0])/w.length,dy=(w.b[1]-w.a[1])/w.length;for(const o of w.openings){const a=[w.a[0]+dx*o.u0,w.a[1]+dy*o.u0],z=[w.a[0]+dx*o.u1,w.a[1]+dy*o.u1];p.push(`<path d="M${a}L${z}" stroke="${o.type==='window'?'#1678a1':'#f2eee3'}" stroke-width=".21"/>`);
    if(o.type==='paired-entry'){const width=(o.u1-o.u0-2*o.frame.jamb-o.leaf.gap)/2;
      for(const[side,u,sign]of[['left',o.u0+o.frame.jamb,1],['right',o.u1-o.frame.jamb,-1]]){const hinge=[w.a[0]+dx*u,w.a[1]+dy*u],open=[hinge[0]+dy*width,hinge[1]-dx*width],closed=[hinge[0]+dx*width*sign,hinge[1]+dy*width*sign];p.push(`<path data-paired-leaf="${side}" d="M${hinge}L${open} M${closed}A${width},${width} 0 0 ${sign===1?0:1} ${open}" fill="none" stroke="#83603c" stroke-width=".04"/>`);}
    }else if(o.type!=='window')p.push(`<path d="M${a}l${-dy*(o.u1-o.u0)},${dx*(o.u1-o.u0)}" stroke="#83603c" stroke-width=".045"/>`);}}
  for(const core of b.cores){const r=core.rect;p.push(`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.depth}" fill="#adb9aa" stroke="#35493e" stroke-width=".04"/>`);for(let i=0;i<7;i++)p.push(`<path d="M${r.x},${r.y+i*.24}h.95 M${r.x+1.25},${r.y+i*.24}h.95" stroke="#526c5c" stroke-width=".035"/>`);p.push(`<text x="${r.x+1.1}" y="${r.y+2.4}" text-anchor="middle" font-family="sans-serif" font-size=".25">U stair</text>`);}
  for(const court of b.courts)p.push(`<text x="${court.x+court.width/2}" y="${court.y+court.depth/2}" text-anchor="middle" font-family="sans-serif" font-size=".36" fill="#617361">OPEN ${court.opensTo==='street'?'FRONT':'REAR'} COURT</text>`);
  p.push(`</g><text x="${pad}" y="22" font-family="sans-serif" font-size="14">${name} · floor ${level+1} · 1 grid metre = ${scale} px · blue = exterior window</text></svg>`);
  return p.join('');
}
