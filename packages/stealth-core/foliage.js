import {parseMap} from '../map-core/railway-map.js';
import {foliageErrors,foliageAt,foliagePreset,foliageBlocks} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-data.js';
import {FOLIAGE_PRESETS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-presets.js';
import {buildFoliageObstacles} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-obstacles.js';
import {woodlandDepth} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/core/woodland.js';
import {MAP_LEVELS} from '../../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/map-layers.js';
import {foliageIndex,traceFoliage} from './foliage-trace.js';
import {copy,fields,id,integer,number,point,fail,stable} from './data.js';
import {FOLIAGE_CAPABILITY} from './contract.js';
export const FOLIAGE_CONTRACT=Object.freeze({id:FOLIAGE_CAPABILITY,version:1,presets:Object.freeze(Object.keys(FOLIAGE_PRESETS)),encodings:Object.freeze([2,3,4]),origin:'integer-centred metre cells',nativeFloorIntervalM:2.12,tacticalFloorIntervalM:3,nativeBodyScale:1.65/1.8,queries:'separate concealment, foliage blocking and nearest shot/sight hit',invalidation:'new immutable snapshot on map identity/revision; no moving scene reference'});
function cell(v){fields(v,['x','y','level']);integer(v.x,0,239);integer(v.y,0,239);integer(v.level,0,MAP_LEVELS-1);return {x:v.x,y:v.y,z:v.level};}
function depthPoint(v){fields(v,['x','y','level']);number(v.x,-1e4,1e4);number(v.y,-1e4,1e4);integer(v.level,0,MAP_LEVELS-1);return {x:v.x,y:v.y,z:v.level};}
function ray(input){
  fields(input,['origin','direction','maxReach','purpose','space']);point(input.origin);point(input.direction);number(input.maxReach,.000001,1000);
  if(!['sight','shot'].includes(input.purpose)||!['native-world','aft-simulation'].includes(input.space)||Math.abs(Math.hypot(input.direction.x,input.direction.y,input.direction.h)-1)>1e-8)fail('FOLIAGE_RAY','Supply a unit ray with explicit purpose and native-world or aft-simulation height space.');
  const a=[input.origin.x,input.origin.h,input.origin.y],b=[a[0]+input.direction.x*input.maxReach,a[1]+input.direction.h*input.maxReach,a[2]+input.direction.y*input.maxReach];return {a,b,space:input.space==='native-world'?'world':'simulation'};
}
export function createFoliageSnapshot(input){
  fields(input,['mapId','revision','map']);id(input.mapId);integer(input.revision);
  const {mapId,revision}=input;
  const map=parseMap(JSON.stringify(input.map),{allowDisconnected:true}),errors=foliageErrors(map);if(errors.length)fail('FOLIAGE_MAP',errors.join(' '));
  let scene;
  const geometry=()=>{if(!scene){scene=buildFoliageObstacles(map);scene.index=foliageIndex(scene.boxes);scene.worldIndex=foliageIndex(scene.worldBoxes);}return scene;};
  return Object.freeze({mapId,revision,contract:FOLIAGE_CONTRACT,
    exportMap:()=>copy(map),
    cell(input){const p=cell(input),cover=foliageAt(map,p.x,p.y,p.z);return {cover:copy(cover),preset:foliagePreset(map,p.x,p.y,p.z),density:cover?cover[0]/100:0,blocked:!!foliageBlocks(map,p.x,p.y,p.z)};},
    depth(from,to){return woodlandDepth(map,depthPoint(from),depthPoint(to));},
    trace(input){const r=ray(input),hit=traceFoliage(geometry(),r.a,r.b,input.purpose,r.space);if(!hit)return null;const {box,t}=hit;return {kind:'foliage',id:box.id,material:box.material,source:copy(box.source??null),distance:t*input.maxReach,point:{x:r.a[0]+(r.b[0]-r.a[0])*t,y:r.a[2]+(r.b[2]-r.a[2])*t,h:r.a[1]+(r.b[1]-r.a[1])*t}};},
    occluded(input){const r=ray(input);return !!traceFoliage(geometry(),r.a,r.b,input.purpose,r.space,true);},
    volumes(space){if(!['native-world','aft-simulation'].includes(space))fail('FOLIAGE_RAY','Select an explicit height space.');return geometry()[space==='native-world'?'worldBoxes':'boxes'].map(b=>copy({id:b.id,material:b.material,source:b.source??null,min:b.min,max:b.max,blocksSight:b.blocksSight,blocksShot:b.blocksShot,...(b.beam?{beam:b.beam}:{}),...(b.lobes?{lobes:b.lobes}:{})}));},
    statistics(){const s=geometry();return {mapId,revision,volumes:s.boxes.length,trees:s.trees.length,screens:s.screens.length,wood:s.wood.length,buckets:s.index.size,worldBuckets:s.worldIndex.size};}
  });
}
export function createFoliageStore(){
  let current=null,signature=null;
  return Object.freeze({read(){if(!current)fail('FOLIAGE_MAP','Bind a complete map revision first.');return current;},
    replace(input){fields(input,['mapId','revision','map']);id(input.mapId);integer(input.revision);const nextSignature=stable(input.map);
      if(current&&input.mapId===current.mapId){if(input.revision<current.revision)fail('FOLIAGE_REVISION','Use a new map identity or a monotonic revision.');if(input.revision===current.revision){if(nextSignature!==signature)fail('FOLIAGE_REVISION','Map bytes changed without a new revision.');return current;}}
      const next=createFoliageSnapshot(input);current=next;signature=nextSignature;return current;
    }
  });
}
