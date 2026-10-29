// Additive artist output only. No registry, public package, save or donor mutation.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{gzipSync}from'node:zlib';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {MEASURED_RECIPES,MEASURED_CONTRACT,compileMeasured,measuredFloorSvg}from'../packages/measured-buildings/index.js';
import {buildMeasuredMesh}from'../packages/measured-buildings/mesh.js';import{createMeasuredModel}from'../packages/measured-buildings/three.js';
import {exportMeasuredGltf}from'./export-measured-gltf.mjs';
import {MEASURED_PARTS,buildMeasuredPart}from'../packages/measured-buildings/parts.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),asset=path.join(root,'assets/measured-buildings'),art=path.join(root,'art/measured-buildings/sculpts'),sha=data=>createHash('sha256').update(data).digest('hex');
for(const dir of [path.join(asset,'models'),path.join(asset,'parts'),art])fs.mkdirSync(dir,{recursive:true});
function write(file,data){file=path.resolve(file);if(![asset,art].some(base=>file.startsWith(base+path.sep)))throw Error('Measured export escaped its owned folders.');const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);if(!fs.existsSync(file)||!fs.readFileSync(file).equals(bytes))fs.writeFileSync(file,bytes);return{file:path.relative(root,file).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)};}
const records=[];
for(const r of MEASURED_RECIPES){const b=compileMeasured(r),game=buildMeasuredMesh(b),source=buildMeasuredMesh(b,{lod:'source'}),exchange=createMeasuredModel(T,b,{uvMode:'atlas'}),gltf=exportMeasuredGltf(exchange),files=[];
  for(const [name,bytes]of [[r.id+'.gltf',JSON.stringify(gltf.json)],[r.id+'.bin',gltf.bin],[r.id+'.blueprint.json',JSON.stringify(b)],
    [r.id+'.game-mesh.json.gz',gzipSync(Buffer.from(JSON.stringify(game)),{level:9})]])files.push(write(path.join(asset,'models',name),bytes));
  files.push(write(path.join(art,r.id+'.source-mesh.json.gz'),gzipSync(Buffer.from(JSON.stringify(source)),{level:9})));
  for(let level=0;level<r.levels;level++)files.push(write(path.join(asset,'models',r.id+`-level-${level}.svg`),measuredFloorSvg(b,level)));
  records.push({id:r.id,name:r.name,sourceId:r.sourceId,levels:r.levels,bay:r.bay,engineGame:game.metrics,source:source.metrics,
    reduction:1-game.metrics.triangles/source.metrics.triangles,interchange:exchange.data.metrics,bounds:game.bounds,parts:r.parts,files});
  exchange.dispose();console.log(r.id,JSON.stringify({game:game.metrics.triangles,source:source.metrics.triangles,interchange:records.at(-1).interchange.triangles}));
}
const parts=[];
for(const p of MEASURED_PARTS){const game=buildMeasuredPart(p.id),source=buildMeasuredPart(p.id,{lod:'source'}),exchange=createMeasuredModel(T,buildMeasuredPart(p.id,{uvMode:'atlas'}),{uvMode:'atlas'}),gltf=exportMeasuredGltf(exchange),files=[];
  for(const[name,bytes]of [[p.id+'.gltf',JSON.stringify(gltf.json)],[p.id+'.bin',gltf.bin],[p.id+'.blueprint.json',JSON.stringify({...p,contract:game.building.contract,bounds:game.bounds})],
    [p.id+'.game-mesh.json.gz',gzipSync(Buffer.from(JSON.stringify(game)),{level:9})]])files.push(write(path.join(asset,'parts',name),bytes));
  files.push(write(path.join(art,p.id+'.source-mesh.json.gz'),gzipSync(Buffer.from(JSON.stringify(source)),{level:9})));
  parts.push({...p,bounds:game.bounds,sourceBounds:source.bounds,engineGame:game.metrics,source:source.metrics,interchange:exchange.data.metrics,files});exchange.dispose();
}
write(path.join(asset,'parts.json'),JSON.stringify({version:1,collection:'nautilus-measured-parts-v1',contract:MEASURED_CONTRACT,origin:'Each part states its own origin. Complete bounds may extend past nominal modules. Attachments are native render coordinates [x,height,y].',parts},null,2));
const inputFiles=['packages/measured-buildings/designs.js','packages/measured-buildings/index.js','packages/measured-buildings/geometry.js','packages/measured-buildings/mesh.js','packages/measured-buildings/parts.js','packages/measured-buildings/three.js','tools/build-measured-buildings.mjs','tools/export-measured-gltf.mjs','art/measured-buildings/references.json','art/measured-buildings/dimensions.json','art/measured-buildings/skin-prompts.json'];
write(path.join(asset,'catalogue.json'),JSON.stringify({version:1,collection:'nautilus-measured-buildings-v1',baseline:'12ad8c9b1c96637cd05c8e344692063bfde385f3',contract:MEASURED_CONTRACT,
  inputs:inputFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),
  skins:['assets/buildings/painted-materials-v2.png','assets/measured-buildings/painted-granite-v1.png','assets/measured-buildings/painted-roof-felt-v1.png'].map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),buildings:records,
  partsManifest:{file:'assets/measured-buildings/parts.json',sha256:sha(fs.readFileSync(path.join(asset,'parts.json')))}},null,2));
