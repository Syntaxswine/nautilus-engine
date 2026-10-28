import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../packages/render-effects/three.js';
import {SearchHalo} from '../packages/render-effects/index.js';
import {wallRunsIntersect} from '../packages/map-core/wall-runs.js';
import {createDiagonalOccluder,reviewWallMap,wallVisibility,REVIEW_CAMERA} from '../examples/halo-wall-fixture.js';

test('diagonal panel triangles agree with the oriented visibility helper below and above the wall',()=>{
  const fixture=createDiagonalOccluder(), camera=new T.Vector3(...REVIEW_CAMERA), before=JSON.stringify(fixture.map);
  fixture.group.updateMatrixWorld(true);
  for(const [point,blocked]of [[new T.Vector3(8,1.25,20),true],[new T.Vector3(8,2.35,20),false],[new T.Vector3(11.8,1.5,20),false]]) {
    const delta=point.clone().sub(camera), ray=new T.Raycaster(camera,delta.clone().normalize(),0,delta.length());
    const triangles=ray.intersectObject(fixture.group,true).length>0;
    const slabs=wallRunsIntersect(fixture.map,{x:camera.x,y:camera.z,h:camera.y},{x:point.x,y:point.z,h:point.y});
    assert.equal(triangles,blocked);assert.equal(slabs,triangles);
  }
  assert.equal(JSON.stringify(fixture.map),before);fixture.dispose();fixture.dispose();
});

test('the partial-visibility adapter selects the prop while the instanced wall remains solely an occluder',()=>{
  const fixture=createDiagonalOccluder(), halo=new SearchHalo(), prop=new T.Sprite(new T.SpriteMaterial()), camera=new T.Vector3(...REVIEW_CAMERA);
  prop.position.set(8,1.25,20);prop.updateMatrixWorld(true);
  const visibility=wallVisibility(fixture.map,camera,prop.position);
  assert.deepEqual(visibility,{centerBlocked:true,upperBlocked:false,eligible:true});
  halo.sync(visibility.eligible?[{root:prop}]:[]);assert.equal(halo.proxies.size,1);assert.equal(halo.proxies.has(prop),true);
  assert.ok(fixture.group.children.every(mesh=>mesh.isInstancedMesh));assert.ok([...halo.proxies.keys()].every(source=>!source.isInstancedMesh));
  const taller=reviewWallMap();taller.wallRuns.segments[0].stories=3;
  assert.deepEqual(wallVisibility(taller,camera,prop.position),{centerBlocked:true,upperBlocked:true,eligible:false});
  halo.sync([]);assert.equal(halo.proxies.size,0);halo.dispose();prop.material.dispose();fixture.dispose();
});
