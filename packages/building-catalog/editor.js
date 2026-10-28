// Native AFT/Nautilus map construction. All geometry is painted by the same
// brush implementation as the game's editor; no display mesh enters the map.
import {compileBuilding} from './index.js';
import {createEditor, applyBrush} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/editor-model.js';
import {blankMap, edgeKey, edgeCells, terrainAt, validateMap} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {EDGES, floorTerrain} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';
import {extractBlock, validateBlock} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/blocks.js';

const key = (x,y) => x + ',' + y;
const directions = [[1,0],[-1,0],[0,1],[0,-1]];
const boundary = (x,y,dx,dy,z) => dx ? edgeKey('e', dx > 0 ? x : x-1, y, z) : edgeKey('s', x, dy > 0 ? y : y-1, z);
const wallKind = material => material === 'brick' ? 'wall-brick' : material === 'blue-metal' ? 'wall-corrugated' : 'wall-concrete';
function components(cells) {
  const visited = new Set(), result = [];
  for (const cell of cells.values()) {
    if (visited.has(key(cell.x,cell.y))) continue;
    const pending = [cell], members = []; visited.add(key(cell.x,cell.y));
    while (pending.length) {
      const p = pending.pop(); members.push(p);
      for (const [dx,dy] of directions) {
        const k = key(p.x+dx,p.y+dy), q = cells.get(k);
        if (q && !visited.has(k)) {visited.add(k);pending.push(q);}
      }
    }
    result.push(members);
  }
  return result;
}

// Ordinary cardinal movement, unlocked doors and explicit stairs/ladders.
// Does not rely on skill-dependent window/wall climbing to connect a building.
export function editorBuildingReachability(map, targets, bounds) {
  const code = (x,y,z) => x + ',' + y + ',' + z;
  const first = map.starts[0], seen = new Set([code(first.x,first.y,first.z||0)]), queue = [{...first,z:first.z||0}];
  const stairs = new Set(map.stairs.map(p => code(p.x,p.y,p.z)));
  const allowed = p => p.x >= 0 && p.y >= 0 && p.x <= bounds.maxX+4 && p.y <= bounds.maxY+5 && p.z >= 0 && p.z < map.levels && floorTerrain(terrainAt(map,p.x,p.y,p.z));
  for (let i=0;i<queue.length;i++) {
    const p=queue[i], next=[];
    for(const [dx,dy]of directions){const q={x:p.x+dx,y:p.y+dy,z:p.z},rule=EDGES[map.edges[boundary(p.x,p.y,dx,dy,p.z)]];if(!rule?.solid||rule.opensTo)next.push(q);}
    for(const dz of [-1,1])if(stairs.has(code(p.x,p.y,Math.min(p.z,p.z+dz))))next.push({x:p.x,y:p.y,z:p.z+dz});
    for(const q of next){const k=code(q.x,q.y,q.z);if(!seen.has(k)&&allowed(q)){seen.add(k);queue.push(q);}}
  }
  return {seen, unreached:targets.filter(p=>!seen.has(code(p.x,p.y,p.z)))};
}

export function buildEditorBuilding(input) {
  const source=compileBuilding(input), floors=[], tower=source.tower||source.turret;
  const stories=Math.max(source.stories,tower?.stories||0);
  if(stories>5)throw Error('This editor supports at most five occupied storeys plus a roof.');
  for(let z=0;z<stories;z++){
    const cells=new Map(), f=source.floors[z], rooms=new Map(f?.rooms.map(r=>[r.id,r.name])||[]);
    if(f){const half=new Map(f.cells.map(c=>[key(Math.round(c.x*2),Math.round(c.z*2)),c]));
      for(let y=0;y<source.depth;y++)for(let x=0;x<source.width;x++){
        // Sample just northwest of each tile centre. Half-grid boundaries snap
        // consistently to the next whole metre; footprints stay at unit scale.
        const c=half.get(key(x*2,y*2));if(c)cells.set(key(x,y),{x,y,room:c.room,name:rooms.get(c.room),open:false,roof:'flat'});
      }
    }
    for(const [i,p]of source.parts.entries())if(p.stories>z){for(const c of cells.values())if(c.x>=p.x&&c.x<p.x+p.w&&c.y>=p.z&&c.y<p.z+p.d){if(p.stories===z+1)c.roof=p.roof;if(p.use==='garage'){c.room='L'+z+'-garage-'+i;c.name='Garage';}}}
    if(tower&&tower.stories>z){const x0=tower.r?Math.floor(tower.x-tower.r):tower.x,y0=tower.r?Math.floor(tower.z-tower.r):tower.z,x1=tower.r?Math.ceil(tower.x+tower.r):tower.x+tower.w,y1=tower.r?Math.ceil(tower.z+tower.r):tower.z+tower.d;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(!tower.r||Math.hypot(x+.5-tower.x,y+.5-tower.z)<=tower.r)cells.set(key(x,y),{x,y,room:'L'+z+'-tower',name:tower.r?'Turret room':'Tower room',open:false,roof:'flat'});
    }
    if(z===0)for(const [name,p]of [['Veranda',source.porch],['Breezeway',source.bridge],['Loading apron',source.loadingDock?{x:0,z:-3,w:source.parts[0].w,d:3}:null]])if(p){for(let y=Math.round(p.z);y<Math.round(p.z+p.d);y++)for(let x=Math.round(p.x);x<Math.round(p.x+p.w);x++)if(!cells.has(key(x,y)))cells.set(key(x,y),{x,y,room:name,name,open:true,roof:'flat'});}
    floors.push(cells);
  }
  const all=[...floors.flatMap(f=>[...f.values()])],minX=Math.min(...all.map(p=>p.x)),minY=Math.min(...all.map(p=>p.y)),maxX=Math.max(...all.map(p=>p.x)),maxY=Math.max(...all.map(p=>p.y));
  // Tight lots may use a one-metre border. Preserve physical dimensions rather
  // than rejecting an otherwise valid 23-tile building because of padding.
  const marginX=maxX-minX+1>22?1:2,marginY=maxY-minY+1>22?1:2,offset={x:marginX-minX,y:marginY-minY};
  for(let z=0;z<floors.length;z++)floors[z]=new Map([...floors[z].values()].map(p=>{const q={...p,x:p.x+offset.x,y:p.y+offset.y,z};return[key(q.x,q.y),q];}));
  const bounds={minX:marginX,minY:marginY,maxX:maxX+offset.x,maxY:maxY+offset.y};
  const raw=blankMap(source.name+' · Editor');
  raw.starts=Array.from({length:4},(_,i)=>({x:bounds.minX+i,y:bounds.maxY+3,z:0,character:{id:'char_building_'+source.id.replaceAll('-','_')+'_'+i,displayName:'Workshop start '+(i+1),scriptId:'',category:'squad',faction:'player',attitude:'friendly',combatBehavior:'fight',canTalk:false,dialogueRef:'',canSell:false,shopInventoryRef:'',shopPricingRef:'',references:[]}}));
  raw.exits=[{x:bounds.minX+5,y:bounds.maxY+3,z:0}];
  const editor=createEditor(raw),commands=[],repairs=[];
  function paint(tool,x,y,z,options={},edge){const error=applyBrush(editor,tool,x,y,edge||'',{...options,level:z});if(error)throw Error(source.id+': '+error);commands.push({tool,start:{x,y,z,...edge?{edge}:{}},options});}
  const material=wallKind(source.wall),window=material.replace('wall-','window-'),floorKind=['warehouse','workshop','service','barn','stables'].includes(source.layout)?'ground-concrete':'ground-wood-planks';
  for(const f of floors)for(const c of f.values())paint('texture',c.x,c.y,c.z,{groundKind:c.name==='Loading apron'?'ground-concrete':c.open?'ground-wood-planks':floorKind});
  for(const f of floors)for(const c of f.values())for(const [dx,dy]of directions){const n=f.get(key(c.x+dx,c.y+dy));if(n&&n.room===c.room||c.open&&(!n||n.open))continue;const e=boundary(c.x,c.y,dx,dy,c.z);if(editor.map.edges[e])continue;paint('wall',c.x,c.y,c.z,{edgeKind:!n||n.open?material:'wall-concrete'},e);}
  // Project the authored apertures onto their snapped native wall boundaries.
  for(const f of source.floors)for(const wall of f.walls)for(const opening of wall.openings){const dx=(wall.b[0]-wall.a[0])/wall.length,dy=(wall.b[1]-wall.a[1])/wall.length,a=[wall.a[0]+dx*opening.u0,wall.a[1]+dy*opening.u0],b=[wall.a[0]+dx*opening.u1,wall.a[1]+dy*opening.u1];
    const fixed=Math.round(dx?a[1]:a[0]),start=Math.round(Math.min(dx?a[0]:a[1],dx?b[0]:b[1])),end=Math.max(start+1,Math.round(Math.max(dx?a[0]:a[1],dx?b[0]:b[1])));
    for(let n=start;n<end;n++){const e=dx?edgeKey('s',offset.x+n,offset.y+fixed-1,f.level):edgeKey('e',offset.x+fixed-1,offset.y+n,f.level);if(!editor.map.edges[e])continue;const p=edgeCells(e).find(q=>floors[f.level]?.has(key(q.x,q.y)));if(!p)continue;const kind=opening.type==='window'?window:opening.type==='loading'?'door-steel-closed':'door-wood-closed';if(opening.type==='window'&&EDGES[editor.map.edges[e]]?.opensTo)continue;paint('wall',p.x,p.y,p.z,{edgeKind:kind},e);}
  }
  // Every separated ground-floor mass gets an ordinary entrance.
  for(const component of components(floors[0])){
    const edges=component.flatMap(c=>directions.filter(([dx,dy])=>!floors[0].has(key(c.x+dx,c.y+dy))).map(([dx,dy])=>({c,e:boundary(c.x,c.y,dx,dy,0)})));
    if(edges.some(({e})=>!EDGES[editor.map.edges[e]]?.solid||EDGES[editor.map.edges[e]]?.opensTo))continue;
    const entry=edges.sort((a,b)=>a.c.y-b.c.y||Math.abs(a.c.x-(bounds.minX+bounds.maxX)/2)-Math.abs(b.c.x-(bounds.minX+bounds.maxX)/2))[0];
    paint('wall',entry.c.x,entry.c.y,0,{edgeKind:'door-wood-closed'},entry.e);repairs.push({edge:entry.e,reason:'Ground-floor entrance'});
  }
  // A real native stair portal for each occupied upper-floor component.
  for(let z=1;z<floors.length;z++)for(const component of components(floors[z])){
    const overlap=component.filter(c=>floors[z-1].has(key(c.x,c.y))&&!c.open);
    if(!overlap.length)throw Error(source.id+': upper storey has no supported stair landing.');
    overlap.sort((a,b)=>(a.name==='Hall'?0:1)-(b.name==='Hall'?0:1)||Math.abs(a.x-(offset.x+source.parts[0].w/2))-Math.abs(b.x-(offset.x+source.parts[0].w/2))||a.y-b.y);
    paint('stairs',overlap[0].x,overlap[0].y,z-1);
  }
  const roofs=[],roofAccess=new Set();
  for(let z=1;z<=floors.length;z++){
    const mask=new Map([...floors[z-1].values()].filter(c=>!floors[z]?.has(key(c.x,c.y))).map(c=>[key(c.x,c.y),{...c,z}]));
    for(const group of components(mask)){const p=group.find(c=>!c.open)||group[0];roofAccess.add(p.x+','+p.y+','+z);paint('ladder',p.x,p.y,z-1);}
    for(const c of mask.values()){paint('texture',c.x,c.y,z,{groundKind:'ground-concrete'});roofs.push(c);}
    const used=new Set();
    for(const c of mask.values()){
      const square=[[0,0],[1,0],[0,1],[1,1]].map(([dx,dy])=>({x:c.x+dx,y:c.y+dy,z}));
      if(square.some(p=>!mask.has(key(p.x,p.y))||used.has(key(p.x,p.y))||roofAccess.has(p.x+','+p.y+','+z)))continue;
      const kind=['flat','butterfly','mansard'].includes(c.roof)?'roof-corrugated-flat':'roof-corrugated-sloped';
      paint('roof-tile',c.x,c.y,z,{propKind:kind,rotated:source.parts[0].d>source.parts[0].w});square.forEach(p=>used.add(key(p.x,p.y)));
    }
  }
  const targets=[...floors.flatMap(f=>[...f.values()]),...roofs];
  for(let guard=0;guard<targets.length;guard++){
    const reach=editorBuildingReachability(editor.map,targets,bounds);if(!reach.unreached.length)break;
    let repair;
    for(const p of reach.unreached){for(const [dx,dy]of directions){if(!reach.seen.has((p.x+dx)+','+(p.y+dy)+','+p.z))continue;const e=boundary(p.x,p.y,dx,dy,p.z);if(editor.map.edges[e]){repair={p,e};break;}}if(repair)break;}
    if(!repair)throw Error(source.id+': disconnected native floor cells need a supported connection.');
    paint('wall',repair.p.x,repair.p.y,repair.p.z,{edgeKind:'door-wood-closed'},repair.e);repairs.push({edge:repair.e,reason:'Connect snapped room to ordinary circulation'});
  }
  const map=editor.map,errors=validateMap(map),reach=editorBuildingReachability(map,targets,bounds);if(errors.length||reach.unreached.length)throw Error(source.id+': '+(errors.join(' ')||'Unreachable native rooms.'));
  let block=null,blockReason='';
  if(bounds.maxX<24&&bounds.maxY<24){try{block=validateBlock(extractBlock(map));}catch(error){blockReason=error.message;}}else blockReason='The complete native building footprint exceeds one 24 × 24 sector; use the full map.';
  const report={id:source.id,name:source.name,sourceReferences:source.refs,source:'Original architecture recipe rebuilt with the native game-editor brush implementation',grid:1,metresPerTile:1,offset,occupiedFloors:floors.length,roomCount:new Set(floors.flatMap(f=>[...f.values()].filter(c=>!c.open).map(c=>c.z+'/'+c.room))).size,interiorCells:targets.length-roofs.length,roofCells:roofs.length,stairs:map.stairs.filter(p=>p.kind!=='ladder').length,roofLadders:map.stairs.filter(p=>p.kind==='ladder').length,roofModules:map.props.length,edges:Object.keys(map.edges).length,commands:commands.length,repairs,bounds,blockAvailable:!!block,blockReason,materialMapping:{authored:source.wall,native:material},adaptations:['Half-metre interior partitions snap to the one-metre game grid without scaling the building.','Roofs use supported flat/sloped two-metre editor modules and slab infill; complex sculpted roof profiles are simplified.','Roof hatches use native ladders. Closed doors retain native opening behavior.','Towers/turrets are rebuilt as supported grid rooms with stair access; curved outlines become stepped native walls.','Dormers, domes, cupolas, chimneys, balusters and the mill wheel remain art references rather than unsupported native objects.','The native editor palette supplies materials; the separate sculpt atlas is not substituted into game collision/rendering identifiers.']};
  return {map,block,commands,report,targets,view:{x:(bounds.minX+bounds.maxX)/2,y:(bounds.minY+bounds.maxY)/2,span:Math.max(bounds.maxX-bounds.minX,bounds.maxY-bounds.minY)+9}};
}
