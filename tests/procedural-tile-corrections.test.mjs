import test from 'node:test';
import assert from 'node:assert/strict';
import {clone,transforms,line,region,field,put,join,setup,repairRequest,slot} from './fixtures/procedural-tiles/catalogue.mjs';
const T=await import(process.env.NAUTILUS_TILE_PROOF_PACKAGE?process.env.NAUTILUS_TILE_PROOF_PACKAGE+'/tiles':'../packages/tiles-core/index.js');

const refused=(fn,code)=>assert.throws(fn,e=>e.code===code,code);
const rotate=(v,t)=>{let [x,y,h]=v;if(t.mirrorX)x=-x;for(let i=0;i<t.quarterTurns;i++)[x,y]=[-y,x];return [x||0,y||0,h||0];};
const clean=v=>Object.is(v,-0)?0:v;
const unsupported=[[1,-1000,1,-1000],[.000000001,-1,.000000001,-1],[1,-2,3,-4],[0,-1,0,-1],[-1000000,1,-.001,1],[-1,0,-1,0]];

test('unsupported ambiguous field conditioning refuses evaluation, topology, recipes, normal fields and bundle loads without changing input',()=>{
  for(const values of unsupported)for(const saddle of ['connect-positive','connect-negative']){
    const r=field('unsupported',5);Object.assign(r.shape,{values:clone(values),fieldAmplitude:0,heightAmplitudeM:0,saddle});for(const p of r.ports)p.boundary.normal.field=clone(r.shape);const before=JSON.stringify(r);
    refused(()=>T.sampleTileField(r.shape,.5,.5),'UNSUPPORTED_FIELD_CONDITIONING');
    for(const transform of transforms)for(const complement of [false,true])refused(()=>T.tileFieldTopology(r.shape,{transform,complement}),'UNSUPPORTED_FIELD_CONDITIONING');
    refused(()=>T.compileTileRecipe(r),'UNSUPPORTED_FIELD_CONDITIONING');
    const ordinary=region('normal');ordinary.ports[0].boundary.normal={kind:'field-cell',field:clone(r.shape)};refused(()=>T.validateTileRecipe(ordinary),'UNSUPPORTED_FIELD_CONDITIONING');
    const original=field('unsupported',5),s=setup(T,[original]);s.bundle.recipes[0]=clone(r);refused(()=>T.openTileBundle(s.bundle),'UNSUPPORTED_FIELD_CONDITIONING');assert.equal(JSON.stringify(r),before);
  }
  // This is the reported false-connectivity counterexample: an entire barrier
  // cuts off a positive corner even though the old centre-only bias was positive.
  const smooth=t=>t*t*(3-2*t),base=(u,v)=>1-1001*(smooth(u)+smooth(v)-2*smooth(u)*smooth(v));
  for(let i=0;i<=128;i++){const t=.05*i/128,fade=256*.05**2*.95**2*t*t*(1-t)**2;assert.ok(base(.05,t)+1500.5*fade < -4.301783394);}
});

test('binary checkerboard chosen diagonals are full signed paths and separating barriers with bounded nonzero variation, D4 and complement',()=>{
  const corners=[[0,0],[1,0],[1,1],[0,1]],smooth=t=>t*t*(3-2*t);
  for(const mask of [5,10])for(const saddle of ['connect-positive','connect-negative'])for(const amplitude of [-1000,-.34,0,.34,1000])for(const seed of [0,1,4294967295]){
    const s=field('path',mask,seed).shape;Object.assign(s,{saddle,fieldAmplitude:amplitude});
    for(const transform of transforms)for(const complement of [false,true]){
      const top=T.tileFieldTopology(s,{transform,complement}),m={...s,values:top.cornerSources.map(i=>clean(complement?-s.values[i]:s.values[i])),saddle:top.saddle},sign=top.saddle==='connect-positive'?1:-1,[a,b]=top.diagonal.map(i=>corners[i]);
      // On either selected diagonal the independent bilinear term is sign*(1-2S(t))^2.
      // The bubble coefficient has signed magnitude >=2 even at |amplitude|=1000.
      // The strict sign path joins opposite corners and separates the other two.
      for(let i=0;i<=32;i++){const t=i/32,u=a[0]+(b[0]-a[0])*t,v=a[1]+(b[1]-a[1])*t,f=T.sampleTileField(m,u,v),bilinear=sign*(1-2*smooth(t))**2,fade=256*u*u*(1-u)**2*v*v*(1-v)**2;assert.ok(sign*f.value>0);assert.ok(sign*f.value>=sign*bilinear+2*fade-1e-10);}
      const other=[0,1,2,3].filter(i=>!top.diagonal.includes(i));for(const i of other)assert.ok(sign*T.sampleTileField(m,...corners[i]).value<0);assert.equal(top.cornerPositiveComponents,sign===1?1:2);assert.equal(top.cornerNegativeComponents,sign===1?2:1);
    }
  }
});

test('general non-checkerboards remain exact, while complement revalidates zero-positive conditioning and cleans only derived negative zero',()=>{
  for(const values of [[1,-1000,-.001,7],[0,1,0,1],[0,0,0,0]]){
    const s=field('general').shape;s.values=values;const before=JSON.stringify(s);for(let i=0;i<4;i++)assert.equal(T.sampleTileField(s,...[[0,0],[1,0],[1,1],[0,1]][i]).value,values[i]);
    for(const transform of transforms){assert.equal(T.tileFieldTopology(s,{transform,complement:false}).ambiguous,false);if(values[1]===1)refused(()=>T.tileFieldTopology(s,{transform,complement:true}),'UNSUPPORTED_FIELD_CONDITIONING');else assert.equal(T.tileFieldTopology(s,{transform,complement:true}).ambiguous,false);}
    assert.equal(JSON.stringify(s),before);
  }
});

function compound(reverse=false){const c={kind:'compound',id:'gap',segments:[line('left',[-1,0,0],[0,0,0]),line('right',[.0000004,0,0],[1,0,0])]};return reverse?{...c,segments:c.segments.reverse().map(s=>({...s,a:s.b,b:s.a}))}:c;}
const curveOptions=(transform=transforms[0],origin=[0,0,0],maxChordErrorM=.00001)=>({sampling:{segmentsPerPart:1,maxChordErrorM,maxSegmentM:3,maxWork:100},transform,origin});
test('q-coincident compound gaps fail tiny error budgets in both orders and every D4 orientation',()=>{
  for(const reverse of [false,true])for(const transform of transforms)for(const origin of [[0,0,0],[.0000003,-.0000002,.0000001]]){const c=compound(reverse),before=JSON.stringify(c);refused(()=>T.sampleTileCurve(c,curveOptions(transform,origin,1e-12)),'CHORD_ERROR_LIMIT');assert.equal(JSON.stringify(c),before);}
});

test('compound total error covers independent interpolation on both sides of junctions and translated grid phases, with charged work',()=>{
  for(const reverse of [false,true])for(const transform of transforms)for(const origin of [[0,0,0],[.0000003,-.0000002,.0000001]]){
    const c=compound(reverse),options=curveOptions(transform,origin),s=T.sampleTileCurve(c,options);assert.equal(s.workUnits,7);assert.ok(s.errorBoundM>0);assert.ok(s.compoundJunctionDeviationBoundM>=0);assert.equal(s.errorBoundM,s.analyticErrorBoundM+Math.max(s.positionQuantizationBoundM,s.compoundJunctionDeviationBoundM));
    let measured=0;for(const t of [0,.4999999,.5,.5000001,...Array.from({length:1001},(_,i)=>i/1000)]){const part=Math.min(1,Math.floor(t*2)),u=t*2-part,raw=c.segments[part].a.map((v,k)=>v+(c.segments[part].b[k]-v)*u),exact=rotate(raw,transform).map((v,k)=>v+origin[k]),node=Math.min(1,Math.floor(t*2)),f=t*2-node,p=s.positionsM[node].map((v,k)=>v+(s.positionsM[node+1][k]-v)*f),error=Math.hypot(...exact.map((v,k)=>v-p[k]));measured=Math.max(measured,error);assert.ok(error<=s.errorBoundM+2e-16);}
    assert.ok(measured>0);refused(()=>T.sampleTileCurve(c,{...options,sampling:{...options.sampling,maxWork:6}}),'CURVE_WORK_LIMIT');
  }
  const r=region('compound-work');r.ports=r.ports.slice(0,1);r.ports[0].boundary.curve={kind:'compound',id:'edge',segments:[line('one',[0,0,0],[1,0,0]),line('two',[1,0,0],[2,0,0])]};r.ports[0].boundary.sampling={...curveOptions().sampling,maxChordErrorM:.001};const s=setup(T,[r],[put(T,'r',r)]);assert.equal(T.compileTileLayout(s.layout,s.catalogue).workUnits,18);refused(()=>T.compileTileLayout(s.layout,s.catalogue,{maxWork:17}),'LAYOUT_WORK_LIMIT');
});

const prepare=(s,options={})=>{const v=repairRequest(T,s.bundle,options);return T.prepareTileRepair(s.bundle,v.request,v.context);};
const incomplete=(result,a='a',b='b')=>{assert.equal(result.ok,false,JSON.stringify({diagnostics:result.diagnostics,changes:result.changes}));assert.equal(result.next,null);assert.ok(result.diagnostics.some(d=>d.code==='INCOMPLETE_REPAIR'&&d.a===a&&d.b===b),JSON.stringify(result.diagnostics));assert.ok(result.diagnostics.some(d=>d.affectedIds?.includes(a)&&d.affectedIds.includes(b)));};

test('an old contact cannot waive a different side, rotation, shape, exact placement or height/floor contact',()=>{
  const r=region('touch');for(const oldOrigin of [[2,0,0],[10,0,0]]){const s=setup(T,[r],[put(T,'a',r),put(T,'b',r,oldOrigin)]),before=JSON.stringify(s.bundle);incomplete(prepare(s,{replaceIds:['b'],slots:[slot('b',[r.id],[0,2,0])]}));assert.equal(JSON.stringify(s.bundle),before);}
  const s=setup(T,[r],[put(T,'a',r),put(T,'b',r,[2,0,0])]);
  incomplete(prepare(s,{replaceIds:['b'],slots:[slot('b',[r.id],[4,2,0],{alternatives:[{recipeId:r.id,transform:transforms[2]}]})]}));
  const shape=clone(r);shape.contentVersion=2;shape.shape.outlines[0].segments[0].b[0]=1.9;shape.shape.outlines[0].segments[1].a[0]=1.9;incomplete(prepare(s,{recipeUpdates:[shape]}));
  incomplete(prepare(s,{replaceIds:['b'],slots:[slot('b',[r.id],[2.0000001,0,0])]}));
  const tall=region('tall',2,2,{thickness:5}),high=setup(T,[tall,r],[put(T,'a',tall),put(T,'b',r,[2,0,0])]);incomplete(prepare(high,{replaceIds:['b'],slots:[slot('b',[r.id],[2,0,3],{floorBindings:{base:'upper'}})]}));
  s.bundle.layout.floors.push({id:'other',elevationM:0});incomplete(prepare(s,{replaceIds:['b'],slots:[slot('b',[r.id],[2,0,0],{floorBindings:{base:'other'}})]}));
});

test('unchanged and cosmetic-only old contacts survive, locks remain fixed, and old/new locations both enter closure',()=>{
  const r=region('retained'),s=setup(T,[r],[put(T,'a',r,[0,0,0],{locked:true}),put(T,'b',r,[2,0,0])]);const unchanged=prepare(s,{replaceIds:['b'],slots:[slot('b',[r.id],[2,0,0])]});assert.equal(unchanged.ok,true,JSON.stringify(unchanged.diagnostics));assert.deepEqual(unchanged.changes.affectedIds,['a','b']);assert.equal(unchanged.next.bundle.layout.instances[0].locked,true);
  const u=region('cosmetic'),c=setup(T,[u],[put(T,'a',u),put(T,'b',u,[2,0,0])]),updated=clone(u);updated.contentVersion=2;updated.interior={variantSeed:99,detail:12,skinId:'skin.changed'};updated.anchors.push({id:'extra-region',kind:'region',parentId:null});const cosmetic=prepare(c,{recipeUpdates:[updated]});assert.equal(cosmetic.ok,true,JSON.stringify(cosmetic.diagnostics));assert.deepEqual(cosmetic.changes.affectedIds,['a','b']);
  const oldNew=setup(T,[r],[put(T,'a',r),put(T,'b',r,[2,0,0]),put(T,'c',r,[2,4,0])]),moved=prepare(oldNew,{replaceIds:['b'],slots:[slot('b',[r.id],[2,2,0])],joins:[join('new','b','south','c','north')]});assert.equal(moved.ok,true,JSON.stringify(moved.diagnostics));assert.deepEqual(moved.changes.affectedIds,['a','b','c']);
});

function extraContacts(kind){
  const a=region('one'),b=region('two');b.reservations.push({...clone(b.reservations[0]),id:'second',min:[10,2,0],max:[12,4,.1]});const s=setup(T,[a,b],[put(T,'a',a),put(T,'b',b,[2,0,0])],[join('existing','a','east','b','west')]),update=clone(a);update.contentVersion=2;update.reservations.push({...clone(a.reservations[0]),id:'new',min:kind==='alongside'?[12,0,0]:[10,2,0],max:kind==='alongside'?[14,2,.1]:[12,4,.1]});return {s,update};
}
test('one unchanged join or transition does not waive an additional unrelated contact of the same instance pair',()=>{
  for(const relation of [false,true]){const {s,update}=extraContacts('join');incomplete(prepare(s,{recipeUpdates:[update],relations:relation?[{id:'transition',kind:'transition',a:'a',b:'b',clearanceM:0}]:[]}));}
});

test('measured cross and alongside relations cover only the reservation contacts that actually satisfy them',()=>{
  const {s,update}=extraContacts('alongside');const alongside={id:'alongside',kind:'alongside',a:'a',b:'b',clearanceM:0};const accepted=prepare(s,{recipeUpdates:[update],relations:[alongside]});assert.equal(accepted.ok,true,JSON.stringify(accepted.diagnostics));
  const far=clone(update);far.reservations.at(-1).max[1]=1.75;incomplete(prepare(s,{recipeUpdates:[far],relations:[alongside],neighbourRadiusM:.25}));
  const lower=region('lower'),upper=region('upper');const c=setup(T,[lower,upper],[put(T,'a',lower),put(T,'b',upper,[10,0,3],{floorBindings:{base:'upper'}})]),lo=clone(lower),up=clone(upper);lo.contentVersion=up.contentVersion=2;lo.reservations.push({...clone(lo.reservations[0]),id:'second',min:[10,2,0],max:[12,4,.1]});up.reservations.push({...clone(up.reservations[0]),id:'second',min:[10,2,0],max:[12,4,.1]});const cross={id:'cross',kind:'cross',a:'a',b:'b',clearanceM:2.5};const changed={recipeUpdates:[lo,up],replaceIds:['b'],slots:[slot('b',[upper.id],[0,0,3],{floorBindings:{base:'upper'}})],relations:[cross]};assert.equal(prepare(c,changed).ok,true);
  // The old pair-wide cross waiver ignored a second near side contact at zero
  // vertical clearance; compile validates only XY-overlapping crossing pairs.
  up.reservations.at(-1).min=[12,2,-3];up.reservations.at(-1).max=[14,4,-2.9];incomplete(prepare(c,changed));
});

test('new contact proof uses finite joined span and thickness plus the actual reservation floor, channel and layer',()=>{
  for(const kind of ['short','thin','floor','channel','layer']){
    const a=region('finite-a'),b=region('finite-b');
    if(kind==='short')for(const p of [a.ports[1],b.ports[3]]){p.boundary.curve.a[1]=.5;p.boundary.curve.b[1]=1.5;p.widthM=1;}
    if(kind==='thin')for(const p of [a.ports[1],b.ports[3]])p.thicknessM=.05;
    if(kind==='channel')b.reservations[0].channel='different-channel';if(kind==='layer')b.reservations[0].layerId='different-layer';if(kind==='floor')b.reservations[0].floorSlot='other-slot';
    const s=setup(T,[a,b]),bindings=kind==='floor'?{base:'ground','other-slot':'other-zero'}:{base:'ground'};s.layout.floors.push({id:'other-zero',elevationM:0});s.bundle=T.tileBundle(s.layout,s.catalogue);
    const actual=join('actual','a','east','b','west'),layout={...clone(s.layout),instances:[put(T,'a',a),put(T,'b',b,[2,0,0],{floorBindings:bindings})],joins:[actual]};assert.equal(T.compileTileLayout(layout,s.catalogue).joins.length,1,'compiled interface remains valid: '+kind);
    const result=prepare(s,{slots:[slot('a',[a.id]),slot('b',[b.id],[2,0,0],{floorBindings:bindings})],joins:[actual]});incomplete(result);const diagnostic=result.diagnostics.find(d=>d.code==='INCOMPLETE_REPAIR');assert.match(diagnostic.automaticJoinCoverage,/finite width and vertical thickness/);assert.equal(diagnostic.reservations.length,2);assert.ok(diagnostic.reservations.every(r=>r.floorId&&r.channel&&r.layerId));
  }
  const r=region('d4-covered');for(const transform of transforms){const s=setup(T,[r]),result=prepare(s,{slots:[slot('a',[r.id],[0,0,0],{alternatives:[{recipeId:r.id,transform}]}),slot('b',[r.id],rotate([2,0,0],transform),{alternatives:[{recipeId:r.id,transform}]})],joins:[join('covered','a','east','b','west')]});assert.equal(result.ok,true,JSON.stringify(result.diagnostics));}
});

test('a valid curved compiled join is preserved and gives an actionable unsupported contact-proof refusal until a measured relation covers it',()=>{
  const a=region('curved-a'),b=region('curved-b');for(const [p,x]of [[a.ports[1],2],[b.ports[3],0]]){p.boundary.curve={kind:'cubic',id:'graded-border',points:[[x,0,0],[x,2/3,.1],[x,4/3,-.1],[x,2,0]]};p.tangent=[0,2,.3].map(v=>v/Math.hypot(2,.3));}
  const s=setup(T,[a,b]),before=JSON.stringify(s.bundle),actual=join('curved','a','east','b','west'),layout={...clone(s.layout),instances:[put(T,'a',a),put(T,'b',b,[2,0,0])],joins:[actual]};assert.equal(T.compileTileLayout(layout,s.catalogue).joins.length,1);
  const request={slots:[slot('a',[a.id]),slot('b',[b.id],[2,0,0])],joins:[actual]},unsupported=prepare(s,request);incomplete(unsupported);assert.match(unsupported.diagnostics.find(d=>d.code==='INCOMPLETE_REPAIR').automaticJoinCoverage,/remain valid authored\/compiled joins/);
  const measured=prepare(s,{...request,relations:[{id:'measured-contact',kind:'alongside',a:'a',b:'b',clearanceM:0}]});assert.equal(measured.ok,true,JSON.stringify(measured.diagnostics));assert.deepEqual(measured.next.bundle.recipes.find(r=>r.id===a.id).ports[1].boundary.curve,a.ports[1].boundary.curve);assert.equal(JSON.stringify(s.bundle),before);
});
