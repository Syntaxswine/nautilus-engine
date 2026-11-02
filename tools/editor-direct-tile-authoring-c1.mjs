// Actual Core/retained host/native CPU flow. Synthetic atlas, no DOM/WebGL or
// installed-package claim. Preserved finite entry for the early authority review.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {harness,library,applyCommand,placeBody,upgradeBody} from '../tests/fixtures/tile-authoring-editor/c1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),file=path.join(root,'artifacts/editor-tile-authoring-current-direct.jsonl');fs.mkdirSync(path.dirname(file),{recursive:true});
const log=value=>fs.appendFileSync(file,JSON.stringify({at:new Date().toISOString(),...value})+'\n');let host;
log({stage:'start',pid:process.pid,executable:process.execPath,purpose:'finite C1 six-command native CPU/source authority review',source:'tools/editor-direct-tile-authoring-c1.mjs'});
try{
  host=await harness();const original=host.document,accepted=host.scene.children.find(node=>node.userData.smartTileRole==='accepted'),records=await library(host);
  assert.equal(host.counts.prepare,0);assert.equal(host.scene.children.find(node=>node.userData.smartTileRole==='accepted'),accepted);assert.deepEqual(host.service.snapshot().document.tileBundle,original.tileBundle);log({stage:'library'});
  await applyCommand(host,host.command('preset.place',placeBody(host,records)),{jsonl:true});const placed=host.service.snapshot().document,other=placed.tileBundle.layout.instances.find(p=>p.id==='c1.owner.two');log({stage:'place'});
  await applyCommand(host,host.command('placement.upgrade',upgradeBody(records)));const after=host.service.snapshot().document;
  assert.deepEqual(after.tileBundle.layout.instances.find(p=>p.id===other.id),other);assert.deepEqual(after.authoring.library.presets[0],records.p);assert.equal(after.sourceJSON,original.sourceJSON);assert.deepEqual(host.counts,{prepare:2,apply:2,acquire:3,directRepair:0});assert.equal(Object.hasOwn(host.authority.read().journal.receipts[0].operation.target,'sourceJSON'),false);
  log({stage:'pass',counts:host.counts,contentRevision:after.contentRevision,checkpointBytes:host.raw.length});
}catch(error){log({stage:'failed',message:error.message,stack:error.stack});process.exitCode=1;}
finally{host?.dispose();log({stage:'closed'});}
