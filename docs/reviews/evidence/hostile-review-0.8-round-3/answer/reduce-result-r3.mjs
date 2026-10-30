// Shrink a benchmark result for the committed record (round 1's reduce-result.mjs, plus the
// GPU times this round adds): per-frame arrays become per-block {n, median, min, max};
// captures stay out. Refuses local names.
import fs from 'node:fs';
import os from 'node:os';
const [input, output] = process.argv.slice(2);
const r = JSON.parse(fs.readFileSync(input, 'utf8'));
const median = v => {const s = [...v].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;};
const brief = v => Array.isArray(v) && v.length && typeof v[0] === 'number' ? {n: v.length, median: +median(v).toFixed(3), min: +Math.min(...v).toFixed(3), max: +Math.max(...v).toFixed(3)} : v;
const walk = value => {
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, ['cpu', 'total', 'gpu'].includes(k) ? brief(v) : walk(v)]));
  return value;
};
const text = JSON.stringify(walk(r), null, 1);
for (const name of [os.userInfo().username, os.homedir()]) if (name && text.toLowerCase().includes(name.toLowerCase())) throw Error('Refusing: the result names ' + name);
fs.writeFileSync(output, text + '\n');
console.log(input + ': ' + fs.statSync(input).size + ' -> ' + Buffer.byteLength(text) + ' bytes');
