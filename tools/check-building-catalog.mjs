import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{DESIGNS,compileBuilding,roomAccess}from'../packages/building-catalog/index.js';
import {execFileSync} from 'node:child_process';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {createBuildingModel} from '../packages/building-catalog/three.js';
// The exports must be what the current renderer draws: each mesh node, in the same
// preorder, carries the model's own name and position, normal and UV bytes. A renderer
// change that refreshes the hashes but not the exports fails here.
function exportMatchesModel(gltf,bin,building){
 const model=createBuildingModel(T,building),meshes=[];
 try{model.root.traverse(node=>{if(node.isMesh)meshes.push(node);});
  const nodes=gltf.nodes.filter(node=>node.mesh!==undefined);if(nodes.length!==meshes.length)return 'mesh count '+nodes.length+' vs '+meshes.length;
  for(let i=0;i<meshes.length;i++){if(nodes[i].name!==(meshes[i].name||'part'))return 'mesh '+i+' name';const primitive=gltf.meshes[nodes[i].mesh].primitives[0];
   for(const [key,name]of [['POSITION','position'],['NORMAL','normal'],['TEXCOORD_0','uv']]){const view=gltf.bufferViews[gltf.accessors[primitive.attributes[key]].bufferView],array=meshes[i].geometry.attributes[name].array;
    if(!bin.subarray(view.byteOffset,view.byteOffset+view.byteLength).equals(Buffer.from(array.buffer,array.byteOffset,array.byteLength)))return 'mesh '+i+' '+name;}}
  return null;}finally{model.dispose();}
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/buildings/catalogue.json'))),references=JSON.parse(fs.readFileSync(path.join(root,'art/buildings/reference-register.json'))),sources=new Map(references.records.map(r=>[r.id,r]));
const hash=b=>createHash('sha256').update(b).digest('hex');
const tracked=process.argv.includes('--tracked')?new Set(execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,'ls-files','-z'],{encoding:'utf8'}).split('\0')):null;
const requireTracked=file=>{if(tracked&&!tracked.has(file))throw Error('Building dependency is not tracked: '+file);};
for(const file of ['assets/buildings/catalogue.json','assets/buildings/'+manifest.atlas.file,'art/buildings/reference-register.json',...manifest.inputs.map(i=>i.file)])requireTracked(file);
if(manifest.buildings.length!==DESIGNS.length||new Set(DESIGNS.map(b=>b.id)).size!==DESIGNS.length)throw Error('Catalogue identity/count mismatch.');
for(const input of manifest.inputs)if(hash(fs.readFileSync(path.join(root,input.file)))!==input.sha256)throw Error('Stale building exports: '+input.file+'; run npm run build:buildings.');
const atlas=fs.readFileSync(path.join(root,'assets/buildings',manifest.atlas.file));if(hash(atlas)!==manifest.atlas.sha256||atlas.readUInt32BE(16)!==manifest.atlas.width||atlas.readUInt32BE(20)!==manifest.atlas.height)throw Error('Atlas evidence mismatch.');
let triangles=0,rooms=0;for(const design of DESIGNS){const b=compileBuilding(design),entry=manifest.buildings.find(x=>x.id===b.id);for(const id of b.refs)if(!sources.has(id)||sources.get(id).status!=='opened')throw Error('Missing opened reference: '+b.id+' / '+id);if(roomAccess(b).some(f=>f.unreached.length))throw Error('Disconnected descriptive room graph: '+b.id);if(entry.gameTriangles>=entry.authoringTriangles)throw Error('No documented source/game reduction: '+b.id);
 for(const file of entry.files){requireTracked('assets/buildings/'+file.path);const bytes=fs.readFileSync(path.join(root,'assets/buildings',file.path));if(bytes.length!==file.bytes||hash(bytes)!==file.sha256)throw Error('Changed export: '+file.path);}
 const blueprint=JSON.parse(fs.readFileSync(path.join(root,'assets/buildings/models',b.id+'.blueprint.json')));if(JSON.stringify(blueprint)!==JSON.stringify(b))throw Error('Stale room/opening data: '+b.id);
 const gltf=JSON.parse(fs.readFileSync(path.join(root,'assets/buildings/models',b.id+'.gltf'))),bin=fs.readFileSync(path.join(root,'assets/buildings/models',b.id+'.bin'));if(gltf.asset.version!=='2.0'||gltf.buffers[0].byteLength!==bin.length||gltf.extras.assetId!==b.id)throw Error('Invalid glTF identity/buffer: '+b.id);
 for(const view of gltf.bufferViews)if(view.byteOffset%4||view.byteOffset+view.byteLength>bin.length)throw Error('Invalid buffer view: '+b.id);
 for(const accessor of gltf.accessors){const view=gltf.bufferViews[accessor.bufferView],width={VEC2:2,VEC3:3}[accessor.type];if(accessor.componentType!==5126||view.byteLength!==accessor.count*width*4)throw Error('Invalid accessor: '+b.id);for(let offset=view.byteOffset;offset<view.byteOffset+view.byteLength;offset+=4)if(!Number.isFinite(bin.readFloatLE(offset)))throw Error('Nonfinite export: '+b.id);}
 for(const node of gltf.nodes)if(node.children?.some(i=>i>=gltf.nodes.length)||node.mesh!==undefined&&node.mesh>=gltf.meshes.length)throw Error('Invalid glTF graph: '+b.id);
 for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){if(primitive.material>=gltf.materials.length)throw Error('Missing glTF material.');const count=gltf.accessors[primitive.attributes.POSITION].count;if(count%3||gltf.accessors[primitive.attributes.NORMAL].count!==count||gltf.accessors[primitive.attributes.TEXCOORD_0].count!==count)throw Error('Attribute mismatch.');}
 const stale=exportMatchesModel(gltf,bin,b);if(stale)throw Error('Stale building export for '+b.id+' ('+stale+'); run npm run build:buildings.');
 triangles+=entry.gameTriangles;rooms+=entry.rooms;
}
console.log('Verified '+DESIGNS.length+' original buildings, '+rooms+' rooms, '+triangles.toLocaleString()+' game triangles, source/game reductions, reference IDs, atlas, glTF graphs/buffers, all export hashes and every exported mesh against the current renderer.');
