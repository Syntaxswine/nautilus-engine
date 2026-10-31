// Compact a reduced bench result further for the record: each block keeps its medians
// (total, cpu, gpu) and its counts; summaries, checks, culled and unculled counts stay whole.
import fs from 'node:fs';
const [input, output] = process.argv.slice(2), r = JSON.parse(fs.readFileSync(input, 'utf8'));
const med = v => v && typeof v === 'object' && 'median' in v ? v.median : v;
for (const s of r.samples || []) for (const view of Object.values(s.views || {})) for (const arm of ['a', 'b'])
  if (Array.isArray(view[arm])) view[arm] = view[arm].map(b => ({total: med(b.total), cpu: med(b.cpu), gpu: med(b.gpu), counts: b.counts}));
fs.writeFileSync(output, JSON.stringify(r) + '\n');
console.log(input.split(/[\\/]/).pop() + ': ' + fs.statSync(input).size + ' -> ' + fs.statSync(output).size + ' bytes');
