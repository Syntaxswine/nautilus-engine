import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';
import{withArtReview}from'../../../tools/art-review-browser.mjs';
import{FRONTIER_BUILDINGS,FRONTIER_PARTS}from'../../../packages/frontier-fort/index.js';
import{FRONTIER_LAYOUTS}from'../../../packages/frontier-fort/layouts.js';
const smoke=process.argv.includes('--smoke'),refresh=process.argv.includes('--refresh-readback');
await withArtReview('Original modular stockade fort: assembled silhouette, gate motion and native walkway/access review',async({page,baseURL,out,errors,failedRequests,browser})=>{
 await page.setViewportSize({width:1800,height:1100});await page.goto(baseURL+'/docs/reviews/frontier-fort/scene.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.frontierReview?.ready);
 const previous=refresh?JSON.parse(fs.readFileSync(path.join(out,'browser-checks.json'))):null,
   records=previous?previous.records.filter(r=>r.lod!=='glTF readback'&&r.view!=='roof-join'):[],captures=previous?[...previous.captures]:[],
   capture=async name=>{const file=name+'.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:92,fullPage:true});
     const item={file,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')},index=captures.findIndex(r=>r.file===file);
     if(index<0)captures.push(item);else captures[index]=item;};
 async function set(id,view,name,extra={}){records.push(await page.evaluate(o=>window.frontierReview.set(o),{id,view,lod:'game',opened:false,level:0,...extra}));await capture(name||id+'-'+view);}
 if(!refresh){
 for(const r of FRONTIER_LAYOUTS)for(const view of smoke?['exterior','top','roof-off']:['exterior','rear','top','roof-off','grey','wire','joint'])await set(r.id,view);
 for(const view of['gate-exterior','gate-interior','gate-swing'])for(const opened of[false,true])await set('frontier-gatehouse',view,'gate-'+view+'-'+(opened?'open':'closed'),{opened});
 await set('frontier-gatehouse','gate-exterior','gate-one-open',{oneLeaf:true});
 await set('frontier-blockhouse','cutaway','blockhouse-access',{level:1});
 await set('frontier-rampart-platform','access','rampart-access');
 if(!smoke){
   for(const r of FRONTIER_BUILDINGS){
     for(const view of['exterior','rear','roof-off','grey','wire'])await set(r.id,view);
     for(let level=0;level<r.levels;level++)for(const view of['cutaway','plan'])await set(r.id,view,r.id+'-'+view+'-L'+level,{level});
     await set(r.id,'grey',r.id+'-source-grey',{lod:'source'});
   }
   for(const p of FRONTIER_PARTS)for(const view of['exterior','grey'])await set(p.id,view,p.id+'-'+view);
 }
 }
 if(!smoke){
   for(const r of [...FRONTIER_LAYOUTS,...FRONTIER_BUILDINGS,...FRONTIER_PARTS]){
     records.push(await page.evaluate(id=>window.frontierReview.interchange(id),r.id));await capture(r.id+'-gltf');
   }
   for(const id of['frontier-gatehouse','frontier-sally-port'])for(const time of[.5,1]){
     records.push(await page.evaluate(o=>window.frontierReview.interchange(o.id,o.time),{id,time}));await capture(id+'-gltf-gates-'+time);
   }
   await set('frontier-adobe-storehouse','roof-join','roof-walk-join');
 }
 await page.evaluate(()=>window.frontierReview.dispose());
 if(!smoke){
   async function sheet(title,items,file,columns=2){
     await page.setViewportSize({width:2100,height:850});
     await page.setContent('<html><style>body{margin:0;background:#e5e3d5;color:#263c32;font:16px system-ui}header{padding:24px 30px;background:#233b31;color:#f1e9d5}h1{font:30px Georgia;margin:0 0 8px}main{display:grid;grid-template-columns:repeat('+columns+',1fr);gap:12px;padding:18px}article{min-width:0}h2{font:23px Georgia;margin:12px}img{width:100%;display:block}p{margin:10px 12px;font-size:15px}footer{padding:18px 30px;font-size:14px}</style><header><h1>'+title+'</h1>Original modular fictional frontier fort · source and reduced meshes · native metre dimensions</header><main>'+items.map(i=>'<article><h2>'+i.title+'</h2><img src="'+baseURL+'/artifacts/frontier-fort-review/'+i.image+'.jpg"><p>'+(i.caption||'')+'</p></article>').join('')+'</main><footer>2 m ordinary walls · .16 m thickness · .12 m slabs · 2.12 m storey / walkway datums · explicit custom defensive geometry</footer></html>');
     await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))));await capture(file);
   }
   await sheet('One kit · two enclosed forts',FRONTIER_LAYOUTS.map(r=>({title:r.name,image:r.id+'-exterior',caption:r.width+' × '+r.depth+' m. Same connections, quarter-turn rotations and working paired gates.'})),'family');
   await sheet('Gatehouse · closed, independent and open',[
     {title:'Closed',image:'gate-gate-swing-closed'},{title:'Open inward',image:'gate-gate-swing-open'},
     {title:'One leaf open',image:'gate-one-open'},{title:'glTF animation at 90 degrees',image:'frontier-gatehouse-gltf-gates-1'}
   ],'gate-review');
   await sheet('Access and assembly',[
     {title:'Blockhouse stair opening',image:'blockhouse-access'},{title:'Rampart and standard stair',image:'rampart-access'},
     {title:'Courtyard / roof removed',image:'frontier-fort-courtyard-roof-off'},{title:'Compact module configuration',image:'frontier-fort-compact-top'},
     {title:'Optional roof terrace connection',image:'roof-walk-join',caption:'Explicitly opened roof caps connect at the same 2.12 m datum. Default standalone caps remain closed.'}
   ],'access-review');
   await sheet('Reusable kit parts',FRONTIER_PARTS.map(r=>({title:r.name,image:r.id+'-exterior'})),'parts-review',3);
   for(const r of FRONTIER_BUILDINGS)await sheet(r.name,[
     ...['exterior','grey','wire','roof-off'].map(view=>({title:view,image:r.id+'-'+view})),
     {title:'Ground plan',image:r.id+'-plan-L0'},{title:'Detailed source',image:r.id+'-source-grey'}
   ],r.id+'-review',3);
 }
 const report={baseline:'8631b0cfc6005f3004956afa50ec0e46e5f69278',
   catalogueSha256:createHash('sha256').update(fs.readFileSync(new URL('../../../assets/frontier-fort/catalogue.json',import.meta.url))).digest('hex'),
   connectorsSha256:createHash('sha256').update(fs.readFileSync(new URL('../../../assets/frontier-fort/connectors.json',import.meta.url))).digest('hex'),
   browser:browser.version(),rendering:'Isolated Edge software WebGL2 visual correctness; no frame-rate claim.',
   smoke,refresh,refreshEvidence:refresh?{originalCatalogueSha256:previous.catalogueSha256,byteIdentity:'default-export-identity.json',
     scope:'Retained native captures have byte-identical default asset exports. All 20 glTF readbacks, paired-gate animation poses and the new optional roof join were captured again.'}:null,
   records,errors,failedRequests,captures};fs.writeFileSync(path.join(out,smoke?'smoke-checks.json':'browser-checks.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({views:records.length,captures:captures.length,errors,failedRequests}));
},{source:true,output:'frontier-fort-review',owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:600000});
