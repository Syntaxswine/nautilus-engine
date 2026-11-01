import assert from 'node:assert/strict';
export function makePool(T,V){
  const resources=[],textures=[],counters={disposed:0};
  const material=(Class,options)=>{const m=new Class(options);m.addEventListener('dispose',()=>counters.disposed++);resources.push(m);return m;},recipes=V.WINDOW_PAINT_RECIPES;
  const pool={glass:material(T.MeshStandardMaterial,recipes.glass),shine:material(T.LineBasicMaterial,recipes.shine)};
  for(const name of ['steel','sage','ivory'])pool[name]={frame:material(T.MeshStandardMaterial,recipes.finishes[name].frame),edge:material(T.MeshStandardMaterial,recipes.finishes[name].edge)};
  pool.walls={};for(const kind of ['brick','concrete','corrugated']){const p=V.nativeWindowSurfacePixels(kind),map=new T.DataTexture(p.data,p.width,p.height);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.needsUpdate=true;map.addEventListener('dispose',()=>counters.disposed++);textures.push(map);pool.walls[kind]=material(T.MeshStandardMaterial,{...recipes.wall,map});}
  pool.legacyWall=material(T.MeshStandardMaterial,{color:0x777b66,roughness:.94});
  return {pool,resources,textures,counters,dispose(){for(const m of resources)m.dispose();for(const t of textures)t.dispose();}};
}
export function compileCase(W,F,{definitionId='window.full.grid-3x2.3m',rotation=0,joins={left:false,right:false},id='native-window-placement-with-its-complete-original-source-identity',dimensions,broken=[],queryRevision=0,finish='steel',wall='brick'}={}){
  const spec=F.farmyardWindowDefinition({id:definitionId,joins,...(dimensions?{dimensions}:{})}),along=spec.width%2===0?14.5:14;
  const placement={id,definitionId,x:rotation%180===0?along:12.5,y:rotation%180===0?12.5:along,rotation,joins,finish,wall,...(dimensions?{dimensions}:{})};
  const edges=Array.from({length:spec.width},(_,i)=>rotation%180===0?`s:${along-(spec.width-1)/2+i}:12`:`e:12:${along-(spec.width-1)/2+i}`);
  const observedBroken=broken.length?Object.fromEntries([[id,broken]]):{};
  const document={kind:'nautilus-window-placement-document',version:1,id:'native-window-yard',profileId:W.WINDOW_GEOMETRY_CONTRACT.profileId,queryRevision,placements:[placement],bindings:[{placementId:id,engineInstanceId:'native-view'}],observedBroken};
  const edgeFacts=edges.map(edge=>({edge,semantic:'wall',locked:false,sourceKind:'wall-brick',underlay:{semantic:'wall',locked:false,sourceKind:'wall-brick'}}));
  const geometry=W.compileWindowPlacements(document,{definitions:F.FARMYARD_WINDOW_DEFINITIONS,world:{id:'native-world',floorId:'ground',grid:{width:64,height:64}},edgeFacts});
  const state=W.createWindowState(geometry,{id:'native-state',contentEpoch:'native-epoch',broken:observedBroken});
  return {spec,placement,geometry,state,projection:W.inspectWindowGeometry(geometry),publication:{receiptId:'host-accepted-current',geometry:W.inspectWindowGeometry(geometry)}};
}
export const planRuntime=(V,W,F,c,options={})=>V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,c.state,{publication:c.publication,...options});
export function actualBounds(T,mesh){mesh.updateWorldMatrix(true,false);const b=new T.Box3().setFromObject(mesh);return {x0:b.min.x,x1:b.max.x,y0:b.min.z,y1:b.max.z,z0:b.min.y,height:b.max.y};}
export function closeBounds(actual,expected,eps=2e-6){let error=0;for(const k of Object.keys(expected)){error=Math.max(error,Math.abs(actual[k]-expected[k]));assert.ok(Math.abs(actual[k]-expected[k])<=eps,`${k}: ${actual[k]} != ${expected[k]}`);}return error;}
export function assertViewParity({T},view,projection){
  let maximumMeshBoundErrorMetres=0,meshBoundComparisons=0;
  const compare=(a,b)=>{maximumMeshBoundErrorMetres=Math.max(maximumMeshBoundErrorMetres,closeBounds(a,b));meshBoundComparisons++;};
  for(const content of projection.content){
    const instance=view.instances.get(content.placementId);assert.ok(instance);assert.deepEqual(instance.root.scale.toArray(),[1,1,1]);assert.equal(instance.root.userData.engineInstanceId,content.engineInstanceId);assert.equal(instance.root.userData.definitionDigest,content.definitionDigest);
    const broken=Object.hasOwn(projection.document.observedBroken,content.placementId)?projection.document.observedBroken[content.placementId]:[];
    for(const pane of content.panes){const asset=instance.panes.get(pane.paneId),visible=!broken.includes(pane.paneId);assert.equal(asset.root.visible,visible);assert.equal(asset.root.userData.visualId,pane.visualId);assert.equal(asset.glass.userData.memberId,JSON.stringify(['window-member-v1',projection.sceneId,content.placementId,pane.paneId]));assert.equal(asset.glass.userData.role,null);assert.equal(asset.glass.userData.paneId,pane.paneId);if(visible)compare(actualBounds(T,asset.glass),projection.members.find(m=>m.placementId===content.placementId&&m.paneId===pane.paneId).bounds);if(asset.shine){assert.equal(asset.shine.parent,asset.root);assert.equal(asset.shine.geometry.attributes.position.count,8);}else assert.equal(asset.glass.geometry.index.count,12);}
    for(const part of content.solids){const mesh=instance.solids.get(part.partId),member=projection.members.find(m=>m.placementId===content.placementId&&m.partId===part.partId);assert.equal(mesh.userData.memberId,member.id);assert.equal(mesh.userData.role,member.role);compare(actualBounds(T,mesh),member.bounds);}
  }
  return {meshBoundComparisons,maximumMeshBoundErrorMetres};
}
export function runParity({W,F,T,V,Native}){
  const pool=makePool(T,V),presenter=V.createNativeWindowPresenter({THREE:T,materials:pool.pool,isCurrent:()=>true});let poses=0,masks=0,parts=0,meshBoundComparisons=0,maximumMeshBoundErrorMetres=0;
  try{
    for(const preset of F.FARMYARD_WINDOW_CATALOGUE.presets)for(const rotation of [0,90,180,270])for(const left of [false,true])for(const right of [false,true]){
      const c=compileCase(W,F,{definitionId:preset.id,rotation,joins:{left,right},finish:['steel','sage','ivory'][poses%3],wall:['brick','concrete','corrugated'][poses%3]}),p=planRuntime(V,W,F,c),stage=presenter.stage(p);assert.ok(presenter.activate(stage));const view=presenter.inspect(),bounds=assertViewParity({T},view,c.projection);meshBoundComparisons+=bounds.meshBoundComparisons;maximumMeshBoundErrorMetres=Math.max(maximumMeshBoundErrorMetres,bounds.maximumMeshBoundErrorMetres);parts+=c.projection.members.length;poses++;
      if(Native){const native=Native.describeWindow(preset.id,{left,right});assert.equal(native.height,c.spec.height);assert.equal(native.span,c.spec.width);assert.deepEqual(native.panes.map(p=>p.id),c.spec.panes.map(p=>p.id));for(const [a,b]of [[native.panes,c.spec.panes],[native.solids,c.spec.solids]])a.forEach((p,i)=>{assert.deepEqual(p.bounds.min,b[i].min);assert.deepEqual(p.bounds.max,b[i].max);});}
    }
    // Every valid mask for every preset (maximum six panes). Pose/joins are
    // exhaustively independent above; here masks exercise actual compiled state.
    for(const preset of F.FARMYARD_WINDOW_CATALOGUE.presets){const def=F.farmyardWindowDefinition({id:preset.id});for(let mask=0;mask<2**def.panes.length;mask++){
      const broken=def.panes.filter((p,i)=>mask&(1<<i)).map(p=>p.id),c=compileCase(W,F,{definitionId:preset.id,broken}),stage=presenter.stage(planRuntime(V,W,F,c));assert.ok(presenter.activate(stage));assertViewParity({T},presenter.inspect(),c.projection);masks++;
    }}
    const tall=compileCase(W,F,{definitionId:'window.full.borderless',dimensions:{width:20,height:F.farmyardStoreysToMetres(5)},rotation:270});const stage=presenter.stage(planRuntime(V,W,F,tall));presenter.activate(stage);assertViewParity({T},presenter.inspect(),tall.projection);const pane=presenter.inspect().instances.get(tall.placement.id).panes.get('r0c0');assert.equal(pane.glass.geometry.index.count/3,4);assert.equal(tall.spec.height,10.6);assert.equal(pane.shine,null);
    presenter.dispose();presenter.dispose();assert.equal(pool.counters.disposed,0);assert.equal(presenter.stats().geometries,0);
    return {poses,masks,compiledMembers:parts,meshBoundComparisons,maximumMeshBoundErrorMetres,tall:{width:20,height:10.6,panes:1,triangles:4},borrowedResourcesSurvived:true};
  }finally{presenter.dispose();pool.dispose();}
}
