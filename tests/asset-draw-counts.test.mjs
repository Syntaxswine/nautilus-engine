import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assetDrawCounts,ASSET_DRAW_COUNTS} from '../tools/asset-draw-counts.mjs';

test('the editor asset layers issue exactly the pinned draws for every benchmark workload and view',async()=>{
  const pinned=JSON.parse(fs.readFileSync(ASSET_DRAW_COUNTS,'utf8')),counts=await assetDrawCounts();
  assert.deepEqual(counts.views,pinned.views);
  for(const id of Object.keys({...pinned.workloads,...counts.workloads}))
    assert.deepEqual(counts.workloads[id],pinned.workloads[id],id+' changed: re-pin with node tools/asset-draw-counts.mjs --write only as part of a reviewed change');
});
