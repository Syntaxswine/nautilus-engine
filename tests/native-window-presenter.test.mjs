import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../packages/windows-core/index.js';
import * as F from '../packages/adapters/farmyard/windows.js';
import * as T from '../packages/render-effects/three.js';
import * as V from '../packages/native-window-presenter/three.js';
import * as Native from '../vendor/farmyard-window-art/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/art/windows/catalog.js';
import {surfacePixels} from '../vendor/farmyard-window-art/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/aft/tactics/hybrid-materials.js';
import * as Source from '../vendor/farmyard-grenades/251bf8094b5f9ebe44208443084c1a6d6658512a/sites/tactical-animal/dist/solo-game.js';
import {paneHarness} from './fixtures/farmyard-window-impacts/harness.mjs';
import {makePool,compileCase,planRuntime,assertViewParity,runParity,actualBounds,closeBounds} from './fixtures/native-window-presenter/proof.mjs';
import {verifySnapshot} from '../tools/snapshot-native-window-presenter.mjs';
const deps={W,F,T,V,Native};
const refused=(fn,code)=>assert.throws(fn,e=>e.code===code,code);
function setup(t,isCurrent=()=>true,three=T){const pool=makePool(T,V),presenter=V.createNativeWindowPresenter({THREE:three,materials:pool.pool,isCurrent});t.after(()=>{presenter.dispose();assert.equal(pool.counters.disposed,0);pool.dispose();});return {pool,presenter};}

test('native 39 x 4 rotations x 4 joins, all 594 masks and tall template preserve actual compiled bounds/IDs',()=>{const r=runParity(deps);assert.equal(r.poses,624);assert.equal(r.masks,594);});
test('fixed native source, skin pixels, finish options and UV density retain their exact source identity',t=>{
  assert.equal(verifySnapshot().files,7);for(const kind of ['brick','concrete','corrugated'])assert.deepEqual(V.nativeWindowSurfacePixels(kind),surfacePixels(kind==='corrugated'?'metal':kind));
  for(const f of Native.WINDOW_FINISHES){assert.equal(V.WINDOW_PAINT_RECIPES.finishes[f.id].frame.color,f.color);assert.equal(V.WINDOW_PAINT_RECIPES.finishes[f.id].edge.color,f.edge);}
  const {presenter,pool}=setup(t),c=compileCase(W,F,{definitionId:'window.waist.grid-3x2.3m',finish:'sage',wall:'corrugated'});presenter.activate(presenter.stage(planRuntime(V,W,F,c)));const v=presenter.inspect().instances.get(c.placement.id),wall=v.solids.get('wall.lower');assert.equal(wall.material,pool.pool.walls.corrugated);assert.equal(v.solids.get('frame.left').material,pool.pool.sage.frame);
  const uv=wall.geometry.attributes.uv;assert.ok(Math.max(...Array.from(uv.array).filter((_,i)=>i%2===0))-Math.min(...Array.from(uv.array).filter((_,i)=>i%2===0))>=3,'Three-metre physical UVs, not stretched one-metre art.');
});
test('actual framed/borderless front and back faces remain visible across all quarter turns',t=>{
  const {presenter}=setup(t);let faces=0;
  for(const definitionId of ['window.full.clear.3m','window.full.borderless.2m'])for(const rotation of [0,90,180,270]){
    const c=compileCase(W,F,{definitionId,rotation});presenter.activate(presenter.stage(planRuntime(V,W,F,c)));const pane=presenter.inspect().instances.get(c.placement.id).panes.get('r0c0'),bounds=c.projection.members.find(m=>m.kind==='glass').bounds,centre=new T.Vector3((bounds.x0+bounds.x1)/2,(bounds.z0+bounds.height)/2,(bounds.y0+bounds.y1)/2),r=rotation*Math.PI/180,normal=new T.Vector3(Math.round(Math.sin(r)),0,Math.round(Math.cos(r)));pane.glass.updateWorldMatrix(true,false);
    for(const side of [-1,1]){const from=centre.clone().addScaledVector(normal,side*2),direction=normal.clone().multiplyScalar(-side),hits=new T.Raycaster(from,direction).intersectObject(pane.glass,false);assert.ok(hits.length>0);assert.ok(Math.abs(hits[0].distance-1.996)<1e-6);faces++;}
  }
  assert.equal(faces,16);
});
test('legacy clipping drives actual opaque view and host query composition while saved underlay stays intact',t=>{
  const {presenter}=setup(t);let cases=0;
  for(const rotation of [0,90,180,270]){
    const c=compileCase(W,F,{definitionId:'window.full.clear.1m',rotation}),horizontal=rotation%180===0,[axis,xs,ys]=c.projection.coveredEdges[0].split(':'),x=Number(xs),y=Number(ys);
    const walls=[-1,0,1].map(offset=>{const edge=horizontal?`s:${x+offset}:${y}`:`e:${x}:${y+offset}`,a=horizontal?x+offset:y+offset,b=horizontal?y:x;return {provider:'farmyard-legacy-wall-v1',edge,floorId:'ground',bounds:horizontal?{x0:a-.56,x1:a+.56,y0:b+.42,y1:b+.58,z0:0,height:2}:{x0:b+.42,x1:b+.58,y0:a-.56,y1:a+.56,z0:0,height:2}};});
    const saved=JSON.stringify(walls),p=planRuntime(V,W,F,c,{legacyWalls:walls});presenter.activate(presenter.stage(p));const view=presenter.inspect(),clipped=view.legacyWalls.map(w=>w.clipped).filter(Boolean);assert.equal(clipped.length,2);assert.equal(view.root.children.filter(m=>m.userData.provider==='farmyard-legacy-wall-v1').length,2);
    for(const record of clipped){const mesh=view.root.children.find(m=>m.userData.edge===record.edge);closeBounds(actualBounds(T,mesh),record.bounds);}
    const lo=horizontal?'x0':'y0',hi=horizontal?'x1':'y1';assert.equal(clipped[0].bounds[hi],(horizontal?x:y)-.5);assert.equal(clipped[1].bounds[lo],(horizontal?x:y)+.5);
    // Host composes its actual clipped opaque AABBs and public window query.
    const centre={x:c.placement.x,y:c.placement.y,h:1},from={...centre,[horizontal?'y':'x']:(horizontal?centre.y:centre.x)+2},to={...centre,[horizontal?'y':'x']:(horizontal?centre.y:centre.x)-2};
    const ray={purpose:'sight',floorId:'ground',from,to},underlayBlocks=record=>{const b=record.bounds;return centre.x>=b.x0&&centre.x<=b.x1&&centre.y>=b.y0&&centre.y<=b.y1;};
    assert.equal(walls.filter(underlayBlocks).length,1);assert.equal(clipped.filter(underlayBlocks).length,0);assert.equal(W.queryWindowSegment(c.geometry,ray).nearest,null);assert.equal(JSON.stringify(walls),saved);cases++;
  }
  assert.equal(cases,4);
});
test('acknowledged retained-host break publishes masks; restore/retry are quiet and preserve complete state',t=>{
  const h=paneHarness({W,F,Source}),{presenter}=setup(t,scope=>scope.geometryDigest===h.store.windowState.geometryDigest&&scope.contentEpoch===h.store.windowState.contentEpoch);t.after(()=>h.binding.dispose());let published=0;
  function accept(publication){const base=W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(base,h.store.windowState),p=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,state,{publication:{receiptId:publication.receiptId,geometry:publication.geometry}});assert.ok(presenter.activate(presenter.stage(p)));published++;}
  h.hooks.publish=(_h,p)=>accept(p);const command=h.packet(),result=h.binding.perform(command);assert.equal(result.committed,true);assert.equal(published,1);assert.equal(presenter.inspect().instances.get('clear-a').panes.get('r0c0').root.visible,false);assert.equal(h.publications.filter(p=>p.name==='present').length,1);
  const saved=h.binding.save(),prior=h.publications.length;h.binding.perform(command);assert.equal(published,1);assert.equal(h.publications.length,prior);assert.equal(h.binding.save(),saved);
  const restoreHost=paneHarness({W,F,Source});t.after(()=>restoreHost.binding.dispose());let restorePublications=0;restoreHost.hooks.publish=()=>restorePublications++;const liveRestore=restoreHost.binding.restore(saved);assert.equal(liveRestore.committed,true);assert.equal(restorePublications,1);assert.deepEqual(restoreHost.publications.map(p=>p.name),['invalidate','publish']);assert.equal(restoreHost.binding.save(),saved);
  // Cold reopen through the public loader: mask rendering does not replay a
  // single receipt/effect, spend anything or modify the saved host journal.
  h.binding.dispose();h.store=F.openFarmyardWindowHostSave(saved,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});const base=W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(base,h.store.windowState);accept({receiptId:'acknowledged-cold-host-load',geometry:W.inspectWindowGeometry(W.windowStateGeometry(state))});assert.equal(h.publications.length,prior);assert.equal(F.serializeFarmyardWindowHostSave(h.store,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),saved);
});
test('staging/abort/stale activation and culling preserve the accepted view and borrowed neighbours',t=>{
  let current;const {presenter}=setup(t,s=>s.geometryDigest===current),a=compileCase(W,F),pa=planRuntime(V,W,F,a);current=pa.geometryDigest;const live=presenter.stage(pa);presenter.activate(live);const first=presenter.inspect().root;
  const candidate=presenter.stage(pa),owned=[];presenter.inspect(candidate).root.traverse(m=>{if(m.geometry&&!owned.includes(m.geometry))owned.push(m.geometry);});const disposals=new Map(owned.map(g=>[g,0]));for(const g of owned)g.addEventListener('dispose',()=>disposals.set(g,disposals.get(g)+1));assert.ok(presenter.abort(candidate));assert.equal(presenter.abort(candidate),false);assert.ok([...disposals.values()].every(n=>n===1));assert.equal(presenter.inspect().root,first);
  const stale=presenter.stage(pa);current='different';assert.equal(presenter.activate(stale),false);assert.equal(presenter.inspect().root,first);refused(()=>presenter.stage(pa),'STALE_VIEW');current=pa.geometryDigest;
  presenter.setResident([]);assert.equal(presenter.inspect().instances.get(a.placement.id).root.visible,false);presenter.setResident([a.placement.id]);assert.equal(presenter.inspect().instances.get(a.placement.id).panes.get('r0c0').root.visible,true);
  let gets=0;const ids=[];Object.defineProperty(ids,'0',{enumerable:true,get(){gets++;return a.placement.id;}});refused(()=>presenter.setResident(ids),'INVALID_DATA');assert.equal(gets,0);assert.equal(presenter.inspect().instances.get(a.placement.id).root.visible,true);
  const h=paneHarness({W,F,Source});t.after(()=>h.binding.dispose());const base=W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(base,h.store.windowState),projection=W.inspectWindowGeometry(W.windowStateGeometry(state));const p=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,state,{publication:{receiptId:'host-load',geometry:projection}});current=p.geometryDigest;presenter.activate(presenter.stage(p));const neighbour=presenter.inspect().instances.get('clear-b'),ng=neighbour.panes.get('r0c0').glass.geometry;let n=0;ng.addEventListener('dispose',()=>n++);assert.ok(presenter.removeInstance('clear-a'));assert.equal(presenter.removeInstance('clear-a'),false);assert.equal(n,0);assert.equal(presenter.inspect().instances.get('clear-b').root,neighbour.root);assert.equal(presenter.inspect().instances.get('clear-b').panes.get('r0c0').root.visible,true);
});
test('descriptor-first options/projections refuse without getters, core calls, current checks or host geometry allocations',t=>{
  const good=compileCase(W,F);let getters=0,calls=0,allocations=0,fences=0;
  const getter=()=>{getters++;throw Error('Accessor executed');},fake={};for(const k of ['inspectWindowGeometry','windowStateGeometry','serializeWindowState','openWindowGeometry','clipWindowLegacyWall'])fake[k]=()=>{calls++;throw Error('Core executed');};
  const bad=[()=>{const o={};Object.defineProperty(o,'publication',{enumerable:true,get:getter});return ()=>V.prepareRuntimeWindowView(fake,F.FARMYARD_WINDOW_DEFINITIONS,{},o);},()=>{const p=structuredClone(good.projection);Object.defineProperty(p,'kind',{enumerable:true,get:getter});return ()=>V.prepareAuthoringWindowView(fake,F.FARMYARD_WINDOW_DEFINITIONS,p);},()=>{const p=structuredClone(good.projection);Object.defineProperty(p.document.placements[0],'finish',{enumerable:true,get:getter});return ()=>V.prepareAuthoringWindowView(fake,F.FARMYARD_WINDOW_DEFINITIONS,p);},()=>{const p=structuredClone(good.publication);Object.defineProperty(p.geometry.document.observedBroken,'constructor',{enumerable:true,get:getter});return ()=>V.prepareRuntimeWindowView(fake,F.FARMYARD_WINDOW_DEFINITIONS,{}, {publication:p});}];
  for(const make of bad)refused(make(),'INVALID_DATA');assert.equal(getters,0);assert.equal(calls,0);
  const three={...T,BoxGeometry:class extends T.BoxGeometry{constructor(...args){allocations++;super(...args);}}},pool=makePool(T,V),presenter=V.createNativeWindowPresenter({THREE:three,materials:pool.pool,isCurrent:()=>{fences++;return false;}});t.after(()=>{presenter.dispose();pool.dispose();});refused(()=>presenter.stage({...planRuntime(V,W,F,good)}),'PREPARATION_REQUIRED');assert.equal(fences,0);refused(()=>presenter.stage(planRuntime(V,W,F,good)),'STALE_VIEW');assert.equal(allocations,0);assert.equal(fences,1);
  refused(()=>V.prepareAuthoringWindowView(fake,F.FARMYARD_WINDOW_DEFINITIONS,{oversized:Array(65537).fill(null)}),'DATA_LIMIT');assert.equal(calls,0);assert.equal(allocations,0);
});
test('own complete IDs, borrowed material/Three interfaces and digest/alias mismatch refusals survive projection copies',t=>{
  const {presenter,pool}=setup(t);let gets=0;Object.defineProperty(pool.pool.glass,'kind',{get(){gets++;throw Error('Borrowed interface recursed');}});
  for(const id of ['constructor','toString','hasOwnProperty','propertyIsEnumerable','native-placement-'+('x'.repeat(77))]){const c=compileCase(W,F,{id}),p=planRuntime(V,W,F,c);presenter.activate(presenter.stage(p));assertViewParity({T},presenter.inspect(),c.projection);assert.equal(presenter.inspect().instances.has(id),true);}assert.equal(gets,0);
  const c=compileCase(W,F);for(const change of [p=>p.content[0].engineInstanceId='alias-replaced',p=>p.content[0].panes[0].visualId='fake',p=>p.geometryDigest='0'.repeat(64),p=>p.members[0].bounds.height+=1]){const p=structuredClone(c.projection);change(p);assert.throws(()=>V.prepareAuthoringWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,p));}
  const stale=structuredClone(c.publication);stale.geometry.queryRevision++;refused(()=>V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,c.state,{publication:stale}),'STALE_PUBLICATION');assert.throws(()=>V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,{...c.state},{publication:c.publication}));
});
test('allocation failure and reentrant retirement release only owned geometry exactly once',t=>{
  let count=0;const geometries=[],three={...T,BoxGeometry:class extends T.BoxGeometry{constructor(...a){if(++count===2)throw Error('Synthetic host allocation failure');super(...a);let n=0;this.addEventListener('dispose',()=>n++);geometries.push(()=>n);}}};
  const {presenter}=setup(t,()=>true,three),h=paneHarness({W,F,Source});t.after(()=>h.binding.dispose());const base=W.openWindowGeometry(h.store.geometry,{definitions:F.FARMYARD_WINDOW_DEFINITIONS}),state=W.openWindowState(base,h.store.windowState),p=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,state,{publication:{receiptId:'host-load',geometry:W.inspectWindowGeometry(W.windowStateGeometry(state))}});assert.throws(()=>presenter.stage(p),/Synthetic/);assert.ok(geometries.every(f=>f()===1));assert.equal(presenter.stats().geometries,0);assert.equal(presenter.stats().stages,0);
});
test('current-fence failure/reentrant disposal and bounded candidate count preserve the last accepted scene',t=>{
  let throwNow=false,retireNow=false,presenter;const pool=makePool(T,V);presenter=V.createNativeWindowPresenter({THREE:T,materials:pool.pool,isCurrent:()=>{if(retireNow){presenter.dispose();return true;}if(throwNow)throw Error('Current host unavailable');return true;}});t.after(()=>{presenter.dispose();assert.equal(pool.counters.disposed,0);pool.dispose();});
  const p=planRuntime(V,W,F,compileCase(W,F)),a=presenter.stage(p);presenter.activate(a);const old=presenter.inspect().root,b=presenter.stage(p),c=presenter.stage(p);refused(()=>presenter.stage(p),'STAGE_LIMIT');presenter.abort(c);throwNow=true;assert.throws(()=>presenter.activate(b),/unavailable/);assert.equal(presenter.inspect().root,old);assert.equal(presenter.stats().stages,1);throwNow=false;const staged=presenter.stage(p);retireNow=true;assert.equal(presenter.activate(staged),false);assert.equal(presenter.stats().geometries,0);presenter.dispose();
});
