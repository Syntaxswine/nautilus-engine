// Headless descriptive data. Fixed 8631b0c supplies only the room/wall compiler and SVG.
import {compileMeasured,measuredFloorSvg} from '../measured-buildings/index.js';
import {FORT_RECIPES,fortRecipe,freeze} from './designs.js';
export {FORT_RECIPES,fortRecipe};
export const FORT_CONTRACT=freeze({schema:'nautilus-fort-apache-art',version:1,metresPerUnit:1,scale:[1,1,1],
  groundAxes:['x','y'],renderAxes:['x','height','y'],origin:'front-left body footprint at ground floor datum',
  wallHeight:2,wallThickness:.16,slabThickness:.12,floorInterval:2.12,grid:.5,maxLevels:6,maxMapExtent:240,
  status:'Original historical art adaptations; descriptive rooms and parts, pending shared editor/game intake.'});
export function fortErrors(r){
  const errors=[];
  if(!r||!/^fort-apache-[a-z0-9-]+$/.test(r.id||''))return['Use a stable Fort Apache asset ID.'];
  if(r.levels>6||r.levels<1||!Number.isInteger(r.levels))errors.push('Use 1–6 standard levels.');
  for(const e of r.entries||[])if(![e.height,e.width,...e.point].every(Number.isFinite)||e.height<=0||e.height>r.levels*2.12||e.width<=0)errors.push('Portal dimensions must fit their native span.');
  for(const a of r.roofAssemblies||[])if(!Number.isInteger(a.level)||a.level<1||a.level>6)errors.push('Roof datums must use whole standard levels.');
  return errors;
}
const near=(a,b)=>Math.abs(a-b)<1e-7;
function wallAt(w,point){
  const dx=w.b[0]-w.a[0],dy=w.b[1]-w.a[1],u=((point[0]-w.a[0])*dx+(point[1]-w.a[1])*dy)/w.length;
  return near((point[0]-w.a[0])*dy,(point[1]-w.a[1])*dx)&&u>0&&u<w.length?u:null;
}
export function compileFort(input){
  const r=typeof input==='string'?fortRecipe(input):structuredClone(input),errors=fortErrors(r);if(errors.length)throw Error(errors.join(' '));
  const b=compileMeasured(r);b.schema=FORT_CONTRACT.schema;b.contract=structuredClone(FORT_CONTRACT);b.physicalStoreys=r.physicalStoreys;
  b.portals=[];b.windows=[];b.roofs=structuredClone(r.roofAssemblies).map(a=>({...a,datum:a.level*2.12}));
  // Replace inherited exterior entries with explicit full-height portal records.
  for(const f of b.floors)for(const w of f.walls){
    w.openings=w.openings.filter(o=>!o.public);
    if(r.noWindows)w.openings=w.openings.filter(o=>o.type!=='window');
    for(const o of w.openings)if(o.type==='window'&&!o.continuation)b.windows.push({...o,wallId:w.id,
      origin:[w.a[0],f.height,w.a[1]],direction:[(w.b[0]-w.a[0])/w.length,(w.b[1]-w.a[1])/w.length]});
  }
  for(const [i,e]of r.entries.entries()){
    const id=r.id+':entry-'+i,base=e.level*2.12;
    for(const f of b.floors){
      const lo=Math.max(0,base-f.height),hi=Math.min(2.12,base+e.height-f.height);if(hi<=lo)continue;
      const w=f.walls.find(w=>!w.interior&&w.rooms.includes('L'+f.level+':'+e.room)&&wallAt(w,e.point)!==null);
      if(!w)throw Error('Portal misses its exterior room at L'+f.level+': '+id);
      const u=wallAt(w,e.point);
      if(u-e.width/2<.1-1e-7||u+e.width/2>w.length-.1+1e-7)throw Error('Portal escapes its wall bay.');
      w.openings=w.openings.filter(o=>o.u1<u-e.width/2-.12||o.u0>u+e.width/2+.12);
      w.openings.push({id,openingId:id,type:f.level===e.level?e.type:'doorway',public:true,continuation:f.level!==e.level,
        u0:u-e.width/2,u1:u+e.width/2,bottom:lo,top:hi,fullHeight:e.height,style:e.style||'panel',rooms:[...w.rooms]});
      if(f.level===e.level)b.portals.push({id,wallId:w.id,level:e.level,point:[...e.point],base,width:e.width,height:e.height,
        type:e.type,style:e.style||'panel',public:true,room:e.room,direction:[(w.b[0]-w.a[0])/w.length,(w.b[1]-w.a[1])/w.length],normal:[...w.normal]});
    }
  }
  if(r.noWindows)for(const f of b.floors)f.walls=f.walls.filter(w=>!w.interior);
  // Full internal partitions, with a .12 m cap at each native datum. Stable panels are separate low components.
  for(const f of b.floors)for(const w of f.walls)w.datumCap=true;
  b.windows=b.floors.flatMap(f=>f.walls.flatMap(w=>w.openings.filter(o=>o.type==='window'&&!o.continuation).map(o=>({
    ...o,wallId:w.id,origin:[w.a[0],f.height,w.a[1]],direction:[(w.b[0]-w.a[0])/w.length,(w.b[1]-w.a[1])/w.length]}))));
  b.stallBays=r.stallRows?.flatMap(row=>Array.from({length:r.width/2},(_,i)=>({
    id:row.face+'-'+i,x:i*2,y:row.y,width:2,depth:4,partitionHeight:1.4,clearFront:1.8,source:'Authored open stall layout; not a measured horse-capacity plan.'
  })))||[];
  b.sourcePolicy=r.adaptation;b.consumerSupport={editorProvider:false,navigation:false,collision:false,fire:false};
  return b;
}
export function fortFloorSvg(input,level){const b=input?.schema?input:compileFort(input);return measuredFloorSvg(b,level);}
export const FORT_SCENES=freeze([
  {id:'fort-apache-parade-slice',name:'Parade-ground relationship study',width:112,depth:112,scale:[1,1,1],north:[0,-1],
    status:'Representative slice, not a georeferenced reconstruction. East–west frontage and north/south relationships retained; distances are authored.',
    placements:[{assetId:'fort-apache-quarters-6',position:[64,0,18],yaw:Math.PI,scale:[1,1,1]},
      {assetId:'fort-apache-barracks-17',position:[26,0,76],yaw:0,scale:[1,1,1]}],
    parade:{x:16,y:25,width:80,depth:43},boardwalks:[{x:24,y:19,width:70,depth:2},{x:24,y:70,width:66,depth:2}],
    excluded:'Remaining parade buildings, complete post spacing, palisade, school-era works and replica street lamps.'},
  {id:'fort-apache-stable-yard-slice',name:'Stable-yard module study',width:64,depth:48,scale:[1,1,1],north:[0,-1],
    status:'Separate southeastern service-area study; no claim that it adjoins the parade slice at this spacing.',
    placements:[{assetId:'fort-apache-stable-bay-range',position:[20,0,18],yaw:0,scale:[1,1,1]}],
    yard:{x:12,y:10,width:40,depth:28},excluded:'Other full-length stable rows, corral, granary and later dairy conversions.'}
]);
