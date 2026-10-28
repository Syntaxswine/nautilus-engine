// Additive export only. Existing catalogue/native maps and donor bytes are inputs.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
import {H_PLAN_RECIPES,compileHPlan,hPlanFloorSvg,H_PLAN_CONTRACT} from '../packages/h-plan-buildings/index.js';
import {buildHPlanMesh} from '../packages/h-plan-buildings/mesh.js';import {createHPlanModel} from '../packages/h-plan-buildings/three.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),asset=path.join(root,'assets/h-plan-buildings'),art=path.join(root,'art/h-plan-buildings/sculpts');
fs.mkdirSync(path.join(asset,'models'),{recursive:true});fs.mkdirSync(art,{recursive:true});const sha=data=>createHash('sha256').update(data).digest('hex');
function write(file,data){file=path.resolve(file);if(![asset,art].some(base=>file.startsWith(base+path.sep)))throw Error('H-plan export escaped its owned folders.');const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);if(fs.existsSync(file)&&fs.readFileSync(file).equals(bytes))return;fs.writeFileSync(file,bytes);}
function gltf(model){const chunks=[],bufferViews=[],accessors=[],meshes=[],nodes=[],materials=[],materialIds=new Map();let byteLength=0;
  const view=array=>{const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),index=bufferViews.length;bufferViews.push({buffer:0,byteOffset:byteLength,byteLength:bytes.length});chunks.push(bytes);byteLength+=bytes.length;return index;};
  const accessor=(array,type,count,componentType=5126,bounds=false)=>{const a={bufferView:view(array),componentType,type,count};if(bounds){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<array.length;i++) {a.min[i%3]=Math.min(a.min[i%3],array[i]);a.max[i%3]=Math.max(a.max[i%3],array[i]);}}const index=accessors.length;accessors.push(a);return index;};
  for(const[id,m]of model.materials){materialIds.set(m.uuid,materials.length);materials.push({name:id,pbrMetallicRoughness:{baseColorFactor:[...(id==='felt'?[1,1,1]:m.color.toArray()),m.opacity],roughnessFactor:m.roughness,metallicFactor:m.metalness,...(id==='glass'?{}:{baseColorTexture:{index:id==='stone'?1:id==='felt'?2:0}})},...(id==='glass'?{alphaMode:'BLEND',doubleSided:false}:{})});}
  function node(object){object.updateMatrix();const index=nodes.length,n={name:object.name,matrix:object.matrix.toArray(),extras:object.userData};nodes.push(n);
    if(object.isMesh){const geometry=object.geometry,p=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv,map=new Map(),pos=[],normal=[],tex=[],indices=[];
      // glTF's UV origin is the image's upper-left. The source Three textures
      // use flipY=true, so reflect V for standard flipY=false glTF readers.
      for(let i=0;i<p.count;i++){const values=[p.getX(i),p.getY(i),p.getZ(i),norm.getX(i),norm.getY(i),norm.getZ(i),uv.getX(i),uv.getY(i)],key=values.join(',');let v=map.get(key);if(v===undefined){v=pos.length/3;map.set(key,v);pos.push(...values.slice(0,3));normal.push(...values.slice(3,6));tex.push(values[6],1-values[7]);}indices.push(v);}
      const attrs={POSITION:accessor(new Float32Array(pos),'VEC3',pos.length/3,5126,true),NORMAL:accessor(new Float32Array(normal),'VEC3',normal.length/3),TEXCOORD_0:accessor(new Float32Array(tex),'VEC2',tex.length/2)};
      n.mesh=meshes.length;meshes.push({name:object.name,primitives:[{attributes:attrs,indices:accessor(new Uint32Array(indices),'SCALAR',indices.length,5125),material:materialIds.get(object.material.uuid),mode:4}]});
    }
    if(object.children.length)n.children=object.children.map(node);return index;
  }
  const rootNode=node(model.root),json={asset:{version:'2.0',generator:'Nautilus H-plan apartment collection v1; baked atlas UV interchange'},scene:0,scenes:[{nodes:[rootNode]}],nodes,meshes,materials,
    buffers:[{uri:model.building.id+'.bin',byteLength}],bufferViews,accessors,images:[{uri:'../../buildings/painted-materials-v2.png'},{uri:'../painted-limestone-v1.png'},{uri:'../painted-roof-felt-v1.png'}],
    samplers:[{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071},{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],textures:[{source:0,sampler:0},{source:1,sampler:1},{source:2,sampler:1}],
    extras:{collection:'h-plan-buildings-v1',assetId:model.building.id,contract:H_PLAN_CONTRACT,sourceReferences:model.building.sourceReferences,consumerIntegrated:false,texturePolicy:'Standard glTF uses atlas-clipped tessellation; compact engine meshes use metre UVs and the supplied adapter.'}};
  return {json,bin:Buffer.concat(chunks)};
}
const records=[];
for(const recipe of H_PLAN_RECIPES){const building=compileHPlan(recipe),game=buildHPlanMesh(building),source=buildHPlanMesh(building,{lod:'source'}),exchange=createHPlanModel(T,building,{uvMode:'atlas'}),exported=gltf(exchange),files=[];
  const put=(relative,data,base=asset)=>{const bytes=Buffer.isBuffer(data)?data:Buffer.from(data);write(path.join(base,relative),bytes);files.push({file:path.relative(root,path.join(base,relative)).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});};
  put('models/'+recipe.id+'.gltf',JSON.stringify(exported.json));put('models/'+recipe.id+'.bin',exported.bin);put('models/'+recipe.id+'.assembly.json',JSON.stringify(building));
  put('models/'+recipe.id+'.game-mesh.json.gz',gzipSync(Buffer.from(JSON.stringify(game)),{level:9}));
  put(recipe.id+'.source-mesh.json.gz',gzipSync(Buffer.from(JSON.stringify(source)),{level:9}),art);
  for(let floor=0;floor<recipe.stories;floor++)put('models/'+recipe.id+`-floor-${floor+1}.svg`,hPlanFloorSvg(building,floor));
  records.push({id:recipe.id,name:recipe.name,period:recipe.period,width:building.width,depth:building.depth,stories:recipe.stories,circulation:building.circulation,
    courts:building.courts,apartmentCount:game.metrics.apartments,windowCount:game.metrics.windows,stairFlights:building.stairs.length*2,
    engineGame:game.metrics,source:source.metrics,sourceReduction:1-game.metrics.triangles/source.metrics.triangles,interchange:exchange.data.metrics,bounds:game.bounds,files});
  exchange.dispose();console.log(recipe.id,JSON.stringify({game:game.metrics.triangles,source:source.metrics.triangles,interchange:records.at(-1).interchange.triangles}));
}
const inputs=['packages/h-plan-buildings/designs.js','packages/h-plan-buildings/index.js','packages/h-plan-buildings/mesh.js','packages/h-plan-buildings/three.js','tools/build-h-plan-buildings.mjs','art/h-plan-buildings/references.json','art/h-plan-buildings/skin-prompts.json'];
const skins=['assets/buildings/painted-materials-v2.png','assets/h-plan-buildings/painted-limestone-v1.png','assets/h-plan-buildings/painted-roof-felt-v1.png'];
write(path.join(asset,'catalogue.json'),JSON.stringify({version:1,collection:'h-plan-buildings-v1',baseline:'12ad8c9b1c96637cd05c8e344692063bfde385f3',contract:H_PLAN_CONTRACT,
  inputs:inputs.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),skins:skins.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),buildings:records},null,2));
