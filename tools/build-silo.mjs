import fs from 'node:fs';import path from 'node:path';import {fileURLToPath}from'node:url';import{createHash}from'node:crypto';import{gzipSync}from'node:zlib';
import{SILO_ASSETS,SILO_PLAN,createSiloBlueprint,siloHeightReference}from'../packages/silo/index.js';
import{buildSiloMesh,siloMotionBounds}from'../packages/silo/mesh.js';import{exportSiloGLTF}from'./export-silo-gltf.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'assets/silo'),sculpts=path.join(root,'art/silo/sculpts'),models=path.join(out,'models');
fs.mkdirSync(models,{recursive:true});fs.mkdirSync(sculpts,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
function write(target,data){target=path.resolve(target);if(!target.startsWith(out+path.sep)&&!target.startsWith(sculpts+path.sep))throw Error('Silo export escaped owned directories.');
 const bytes=Buffer.isBuffer(data)?data:Buffer.from(typeof data==='string'?data:JSON.stringify(data));if(fs.existsSync(target)&&fs.readFileSync(target).equals(bytes))return {path:path.relative(root,target).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)};
 fs.writeFileSync(target,bytes);return {path:path.relative(root,target).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)};
}
const selected=process.argv.includes('--asset')?process.argv[process.argv.indexOf('--asset')+1]:null,entries=[];
for(const asset of SILO_ASSETS.filter(a=>!selected||a.id===selected)){
 const files=[];let sourceMetrics,sourceBounds;
 {const source=buildSiloMesh(asset.id,{lod:'source'});sourceMetrics=source.metrics;sourceBounds=source.bounds;files.push(write(path.join(sculpts,asset.id+'.source-mesh.json.gz'),gzipSync(Buffer.from(JSON.stringify(source)),{level:9})));}
 const game=buildSiloMesh(asset.id),blueprint=createSiloBlueprint(asset.id),motionBounds=siloMotionBounds(game);
 files.push(write(path.join(models,asset.id+'.game-mesh.json.gz'),gzipSync(Buffer.from(JSON.stringify(game)),{level:9})));
 files.push(write(path.join(models,asset.id+'.blueprint.json'),{...blueprint,bounds:game.bounds,motionBounds,semantics:game.semantics}));
 const atlasMesh=buildSiloMesh(asset.id,{uvMode:'atlas'}),{gltf,bin}=exportSiloGLTF(atlasMesh);
 files.push(write(path.join(models,asset.id+'.gltf'),gltf));files.push(write(path.join(models,asset.id+'.bin'),bin));
 entries.push({...asset,source:sourceMetrics,game:game.metrics,gltf:atlasMesh.metrics,sourceBounds,bounds:game.bounds,motionBounds,
  reduction:1-game.metrics.triangles/sourceMetrics.triangles,files});
 console.log(JSON.stringify({id:asset.id,source:sourceMetrics.triangles,game:game.metrics.triangles,gltf:atlasMesh.metrics.triangles,filesBytes:files.reduce((n,f)=>n+f.bytes,0)}));
}
if(selected){if(!entries.length)throw Error('Unknown selected silo asset.');}else{
 const atlas=fs.readFileSync(path.join(out,'painted-silo-materials-v1.png'));
 const sources=['packages/silo/designs.js','packages/silo/geometry.js','packages/silo/mesh.js','packages/silo/index.js','packages/silo/three.js','tools/build-silo.mjs','tools/export-silo-gltf.mjs'];
 write(path.join(out,'height-reference.json'),siloHeightReference());
 write(path.join(out,'artist-binding.json'),{version:1,units:'metres',nativeToWorld:SILO_PLAN.nativeToWorld,floors:SILO_PLAN.floors,sourceWorldPin:'fbb57293805ecae34569ab3dd9f689ffea53beb0',
  heightReference:'height-reference.json',geometry:'Original custom annular/polygon provider; not one legacy six-layer map and not exact curved collision in the current AABB world provider.',
  geometryCapabilityRegistered:false,gameplayAdapter:null,originalSurfaceDatum:0,deepestOccupiedNativeY:-46.64,translationM:46.64,
  changes:'No core, editor, vendor, public export, version or consumer pin changes.'});
 write(path.join(out,'catalogue.json'),{schemaVersion:1,collection:'nautilus-silo-v1',name:'Coldwell Silo',assetCount:entries.length,units:'metres',levelInterval:2.12,
  artistIntake:true,consumerIntegrated:false,atlas:{path:'painted-silo-materials-v1.png',width:atlas.readUInt32BE(16),height:atlas.readUInt32BE(20),sha256:hash(atlas)},
  inputs:sources.map(p=>({path:p,sha256:hash(fs.readFileSync(path.join(root,p)))})),assets:entries});
}
