import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {withArtReview} from '../../../tools/art-review-browser.mjs';
import {BATHROOM_MODULES, BATHROOM_LAYOUTS} from '../../../packages/bathrooms/index.js';
const smoke=process.argv.includes('--smoke'), sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
await withArtReview('Bathroom artist kit: exact 1 × 2 tile stalls, hollow fixtures and independent door/lid motion',async({page,baseURL,out,errors,failedRequests,browser})=>{
 await page.setViewportSize({width:1800,height:1050});await page.goto(baseURL+'/docs/reviews/bathrooms/scene.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.bathroomReview?.ready);
 const records=[],captures=[],uiChecks=[];
 async function capture(name){const file=name+'.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:92,fullPage:true});captures.push({file,sha256:sha(path.join(out,file))});}
 async function set(id,view,name=id+'-'+view,extra={}){records.push(await page.evaluate(o=>window.bathroomReview.set(o),{id,view,doors:false,lids:true,lod:'game',...extra}));await capture(name);}
 await page.evaluate(()=>window.bathroomReview.set({id:'bath-stall-row-3',view:'exterior',doors:false,lids:true}));
 await page.locator('#hinges input').nth(1).check();
 const individual=await page.evaluate(()=>window.bathroomReview.model.pivots.filter(p=>p.userData.kind==='door').map(p=>p.userData.angle||0));
 if(individual.join(',')!=='0,90,0')throw Error('Individual stall UI changed another door.');uiChecks.push({check:'Individual checkbox opens only the middle door',angles:individual});
 await capture('ui-independent-door');await page.locator('#doors').click();
 const allOpen=await page.locator('#hinges input:checked').count();if(allOpen!==3)throw Error('Open doors button failed.');uiChecks.push({check:'Open all doors button',checked:allOpen});
 await page.locator('#doors').click();if(await page.locator('#hinges input:checked').count())throw Error('Close doors button failed.');uiChecks.push({check:'Close all doors button',checked:0});
 await page.locator('#search').fill('urinal');const searchCount=await page.locator('#asset option').count();if(searchCount!==3)throw Error('Searchable asset menu failed.');uiChecks.push({check:'Search filters the asset dropdown',options:searchCount});await page.locator('#search').fill('');
 const all=[...BATHROOM_MODULES,...BATHROOM_LAYOUTS];
 const chosen=smoke?all.filter(r=>['bath-toilet-cistern','bath-sink-double','bath-stall-left','bath-stall-row-3','bath-outhouse-timber','bath-public-washroom'].includes(r.id)):all;
 for(const r of chosen){
   for(const view of smoke?['exterior','top']:['exterior','rear','top','grey','wire','plan'])await set(r.id,view);
   if(!smoke)await set(r.id,'grey',r.id+'-source',{lod:'source'});
   if(['stall','stall-row','outhouse','layout'].includes(r.kind))await set(r.id,'cutaway');
   if(['toilet','urinal','urinal-trough','sink','sink-double'].includes(r.kind))await set(r.id,'bowl-detail');
 }
 for(const id of['bath-stall-left','bath-stall-right','bath-stall-row-3','bath-outhouse-double','bath-outhouse-masonry','bath-outhouse-portable','bath-public-washroom','bath-camp-washyard']){
   await set(id,'exterior',id+'-doors-open',{doors:true});await set(id,'exterior',id+'-doors-half',{angle:45});await set(id,'exterior',id+'-one-door',{oneDoor:true});
 }
 for(const id of['bath-toilet-cistern','bath-toilet-high-cistern','bath-toilet-steel'])await set(id,'exterior',id+'-lid-closed',{lids:false});
 if(!smoke)for(const r of all){records.push(await page.evaluate(id=>window.bathroomReview.interchange(id,0),r.id));await capture(r.id+'-gltf');if(r.kind==='stall'||r.kind==='stall-row'||r.kind==='outhouse'||r.kind==='toilet'||r.kind==='layout')for(const time of[.5,1]){records.push(await page.evaluate(o=>window.bathroomReview.interchange(o.id,o.time),{id:r.id,time}));await capture(r.id+'-gltf-open-'+time);}}
 await page.evaluate(()=>window.bathroomReview.dispose());
 async function sheet(title,items,file,cols=3){await page.setViewportSize({width:2100,height:900});await page.setContent('<html><style>body{margin:0;background:#e8e4d7;color:#263c32;font:16px system-ui}header{padding:25px 30px;background:#243e34;color:#f0e8d5}h1{font:31px Georgia;margin:0 0 8px}main{display:grid;grid-template-columns:repeat('+cols+',1fr);gap:14px;padding:18px}article{min-width:0}h2{font:23px Georgia;margin:12px}img{width:100%;display:block}p{margin:12px;font-size:15px}footer{padding:20px 30px}</style><header><h1>'+title+'</h1>Original bathroom art · independent hinges · shared native metre scale</header><main>'+items.map(i=>'<article><h2>'+i.title+'</h2><img src="'+baseURL+'/artifacts/bathrooms-review/'+i.image+'.jpg"><p>'+(i.caption||'')+'</p></article>').join('')+'</main><footer>Each stall is exactly 1 × 2 tiles (1 × 2 m). Outward door swings require aisle space. Source detail before game reduction.</footer></html>');await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))));await capture(file);}
 if(!smoke){
  await sheet('Seated toilets, urinals and sinks',BATHROOM_MODULES.filter(r=>r.category==='fixture').map(r=>({title:r.name,image:r.id+'-exterior'})),'fixtures');
  await sheet('Outhouses · four constructions',BATHROOM_MODULES.filter(r=>r.category==='outhouse').map(r=>({title:r.name,image:r.id+'-cutaway'})),'outhouses',2);
  await sheet('1 × 2 tile stalls · independent doors',[
   {title:'Closed stall',image:'bath-stall-left-exterior'},{title:'Open stall',image:'bath-stall-left-doors-open'},
   {title:'One door in a row',image:'bath-stall-row-3-one-door'},{title:'Exact tile plan',image:'bath-stall-left-plan'},
   {title:'Three closed bays',image:'bath-stall-row-3-exterior'},{title:'Three open bays',image:'bath-stall-row-3-doors-open'}],'stalls',2);
  await sheet('Bathroom kit · fixtures and working privacy',[
   {title:'Public washroom',image:'bath-public-washroom-cutaway'},{title:'Camp washyard',image:'bath-camp-washyard-doors-open'},
   {title:'Ceramic toilet',image:'bath-toilet-cistern-bowl-detail'},{title:'1 × 2 tile stall',image:'bath-stall-left-doors-open'}],'family',2);
 }
 const report={artistFoundation:'65c06735396e14b8774ae1e7d5ad61969692963f',catalogueSha256:sha(new URL('../../../assets/bathrooms/catalogue.json',import.meta.url)),browser:browser.version(),mode:'Isolated Edge software WebGL2 visual correctness; no frame-rate claim.',smoke,uiChecks,records,captures,errors,failedRequests};
 fs.writeFileSync(path.join(out,smoke?'smoke-checks.json':'browser-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({views:records.length,captures:captures.length,errors,failedRequests}));
},{source:true,output:'bathrooms-review',owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:600000});
