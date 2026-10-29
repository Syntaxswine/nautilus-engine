import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {checkBear} from '../tools/check-bear.mjs';
import {distribution,moduleClosure} from '../tools/distribution.mjs';
import {bearResources,BEAR_SOURCE} from '../packages/actors-bear/index.js';
test('bear snapshot/dynamic resources/notices and exact execution adaptations retain immutable source hashes',()=>{
  const report=checkBear();assert.equal(report.files,72);assert.equal(report.adaptations,54);const run=spawnSync(process.execPath,['tools/adapt-bear.mjs'],{encoding:'utf8',windowsHide:true});assert.equal(run.status,0,run.stderr);
  const manifest=JSON.parse(fs.readFileSync(new URL('../vendor/aft-bear/'+BEAR_SOURCE.commit+'/provenance.json',import.meta.url)));for(const resource of bearResources()){const source=manifest.files.find(file=>file.path===resource.path);assert.ok(source);assert.equal(fs.statSync(new URL(resource.url)).size,source.bytes);}
});
test('optional installed profiles include every dynamically resolved bear file while core discovery stays renderer-free',()=>{
  const core=distribution('core'),renderer=distribution('renderer'),compatibility=distribution();assert.ok(!core.files.some(file=>file.startsWith('packages/actors-bear/adapted/')));assert.ok(!core.exports['./actors/bear/three']);assert.ok(core.exports['./appearance']);assert.ok(core.exports['./actors/bear']);
  for(const profile of [renderer,compatibility])for(const resource of bearResources())assert.ok(profile.files.includes('vendor/aft-bear/'+BEAR_SOURCE.commit+'/'+resource.path));
  const execution=moduleClosure(['./packages/actors-bear/provider.js']);assert.ok(!execution.some(file=>file.includes('/animal-prone-motion.js')));assert.ok(!execution.some(file=>file.includes('/hybrid-world.js')||file.includes('/core/engine.js')));assert.equal(execution.filter(file=>file.endsWith('/three.module.js')).length,1);assert.ok(execution.some(file=>file.includes('781246a668c723d5a4c5463e70534cc04b6a5641')));
});
test('retained bear WebGL evidence matches current runtime hashes, all selections and saved capture bytes',()=>{
  const read=relative=>fs.readFileSync(new URL('../'+relative,import.meta.url)),sha=bytes=>createHash('sha256').update(bytes).digest('hex'),report=JSON.parse(read('docs/reviews/bear/webgl-acceptance.json'));
  assert.equal(report.source,BEAR_SOURCE.commit);assert.equal(report.cases.length,26);assert.equal(new Set(report.cases.map(row=>row.outfit+'/'+row.weapon)).size,26);assert.equal(report.checks.sourcePackagePixels,true);assert.equal(report.resourceErrors,0);assert.equal(report.consoleErrors,0);
  for(const [file,digest]of Object.entries(report.runtimeHashes))assert.equal(sha(read(file)),digest,file+' must be visually reviewed after a runtime change');
  for(const capture of report.captures.filter(item=>item.retained)){const bytes=read('docs/reviews/bear/'+capture.path);assert.equal(bytes.length,capture.bytes);assert.equal(sha(bytes),capture.sha256,capture.file);}
  assert.equal(report.checks.transformedPlacement.contacts.length,2);assert.ok(report.checks.transformedPlacement.contacts.every(contact=>contact.error<1e-6));assert.equal(report.checks.finalSource.ownedResources,0);assert.equal(report.checks.finalInstalled.ownedResources,0);
});
