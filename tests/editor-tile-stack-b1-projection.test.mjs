import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {actual,documentFixture,harness,saved,catalogueFor} from './fixtures/tile-stack-editor/b1.mjs';
import {smartTileDigest} from '../apps/editor/smart-tile/checkpoint.js';

for(const profileId of ['aft-native-fifteen','nonuniform-fifteen'])test('B1 snapshot preserves complete workspace identity and typed floor origins: '+profileId,async t=>{
  const document=documentFixture(profileId),h=await harness({document});
  t.after(()=>{h.session.dispose();assert.equal(h.session.getSnapshot().resources.roots,0);});
  const before=saved(h),s=h.session.getSnapshot(),floorBinding=document.floorBinding;
  const expected={id:document.id,checkpointVersion:2,policyToken:h.binding.domain.bindingToken,
    floorTableId:floorBinding.id,floorTableToken:smartTileDigest(floorBinding),floorProfile:floorBinding.profile,
    sourceSha256:createHash('sha256').update(document.sourceJSON).digest('hex'),finishBinding:document.finishBinding,
    sourceDocumentDigest:smartTileDigest(document),sourceConstraintsDigest:actual.tiles.tileLayoutToken(document.constraints),
    floorProfileDigest:actual.tiles.tileLayoutToken({id:floorBinding.profile.id,version:floorBinding.profile.version,floors:document.tileBundle.layout.floors})};
  assert.deepEqual(s.workspace,expected);
  assert.deepEqual(s.finishCatalogue,catalogueFor(document));
  assert.deepEqual(s.floors,floorBinding.floors);
  assert.deepEqual(s.floors.map(f=>f.source),[{kind:'legacy-layer',layerIndex:0},{kind:'legacy-layer',layerIndex:1},{kind:'legacy-layer',layerIndex:2},...Array.from({length:12},()=>({kind:'authored-tile'}))]);
  const controllerRows=s.floors.map(({id,label,elevationM})=>({id,label,elevationM}));
  assert.deepEqual(controllerRows,h.floors.state.floors);
  assert.deepEqual(controllerRows,h.binding.domain.floorRecords);
  assert.ok(h.floors.state.floors.every(f=>!Object.hasOwn(f,'source')));
  // Observer copies cannot replace the immutable authority or borrowed rows.
  s.floors[0].source.layerIndex=99;s.workspace.floorProfile.id='observer-copy';s.workspace.finishBinding.digest='f'.repeat(64);
  assert.deepEqual(h.session.getSnapshot().workspace,expected);
  assert.deepEqual(h.session.getSnapshot().floors,floorBinding.floors);
  h.floors.select('F14');const selected=h.session.getSnapshot();
  assert.deepEqual(selected.workspace,expected);assert.deepEqual(selected.floors,floorBinding.floors);
  assert.deepEqual(selected.floor,{...controllerRows[14],mode:h.floors.state.mode});
  assert.deepEqual(saved(h),before);assert.deepEqual(h.counts,{prepare:0,apply:0});assert.deepEqual(h.writes,[]);
});
