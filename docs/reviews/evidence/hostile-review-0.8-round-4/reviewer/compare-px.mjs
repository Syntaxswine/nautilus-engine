// Compares pixel captures written by pixels.mjs, pairwise, with the bench's strong tie
// oracle (a differing pixel is a tie only if one arm's frame equals the other's strict-depth
// frame there) and 8-connected blobs of what no tie explains.
//   node compare-px.mjs <result.json> <armA>:<armB> [<armA>:<armB> ...]
import fs from 'node:fs';
import path from 'node:path';
const [file, ...pairs] = process.argv.slice(2), result = JSON.parse(fs.readFileSync(file, 'utf8')), dir = path.join(path.dirname(path.resolve(file)), 'px');
const load = f => {const c = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); return {w: c.width, h: c.height, px: Buffer.from(c.pixels, 'base64'), strict: Buffer.from(c.strict, 'base64')};};
const same = (x, y, p) => x[p * 4] === y[p * 4] && x[p * 4 + 1] === y[p * 4 + 1] && x[p * 4 + 2] === y[p * 4 + 2] && x[p * 4 + 3] === y[p * 4 + 3];
function blobs(mask, w, h) {
  const sizes = [], seen = new Uint8Array(mask.length), stack = [];
  for (let p = 0; p < mask.length; p++) if (mask[p] && !seen[p]) {
    let n = 0; seen[p] = 1; stack.push(p);
    while (stack.length) {const q = stack.pop(), x = q % w, y = (q - x) / w; n++; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {const X = x + dx, Y = y + dy, r = Y * w + X; if ((dx || dy) && X >= 0 && Y >= 0 && X < w && Y < h && mask[r] && !seen[r]) {seen[r] = 1; stack.push(r);}}}
    sizes.push(n);
  }
  sizes.sort((a, b) => b - a); return {count: sizes.length, largest: sizes.slice(0, 5)};
}
const rows = [];
for (const pair of pairs) {
  const [a, b] = pair.split(':');
  for (const map of result.maps) for (const view of result.views) {
    const A = result.captures[a]?.[map]?.[view], B = result.captures[b]?.[map]?.[view];
    if (!A || !B) continue;
    const x = load(A.file), y = load(B.file);
    let differing = 0, small = 0, strong = 0, maxDelta = 0; const open = new Uint8Array(x.w * x.h);
    for (let p = 0; p < x.w * x.h; p++) {
      let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(x.px[p * 4 + c] - y.px[p * 4 + c]));
      if (!d) continue; differing++; maxDelta = Math.max(maxDelta, d); if (d <= 2) small++;
      if (same(x.px, y.strict, p) || same(x.strict, y.px, p)) strong++; else open[p] = 1;
    }
    const row = {pair, map, view, pixels: x.w * x.h, differing, withinTwoLevels: small, strongTies: strong, maxDelta, unexplained: blobs(open, x.w, x.h), calls: [A.counts.calls, B.counts.calls], triangles: [A.counts.triangles, B.counts.triangles]};
    rows.push(row);
    console.log(`${pair} ${map} ${view}: ${differing} differ (max ${maxDelta}, ${small} by 1-2), ${strong} strong ties, rest in ${row.unexplained.count} blobs (largest ${row.unexplained.largest.join('/') || '-'}); calls ${row.calls.join('/')} tris ${row.triangles.join('/')}`);
  }
}
fs.writeFileSync(path.resolve(file).replace(/\.json$/, '-compare.json'), JSON.stringify(rows, null, 1));
