import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot as root} from './art-review-browser.mjs';

const output='tile-workshop-entry',out=path.join(root,'artifacts',output);fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs=['apps/editor/editor.js','apps/editor/editor.css','tools/build.mjs','tools/art-review-browser.mjs','tools/review-tile-workshop-entry.mjs','examples/tile-stack-editor.html','examples/tile-stack-editor.js'].map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),checks=[];
const sources=JSON.parse(fs.readFileSync(path.join(root,'upstream.json')));
for(const name of ['editor.js','editor.css']){
  const expected=fs.readFileSync(path.join(root,'apps/editor',name),'utf8').replaceAll('../../vendor/','../vendor/').replaceAll('../../packages/','../packages/').replaceAll('__AFT__',sources.aft.root).replaceAll('__FARMYARD__',sources.farmyard.root+'/sites/tactical-animal/dist');
  assert.equal(fs.readFileSync(path.join(root,'dist/app',name),'utf8'),expected,'Build must contain current navigation/chrome: '+name);
}
for(const file of ['examples/tile-stack-editor.html','examples/tile-stack-editor.js'])assert.deepEqual(fs.readFileSync(path.join(root,'dist',file)),fs.readFileSync(path.join(root,file)),'Build must contain the current isolated entry: '+file);
await withArtReview('Built map workshop opens the native tile workspace without replacing its map',async({page,context,baseURL,errors,failedRequests})=>{
  const observe=opened=>{if(opened===page)return;opened.on('pageerror',error=>errors.push('Tile entry: '+error.message));opened.on('console',message=>{if(message.type()==='error')errors.push('Tile entry: '+message.text());});opened.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});};
  context.on('page',observe);
  let currentViewport=null,step='main-readiness';
  try{
  for(const viewport of [{width:1440,height:1000},{width:320,height:844}]){
    currentViewport=viewport;
    step='main-readiness';
    await page.setViewportSize(viewport);await page.goto(baseURL+'/index.html');
    await page.waitForFunction(()=>{try{return window.editor3d?.loading===false&&typeof window.nautilus?.export?.()==='string';}catch{return false;}},{},{timeout:30000});
    const before=await page.evaluate(()=>window.nautilus.export()),link=page.locator('#nautilus-tiles');
    step='main-header';
    assert.ok(JSON.parse(before));await link.waitFor({state:'visible'});
    assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener');
    const href=new URL(await link.getAttribute('href')),baseURI=await page.evaluate(()=>document.baseURI);assert.equal(href.href,new URL('../../../../../examples/tile-stack-editor.html',baseURI).href);assert.equal(href.origin,baseURL);assert.equal(href.pathname,'/examples/tile-stack-editor.html');
    const layout=await page.evaluate(()=>{const header=document.querySelector('.nautilus-header').getBoundingClientRect();return {width:innerWidth,header:header.toJSON(),controls:[...document.querySelectorAll('.nautilus-header nav :is(button,a)')].map(n=>({id:n.id,rect:n.getBoundingClientRect().toJSON()})).filter(n=>n.rect.width&&n.rect.height)};});
    assert.ok(layout.controls.some(control=>control.id==='nautilus-tiles'),'Visible header includes the workshop link.');
    for(const c of layout.controls){assert.ok(c.rect.left>=-1&&c.rect.right<=viewport.width+1,'Header control outside viewport: '+c.id);assert.ok(c.rect.top>=layout.header.top-1&&c.rect.bottom<=layout.header.bottom+1,'Header control outside reserved header: '+c.id);}
    for(let i=0;i<layout.controls.length;i++)for(let j=i+1;j<layout.controls.length;j++){const a=layout.controls[i],b=layout.controls[j];assert.ok(Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)<=1||Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top)<=1,'Overlapping header controls: '+a.id+' / '+b.id);}
    step='open-tile';const opened=context.waitForEvent('page',{timeout:30000});await link.click();const tile=await opened;
    let tileState;
    try{
      step='tile-readiness';await tile.waitForFunction(()=>{if(globalThis.tileStackEditorProof?.ready!==true)return false;const snapshot=globalThis.tileStackEditorProof.proofSnapshot();return snapshot.state.phase==='draft'&&snapshot.state.readiness.visual.state==='accepted';},{}, {timeout:30000});
      assert.equal(tile.url(),href.href);tileState=await tile.evaluate(()=>{const snapshot=globalThis.tileStackEditorProof.proofSnapshot();return {ready:globalThis.tileStackEditorProof.ready,phase:snapshot.state.phase,visual:snapshot.state.readiness.visual.state,drawCalls:snapshot.drawCalls,disposed:snapshot.disposed};});assert.equal(tileState.disposed,false);assert.ok(tileState.drawCalls>0);
    }catch(error){
      try{fs.writeFileSync(path.join(out,'tile-failure.json'),JSON.stringify({message:error.message,url:tile.url(),state:await tile.evaluate(()=>({ready:globalThis.tileStackEditorProof?.ready??null,snapshot:globalThis.tileStackEditorProof?.proofSnapshot()??null}))},null,2)+'\n');await tile.screenshot({path:path.join(out,'tile-failure.png')});fs.writeFileSync(path.join(out,'tile-failure.html'),await tile.content());}catch{}
      throw error;
    }finally{await tile.close();}
    step='main-map-preserved';
    assert.equal(await page.evaluate(()=>window.nautilus.export()),before,'Opening tiles must retain the complete current map.');
    const image=path.join(out,'entry-'+viewport.width+'.png');await page.screenshot({path:image});checks.push({viewport,status:'pass',pageURL:page.url(),baseURI,entryURL:href.href,currentMapPreserved:true,mapBytes:Buffer.byteLength(before),mapSha256:sha(before),correctEntry:true,tileState,layout,captureSha256:sha(fs.readFileSync(image))});
  }
  }catch(error){
    const capture=path.join(out,'failure.png');try{await page.screenshot({path:capture});fs.writeFileSync(path.join(out,'failure.html'),await page.content());}catch{}
    fs.writeFileSync(path.join(out,'failure-context.json'),JSON.stringify({message:error.message,step,viewport:currentViewport,pageURL:page.url(),main:await page.evaluate(()=>({loading:window.editor3d?.loading??null,hasDocument:!!window.nautilus?.document,status:document.getElementById('status')?.textContent??null})).catch(()=>null),inputs,checks},null,2)+'\n');throw error;
  }finally{context.off('page',observe);}
},{output,owner:process.env.CODEX_THREAD_ID||'01a18107-b4af-78c0-850f-0235d4df307f',timeoutMs:180000});
for(const row of inputs)assert.equal(sha(fs.readFileSync(path.join(root,row.file))),row.sha256,'Navigation input changed during review.');
const cleanup=JSON.parse(fs.readFileSync(path.join(out,'cleanup-receipt.json')));assert.equal(cleanup.httpClosed,true);assert.equal(cleanup.browserClosed,true);
fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({status:'pass',inputs,checks,cleanup,scope:'Built desktop/320px navigation and retained map source; isolated browser cleanup is recorded separately, not a physical-device performance claim.'},null,2)+'\n');
console.log(JSON.stringify({status:'pass',viewports:checks.length,currentMapPreserved:true}));
