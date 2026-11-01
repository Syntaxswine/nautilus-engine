import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as T from '../packages/tiles-core/index.js';
import {shoreField} from '../vendor/aft/781246a668c723d5a4c5463e70534cc04b6a5641/dist/tactics/shore-tiles.js';
import {clone,transforms,schedule,line,region,field,put,join,setup,repairRequest,slot} from './fixtures/procedural-tiles/catalogue.mjs';
import {mixedYard,retainedHost,runRetainedTileProof} from './fixtures/procedural-tiles/consumer.mjs';
import {tileSchemas} from '../tools/tile-schemas.mjs';
const refused=(fn,code)=>assert.throws(fn,e=>e.code===code||e.diagnostics?.some(d=>d.code===code),code),key=T.tileLayoutToken;
const pair=(a=region('paving'),b=a)=>setup(T,a===b?[a]:[a,b],[put(T,'a',a),put(T,'b',b,[2,0,0])],[join('join.east-west','a','east','b','west')]);
const rotate=(v,t)=>{let [x,y,h]=v;if(t.mirrorX)x=-x;for(let i=0;i<t.quarterTurns;i++)[x,y]=[-y,x];return [x||0,y||0,h||0];};

test('reference source hashes and legacy AFT corner borders stay fixed while new interior variants remain independent',()=>{
  const audit=JSON.parse(fs.readFileSync(new URL('../docs/reviews/procedural-tiles/source-audit.json',import.meta.url)));assert.equal(audit.reviewedAFT.commit,'781246a668c723d5a4c5463e70534cc04b6a5641');
  for(const f of audit.reviewedAFT.files){const bytes=fs.readFileSync(new URL('../vendor/aft/'+audit.reviewedAFT.commit+'/dist/tactics/'+f.path,import.meta.url));assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),f.gitBlob);}
  for(let mask=0;mask<16;mask++)for(let v=0;v<3;v++)for(let i=0;i<=24;i++)for(const [u,w]of [[0,i/24],[1,i/24],[i/24,0],[i/24,1]]){const value=T.sampleTileField(field('cell',mask,v).shape,u,w);assert.ok(Math.abs(value.value-shoreField(mask,u,w,v))<1e-12);assert.equal(value.boundary,true);assert.equal(value.heightM,0);assert.deepEqual(value.normal,[0,0,1]);}
  assert.notEqual(T.sampleTileField(field('cell',3,0).shape,.3,.4).heightM,T.sampleTileField(field('cell',3,2).shape,.3,.4).heightM);
});

test('new compatible field borders agree exactly over all masks and variant pairs, including heights/normals/paint',()=>{
  for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(const [axis,bits,other]of [[0,[2,4],[1,8]],[1,[8,4],[1,2]]])if(bits.every((bit,i)=>!!(a&bit)===!!(b&other[i])))for(let v=0;v<3;v++){
    const sa=field('a',a,v).shape,sb=field('b',b,(v+1)%3).shape;for(let i=0;i<=8;i++){const u=i/8,pa=T.sampleTileField(sa,axis?u:1,axis?1:u),pb=T.sampleTileField(sb,axis?u:0,axis?0:u);for(const k of ['value','heightM','normal','paint'])assert.deepEqual(pa[k],pb[k]);}
  }
});

test('zero-positive and explicit saddle connectivity transform across D4 and complement without granting point-contact traversal',()=>{
  for(const mask of [5,10])for(const saddle of ['connect-positive','connect-negative']){const s=field('saddle',mask,2).shape;s.saddle=saddle;const centre=T.sampleTileField(s,.5,.5);assert.equal(centre.classification,saddle==='connect-positive'?'positive':'negative');for(const transform of transforms)for(const complement of [false,true]){const result=T.tileFieldTopology(s,{transform,complement});assert.equal(result.ambiguous,true);assert.equal(result.saddle,complement?(saddle==='connect-positive'?'connect-negative':'connect-positive'):saddle);assert.equal(result.pointContactGrantsTraversal,false);assert.equal(result.diagonal.length,2);assert.equal(result.cornerPositiveComponents,result.saddle==='connect-positive'?1:2);}}
  const zero=field('zero',0).shape;zero.values=[0,0,0,0];zero.fieldAmplitude=0;assert.equal(T.sampleTileField(zero,0,.5).classification,'positive');assert.equal(T.sampleTileField(zero,0,.5).value,0);
});

test('opposing measured interfaces survive all four rotations and allowed mirrors in a common world frame',()=>{
  const r=region('all-d4');for(const transform of transforms){const s=setup(T,[r],[put(T,'a',r,[0,0,0],{transform}),put(T,'b',r,rotate([2,0,0],transform),{transform})],[join('d4','a','east','b','west')]),compiled=T.compileTileLayout(s.layout,s.catalogue);assert.equal(compiled.joins[0].pairs.length,1);const a=compiled.instances[0].ports.find(p=>p.id==='east'),b=compiled.instances[1].ports.find(p=>p.id==='west');assert.deepEqual(a.geometry,b.geometry);assert.deepEqual(a.outward,b.outward.map(v=>-v||0));assert.deepEqual(compiled.source,s.layout);}
});

test('canonical border ordering preserves AFT world offsets even at 2-versus-10 and negative coordinates',()=>{
  const r=region('wide',8,2),s=setup(T,[r],[put(T,'a',r,[2,-10,0])]),p=T.compileTileLayout(s.layout,s.catalogue).instances[0].ports.find(p=>p.id==='north');assert.deepEqual(p.geometry.positions[0],[2000000,-10000000,0]);assert.deepEqual(p.geometry.positions.at(-1),[10000000,-10000000,0]);
});

test('boundary tangents agree while route-flow tangents follow their own explicit policy',()=>{
  const a=region('flow-a'),b=region('flow-b');for(const p of a.ports)p.flow={policy:'opposed',vector:[1,0,0]};for(const p of b.ports)p.flow={policy:'opposed',vector:[-1,0,0]};const s=pair(a,b),c=T.compileTileLayout(s.layout,s.catalogue);assert.deepEqual(c.instances[0].ports[1].tangent,c.instances[1].ports[3].tangent);b.ports.find(p=>p.id==='west').flow.vector=[1,0,0];const bad=pair(a,b);refused(()=>T.compileTileLayout(bad.layout,bad.catalogue),'FLOW_TANGENT_MISMATCH');
});

test('exact floor identity and height formulas support upper floors and refuse treating layer names as metres',()=>{
  const r=region('upper'),s=setup(T,[r],[put(T,'a',r,[0,0,3],{floorBindings:{base:'upper'}}),put(T,'b',r,[2,0,3],{floorBindings:{base:'upper'}})],[join('upper','a','east','b','west')]);assert.equal(T.compileTileLayout(s.layout,s.catalogue).instances[0].ports[0].endpoint[2],3000000);s.layout.instances[1].origin[2]=6;refused(()=>T.compileTileLayout(s.layout,s.catalogue),'FLOOR_HEIGHT_MISMATCH');
  const sameHeight=pair();sameHeight.layout.floors.push({id:'other-zero',elevationM:0});sameHeight.layout.instances[1].floorBindings.base='other-zero';refused(()=>T.compileTileLayout(sameHeight.layout,sameHeight.catalogue),'PORT_FLOORID_MISMATCH');
});

function boundaryRecipe(id,curve,outward,endpoint,tangent){const r=region(id);r.reservations=[];const p=clone(r.ports[0]);Object.assign(p,{id:'boundary',faceId:'boundary',outward,endpoint,tangent,widthM:3,policy:'required'});p.boundary.curve=curve;r.ports=[p];return r;}
test('diagonal cuts and vertical top/bottom planes match their actual canonical geometry',()=>{
  const n=Math.SQRT1_2,c=line('diagonal',[0,2,0],[2,0,0]),a=boundaryRecipe('diagonal-a',c,[n,n,0],[1,1,0],[n,-n,0]),b=boundaryRecipe('diagonal-b',clone(c),[-n,-n,0],[1,1,0],[n,-n,0]),s=setup(T,[a,b],[put(T,'a',a),put(T,'b',b)],[join('diagonal','a','boundary','b','boundary')]);assert.equal(T.compileTileLayout(s.layout,s.catalogue).joins.length,1);
  const top=region('top'),bottom=region('bottom');top.reservations=[];bottom.reservations=[];for(const [r,outward]of [[top,[0,0,1]],[bottom,[0,0,-1]]]){const p=clone(r.ports[0]);p.id='cap';p.faceId='cap';p.outward=outward;p.tangent=[1,0,0];p.endpoint=[1,1,0];p.boundary.curve=clone(r.shape.outlines[0]);r.ports=[p];}const v=setup(T,[top,bottom],[put(T,'a',top),put(T,'b',bottom)],[join('top-bottom','a','cap','b','cap')]);assert.equal(T.compileTileLayout(v.layout,v.catalogue).joins[0].pairs.length,1);
});

test('analytic arc joins and reversed compound corners retain one canonical parameterization',()=>{
  const arc={kind:'arc',id:'arc',center:[0,0],radius:2,startRad:0,sweepRad:Math.PI/2,h0:0,h1:0},reverse={...arc,startRad:Math.PI/2,sweepRad:-Math.PI/2},a=boundaryRecipe('arc-a',arc,[0,0,1],[1,1,0],[0,1,0]),b=boundaryRecipe('arc-b',reverse,[0,0,-1],[1,1,0],[1,0,0]),s=setup(T,[a,b],[put(T,'a',a),put(T,'b',b)],[join('curve','a','boundary','b','boundary')]);assert.equal(T.compileTileLayout(s.layout,s.catalogue).joins.length,1);
  const c={kind:'compound',id:'corner',segments:[line('one',[0,0,0],[1,0,0]),line('two',[1,0,0],[1,1,0])]},d={kind:'compound',id:'other',segments:[line('second',[1,1,0],[1,0,0]),line('first',[1,0,0],[0,0,0])]},x=boundaryRecipe('corner-a',c,[0,0,1],[.5,.5,0],[1,0,0]),y=boundaryRecipe('corner-b',d,[0,0,-1],[.5,.5,0],[0,-1,0]),v=setup(T,[x,y],[put(T,'a',x),put(T,'b',y)],[join('corner','a','boundary','b','boundary')]);assert.equal(T.compileTileLayout(v.layout,v.catalogue).joins.length,1);
});

test('sparse coincident samples cannot certify two different cubic Bezier curves',()=>{
  const c={kind:'cubic',id:'cubic',points:[[0,0,0],[1,1,0],[2,-1,0],[3,0,0]]},d={kind:'cubic',id:'other',points:[[0,0,0],[.5,.5,0],[2.5,-.5,0],[3,0,0]]},n=Math.SQRT1_2,a=boundaryRecipe('cubic-a',c,[0,0,1],[1.5,0,0],[n,n,0]),b=boundaryRecipe('cubic-b',d,[0,0,-1],[1.5,0,0],[n,n,0]);for(const r of [a,b])r.ports[0].boundary.sampling={segmentsPerPart:1,maxChordErrorM:10,maxSegmentM:10,maxWork:10};const s=setup(T,[a,b],[put(T,'a',a),put(T,'b',b)]),ca=T.transformTileRecipe(a,s.layout.instances[0],s.layout.floors).geometry.ports[0],cb=T.transformTileRecipe(b,s.layout.instances[1],s.layout.floors).geometry.ports[0];for(const k of ['positions','normals','tangents','uv'])assert.deepEqual(ca.geometry[k],cb.geometry[k]);s.layout.joins=[join('cubic-fraud','a','boundary','b','boundary')];refused(()=>T.compileTileLayout(s.layout,s.catalogue),'BORDER_GEOMETRY_MISMATCH');
});

test('analytic sampling declares independent chord, segment and work limits and preserves authored precision',()=>{
  const c={kind:'cubic',id:'native-controls',points:[[.123456789,0,0],[1,1,0],[2,-1,0],[3.5000000001,0,0]]},before=JSON.stringify(c),options={sampling:{segmentsPerPart:64,maxChordErrorM:.01,maxSegmentM:1,maxWork:200},transform:transforms[0],origin:[0,0,0]},sample=T.sampleTileCurve(c,options);assert.equal(JSON.stringify(c),before);assert.deepEqual(sample.descriptor[0].points,c.points);assert.ok(sample.analyticErrorBoundM<=sample.errorBoundM);assert.ok(sample.positionQuantizationBoundM<=Math.sqrt(3)/2000000+1e-12);refused(()=>T.sampleTileCurve(c,{...options,sampling:{...options.sampling,maxWork:2}}),'CURVE_WORK_LIMIT');refused(()=>T.sampleTileCurve(c,{...options,sampling:{...options.sampling,maxChordErrorM:1e-10}}),'CHORD_ERROR_LIMIT');
  const tiny=line('tiny',[0,0,0],[.0000001,0,0]);refused(()=>T.sampleTileCurve(tiny,options),'COLLAPSED_CURVE');
});

test('boundary material/UV/profile/width/thickness mismatches name the actual rejected join',()=>{
  const cases=[['widthM',p=>p.widthM+=.25,'PORT_WIDTHM_MISMATCH'],['thicknessM',p=>p.thicknessM*=2,'PORT_THICKNESSM_MISMATCH'],['material',p=>p.profiles.material.id='other.border','PROFILE_MISMATCH'],['UV',p=>p.uv.phase[0]=1,'UV_MAPPING_MISMATCH'],['height',p=>{p.endpoint[2]=.1;p.floor.offsetM=.1;p.boundary.curve.a[2]=.1;p.boundary.curve.b[2]=.1;},'ENDPOINT_MISMATCH']];
  for(const [name,change,code]of cases){const a=region('a'),b=region('b');change(b.ports.find(p=>p.id==='west'));const s=pair(a,b);assert.throws(()=>T.compileTileLayout(s.layout,s.catalogue),e=>e.diagnostics.some(d=>d.code===code&&d.joinId==='join.east-west'),name);}
});

test('different interior skins/detail do not change edge identity; explicit transition pieces bind boundary materials',()=>{
  const a=region('skin-a'),b=region('skin-b');b.interior={variantSeed:4294967295,detail:8,skinId:'skin.red'};const s=pair(a,b),c=T.compileTileLayout(s.layout,s.catalogue);assert.equal(c.instances[0].ports[1].worldEdgeId,c.instances[1].ports[3].worldEdgeId);
  const p=region('paver'),transition=region('transition',1,2),road=region('road',3.5,2,{material:'border.asphalt'});for(const side of ['east']){const port=transition.ports.find(p=>p.id===side);port.profiles.material.id='border.asphalt';port.boundary.materialIntervals[0].material.id='border.asphalt';}const v=setup(T,[p,transition,road],[put(T,'p',p),put(T,'t',transition,[2,0,0]),put(T,'r',road,[3,0,0])],[join('p-t','p','east','t','west'),join('t-r','t','east','r','west')]);assert.equal(T.compileTileLayout(v.layout,v.catalogue).joins.length,2);
});

test('multi-span layered interfaces need complete required-port coverage, while open/terminal policy stays explicit',()=>{
  const a=region('layers-a'),b=region('layers-b');for(const r of [a,b]){const p=clone(r.ports.find(p=>p.id=== (r===a?'east':'west')));p.id='kerb';p.channel='kerb';p.layerId='edge';p.policy='required';r.ports.push(p);}const s=pair(a,b);assert.equal(T.compileTileLayout(s.layout,s.catalogue).joins[0].pairs.length,2);
  b.ports=b.ports.filter(p=>p.id!=='kerb');const bad=pair(a,b);refused(()=>T.compileTileLayout(bad.layout,bad.catalogue),'UNMATCHED_REQUIRED_PORT');const terminal=region('terminal');terminal.ports.forEach(p=>p.policy='terminal');const v=pair(terminal,terminal);refused(()=>T.compileTileLayout(v.layout,v.catalogue),'EMPTY_JOIN');
});

test('dedup ownership does not own geometry or support; every resident port keeps the canonical border',()=>{
  const s=pair(),c=T.compileTileLayout(s.layout,s.catalogue),edge=c.joins[0].pairs[0];assert.equal(edge.dedupOwner,'a');assert.equal(edge.geometryCopies,'each-port');assert.equal(edge.skirtPolicy.requiresBothResident,true);assert.equal(edge.skirtPolicy.otherwise,'retain-exterior-boundary');assert.equal(c.statuses.gameplay.support,'unbound');
  s.layout.instances[0].id='z';s.layout.joins[0].a.instanceId='z';const next=T.compileTileLayout(s.layout,s.catalogue);assert.equal(next.joins[0].pairs[0].dedupOwner,'b');assert.equal(next.joins[0].pairs[0].worldEdgeId,edge.worldEdgeId);assert.deepEqual(next.instances[0].ports[1].geometry,c.instances[0].ports[1].geometry);
});

test('self-contained bundles retain precise cubic intent, anchors, template pins, locks, seeds and unknown bounded authoring data',()=>{
  const r=region('drawn');r.shape={kind:'profile-sweep',id:'region.drawn',path:{kind:'cubic',id:'segment.drawn',points:[[0,0,0],[.123456789,1,0],[2,2,0],[3.5000000001,3,0]]},widthM:1.234567891,thicknessM:.123456789};r.anchors=[{id:'path.drawn',kind:'path',parentId:null},{id:'segment.drawn',kind:'segment',parentId:'path.drawn'},{id:'node.start',kind:'node',parentId:'segment.drawn',controlIndex:0}];r.templates=[{id:'family.curves',version:1,contentDigest:'b'.repeat(64)}];r.interior.variantSeed=1234;const s=setup(T,[r],[put(T,'drawn',r,[0,0,0],{locked:true})]),text=T.serializeTileBundle(s.layout,s.catalogue),opened=T.openTileBundle(text,{requireResolved:true});assert.equal(T.serializeTileBundle(opened.bundle.layout,opened.catalogue),text);assert.deepEqual(opened.bundle.recipes[0],r);assert.equal(opened.bundle.layout.instances[0].locked,true);assert.deepEqual(opened.bundle.layout.extensions,s.layout.extensions);assert.equal(opened.statuses.presentation.state,'unbound');assert.equal(opened.statuses.gameplay.navigation,'unbound');
  const bad=JSON.parse(text);bad.layout.instances[0].contentDigest='f'.repeat(64);refused(()=>T.openTileBundle(bad),'CONTENT_MISMATCH');bad.recipes[0].version=2;refused(()=>T.openTileBundle(bad),'UNSUPPORTED_RECIPE');
});

test('saveable unresolved authoring is distinct from resolved geometry and all saved joins are revalidated',()=>{
  const r=region('required');r.ports[0].policy='required';const s=setup(T,[r],[put(T,'a',r)]),text=T.serializeTileBundle(s.layout,s.catalogue),opened=T.openTileBundle(text);assert.equal(opened.ok,false);assert.equal(opened.statuses.authored.saveable,true);assert.equal(opened.statuses.geometry.state,'unresolved');refused(()=>T.openTileBundle(text,{requireResolved:true}),'UNMATCHED_REQUIRED_PORT');refused(()=>T.assertLegacyTileExport(opened.bundle),'LEGACY_TILE_EXPORT_UNSUPPORTED');
  const v=pair(),saved=T.tileBundle(v.layout,v.catalogue);saved.layout.instances[1].origin[0]=3;const checked=T.openTileBundle(saved);assert.equal(checked.ok,false);assert.ok(checked.diagnostics.some(d=>d.joinId==='join.east-west'));
});

test('world-frame descriptors retain global controls/clips and refuse a second origin translation',()=>{
  const r=region('world');r.frame='world';r.allowedTransforms=[transforms[0]];for(const p of r.ports){p.endpoint[0]+=100;p.boundary.curve.a[0]+=100;p.boundary.curve.b[0]+=100;}r.reservations=[];r.shape.clip={min:[100,0,0],max:[102,2,1]};const s=setup(T,[r],[put(T,'world',r)]),c=T.compileTileLayout(s.layout,s.catalogue);assert.equal(c.instances[0].ports.find(p=>p.id==='west').endpoint[0],100000000);s.layout.instances[0].origin[0]=100;refused(()=>T.compileTileLayout(s.layout,s.catalogue),'WORLD_FRAME_ORIGIN');
});

test('pure deterministic selection is independent of catalogue/alternative/slot insertion order and saves its policy/seed',()=>{
  const a=region('variant-a'),b=region('variant-b');b.interior.skinId='skin.other';const s=setup(T,[a,b]),v=repairRequest(T,s.bundle,{slots:[slot('a',[a.id,b.id]),slot('b',[b.id,a.id],[2,0,0])],joins:[join('generated','a','east','b','west')]}),first=T.prepareTileRepair(s.bundle,v.request,v.context);assert.equal(first.ok,true);const reordered=setup(T,[b,a]);const request=clone(v.request);request.slots.reverse();for(const sl of request.slots)sl.alternatives.reverse();assert.deepEqual(T.prepareTileRepair(reordered.bundle,request,v.context).next.bundle,first.next.bundle);assert.equal(first.next.bundle.layout.selection.policyVersion,1);assert.equal(first.next.bundle.layout.selection.seed,7);
  const outputs=new Set();for(let seed=0;seed<8;seed++){const req=clone(v.request);req.selection.seed=seed;outputs.add(T.prepareTileRepair(s.bundle,req,v.context).layoutDigest);}assert.ok(outputs.size>1);assert.equal(T.tileLayoutToken(s.bundle),T.tileLayoutToken(s.bundle));
});

test('unsatisfiable, budget, stale/context and manual-lock failures preserve the accepted state and identify bad joins',()=>{
  const a=region('a'),b=region('b',2,2,{material:'wrong'}),s=setup(T,[a,b]),before=JSON.stringify(s.bundle),v=repairRequest(T,s.bundle,{slots:[slot('a',['a']),slot('b',['b'],[2,0,0])],joins:[join('named-bad','a','east','b','west')]}),bad=T.prepareTileRepair(s.bundle,v.request,v.context);assert.equal(bad.ok,false);assert.equal(bad.next,null);assert.ok(bad.diagnostics.some(d=>d.joinId==='named-bad'));assert.equal(JSON.stringify(s.bundle),before);
  for(const change of [r=>r.expected.revision++,r=>r.expected.contextToken='c'.repeat(64),r=>r.maxSteps=1]){const req=clone(v.request);change(req);const result=T.prepareTileRepair(s.bundle,req,v.context);assert.equal(result.ok,false);assert.equal(result.next,null);assert.equal(JSON.stringify(s.bundle),before);}
  const joined=pair();joined.layout.instances[0].locked=true;const bundle=T.tileBundle(joined.layout,joined.catalogue),x=repairRequest(T,bundle,{replaceIds:['a'],slots:[slot('a',['paving'])]});assert.equal(T.prepareTileRepair(bundle,x.request,x.context).diagnostics[0].code,'LOCK_CONFLICT');
});

test('repair bounds dependency closure and reports exact added/replaced/removed IDs in one candidate',()=>{
  const r=region('paving'),s=setup(T,[r],[put(T,'a',r),put(T,'b',r,[2,0,0]),put(T,'c',r,[4,0,0])],[join('ab','a','east','b','west'),join('bc','b','east','c','west')]),v=repairRequest(T,s.bundle,{removeIds:['b'],joins:[],maxClosure:1});assert.equal(T.prepareTileRepair(s.bundle,v.request,v.context).diagnostics[0].code,'DEPENDENCY_CLOSURE_LIMIT');v.request.maxClosure=128;const result=T.prepareTileRepair(s.bundle,v.request,v.context);assert.equal(result.ok,true);assert.deepEqual(result.changes.removedIds,['b']);assert.deepEqual(result.changes.affectedIds,['a','b','c']);assert.deepEqual(result.changes.removedJoinIds,['ab','bc']);assert.equal(result.next.bundle.layout.revision,1);assert.equal(s.bundle.layout.revision,0);
});

test('new authored recipe updates are embedded and cannot modify a locked shared descriptor indirectly',()=>{
  const r=region('paving'),s=pair(r,r),update=clone(r);update.contentVersion=2;update.interior.variantSeed=99;const v=repairRequest(T,s.bundle,{recipeUpdates:[update]}),result=T.prepareTileRepair(s.bundle,v.request,v.context);assert.equal(result.ok,true);assert.deepEqual(result.changes.replacedIds,['a','b']);assert.equal(T.openTileBundle(JSON.stringify(result.next.bundle),{requireResolved:true}).bundle.recipes[0].interior.variantSeed,99);s.bundle.layout.instances[0].locked=true;const next=repairRequest(T,s.bundle,{recipeUpdates:[update]});assert.equal(T.prepareTileRepair(s.bundle,next.request,next.context).diagnostics[0].code,'LOCK_CONFLICT');
});

test('unknown versions/features, malformed descriptors/accessors and resource bounds refuse without executing caller code',()=>{
  let calls=0;const r=region('safe');Object.defineProperty(r.ports[0],'extra',{enumerable:true,get(){calls++;return 1;}});refused(()=>T.createTileCatalogue([r]),'INVALID_DATA');const list=[];Object.defineProperty(list,0,{enumerable:true,get(){calls++;return region('x');}});refused(()=>T.createTileCatalogue(list),'INVALID_DATA');assert.equal(calls,0);
  const future=region('future');future.features.push('arbitrary-physics');refused(()=>T.compileTileRecipe(future),'UNSUPPORTED_VALUE');const huge=region('huge');huge.interior.skinId='x'.repeat(4000001);refused(()=>T.compileTileRecipe(huge),'SIZE_LIMIT');const sparse=new Array(3);refused(()=>T.createTileCatalogue(sparse),'INVALID_DATA');
  const s=setup(T,[region('paving')]),v=repairRequest(T,s.bundle,{joins:[null]});assert.equal(T.prepareTileRepair(s.bundle,v.request,v.context).ok,false);const b=clone(s.bundle);b.version=2;refused(()=>T.openTileBundle(b),'UNSUPPORTED_BUNDLE');
});

test('kernel imports and deterministic prepare execute without DOM, renderer, IO, game RNG or clock',()=>{
  const child=spawnSync(process.execPath,['--input-type=module','-e',`for(const name of ['window','document','navigator','THREE','fetch','localStorage','performance','setTimeout','setInterval'])Object.defineProperty(globalThis,name,{get(){throw Error(name)}});Math.random=()=>{throw Error('game RNG')};Date.now=()=>{throw Error('clock')};const T=await import('./packages/tiles-core/index.js');const F=await import('./tests/fixtures/procedural-tiles/catalogue.mjs');const r=F.region('headless'),s=F.setup(T,[r]);const v=F.repairRequest(T,s.bundle,{slots:[F.slot('a',['headless'])]});if(!T.prepareTileRepair(s.bundle,v.request,v.context).ok)throw Error('prepare');`],{encoding:'utf8',windowsHide:true,timeout:20000});assert.equal(child.status,0,child.stderr);
  const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.equal(pkg.exports['./tiles'],'./packages/tiles-core/index.js');assert.match(T.tileUsageCard().status,/reviewed/);assert.equal(T.tileUsageCard().entry,'./tiles');
});

test('cross/alongside/transition relations validate measured clearance and accepted geometry rather than tags',()=>{
  const water=region('water',4,2,{channel:'water',material:'border.water'}),bridge=region('bridge',4,2,{channel:'path',material:'border.road'}),bank=region('bank',4,.25,{channel:'kerb'}),s=setup(T,[water,bridge,bank],[put(T,'water',water),put(T,'bridge',bridge,[0,0,3],{floorBindings:{base:'upper'}}),put(T,'bank',bank,[0,2,0])],[],[{id:'over-water',kind:'cross',a:'water',b:'bridge',clearanceM:2.8},{id:'bank-edge',kind:'alongside',a:'water',b:'bank',clearanceM:0}]);assert.equal(T.compileTileLayout(s.layout,s.catalogue).source.relations.length,2);
  const tooLow=clone(s.layout);tooLow.relations[0].clearanceM=3;refused(()=>T.compileTileLayout(tooLow,s.catalogue),'INVALID_CROSSING');const far=clone(s.layout);far.instances[2].origin[1]=3;refused(()=>T.compileTileLayout(far,s.catalogue),'INVALID_ALONGSIDE');const noJoin=clone(s.layout);noJoin.relations=[{id:'fake-transition',kind:'transition',a:'water',b:'bank',clearanceM:0}];refused(()=>T.compileTileLayout(noJoin,s.catalogue),'INVALID_TRANSITION');const colliding=clone(s.layout);colliding.instances[1].origin[2]=0;colliding.instances[1].floorBindings.base='ground';refused(()=>T.compileTileLayout(colliding,s.catalogue),'RESERVATION_CONFLICT');
});

test('repair discovers old/new spatial neighbours, refuses incomplete semantics and reports both removed/new anchors',()=>{
  const r=region('moving'),other=region('neighbour'),s=setup(T,[r,other],[put(T,'moving',r),put(T,'neighbour',other,[10,0,0])]),updated=clone(r);updated.contentVersion=2;updated.anchors=[{id:'new-region',kind:'region',parentId:null}];const v=repairRequest(T,s.bundle,{recipeUpdates:[updated],replaceIds:['moving'],slots:[slot('moving',['moving'],[8,0,0],{anchorIds:['new-region']})]});const bad=T.prepareTileRepair(s.bundle,v.request,v.context);assert.equal(bad.ok,false);assert.ok(bad.diagnostics.some(d=>d.code==='INCOMPLETE_REPAIR'&&d.a==='moving'&&d.b==='neighbour'));
  v.request.joins=[join('new-neighbour','moving','east','neighbour','west')];const result=T.prepareTileRepair(s.bundle,v.request,v.context);assert.equal(result.ok,true);assert.deepEqual(result.changes.affectedIds,['moving','neighbour']);assert.ok(result.changes.removedAnchorIds.includes('moving.region'));assert.ok(result.changes.addedAnchorIds.includes('new-region'));assert.ok(result.changes.anchorsBefore.some(a=>a.instanceId==='moving'&&a.anchorId==='moving.region'));assert.ok(result.changes.anchorsAfter.some(a=>a.instanceId==='moving'&&a.anchorId==='new-region'));assert.ok(result.changes.anchorsBefore.some(a=>a.instanceId==='neighbour'));
  const cancelled=T.prepareTileRepair(s.bundle,v.request,{...v.context,cancelled:true});assert.equal(cancelled.diagnostics[0].code,'CANCELLED');assert.equal(cancelled.work.steps,0);for(const key of ['maxSpatialTests','maxGeometryWork']){const req=clone(v.request);req[key]=1;const exhausted=T.prepareTileRepair(s.bundle,req,v.context);assert.equal(exhausted.ok,false);assert.ok(exhausted.diagnostics[0].code.endsWith('WORK_LIMIT'));}
});

function cellOptions(r,window,maxWork=2000000){return {placement:put(T,'whole-shape',r),floors:[{id:'ground',elevationM:0}],floorId:'ground',channel:'surface',layerId:'ground',boundaryProfile:{id:'whole-shape.edge',version:1},cellSizeM:1,window,borderSegments:4,curveSampling:{...schedule,segmentsPerPart:32,maxChordErrorM:.1,maxSegmentM:1000},maxCells:4096,maxWork,uv:r.ports[0]?.uv||{policy:'world-linear-exact-v1',axes:[[1,0,0],[0,1,0]],scaleM:[1,1],phase:[0,0]}};}
test('one multi-cell authored region produces 1,600 derived cells with shared whole-shape borders beyond the semantic-object limit',()=>{
  const r=region('large-region',400,4);for(const p of r.ports)p.boundary.sampling.maxSegmentM=1000;const result=T.deriveTileCells(r,cellOptions(r,{min:[0,0],max:[400,4]}));assert.equal(result.cells.length,1600);assert.equal(result.source.recipe.id,'large-region');assert.ok(result.work.borderSamples<=65536);assert.ok(result.work.units<=2000000);assert.equal(result.cells[0].edgeIds.east,result.cells[1].edgeIds.west);assert.equal(result.statuses.gameplay.support,'unbound');assert.ok(result.externalInterfaces.length);assert.match(result.tessellationPolicy.mandatoryExternalSamples,/Retain all/);refused(()=>T.deriveTileCells(r,{...cellOptions(r,{min:[0,0],max:[400,4]}),maxCells:128}),'CELL_LIMIT');
});

test('long cubic whole-shape windows share cuts across chunks and interior LOD without baking per-cell recipes',()=>{
  const r=region('long-curve');r.reservations=[];r.shape={kind:'profile-sweep',id:'freeform.path',path:{kind:'cubic',id:'freeform.segment',points:[[0,2,0],[20,10,0],[40,-6,0],[64,2,0]]},widthM:2.75,thicknessM:.12,clip:{min:[0,0,0],max:[64,4,1]}};r.ports=[];const left=T.deriveTileCells(r,cellOptions(r,{min:[0,0],max:[32,4]})),changed=clone(r);changed.interior.detail=64;changed.interior.skinId='skin.alternate';const right=T.deriveTileCells(changed,cellOptions(changed,{min:[32,0],max:[64,4]})),edges=new Map(left.edges.map(e=>[e.worldEdgeId,e]));let common=0;for(const e of right.edges)if(edges.has(e.worldEdgeId)){assert.deepEqual(e,edges.get(e.worldEdgeId));common++;}assert.equal(common,4);assert.equal(left.cells.length+right.cells.length,256);assert.ok(left.cells.some(c=>c.topology.mask!==0&&c.topology.mask!==15));assert.match(left.approximation.policy,/distance-bound/);assert.equal(left.source.recipe.shape.path.points[3][0],64);refused(()=>T.deriveTileCells(r,cellOptions(r,{min:[0,0],max:[32,4]},1)),'DERIVED_WORK_LIMIT');
});

test('small retained host applies mixed-family repair with one atomic undo entry and preserves resources/streams',()=>{assert.equal(runRetainedTileProof(T).status,'pass');});

test('retained context/redo/cancellation fences refuse stale prepares without a write or a second history owner',()=>{
  const yard=mixedYard(T),h=retainedHost(T,yard.bundle);try{yard.request.expected.contextToken=h.context();const plan=h.connection.prepare(yard.request);assert.equal(plan.ok,true);h.state.retained.injury=9;const before=JSON.stringify(h.state);assert.equal(h.connection.apply(plan).committed,false);assert.equal(JSON.stringify(h.state),before);assert.equal(h.writes,0);assert.equal(h.state.undo.length,0);assert.equal(h.state.redo.length,1);assert.throws(()=>h.connection.apply(plan),e=>e.code==='INVALID_PREPARED_TILE_EDIT');
    yard.request.expected.contextToken=h.context();const active=h.connection.prepare(yard.request);h.beforeWrite=()=>h.connection.dispose();assert.equal(h.connection.apply(active).committed,false);assert.equal(h.writes,0);assert.equal(h.candidates.at(-1).canCommit(),false);assert.equal(h.state.redo.length,1);assert.equal(typeof h.services.read,'function');
  }finally{h.connection.dispose();}
});

test('all four structural schema documents reproduce and the actual declared package passes without an overlay',()=>{
  for(const {file,schema}of tileSchemas())assert.equal(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),JSON.stringify(schema,null,2)+'\n');const child=spawnSync(process.execPath,['tools/test-procedural-tiles-package.mjs'],{encoding:'utf8',windowsHide:true,timeout:120000});assert.equal(child.status,0,child.stderr);const installed=JSON.parse(child.stdout);assert.equal(installed.status,'pass');assert.equal(installed.declared,true);assert.equal(installed.proof.declared,true);assert.equal(installed.proof.installedRegistration.schemas.length,4);assert.equal(installed.corrections.tests,11);
});

test('collapsed fields/arcs, cyclic or invalid control anchors and incomplete inspected port subsets refuse explicitly',()=>{
  const r=field('tiny');r.shape.bounds=[0,0,.0000001,1];refused(()=>T.validateTileRecipe(r),'COLLAPSED_FIELD');const arc={kind:'arc',id:'tiny-arc',center:[0,0],radius:1,startRad:0,sweepRad:1e-12,h0:0,h1:0};refused(()=>T.sampleTileCurve(arc,{sampling:schedule,transform:transforms[0],origin:[0,0,0]}),'COLLAPSED_CURVE');const cyclic=region('cycle');cyclic.anchors=[{id:'a',kind:'path',parentId:'b'},{id:'b',kind:'path',parentId:'a'}];refused(()=>T.validateTileRecipe(cyclic),'ANCHOR_CYCLE');
  const missing=region('bad-control');missing.anchors.push({id:'node',kind:'node',parentId:missing.anchors[0].id,controlIndex:3});refused(()=>T.validateTileRecipe(missing),'UNKNOWN_ANCHOR_CONTROL');const s=pair(),j=clone(s.layout.joins[0]);j.a.portIds=['east','missing'];refused(()=>T.matchTileInterfaces(s.layout,s.catalogue,j),'UNKNOWN_JOIN_PORT');
});

test('cubic interpolation bounds cover dense independent Bezier samples and position quantization separately',()=>{
  const points=[[0,0,0],[1.1,2,.3],[2.2,-1,.6],[4.5,.25,1]],curve={kind:'cubic',id:'bounded',points},n=32,s=T.sampleTileCurve(curve,{sampling:{segmentsPerPart:n,maxChordErrorM:.1,maxSegmentM:1,maxWork:100},transform:transforms[0],origin:[0,0,0]});for(let i=0;i<1000;i++){const t=i/999,u=1-t,exact=[0,1,2].map(k=>u*u*u*points[0][k]+3*u*u*t*points[1][k]+3*u*t*t*points[2][k]+t*t*t*points[3][k]),segment=Math.min(n-1,Math.floor(t*n)),f=t*n-segment,p=s.positionsM[segment].map((v,k)=>v+(s.positionsM[segment+1][k]-v)*f);assert.ok(Math.hypot(...exact.map((v,k)=>v-p[k]))<=s.errorBoundM+1e-12);}
});

test('retained unknown acknowledgements close the write lease and never reinterpret a committed host write as a rollback',()=>{
  for(const mode of ['before','after','retire-after']){const yard=mixedYard(T),h=retainedHost(T,yard.bundle);try{yard.request.expected.contextToken=h.context();const plan=h.connection.prepare(yard.request);if(mode==='before')h.beforeWrite=()=>{throw Error('before write');};else if(mode==='after')h.afterWrite=()=>{throw Error('lost acknowledgement');};else h.afterWrite=()=>h.connection.dispose();const result=h.connection.apply(plan);assert.equal(result.committed,mode==='retire-after'?true:null);assert.equal(h.writes,mode==='before'?0:1);assert.equal(h.state.undo.length,mode==='before'?0:1);assert.equal(h.candidates[0].canCommit(),false);assert.equal(h.state.retained.injury,13);}finally{h.connection.dispose();}}
  const s=pair();refused(()=>T.compileTileLayout(s.layout,s.catalogue,{maxWork:1}),'LAYOUT_WORK_LIMIT');
});

test('shared whole-field corners agree even without an edge join and derived windows cannot invent floor bindings',()=>{
  const a=field('corner-a',15),b=field('corner-b',15),s=setup(T,[a,b],[put(T,'a',a),put(T,'b',b,[1,1,0])]);assert.equal(T.compileTileLayout(s.layout,s.catalogue).instances.length,2);b.shape.values[0]=-1;for(const p of b.ports)p.boundary.normal.field=clone(b.shape);const bad=setup(T,[a,b],[put(T,'a',a),put(T,'b',b,[1,1,0])]);refused(()=>T.compileTileLayout(bad.layout,bad.catalogue),'SHARED_CORNER_MISMATCH');
  const wrong=field('wrong-source');wrong.ports[0].boundary.normal.field.paint[0]=.75;refused(()=>T.validateTileRecipe(wrong),'FIELD_SOURCE_MISMATCH');const r=region('floor-window'),options=cellOptions(r,{min:[0,0],max:[2,2]});options.floors.push({id:'unbound',elevationM:0});options.floorId='unbound';refused(()=>T.deriveTileCells(r,options),'MISSING_FLOOR_BINDING');
});
