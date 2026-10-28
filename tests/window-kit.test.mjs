import test from 'node:test';
import assert from 'node:assert/strict';
import {WINDOW_KIT,WINDOW_BAYS,compileWindowBay} from '../packages/window-kit/index.js';
import {createWindowBayModel} from '../packages/window-kit/three.js';
import * as T from '../packages/render-effects/three.js';
import {WALL_KIT} from '../packages/map-core/wall-runs.js';
import {roomBoxes} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-geometry.js';
import {surfacePixels} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/hybrid-materials.js';
import {editorAssets,findAssets} from '../apps/editor/asset-catalog.js';
import {assetPreview} from '../apps/editor/asset-preview.js';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const visibleHits=(model,x,y,rotation=0,back=false)=>{
  model.root.rotation.y=rotation;model.root.updateMatrixWorld(true);
  const start=new T.Vector3(x,y,back?-1:1).applyMatrix4(model.root.matrixWorld);
  const end=new T.Vector3(x,y,back?1:-1).applyMatrix4(model.root.matrixWorld);
  const ray=new T.Raycaster(start,end.sub(start).normalize()),meshes=[];
  model.root.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});return ray.intersectObjects(meshes,false);
};

test('two equal native wall panels flank the centered aperture and preserve source dimensions',()=>{
  assert.equal(globalThis.window,undefined);assert.equal(globalThis.document,undefined);
  assert.equal(WINDOW_KIT.wallHeight,WALL_KIT.height);assert.equal(WINDOW_KIT.wallThickness,WALL_KIT.thickness);
  assert.equal(WINDOW_KIT.floorSpacing,WALL_KIT.floorSpacing);
  const original=roomBoxes(),native=compileWindowBay('window-bay-compact');
  close(native.opening.bottom,original.find(b=>b.name==='Window sill').max[1]);
  close(native.opening.top,original.find(b=>b.name==='Window lintel').min[1]);
  for(const {id} of WINDOW_BAYS){
    const s=compileWindowBay(id),[left,right]=s.parts.filter(p=>p.name.endsWith('wall segment'));
    assert.deepEqual(left.size,[1,2,.16]);assert.deepEqual(right.size,left.size);
    close((left.center[0]+right.center[0])/2,s.opening.center[0]);
    close(left.center[0]+left.size[0]/2,-s.opening.width/2);
    close(right.center[0]-right.size[0]/2,s.opening.width/2);
    assert.deepEqual(s.anchors.leftJoin,[-1.5,0,0]);assert.deepEqual(s.anchors.rightJoin,[1.5,0,0]);
    assert.deepEqual(s.traversal,{status:'deferred',consumerIntegrated:false});
    s.parts[0].center[0]=99;assert.equal(compileWindowBay(id).parts[0].center[0],-1);
  }
  assert.throws(()=>compileWindowBay('missing'),/Unknown window/);
});

test('every sculpted solid has native bounds, outward normals and closed bevel seams',()=>{
  for(const {id} of WINDOW_BAYS){
    const model=createWindowBayModel(T,id);
    try{
      assert.deepEqual(model.root.scale.toArray(),[1,1,1]);close(model.bounds.min[0],-1.5);close(model.bounds.max[0],1.5);
      for(const part of model.sculpture.parts){
        const mesh=model.parts.get(part.group+':'+part.name),g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;
        for(let a=0;a<3;a++){close(g.boundingBox.min.getComponent(a),part.center[a]-part.size[a]/2);close(g.boundingBox.max.getComponent(a),part.center[a]+part.size[a]/2);}
        const edges=new Map(),point=i=>new T.Vector3().fromBufferAttribute(p,i),key=v=>v.toArray().map(n=>n.toFixed(6)).join(',');
        for(let i=0;i<p.count;i+=3){
          const a=point(i),b=point(i+1),c=point(i+2),normal=new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a));
          assert.ok(normal.length()>1e-10,part.name+' degenerate triangle');normal.normalize();
          const supplied=new T.Vector3().fromBufferAttribute(n,i);close(supplied.length(),1);assert.ok(normal.dot(supplied)>.9999);
          const center=a.clone().add(b).add(c).multiplyScalar(1/3).sub(new T.Vector3(...part.center));assert.ok(normal.dot(center)>0);
          for(const [from,to]of[[a,b],[b,c],[c,a]]){const ends=[key(from),key(to)].sort(),edge=ends.join('|');edges.set(edge,(edges.get(edge)||0)+1);}
        }
        for(const count of edges.values())assert.equal(count,2,part.name+' open or duplicated seam');
      }
      assert.ok(model.triangles<2200,'Bound the static sculpture cost');
    }finally{model.dispose();}
  }
});

test('removing sashes reveals a real hole from either face and at an angled placement',()=>{
  for(const {id}of WINDOW_BAYS){
    const model=createWindowBayModel(T,id);
    try{
      const pane=model.sculpture.parts.find(p=>p.material==='glass');
      assert.ok(visibleHits(model,pane.center[0],pane.center[1]).some(hit=>hit.object.userData.material==='glass'));
      assert.equal(model.panes.length,id.endsWith('period')?12:4);
      model.setView({sashes:false});
      for(const angle of [0,Math.PI/4,-Math.PI/2])for(const back of [false,true]){
        for(const x of [-.4,0,.4])assert.equal(visibleHits(model,x,model.sculpture.opening.center[1],angle,back).length,0);
        for(const x of [-1,1])assert.ok(visibleHits(model,x,1,angle,back).length>0);
        assert.ok(visibleHits(model,0,model.sculpture.opening.bottom/2,angle,back).length>0);
        assert.ok(visibleHits(model,0,1.85,angle,back).length>0);
      }
      model.setView({sashes:true,glass:false});assert.ok(model.panes.every(p=>!p.visible));
      assert.ok(model.groups.get('lower-sash').visible);assert.ok(model.groups.get('frame').visible);
    }finally{model.dispose();}
  }
});

test('paint uses the existing wall pixels with continuous metre UVs across the bay',()=>{
  for(const wall of ['wood','brick','concrete']){
    const model=createWindowBayModel(T,'window-bay-period',{wall});
    try{
      assert.deepEqual(model.materials.get('wall').map.image.data,surfacePixels(wall).data);
      for(const mesh of model.groups.get('walls').children){
        const {position:p,normal:n,uv}=mesh.geometry.attributes;
        for(let i=0;i<p.count;i++)if(Math.abs(n.getZ(i))>.99){close(uv.getX(i),p.getX(i));close(uv.getY(i),p.getY(i));}
      }
    }finally{model.dispose();}
  }
});

test('model disposal is idempotent and leaves host-owned materials and textures alive',()=>{
  const borrowed=new T.MeshStandardMaterial({map:new T.Texture()}),model=createWindowBayModel(T,'window-bay-period',{materials:{trim:borrowed}});
  const disposed=new Map(),watch=value=>value.addEventListener('dispose',()=>disposed.set(value,(disposed.get(value)||0)+1));
  watch(borrowed);watch(borrowed.map);for(const mesh of model.parts.values())watch(mesh.geometry);
  for(const material of model.materials.values())if(material!==borrowed){watch(material);if(material.map)watch(material.map);}
  model.dispose();model.dispose();assert.equal(disposed.has(borrowed),false);assert.equal(disposed.has(borrowed.map),false);
  assert.equal(disposed.size,model.parts.size+5);for(const count of disposed.values())assert.equal(count,1);
  borrowed.map.dispose();borrowed.dispose();
});

test('window discovery and presentation never substitute a legacy prop or claim placement support',()=>{
  const windows=findAssets(editorAssets(),'centered','Windows');assert.equal(windows.length,2);
  for(const asset of windows){
    assert.ok(asset.disabled.includes('traversal'));assert.deepEqual(asset.bindings,{});
    const preview=assetPreview(asset,{wall:'brick',finish:'clay',sashes:false});
    assert.deepEqual(preview.document,{sculpture:{id:asset.id,wall:'brick',finish:'clay',sashes:false}});
    assert.equal(preview.document.map,undefined);assert.equal(preview.document.units,undefined);
  }
});
