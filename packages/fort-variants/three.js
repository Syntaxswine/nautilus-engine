// Optional adapter; accepts the host Three instance and borrowed textures.
import {buildVariantMesh,VARIANT_MATERIALS} from './mesh.js';
export function createVariantModel(T,input,{atlas=null,eraAtlas=null,lod='game',uvMode='metres',grey=false}={}){
  if(!T?.Group||!T.BufferGeometry||!T.MeshStandardMaterial)throw Error('Supply the host Three.js instance.');
  if([atlas,eraAtlas].some(t=>t!==null&&!t?.isTexture))throw Error('Supply borrowed textures or null.');
  if(!grey&&(atlas||eraAtlas)&&!T.ShaderChunk?.map_fragment?.includes('texture2D( map, vMapUv )'))throw Error('Unsupported host atlas map shader.');
  const data=input?.schema==='nautilus-fort-variant-mesh'?structuredClone(input):buildVariantMesh(input,{lod,uvMode}),b=data.building,
    root=new T.Group(),materials=new Map(),geometries=new Set(),pivots=[];
  root.name=b.id;root.userData={assetId:b.id,collection:b.collection,metresPerUnit:1,consumerIntegrated:false};
  const colors={adobe:[1,1,1],clapboard:[.88,.9,.83],metal:[.92,.96,.92],shingle:[.95,.95,.9],wood:[.74,.70,.6],
    timber:[.69,.73,.69],log:[.88,.89,.83],trim:[.54,.59,.54],plaster:[.94,.92,.82],stone:b.recipe.theme==='cyclone'?[.94,.95,.94]:[.96,.95,.91],brick:[.84,.68,.53],
    door:[.66,.71,.67],iron:[.37,.41,.40],wire:[.48,.56,.53],earth:[.61,.55,.43],glass:[.47,.63,.6]};
  for(const[id,spec]of Object.entries(VARIANT_MATERIALS)){
    const texture=spec.sheet===null?null:spec.sheet==='era'?eraAtlas:atlas,m=new T.MeshStandardMaterial({name:id,color:grey?0xadafa7:new T.Color(...colors[id]),
      roughness:id==='glass'?.3:['iron','wire'].includes(id)?.72:.95,metalness:['iron','wire'].includes(id)?.35:0,map:grey||id==='glass'?null:texture,
      transparent:id==='glass',opacity:id==='glass'?(grey?.12:.28):1,side:T.FrontSide});
    if(!grey&&texture&&uvMode==='metres'&&spec.tile!==null){
      const grid=spec.grid,col=spec.tile%grid,row=grid-1-Math.floor(spec.tile/grid),offset=[(col+.014)/grid,(row+.014)/grid],scale=.972/grid;
      m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace(
        'texture2D( map, vMapUv )',`textureGrad( map, vec2(${offset.join(',')}) + fract(vMapUv) * ${scale}, dFdx(vMapUv) * ${scale}, dFdy(vMapUv) * ${scale} )`));};
      m.customProgramCacheKey=()=>`frontier-atlas-v1:${spec.sheet}:${spec.tile}`;
    }materials.set(id,m);
  }
  function mesh(batch,parent){
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.positions,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(batch.normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uvs,2));
    g.computeBoundingBox();g.computeBoundingSphere();geometries.add(g);const m=new T.Mesh(g,materials.get(batch.material));
    m.name=batch.kind+'-L'+batch.level+'-'+batch.material;m.userData={kind:batch.kind,level:batch.level,materialId:batch.material};m.castShadow=m.receiveShadow=true;parent.add(m);
  }
  for(const batch of data.batches)mesh(batch,root);
  for(const leaf of data.doorLeaves){
    const pivot=new T.Group(),{batches,...descriptor}=leaf;pivot.name=leaf.id;pivot.position.fromArray(leaf.pivot);pivot.rotation.y=leaf.yaw;
    pivot.userData={kind:'door-pivot',...descriptor};for(const batch of batches)mesh(batch,pivot);root.add(pivot);pivots.push(pivot);
  }root.updateMatrixWorld(true);let disposed=false;
  return {root,building:b,data,materials,pivots,bounds:data.bounds,triangles:data.metrics.triangles,
    setDoorPose(id,degrees){if(disposed)throw Error('Model is disposed.');if(!Number.isFinite(degrees)||degrees<0||degrees>90)throw Error('Use a 0–90 degree angle.');
      const p=pivots.find(p=>p.name===id);if(!p)throw Error('Unknown door leaf.');p.rotation.y=p.userData.yaw+p.userData.swingSign*degrees*Math.PI/180;root.updateMatrixWorld(true);},
    setDoorsOpen(open,{gatesOnly=false}={}){if(disposed)throw Error('Model is disposed.');for(const p of pivots)if(!gatesOnly||['gate','sally'].includes(p.userData.style))
      p.rotation.y=p.userData.yaw+(open?p.userData.swingSign*Math.PI/2:0);root.updateMatrixWorld(true);},
    setView({roof=true,maxLevel=Infinity,cutaway=false}={}){if(disposed)throw Error('Model is disposed.');
      for(const child of root.children){const{kind,level=0}=child.userData;child.visible=level<=maxLevel&&(roof||kind==='roof-terrace'&&level===maxLevel||!['roof','roof-trim','roof-parapet','roof-terrace','roof-guards','gable-infill','service'].includes(kind))&&
        (!cutaway||!['exterior','datum-band','facade-trim','glazing','curtain','fence','junction'].includes(kind));}},
    dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();root.removeFromParent();}};
}
