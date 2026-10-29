import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {distribution} from '../tools/distribution.mjs';

test('bear usage card is discoverable and packaged, with complete syntactically valid public-import examples',()=>{
  const guide=fs.readFileSync(new URL('../docs/bear-handoff.md',import.meta.url),'utf8'),entry=fs.readFileSync(new URL('../docs/bear-provider.md',import.meta.url),'utf8');assert.match(entry,/\[Bear and appearance handoff\]\(bear-handoff\.md\)/);
  for(const profile of ['core','renderer','compatibility'])assert.ok(distribution(profile).files.includes('docs/bear-handoff.md'),profile+' usage card');
  for(const name of ['appearance','bear-view']){const example=guide.match(new RegExp('<!-- example:'+name+' -->\\s*```js\\s*([\\s\\S]*?)```'))?.[1];assert.ok(example);assert.match(example,/from '@nautilus-engine\/(core|map-core)/);assert.ok(!example.includes('/vendor/')&&!example.includes('donor'));const checked=spawnSync(process.execPath,['--input-type=module','--check'],{input:example,encoding:'utf8',windowsHide:true});assert.equal(checked.status,0,checked.stderr);}
  assert.match(guide,/\[x\]/);assert.match(guide,/\[ \]/);assert.match(guide,/ef62d12662535389e7d0bed74f16370c9983712f/);assert.match(guide,/1c2b94c0cf0c86947c4e5f3da78c7d2d8404ea66/);
});
