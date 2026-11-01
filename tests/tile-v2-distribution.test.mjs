import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tileV2Schemas} from '../tools/tile-v2-schemas.mjs';
import {checkTileV2} from '../tools/check-tile-v2.mjs';
test('four provisional v2 schemas reproduce while the actual root package remains the accepted v1 API',()=>{
  for(const {file,schema}of tileV2Schemas())assert.equal(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),JSON.stringify(schema,null,2)+'\n');const check=checkTileV2();assert.equal(check.declared,false);assert.equal(check.unchangedV1Files,18);assert.equal(check.runtime.length,20);const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));assert.equal(pkg.exports['./tiles'],'./packages/tiles-core/index.js');assert.equal(pkg.files.includes('packages/tiles-core/candidate-v2.js'),false);
});
test('candidate package tool refuses undeclared availability by default before offline staging',()=>{
  const child=spawnSync(process.execPath,['tools/test-tile-v2-package.mjs'],{encoding:'utf8',windowsHide:true,timeout:20000});assert.notEqual(child.status,0);assert.match(child.stderr,/TILE_V2_REGISTRATION_PENDING/);assert.doesNotMatch(child.stdout,/status.*pass/);
});
