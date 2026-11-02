import {tileFinishChoice,tileFinishFamily} from './catalogue.js';
import {slots,plainCopy,refuse} from './data.js';

// Optional borrowed-Three finish adapter. Geometry is
// produced by the actual public provider before this module receives a view.
const pools=new WeakMap(),occupied=new WeakMap();
const tones=[.94,.96,.98,1,1.02,1.04,1.01,.97];
function cleanup(){const errors=[];let total=0;return {attempt(fn){try{fn();}catch(e){total++;if(errors.length<64)errors.push(e);}},finish(primary){if(total){const e=new AggregateError(primary?[primary,...errors].slice(0,64):errors,'Finish cleanup failed in '+total+' observer/action(s).');e.code='FINISH_CLEANUP_FAILED';e.failureCount=total;throw e;}if(primary)throw primary;}};}
const textureMaps=['alphaMap','aoMap','bumpMap','normalMap','displacementMap','roughnessMap','metalnessMap','emissiveMap','lightMap'];
function nativeBase(T,base){
 const ordinary=base instanceof T.MeshStandardMaterial&&Object.getPrototypeOf(base)===T.MeshStandardMaterial.prototype&&base.type==='MeshStandardMaterial'&&base.isMeshStandardMaterial===true&&base.isMeshPhysicalMaterial!==true;
 if(!ordinary||base.transparent||base.opacity!==1||base.vertexColors||base.alphaTest!==0||base.onBeforeCompile!==T.Material.prototype.onBeforeCompile||textureMaps.some(k=>base[k]))refuse('FINISH_BASE_MATERIAL','Bind an exact opaque MeshStandardMaterial; Physical, subclasses, other profiles, fields, special maps, alpha and custom shaders need another reviewed adapter.');
}
function shaderPaint(material,family){
 const tile=family.borrowedResource.tile,rect=[tile%4,3-Math.floor(tile/4)],repeat=family.appearance.repeatUV;
 material.onBeforeCompile=shader=>{
  if(!shader.fragmentShader.includes('#include <map_fragment>'))refuse('FINISH_SHADER_PROFILE','The borrowed Three shader profile changed.');
  shader.uniforms.tileFinishRect={value:rect};shader.uniforms.tileFinishRepeat={value:repeat};shader.uniforms.tileFinishFlags={value:family.appearance.pattern==='broad-flag-joints'?1:0};
  shader.fragmentShader='uniform vec2 tileFinishRect;\nuniform vec2 tileFinishRepeat;\nuniform float tileFinishFlags;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
   #ifdef USE_MAP
    vec2 finishUV = vMapUv / tileFinishRepeat;
    vec2 atlasUV = (tileFinishRect + vec2(0.012) + fract(finishUV) * 0.976) / 4.0;
    vec4 sampledDiffuseColor = texture2D(map, atlasUV);
    // Broad flagstone joints are albedo marks; no displacement/extra geometry.
    vec2 flagGrid = vMapUv / vec2(1.2, 0.8);
    flagGrid.x += mod(floor(flagGrid.y),2.0)*0.5;
    vec2 flag = fract(flagGrid);
    float joint = max(1.0-smoothstep(0.0,0.024, min(flag.x,1.0-flag.x)),1.0-smoothstep(0.0,0.024,min(flag.y,1.0-flag.y)));
    float pigment = fract(sin(dot(floor(flagGrid),vec2(127.1,311.7)))*43758.5453);
    vec3 flagPaint = mix(vec3(0.34,0.36,0.34),sampledDiffuseColor.rgb,0.14)*(0.9+0.2*pigment);
    sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb,flagPaint,tileFinishFlags);
    sampledDiffuseColor.rgb *= 1.0 - 0.27 * joint * tileFinishFlags;
    diffuseColor *= sampledDiffuseColor;
   #endif
  `);
 };
 material.customProgramCacheKey=()=> 'nautilus-private-tile-finish-v1';
}
export function createTileFinishPool(options){
 const {THREE:T,atlas,maxMaterials=64}=slots(options,'FINISH_OPTIONS',['THREE','atlas','maxMaterials'],['THREE','atlas']);
 if(!T?.MeshStandardMaterial||!T.Material||!T.Texture||!(atlas instanceof T.Texture)||atlas.isVideoTexture||atlas.colorSpace!==T.SRGBColorSpace||!atlas.image||!Number.isFinite(atlas.image.width)||atlas.image.width<1||!Number.isFinite(atlas.image.height)||atlas.image.height<1||atlas.offset.x!==0||atlas.offset.y!==0||atlas.repeat.x!==1||atlas.repeat.y!==1||atlas.rotation!==0||atlas.center.x!==0||atlas.center.y!==0||atlas.channel!==0||atlas.flipY!==true||atlas.matrix.elements.some((v,i)=>v!==([0,4,8].includes(i)?1:0)))refuse('FINISH_ATLAS','Supply the loaded reviewed sRGB atlas with its identity UV transform, channel zero and top-left image orientation.');
 if(!Number.isInteger(maxMaterials)||maxMaterials<1||maxMaterials>64)refuse('FINISH_MATERIAL_LIMIT','Use an explicit owned-material ceiling from 1 to 64.');
 const owned=new Set(),cache=new Map();let closed=false,operation=false,leases=0;
 const retire=(record,c)=>{if(record.retired)return;record.retired=true;owned.delete(record);const entries=cache.get(record.base);entries?.delete(record.key);if(entries?.size===0)cache.delete(record.base);c.attempt(()=>record.material.dispose());};
 const drain=c=>{if(closed)for(const r of [...owned])if(r.refs===0)retire(r,c);};
 const run=fn=>{if(operation)refuse('REENTRANT_FINISH','Nested finish binding/lifetime mutation is refused; pool disposal latches intent.');operation=true;const c=cleanup();let result,primary;try{result=fn(c);}catch(e){primary=e;}try{drain(c);}finally{operation=false;}c.finish(primary);return result;};
 const state={T,run,check(){if(closed)refuse('FINISH_POOL_RETIRED','A retiring finish pool cannot acquire new bindings.');},acquire(base,choice,c){
  state.check();nativeBase(T,base);const key=choice.skinId+':'+choice.variantSeed%8;let record=cache.get(base)?.get(key),created=false;
  if(!record){if(owned.size>=maxMaterials)refuse('FINISH_MATERIAL_LIMIT','The complete pool would exceed its owned-material ceiling.');const family=tileFinishFamily(choice.skinId),material=new T.MeshStandardMaterial();record={base,key,material,refs:0,retired:false};created=true;owned.add(record);let entries=cache.get(base);if(!entries)cache.set(base,entries=new Map());entries.set(key,record);
   try{material.map=atlas;material.color.setHex(family.appearance.tint).multiplyScalar(tones[choice.variantSeed%8]);material.roughness=base.roughness;material.metalness=base.metalness;material.envMap=base.envMap;material.envMapIntensity=base.envMapIntensity;material.side=T.DoubleSide;material.depthTest=base.depthTest;material.depthWrite=base.depthWrite;material.userData={role:'tile-finish',skinId:choice.skinId,version:1,tone:choice.variantSeed%8};shaderPaint(material,family);state.check();}catch(e){retire(record,c);throw e;}
  }
  record.refs++;leases++;let released=false;return {material:record.material,release(){if(released)return;released=true;record.refs--;leases--;},rollback(c){if(created&&record.refs===0)retire(record,c);}};
 }};
 const pool={diagnostics:()=>({closed,disposed:closed&&owned.size===0,ownedMaterials:owned.size,leases,maxMaterials,newTextures:0,ownedGeometry:0}),dispose(){if(closed)return;closed=true;if(!operation)run(()=>{});}};pools.set(pool,state);return pool;
}
function supported(entry){
 const s=entry.source?.shape,level=c=>{const p=c?.kind==='line'?[c.a,c.b]:c?.kind==='cubic'?c.points:null;return p?p.every(v=>v[2]===p[0][2]):c?.kind==='arc'&&c.h0===c.h1;};
 if(entry.field||!s||s.clip||entry.source.features.some(f=>f!=='canonical-boundaries-v1'))return false;
 if(s.kind==='profile-sweep')return ['line','arc','cubic'].includes(s.path?.kind)&&level(s.path)&&entry.inspected.ports.length===0;
 if(s.kind!=='region'||s.outlines.length!==1||s.outlines[0].kind!=='compound'||s.outlines[0].segments.length!==4)return false;
 const lines=s.outlines[0].segments;if(!lines.every(c=>c.kind==='line'&&level(c)&&c.a[2]===s.baseM&&((c.a[0]===c.b[0])!==(c.a[1]===c.b[1]))))return false;
 return entry.inspected.ports.every(p=>p.profiles.surface.id==='surface.flat'&&p.profiles.surface.version===1&&p.profiles.edge.id==='edge.flat'&&p.profiles.edge.version===1&&p.profiles.border.id==='border.flat'&&p.profiles.border.version===1);
}
export function bindTileFinishView(options){
 const {view,projection,choices,pool,current=()=>true}=slots(options,'FINISH_OPTIONS',['view','projection','choices','pool','current'],['view','projection','choices','pool']);
 const state=pools.get(pool);if(!state||typeof current!=='function')refuse('FINISH_OPTIONS','Supply the actual candidate pool and current-ticket function.');const T=state.T;
 // Reject hostile source/choice descriptors before any native allocation.
 const p=plainCopy(projection),data=plainCopy(choices),ids=p?.entries?.map(e=>e.instanceId);
 if(p.kind!=='nautilus-tile-art-projection'||p.version!==1||!Array.isArray(ids)||ids.length<1||ids.length>32||new Set(ids).size!==ids.length||!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==ids.length||ids.some(id=>!Object.hasOwn(data,id)))refuse('FINISH_OWNERS','Bind exactly the complete public projection owners (1–32).');
 const selected=new Map(ids.map(id=>[id,tileFinishChoice(data[id])]));for(const e of p.entries)if(!supported(e))refuse('FINISH_SOURCE_PROFILE','This finish tranche accepts only level rectangles and isolated level line/arc/cubic paths.');
 if(!view||!(view.root instanceof T.Object3D)||typeof view.diagnostics!=='function'||view.diagnostics().disposed)refuse('FINISH_VIEW','Supply a live view from the actual public provider and the shared Three.');
 const meshes=[],seen=new Set(),walk=[view.root];let count=0;while(walk.length){const n=walk.pop();if(++count>4096||!(n instanceof T.Object3D)||seen.has(n))refuse('FINISH_VIEW','The native view tree is invalid or over budget.');seen.add(n);walk.push(...n.children);if(n.isMesh){if(n.userData?.role!=='canonical-surface'||!selected.has(n.userData.instanceId)||!(n.geometry instanceof T.BufferGeometry))refuse('FINISH_VIEW','Only canonical public surface meshes may receive this appearance.');if(occupied.has(n))refuse('FINISH_ALREADY_BOUND','Retire the previous appearance before rebinding a view.');nativeBase(T,n.material);meshes.push({mesh:n,base:n.material,choice:selected.get(n.userData.instanceId),lease:null,applied:false});}}
 if(ids.some(id=>!meshes.some(r=>r.mesh.userData.instanceId===id)))refuse('FINISH_OWNERS','Every declared owner needs its actual public surface meshes.');
 let disposed=false;const token={},retire=(c,rollback=false)=>{if(disposed)return;disposed=true;for(const r of meshes){if(occupied.get(r.mesh)===token){occupied.delete(r.mesh);if(r.applied)c.attempt(()=>{if(r.mesh.material===r.lease.material)r.mesh.material=r.base;});}r.lease?.release();}if(rollback)for(const r of meshes)r.lease?.rollback(c);};
 const check=()=>{state.check();if(current()!==true)refuse('FINISH_CANCELLED','The current view ticket expired; no appearance can attach.');state.check();if(view.diagnostics().disposed)refuse('FINISH_VIEW','The public view retired during appearance acquisition.');};
 state.run(c=>{try{check();for(const r of meshes){r.lease=state.acquire(r.base,r.choice,c);check();}for(const r of meshes){if(occupied.has(r.mesh)||r.mesh.material!==r.base)refuse('FINISH_ALREADY_BOUND','A concurrent host binding changed during acquisition.');occupied.set(r.mesh,token);r.applied=true;r.mesh.material=r.lease.material;check();}}catch(e){retire(c,true);throw e;}});
 return {diagnostics:()=>({disposed,owners:disposed?0:ids.length,bindings:disposed?0:meshes.length,ownedGeometry:0,newTextures:0}),dispose(){if(disposed)return;state.run(c=>retire(c));}};
}
