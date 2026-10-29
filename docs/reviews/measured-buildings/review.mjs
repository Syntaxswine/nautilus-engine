import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
import{withArtReview}from'../../../tools/art-review-browser.mjs';import{MEASURED_RECIPES}from'../../../packages/measured-buildings/index.js';
import{MEASURED_PARTS}from'../../../packages/measured-buildings/parts.js';
const requested=process.argv.slice(2),recipes=requested.length?MEASURED_RECIPES.filter(r=>requested.includes(r.id)):MEASURED_RECIPES;
await withArtReview('Measured-building asset form, floor datums, apertures, stairs, roof joins and interchange review',async({page,baseURL,out,errors,failedRequests,browser})=>{
 await page.setViewportSize({width:1700,height:1100});await page.goto(baseURL+'/docs/reviews/measured-buildings/scene.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.measuredReview?.ready);
 const records=[],captures=[],capture=async name=>{const file=name+'.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:92,fullPage:true});captures.push({file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')});};
 for(const r of recipes) {
   for(const view of['exterior','rear','top','roof-off','grey','wire','entry','junction','interior','mixed']){records.push(await page.evaluate(options=>window.measuredReview.set(options),{id:r.id,view,lod:'game',level:0,opened:false}));await capture(r.id+'-'+view);}
   for(let level=0;level<r.levels;level++)for(const view of['cutaway','plan']){records.push(await page.evaluate(options=>window.measuredReview.set(options),{id:r.id,view,level}));await capture(r.id+'-'+view+'-L'+level);}
   records.push(await page.evaluate(options=>window.measuredReview.set(options),{id:r.id,view:'stairs',level:1}));await capture(r.id+'-stairs-L1');
   await page.evaluate(options=>window.measuredReview.set(options),{id:r.id,view:'entry',opened:true});await capture(r.id+'-entry-open');
   records.push(await page.evaluate(()=>window.measuredReview.oneEntryLeaf()));await capture(r.id+'-entry-one-open');
   await page.evaluate(options=>window.measuredReview.set(options),{id:r.id,view:'grey',lod:'source',opened:false});await capture(r.id+'-source-grey');
   await page.evaluate(options=>window.measuredReview.set(options),{id:r.id,view:'grey',lod:'game'});await capture(r.id+'-game-grey');
   records.push(await page.evaluate(id=>window.measuredReview.interchange(id),r.id));await capture(r.id+'-gltf');
   if(r.id==='quincy-market-hall')for(const view of['dome','portico']){records.push(await page.evaluate(options=>window.measuredReview.set(options),{id:r.id,view,lod:'game'}));await capture(r.id+'-'+view);}
 }
 if(!requested.length)for(const p of MEASURED_PARTS){records.push(await page.evaluate(options=>window.measuredReview.set(options),{id:p.id,view:'part',lod:'game',opened:false}));await capture('part-'+p.id);}
 await page.evaluate(()=>window.measuredReview.dispose());
 if(!requested.length){
   const sheet=async(title,items,file,columns=3)=>{
     await page.setViewportSize({width:2100,height:850});
     await page.setContent('<html><style>body{margin:0;background:#e5e3d5;color:#243a31;font:16px system-ui}header{padding:25px 32px;background:#243a31;color:#eee6d2}h1{font:29px Georgia;margin:0 0 8px}main{display:grid;grid-template-columns:repeat('+columns+',1fr);gap:10px;padding:20px}article{min-width:0}h2{font:22px Georgia;margin:12px}img{width:100%;display:block}p{margin:10px 12px;font-size:15px}footer{padding:18px 32px;font-size:14px}</style><header><h1>'+title+'</h1>Original native-scale adaptations · source evidence and inferred changes recorded separately</header><main>'+items.map(i=>'<article><h2>'+i.title+'</h2><img src="'+baseURL+'/artifacts/measured-buildings-review/'+i.image+'.jpg"><p>'+(i.caption||'')+'</p></article>').join('')+'</main><footer>2 m walls · 0.16 m thickness · 0.12 m slabs · 2.12 m datums · shared painterly materials</footer></html>');
     await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))));await capture(file);
   };
   await sheet('Ellis Island · Boott Mill · Quincy Market',recipes.map((r,i)=>({title:r.name,image:r.id+'-exterior',caption:['Two ward arms, cross corridor and central veranda','Two tall factory floors and an upper finishing floor','Long market aisle, Doric porticos and an open rotunda'][i]})),'family');
   for(const r of recipes)await sheet(r.name+' · review sheet',[
     ...['exterior','grey','wire','top','roof-off','cutaway-L0','cutaway-L'+(r.levels-1),'stairs-L1','junction','entry','entry-open','gltf'].map(view=>({title:view,image:r.id+'-'+view}))
   ],r.id+'-review-sheet');
 }
 const report={baseline:'12ad8c9b1c96637cd05c8e344692063bfde385f3',catalogueSha256:createHash('sha256').update(fs.readFileSync(new URL('../../../assets/measured-buildings/catalogue.json',import.meta.url))).digest('hex'),
  partsManifestSha256:createHash('sha256').update(fs.readFileSync(new URL('../../../assets/measured-buildings/parts.json',import.meta.url))).digest('hex'),browser:browser.version(),rendering:'Isolated Edge software WebGL2 visual correctness; no frame-rate claim',records,errors,failedRequests,captures};
 fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({views:records.length,captures:captures.length,errors,failedRequests}));
},{source:true,output:'measured-buildings-review',owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:600000});
