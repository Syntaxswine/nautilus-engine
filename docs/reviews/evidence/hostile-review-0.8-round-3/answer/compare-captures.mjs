// Compare the bench's captures (run 0 A against B; run 1 A against run 0 A as the repeat control).
//   node compare-captures.mjs <captures dir> <map> [views...]
import fs from 'node:fs';
import path from 'node:path';
const [dir, map, ...views] = process.argv.slice(2);
const load = f => {const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return {px: Buffer.from(c.pixels, 'base64'), ties: Buffer.from(c.ties, 'base64'), n: c.width * c.height};};
for (const view of views.length ? views : ['overview', 'close', 'cutaway']) {
  const name = (r, arm) => `${r}-${arm}-${map}-${view}.json`;
  if (!fs.existsSync(path.join(dir, name(0, 'a'))) || !fs.existsSync(path.join(dir, name(0, 'b')))) {console.log(map, view, 'missing'); continue;}
  const A = load(name(0, 'a')), B = load(name(0, 'b'));
  let differing = 0, max = 0, ties = 0;
  for (let p = 0; p < A.n; p++) {let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(A.px[p * 4 + c] - B.px[p * 4 + c])); if (d) {differing++; max = Math.max(max, d); if (A.ties[p] || B.ties[p]) ties++;}}
  const repeat = fs.existsSync(path.join(dir, name(1, 'a'))) ? load(name(1, 'a')).px.equals(A.px) : 'n/a';
  console.log(`${map} ${view}: ${differing} of ${A.n} px differ (max ${max}), ${ties} at ties; repeat of A identical: ${repeat}`);
}
