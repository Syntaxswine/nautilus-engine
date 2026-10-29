import fs from 'node:fs';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {BATHROOM_MODULES, BATHROOM_LAYOUTS, compileBathroom} from '../../../packages/bathrooms/index.js';
import {buildBathroomMesh} from '../../../packages/bathrooms/mesh.js';
const rows = [];
for (const r of [...BATHROOM_MODULES, ...BATHROOM_LAYOUTS]) {
  const sample = () => { const start = performance.now(), blueprint = compileBathroom(r.id), middle = performance.now(), mesh = buildBathroomMesh(blueprint), end = performance.now(); return {compileMs: middle-start, meshMs: end-middle, triangles: mesh.metrics.triangles, draws: mesh.metrics.draws}; };
  const initial = sample(), subsequent = Array.from({length: 3}, sample), median = key => subsequent.map(s => s[key]).sort((a,b) => a-b)[1];
  rows.push({id: r.id, initial, subsequent, median: {compileMs: median('compileMs'), meshMs: median('meshMs')}});
}
const result = {node: process.version, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model,
  catalogueSha256: createHash('sha256').update(fs.readFileSync(new URL('../../../assets/bathrooms/catalogue.json', import.meta.url))).digest('hex'),
  method: 'Headless compile/mesh construction, including pose-envelope computation: one initial and three subsequent sequential samples. Layouts include their child compiles. No explicit GC, CPU isolation, rendering or frame-rate measurement.', rows};
fs.mkdirSync(new URL('../../../artifacts/bathrooms-review', import.meta.url), {recursive: true});
fs.writeFileSync(new URL('../../../artifacts/bathrooms-review/headless-cost.json', import.meta.url), JSON.stringify(result, null, 2));
console.log(JSON.stringify(rows.map(r => ({id: r.id, ...r.median}))));
