import fs from'node:fs';import os from'node:os';import{performance}from'node:perf_hooks';import{createHash}from'node:crypto';
import{FRONTIER_BUILDINGS,compileFrontier}from'../../../packages/frontier-fort/index.js';
import{FRONTIER_LAYOUTS}from'../../../packages/frontier-fort/layouts.js';import{buildFrontierMesh}from'../../../packages/frontier-fort/mesh.js';
const rows=[];
for(const r of[...FRONTIER_BUILDINGS,...FRONTIER_LAYOUTS]){
  const sample=()=>{const start=performance.now(),b=r.instances?r.id:compileFrontier(r.id),middle=performance.now(),m=buildFrontierMesh(b),end=performance.now();
    return{compileMs:middle-start,meshMs:end-middle,triangles:m.metrics.triangles,draws:m.metrics.draws};};
  const initial=sample(),subsequent=Array.from({length:3},sample),median=key=>subsequent.map(s=>s[key]).sort((a,b)=>a-b)[1];
  rows.push({id:r.id,initial,subsequent,median:{compileMs:median('compileMs'),meshMs:median('meshMs')}});
}
const result={node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,
  catalogueSha256:createHash('sha256').update(fs.readFileSync(new URL('../../../assets/frontier-fort/catalogue.json',import.meta.url))).digest('hex'),
  method:'Headless construction in one imported Node process: initial sample and three subsequent sequential samples. Layout mesh time includes its module compiles. No explicit GC, CPU isolation, rendering or frame-rate measurement.',
  rows};
fs.mkdirSync(new URL('../../../artifacts/frontier-fort-review',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../../../artifacts/frontier-fort-review/headless-cost.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(rows.map(r=>({id:r.id,...r.median}))));
