// Foreground diagnostic only: no listeners, writes or background workers.
// Run: node --expose-gc tests/fixtures/extended-world/measure.mjs
import os from 'node:os';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createWorld,openWorld,serializeWorld,compileWorld} from '../../../packages/world-core/index.js';
import {floorPanel} from './build-fixtures.mjs';
const samples=2000,warmup=200;
function measuredWorld(count){
  const world=createWorld({id:'measured-'+count,name:'64 panels per story',widthM:240,depthM:240,floorCount:count,storyHeightM:3,groundHeightM:0,heightM:128});
  for(let index=0;index<count;index++)for(let tile=0;tile<64;tile++){const panel=floorPanel(world,index,2+(tile%8)*3,2+Math.floor(tile/8)*3,3);panel.id='panel-'+index+'-'+tile;world.surfaces.push(panel);}
  for(let index=0;index<count;index++)world.entities.push({id:'actor-'+index,kind:'actor',content:{id:'host-actor',version:'fixture-v1'},floorId:'floor-'+index,position:{x:3,y:3,h:index*3},yawRadians:0,supportSurfaceId:'panel-'+index+'-0'});
  for(let index=0;index<count-1;index++)world.links.push({id:'stairs-'+index,kind:'stairs',from:{floorId:'floor-'+index,surfaceId:'panel-'+index+'-0',position:{x:3,y:3,h:index*3}},to:{floorId:'floor-'+(index+1),surfaceId:'panel-'+(index+1)+'-0',position:{x:3,y:3,h:(index+1)*3}},bidirectional:true});
  return openWorld(world);
}
function timing(work){for(let i=0;i<warmup;i++)work(i);const values=[];for(let i=0;i<samples;i++){const start=performance.now();work(i);values.push((performance.now()-start)*1000);}values.sort((a,b)=>a-b);return {medianUs:values[Math.floor(samples/2)],p95Us:values[Math.floor(samples*.95)]};}
const report={recordedAt:new Date().toISOString(),node:process.version,platform:process.platform,architecture:process.arch,cpu:os.cpus()[0]?.model,method:{surfacesPerFloor:64,actorAnchorsPerFloor:1,links:'one adjacent link per story transition',warmup,samplesPerQuery:samples,indexHeap:'GC before/after compile; held input excluded; noisy single-process retained heap delta',queries:'static AABBs, no renderer/game simulation; timings are observational, not acceptance thresholds'},sourceHashes:{},cases:[]};
for(const path of ['index.js','state.js','validation.js','queries.js','legacy.js'])report.sourceHashes['packages/world-core/'+path]=createHash('sha256').update(fs.readFileSync(new URL('../../../packages/world-core/'+path,import.meta.url))).digest('hex');
for(const count of [5,15,32]){
  const world=measuredWorld(count),wire=serializeWorld(world);global.gc?.();const loadStart=performance.now();openWorld(wire);const loadMs=performance.now()-loadStart;global.gc?.();const heapBefore=process.memoryUsage().heapUsed,start=performance.now();let query=compileWorld(world);const compileMs=performance.now()-start;global.gc?.();const indexHeapDeltaBytes=process.memoryUsage().heapUsed-heapBefore;
  const ray=timing(()=>query.traceSegment({from:{x:3.5,y:3.5,h:count*3+1},to:{x:3.5,y:3.5,h:0}}));
  const support=timing(index=>query.findSupport({position:{x:3.5,y:3.5,h:(index%count)*3+.5},maxDropM:2.9,requireFloor:true}));
  const bounds={min:{x:3,y:3,h:0},max:{x:4,y:4,h:count*3}},aabb=timing(()=>query.queryBounds(bounds));
  report.cases.push({stories:count,...query.stats(),loadMs,compileMs,indexHeapDeltaBytes,queries:{ray,support,aabb},queryEvidence:query.queryBounds(bounds)});report.cases.at(-1).queryEvidence.surfaces=report.cases.at(-1).queryEvidence.surfaces.length;query=null;
}
process.stdout.write(JSON.stringify(report,null,2)+'\n');
