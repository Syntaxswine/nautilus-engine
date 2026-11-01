import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
import * as T from '../packages/tiles-core/candidate-v2.js';
import {oracleCases,options} from '../tests/fixtures/procedural-tiles/c1.mjs';
export function measureC1(){
  const cases=[],measurements=[];for(const c of oracleCases()){
    const o=options(T,{queries:c.queries,transform:c.transform??{quarterTurns:0,mirrorX:false},origin:c.origin??[0,0,0]}),start=performance.now(),result=T.inspectTilePlanarBoolean(c.recipe,o),elapsedMs=performance.now()-start;if(!result.resolution.state.startsWith('resolved-'))throw Error(c.name+': '+JSON.stringify(result.resolution));cases.push({name:c.name,result});measurements.push({name:c.name,elapsedMs,work:result.work.total,segments:result.work.counts.maxSegments,atomicEdges:result.work.counts.maxAtomicEdges,boundarySegments:result.geometry.edges.length,components:result.geometry.components.length,voids:result.geometry.voids.length,bytes:Buffer.byteLength(JSON.stringify(result))});
  }
  const folder=new URL('../artifacts/procedural-tiles-c1/',import.meta.url);fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(new URL('oracle-cases.json',folder),JSON.stringify(cases)+'\n');const report={status:'pass',base:'e4b5106f6967614ddc60661a6cdddde5d37b5c2b',runtime:process.version,platform:process.platform,architecture:process.arch,cpu:os.cpus()[0]?.model,cases:measurements,meaning:'Single-run foreground elapsed measurements and deterministic model work, not per-frame/mobile/renderer benchmarks.'};fs.writeFileSync(new URL('measurements.json',folder),JSON.stringify(report,null,2)+'\n');
  const names=['four-component point-contact ring','point-contact ring with inner island','courtyard','split islands','nested island void grouping','tangent diamond hole','point tangent union','A-A empty'],unsupported=structuredClone(cases[0].result.source);unsupported.shape.nodes[0].shape.clip={min:[-1,-1,-1],max:[5,5,1]};fs.writeFileSync(new URL('preview-cases.json',folder),JSON.stringify([...names.map(name=>cases.find(c=>c.name===name)),{name:'Unsupported clip retained',result:T.inspectTilePlanarBoolean(unsupported,options(T))}])+'\n');return cases;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const cases=measureC1();console.log(JSON.stringify({status:'pass',cases:cases.length}));}
