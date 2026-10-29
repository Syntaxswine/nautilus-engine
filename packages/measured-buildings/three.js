// Optional host adapter. No renderer import, resource fetching, DOM or storage.
import {buildMeasuredMesh,MEASURED_MATERIALS} from './mesh.js';
export function createMeasuredModel(T,input,{atlas=null,graniteTexture=null,roofTexture=null,lod='game',uvMode='metres',grey=false}={}) {
  if(!T?.Group||!T.BufferGeometry||!T.MeshStandardMaterial)throw Error('Supply the host Three.js instance.');
  if([atlas,graniteTexture,roofTexture].some(t=>t!==null&&!t?.isTexture))throw Error('Supply borrowed host textures or null.');
  if(!grey&&atlas&&!T.ShaderChunk?.map_fragment?.includes('texture2D( map, vMapUv )'))throw Error('Unsupported host atlas map shader.');
  const data=input?.schema==='nautilus-measured-art-mesh'?structuredClone(input):buildMeasuredMesh(input,{lod,uvMode}),b=data.building,root=new T.Group(),materials=new Map(),geometries=new Set(),pivots=[];
  root.name=b.id;root.userData={assetId:b.id,collection:b.collection,metresPerUnit:1,consumerIntegrated:false};
  for(const [id,spec]of Object.entries(MEASURED_MATERIALS)) {
    const tint=id==='brick'?b.recipe.tint.brick:id==='stone'||id==='granite'?b.recipe.tint.stone:id==='sash'?b.recipe.tint.sash:
      id===b.recipe.roofMaterial?b.recipe.tint.roof:id==='iron'?[.23,.26,.24]:id==='plaster'?[.91,.9,.81]:[1,1,1];
    const m=new T.MeshStandardMaterial({name:id,color:grey?0xadafa7:new T.Color(...tint.map(v=>Math.max(0,Math.min(1,v)))),
      roughness:id==='glass'?.3:.95,metalness:id==='iron'?.12:0,map:grey||id==='glass'?null:id==='granite'?graniteTexture:id==='felt'?roofTexture:atlas,
      transparent:id==='glass',opacity:id==='glass'?(grey?.12:.38):1,side:T.FrontSide});
    if(id==='glass')m.color.set(grey?'#6b7b77':'#799991');
    if(!grey&&atlas&&uvMode==='metres'&&spec.tile!==null) {
      const tile=spec.tile,col=tile%4,row=3-Math.floor(tile/4),offset=[(col+.012)/4,(row+.012)/4],scale=.976/4;
      m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )',
        `textureGrad( map, vec2(${offset.join(',')}) + fract(vMapUv) * ${scale}, dFdx(vMapUv) * ${scale}, dFdy(vMapUv) * ${scale} )`));};
      m.customProgramCacheKey=()=>`measured-building-atlas-v1:${tile}`;
    }
    materials.set(id,m);
  }
  function mesh(batch,parent) {
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.positions,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(batch.normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uvs,2));
    g.computeBoundingBox();g.computeBoundingSphere();geometries.add(g);
    const m=new T.Mesh(g,materials.get(batch.material));m.name=batch.kind+'-L'+batch.level+'-'+batch.material;
    m.userData={kind:batch.kind,level:batch.level,materialId:batch.material};m.castShadow=m.receiveShadow=true;parent.add(m);
  }
  for(const batch of data.batches)mesh(batch,root);
  for(const leaf of data.doorLeaves) {
    const pivot=new T.Group(),{batches,...descriptor}=leaf;pivot.name=leaf.id;pivot.position.fromArray(leaf.pivot);pivot.rotation.y=leaf.yaw;
    pivot.userData={kind:'door-pivot',...descriptor};for(const batch of batches)mesh(batch,pivot);root.add(pivot);pivots.push(pivot);
  }
  root.updateMatrixWorld(true);let disposed=false;
  return {root,building:b,data,materials,pivots,triangles:data.metrics.triangles,bounds:data.bounds,
    setDoorsOpen(open){if(disposed)throw Error('Model is disposed.');for(const p of pivots)p.rotation.y=p.userData.yaw+(open?p.userData.swingSign*Math.PI/2:0);root.updateMatrixWorld(true);},
    setDoorPose(id,degrees){if(disposed)throw Error('Model is disposed.');if(!Number.isFinite(degrees)||degrees<0||degrees>110)throw Error('Use a 0–110 degree door angle.');const p=pivots.find(p=>p.name===id);if(!p)throw Error('Unknown live leaf.');p.rotation.y=p.userData.yaw+p.userData.swingSign*degrees*Math.PI/180;root.updateMatrixWorld(true);},
    setView({roof=true,maxLevel=Infinity,cutaway=false}={}){if(disposed)throw Error('Model is disposed.');for(const child of root.children){const{kind,level=0}=child.userData;child.visible=level<=maxLevel&&(roof||!['roof','roof-trim','service','dome','pediment'].includes(kind))&&(!cutaway||(!['exterior','datum-band','facade-trim','glazing'].includes(kind)&&!child.userData.public));}},
    dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();root.removeFromParent();}};
}
