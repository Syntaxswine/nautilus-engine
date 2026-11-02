// Root integration review: both actual workspace entries are required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview,projectRoot as root} from './art-review-browser.mjs';

const output='tile-workshop-entry',out=path.join(root,'artifacts',output);fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const sourceFiles=['apps/editor/editor.js','apps/editor/editor.css','tools/build.mjs','tools/art-review-browser.mjs','tools/review-tile-workshop-entry.mjs','examples/tile-workshop.html','examples/tile-stack-editor.html','examples/tile-stack-editor.js','examples/tile-authoring-editor.html','examples/tile-authoring-editor.js'];
const inputs=sourceFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))})),checks=[];
const sources=JSON.parse(fs.readFileSync(path.join(root,'upstream.json')));
for(const name of ['editor.js','editor.css']){
  const expected=fs.readFileSync(path.join(root,'apps/editor',name),'utf8').replaceAll('../../vendor/','../vendor/').replaceAll('../../packages/','../packages/').replaceAll('__AFT__',sources.aft.root).replaceAll('__FARMYARD__',sources.farmyard.root+'/sites/tactical-animal/dist');
  assert.equal(fs.readFileSync(path.join(root,'dist/app',name),'utf8'),expected,'Build must contain current navigation/chrome: '+name);
}
for(const file of sourceFiles.filter(f=>f.startsWith('examples/')))assert.deepEqual(fs.readFileSync(path.join(root,'dist',file)),fs.readFileSync(path.join(root,file)),'Build must contain the current isolated entry: '+file);
const entries=[
  {id:'stacked-tiles',name:'Stacked tiles',file:'tile-stack-editor.html',proof:'tileStackEditorProof',phase:'draft',version:2},
  {id:'custom-tile-library',name:'Custom tile library',file:'tile-authoring-editor.html',proof:'tileAuthoringEditorProof',phase:'idle',version:3}
];
const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
await withArtReview('Built map workshop opens either tile workspace through its chooser without replacing the map',async({page,context,baseURL,errors,failedRequests})=>{
  const observe=opened=>{if(opened===page)return;opened.on('pageerror',error=>errors.push('Tile entry: '+error.message));opened.on('console',message=>{if(message.type()==='error')errors.push('Tile entry: '+message.text());});opened.on('response',response=>{if(response.status()>=400)failedRequests.push({url:response.url(),status:response.status()});});};
  context.on('page',observe);
  let currentViewport=null,step='main-readiness',activeEntry=null;
  const paint=opened=>opened.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const capture=async(opened,name)=>{await paint(opened);const file=path.join(out,name+'.png');await opened.screenshot({path:file});return {file:'artifacts/'+output+'/'+name+'.png',sha256:sha(fs.readFileSync(file))};};
  async function focusCardByKeyboard(chooser,id){
    for(let visits=0;visits<4;visits++){if(await chooser.evaluate(()=>document.activeElement?.id)===id)return;await chooser.keyboard.press('Tab');}
    assert.fail('Chooser card must be reachable by keyboard: '+id);
  }
  async function chooserLayout(chooser,viewport){
    const layout=await chooser.evaluate(()=>({viewport:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.workshop-card')].map(n=>({id:n.id,href:n.getAttribute('href'),target:n.getAttribute('target'),labelledBy:n.getAttribute('aria-labelledby'),label:n.querySelector('h2')?.textContent,describedBy:n.getAttribute('aria-describedby'),description:n.querySelector('p')?.textContent,rect:n.getBoundingClientRect().toJSON()}))}));
    assert.equal(layout.viewport,viewport.width);assert.equal(layout.clientWidth,viewport.width);assert.ok(layout.scrollWidth<=viewport.width,'Chooser must not overflow horizontally.');
    assert.deepEqual(layout.cards.map(c=>c.id),entries.map(e=>e.id));
    for(const [i,c]of layout.cards.entries()){assert.equal(c.href,entries[i].file);assert.equal(c.label,entries[i].name);assert.ok(c.labelledBy&&c.describedBy&&c.description);assert.equal(c.target,null,'Cards reuse the new chooser tab.');assert.ok(c.rect.width>=44&&c.rect.height>=44,'Chooser cards must offer44px targets.');assert.ok(c.rect.left>=0&&c.rect.right<=viewport.width,'Chooser card outside viewport.');}
    assert.equal(overlap(layout.cards[0].rect,layout.cards[1].rect),false,'Chooser cards overlap.');
    if(viewport.width===320)assert.ok(layout.cards[1].rect.top>=layout.cards[0].rect.bottom,'Phone chooser must use one column.');
    else assert.ok(Math.abs(layout.cards[0].rect.top-layout.cards[1].rect.top)<=1,'Desktop chooser must use two columns.');
    return layout;
  }
  async function workspaceState(tile,entry){
    await tile.waitForFunction(({proof,phase})=>{const port=globalThis[proof];if(port?.ready!==true||typeof port.proofSnapshot!=='function')return false;const s=port.proofSnapshot();return s.state.phase===phase&&s.state.readiness.visual.state==='accepted'&&s.disposed===false;},{proof:entry.proof,phase:entry.phase},{timeout:30000});
    const observed=await tile.evaluate(proof=>{const port=globalThis[proof],s=port.proofSnapshot(),canvas=document.querySelector('#stage canvas'),rect=canvas?.getBoundingClientRect();return {ready:port.ready,version:s.version,phase:s.state.phase,visual:s.state.readiness.visual.state,readiness:s.state.readiness,drawCalls:s.drawCalls??null,disposed:s.disposed,counts:s.counts,native:s.native,resources:s.state.resources,owners:s.state.owners,checkpointJSON:s.checkpointJSON,checkpointDigest:s.checkpointDigest,canvas:rect?{width:rect.width,height:rect.height}:null};},entry.proof);
    assert.equal(observed.version,entry.version);assert.equal(observed.disposed,false);assert.ok(observed.canvas?.width>0&&observed.canvas.height>0,'The actual workspace canvas must have a painted extent.');
    assert.ok(Number.isSafeInteger(observed.drawCalls)&&observed.drawCalls>0,entry.proof+' must expose actual renderer.info.render.calls as proofSnapshot().drawCalls; renderer memory or ready markers do not replace it.');
    assert.deepEqual(observed.counts,{prepare:0,apply:0},'Opening a workspace must not prepare/apply an authored edit.');
    const r=observed.resources,n=observed.native;assert.deepEqual([r.maxRoots,r.maxTriangles,r.maxCells],[2,50000,1024]);assert.equal(n.pool.maxMaterials,64);assert.ok(r.roots<=2&&r.triangles<=50000&&r.cells<=1024&&n.pool.ownedMaterials<=64);
    assert.equal(n.views.length,r.roots);assert.equal(n.views.reduce((sum,v)=>sum+v.cellCount,0),r.cells);assert.equal(n.views.reduce((sum,v)=>sum+v.provider.triangles,0),r.triangles);
    for(const key of ['query','support','navigation','fire','water','game'])assert.equal(observed.readiness[key].state,'unbound');
    const checkpoint=JSON.parse(observed.checkpointJSON);assert.equal(checkpoint.version,entry.version);
    if(entry.version===3){assert.equal(checkpoint.document.kind,'nautilus-tile-workbench-document');assert.equal(checkpoint.document.version,3);assert.ok(checkpoint.document.authoring&&Array.isArray(checkpoint.document.resourceRefs));}
    const {checkpointJSON,...state}=observed;return {...state,checkpointSha256:sha(checkpointJSON),checkpointBytes:Buffer.byteLength(checkpointJSON)};
  }
  try{
    for(const viewport of [{width:1440,height:1000},{width:320,height:844}]){
      currentViewport=viewport;activeEntry=null;step='main-readiness';
      await page.setViewportSize(viewport);await page.goto(baseURL+'/index.html');
      await page.waitForFunction(()=>{try{return window.editor3d?.loading===false&&typeof window.nautilus?.export?.()==='string';}catch{return false;}},{},{timeout:30000});
      const before=await page.evaluate(()=>window.nautilus.export()),link=page.locator('#nautilus-tiles');
      step='main-header';assert.ok(JSON.parse(before));await link.waitFor({state:'visible'});assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener');
      const href=new URL(await link.getAttribute('href')),baseURI=await page.evaluate(()=>document.baseURI);assert.equal(href.href,new URL('../../../../../examples/tile-workshop.html',baseURI).href);assert.equal(href.origin,baseURL);assert.equal(href.pathname,'/examples/tile-workshop.html');
      const layout=await page.evaluate(()=>{const header=document.querySelector('.nautilus-header').getBoundingClientRect();return {width:innerWidth,header:header.toJSON(),controls:[...document.querySelectorAll('.nautilus-header nav :is(button,a)')].map(n=>({id:n.id,rect:n.getBoundingClientRect().toJSON()})).filter(n=>n.rect.width&&n.rect.height)};});
      const visibleActions=['nautilus-buildings','nautilus-assets','nautilus-example',...(viewport.width<=1100?['nautilus-options']:[]),'nautilus-tiles','nautilus-help'];
      assert.deepEqual(layout.controls.map(c=>c.id),visibleActions,'Preserve the exact responsive toolbar actions; Tool options is hidden on desktop.');
      for(const c of layout.controls){assert.ok(c.rect.left>=-1&&c.rect.right<=viewport.width+1,'Header control outside viewport: '+c.id);assert.ok(c.rect.top>=layout.header.top-1&&c.rect.bottom<=layout.header.bottom+1,'Header control outside reserved header: '+c.id);}
      for(let i=0;i<layout.controls.length;i++)for(let j=i+1;j<layout.controls.length;j++)assert.equal(overlap(layout.controls[i].rect,layout.controls[j].rect),false,'Overlapping header controls: '+layout.controls[i].id+' / '+layout.controls[j].id);
      step='open-chooser';const opened=context.waitForEvent('page',{timeout:30000});await link.click();const chooser=await opened,workspaceChecks=[];let chooserObservation,chooserCapture;
      try{
        await chooser.setViewportSize(viewport);await chooser.waitForURL(href.href);await chooser.getByRole('heading',{name:'Tile workshop',exact:true}).waitFor({state:'visible'});
        assert.equal(await chooser.evaluate(()=>window.opener===null),true,'The chooser must not have authority over the original map tab.');
        step='chooser-layout';chooserObservation=await chooserLayout(chooser,viewport);
        step='chooser-keyboard';await chooser.keyboard.press('Tab');assert.equal(await chooser.evaluate(()=>document.activeElement?.id),entries[0].id);await chooser.keyboard.press('Tab');assert.equal(await chooser.evaluate(()=>document.activeElement?.id),entries[1].id);await chooser.keyboard.press('Shift+Tab');assert.equal(await chooser.evaluate(()=>document.activeElement?.id),entries[0].id);
        const focus=await chooser.evaluate(()=>{const n=document.activeElement,s=getComputedStyle(n);return {id:n.id,focusVisible:n.matches(':focus-visible'),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth};});assert.equal(focus.focusVisible,true);assert.notEqual(focus.outlineStyle,'none');assert.ok(parseFloat(focus.outlineWidth)>=2);
        chooserObservation.keyboard={order:entries.map(e=>e.id),reverseReturnsFirst:true,focus};chooserCapture=await capture(chooser,'chooser-'+viewport.width);
        for(const [index,entry]of entries.entries()){
          activeEntry=entry.id;
          if(index){step='return-chooser';await chooser.goBack({waitUntil:'domcontentloaded'});await chooser.waitForURL(href.href);await chooserLayout(chooser,viewport);}
          step='open-'+entry.id;await focusCardByKeyboard(chooser,entry.id);await chooser.keyboard.press('Enter');await chooser.waitForURL(baseURL+'/examples/'+entry.file);
          let tileState;
          try{step=entry.id+'-readiness';tileState=await workspaceState(chooser,entry);}
          catch(error){
            try{fs.writeFileSync(path.join(out,'tile-failure.json'),JSON.stringify({message:error.message,entry:entry.id,url:chooser.url(),state:await chooser.evaluate(()=>({stacked:globalThis.tileStackEditorProof?.proofSnapshot?.()??null,custom:globalThis.tileAuthoringEditorProof?.proofSnapshot?.()??null}))},null,2)+'\n');await chooser.screenshot({path:path.join(out,'tile-failure.png')});fs.writeFileSync(path.join(out,'tile-failure.html'),await chooser.content());}catch{}
            throw error;
          }
          const image=await capture(chooser,entry.id+'-'+viewport.width);assert.equal(await page.evaluate(()=>window.nautilus.export()),before,'Opening '+entry.name+' must retain every byte of the current map.');
          workspaceChecks.push({id:entry.id,url:chooser.url(),status:'pass',sameChooserPage:true,currentMapPreserved:true,tileState,capture:image});
        }
      }finally{if(!chooser.isClosed())await chooser.close();}
      activeEntry=null;step='main-map-preserved';assert.equal(await page.evaluate(()=>window.nautilus.export()),before,'Opening tiles must retain the complete current map.');
      const image=await capture(page,'entry-'+viewport.width);checks.push({viewport,status:'pass',pageURL:page.url(),baseURI,entryURL:href.href,currentMapPreserved:true,mapBytes:Buffer.byteLength(before),mapSha256:sha(before),correctEntry:true,layout,chooser:chooserObservation,chooserCapture,workspaces:workspaceChecks,capture:image});
    }
  }catch(error){
    const image=path.join(out,'failure.png');try{await page.screenshot({path:image});fs.writeFileSync(path.join(out,'failure.html'),await page.content());}catch{}
    fs.writeFileSync(path.join(out,'failure-context.json'),JSON.stringify({message:error.message,step,entry:activeEntry,viewport:currentViewport,pageURL:page.url(),main:await page.evaluate(()=>({loading:window.editor3d?.loading??null,hasDocument:!!window.nautilus?.document,status:document.getElementById('status')?.textContent??null})).catch(()=>null),inputs,checks},null,2)+'\n');throw error;
  }finally{context.off('page',observe);}
},{output,owner:process.env.CODEX_THREAD_ID||'01a18107-b4af-78c0-850f-0235d4df307f',timeoutMs:180000});
for(const row of inputs)assert.equal(sha(fs.readFileSync(path.join(root,row.file))),row.sha256,'Navigation input changed during review.');
const cleanup=JSON.parse(fs.readFileSync(path.join(out,'cleanup-receipt.json')));assert.equal(cleanup.httpClosed,true);assert.equal(cleanup.browserClosed,true);
fs.writeFileSync(path.join(out,'review.json'),JSON.stringify({status:'pass',inputs,checks,cleanup,scope:'Built1440/320px navigation, chooser keyboard/layout and actual unedited B2/C1 ready/draw-call/native-counter observations; byte-exact main map retained. Separate full host/package/renderer proofs own authoring/adoption/retirement acceptance. Isolated helper cleanup is recorded; no physical-device or performance claim.'},null,2)+'\n');
console.log(JSON.stringify({status:'pass',viewports:checks.length,workspacesPerViewport:2,currentMapPreserved:true}));
