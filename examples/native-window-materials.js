// Consumer-owned example pool. The presenter never calls dispose on these.
export function createExampleWindowMaterials(T,V){
  const materials=[],textures=[],make=(Class,options)=>{const m=new Class(options);materials.push(m);return m;},r=V.WINDOW_PAINT_RECIPES;
  const pool={glass:make(T.MeshStandardMaterial,r.glass),shine:make(T.LineBasicMaterial,r.shine),walls:{}};
  for(const id of ['steel','sage','ivory'])pool[id]={frame:make(T.MeshStandardMaterial,r.finishes[id].frame),edge:make(T.MeshStandardMaterial,r.finishes[id].edge)};
  for(const kind of ['brick','concrete','corrugated']){const pixels=V.nativeWindowSurfacePixels(kind),map=new T.DataTexture(pixels.data,pixels.width,pixels.height);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.needsUpdate=true;textures.push(map);pool.walls[kind]=make(T.MeshStandardMaterial,{...r.wall,map});}
  pool.legacyWall=pool.walls.concrete;
  return {pool,materials,textures,dispose(){for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
