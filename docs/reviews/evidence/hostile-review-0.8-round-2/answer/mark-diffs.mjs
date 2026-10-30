// Write capture A of one map/view as a PNG with its differing pixels marked:
// yellow = depth tie, cyan = on an edge, magenta = neither. Prints clusters of the
// "neither" pixels (32 px grid) so a crop can be taken of each.
// Usage: node mark-diffs.mjs <captures dir> <map-view> <out.png> [threshold]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [dir, name, out, t = '24'] = process.argv.slice(2), threshold = Number(t);
const load = arm => {const c = JSON.parse(fs.readFileSync(path.join(dir, `0-${arm}-${name}.json`), 'utf8')); return {w: c.width, h: c.height, px: Buffer.from(c.pixels, 'base64'), ties: Buffer.from(c.ties, 'base64'), flipY: c.flipY};};
const A = load('a'), B = load('b'), {w, h} = A;
const delta = (img, p, q) => {let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(img.px[p * 4 + c] - img.px[q * 4 + c])); return d;};
const edge = (img, p) => {const x = p % w, y = (p / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && delta(img, p, Y * w + X) > threshold) return true;} return false;};
const img = Buffer.from(A.px), cells = new Map();
for (let p = 0; p < w * h; p++) {
  let d = 0; for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(A.px[p * 4 + c] - B.px[p * 4 + c]));
  if (!d) continue;
  const kind = A.ties[p] || B.ties[p] ? [255, 230, 0] : edge(A, p) || edge(B, p) ? [0, 230, 255] : [255, 0, 255];
  img[p * 4] = kind[0]; img[p * 4 + 1] = kind[1]; img[p * 4 + 2] = kind[2]; img[p * 4 + 3] = 255;
  if (kind[0] === 255 && kind[1] === 0) {
    const key = ((p % w) >> 5) + ',' + (((p / w) | 0) >> 5), cell = cells.get(key) || {n: 0, maxDelta: 0, sample: null};
    cell.n++; cell.maxDelta = Math.max(cell.maxDelta, d); cell.sample ??= {x: p % w, y: (p / w) | 0, a: [...A.px.subarray(p * 4, p * 4 + 4)], b: [...B.px.subarray(p * 4, p * 4 + 4)]};
    cells.set(key, cell);
  }
}
// Rows as stored; readPixels is bottom-up, so flip for viewing.
const rows = [];
for (let y = 0; y < h; y++) {const src = h - 1 - y; rows.push(Buffer.concat([Buffer.from([0]), img.subarray(src * w * 4, (src + 1) * w * 4)]));}
const chunk = (type, data) => {const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, 'latin1'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]);};
function crc32(buf) {let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) {c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c;} return (crc ^ 0xffffffff) >>> 0;}
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]));
for (const [key, cell] of [...cells].sort((x, y) => y[1].n - x[1].n).slice(0, 12)) {
  const [cx, cy] = key.split(',').map(Number);
  console.log(`cell x ${cx * 32}-${cx * 32 + 31}, viewed y ${h - 1 - (cy * 32 + 31)}-${h - 1 - cy * 32}: ${cell.n} px, max delta ${cell.maxDelta}; e.g. (${cell.sample.x},${h - 1 - cell.sample.y}) A ${cell.sample.a} B ${cell.sample.b}`);
}
