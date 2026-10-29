// Headless authoring data; optional Three adapter lives in three.js.
import {compileMeasured,measuredFloorSvg} from '../measured-buildings/index.js';
import {VARIANT_BUILDINGS,VARIANT_PARTS,variantRecipe,variantPart,WALK,freeze} from './designs.js';
export {VARIANT_BUILDINGS,VARIANT_PARTS,variantRecipe,variantPart,WALK};
export const VARIANT_CONTRACT=freeze({schema:'nautilus-fort-variant-art',version:1,metresPerUnit:1,scale:[1,1,1],
  origin:'Each module states its own origin; assembly instances carry explicit transforms.',
  groundAxes:['x','y'],renderAxes:['x','height','y'],wallHeight:2,wallThickness:.16,slabThickness:.12,floorInterval:2.12,
  placementGrid:3,footprintGrid:.5,maxLevels:6,maxMapExtent:240,walk:WALK,
  defensiveExceptions:{castleRampartBodyDepth:1.82,castleParapetThickness:.32,castleMerlonTop:3.42,cycloneWirePitch:.15,cycloneWireDiameter:.009,gateLeafThickness:.12},
  status:'Modular descriptive art kit. Shared editor persistence, navigation, collision and fire require separate integration.'});
const near=(a,b)=>Math.abs(a-b)<1e-7;
export function alongWall(w,p){
  const dx=w.b[0]-w.a[0],dy=w.b[1]-w.a[1],u=((p[0]-w.a[0])*dx+(p[1]-w.a[1])*dy)/w.length;
  return near((p[0]-w.a[0])*dy,(p[1]-w.a[1])*dx)&&u>1e-7&&u<w.length-1e-7?u:null;
}
export function compileVariant(input){
  const r=typeof input==='string'?variantRecipe(input):structuredClone(input);
  if((r.openInterfaces||[]).some(id=>!r.interfaces.some(p=>p.id===id&&p.optional)))throw Error('Unknown optional interface.');
  const b=compileMeasured({...r,roofs:[],entries:[]});b.schema=VARIANT_CONTRACT.schema;b.contract=structuredClone(VARIANT_CONTRACT);b.recipe=r;
  b.portals=[];b.windows=[];b.roofs=r.roofs.map(a=>({...structuredClone(a),datum:a.level*2.12}));
  for(const f of b.floors){
    const roomMap=new Map(f.rooms.map(r=>[r.id,r]));
    f.walls=f.walls.filter(w=>{
      const a=roomMap.get(w.rooms[0]),c=roomMap.get(w.rooms[1]),ta=a?.type==='terrace',tc=c?.type==='terrace';
      if(ta&&(!w.interior||tc))return false;
      if(ta||tc){
        if(ta){[w.a,w.b]=[w.b,w.a];w.normal=w.normal.map(n=>-n);}
        w.rooms=[(ta?c:a).id,'outside'];w.interior=false;w.openings=[];
      }
      w.openings=w.openings.filter(o=>w.interior&&o.type!=='window');return true;
    });
    for(const w of f.walls.filter(w=>w.interior))for(const o of w.openings)if(o.type!=='doorway')b.portals.push({
      id:o.id,wallId:w.id,level:f.level,point:[w.a[0]+(w.b[0]-w.a[0])*(o.u0+o.u1)/2/w.length,w.a[1]+(w.b[1]-w.a[1])*(o.u0+o.u1)/2/w.length],
      base:f.height,width:o.u1-o.u0,height:o.top-o.bottom,type:o.type,style:'panel',public:false,normal:[...w.normal],
      direction:[(w.b[0]-w.a[0])/w.length,(w.b[1]-w.a[1])/w.length]});
  }
  for(const [i,e]of r.entries.entries()){
    const id=r.id+':'+(e.id||'entry-'+i),base=e.level*2.12;
    for(const f of b.floors){
      const bottom=Math.max(0,base-f.height),top=Math.min(2.12,base+e.height-f.height);if(top<=bottom)continue;
      const w=f.walls.find(w=>!w.interior&&w.rooms.includes('L'+f.level+':'+e.room)&&alongWall(w,e.point)!==null);
      if(!w)throw Error('Entry misses its room: '+id+' L'+f.level);
      const u=alongWall(w,e.point);if(u-e.width/2< -1e-7||u+e.width/2>w.length+1e-7)throw Error('Entry escapes its wall: '+id);
      w.openings.push({id,type:e.type,public:true,continuation:f.level!==e.level,u0:u-e.width/2,u1:u+e.width/2,bottom,top,fullHeight:e.height,style:e.style||'panel'});
      if(f.level===e.level)b.portals.push({id,wallId:w.id,level:e.level,point:[...e.point],base,width:e.width,height:e.height,type:e.type,
        style:e.style||'panel',public:true,normal:[...w.normal],direction:[(w.b[0]-w.a[0])/w.length,(w.b[1]-w.a[1])/w.length]});
    }
  }
  for(const [i,o]of r.openings.entries()){
    const f=b.floors[o.level],w=f?.walls.find(w=>!w.interior&&alongWall(w,o.point)!==null);if(!w)throw Error('Window misses an exterior wall: '+r.id+' '+i);
    const u=alongWall(w,o.point),lo=u-o.width/2,hi=u+o.width/2;
    if(lo<.12||hi>w.length-.12||o.bottom<0||o.bottom+o.height>2)throw Error('Window escapes standard wall: '+r.id+' '+i);
    if(w.openings.some(p=>lo<p.u1+.04&&hi>p.u0-.04))throw Error('Window overlaps a portal: '+r.id+' '+i);
    const win={id:r.id+':window-'+i,type:'window',u0:lo,u1:hi,bottom:o.bottom,top:o.bottom+o.height,glazed:o.glazed!==false,
      style:o.style||'sash',columns:o.columns||2,rows:o.rows||2};
    w.openings.push(win);b.windows.push({...win,wallId:w.id,level:o.level,origin:[w.a[0],f.height,w.a[1]],
      direction:[(w.b[0]-w.a[0])/w.length,(w.b[1]-w.a[1])/w.length]});
  }
  b.auxiliaryStairs=r.separateStair?[{id:r.id+':exterior-stair',fromLevel:0,toLevel:1,rise:2.12,risers:14,run:2.8,flightWidth:1.3,minimumClearFlightWidth:1.25,
    rect:{x:r.separateStair.x,y:r.separateStair.y,width:3,depth:4},material:r.separateStair.material,
    upperLanding:{x:r.separateStair.x,y:r.separateStair.y+4,width:3,depth:r.separateStair.landingDepth||1,height:2.12},
    lowerFlightAttachment:[r.separateStair.x+2.35,0,r.separateStair.y+4],upperFlightAttachment:[r.separateStair.x+.65,2.12,r.separateStair.y+4],
    upperExit:[r.separateStair.x+(r.separateStair.openLandingSide==='east'?3:0),2.12,r.separateStair.y+4+(r.separateStair.landingDepth||1)/2]}]:[];
  b.roofTerraces=(r.flatRoofs||[]).map(q=>({...structuredClone(q),height:q.level*2.12}));
  b.consumerSupport={editorProvider:false,navigation:false,collision:false,fire:false};
  b.sourcePolicy=r.adaptation;b.interfaces=structuredClone(r.interfaces);
  return b;
}
export function variantFloorSvg(input,level){
  const b=structuredClone(input?.schema?input:compileVariant(input)),f=b.floors[level];if(!f)throw Error('Unknown standard floor.');
  const extras=[...(b.recipe.porches||[]).filter(p=>p.levels.includes(level)).map(p=>({...p,name:'Porch',type:'terrace'})),
    ...(b.recipe.externalStair?[{x:0,y:0,width:3,depth:5.5,name:'Exterior U stair',type:'stair'}]:[]),
    ...(b.auxiliaryStairs||[]).map(s=>({...s.rect,depth:4+s.upperLanding.depth,name:'Exterior U stair',type:'stair'}))];
  for(const [i,r]of extras.entries())if(!f.rooms.some(q=>r.x>=q.x&&r.y>=q.y&&r.x+r.width<=q.x+q.width&&r.y+r.depth<=q.y+q.depth))
    f.rooms.push({...r,id:'plan-extra-'+i,omitSlab:false});
  const minX=Math.min(...f.rooms.map(r=>r.x)),minY=Math.min(...f.rooms.map(r=>r.y)),x=p=>60+(p-minX)*22,y=p=>100+(p-minY)*22;
  let svg=measuredFloorSvg(b,level).replace('adapted plan','fictional module plan'),lines='';
  const stairs=[...b.stairs.filter(s=>s.fromLevel===level||s.toLevel===level).map(s=>s.rect),...(b.auxiliaryStairs||[]).map(s=>s.rect)];
  for(const r of stairs){
    lines+=`<g stroke="#756a52" stroke-width="1" fill="none"><rect x="${x(r.x)}" y="${y(r.y)}" width="66" height="88"/>`;
    for(let i=0;i<7;i++)for(const at of[0,1.7])lines+=`<path d="M${x(r.x+at)},${y(r.y+4-(i+.5)*.4)}h28.6"/>`;
    lines+='</g>';
  }
  const opening=svg.match(/^<svg[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>/),oldWidth=Number(opening[1]),height=Number(opening[2]),width=Math.max(620,oldWidth),
    content=svg.slice(opening[0].length,-6).replace(/^<rect[^>]*\/><g font-family="Georgia,serif"[^>]*>.*?<\/g>/,''),
    name=b.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height+50}" role="img" aria-label="${name} level ${level}"><rect width="100%" height="100%" fill="#f3f0e4"/><g font-family="Georgia,serif" fill="#243b32"><text x="30" y="30" font-size="22">${name}</text><text x="30" y="53" font-size="13">Level ${level} · datum ${f.height.toFixed(2)} m · fictional module plan</text><text x="30" y="74" font-size="12">Native metres · 2.12 m level intervals · original authored dimensions</text></g><g transform="translate(${(width-oldWidth)/2},50)">${content}${lines}</g></svg>`;
}
export function transformPoint(p,instance){const c=Math.cos(instance.yaw||0),s=Math.sin(instance.yaw||0);return[
  instance.position[0]+p[0]*c+p[2]*s,instance.position[1]+p[1],instance.position[2]-p[0]*s+p[2]*c];}
export function worldSockets(instance){
  const r=VARIANT_BUILDINGS.find(r=>r.id===instance.assetId)||VARIANT_PARTS.find(r=>r.id===instance.assetId);if(!r)throw Error('Unknown assembly module.');
  const c=Math.cos(instance.yaw||0),s=Math.sin(instance.yaw||0);
  return r.interfaces.filter(p=>!p.optional||instance.openInterfaces?.includes(p.id)).map(p=>({
    ...structuredClone(p),instance:instance.id,key:instance.id+':'+p.id,position:transformPoint(p.position,instance),walk:transformPoint(p.walk,instance),
    out:[p.out[0]*c+p.out[1]*s,-p.out[0]*s+p.out[1]*c]}));
}
export function validateLayout(layout){
  const errors=[],sockets=layout.instances.flatMap(worldSockets),connections=[],used=new Set();
  if(layout.scale?.some(v=>v!==1))errors.push('Keep scale [1,1,1].');
  if(![layout.width,layout.depth].every(v=>Number.isFinite(v)&&v>0&&v<=240))errors.push('Keep the complete map at or below 240 m.');
  for(const p of sockets){
    if(used.has(p.key))continue;
    const peers=sockets.filter(q=>q.key!==p.key&&Math.hypot(...p.position.map((n,i)=>n-q.position[i]))<1e-6);
    if(peers.length!==1){errors.push('Unmatched or ambiguous wall socket: '+p.key);continue;}
    const q=peers[0];
    if(p.profile!==q.profile||p.out[0]*q.out[0]+p.out[1]*q.out[1]>-.999999||Math.hypot(...p.walk.map((n,i)=>n-q.walk[i]))>1e-6||p.walkWidth!==q.walkWidth||p.minimumClearWidth!==q.minimumClearWidth||p.minimumClearHeight!==q.minimumClearHeight)
      errors.push('Mismatched wall / walkway interface: '+p.key+' / '+q.key);
    used.add(p.key);used.add(q.key);connections.push({a:p.key,b:q.key,position:p.position,walk:p.walk,profile:p.profile});
  }
  // The perimeter must be one closed component, with two paired sockets on every perimeter module.
  const ids=new Set(sockets.map(p=>p.instance)),visited=new Set(),visit=id=>{if(visited.has(id))return;visited.add(id);for(const e of connections){
    const a=e.a.slice(0,e.a.lastIndexOf(':')),b=e.b.slice(0,e.b.lastIndexOf(':'));if(a===id)visit(b);if(b===id)visit(a);}};
  if(ids.size)visit(ids.values().next().value);if(visited.size!==ids.size)errors.push('Perimeter has disconnected components.');
  for(const i of layout.instances)if(!i.position.every(Number.isFinite)||!Number.isFinite(i.yaw||0)||Math.abs((i.yaw||0)/(Math.PI/2)-Math.round((i.yaw||0)/(Math.PI/2)))>1e-7||i.scale?.some(v=>v!==1))errors.push('Use unit scale and quarter-turn instance rotations.');
  return {errors,connections,perimeterModules:ids.size,closed:!errors.length&&ids.size>=4&&connections.length===ids.size};
}
