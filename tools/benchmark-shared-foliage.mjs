// Isolated Node workload, not a browser/FPS/phone benchmark.
import fs from 'node:fs';import path from 'node:path';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';
import {blankMap} from '../packages/map-core/index.js';
import {buildFoliageObstacles,traceFoliage as baseline} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/foliage-obstacles.js';
import {foliageIndex,traceFoliage} from '../packages/stealth-core/foliage-trace.js';
const rows=[];let seed=137;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
for(const density of ['sparse','dense']){
  const map=blankMap('Foliage workload');map.foliage={};for(let y=20;y<60;y++)for(let x=20;x<70;x++)if(density==='dense'||(x+y*3)%11===0)map.foliage[x+','+y+',0']=[100,true,'thicket-v1'];
  const start=performance.now(),old=buildFoliageObstacles(map),builtMs=performance.now()-start,scene={...old,index:foliageIndex(old.boxes),worldIndex:foliageIndex(old.worldBoxes)},rays=Array.from({length:3000},()=>[[10+random()*70,.15+random()*3,10+random()*60],[10+random()*70,.15+random()*3,10+random()*60]]);
  for(const [a,b]of rays){const x=baseline(old,a,b,'sight'),y=traceFoliage(scene,a,b,'sight');assert.equal(!!x,!!y);if(x)assert(Math.abs(x.t-y.t)<1e-10);}
  const run=(fn)=>{const times=[];let hits=0;for(let pass=0;pass<4;pass++){const t=performance.now();for(const [a,b]of rays)hits+=!!fn(a,b);const elapsed=performance.now()-t;if(pass)times.push(elapsed);}return {medianMs:times.sort((a,b)=>a-b)[1],hits:hits/4};};
  rows.push({density,paintedCells:Object.keys(map.foliage).length,volumes:old.boxes.length,rays:rays.length,buildMs:builtMs,baselineNearest:run((a,b)=>baseline(old,a,b,'sight')),orderedNearest:run((a,b)=>traceFoliage(scene,a,b,'sight')),orderedBoolean:run((a,b)=>traceFoliage(scene,a,b,'sight','simulation',true))});
}
const out=path.resolve('artifacts/shared-stealth');fs.mkdirSync(out,{recursive:true});const report={kind:'nautilus-foliage-node-workload',node:process.version,platform:process.platform,architecture:process.arch,measurement:'three warm batches after one warmup; 3000 fixed seeded rays; same original geometry',physicalHandset:false,rows};fs.writeFileSync(path.join(out,'foliage-benchmark.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
