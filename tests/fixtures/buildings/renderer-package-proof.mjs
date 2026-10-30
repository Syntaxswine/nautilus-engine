import assert from 'node:assert/strict';
import * as T from '@nautilus-engine/renderer/render-effects/three';
import {loadBuildingAssets} from '@nautilus-engine/renderer';
// The renderer root is the public building facade. Shared copies draw from display
// batches, so this runs that module graph from the installed tarball, not the source tree.
const atlas=new T.Texture(),meshes=root=>{const out=[];root.traverse(node=>{if(node.isMesh)out.push(node);});return out;};
const shared=await loadBuildingAssets(T,{providers:['original'],loadTexture:async()=>atlas,shared:true});
const independent=await loadBuildingAssets(T,{providers:['original'],loadTexture:async()=>atlas});
try{
  const a=shared.create('building:dockside-warehouse'),b=shared.create('dockside-warehouse'),drawn=meshes(a.root);
  assert.ok(drawn.length&&drawn.every((mesh,i)=>mesh.geometry===meshes(b.root)[i].geometry),'copies share one design');
  assert.ok(drawn.length*2<meshes(independent.create('dockside-warehouse').root).length,'shared copies draw from display batches');
  b.setView({view:'cutaway',level:0});a.dispose();b.dispose();
}finally{shared.dispose();independent.dispose();}
console.log('Installed renderer building facade: shared copies draw one design from display batches.');
