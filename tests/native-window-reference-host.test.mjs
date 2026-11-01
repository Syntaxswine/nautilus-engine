import test from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../packages/windows-core/index.js';
import * as F from '../packages/adapters/farmyard/windows.js';
import * as T from '../packages/render-effects/three.js';
import * as V from '../packages/native-window-presenter/three.js';
import {createWindowReviewHost} from '../examples/native-window-host.js';
import {makePool,actualBounds} from './fixtures/native-window-presenter/proof.mjs';

function setup(t,{placements=[{id:'reference-window',definitionId:'window.full.clear.1m',x:14,y:12.5}],legacyWalls=[]}={}){
  const pool=makePool(T,V),publications=[];
  let host;
  const presenter=V.createNativeWindowPresenter({THREE:T,materials:pool.pool,isCurrent:scope=>host.isCurrent(scope)});
  host=createWindowReviewHost(W,F,placements,{
    legacyWalls,
    publish(value){
      const prepared=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,value.state,{publication:value.publication,legacyWalls:value.legacyWalls});
      const scope=V.inspectPreparedWindowView(prepared).scope;
      assert.equal(host.isCurrent(scope),true,'The complete acknowledgement must precede the publisher callback.');
      assert.equal(presenter.activate(presenter.stage(prepared)),true);
      publications.push({...value,prepared,scope});
    }
  });
  t.after(()=>{
    try{host.dispose();}finally{
      try{presenter.dispose();assert.equal(presenter.stats().geometries,0);assert.equal(pool.counters.disposed,0);}
      finally{pool.dispose();}
    }
  });
  return {host,presenter,pool,publications};
}

const stale=fn=>assert.throws(fn,error=>error.code==='STALE_VIEW');

test('reference host refuses an unacknowledged receipt against real current state/geometry and preserves the actual Three view',t=>{
  const {host,presenter,pool,publications}=setup(t);
  host.start();
  const accepted=presenter.inspect(),counts=presenter.stats(),publication=publications.at(-1);
  const forged=V.prepareRuntimeWindowView(W,F.FARMYARD_WINDOW_DEFINITIONS,publication.state,{publication:{...publication.publication,receiptId:'never-acknowledged'}});
  assert.equal(host.isCurrent(V.inspectPreparedWindowView(forged).scope),false);
  stale(()=>presenter.stage(forged));
  assert.equal(presenter.inspect().root,accepted.root);
  assert.deepEqual(presenter.inspect().scope,accepted.scope);
  assert.deepEqual(presenter.stats(),counts);
  assert.equal(pool.counters.disposed,0);
  assert.equal(host.isCurrent(publication.scope),true);
});

test('reference host fences every actual publication scope field and isolates geometry/wall DTOs from complete query and actual Three view',t=>{
  const legacyWalls=[{provider:'farmyard-legacy-wall-v1',edge:'s:14:13',floorId:'ground',bounds:{x0:13.44,x1:14.56,y0:13.42,y1:13.58,z0:0,height:2}}];
  const {host,presenter,publications}=setup(t,{legacyWalls});
  host.start();
  const publication=publications.at(-1),scope=publication.scope;
  const fields=['mode','profileId','sceneId','worldId','stateId','contentEpoch','contentDigest','geometryDigest','geometryRevision','stateRevision','publicationReceiptId'];
  assert.deepEqual(Object.keys(scope).sort(),[...fields].sort());
  for(const field of fields){
    const changed={...scope,[field]:typeof scope[field]==='number'?scope[field]+1:scope[field]+'-forged'};
    assert.equal(host.isCurrent(changed),false,'Changed scope field: '+field);
    const missing={...scope};delete missing[field];
    assert.equal(host.isCurrent(missing),false,'Missing scope field: '+field);
  }
  assert.equal(host.isCurrent({...scope,revision:1}),false,'An extra revision must not be mistaken for the real scope.');
  assert.equal(host.isCurrent(scope),true);
  const before=host.inspect(),ack=host.inspect().acknowledgement;
  const preparedBefore=V.inspectPreparedWindowView(publication.prepared),viewBefore=presenter.inspect();
  const opaqueMesh=viewBefore.root.children.find(mesh=>mesh.userData.provider==='farmyard-legacy-wall-v1');
  assert.ok(opaqueMesh);
  const opaqueBounds=actualBounds(T,opaqueMesh);
  const ray={purpose:'projectile',floorId:'ground',from:{x:14,y:14.5,h:1},to:{x:14,y:10.5,h:1}};
  assert.equal(W.queryWindowSegment(W.windowStateGeometry(publication.state),ray).nearest.placementId,'reference-window');
  assert.equal(host.breakPane(),false,'The complete query must put the opaque wall before that glass hit.');
  legacyWalls[0].bounds.height=.5;
  assert.equal(host.breakPane(),false,'Mutating input wall bounds cannot lower the retained opaque blocker.');
  assert.deepEqual(host.inspect(),before);
  publication.legacyWalls[0].bounds.height=.5;
  assert.equal(host.breakPane(),false,'Mutating the publisher wall loan cannot lower the retained opaque blocker.');
  assert.deepEqual(host.inspect(),before);
  assert.deepEqual(V.inspectPreparedWindowView(publication.prepared),preparedBefore);
  assert.equal(presenter.inspect().root,viewBefore.root);
  assert.deepEqual(presenter.inspect().legacyWalls,viewBefore.legacyWalls);
  assert.deepEqual(actualBounds(T,opaqueMesh),opaqueBounds);
  assert.deepEqual(ack.scope,scope);
  assert.deepEqual(ack.geometry,before.projection);
  const save=F.openFarmyardWindowHostSave(before.saved,{definitions:F.FARMYARD_WINDOW_DEFINITIONS});
  assert.equal(ack.token,F.farmyardWindowHostToken(save));
  ack.scope.publicationReceiptId='external-copy';
  ack.geometry.members[0].bounds.x0+=100;
  publication.publication.receiptId='mutated-publisher-loan';
  publication.publication.geometry.members[0].bounds.x0+=100;
  assert.deepEqual(host.inspect(),before,'Inspect/publisher DTO mutations cannot change the private acknowledgement or retained geometry.');
  assert.equal(host.isCurrent(scope),true);
});

test('reference host acknowledges real pane publication and substantive quiet restore without replaying presentations',t=>{
  const {host,presenter,publications}=setup(t);
  host.start();
  const initial=publications.at(-1),underlay=JSON.parse(host.inspect().saved).source.edges;
  assert.equal(host.breakPane(),true);
  assert.equal(publications.length,2);
  const broken=publications.at(-1),before=host.inspect();
  assert.equal(host.isCurrent(initial.scope),false);
  assert.equal(host.isCurrent(broken.scope),true);
  assert.equal(presenter.inspect().instances.get('reference-window').panes.get('r0c0').root.visible,false);
  assert.equal(before.events.filter(event=>event.type==='present').length,1);
  assert.equal(host.retry(),true);
  assert.deepEqual(host.inspect(),before,'Durable retry must not republish or change complete authority.');
  assert.deepEqual(host.quietRestore(),{committed:true,quiet:true,savePreserved:true});
  assert.equal(publications.length,3);
  const restored=publications.at(-1),after=host.inspect(),acceptedRoot=presenter.inspect().root;
  assert.notEqual(restored.scope.publicationReceiptId,broken.scope.publicationReceiptId);
  assert.equal(host.isCurrent(restored.scope),true);
  assert.equal(host.isCurrent(broken.scope),false,'An old acknowledged receipt cannot cross restoration.');
  stale(()=>presenter.stage(broken.prepared));
  assert.equal(presenter.inspect().root,acceptedRoot);
  assert.equal(presenter.inspect().instances.get('reference-window').panes.get('r0c0').root.visible,false);
  assert.equal(after.saved,before.saved);
  assert.deepEqual(JSON.parse(after.saved).source.edges,underlay);
  assert.equal(after.savedUnderlayIntact,true);
  assert.equal(after.events.filter(event=>event.type==='present').length,1);
  assert.deepEqual(after.events.slice(before.events.length).map(event=>event.type),['invalidate','publish']);
});
