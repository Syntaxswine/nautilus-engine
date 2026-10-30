import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {withArtReview,projectRoot} from '../../tools/art-review-browser.mjs';
const directory=path.join(projectRoot,'docs/reviews/functional-parts-kit'),captures=[];
const exteriorOnly=process.argv.includes('--exterior-only'),previous=exteriorOnly?JSON.parse(fs.readFileSync(path.join(directory,'browser-review.json'))):null;
await withArtReview('Native shared-part kit, real openings, native animal fit and bounded Rowan audit',async({page,baseURL,errors,failedRequests})=>{
 await page.goto(baseURL+'/art/functional-parts-kit/review.html');await page.waitForFunction(()=>window.nativeKitReview?.ready,null,{timeout:60000});
 const shot=async(name,values)=>{const state=await page.evaluate(values=>window.nativeKitReview.set(values),values);assert.ok(state.actors.every(actor=>JSON.stringify(actor.nativeScale)==='[1,1,1]'));const ids=state.models.flatMap(model=>model.bindings.map(binding=>{assert.equal(binding.assemblyInstanceId,model.id);return [binding.assemblyInstanceId,binding.partId,binding.nodeId].join('/');}));assert.equal(new Set(ids).size,ids.length);await page.screenshot({path:path.join(directory,name+'.jpg'),type:'jpeg',quality:88});captures.push({file:name+'.jpg',configuration:values,state});console.log('Captured '+name);};
 if(exteriorOnly)await shot('cross-workshop-assembly',{layout:'cross-workshop',mode:'assembly',doorOpen:true});
 else {
 for(const layout of ['longhouse','cross-workshop'])for(const mode of ['assembly','shaft','stair'])await shot(layout+'-'+mode,{layout,mode,doorOpen:true});
 await shot('native-door-closed',{mode:'door',doorOpen:false});await shot('native-door-open',{mode:'door',doorOpen:true});await shot('native-hmg-oversized',{mode:'oversized',doorOpen:true});
 await shot('reused-parts-instances',{mode:'instances'});await shot('native-stair-grey',{mode:'stair',layout:'longhouse',grey:true});await shot('rowan-existing-audit',{mode:'rowan'});
 }
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>({path:new URL(entry.name).pathname,decodedBodyBytes:entry.decodedBodySize,encodedBodyBytes:entry.encodedBodySize})));
 await page.evaluate(()=>window.nativeKitReview.dispose());assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);
 fs.writeFileSync(path.join(directory,'browser-review.json'),JSON.stringify({status:'Artist geometry/semantic reference; no accepted runtime compiler/player claim.',browser:await page.context().browser().version(),runtime:process.version,viewport:page.viewportSize(),rendering:'Source/native Three r180; software WebGL, not a physical-device timing result.',captures:[...new Map([...(previous?.captures??[]),...captures].map(capture=>[capture.file,capture])).values()],resources,errors,failedRequests},null,2)+'\n');
},{source:true,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',output:'functional-parts-kit-review',timeoutMs:300000});
console.log(JSON.stringify({captures:captures.length,retainedHelpers:0,cleanupReceipt:'artifacts/functional-parts-kit-review/cleanup-receipt.json'}));
