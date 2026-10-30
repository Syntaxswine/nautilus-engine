// Where do the A/B pixel differences sit? For each capture pair, classify every
// differing pixel: at a depth tie (the capture's own mask), on an edge (a colour
// discontinuity in A or B within one pixel), or neither. The base rate of edge
// pixels in the frame is the null: if differences were spread at random, the edge
// share would match it. Usage: node edge-attribution.mjs <captures dir> [threshold]
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2], threshold = Number(process.argv[3] || 24);
const load = file => {const c = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); return {w: c.width, h: c.height, px: Buffer.from(c.pixels, 'base64'), ties: Buffer.from(c.ties, 'base64')};};
const files = fs.readdirSync(dir).filter(f => f.startsWith('0-a-'));
for (const file of files.sort()) {
  const A = load(file), B = load(file.replace('0-a-', '0-b-')), {w, h} = A;
  const delta = (img, p, q) => {let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(img.px[p * 4 + c] - img.px[q * 4 + c])); return d;};
  const edge = (img, p) => {const x = p % w, y = (p / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && delta(img, p, Y * w + X) > threshold) return true;} return false;};
  let differing = 0, ties = 0, edges = 0, shading = 0, neither = 0, edgePixels = 0;
  for (let p = 0; p < w * h; p++) {
    if (edge(A, p)) edgePixels++;
    let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(A.px[p * 4 + c] - B.px[p * 4 + c]));
    if (!d) continue; differing++;
    if (A.ties[p] || B.ties[p]) ties++; else if (edge(A, p) || edge(B, p)) edges++; else if (d <= 2) shading++; else neither++;
  }
  const name = file.slice(4, -5);
  console.log(`${name}: ${differing} differ — ${ties} at depth ties, ${edges} on edges, ${shading} shading (delta <= 2), ${neither} neither; edge pixels are ${(100 * edgePixels / (w * h)).toFixed(2)}% of the frame`);
}
