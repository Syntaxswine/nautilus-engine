import test from 'node:test';
import assert from 'node:assert/strict';
import {InspectionScene,RoofLayer} from '../apps/editor/roof-scene.js';
import {InspectionScene as LegacyScene} from '../apps/editor/prefab-scene.js';
import * as T from '../packages/render-effects/three.js';

class ControlledTextureLoader {
  attempts=[];
  load(url,onLoad,onProgress,onError) {
    const texture=new T.Texture(),attempt={url,texture,onLoad,onError,disposed:0};
    texture.addEventListener('dispose',()=>attempt.disposed++);this.attempts.push(attempt);
    this.duringLoad?.(attempt);return texture;
  }
}

function fixture(t) {
  const scene=Object.create(InspectionScene.prototype),world=new T.Scene(),loader=new ControlledTextureLoader();let changes=0;
  const legacyDispose=t.mock.method(LegacyScene.prototype,'dispose',()=>{});
  Object.assign(scene,{scene:world,roofLoader:loader,diagnostics:[],changed(){changes++;},
    renderer:{capabilities:{getMaxAnisotropy:()=>16}},slopedRoofs:new RoofLayer(world),roofPreview:new RoofLayer(world,{preview:true})});
  const document={map:{slopedRoofs:{version:1,roofs:[{id:'paint-test',x:4,y:5,width:8,depth:6,z:1,style:'gable',axis:'x',direction:1,pitch:30,overhang:.25,material:'slate',seed:27}]}}};
  scene.slopedRoofs.update(document);scene.roofPreview.update(document);
  t.after(()=>scene.dispose());return {scene,loader,document,legacyDispose,get changes(){return changes;}};
}

test('a failed roof atlas load retires its texture and retries into both roof layers',async t=>{
  const {scene,loader,legacyDispose}=fixture(t),unrelated=['Building prefabs: another failure','Sloped roofs: an unrelated diagnostic'];
  scene.diagnostics.push(...unrelated);
  const observed=scene.loadRoofPaint(),firstReady=scene.prepareRoofs();
  assert.equal(loader.attempts.length,1);assert.equal(scene.prepareRoofs(),firstReady);
  const first=loader.attempts[0],rejection=assert.rejects(firstReady,/shared painted roof atlas could not load/);
  first.onError(Error('offline'));await rejection;await observed;
  assert.equal(first.disposed,1);assert.equal(scene.roofTexture,null);assert.equal(scene.roofPaintReady,null);
  assert.deepEqual(scene.diagnostics,[...unrelated,'Sloped roofs: The shared painted roof atlas could not load.']);

  const recovered=scene.prepareRoofs(),second=loader.attempts[1];
  assert.equal(loader.attempts.length,2);assert.notEqual(recovered,firstReady);assert.equal(scene.prepareRoofs(),recovered);
  // Obsolete callbacks must neither clear the new promise nor bind retired paint.
  first.onError(Error('obsolete'));first.onLoad(first.texture);
  assert.equal(scene.prepareRoofs(),recovered);assert.equal(first.disposed,1);
  assert.equal(scene.slopedRoofs.atlas,null);assert.equal(scene.roofPreview.atlas,null);
  second.onLoad(second.texture);await recovered;
  assert.equal(second.texture.colorSpace,T.SRGBColorSpace);assert.equal(second.texture.anisotropy,8);
  for(const layer of [scene.slopedRoofs,scene.roofPreview]) {
    assert.equal(layer.atlas,second.texture);assert.equal(layer.models.size,1);
    layer.models.get('paint-test').root.traverse(node=>{if(node.isMesh)for(const material of node.material)assert.equal(material.map,second.texture);});
  }
  assert.deepEqual(scene.diagnostics,unrelated);assert.equal(scene.roofPaintError,null);
  assert.equal(scene.prepareRoofs(),recovered);assert.equal(loader.attempts.length,2);assert.equal(second.disposed,0);
  scene.dispose();scene.dispose();first.onLoad(first.texture);second.onLoad(second.texture);
  assert.equal(first.disposed,1);assert.equal(second.disposed,1);assert.equal(legacyDispose.mock.callCount(),1);
});

for(const completion of ['success','failure'])test(`disposing during a pending roof load ignores late ${completion}`,async t=>{
  const state=fixture(t),{scene,loader}=state;scene.diagnostics.push('Keep this diagnostic');
  const ready=scene.prepareRoofs(),attempt=loader.attempts[0];
  scene.dispose();assert.equal(attempt.disposed,1);
  if(completion==='success')attempt.onLoad(attempt.texture);else attempt.onError(Error('late failure'));
  await ready;await scene.prepareRoofs();
  assert.equal(loader.attempts.length,1);assert.equal(attempt.disposed,1);assert.equal(state.changes,0);
  assert.equal(scene.slopedRoofs.atlas,null);assert.equal(scene.roofPreview.atlas,null);
  assert.deepEqual(scene.diagnostics,['Keep this diagnostic']);assert.equal(scene.scene.children.length,0);
});

test('synchronous loader failure also releases the returned texture and allows a cached success',async t=>{
  const {scene,loader}=fixture(t);loader.duringLoad=attempt=>attempt.onError(Error('immediate failure'));
  await assert.rejects(scene.prepareRoofs(),/shared painted roof atlas could not load/);
  assert.equal(loader.attempts[0].disposed,1);
  loader.duringLoad=attempt=>attempt.onLoad(attempt.texture);
  const ready=scene.prepareRoofs();await ready;
  assert.equal(loader.attempts.length,2);assert.equal(scene.prepareRoofs(),ready);
  assert.equal(scene.slopedRoofs.atlas,loader.attempts[1].texture);assert.deepEqual(scene.diagnostics,[]);
  scene.dispose();assert.deepEqual(loader.attempts.map(attempt=>attempt.disposed),[1,1]);
});

for(const method of ['open','update'])test(`pending scene ${method} cannot resume after roof disposal`,async t=>{
  const {scene,loader,document}=fixture(t),parent=t.mock.method(LegacyScene.prototype,method,async()=>{});
  const operation=scene[method](document);assert.equal(loader.attempts.length,1);
  scene.dispose();await operation;assert.equal(parent.mock.callCount(),0);
  await scene[method](document);assert.equal(parent.mock.callCount(),0);
  loader.attempts[0].onLoad(loader.attempts[0].texture);
  assert.equal(loader.attempts[0].disposed,1);assert.equal(scene.scene.children.length,0);
});
