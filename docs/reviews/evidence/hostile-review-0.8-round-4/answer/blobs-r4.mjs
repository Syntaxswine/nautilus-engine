// The differing pixels of a bench capture pair (run 0, A against B), by colour delta, and the
// 8-connected components of those that no depth tie explains (a tie in either arm), each with
// its size and its largest channel delta: is a large blob shading or a misplaced part?
//   node blobs-r4.mjs <captures dir> <map> <view>
import fs from 'node:fs';
import path from 'node:path';
const [dir, map, view] = process.argv.slice(2);
const load = arm => JSON.parse(fs.readFileSync(path.join(dir, `0-${arm}-${map}-${view}.json`), 'utf8'));
const A = load('a'), B = load('b'), W = A.width, H = A.height, bytes = s => Buffer.from(s, 'base64');
const pa = bytes(A.pixels), pb = bytes(B.pixels), ta = bytes(A.ties), tb = bytes(B.ties);
const delta = new Uint8Array(W * H), hist = {};
for (let p = 0; p < W * H; p++) {
  let d = 0; for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(pa[p * 4 + k] - pb[p * 4 + k]));
  delta[p] = d; if (d) {const b = d <= 2 ? '1-2' : d <= 10 ? '3-10' : d <= 30 ? '11-30' : '31+'; hist[b] = (hist[b] || 0) + 1;}
}
const open = p => delta[p] && !ta[p] && !tb[p], seen = new Uint8Array(W * H), comps = [];
for (let p = 0; p < W * H; p++) if (open(p) && !seen[p]) {
  let size = 0, max = 0, over2 = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; const stack = [p]; seen[p] = 1;
  while (stack.length) {
    const q = stack.pop(), x = q % W, y = Math.floor(q / W); size++; max = Math.max(max, delta[q]); if (delta[q] > 2) over2++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const r = Y * W + X; if (open(r) && !seen[r]) {seen[r] = 1; stack.push(r);}}
  }
  comps.push({size, maxDelta: max, over2Levels: over2, box: [x0, y0, x1, y1]});
}
comps.sort((a, b) => b.size - a.size);
const multi = comps.filter(c => c.size > 1);
console.log(JSON.stringify({map, view, deltaHistogram: hist, unexplained: comps.length, singles: comps.length - multi.length,
  largestOver2: Math.max(0, ...comps.filter(c => c.over2Levels).map(c => c.size)), largest: comps.slice(0, 5)}));
