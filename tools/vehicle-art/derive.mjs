// Deterministic derivatives of approved Git bytes. Alpha is data, not opacity.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),pin='5d8962e7764bce3fcfff8f4dfd4883bfec97b0ee';
const source=path.join(root,'vendor/nautilus-road-vehicles',pin),target=path.join(root,'packages/vehicle-visuals');
const require=createRequire(import.meta.url);let sharp;try{sharp=require('sharp');}catch{sharp=createRequire(path.join(process.env.CODEX_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'sharp/package.json'))('sharp');}
const sha=b=>createHash('sha256').update(b).digest('hex'),write=(name,bytes)=>{const p=path.join(target,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,bytes);};
fs.mkdirSync(path.join(root,'packages/vehicle-core'),{recursive:true});
let catalogue=fs.readFileSync(path.join(source,'packages/vehicle-visuals/catalogue.js'),'utf8');catalogue=catalogue.replace("source: Object.freeze({project: 'nautilus', profile:","source: Object.freeze({project: 'nautilus', commit: '"+pin+"', profile:").replace("modelId: row.id, guide: 'docs/road-vehicles.md',","modelId: row.id, guide: 'docs/road-vehicles.md',\n  usageCard: 'packages/vehicle-core/usage-card.json', logicEntry: './vehicles',\n  factoryOptions: Object.freeze({bodies: Object.freeze([row.form]), purpose: 'authoring'}),");fs.writeFileSync(path.join(root,'packages/vehicle-core/catalogue.js'),catalogue);
write('sculpt.js',fs.readFileSync(path.join(source,'packages/vehicle-visuals/sculpt.js'),'utf8').replace("from './catalogue.js'","from '../vehicle-core/catalogue.js'"));
const originalSkins='../../vendor/nautilus-road-vehicles/'+pin+'/packages/vehicle-visuals/skins/';
let legacy=fs.readFileSync(path.join(source,'packages/vehicle-visuals/three.js'),'utf8').replace("from './catalogue.js'","from '../vehicle-core/catalogue.js'").replace("from './reduced.js'","from '../../vendor/nautilus-road-vehicles/"+pin+"/packages/vehicle-visuals/reduced.js'");
legacy="// Adapted historical all-body API: tint-mask-safe owned data textures.\nimport {loadVehicleSkin} from './skin.js';\n"+legacy;
legacy=legacy.replace("url=>new T.TextureLoader().loadAsync(url)","url=>loadVehicleSkin(T,url)").replace("new URL('./skins/'+file,import.meta.url)","new URL('"+originalSkins+"'+file,import.meta.url)").replace('texture.image=loaded.image;','texture.isDataTexture=loaded.isDataTexture===true;texture.image=loaded.image;');write('legacy.js',legacy);
const {VEHICLE_MESH_DATA}=await import(pathToFileURL(path.join(source,'packages/vehicle-visuals/reduced-data.js')));
for(const [id,data] of Object.entries(VEHICLE_MESH_DATA))write('meshes/'+id+'.json',JSON.stringify(data)+'\n');
const manifest={version:1,sourcePin:pin,alpha:'finish tint mask; opaque glass and trim',algorithm:'sharp 512/256: RGB resized independently with Lanczos3; tint mask resized independently with nearest-neighbour. No premultiplied-alpha filtering.',sharp:sharp.versions,profiles:{full:{bodySize:2048,gearSize:1024},game:{bodySize:512,gearSize:256}},textures:[]};
for(const id of [...Object.keys(VEHICLE_MESH_DATA),'running-gear']){
 const original=fs.readFileSync(path.join(source,'packages/vehicle-visuals/skins',id+'.png'));
 const size=id==='running-gear'?256:512;
 const decoded=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=decoded.info.width,h=decoded.info.height;
 const sourceRGB=Buffer.alloc(w*h*3),sourceMask=Buffer.alloc(w*h);for(let i=0;i<w*h;i++){sourceRGB[i*3]=decoded.data[i*4];sourceRGB[i*3+1]=decoded.data[i*4+1];sourceRGB[i*3+2]=decoded.data[i*4+2];sourceMask[i]=decoded.data[i*4+3];}
 // Extract BEFORE constructing either resize pipeline. removeAlpha().resize()
 // still lets libvips premultiply during its earlier resize phase.
 const rgb=await sharp(sourceRGB,{raw:{width:w,height:h,channels:3}}).resize(size,size,{kernel:'lanczos3'}).raw().toBuffer();
 const alpha=await sharp(sourceMask,{raw:{width:w,height:h,channels:1}}).resize(size,size,{kernel:'nearest'}).extractChannel(0).raw().toBuffer();
 const rgba=Buffer.alloc(size*size*4);for(let i=0;i<alpha.length;i++){rgb.copy(rgba,i*4,i*3,i*3+3);rgba[i*4+3]=alpha[i];}
 const game=await sharp(rgba,{raw:{width:size,height:size,channels:4}}).png({compressionLevel:9,adaptiveFiltering:false}).toBuffer();
 write('skins/game/'+id+'.png',game);
 const meta=await sharp(original).metadata();
 for(const [profile,bytes,width] of [['full',original,meta.width],['game',game,size]])manifest.textures.push({id,profile,width,height:width,bytes:bytes.length,sha256:sha(bytes),sourceSha256:sha(original),estimatedRGBA8MipBytes:Math.ceil(width*width*4*4/3)});
}
write('profiles.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({bodies:Object.keys(VEHICLE_MESH_DATA),textures:manifest.textures.map(({id,profile,width,bytes})=>({id,profile,width,bytes}))}));
