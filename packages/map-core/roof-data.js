import {roofErrors,roofsOf} from '../roof-core/index.js';
import {buildingLot} from '../prefab-core/index.js';
import {refusePartsEnvelope} from '../world-core/parts-refusal.js';

const EPS=1e-6;
export const roofSize=map=>map?.kind==='red-shift-block'?24:map?.width||240;
// The geometry accessor makes defaults explicit. Editing/history instead keeps
// authored optional-field presence until the user edits that roof.
export function authoredRoofsOf(map) {roofsOf(map);return structuredClone(map.slopedRoofs?.roofs||[]);}
export function roofFootprint(roof) {
  return {x:roof.x-roof.overhang,y:roof.y-roof.overhang,width:roof.width+roof.overhang*2,depth:roof.depth+roof.overhang*2};
}
const intersects=(a,b)=>a.x<b.x+b.width-EPS&&a.x+a.width>b.x+EPS&&a.y<b.y+b.depth-EPS&&a.y+a.depth>b.y+EPS;

// Extra editor occupancy policy lives outside the artist's geometry contract.
// Prefab lots are immutable whole assets; a separate roof must not cover them.
export function roofAuthoringErrors(map,size=roofSize(map)) {
  const errors=[...roofErrors(map,size)];if(errors.length||map?.slopedRoofs===undefined)return errors;
  const block=map.kind==='red-shift-block';
  if(block?map.version!==1||map.size!==24:map.version!==2||map.width!==240||map.height!==240)return ['Sloped roofs require an aft-map-v2 map or a 24-metre aft-block-v1 block.'];
  if(!Number.isInteger(map.levels)||map.levels<3||map.levels>6)return ['Sloped roofs need 3–6 declared map layers.'];
  const roofs=roofsOf(map);
  for(let i=0;i<roofs.length;i++) {
    const roof=roofs[i],bounds=roofFootprint(roof);
    if(roof.z>=map.levels)errors.push('Roof eaves must fit within the declared map layers.');
    const instances=map.buildingPrefabs?.instances;
    for(const instance of Array.isArray(instances)?instances:[]) {
      let lot;try{lot=buildingLot(instance,instance.clearance);}catch{continue;} // The prefab validator reports malformed assets.
      if(intersects(bounds,lot))errors.push(`Sloped roof ${roof.id} overlaps a whole-building prefab lot or its access clearance. Edit that prefab separately.`);
    }
    for(const other of roofs.slice(0,i))if(other.z===roof.z&&intersects(bounds,roofFootprint(other)))errors.push('Sloped roofs on the same eaves layer overlap. Keep their overhangs separate.');
  }
  return [...new Set(errors)];
}
export function assertRoofData(map,size) {
  refusePartsEnvelope(map);
  const errors=roofAuthoringErrors(map,size);if(errors.length)throw Error(errors.join(' '));return map;
}
export function setRoofs(target,roofs,extension=target.slopedRoofs) {
  if(extension!==undefined||roofs.length)target.slopedRoofs={...structuredClone(extension),version:1,roofs:structuredClone(roofs)};
  else delete target.slopedRoofs;
  return target;
}
function equal(a,b) {
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equal(a[k],b[k]));
}
export function mergeRoofExtensions(destination,source) {
  if(destination===undefined&&source===undefined)return undefined;
  const out=structuredClone(destination||{});
  for(const [key,value]of Object.entries(source||{})) {
    if(['version','roofs'].includes(key))continue;
    if(Object.hasOwn(out,key)&&!equal(out[key],value))throw Error('Conflicting sloped-roof extension metadata for '+key+'. Reconcile it before placing or generating blocks.');
    Object.defineProperty(out,key,{value:structuredClone(value),enumerable:true,configurable:true,writable:true});
  }
  return out;
}
export function shiftRoofs(roofs,x,y,existing=[],remap=false) {
  const ids=new Set(existing.map(r=>r.id));
  return roofs.map(roof=>{
    const base=remap?`s${x/24}-${y/24}-${roof.id.replace(/^s\d+-\d+-/,'')}`:roof.id;
    let id=base.slice(0,96),suffix=1;
    while(ids.has(id)){const end='-'+suffix++;id=base.slice(0,96-end.length)+end;}ids.add(id);
    return {...structuredClone(roof),id,x:roof.x+x,y:roof.y+y};
  });
}
export function roofsInSector(map,sx=0,sy=0) {
  if(![sx,sy].every(n=>Number.isInteger(n)&&n>=0&&n<=9))throw Error('Choose a sector from 1 to 10.');
  const sector={x:sx*24,y:sy*24,width:24,depth:24},result=[];
  for(const roof of authoredRoofsOf(map)) {
    const bounds=roofFootprint(roof);if(!intersects(bounds,sector))continue;
    if(bounds.x<sector.x-EPS||bounds.y<sector.y-EPS||bounds.x+bounds.width>sector.x+24+EPS||bounds.y+bounds.depth>sector.y+24+EPS)throw Error('A sloped roof or its overhang crosses this sector boundary. Keep the whole roof inside one block before capture or replacement.');
    result.push(roof);
  }
  return result;
}
