import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../packages/render-effects/three.js';
import {loadFurnitureAssets} from '@nautilus-engine/map-core/furniture/three';

const keys=['atlas','cargo','bookSkins'],id='furniture:library.bookcase-wide.sage.books';
const texture=()=>new T.Texture({close(){throw Error('Texture image is caller-owned.');}});
const textures=()=>Object.fromEntries(keys.map(key=>[key,texture()]));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const tick=async()=>{for(let index=0;index<5;index++)await Promise.resolve();};

test('separate libraries, instance buffers, shared resources and borrowed texture clones have independent lifetimes',async()=>{
  const borrowed=textures(),sourceState=keys.map(key=>({colorSpace:borrowed[key].colorSpace,anisotropy:borrowed[key].anisotropy,offset:borrowed[key].offset.toArray()}));
  let borrowedDisposals=0;const clones=[],resources=[];
  for(const base of Object.values(borrowed)){base.addEventListener('dispose',()=>borrowedDisposals++);const original=base.clone.bind(base);base.clone=()=>{const copy=original();clones.push(copy);return copy;};}
  const watch=Base=>class extends Base{constructor(...args){super(...args);resources.push(this);}};
  const host={...T,BoxGeometry:watch(T.BoxGeometry),ExtrudeGeometry:watch(T.ExtrudeGeometry),MeshStandardMaterial:watch(T.MeshStandardMaterial)};
  const first=await loadFurnitureAssets(host,{textures:borrowed,loadTexture(){throw Error('Borrowed inputs must not load.');}});
  const a=first.create(id),b=first.create('furniture:library.library-table.walnut.empty');
  const firstResources=[...resources,...clones],counts=new Map(firstResources.map(resource=>[resource,0]));
  for(const resource of firstResources)resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
  const second=await loadFurnitureAssets(T,{textures:borrowed}),other=second.create(id);
  const parent=new T.Group();parent.add(a.root,b.root,other.root);
  const meshes=[...a.root.children,...b.root.children];let meshDisposals=0;for(const mesh of meshes)mesh.addEventListener('dispose',()=>meshDisposals++);
  const copied=a.spec;copied.tiles[0]=99;copied.source.commit='changed';assert.notEqual(a.spec.tiles[0],99);assert.notEqual(a.spec.source.commit,'changed');
  a.dispose();a.dispose();assert.equal(a.disposed,true);assert.equal(first.stats().assets,1);assert.ok([...counts.values()].every(count=>count===0));
  assert.throws(()=>a.solidParts(),/disposed/);assert.throws(()=>a.getBounds(),/disposed/);assert.equal(a.root.parent,null);
  first.dispose();first.dispose();assert.equal(meshDisposals,meshes.length);assert.ok([...counts.values()].every(count=>count===1));assert.equal(b.disposed,true);assert.equal(first.stats().geometries,0);
  assert.throws(()=>first.create(id),/disposed/);assert.throws(()=>b.solidParts(),/disposed/);
  assert.ok(other.solidParts().length>0);assert.equal(other.root.parent,parent);assert.equal(borrowedDisposals,0);
  assert.deepEqual(keys.map(key=>({colorSpace:borrowed[key].colorSpace,anisotropy:borrowed[key].anisotropy,offset:borrowed[key].offset.toArray()})),sourceState);
  for(const map of clones){assert.equal(map.colorSpace,T.SRGBColorSpace);assert.equal(map.anisotropy,4);assert.ok(Object.values(borrowed).some(base=>base.source===map.source));}
  second.dispose();assert.equal(borrowedDisposals,0);for(const base of Object.values(borrowed))base.dispose();
});

test('successful injected loads transfer ownership once and mixed borrowed inputs remain caller-owned',async()=>{
  const borrowed=texture(),loaded=texture();let borrowedDisposals=0,loadedDisposals=0;borrowed.addEventListener('dispose',()=>borrowedDisposals++);loaded.addEventListener('dispose',()=>loadedDisposals++);
  const calls=[];const library=await loadFurnitureAssets(T,{textures:{atlas:borrowed},loadTexture(url,{kind}){calls.push({url,kind});return loaded;}});
  assert.deepEqual(calls.map(call=>call.kind),['cargo','bookSkins']);assert.ok(calls.every(call=>call.url.startsWith('file:')));
  library.create(id);library.dispose();library.dispose();assert.equal(loadedDisposals,1);assert.equal(borrowedDisposals,0);borrowed.dispose();
});

test('a failed load rejects promptly, releases completed inputs and later completions exactly once',async()=>{
  const pending=deferred(),atlas=texture(),late=texture();let atlasDisposals=0,lateDisposals=0;
  atlas.addEventListener('dispose',()=>atlasDisposals++);late.addEventListener('dispose',()=>lateDisposals++);
  const result=loadFurnitureAssets(T,{loadTexture(url,{kind}){if(kind==='atlas')return atlas;if(kind==='cargo')throw Error('cargo load failed');return pending.promise;}});
  await assert.rejects(result,/cargo load failed/);assert.equal(atlasDisposals,1);assert.equal(lateDisposals,0);
  pending.resolve(late);await tick();assert.equal(lateDisposals,1);
});

test('aborted loads release late duplicate textures without closing images or changing borrowed maps',async()=>{
  const controller=new AbortController(),requests=Object.fromEntries(keys.map(key=>[key,deferred()]));let calls=0;
  const shared=texture();let releases=0;shared.addEventListener('dispose',()=>releases++);
  const result=loadFurnitureAssets(T,{signal:controller.signal,loadTexture(url,{kind,signal}){calls++;assert.equal(signal,controller.signal);return requests[kind].promise;}});
  await tick();assert.equal(calls,3);requests.atlas.resolve(shared);await tick();controller.abort();await assert.rejects(result,{name:'AbortError'});assert.equal(releases,1);
  requests.cargo.resolve(shared);requests.bookSkins.resolve(shared);await tick();assert.equal(releases,1);
  await assert.rejects(loadFurnitureAssets(T,{signal:controller.signal,loadTexture(){calls++;}}),{name:'AbortError'});assert.equal(calls,3);
});

test('invalid renderer inputs and asset requests fail before allocation or borrowed-resource mutation',async()=>{
  const borrowed=textures();let calls=0;
  await assert.rejects(loadFurnitureAssets({},{}),/host Three/);
  for(const settings of [null,[],{future:true},{textures:{unknown:borrowed.atlas}},{textures:{atlas:null}},{signal:{}},{loadTexture:42}])await assert.rejects(loadFurnitureAssets(T,settings),/options|textures|AbortSignal|loadTexture/);
  await assert.rejects(loadFurnitureAssets(T,{loadTexture(){calls++;return {};}}),/Three texture/);assert.equal(calls,3);
  const library=await loadFurnitureAssets(T,{textures:borrowed}),before=library.stats();
  assert.throws(()=>library.create('library.bookcase-wide.sage.books'),/ID/);assert.throws(()=>library.create(id,{rotation:1}),/rotation/);assert.deepEqual(library.stats(),before);
  library.dispose();for(const base of Object.values(borrowed))base.dispose();
});
