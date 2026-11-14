import fs from 'node:fs';import assert from 'node:assert/strict';
import {withArtReview} from '../art-review-browser.mjs';
import {buildMountDoraContent} from './content.mjs';
import {preserveReviewSources} from './review-record.mjs';
preserveReviewSources('mount-dora-depot-review');
buildMountDoraContent('artifacts/mount-dora-intake/content',{engineURL:'../../../packages/'});
await withArtReview('Mount Dora real depot and supported walking integration',async({page,baseURL,out})=>{
 const url=baseURL+'/apps/mount-dora/?content=/artifacts/mount-dora-intake/content/index.js';await page.goto(url);await page.waitForFunction(()=>window.nautilusMountDora||/failed|Error|UNAVAILABLE|INVALID/.test(document.querySelector('#status')?.textContent),{timeout:90000});
 const before=await page.evaluate(()=>window.nautilusMountDora.read());assert.equal(before.state.actor.heightM,1.8);assert.ok(before.metrics.blocks<=9);assert.ok(before.metrics.plantModels<17171);await page.screenshot({path:out+'/depot.png'});
 await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');const after=await page.evaluate(()=>window.nautilusMountDora.read());assert.notDeepEqual(after.pose.position,before.pose.position);assert.deepEqual(after.state.resources,before.state.resources);
 const saved=await page.evaluate(()=>window.nautilusMountDora.save());await page.goto(url+'&restore=1');await page.waitForFunction(()=>window.nautilusMountDora,{timeout:90000});const reopened=await page.evaluate(()=>window.nautilusMountDora.world.checkpoint());assert.deepEqual(reopened,saved.world);
 const editor=await page.evaluate(()=>{const doc=window.nautilusMountDora.editor,a=doc.export();doc.rename('Browser depot round trip');const b=doc.export();doc.undo();const undo=doc.export()===a;doc.redo();return {changed:a!==b,undo,redo:doc.export()===b};});assert.deepEqual(editor,{changed:true,undo:true,redo:true});
 await page.screenshot({path:out+'/depot-reopened.png'});fs.writeFileSync(out+'/receipt.json',JSON.stringify({before,after,editor,checkpointExact:true},null,2));
 await page.evaluate(()=>window.nautilusMountDora.dispose());
},{source:true,owner:'01a1810c-62da-7210-a1ca-b72b449ce024',output:'mount-dora-depot-review',timeoutMs:180000});
