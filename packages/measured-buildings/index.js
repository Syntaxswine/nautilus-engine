import {MEASURED_RECIPES,measuredRecipe} from './designs.js';
export {MEASURED_RECIPES,measuredRecipe};
export const MEASURED_CONTRACT=Object.freeze({schema:'nautilus-measured-building-art',version:1,metresPerUnit:1,
  scale:Object.freeze([1,1,1]),groundAxes:Object.freeze(['x','y']),renderAxes:Object.freeze(['x','height','y']),origin:'front-left footprint corner at ground floor datum',
  wallHeight:2,wallThickness:.16,slabThickness:.12,floorInterval:2.12,grid:.5,maxLevels:6,maxMapExtent:240,
  status:'Descriptive art assembly; shared editor provider, persistence and game capabilities require separate integration.'});
const S=.5,key=(x,y)=>x+','+y,clone=v=>structuredClone(v);
export function measuredErrors(r) {
  const errors=[];
  if (!r||!/^[-a-z0-9]+$/.test(r.id||'')) return ['A stable measured asset ID is required.'];
  if (![r.width,r.depth,r.levels,r.bay].every(Number.isFinite)||r.width>238||r.depth>238||r.width<1||r.depth<1||
      !Number.isInteger(r.levels)||r.levels<1||r.levels>6||r.bay<1) errors.push('Keep the complete native building inside the six layers and 240 m map.');
  if (!Array.isArray(r.floors)||r.floors.length!==r.levels) return [...errors,'Describe every standard level, including omitted slabs.'];
  if(!r.window||![r.window.width,r.window.height,r.window.bottom].every(Number.isFinite)||r.window.width<=0||r.window.width>=r.bay||r.window.bottom<0||
    r.window.height<=0||r.window.height+r.window.bottom>2||r.window.tallHeight!==undefined&&(!Number.isFinite(r.window.tallHeight)||r.window.tallHeight+r.window.bottom>4.24))errors.push('Keep window modules finite and within their declared standard spans.');
  if(!r.tint||Object.values(r.tint).some(t=>!Array.isArray(t)||t.length!==3||t.some(n=>!Number.isFinite(n)||n<0||n>1)))errors.push('Use finite legal material tints.');
  for (const [i,f] of r.floors.entries()) {
    if (f.level!==i||!f.rooms?.length) errors.push('Floor levels must be consecutive standard datums.');
    const cells=new Set(),ids=new Set();
    for (const room of f.rooms||[]) {
      if (!room.id||ids.has(room.id)) errors.push('Unique room IDs are required on each floor.');ids.add(room.id);
      if (![room.x,room.y,room.width,room.depth].every(n=>Number.isFinite(n)&&Number.isInteger(n/S))||room.width<=0||room.depth<=0||
          room.x<0||room.y<0||room.x+room.width>r.width||room.y+room.depth>r.depth) {errors.push('Room rectangles must fit the half-metre footprint grid.');continue;}
      for(let x=room.x/S;x<(room.x+room.width)/S;x++)for(let y=room.y/S;y<(room.y+room.depth)/S;y++){
        const k=key(x,y);if(cells.has(k))errors.push('Room rectangles may not overlap.');cells.add(k);
      }
    }
    for(const hole of f.holes||[])if(![hole.x,hole.y,hole.width,hole.depth].every(n=>Number.isFinite(n)&&Number.isInteger(n/S))||hole.width<=0||hole.depth<=0)errors.push('Floor openings must use finite half-metre rectangles.');
  }
  for(const core of r.cores||[])if(![core.x,core.y,core.width,core.depth].every(n=>Number.isFinite(n)&&Number.isInteger(n/S))||
    core.width<3||core.depth<4||core.levels.some(l=>!Number.isInteger(l)||l<0||l>=r.levels))errors.push('Use standard aligned stair cores with deliberate upper slab holes.');
  for(const roof of r.roofs||[])if(!Number.isInteger(roof.level)||roof.level<1||roof.level>6||!['hip','gable','flat','dome'].includes(roof.type)||
    ![roof.x,roof.y,roof.width,roof.depth,roof.rise].every(Number.isFinite)||roof.width<=0||roof.depth<=0||roof.rise<0)errors.push('Roof attachments must use finite dimensions and supported standard level datums.');
  return [...new Set(errors)];
}
function wallGroups(cells,level) {
  const groups=new Map();
  for(const c of cells.values())for(const [dx,dy,a,b] of [[0,-1,[c.x*S,c.y*S],[(c.x+1)*S,c.y*S]],
    [1,0,[(c.x+1)*S,c.y*S],[(c.x+1)*S,(c.y+1)*S]],
    [0,1,[(c.x+1)*S,(c.y+1)*S],[c.x*S,(c.y+1)*S]],[-1,0,[c.x*S,(c.y+1)*S],[c.x*S,c.y*S]]]) {
    const n=cells.get(key(c.x+dx,c.y+dy));if(n?.room===c.room||(n&&c.room>n.room))continue;
    const axis=a[1]===b[1]?'x':'y',fixed=axis==='x'?a[1]:a[0],sign=axis==='x'?Math.sign(b[0]-a[0]):Math.sign(b[1]-a[1]),
      rooms=[c.room,n?.room||'outside'],k=[axis,fixed,sign,...rooms].join(':');
    if(!groups.has(k))groups.set(k,{axis,fixed,sign,rooms,starts:[],interior:!!n});
    groups.get(k).starts.push(Math.min(axis==='x'?a[0]:a[1],axis==='x'?b[0]:b[1]));
  }
  const walls=[];
  for(const g of groups.values()) {
    const starts=[...new Set(g.starts)].sort((a,b)=>a-b);let start=starts[0],end=start+S;
    const emit=()=>{const p=u=>g.axis==='x'?[u,g.fixed]:[g.fixed,u],a=p(g.sign>0?start:end),b=p(g.sign>0?end:start);
      walls.push({id:'L'+level+'-wall-'+walls.length,level,a,b,length:end-start,normal:[(b[1]-a[1])/(end-start),-(b[0]-a[0])/(end-start)],
        rooms:g.rooms,interior:g.interior,wallHeight:2,datumBand:.12,thickness:.16,openings:[]});};
    for(const value of starts.slice(1)){if(Math.abs(value-end)<1e-8)end+=S;else{emit();start=value;end=value+S;}}emit();
  }
  return walls;
}
function along(w,p){return ((p[0]-w.a[0])*(w.b[0]-w.a[0])+(p[1]-w.a[1])*(w.b[1]-w.a[1]))/w.length;}
function opening(w,o){o.id??=w.id+'-opening-'+w.openings.length;o.rooms=[...w.rooms];w.openings.push(o);}
function hasPoint(w,p){const u=along(w,p),cross=(p[0]-w.a[0])*(w.b[1]-w.a[1])-(p[1]-w.a[1])*(w.b[0]-w.a[0]);return Math.abs(cross)<1e-6&&u>0&&u<w.length;}
export function compileMeasured(input) {
  const r=typeof input==='string'?measuredRecipe(input):clone(input),errors=measuredErrors(r);if(errors.length)throw Error(errors.join(' '));
  const floors=[],stairs=[];
  for(const f of r.floors) {
    const rooms=f.rooms.map(room=>({...room,id:'L'+f.level+':'+room.id,localId:room.id,area:room.width*room.depth,windowIds:[]})),
      byId=new Map(rooms.map(room=>[room.id,room])),cells=new Map();
    for(const room of rooms)for(let x=room.x/S;x<(room.x+room.width)/S;x++)for(let y=room.y/S;y<(room.y+room.depth)/S;y++)cells.set(key(x,y),{x,y,room:room.id});
    const walls=wallGroups(cells,f.level).filter(w=>!w.interior||!w.rooms.every(id=>byId.get(id)?.omitSlab)||
      !byId.get(w.rooms[0])?.volume||byId.get(w.rooms[0]).volume!==byId.get(w.rooms[1]).volume),prefix=id=>'L'+f.level+':'+id;
    // Each room joins its corridor/core neighbour. Extra documented links are explicit.
    const pairs=new Set((r.connections||[]).map(p=>p.map(prefix).sort().join('|')));
    for(const w of walls.filter(w=>w.interior)) {
      const pair=w.rooms.map(id=>byId.get(id));
      if(!pair.some(room=>room?.omitSlab)&&(pair.some(room=>room?.type==='circulation')||pairs.has([...w.rooms].sort().join('|')))) {
        const stall=pair.some(room=>room?.type==='stall'),hall=pair.every(room=>room?.type==='circulation'),width=stall?w.length:Math.min(w.length-.3,hall?3:pair.some(room=>room?.type==='ward')?2:1);
        if(width>=.8)opening(w,{type:stall||hall?'doorway':width>1?'paired':'single',u0:(w.length-width)/2,u1:(w.length+width)/2,bottom:0,top:stall||hall?2:1.65, ...(stall?{kind:'open-stall-front',counterClearGap:1.05}:{} )});
      }
    }
    for(const e of (r.entries||[]).filter(e=>e.level===f.level)) {
      const w=walls.find(w=>!w.interior&&w.rooms.includes(prefix(e.room))&&hasPoint(w,e.point));
      if(!w)throw Error('Entry does not meet its exterior room: '+r.id+' '+e.room);
      const u=along(w,e.point);opening(w,{type:e.type,u0:u-e.width/2,u1:u+e.width/2,bottom:0,top:e.type==='paired'?1.85:1.65,public:true});
    }
    for(const w of walls.filter(w=>!w.interior)) {
      const axis=w.a[1]===w.b[1]?0:1,lo=Math.min(w.a[axis],w.b[axis]),hi=Math.max(w.a[axis],w.b[axis]);
      for(let k=Math.floor(lo/r.bay);(k+.5)*r.bay<hi;k++) {
        const at=(k+.5)*r.bay;if(at<lo+.45||at>hi-.45)continue;
        const p=axis===0?[at,w.a[1]]:[w.a[0],at],u=along(w,p),width=r.window.width;
        if(u-width/2<.22||u+width/2>w.length-.22||w.openings.some(o=>u-width/2<o.u1+.15&&u+width/2>o.u0-.15))continue;
        const room=byId.get(w.rooms[0]),baseLevel=room.newWindowBase?f.level:room.openToLevel??f.level,baseRoom=r.floors[baseLevel].rooms.find(q=>q.id===room.localId),span=baseRoom.windowSpan||1,
          fullHeight=span>1?r.window.tallHeight:r.window.height,delta=(f.level-baseLevel)*2.12,low=Math.max(0,r.window.bottom-delta),high=Math.min(2.12,r.window.bottom+fullHeight-delta);
        if(high<=low)continue;
        const o={id:'L'+baseLevel+':window:'+room.localId+':'+w.a.join(',')+':'+w.b.join(',')+':'+at,type:'window',u0:u-width/2,u1:u+width/2,
          bottom:low,top:high,fullHeight,baseLevel,spanLevels:span,continuation:f.level!==baseLevel,component:r.window.profile,
          columns:span>1?r.window.tallColumns||4:r.window.columns,rows:span>1?r.window.tallRows||8:r.window.rows};
        if(o.continuation&&!floors[baseLevel]?.walls.some(q=>q.openings.some(p=>p.type==='window'&&p.id===o.id)))continue;
        opening(w,o);byId.get(w.rooms[0]).windowIds.push(o.id);
      }
    }
    const holes=[...(r.cores||[]).filter(c=>c.levels.includes(f.level)&&f.level>Math.min(...c.levels)).map(c=>({id:c.id+'-hole-L'+f.level,x:c.x,y:c.y,width:c.width,depth:c.depth,coreId:c.id})),...(f.holes||[])];
    const slabRects=rooms.filter(room=>!room.omitSlab).map(({x,y,width,depth})=>({x,y,width,depth}));
    for(const room of rooms){room.areaPolicy='Gross authored rectangle; slabArea excludes explicit voids and holes.';let area=0;
      if(!room.omitSlab)for(let x=room.x+.25;x<room.x+room.width;x+=.5)for(let y=room.y+.25;y<room.y+room.depth;y+=.5)if(!holes.some(h=>x>h.x&&x<h.x+h.width&&y>h.y&&y<h.y+h.depth))area+=.25;
      room.slabArea=area;
    }
    floors.push({level:f.level,height:f.level*2.12,rooms,walls,holes,slabRects});
  }
  for(const core of r.cores||[])for(const level of core.levels.slice(0,-1))stairs.push({id:core.id+'-'+level,coreId:core.id,fromLevel:level,toLevel:level+1,
    base:level*2.12,rise:2.12,rect:{x:core.x,y:core.y,width:3,depth:4},risers:14,run:2.8,landingDepth:1.2,flightWidth:1.3,gap:.4,room:core.room,
    yaw:Math.PI,lowerAttachment:[core.x+2.35,level*2.12,core.y+4],upperAttachment:[core.x+.65,(level+1)*2.12,core.y+4]});
  return {schema:MEASURED_CONTRACT.schema,version:1,id:r.id,name:r.name,collection:r.collection,sourceId:r.sourceId,recipe:r,
    contract:clone(MEASURED_CONTRACT),width:r.width,depth:r.depth,levels:r.levels,floors,stairs,
    roofs:r.roofs.map(roof=>({...roof,datum:roof.level*2.12})),consumerSupport:{editorProvider:false,navigation:false,collision:false,fire:false},
    sourcePolicy:r.adaptation};
}
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function measuredFloorSvg(input,level) {
  const b=input?.schema?input:compileMeasured(input),f=b.floors[level];if(!f)throw Error('Unknown standard floor.');
  const extras=[...(b.recipe.balconies||[]).filter(v=>v.levels.includes(level)),...(b.recipe.porticoes||[]).filter(p=>p.level===level)],rects=[...f.rooms,...extras],
    minX=Math.min(...rects.map(r=>r.x)),minY=Math.min(...rects.map(r=>r.y)),maxX=Math.max(...rects.map(r=>r.x+r.width)),maxY=Math.max(...rects.map(r=>r.y+r.depth)),
    x=p=>60+(p-minX)*22,y=p=>100+(p-minY)*22,W=(maxX-minX)*22+120,H=(maxY-minY)*22+180;
  const colors={ward:'#d2e6df',circulation:'#eee3bd',stair:'#d0dadd',service:'#e2d7cc'};
  let body=`<rect width="100%" height="100%" fill="#f3f0e4"/><g font-family="Georgia,serif" fill="#243b32"><text x="50" y="38" font-size="23">${esc(b.name)}</text><text x="50" y="65" font-size="14">Level ${level} · datum ${f.height.toFixed(2)} m · native 2.12 m intervals · adapted plan</text></g>`;
  for(const r of extras)body+=`<rect x="${x(r.x)}" y="${y(r.y)}" width="${r.width*22}" height="${r.depth*22}" fill="#ebe2c2" stroke="#a39a78"/><text x="${x(r.x+r.width/2)}" y="${y(r.y+r.depth/2)}" text-anchor="middle" font-family="sans-serif" font-size="10">${r.id.includes('portico')?'Portico':'Veranda'}</text>`;
  for(const r of f.rooms){body+=`<rect x="${x(r.x)}" y="${y(r.y)}" width="${r.width*22}" height="${r.depth*22}" fill="${r.omitSlab?'#fbf9f0':colors[r.type]||'#e8e7d8'}" stroke="#c6c6b6"/>`;
    const words=(r.name+(r.omitSlab?' (open below)':'')).split(' '),lines=[];let line='';for(const word of words){if((line+' '+word).length>Math.floor(r.width*2.5)&&line){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
    body+=`<text x="${x(r.x+r.width/2)}" y="${y(r.y+r.depth/2)-lines.length*5}" text-anchor="middle" font-family="sans-serif" font-size="${r.width<4?8:11}" fill="#29443b">${lines.map((s,i)=>`<tspan x="${x(r.x+r.width/2)}" dy="${i?12:0}">${esc(s)}</tspan>`).join('')}</text>`;
  }
  for(const w of f.walls){const dx=(w.b[0]-w.a[0])/w.length,dy=(w.b[1]-w.a[1])/w.length,P=u=>[x(w.a[0]+dx*u),y(w.a[1]+dy*u)];
    const cut=[0,...w.openings.filter(o=>o.type!=='window').flatMap(o=>[o.u0,o.u1]),w.length].sort((a,b)=>a-b);
    for(let i=0;i<cut.length-1;i++){const mid=(cut[i]+cut[i+1])/2;if(w.openings.some(o=>o.type!=='window'&&mid>o.u0&&mid<o.u1))continue;const a=P(cut[i]),c=P(cut[i+1]);body+=`<path d="M${a}L${c}" stroke="#304339" stroke-width="3.52"/>`;}
    for(const o of w.openings){const a=P(o.u0),c=P(o.u1);if(o.type==='window')body+=`<path d="M${a}L${c}" stroke="#4d98ad" stroke-width="4.5"/>`;
      else if(o.type!=='doorway'){const paired=o.type==='paired',width=(o.u1-o.u0)*22/(paired?2:1);for(const [p,sign,side]of paired?[[a,1,'left'],[c,-1,'right']]:[[a,1,'single']]){const tip=[p[0]+dy*width,p[1]-dx*width],meet=[p[0]+dx*width*sign,p[1]+dy*width*sign];body+=`<path data-door-leaf="${side}" d="M${p}L${tip}M${tip}A${width},${width} 0 0 ${sign>0?1:0} ${meet}" fill="none" stroke="#947b4f" stroke-width="1"/>`;}}}
  }
  for(const h of f.holes)body+=`<rect x="${x(h.x)}" y="${y(h.y)}" width="${h.width*22}" height="${h.depth*22}" fill="none" stroke="#62768b" stroke-dasharray="5 3"/><text x="${x(h.x+.2)}" y="${y(h.y+.4)}" font-size="8">${h.kind==='atrium'?'open rotunda below':'stair slab hole'}</text>`;
  body+=`<path d="M60,${H-45}h110m-110,-5v10m110,-10v10" stroke="#243b32"/><text x="90" y="${H-25}" font-family="sans-serif" font-size="12">5 metres</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(b.name)} level ${level}">${body}</svg>`;
}
