import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {withArtReview,projectRoot} from '../../../tools/art-review-browser.mjs';
const output=path.join(projectRoot,'docs/reviews/silo');
await withArtReview('Silo native geometry, all height windows, modules, controls and independent glTF readback',async({page,baseURL,errors,failedRequests})=>{
 await page.goto(baseURL+'/docs/reviews/silo/viewer.html');await page.waitForFunction(()=>window.siloReview?.ready,{timeout:120000});
 const shots=[];async function shot(name,action){if(action)await action();await page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:88});shots.push({name,...await page.evaluate(()=>window.siloReview.snapshot())});}
 await shot('overview',()=>page.evaluate(()=>{siloReview.clean(true);siloReview.camera({center:[65,-20,18],span:78,az:.72,el:.38});}));
 await page.evaluate(()=>siloReview.clean(false));await shot('entry-deck',()=>page.evaluate(()=>siloReview.focus(17)));
 await page.click('#down');assert.equal(await page.evaluate(()=>siloReview.snapshot().active),16);await page.click('#up');assert.equal(await page.evaluate(()=>siloReview.snapshot().active),17);
 await page.locator('canvas').click({position:{x:1500,y:1000}});await page.keyboard.press('PageDown');assert.equal(await page.evaluate(()=>siloReview.snapshot().active),16);await page.keyboard.press('PageUp');
 await page.uncheck('#doors');const door=await page.locator('#door option').first().getAttribute('value');await page.selectOption('#door',door);await page.locator('#door-angle').fill('45');await page.locator('#door-angle').dispatchEvent('input');
 const independent=await page.evaluate(()=>siloReview.snapshot().rigs);assert.equal(independent.find(r=>r.id===door).value,45);assert.ok(independent.filter(r=>r.id.startsWith('blast-door')&&r.id!==door).every(r=>r.value===0));
 await shot('door-independence');await page.check('#doors');await page.locator('#cover').fill('45');await page.locator('#cover').dispatchEvent('input');assert.equal((await page.evaluate(()=>siloReview.snapshot().rigs)).find(r=>r.id==='silo-cover').value,.45);
 const floors=[];for(let i=0;i<23;i++){await page.evaluate(i=>siloReview.focus(i,'shaft'),i);const s=await page.evaluate(()=>siloReview.snapshot());assert.equal(s.active,i);assert.ok(s.visibleBatches>0);floors.push({index:i,calls:s.renderer.calls,triangles:s.renderer.triangles,visibleBatches:s.visibleBatches});}
 await shot('control-capsule',()=>page.evaluate(()=>siloReview.focus(17,'capsule')));await shot('shaft-concourse',()=>page.evaluate(()=>siloReview.focus(17,'shaft')));
 await page.check('#grid');await shot('round-tile-boundaries');await page.uncheck('#grid');
 await shot('living-deck',()=>page.evaluate(()=>{siloReview.focus(19,'capsule');siloReview.setView({cutaway:false});siloReview.camera({center:[11.5,-5.6,18],span:12,az:.6,el:1.35});}));
 await shot('portal-stairs',()=>page.evaluate(()=>{siloReview.setView({cutaway:true});siloReview.focus(19,'portal');}));
 const assets=await page.locator('#asset option').evaluateAll(opts=>opts.map(o=>o.value)),modules=[];
 for(const id of assets){await page.selectOption('#asset',id);await page.waitForFunction(id=>siloReview.model.asset.id===id&&document.getElementById('loading').hidden,id);
  if(id==='silo-switchback')await page.evaluate(()=>siloReview.camera({center:[2,1.05,1.5],span:4.7,az:.9,el:.65}));
  if(id==='silo-wall-portal')await page.evaluate(()=>siloReview.camera({center:[7.4,1.6,0],span:9,az:.2,el:.35}));
  if(!id.startsWith('coldwell-'))await shot(id);modules.push(await page.evaluate(()=>siloReview.snapshot()));
 }
 for(const lod of ['source','game'])await shot('source-comparison-'+lod,()=>page.evaluate(async lod=>{await siloReview.asset('silo-equipment-rack',{lod,grey:true});siloReview.camera({center:[0,1,0],span:2.6,az:.8,el:.35});},lod));
 assert.ok(floors[17].calls<shots[0].renderer.calls);await page.evaluate(()=>siloReview.dispose());
 await page.goto(baseURL+'/docs/reviews/silo/export-viewer.html');await page.waitForFunction(()=>window.siloExportReview?.ready,{timeout:120000});const exports=[];
 for(const id of assets){const r=await page.evaluate(id=>siloExportReview.inspect(id),id);for(const p of r.poses){assert.ok(p.maximumBoundsDifferenceM<.0001,id+' pose mismatch');assert.ok(p.maximumRigMatrixDifference<.0001,id+' rig matrix mismatch');}assert.ok(r.pixelComparison.fractionOverFive<.005,id+' texture/appearance mismatch');exports.push(r);
  if(id==='silo-heavy-door'||id==='silo-switchback')await page.screenshot({path:path.join(output,id+'-gltf.jpg'),type:'jpeg',quality:88});}
 await page.evaluate(()=>siloExportReview.dispose());
 fs.writeFileSync(path.join(output,'browser-review.json'),JSON.stringify({viewport:[1600,1100],renderer:'Isolated Edge with SwiftShader; counts are submitted workload, not a frame-rate/device budget',shots,floors,modules,exports,independentDoorCheck:true,coverCheck:true,errors,failedRequests},null,2)+'\n');
 console.log(JSON.stringify({shots:shots.length,floors:floors.length,modules:modules.length,exportReadbacks:exports.length,overview:shots[0].renderer,entryWindow:floors[17],errors,failedRequests}));
},{source:true,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',output:'silo-review',timeoutMs:300000});
