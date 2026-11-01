import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {setup,refresh,request,finish,clone,oracleCases} from './fixtures/procedural-tiles/c2a.mjs';
import {join} from './fixtures/procedural-tiles/catalogue.mjs';
const spec=process.env.NAUTILUS_TILE_V2_PACKAGE?process.env.NAUTILUS_TILE_V2_PACKAGE+'/tiles':new URL('../packages/tiles-core/candidate-v2.js',import.meta.url).href,T=await import(spec),context={contextToken:'a'.repeat(64)};
const resolve=b=>T.openTileBundle(b,{requireResolved:true}).compiled;
const prepare=(b,r)=>T.prepareTileRepair(b,r,context),advance=b=>{const n=clone(b);n.layout.revision++;return n;};
const failure=(b,r,pattern)=>{const saved=JSON.stringify([b,r]),result=prepare(b,r);assert.equal(result.ok,false);assert.equal(result.next,null);assert.equal(result.changes,null);assert.match(JSON.stringify(result.diagnostics),pattern);assert.equal(JSON.stringify([b,r]),saved);return result;};
test('C2a exact owner matrix resolves complete source with explicit unbound physical/presentation states',()=>{
  for(const c of oracleCases(T)){const r=resolve(c.bundle);assert.equal(r.mode,'rectangle-composition',c.name);assert.equal(r.statuses.presentation,'unbound');assert.equal(r.statuses.support,'unbound');assert.equal(r.statuses.game,'unbound');assert.equal(r.statuses.liveAdoption,false);assert.deepEqual(T.openTileBundle(JSON.stringify(c.bundle)).bundle,c.bundle);assert.ok(r.work.total<=T.TILE_COMPOSITION_LIMITS.maxWork);}
});
test('C2a overlapping rectangles retain union, independent owners, internal seams and explicit nonlexical finish order',()=>{
  const b=setup(T,[{id:'z',w:8,d:4,skin:'skin.z'},{id:'a',w:8,d:4,x:4,skin:'skin.a'}],{finishOrder:['z','a']}),r=resolve(b);
  assert.deepEqual(r.geometry.area,['48','1']);assert.equal(r.partitions.length,3);assert.deepEqual(r.partitions.find(p=>p.ownerIds.length===2).ownerIds,['a','z']);assert.equal(r.partitions.find(p=>p.ownerIds.length===2).finishOwnerId,'z');assert.ok(r.interfaces.some(i=>i.leftOwners.length&&i.rightOwners.length));assert.ok(r.portBindings.some(p=>p.exposure==='internal'));assert.equal(r.certificates.length,1);assert.equal(r.certificates[0].positiveVolume,true);assert.deepEqual(r.source,b.layout);
});
test('C2a exact native translations keep source-value affine sums and gaps separate from canonical samples',()=>{
  const b=setup(T,[{id:'a',x:100000,y:.0000003},{id:'b',x:100002.00000001,y:.0000003}]),r=resolve(b);assert.equal(r.geometry.components.length,2);assert.equal(r.certificates.length,0);
  const n=advance(b);n.layout.joins=[join('false.q.join','a','east','b','west')];failure(b,request(T,b,n),/NATIVE_JOIN_MISMATCH|JOIN_MISMATCH|BORDER_GEOMETRY/);
  assert.ok(r.geometry.vertices.some(v=>v.point[1][1]!=='1'));assert.deepEqual(b.recipes[0].shape.outlines[0].segments[0].a,[0,0,0]);
});
test('C2a point contacts keep four outer void neighbours and an independent inner island',()=>{
  const c=oracleCases(T).find(c=>c.name==='void with inner island'),r=resolve(c.bundle);assert.equal(r.geometry.components.length,5);assert.equal(r.geometry.voids.length,1);assert.equal(r.geometry.voids[0].surroundingComponents.length,4);assert.equal(r.geometry.voids[0].holeWalks.length,1);assert.ok(r.geometry.incidence.some(i=>i.touching));
});
test('C2a typed groups are functional, versioned, closed and explicit; group-free source stays unresolved',()=>{
  const b=setup(T,[{id:'a'}]);for(const mutate of [n=>n.layout.compositions[0].operation='xor',n=>n.layout.compositions[0].version=2,n=>n.layout.compositions[0].finishOrder=[],n=>n.layout.compositions[0].members[0].instanceId='missing',n=>n.layout.compositions[0].members.push(n.layout.compositions[0].members[0]),n=>n.layout.compositions[0].fallback=true,n=>n.layout.annotations.boolean={union:true}]){const n=clone(b);mutate(n);assert.throws(()=>T.openTileBundle(n));}
  const n=clone(b);delete n.layout.compositions;const saved=T.openTileBundle(n);assert.equal(saved.ok,false);assert.deepEqual(saved.bundle,n);assert.throws(()=>T.openTileBundle(n,{requireResolved:true}),/candidate|Candidate/);failure(n,request(T,n,advance(n)),/TILE_V2_UNRESOLVED/);
});
test('C2a whole-owner finish copies are request-bound, preserve source/ports, isolate a shared locked neighbour',()=>{
  const b=setup(T,[{id:'a',recipeId:'shared'},{id:'b',recipeId:'shared',x:2,locked:true}]),r=prepare(b,finish(T,b,'a','skin.red'));
  assert.equal(r.ok,true,JSON.stringify(r.diagnostics));assert.equal(r.next.bundle.recipes.length,2);assert.deepEqual(r.next.bundle.layout.instances[1],b.layout.instances[1]);assert.deepEqual(r.next.compiled.portBindings.map(p=>p.id),resolve(b).portBindings.map(p=>p.id));assert.deepEqual(r.next.compiled.portBindings.map(p=>p.spanKey),resolve(b).portBindings.map(p=>p.spanKey));assert.ok(r.next.compiled.partitions.filter(p=>p.finishOwnerId==='a').every(p=>p.skinId==='skin.red'));assert.deepEqual(r.dependencies.affectedIds,['a','b']);
  const bad=finish(T,b,'a','skin.red');bad.finishCopies[0].toRecipeId='forged';failure(b,bad,/INVALID_FINISH_COPY/);
  const changed=advance(b);changed.recipes[0].interior.skinId='skin.all';changed.recipes[0].contentVersion++;failure(b,request(T,b,refresh(T,changed)),/FINISH_COPY_REQUIRED/);
});
test('C2a locks preserve visible coverage even when locked source stays untouched',()=>{
  const b=setup(T,[{id:'a',locked:true},{id:'b',x:2}]),n=advance(b);n.layout.instances[1].origin=[1,0,0];n.layout.compositions[0].finishOrder=['b','a'];failure(b,request(T,b,n),/LOCK_VISIBLE_COVERAGE/);
  const r=finish(T,b,'a','skin.red');failure(b,r,/LOCK_CONFLICT/);
  const overlap=setup(T,[{id:'a',locked:true},{id:'b',x:1}],{finishOrder:['a','b']}),order=advance(overlap);order.layout.compositions[0].finishOrder=['b','a'];failure(overlap,request(T,overlap,order),/LOCK_VISIBLE_COVERAGE/);
  const unlock=advance(b);unlock.layout.instances[0].locked=false;failure(b,request(T,b,unlock),/LOCK_CONFLICT/);
});
test('C2a an unchanged locked full-side neighbour permits an adjacent whole-owner operation',()=>{
  const b=setup(T,[{id:'a',w:8,d:4,x:20},{id:'b',w:8,d:4,x:28,locked:true}],{joins:[join('seam','a','east','b','west')]}),r=prepare(b,finish(T,b,'a','skin.paint'));assert.equal(r.ok,true,JSON.stringify(r.diagnostics));assert.equal(r.next.compiled.joins[0].pairs.length,1);
});
test('C2a external and extra reservation contacts cannot inherit a primary pair-wide waiver',()=>{
  const extra={id:'extra',floorSlot:'base',channel:'surface',layerId:'ground',min:[0,0,0],max:[2,2,.1]},b=setup(T,[{id:'a',extra:[extra]},{id:'b',x:1}]);assert.equal(T.openTileBundle(b).ok,false);assert.match(JSON.stringify(T.openTileBundle(b).diagnostics),/RESERVATION_CONFLICT/);
  const external=setup(T,[{id:'a'},{id:'b',x:2,group:false}]);assert.match(JSON.stringify(T.openTileBundle(external).diagnostics),/INCOMPLETE_REPAIR/);
  const good=clone(external);good.layout.joins=[join('external','a','east','b','west')];assert.equal(T.openTileBundle(good).ok,true);
  const transition=clone(external);transition.layout.relations=[{id:'tag',kind:'transition',a:'a',b:'b',clearanceM:0}];assert.equal(T.openTileBundle(transition).ok,false);
});
test('C2a additional reservation contact needs independent interval proof, not a join elsewhere on its pair',()=>{
  const extra={id:'remote',floorSlot:'base',channel:'surface',layerId:'ground',min:[0,10,0],max:[2,12,.1]},b=setup(T,[{id:'a',extra:[extra]},{id:'b',x:2,extra:[extra],group:false}],{joins:[join('body-only','a','east','b','west')]});assert.match(JSON.stringify(T.openTileBundle(b).diagnostics),/INCOMPLETE_REPAIR/);
});
test('C2a explicit cross/alongside contracts prove only matching actual reservation pairs',()=>{
  const b=setup(T,[{id:'a'},{id:'b',z:3,floorId:'upper',group:false}],{relations:[{id:'cross',kind:'cross',a:'a',b:'b',clearanceM:2.5}]});assert.equal(T.openTileBundle(b).ok,true);
  const n=clone(b);n.layout.relations[0].clearanceM=3;assert.equal(T.openTileBundle(n).ok,false);
  const adjacent=setup(T,[{id:'a'},{id:'b',x:2,group:false}],{relations:[{id:'along',kind:'alongside',a:'a',b:'b',clearanceM:0}]});assert.equal(T.openTileBundle(adjacent).ok,true);
});
test('C2a required/terminal and incompatible boundary/height capabilities refuse source-preservingly',()=>{
  const base=setup(T,[{id:'a'},{id:'b',x:1}]);for(const mutate of [r=>r.ports[0].policy='required',r=>r.ports[0].policy='terminal',r=>r.ports[0].profiles.material.id='other',r=>r.ports[0].uv.phase[0]=1,r=>r.shape.clip={min:[0,0,0],max:[1,1,1]},r=>{r.shape.outlines[0].segments[0]={kind:'cubic',id:'native.cubic',points:[[0,0,0],[.5,0,0],[1.5,0,0],[2,0,0]]};}]){const n=clone(base);mutate(n.recipes[0]);const checked=refresh(T,n),snapshot=JSON.stringify(checked);assert.equal(T.openTileBundle(checked).ok,false);assert.equal(JSON.stringify(checked),snapshot);}
  const height=clone(base);height.layout.instances[1].origin[2]=.00000001;assert.equal(T.openTileBundle(height).ok,false);
});
test('C2a complete preparation has explicit old/new closure and cannot prune source or silently edit owners',()=>{
  const b=setup(T,[{id:'a'},{id:'b',x:2}]),r=finish(T,b,'a','skin.new');r.editedOwnerIds=[];failure(b,r,/IMPLICIT_OWNER_EDIT/);
  const n=advance(b);n.recipes.splice(0,1);n.layout.instances=n.layout.instances.filter(v=>v.id!=='a');n.layout.compositions[0].members=n.layout.compositions[0].members.filter(v=>v.instanceId!=='a');n.layout.compositions[0].finishOrder=['b'];failure(b,request(T,b,refresh(T,n)),/CATALOGUE_PRUNING/);
  const moved=advance(b);moved.layout.instances[0].origin=[100,0,0];const result=prepare(b,request(T,b,moved));assert.equal(result.ok,true);assert.deepEqual(result.dependencies.affectedIds,['a','b']);assert.ok(result.dependencies.possiblePairs.some(p=>p.join(',')==='a,b'));
});
test('C2a empty explicit source can add the first retained owner without upgrading group-free A/B',()=>{
  // Keep a deliberate unused original recipe; complete bundles always have a catalogue.
  const b=setup(T,[{id:'draft'}]),empty=clone(b);empty.layout.instances=[];empty.layout.compositions[0].members=[];empty.layout.compositions[0].finishOrder=[];const next=clone(b);next.layout.revision=1;const r=prepare(empty,request(T,empty,next));assert.equal(r.ok,true,JSON.stringify(r.diagnostics));assert.deepEqual(r.changes.addedIds,['draft']);assert.equal(resolve(empty).geometry,null);
});
test('C2a source/context/revision cancellation and descriptor safety return atomic bounded failures',()=>{
  const b=setup(T,[{id:'a'}]),r=finish(T,b,'a','skin.new');for(const key of ['revision','layoutDigest','catalogueDigest','contextToken']){const n=clone(r);n.expected[key]=key==='revision'?1:'b'.repeat(64);failure(b,n,/STALE/);}
  assert.match(JSON.stringify(T.prepareTileRepair(b,r,{contextToken:context.contextToken,cancelled:true}).diagnostics),/CANCELLED/);
  let called=0;const evil={...r};Object.defineProperty(evil,'nextBundle',{enumerable:true,get(){called++;throw Error('getter');}});const refused=T.prepareTileRepair(b,evil,context);assert.equal(refused.ok,false);assert.match(JSON.stringify(refused.diagnostics),/INVALID_DATA/);assert.equal(called,0);
});
test('C2a aggregate old-plus-new limits, work, artifact, arithmetic and output ceilings fail atomically',()=>{
  const b=setup(T,[{id:'a'},{id:'b',x:1}]),r=finish(T,b,'a','skin.new'),good=prepare(b,r);assert.equal(good.ok,true);
  for(const key of ['maxOriginalSegments','maxPartitions','maxPortBindings','maxProvenanceLinks']){const n=clone(r);n.limits[key]=good.work.counts[key]-1;failure(b,n,/LIMIT/);}
  for(const [key,value]of [['maxWork',1000],['maxSerializedBytes',1000],['maxInputBits',2],['maxRationalBits',2],['maxIntermediateBits',4],['maxAffectedOwners',1],['maxGroupRectangles',1]]){const n=clone(r);n.limits[key]=value;failure(b,n,/LIMIT|BITS/);}
  const excessive=clone(r);excessive.limits.maxWork++;failure(b,excessive,/INVALID_NUMBER/);
  const limit=setup(T,Array.from({length:16},(_,i)=>({id:'r.'+i,w:1,d:1,x:2*i}))),accepted=prepare(limit,finish(T,limit,'r.0','skin.next'));assert.equal(accepted.ok,true,JSON.stringify(accepted.diagnostics));assert.equal(accepted.work.counts.maxOriginalSegments,128);
});
test('C2a retained host owns one checkpoint/history, preserves redo on refusal and recovers same-request unknown outcome',()=>{
  let bundle=setup(T,[{id:'a'},{id:'b',x:2,locked:true}]),hostToken='c'.repeat(64),history=[],redo=['retained-redo'],pending=null,throwAfterCommit=false;const rawMap={format:'original',unknown:{retained:true},injury:17,spent:9},rawBytes=JSON.stringify(rawMap),journal=new Map();
  const read=()=>{if(pending)throw Error('recovery required');return {bundle,token:hostToken,contextToken:context.contextToken};};
  const consumer=T.createRetainedTileConsumer({read,compareAndSwap(op){if(pending||!op.canCommit()||op.expected.hostToken!==hostToken||op.expected.contextToken!==context.contextToken)return false;history.push({rawMap:clone(rawMap),bundle});redo=[];bundle=op.nextBundle;hostToken='d'.repeat(64);journal.set(op.requestId,{bundle,committed:true});if(throwAfterCommit){pending=op.requestId;throw Error('ack lost');}return true;}});
  const invalid=finish(T,bundle,'b','skin.locked');assert.equal(consumer.prepare(invalid).ok,false);assert.deepEqual(redo,['retained-redo']);assert.equal(history.length,0);
  const plan=consumer.prepare(finish(T,bundle,'a','skin.first'));assert.equal(plan.ok,true);assert.throws(()=>consumer.apply(clone(plan)),/actual handle/);assert.equal(consumer.apply(plan).ok,true);assert.equal(history.length,1);assert.equal(JSON.stringify(rawMap),rawBytes);assert.throws(()=>consumer.apply(plan));
  throwAfterCommit=true;const next=consumer.prepare(finish(T,bundle,'a','skin.second','finish.2')),outcome=consumer.apply(next);assert.equal(outcome.code,'COMMIT_OUTCOME_UNKNOWN');assert.equal(outcome.requestId,'finish.2');assert.throws(()=>consumer.prepare(finish(T,bundle,'a','skin.third')),/recovery required/);assert.equal(journal.get(pending).committed,true);assert.equal(history.length,2);pending=null;assert.equal(bundle.layout.revision,2);consumer.dispose();
});
test('C2a retained final lease detects stale context and operation disposal without another history',()=>{
  const b=setup(T,[{id:'a'}]);let active=context.contextToken,commits=0;const consumer=T.createRetainedTileConsumer({read:()=>({bundle:b,token:'c'.repeat(64),contextToken:active}),compareAndSwap(op){if(op.expected.contextToken!==active||!op.canCommit())return false;commits++;return true;}}),plan=consumer.prepare(finish(T,b,'a','skin.next'));active='b'.repeat(64);assert.equal(consumer.apply(plan).ok,false);assert.equal(commits,0);consumer.dispose();
});
test('C2a executes with ambient DOM/storage/network/renderer/clock/RNG poisoned',()=>{
  const fixture=new URL('./fixtures/procedural-tiles/c2a.mjs',import.meta.url).href,source=`for(const key of ['window','document','navigator','THREE','fetch','localStorage','performance','setTimeout','setInterval'])Object.defineProperty(globalThis,key,{get(){throw Error(key)}});Math.random=()=>{throw Error('RNG')};Date.now=()=>{throw Error('clock')};const T=await import(${JSON.stringify(spec)}),F=await import(${JSON.stringify(fixture)});const b=F.setup(T,[{id:'a'},{id:'b',x:1}]),r=T.prepareTileRepair(b,F.finish(T,b,'a','skin.next'),{contextToken:'a'.repeat(64)});if(!r.ok)throw Error(JSON.stringify(r.diagnostics));`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',source],{encoding:'utf8',windowsHide:true,timeout:30000});assert.equal(child.status,0,child.stderr);
});

test('C2a frozen retained factory lifecycle stays identical apart from private resolver dispatch',async()=>{
  if(process.env.NAUTILUS_TILE_V2_PACKAGE)return;
  const fs=await import('node:fs');const a=fs.readFileSync(new URL('../packages/tiles-core/example.js',import.meta.url),'utf8'),b=fs.readFileSync(new URL('../packages/tiles-core/retained-candidate.js',import.meta.url),'utf8');assert.equal(b.slice(b.indexOf('// Small retained-host')),a.replace("from './repair.js'","from './v2-records.js'"));
});
test('C2a native v2 region controls resolve only inside the explicit profile and unused future grammar stays unrequested',async()=>{
  const b=setup(T,[{id:'a'}]),r=b.recipes[0];r.version=2;r.exposure=[];r.anchors=[{id:r.shape.id,kind:'shape',sourceId:r.shape.id,parentId:null,controlIndex:null}];const n=refresh(T,b);assert.equal(resolve(n).instances[0].frame,'local');assert.equal(T.compileTileRecipe(r).statuses.geometry.state,'unresolved');
  const F=await import('./fixtures/procedural-tiles/v2.mjs'),draft=F.native('ribbon-sweep');draft.id='unused.native.ribbon';n.recipes.push(draft);const retained=refresh(T,n);assert.equal(T.openTileBundle(retained).ok,true);assert.deepEqual(T.openTileBundle(retained).bundle.recipes.find(r=>r.id===draft.id),draft);
});
test('C2a a locked outside owner may become an unchanged member without dimensional coverage confusion',()=>{
  const b=setup(T,[{id:'a',locked:true,group:false}]),n=advance(b);n.layout.compositions[0].members=[{instanceId:'a',primaryReservationId:'body'}];n.layout.compositions[0].finishOrder=['a'];const result=prepare(b,request(T,b,n));assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
});

test('C2a malformed long field diagnostics remain bounded and preserve original input',()=>{
  const b=setup(T,[{id:'a'}]),r=finish(T,b,'a','skin.next'),key='x'.repeat(3000);r.nextBundle.layout[key]=true;const result=T.prepareTileRepair(b,r,context);assert.equal(result.ok,false);assert.ok(result.diagnostics.every(d=>Object.values(d).every(v=>v.length<=2048)));assert.equal(result.next,null);
});

test('C2a malformed identified source/candidate containers return structured failures without escaping dispatch',()=>{
  const b=setup(T,[{id:'a'}]),r=finish(T,b,'a','skin.next');
  for(const mutate of [v=>v.layout.instances=null,v=>v.layout.instances=4,v=>v.layout.instances=[null],v=>v.layout.floors=null,v=>v.layout.joins=null,v=>v.layout.annotations=null,v=>v.layout.compositions=[null],v=>v.layout.compositions[0].members=[null]]){
    for(const where of ['source','candidate']){const source=clone(b),req=clone(r);mutate(where==='source'?source:req.nextBundle);const result=T.prepareTileRepair(source,req,context);assert.equal(result.ok,false);assert.equal(result.next,null);assert.equal(result.changes,null);assert.ok(result.diagnostics.length);}
  }
});

test('C2a unused catalogue samplers share the preparation budget and cannot hide child work',()=>{
  const b=setup(T,[{id:'a'}]),small=prepare(b,finish(T,b,'a','skin.next'));assert.equal(small.ok,true);
  const large=clone(b),unused=clone(large.recipes[0]);unused.id='unused.high.sampling';unused.ports.forEach(p=>p.boundary.sampling.segmentsPerPart=128);large.recipes.push(unused);const retained=refresh(T,large),r=finish(T,retained,'a','skin.next'),full=prepare(retained,r);assert.equal(full.ok,true,JSON.stringify(full.diagnostics));assert.ok(full.work.units.source>small.work.units.source);assert.deepEqual(full.next.bundle.recipes.find(v=>v.id===unused.id),unused);
  r.limits.maxWork=Math.floor((small.work.total+full.work.total)/2);failure(retained,r,/WORK_LIMIT/);
});
