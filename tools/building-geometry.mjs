// Canonical digest of an original building model: what a viewer and a host can
// tell apart. It covers node order, types, names, visibility, local transforms,
// draw order, layers and culling; user data and each mesh's material settings;
// every attribute byte and the draw range; bounds and the triangle count. It also
// covers the visibility of every node in each view the model's setView offers (roofs
// off, every floor's cutaway, every floor limit) and every door pivot with its doors
// open. Equal digests mean the same untextured model as far as this key sees, whatever
// its source text (what it does not see is listed below). The model is left exactly as
// it was found.
// A material is every setting it holds (each own property, which is what the renderer
// reads: clipping planes and defines included), with each texture's settings in place of
// its id, and what the renderer compiles from it that no setting shows: the shader its
// onBeforeCompile writes from the material's own shader, and a custom program cache
// key. Any other own hook is refused rather than left out (round 4 of the 0.8 series:
// Material.toJSON, the key before, left out clipping planes and shader patches).
// Not keyed (round 5, SF-J): the atlas the editor passes (the digests are made without
// one), what a hook does given a renderer or the renderer's own parameters (it runs with
// null and a five-field stub), hooks inherited from a prototype, morph targets, geometry
// bounds, and the original provider's own changes to the materials it copies.
import {createHash} from 'node:crypto';
import * as T from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
const sha256=data=>createHash('sha256').update(data).digest('hex');
const SHADERS={MeshBasicMaterial:'basic',MeshLambertMaterial:'lambert',MeshPhongMaterial:'phong',MeshStandardMaterial:'physical',MeshPhysicalMaterial:'physical',MeshToonMaterial:'toon',MeshMatcapMaterial:'matcap',MeshNormalMaterial:'normal',MeshDepthMaterial:'depth',MeshDistanceMaterial:'distanceRGBA',LineBasicMaterial:'basic',LineDashedMaterial:'dashed',PointsMaterial:'points',ShadowMaterial:'shadow',SpriteMaterial:'sprite'};
function canonical(value,meta){
  if(value===null||typeof value!=='object')return value;
  if(value.isTexture){const {uuid,image,metadata,...settings}=value.toJSON(meta);return settings;}
  if(Array.isArray(value)||ArrayBuffer.isView(value))return Array.from(value,item=>canonical(item,meta));
  if(typeof value.toArray==='function')return value.toArray();
  const out={};for(const key of Object.keys(value).sort())out[key]=canonical(value[key],meta);return out;
}
function materialKey(m){
  const meta={textures:{},images:{}},data={};
  for(const key of Object.keys(m).sort()){
    if(key==='uuid'||key==='version')continue;
    if(typeof m[key]==='function'){if(key!=='onBeforeCompile'&&key!=='customProgramCacheKey')throw Error('A building material has its own '+key+' hook, which the digest cannot key; extend tools/building-geometry.mjs.');continue;}
    data[key]=canonical(m[key],meta);
  }
  // What onBeforeCompile writes, run on the shader the renderer would hand it.
  const source=m.isShaderMaterial?m:T.ShaderLib[SHADERS[m.type]];
  if(!source)throw Error('No shader to run '+m.type+'\'s onBeforeCompile on; extend tools/building-geometry.mjs.');
  const shader={shaderName:m.type,uniforms:T.UniformsUtils.clone(source.uniforms||{}),vertexShader:source.vertexShader,fragmentShader:source.fragmentShader,defines:{...m.defines}};
  m.onBeforeCompile(shader,null);data['compiled']=sha256(JSON.stringify(canonical(shader,meta)));
  // The default program key is onBeforeCompile's source text, whose effect is keyed above.
  const programKey=m.customProgramCacheKey();if(programKey!==m.onBeforeCompile.toString())data['programKey']=programKey;
  return JSON.stringify(data);
}
export function buildingDigest(model){
  const lines=[];
  model.root.traverse(node=>{
    for(const key of Object.keys(node))if(typeof node[key]==='function')throw Error('A building node has its own '+key+' hook, which the digest cannot key; extend tools/building-geometry.mjs.');
    const line=[node.type,node.name,node.visible,node.matrix.elements.join(','),JSON.stringify(node.userData),'order:'+node.renderOrder,'layers:'+node.layers.mask,'culled:'+node.frustumCulled];
    if(node.isMesh){
      const geometry=node.geometry;
      for(const name of Object.keys(geometry.attributes).sort()){const a=geometry.attributes[name];line.push(name+':'+a.itemSize+':'+sha256(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength)));}
      line.push('index:'+(geometry.index?sha256(Buffer.from(geometry.index.array.buffer)):'-'),'groups:'+JSON.stringify(geometry.groups),'range:'+geometry.drawRange.start+','+geometry.drawRange.count,node.castShadow,node.receiveShadow,'material:'+[].concat(node.material).map(materialKey).join('+'));
      line.push('depth:'+(node.customDepthMaterial?materialKey(node.customDepthMaterial):'-'),'distance:'+(node.customDistanceMaterial?materialKey(node.customDistanceMaterial):'-'));
    }
    lines.push(line.join(';'));
  });
  lines.push('triangles:'+model.triangles,'bounds:'+JSON.stringify(model.bounds));
  // View rules: the visibility of every node in each view.
  const nodes=[];model.root.traverse(node=>nodes.push(node));
  const before=nodes.map(node=>node.visible),levels=[...new Set(model.root.children.map(child=>child.userData.level??0))].sort((a,b)=>a-b);
  const views=[{roof:false},...levels.flatMap(level=>[{roof:false,cutaway:true,maxLevel:level},{maxLevel:level}])];
  for(const view of views){model.setView(view);lines.push('view '+JSON.stringify(view)+':'+nodes.map(node=>node.visible?1:0).join(''));}
  nodes.forEach((node,i)=>{node.visible=before[i];});
  // Door swing: every pivot's matrix with the doors open.
  model.setDoorsOpen(true);for(const pivot of model.doorRoots){pivot.updateMatrix();lines.push('open '+pivot.name+':'+pivot.matrix.elements.join(','));}
  model.setDoorsOpen(false);for(const pivot of model.doorRoots)pivot.updateMatrix();
  return sha256(lines.join('\n'));
}
export function buildingDigests(T,createBuildingModel,ids,lods=['game','authoring']){
  const digests={};
  for(const lod of lods)for(const id of ids){const model=createBuildingModel(T,id,{lod});try{digests[lod+':'+id]=buildingDigest(model);}finally{model.dispose();}}
  return digests;
}
