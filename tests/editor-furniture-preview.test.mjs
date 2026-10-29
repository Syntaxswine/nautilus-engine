import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../packages/render-effects/three.js';
import {FurniturePreviewScene} from '../apps/editor/furniture-preview.js';
import {listFurnitureAssets} from '../packages/furniture-core/index.js';
import {loadFurnitureAssets} from '../packages/furniture-core/three.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const document=(id,extra={})=>({furniture:{id,rotation:0,mode:'painted',...extra}});
function library() {
  const paint=new T.MeshStandardMaterial(),instances=[];let disposed=0,paintDisposed=0;
  paint.addEventListener('dispose',()=>paintDisposed++);
  return {instances,paint,get disposed(){return disposed;},get paintDisposed(){return paintDisposed;},
    create(id,{rotation}) {
      const root=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(2,1,.5),paint);mesh.position.y=.5;root.add(mesh);root.position.set(.5,0,1.5);root.rotation.y=-rotation*Math.PI/180;
      const instance={root,spec:{id,rotation},disposed:0,dispose(){assert.equal(mesh.material,paint,'Restore borrowed paint before releasing the instance');this.disposed++;mesh.geometry.dispose();}};
      instances.push(instance);return instance;
    },dispose(){disposed++;paint.dispose();}
  };
}
function fixture(loadLibrary) {
  let changed=0,rendered=0,rendererDisposed=0,contextReleased=0,lightsDisposed=0;
  const renderer={setPixelRatio(){},setSize(){},render(){rendered++;},dispose(){rendererDisposed++;},forceContextLoss(){contextReleased++;}};
  const preview=new FurniturePreviewScene(T,{},()=>changed++,{loadLibrary,createRenderer:()=>renderer,createDaylight:()=>({update(){},dispose(){lightsDisposed++;}})});
  return {preview,get counts(){return {changed,rendered,rendererDisposed,contextReleased,lightsDisposed};}};
}

test('furniture framing fits actual offset and rotated bounds without resizing or changing borrowed paint',async()=>{
  const pack=library(),{preview}=fixture(async()=>pack);let clayDisposed=0;preview.clay.addEventListener('dispose',()=>clayDisposed++);
  try {
    for(const rotation of [0,90,180,270]) {
      await preview.open(document('fixture',{rotation,mode:'clay'}));const model=preview.model;
      assert.deepEqual(model.root.scale.toArray(),[1,1,1]);assert.deepEqual(model.root.position.toArray(),[.5,0,1.5]);
      const size=preview.bounds.getSize(new T.Vector3());assert.ok(Math.abs(size.x-(rotation%180?.5:2))<1e-6);
      assert.equal(model.root.children[0].material,preview.clay);assert.equal(pack.paintDisposed,0);
      for(const lowAngle of [false,true])for(const preset of ['0','1','2','3'])for(const width of [110,420]) {
        preview.setPresentation({mode:'painted',lowAngle});preview.draw({preset},width,220);
        assert.equal(model.root.children[0].material,pack.paint);
        for(const x of [preview.bounds.min.x,preview.bounds.max.x])for(const y of [preview.bounds.min.y,preview.bounds.max.y])for(const z of [preview.bounds.min.z,preview.bounds.max.z]) {
          const p=new T.Vector3(x,y,z).project(preview.camera);assert.ok(Math.abs(p.x)<.834&&Math.abs(p.y)<.834,'Every model corner fits inside the camera margin');
        }
      }
    }
  }finally{preview.dispose();preview.dispose();}
  assert.equal(pack.disposed,1);assert.equal(pack.paintDisposed,1);assert.equal(clayDisposed,1);
  assert.deepEqual(pack.instances.map(instance=>instance.disposed),[1,1,1,1]);
});

test('a newer furniture selection owns the only instance after a delayed library load',async()=>{
  const gate=deferred(),pack=library();let loads=0;
  const {preview}=fixture(()=>{loads++;return gate.promise;});
  try {
    const first=preview.open(document('first')),second=preview.open(document('second',{rotation:90}));
    gate.resolve(pack);await Promise.all([first,second]);
    assert.equal(loads,1);assert.deepEqual(pack.instances.map(model=>model.spec),[{id:'second',rotation:90}]);
    assert.equal(preview.scene.children.length,1);assert.equal(preview.document.furniture.id,'second');
  }finally{preview.dispose();}
  assert.equal(pack.disposed,1);assert.equal(pack.instances[0].disposed,1);
});

test('disposing a loading furniture scene retires its late library without creating an instance',async()=>{
  const gate=deferred(),pack=library();let signal;const state=fixture(value=>{signal=value;return gate.promise;}),{preview}=state;
  const opening=preview.open(document('late'));await Promise.resolve();preview.dispose();preview.dispose();gate.resolve(pack);await opening;
  assert.equal(signal.aborted,true);
  assert.equal(pack.disposed,1);assert.equal(pack.instances.length,0);assert.equal(preview.scene.children.length,0);
  assert.deepEqual(state.counts,{changed:0,rendered:0,rendererDisposed:1,contextReleased:1,lightsDisposed:1});
});

test('a furniture selection closed before loading starts does not import its optional factory',async()=>{
  let loads=0;const {preview}=fixture(()=>{loads++;throw Error('Must not load after close');});
  const opening=preview.open(document('cancelled'));preview.dispose();await opening;assert.equal(loads,0);
});

test('a failed furniture library can retry and retains a successful load across new instances',async()=>{
  const pack=library();let loads=0;const {preview}=fixture(async()=>{if(++loads===1)throw Error('atlas offline');return pack;});
  try {
    await assert.rejects(preview.open(document('failed')),/atlas offline/);
    await preview.open(document('recovered'));await preview.open(document('next'));
    assert.equal(loads,2);assert.deepEqual(pack.instances.map(model=>model.spec.id),['recovered','next']);
    assert.equal(pack.instances[0].disposed,1);assert.equal(pack.instances[1].disposed,0);
  }finally{preview.dispose();}
  assert.equal(pack.disposed,1);assert.equal(pack.instances[1].disposed,1);
});

test('real furniture previews retain all source offsets and fit the current visual bounds for every form and turn',async()=>{
  const textures=Object.fromEntries(['atlas','cargo','bookSkins'].map(key=>[key,new T.Texture({width:1024,height:768})]));
  const pack=await loadFurnitureAssets(T,{textures}),{preview}=fixture(async()=>pack);
  try {
    for(const spec of listFurnitureAssets({finish:'oak'}))for(const rotation of [0,90,180,270]) {
      await preview.open(document(spec.id,{rotation}));const model=preview.model,current=model.spec;
      assert.deepEqual(model.root.position.toArray(),[current.placementOffset[0],0,current.placementOffset[1]]);
      assert.deepEqual(model.root.scale.toArray(),[1,1,1]);assert.ok(preview.bounds.equals(model.getBounds()));
      assert.ok(preview.bounds.min.x>=-.50001&&preview.bounds.min.z>=-.50001);
      assert.ok(preview.bounds.max.x<=current.tiles[0]-.49999&&preview.bounds.max.z<=current.tiles[1]-.49999);
    }
  }finally{preview.dispose();for(const texture of Object.values(textures))texture.dispose();}
  assert.equal(pack.disposed,true);
});
