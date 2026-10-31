// For a pixel-probe pair of PNGs (A, B): pixels whose max channel delta exceeds a
// threshold, their 8-connected components, and the largest components' boxes.
//   node delta-blobs.mjs <a.png> <b.png> [threshold=10]
import fs from 'node:fs';
import zlib from 'node:zlib';
function read(file) {
  const buf = fs.readFileSync(file); let p = 8, width = 0, height = 0; const idat = [];
  while (p < buf.length) {const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {width = data.readUInt32BE(0); height = data.readUInt32BE(4);} else if (type === 'IDAT') idat.push(data); p += 12 + len;}
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) raw.copy(px, y * width * 4, y * (width * 4 + 1) + 1, (y + 1) * (width * 4 + 1));
  return {width, height, px};
}
const [fa, fb, t = '10'] = process.argv.slice(2), A = read(fa), B = read(fb), W = A.width, H = A.height, T = Number(t);
const big = new Uint8Array(W * H); let n = 0, hist = {};
for (let p = 0; p < W * H; p++) {let d = 0; for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(A.px[p * 4 + k] - B.px[p * 4 + k])); if (d) {const b = d <= 2 ? '1-2' : d <= 10 ? '3-10' : d <= 30 ? '11-30' : '31+'; hist[b] = (hist[b] || 0) + 1;} if (d > T) {big[p] = 1; n++;}}
const seen = new Uint8Array(W * H), comps = [];
for (let p = 0; p < W * H; p++) if (big[p] && !seen[p]) {
  let size = 0, x0 = W, y0 = H, x1 = 0, y1 = 0; const stack = [p]; seen[p] = 1;
  while (stack.length) {const q = stack.pop(); size++; const x = q % W, y = Math.floor(q / W); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const r = Y * W + X; if (big[r] && !seen[r]) {seen[r] = 1; stack.push(r);}}}
  comps.push({size, box: [x0, y0, x1, y1]});
}
comps.sort((a, b) => b.size - a.size);
console.log(JSON.stringify({deltaHistogram: hist, overThreshold: n, threshold: T, components: comps.length, largest: comps.slice(0, 6)}));
