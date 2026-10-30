// Asset-rendering benchmark page, driven by tools/bench-asset-rendering.mjs.
// /bench/asset-rendering.html?tree=a imports the engine from /a/ and ?tree=b from
// /b/, so both arms of an A/B run this same instrument on one origin. The host is
// the editor's own house preview scene: PrefabLayer, providers, daylight rig and
// shadows exactly as the building library draws them.
const tree=new URLSearchParams(location.search).get('tree');
if(!/^[a-z]$/.test(tree))throw Error('Name the tree to measure: ?tree=a');
const root='/'+tree+'/',THREE='vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/vendor/three.module.js';
const [T,{BuildingPreviewScene},{buildingAsset}]=await Promise.all([import(root+THREE),import(root+'apps/editor/prefab-preview.js'),import(root+'packages/prefab-core/registry.js')]);
const FLOOR=2.12,now=()=>performance.now();
const median=values=>{const s=[...values].sort((a,b)=>a-b),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const quantile=(values,q)=>{const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*s.length))];};
const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
const sha256=async bytes=>hex(await crypto.subtle.digest('SHA-256',bytes));
// A one-pixel read waits for the GPU to finish the frame, so "total" includes GPU work.
function sync(gl){gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));}

// The building library's own framing (apps/editor/buildings.js fit()).
function fit(models,width,height,preset='0'){
 const box=new T.Box3();for(const model of models)box.expandByObject(model.root);
 const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),aspect=width/height;
 const span=Math.max(3,(size.x+size.z)/Math.SQRT2/aspect,(size.x+size.z)/Math.sqrt(8)+size.y*Math.sqrt(3)/2)*1.14;
 return {view:{x:center.x,y:center.z,span,preset},level:center.y/FLOOR};
}

// Everything a viewer could tell apart, without identities that differ per run
// (uuids): mesh order, names, visibility, world matrices, material settings and
// every attribute/index byte. Shared geometries and materials hash once.
async function sceneDigest(roots){
 const parts=[],geometries=new Map(),materials=new Map(),textures=new Map();
 const textureKey=t=>{if(!t)return null;if(!textures.has(t))textures.set(t,textures.size);return textures.get(t);};
 const materialKey=m=>{if(!materials.has(m))materials.set(m,{index:materials.size,value:[m.type,m.name,m.color?.getHex(),textureKey(m.map),m.transparent,m.opacity,m.side,m.roughness,m.metalness,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,m.depthWrite,m.visible].join('|')});return materials.get(m).index;};
 const geometryKey=g=>{if(!geometries.has(g))geometries.set(g,geometries.size);return geometries.get(g);};
 for(const root of roots){root.updateMatrixWorld(true);root.traverse(node=>{
  const record=[node.type,node.name,node.visible,node.renderOrder,node.matrixWorld.elements.map(n=>n.toPrecision(9)).join(',')];
  if(node.isMesh){record.push(geometryKey(node.geometry),[].concat(node.material).map(materialKey).join('+'),node.castShadow,node.receiveShadow);if(node.isInstancedMesh)record.push(node.count,[...node.instanceMatrix.array].map(n=>n.toPrecision(9)).join(','));}
  parts.push(record.join(';'));
 });}
 const chunks=[];
 for(const [geometry,index]of geometries){
  const names=Object.keys(geometry.attributes).sort(),pieces=[];
  for(const name of names){const a=geometry.attributes[name];pieces.push(name+':'+a.itemSize+':'+a.count+':'+await sha256(a.array));}
  if(geometry.index)pieces.push('index:'+await sha256(geometry.index.array));
  pieces.push('groups:'+JSON.stringify(geometry.groups),'range:'+geometry.drawRange.start+','+geometry.drawRange.count);
  chunks.push(index+'='+pieces.join(','));
 }
 const materialText=[...materials.values()].map(m=>m.index+'='+m.value).join('\n');
 const encoder=new TextEncoder();
 return {meshes:parts.length,geometries:geometries.size,materials:materials.size,textures:textures.size,
  structure:await sha256(encoder.encode(parts.join('\n'))),geometry:await sha256(encoder.encode(chunks.join('\n'))),material:await sha256(encoder.encode(materialText))};
}

function counts(renderer){const info=renderer.info;return {calls:info.render.calls,triangles:info.render.triangles,points:info.render.points,lines:info.render.lines,geometries:info.memory.geometries,textures:info.memory.textures,programs:info.programs?.length??null};}

// spec: {name, instances, providers, views:[{name, framing:'all'|'first', cutaway}], frames, warmup, width, height}
window.runBench=async function(spec){
 const {width=1280,height=800,frames=60,warmup=5}=spec,canvas=document.createElement('canvas');
 canvas.style.width=width+'px';canvas.style.height=height+'px';document.body.append(canvas);
 const result={tree,scene:spec.name,instances:spec.instances.length,width,height,frames,warmup,views:[]};
 const scene=new BuildingPreviewScene(canvas,()=>{}),gl=scene.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
 result.gpu=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 try{
  // 1. Provider libraries (shared atlases/textures), loaded once per scene.
  let t=now();const loads=await Promise.all(spec.providers.map(id=>scene.prefabs.load(id)));result.loadMs=now()-t;
  for(const load of loads)if(load.error)throw load.error;
  // 2. The empty layout ground, so step 3 times only the assets.
  await scene.open({map:{buildingPrefabs:{version:1,instances:[]}},size:240});
  // 3. Templates per design and one clone per instance, as the editor builds them.
  const document={map:{buildingPrefabs:{version:1,instances:spec.instances}},size:240};
  // An optional driver hook (a profiler) brackets each timed phase; it is outside the timings.
  const hook=async phase=>{if(typeof window.benchHook==='function')await window.benchHook(spec.name+':'+phase);};
  await hook('build');t=now();await scene.prefabs.update(document,scene.options);result.buildMs=now()-t;await hook('build-end');scene.document=document;
  if(scene.diagnostics.length)throw Error(scene.diagnostics.join(' '));
  if(scene.prefabs.models.size!==spec.instances.length)throw Error('Built '+scene.prefabs.models.size+' of '+spec.instances.length+' instances.');
  result.templates=scene.prefabs.templates.size;
  const models=[...scene.prefabs.models.values()];
  for(const viewSpec of spec.views){
   scene.options.showAllLevels=!viewSpec.cutaway;scene.options.roofs=!viewSpec.cutaway;scene.prefabs.setView();
   const framed=fit(viewSpec.framing==='first'?models.slice(0,1):models,width,height);scene.options.level=viewSpec.cutaway?0:framed.level;
   const view=framed.view,record={name:viewSpec.name};
   // The first frame of the scene pays for shader programs, uploads and the shadow map.
   t=now();scene.draw(view,width,height);sync(gl);record.firstFrameMs=now()-t;
   for(let i=0;i<warmup;i++){scene.draw(view,width,height);sync(gl);}
   const cpu=[],total=[];await hook('frames:'+viewSpec.name);
   for(let i=0;i<frames;i++){const a=now();scene.draw(view,width,height);const b=now();sync(gl);const c=now();cpu.push(b-a);total.push(c-a);}
   await hook('frames-end:'+viewSpec.name);
   Object.assign(record,{cpuMedianMs:median(cpu),cpuP90Ms:quantile(cpu,.9),totalMedianMs:median(total),totalP90Ms:quantile(total,.9),totalMinMs:Math.min(...total),...counts(scene.renderer)});
   const pixels=new Uint8Array(scene.renderer.domElement.width*scene.renderer.domElement.height*4);
   gl.readPixels(0,0,scene.renderer.domElement.width,scene.renderer.domElement.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   record.pixels=await sha256(pixels);
   result.views.push(record);
  }
  // Untimed probe: how often each frame asks for a program cache key. Three calls
  // it only when it re-derives a material's program (getProgram); a steady scene
  // should not need to.
  if(spec.probe){
   const view=fit(models,width,height).view,original=T.Material.prototype.customProgramCacheKey,patched=new Set();let keys=0;
   T.Material.prototype.customProgramCacheKey=function(){keys++;return original.call(this);};
   scene.scene.traverse(node=>{for(const material of [].concat(node.material||[]))if(Object.hasOwn(material,'customProgramCacheKey')&&!patched.has(material)){const own=material.customProgramCacheKey;material.customProgramCacheKey=()=>{keys++;return own();};patched.add(material);}});
   scene.options.showAllLevels=scene.options.roofs=true;scene.prefabs.setView();scene.draw(view,width,height);keys=0;
   for(let i=0;i<10;i++){scene.draw(view,width,height);sync(gl);}
   T.Material.prototype.customProgramCacheKey=original;
   result.probe={programKeyCallsPerFrame:keys/10,callsPerFrame:scene.renderer.info.render.calls};
  }
  result.digest=await sceneDigest(models.map(model=>model.root));
  result.assets=[...new Set(spec.instances.map(instance=>instance.asset))].map(id=>buildingAsset(id)?.provider+':'+id);
 }finally{
  scene.dispose();result.afterDispose=counts(scene.renderer);canvas.remove();
 }
 return result;
};
window.benchReady=true;
