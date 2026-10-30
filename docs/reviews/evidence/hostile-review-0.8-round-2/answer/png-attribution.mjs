// Pixel classes of two folders of same-named PNG screenshots (e.g. review:integration
// captures of two trees, both on SwiftShader). Without a tie mask, a differing pixel
// is classed: on an edge (a colour step above the threshold to a 4-neighbour, in
// either image), shading (a delta of at most 2 levels), or neither. Edge pixels' share
// of the frame is the chance rate.
//   node png-attribution.mjs <dir A> <dir B> [threshold]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const [dirA, dirB, t = '24'] = process.argv.slice(2), threshold = Number(t);
function decode(file) {
  const buf = fs.readFileSync(file); let pos = 8, width, height, channels, idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {width = data.readUInt32BE(0); height = data.readUInt32BE(4); if (data[8] !== 8 || data[12]) throw Error('8-bit, non-interlaced only'); channels = {2: 3, 6: 4}[data[9]]; if (!channels) throw Error('RGB/RGBA only');}
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * channels, px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? px[y * stride + i - channels] : 0, b = y ? px[(y - 1) * stride + i] : 0, c = y && i >= channels ? px[(y - 1) * stride + i - channels] : 0;
      let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;}
      px[y * stride + i] = v & 255;
    }
  }
  return {width, height, channels, px};
}
for (const name of fs.readdirSync(dirA).filter(f => f.endsWith('.png')).sort()) {
  if (!fs.existsSync(path.join(dirB, name))) {console.log(name + ': missing in B'); continue;}
  const A = decode(path.join(dirA, name)), B = decode(path.join(dirB, name)), {width: w, height: h, channels: ch} = A;
  if (w !== B.width || h !== B.height || ch !== B.channels) {console.log(name + ': sizes differ'); continue;}
  const delta = (img, p, q) => {let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(img.px[p * ch + c] - img.px[q * ch + c])); return d;};
  const edge = (img, p) => {const x = p % w, y = (p / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && delta(img, p, Y * w + X) > threshold) return true;} return false;};
  let differing = 0, edges = 0, shading = 0, neither = 0, edgePixels = 0, maxDelta = 0;
  for (let p = 0; p < w * h; p++) {
    if (edge(A, p)) edgePixels++;
    let d = 0; for (let c = 0; c < ch; c++) d = Math.max(d, Math.abs(A.px[p * ch + c] - B.px[p * ch + c]));
    if (!d) continue; differing++; maxDelta = Math.max(maxDelta, d);
    if (edge(A, p) || edge(B, p)) edges++; else if (d <= 2) shading++; else neither++;
  }
  console.log(`${name}: ${differing} of ${w * h} differ (max delta ${maxDelta}) — ${edges} on edges, ${shading} shading (<= 2), ${neither} neither; edge pixels ${(100 * edgePixels / (w * h)).toFixed(2)}% of the frame`);
}
