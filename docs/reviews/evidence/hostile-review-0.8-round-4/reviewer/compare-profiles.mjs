// Round 4: two profile-frames.mjs outputs side by side: per function, self ms per frame in
// each, sorted by the difference.  node compare-profiles.mjs <a.json> <b.json>
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const per = p => new Map(p.top.map(t => [t.fn.replace(/:\d+$/, ''), t.perFrame]));
const A = per(a), B = per(b), keys = [...new Set([...A.keys(), ...B.keys()])];
console.log(`A ${a.tree} ${a.map} ${a.view}${a.assets ? ' assets' : ''}: frame ${a.frameMs} ms, cpu ${a.cpuMs} ms, ${a.counts.calls} calls, ${(a.counts.triangles / 1e6).toFixed(2)} Mt`);
console.log(`B ${b.tree} ${b.map} ${b.view}${b.assets ? ' assets' : ''}: frame ${b.frameMs} ms, cpu ${b.cpuMs} ms, ${b.counts.calls} calls, ${(b.counts.triangles / 1e6).toFixed(2)} Mt`);
console.log('| function | A ms/frame | B ms/frame | B - A |\n|---|---|---|---|');
for (const k of keys.sort((x, y) => Math.abs((B.get(y) ?? 0) - (A.get(y) ?? 0)) - Math.abs((B.get(x) ?? 0) - (A.get(x) ?? 0)))) console.log(`| ${k} | ${A.get(k) ?? '-'} | ${B.get(k) ?? '-'} | ${((B.get(k) ?? 0) - (A.get(k) ?? 0)).toFixed(2)} |`);
