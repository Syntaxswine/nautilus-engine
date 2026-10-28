// Headless placement contract. Rendering and gameplay compilation belong to consumers.
import {BUILDING_ASSETS,GROSS_BUILDING_ASSETS,PREFAB_CATALOGUE,buildingAsset,isPrefabCatalogue,catalogueHasAsset,catalogueForAssets} from './registry.js';
import {terrainAt, edgeCells} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/maps.js';
import {propCells, floorTerrain} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/environment.js';
import {canopyCells} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/editor-canopies.js';
import {wallRunErrors,wallRunsOf,WALL_KIT} from '../map-core/wall-runs.js';
export * from './registry.js';
export const PREFAB_FEATURE = 'nautilus-building-prefabs-v1';
export const MAX_BUILDINGS = 32;
const fail = message => {throw Error(message);};
const rotate = (x,y,turns) => [[x,y],[-y,x],[-x,-y],[y,-x]][turns];
export function buildingTransform(instance) {
  const asset = buildingAsset(instance.asset);
  if (!asset) fail('Unknown building asset: '+instance.asset);
  if (!Number.isInteger(instance.turns) || instance.turns < 0 || instance.turns > 3) fail('Building rotation must be 0, 1, 2 or 3 quarter turns.');
  const [a,b,c,d] = asset.bounds, points = [[a,b],[a,d],[c,b],[c,d]].map(([x,y]) => rotate(x,y,instance.turns));
  const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]), minX=Math.min(...xs), minY=Math.min(...ys);
  const spanX=Math.max(...xs)-minX, spanY=Math.max(...ys)-minY, width=Math.ceil(spanX), depth=Math.ceil(spanY);
  return {width,depth,angle:-instance.turns*Math.PI/2,
    x:instance.x-.5-minX+(width-spanX)/2, y:instance.y-.5-minY+(depth-spanY)/2};
}
export function buildingLot(instance, margin = 0) {
  const {width,depth} = buildingTransform(instance);
  return {x:instance.x-margin,y:instance.y-margin,width:width+margin*2,depth:depth+margin*2};
}
export function buildingCells(instance) {
  const lot=buildingLot(instance),cells=[];
  for(let y=lot.y;y<lot.y+lot.depth;y++)for(let x=lot.x;x<lot.x+lot.width;x++)cells.push({x,y,z:0});
  return cells;
}
export const lotsOverlap = (a,b) => a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.depth && a.y+a.depth > b.y;
const contains = (lot,p) => p.x>=lot.x && p.y>=lot.y && p.x<lot.x+lot.width && p.y<lot.y+lot.depth;

function prefabData(map) {
  const data=map?.buildingPrefabs;if(data===undefined)return null;
  if(map.kind==='red-shift-block')fail('Building prefabs belong to full maps. The block format does not support them.');
  if(map.version!==2||map.width!==240||map.height!==240||!Number.isInteger(map.levels)||map.levels<3||map.levels>6)fail('Building prefabs require the full aft-map-v2 format; legacy maps and placeholder recipes cannot preserve this extension.');
  if(!data||typeof data!=='object'||Array.isArray(data)||data.version!==1||!isPrefabCatalogue(data.catalogue)||!Array.isArray(data.instances)||data.instances.length>MAX_BUILDINGS)fail('Unsupported building prefab catalogue/version, or more than '+MAX_BUILDINGS+' buildings.');
  return data;
}
// Reserve the complete lot/clearance on every authored layer, like the existing
// upper-floor reservation. This is conservative authoring occupancy, not actor
// navigation or a building collision compiler. SAT keeps diagonal empty corners
// available while including wall thickness and contact at closed boundaries.
function wallIntersectsLot(run,lot) {
  const dx=run.b[0]-run.a[0],dy=run.b[1]-run.a[1],length=Math.hypot(dx,dy),u=[dx/length,dy/length],n=[-u[1],u[0]];
  const offset=[(run.a[0]+run.b[0])/2-(lot.x+(lot.width-1)/2),(run.a[1]+run.b[1])/2-(lot.y+(lot.depth-1)/2)];
  return [[1,0],[0,1],u,n].every(axis=>{
    const wall=length/2*Math.abs(axis[0]*u[0]+axis[1]*u[1])+WALL_KIT.thickness/2*Math.abs(axis[0]*n[0]+axis[1]*n[1]);
    const bounds=lot.width/2*Math.abs(axis[0])+lot.depth/2*Math.abs(axis[1]);
    return Math.abs(offset[0]*axis[0]+offset[1]*axis[1])<=wall+bounds+1e-6;
  });
}

// A reusable index for one placement pass; no DOM, renderer or mutable global state.
function siteIndex(map) {
  const wallErrors=wallRunErrors(map);if(wallErrors.length)fail(wallErrors.join(' '));
  const occupied=new Set(),add=p=>occupied.add(p.x+','+p.y);
  for(const field of ['starts','guards','exits','stairs','climbs'])for(const p of map[field]||[]) {
    add(p);if(field==='climbs')add({x:p.x+p.dx,y:p.y+p.dy});
    for(const q of p.patrol||[])add(q);
  }
  for(const p of map.props||[])for(const cell of propCells(p))add(cell);
  for(const p of map.canopies||[])for(const cell of canopyCells(p))add(cell);
  for(const edge of Object.keys(map.edges||{}))for(const p of edgeCells(edge))add(p);
  for(const layer of map.upper||[])for(const key of Object.keys(layer))if(layer[key]!=='void')occupied.add(key);
  for(const key of Object.keys(map.foliage||{}))occupied.add(key.split(',').slice(0,2).join(','));
  for(const key of Object.keys(map.landPaint||{}))occupied.add(key);
  return occupied;
}
function instanceError(map,instance,others,occupied) {
  if(!instance || typeof instance!=='object' || Array.isArray(instance) || typeof instance.id!=='string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(instance.id))return 'Each building needs a stable ID of 1–64 letters, digits, underscores or hyphens.';
  if(!buildingAsset(instance.asset))return 'Unknown building asset: '+instance.asset;
  if(![instance.x,instance.y,instance.turns,instance.clearance].every(Number.isInteger) || instance.turns<0 || instance.turns>3 || instance.clearance<1 || instance.clearance>8)return 'Use integer building coordinates, 0–3 quarter turns and 1–8 metres of clearance.';
  const lot=buildingLot(instance,instance.clearance),size=map.kind==='red-shift-block'?24:240;
  if(lot.x<0 || lot.y<0 || lot.x+lot.width>size || lot.y+lot.depth>size)return 'The building, overhangs and clearance must fit inside the map.';
  if(wallRunsOf(map).some(run=>wallIntersectsLot(run,lot)))return 'A wall run intersects the building lot or its access clearance. Move the entire wall thickness outside the reserved lot.';
  for(const other of others){
    if(other.id===instance.id)return 'Building IDs must be unique.';
    if(lotsOverlap(buildingLot(instance,Math.max(instance.clearance,other.clearance)),buildingLot(other)))return 'Building lots or their access clearance overlap.';
  }
  for(let y=lot.y;y<lot.y+lot.depth;y++)for(let x=lot.x;x<lot.x+lot.width;x++) {
    const terrain=terrainAt(map,x,y,0);
    if(!floorTerrain(terrain) || /woodland|wetland|bog/.test(terrain) || occupied.has(x+','+y))return 'Buildings need clear, flat ground, including their access clearance. Move terrain relief, foliage, geometry and markers first.';
  }
  return '';
}
export function prefabErrors(map) {
  if(map?.buildingPrefabs===undefined)return [];
  try {
    const data=prefabData(map);
    const occupied=siteIndex(map),prior=[];
    for(const instance of data.instances){
      if(!catalogueHasAsset(data.catalogue,instance?.asset))fail('The building asset is not part of this pinned prefab catalogue: '+instance?.asset);
      const error=instanceError(map,instance,prior,occupied);if(error)fail(error);prior.push(instance);
    }
    return [];
  } catch(error) {return [error.message];}
}
export function assertPrefabBlock(block) {
  if(block?.buildingPrefabs!==undefined)fail('Building prefabs cannot be stored in legacy blocks. Keep the full map or use the building library.');
  return block;
}
export function assertPrefabSector(map,sx,sy) {
  const errors=prefabErrors(map);if(errors.length)fail(errors[0]);
  const sector={x:sx*24,y:sy*24,width:24,depth:24};
  if((map.buildingPrefabs?.instances||[]).some(p=>lotsOverlap(sector,buildingLot(p,p.clearance))))fail('This sector contains a building prefab or its clearance. Keep it in the full map; legacy blocks cannot preserve the prefab.');
}
function nextId(instances) {let n=1;while(instances.some(p=>p.id==='building-'+n))n++;return 'building-'+n;}
export function placeBuilding(map,{asset,x,y,turns=0,clearance=2}) {
  if(map.kind==='red-shift-block')fail('Place building prefabs in a full map.');
  const errors=prefabErrors(map);if(errors.length)fail(errors[0]);
  const prior=map.buildingPrefabs?.instances||[];
  if(prior.length>=MAX_BUILDINGS)fail('This authoring profile supports at most '+MAX_BUILDINGS+' buildings.');
  const instance={id:nextId(prior),asset,x,y,turns,clearance},error=instanceError(map,instance,prior,siteIndex(map));
  if(error)fail(error);
  const out=structuredClone(map);
  out.buildingPrefabs??={version:1,catalogue:PREFAB_CATALOGUE,instances:[]};out.buildingPrefabs.instances.push(instance);
  out.buildingPrefabs.catalogue=catalogueForAssets(out.buildingPrefabs.instances.map(p=>p.asset),out.buildingPrefabs.catalogue);
  return {map:out,instance};
}
export function removeBuilding(map,id) {
  const errors=prefabErrors(map);if(errors.length)fail(errors[0]);
  if(!map.buildingPrefabs?.instances.some(p=>p.id===id))fail('Select an existing building prefab.');
  const out=structuredClone(map);out.buildingPrefabs.instances=out.buildingPrefabs.instances.filter(p=>p.id!==id);
  const metadata=Object.keys(out.buildingPrefabs).some(key=>!['version','catalogue','instances'].includes(key));
  if(!out.buildingPrefabs.instances.length&&!metadata)delete out.buildingPrefabs;
  return out;
}
export function buildingAt(map,x,y) {const data=prefabData(map);if(!Number.isFinite(x)||!Number.isFinite(y))return null;const cell={x:Math.floor(x+.5),y:Math.floor(y+.5)};return (data?.instances||[]).find(p=>contains(buildingLot(p),cell));}
function randomStream(seed) {
  let state=2166136261;for(const c of seed)state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;
  return ()=>{state+=0x6D2B79F5;let n=state;n=Math.imul(n^n>>>15,n|1);n^=n+Math.imul(n^n>>>7,n|61);return ((n^n>>>14)>>>0)/4294967296;};
}
function shuffle(items,random) {const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
// Keep the original implicit pool stable for saved seeds. Consumers can select
// the combined registry or its explicit residential profile for new districts.
export function generateBuildingLayout(map,{seed='Nautilus',count=6,assets=GROSS_BUILDING_ASSETS.map(a=>a.id),area={x:24,y:24,width:72,depth:72},clearance=2}={}) {
  const errors=prefabErrors(map);if(errors.length)fail(errors[0]);
  if(map.kind==='red-shift-block')fail('Generate building layouts in a full map.');
  if(typeof seed!=='string'||!seed.trim()||seed.length>80)fail('Use a seed of 1–80 characters.');
  if(!Number.isInteger(count)||count<1||count+(map.buildingPrefabs?.instances.length||0)>MAX_BUILDINGS)fail('Choose a building count within the '+MAX_BUILDINGS+' building limit.');
  if(!Array.isArray(assets)||!assets.length||assets.length>BUILDING_ASSETS.length||new Set(assets).size!==assets.length||assets.some(id=>!buildingAsset(id)))fail('Choose known, distinct building assets.');
  if(!area||![area.x,area.y,area.width,area.depth].every(Number.isInteger)||area.x<0||area.y<0||area.width<1||area.depth<1||area.x+area.width>240||area.y+area.depth>240)fail('Keep the layout area inside the 240 × 240 map.');
  if(!Number.isInteger(clearance)||clearance<1||clearance>8)fail('Use 1–8 metres of access clearance.');
  const random=randomStream(seed),occupied=siteIndex(map),out=structuredClone(map),placed=[];
  const maxSpan=Math.max(...assets.flatMap(asset=>{const t=buildingTransform({asset,turns:0,x:0,y:0});return [t.width,t.depth];}));
  // Square lots make all four orientations possible. Four metre lanes separate lots.
  const pitch=maxSpan+clearance*2+4,slots=[];
  for(let y=area.y;y+pitch<=area.y+area.depth;y+=pitch)for(let x=area.x;x+pitch<=area.x+area.width;x+=pitch)slots.push({x,y});
  out.buildingPrefabs??={version:1,catalogue:PREFAB_CATALOGUE,instances:[]};
  for(const slot of shuffle(slots,random)) {
    let found=false;
    for(const asset of shuffle(assets,random)) {
      for(const turns of shuffle([0,1,2,3],random)) {
        const t=buildingTransform({asset,turns,x:0,y:0}),instance={id:nextId(out.buildingPrefabs.instances),asset,turns,clearance,x:slot.x+Math.floor((pitch-t.width)/2),y:slot.y+Math.floor((pitch-t.depth)/2)};
        if(instanceError(map,instance,out.buildingPrefabs.instances,occupied))continue;
        out.buildingPrefabs.instances.push(instance);placed.push(instance);found=true;break;
      }
      if(found)break;
    }
    if(placed.length===count)break;
  }
  if(placed.length!==count)fail('Only '+placed.length+' of '+count+' buildings fit. Enlarge the area, clear obstacles or lower the count. The map was not changed.');
  out.buildingPrefabs.catalogue=catalogueForAssets(out.buildingPrefabs.instances.map(p=>p.asset),out.buildingPrefabs.catalogue);
  out.buildingPrefabs.generation={algorithm:'lot-grid-v1',seed,count,assets:[...assets],area:{...area},clearance};
  return {map:out,instances:placed};
}
