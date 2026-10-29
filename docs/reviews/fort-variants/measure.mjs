import fs from'node:fs';import os from'node:os';import{performance}from'node:perf_hooks';import{createHash}from'node:crypto';
import{VARIANT_BUILDINGS,compileVariant}from'../../../packages/fort-variants/index.js';
import{VARIANT_LAYOUTS}from'../../../packages/fort-variants/layouts.js';import{buildVariantMesh}from'../../../packages/fort-variants/mesh.js';
const rows=[];
for(const r of[...VARIANT_BUILDINGS,...VARIANT_LAYOUTS]){
  const sample=()=>{const start=performance.now(),b=r.instances?r.id:compileVariant(r.id),middle=performance.now(),m=buildVariantMesh(b),end=performance.now();
    return{compileMs:middle-start,meshMs:end-middle,triangles:m.metrics.triangles,draws:m.metrics.draws};};
  const initial=sample(),subsequent=Array.from({length:3},sample),median=key=>subsequent.map(s=>s[key]).sort((a,b)=>a-b)[1];
  rows.push({id:r.id,initial,subsequent,median:{compileMs:median('compileMs'),meshMs:median('meshMs')}});
}
const result={node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,
  catalogueSha256:createHash('sha256').update(fs.readFileSync(new URL('../../../assets/fort-variants/catalogue.json',import.meta.url))).digest('hex'),
  method:'Headless construction in one imported Node process: initial sample and three subsequent sequential samples. Layout mesh time includes its module compiles. No explicit GC, CPU isolation, rendering or frame-rate measurement.',
  rows};
fs.mkdirSync(new URL('../../../artifacts/fort-variants-review',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../../../artifacts/fort-variants-review/headless-cost.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(rows.map(r=>({id:r.id,...r.median}))));
