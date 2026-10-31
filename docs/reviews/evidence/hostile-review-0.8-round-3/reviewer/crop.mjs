// Crop and upscale PNGs written by pixel-probe.mjs (RGBA, filter 0 on every row).
//   node crop.mjs <out.png> <x> <y> <w> <h> <scale> <in.png> [<in.png> ...]   (inputs side by side)
import fs from 'node:fs';
import zlib from 'node:zlib';
const [out, X, Y, W, H, S, ...inputs] = process.argv.slice(2);
const x0 = +X, y0 = +Y, w = +W, h = +H, s = +S;
function read(file) {
  const buf = fs.readFileSync(file); let p = 8, width = 0, height = 0; const idat = [];
  while (p < buf.length) {const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {width = data.readUInt32BE(0); height = data.readUInt32BE(4);} else if (type === 'IDAT') idat.push(data); p += 12 + len;}
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {if (raw[y * (width * 4 + 1)] !== 0) throw Error('unsupported filter'); raw.copy(px, y * width * 4, y * (width * 4 + 1) + 1, (y + 1) * (width * 4 + 1));}
  return {width, height, px};
}
const imgs = inputs.map(read), OW = w * s * imgs.length + (imgs.length - 1) * 4, OH = h * s, o = Buffer.alloc(OW * OH * 4, 255);
imgs.forEach((img, k) => {for (let y = 0; y < OH; y++) for (let x = 0; x < w * s; x++) {const sx = x0 + Math.floor(x / s), sy = y0 + Math.floor(y / s), si = (sy * img.width + sx) * 4, di = (y * OW + k * (w * s + 4) + x) * 4; img.px.copy(o, di, si, si + 4);}});
const crcTable = Array.from({length: 256}, (_, n) => {let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;});
const crc = b => {let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0;};
const chunk = (type, data) => {const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]);};
const rows = Buffer.alloc((OW * 4 + 1) * OH); for (let y = 0; y < OH; y++) o.copy(rows, y * (OW * 4 + 1) + 1, y * OW * 4, (y + 1) * OW * 4);
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(OW, 0); ihdr.writeUInt32BE(OH, 4); ihdr[8] = 8; ihdr[9] = 6;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote', out, OW + 'x' + OH);
