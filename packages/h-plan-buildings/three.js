// Additive art adapter; caller supplies its existing Three.js and loaded skins.
import {buildHPlanMesh,H_PLAN_MATERIALS} from './mesh.js';
export function createHPlanModel(T,input,{atlas=null,roofTexture=null,stoneTexture=null,lod='game',uvMode='metres',grey=false}={}){
  if(!T?.Group||!T.BufferGeometry||!T.MeshStandardMaterial)throw Error('Supply the host Three.js instance.');
  if([atlas,roofTexture,stoneTexture].some(t=>t!==null&&!t?.isTexture))throw Error('Supply host textures or null.');
  if(!grey&&atlas&&!T.ShaderChunk?.map_fragment?.includes('texture2D( map, vMapUv )'))throw Error('Use a supported host Three map shader for the painted H-plan atlas.');
  const data=buildHPlanMesh(input,{lod,uvMode}),b=data.building,root=new T.Group(),materials=new Map(),geometries=new Set(),pivots=[];
  root.name=b.id;root.userData={assetId:b.id,collection:'h-plan-buildings-v1',metresPerUnit:1,consumerIntegrated:false};
  for(const id of Object.keys(H_PLAN_MATERIALS)){
    const tint=id==='brick'?b.recipe.brickTint:id==='stone'?b.recipe.stoneTint:id==='sash'?b.recipe.trimTint:id==='iron'?[.22,.25,.23]:id==='plaster'?[.91,.89,.81]:id==='wood'?[.78,.75,.65]:[1,1,1];
    const material=new T.MeshStandardMaterial({color:grey?0xa9ada3:new T.Color(...tint.map(value=>Math.max(0,Math.min(1,value)))),roughness:id==='glass'?.3:.96,metalness:id==='iron'?.12:0,map:grey||id==='glass'?null:id==='felt'?roofTexture:id==='stone'?stoneTexture:atlas,
      transparent:id==='glass',opacity:id==='glass'?(grey?.13:.42):1,side:T.FrontSide});
    if(id==='glass')material.color.set(grey?'#6b7b77':'#78928f');if(id==='felt'&&!roofTexture)material.color.set(grey?'#a9ada3':'#5b605c');material.name=id;materials.set(id,material);
    const tile=H_PLAN_MATERIALS[id].tile;
    if(!grey&&atlas&&uvMode==='metres'&&tile!==null&&id!=='stone'){const sample='texture2D( map, vMapUv )';
      const col=tile%4,row=3-Math.floor(tile/4),offset=[(col+.012)/4,(row+.012)/4],scale=.976/4;
      material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace(sample,`textureGrad( map, vec2(${offset.join(',')}) + fract(vMapUv) * ${scale}, dFdx(vMapUv) * ${scale}, dFdy(vMapUv) * ${scale} )`));};material.customProgramCacheKey=()=>`h-plan-atlas-v1:${tile}`;}
  }
  function mesh(batch,parent){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(batch.normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(batch.uvs,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();geometries.add(geometry);const m=new T.Mesh(geometry,materials.get(batch.material));m.name=`${batch.kind}-L${batch.level}-${batch.material}`;m.userData={kind:batch.kind,level:batch.level,materialId:batch.material};m.castShadow=m.receiveShadow=true;parent.add(m);}
  for(const batch of data.batches)mesh(batch,root);
  for(const leaf of data.doorLeaves){const pivot=new T.Group(),{batches,...descriptor}=leaf;pivot.name=leaf.id;pivot.position.fromArray(leaf.pivot);pivot.rotation.y=leaf.yaw;pivot.userData={kind:'door-pivot',...descriptor};for(const batch of batches)mesh(batch,pivot);root.add(pivot);pivots.push(pivot);}
  root.updateMatrixWorld(true);let disposed=false;
  const result={root,building:b,data,materials,pivots,triangles:data.metrics.triangles,bounds:data.bounds,
    setEntryPose({left=0,right=0}={}){if(disposed)throw Error('H-plan model is disposed.');if(![left,right].every(n=>Number.isFinite(n)&&n>=0&&n<=110))throw Error('Paired entry angles must be 0–110 degrees.');for(const p of pivots.filter(p=>p.userData.paired))p.rotation.y=p.userData.yaw+p.userData.swingSign*(p.userData.side==='left'?left:right)*Math.PI/180;root.updateMatrixWorld(true);},
    setView({roof=true,maxLevel=Infinity,cutaway=false}={}){if(disposed)throw Error('H-plan model is disposed.');for(const child of root.children){const{kind,level}=child.userData;child.visible=level<=maxLevel&&(roof||!['roof','parapet','cornice','service'].includes(kind))&&(!cutaway||!['exterior','facade-trim','glazing'].includes(kind));}},
    dispose(){if(disposed)return;disposed=true;for(const geometry of geometries)geometry.dispose();for(const material of materials.values())material.dispose();root.removeFromParent();}};
  return result;
}
