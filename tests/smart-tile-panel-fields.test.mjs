import test from 'node:test';
import assert from 'node:assert/strict';
import {smartTileDraftFromFields,smartTileFormValues} from '../apps/editor/smart-tile/panel-fields.js';
import {mountSmartTilePanel} from '../apps/editor/smart-tile/panel.js';
const edit=(draft,patch={})=>smartTileDraftFromFields(draft.tool,{...smartTileFormValues(draft),...patch},draft,draft.ownerId);
test('panel is importable without a DOM and has no authority at module load',()=>assert.equal(typeof mountSmartTilePanel,'function'));
test('rectangle numeric edits preserve exact origin, owner and saved uint32 seed without mutating input',()=>{
  const draft={tool:'rectangle',ownerId:'owner-a',origin:[.12345678901234567,-9.876543210987654],widthM:8.123456789012345,depthM:4,seed:4294967295};
  const before=structuredClone(draft),result=edit(draft,{depthM:'4.125'});
  assert.deepEqual(result,{...draft,depthM:4.125});assert.deepEqual(draft,before);
});
test('line fields preserve original identity and all height controls for host validation',()=>{
  const draft={tool:'path',ownerId:'owner-line',origin:[13.2,-7.8],widthM:2,seed:379,path:{kind:'line',id:'original-line',a:[.12345678901234567,0,.375],b:[8,2,.625]}};
  const result=edit(draft,{bx:'9.000000000000002'});assert.deepEqual(result,{...draft,path:{...draft.path,b:[9.000000000000002,2,.625]}});
});
test('arc numeric radius edits retain original radian sweep, endpoints heights, ID and seed',()=>{
  const draft={tool:'path',ownerId:null,origin:[1,2],widthM:1.5,seed:928,path:{kind:'arc',id:'native-arc',center:[2.1234567890123,7.8],radius:4,startRad:.12345678901234567,sweepRad:1.2345678901234567,h0:.25,h1:.5}};
  assert.deepEqual(edit(draft,{radius:'5.125'}),{...draft,path:{...draft.path,radius:5.125}});
});
test('cubic field editing retains original unsampled controls and per-control heights',()=>{
  const draft={tool:'path',ownerId:'curve-owner',origin:[0,0],widthM:2,seed:67108863,path:{kind:'cubic',id:'saved-cubic',points:[[0,0,.1],[2.123456789012345,0,.2],[5,4,.3],[8,4,.4]]}};
  const expected=structuredClone(draft);expected.path.points[2][0]=6.123456789012345;
  assert.deepEqual(edit(draft,{p2x:'6.123456789012345'}),expected);
});
test('whole-owner finish emits only closed finish intent and retains explicit skin identity',()=>{
  assert.deepEqual(smartTileDraftFromFields('finish',{skinId:'paint.exact-v2'},null,'whole-owner'),{tool:'finish',ownerId:'whole-owner',skinId:'paint.exact-v2'});
  assert.throws(()=>smartTileDraftFromFields('finish',{skinId:'paint'},null,null),/Select a whole owner/);
});
test('empty, nonfinite, nonpositive and fractional/out-of-range seed fields refuse without getter coercion',()=>{
  const draft={tool:'rectangle',ownerId:null,origin:[0,0],widthM:8,depthM:4,seed:0};
  for(const patch of [{widthM:''},{widthM:Infinity},{depthM:0},{seed:1.5},{seed:4294967296}])assert.throws(()=>edit(draft,patch));
  let invoked=0;assert.throws(()=>edit(draft,{widthM:{valueOf(){invoked++;return 2;}}}));assert.equal(invoked,0);
});
test('unsupported original curves and height-flattening type changes refuse instead of approximating',()=>{
  const compound={tool:'path',ownerId:null,origin:[0,0],widthM:2,seed:1,path:{kind:'compound',id:'keep-source',segments:[]}};
  assert.throws(()=>edit(compound),/cannot edit compound/);
  const raised={...compound,path:{kind:'line',id:'keep-height',a:[0,0,2],b:[5,0,2]}};
  assert.throws(()=>edit(raised,{curveKind:'arc'}),/cannot flatten saved height/);
});
