// Offline packaging only. The brushwork is the retained imagegen master, not noise.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
let sharp;try{sharp=createRequire(import.meta.url)('sharp');}catch{sharp=createRequire(path.join(process.env.CODEX_NODE_MODULES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'sharp/package.json'))('sharp');}
const source=path.join(root,'assets/fantasy-equipment/source/paint-master.png');
const raw=await sharp(source).resize(512,512,{kernel:'lanczos3'}).removeAlpha().raw().toBuffer();
const packed=Buffer.alloc(512*512*2),decoded=Buffer.alloc(512*512*4);
for(let i=0;i<512*512;i++){const r=raw[i*3]>>3,g=raw[i*3+1]>>2,b=raw[i*3+2]>>3,n=(r<<11)|(g<<5)|b;packed.writeUInt16LE(n,i*2);decoded[i*4]=(r<<3)|(r>>2);decoded[i*4+1]=(g<<2)|(g>>4);decoded[i*4+2]=(b<<3)|(b>>2);decoded[i*4+3]=255;}
await sharp(decoded,{raw:{width:512,height:512,channels:4}}).png({compressionLevel:9}).toFile(path.join(root,'assets/fantasy-equipment/paint-atlas.png'));
fs.writeFileSync(path.join(root,'packages/fantasy-equipment-art/paint-data.js'),`// Generated RGB565 brush atlas. Rebuild: node tools/fantasy-equipment-art/bake-paint.mjs\nexport const PAINT_SIZE=512;\nconst DATA='${packed.toString('base64')}';\nlet decoded;\nexport function equipmentPaintPixels(){\n if(!decoded){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',bytes=new Uint8Array(512*512*2);let accumulator=0,bits=0,k=0;for(const c of DATA){if(c==='=')break;accumulator=(accumulator<<6)|alphabet.indexOf(c);bits+=6;if(bits>=8){bits-=8;bytes[k++]=(accumulator>>bits)&255;}}decoded=new Uint8Array(512*512*4);for(let i=0;i<512*512;i++){const n=bytes[i*2]|bytes[i*2+1]<<8,r=n>>11,g=(n>>5)&63,b=n&31;decoded[i*4]=(r<<3)|(r>>2);decoded[i*4+1]=(g<<2)|(g>>4);decoded[i*4+2]=(b<<3)|(b>>2);decoded[i*4+3]=255;}}\n return decoded.slice(); // Each model owns its texture bytes, including retirement.\n}\n`);
const hash=file=>createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const files=['assets/fantasy-equipment/source/paint-master.png','assets/fantasy-equipment/source/paint-prompt.json','assets/fantasy-equipment/paint-atlas.png','assets/fantasy-equipment/NOTICE.md','packages/fantasy-equipment-art/paint-data.js','packages/fantasy-equipment-art/geometry.js','packages/fantasy-equipment-art/specs.js','packages/fantasy-equipment-art/catalogue.js','packages/fantasy-equipment-art/three.js','tools/fantasy-equipment-art/bake-paint.mjs'];
fs.writeFileSync(path.join(root,'assets/fantasy-equipment/provenance.json'),JSON.stringify({version:1,author:'Original Nautilus equipment art, Codex artist',created:'2026-11-26',geometry:'Original deterministic mesh recipes in packages/fantasy-equipment-art/geometry.js; no donor meshes or textures imported.',paint:'Original built-in imagegen paint-master with retained exact prompt; deterministic Lanczos resize and RGB565 packing. No third-party art.',packing:{width:512,height:512,kernel:'lanczos3',encoding:'Little-endian RGB565 expanded to owned RGBA8 pixels',sharp:sharp.versions.sharp,node:process.version},sourceBase:'796c1e73644a30a3061d2f38b3bcccab49519453',rebuild:'node tools/fantasy-equipment-art/bake-paint.mjs',resources:files.map(file=>({file,bytes:fs.statSync(path.join(root,file)).size,sha256:hash(file)}))},null,2)+'\n');
console.log('Packed original painted atlas: 512 square, RGB565; runtime 1 MiB RGBA per model.');
