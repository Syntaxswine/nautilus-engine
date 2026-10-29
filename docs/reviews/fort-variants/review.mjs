import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
import{withArtReview}from'../../../tools/art-review-browser.mjs';
import{VARIANT_BUILDINGS,VARIANT_PARTS}from'../../../packages/fort-variants/index.js';
import{VARIANT_LAYOUTS}from'../../../packages/fort-variants/layouts.js';
const smoke=process.argv.includes('--smoke'),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
await withArtReview('Castle and modern cyclone fort variants: native connections, full assemblies, gate motion, raised towers and real mesh/grating',async({page,baseURL,out,errors,failedRequests,browser})=>{
  await page.setViewportSize({width:1800,height:1100});await page.goto(baseURL+'/docs/reviews/fort-variants/scene.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.variantReview?.ready);
  const records=[],captures=[];
  async function capture(name){const file=name+'.jpg';await page.screenshot({path:path.join(out,file),type:'jpeg',quality:92,fullPage:true});captures.push({file,sha256:sha(path.join(out,file))});}
  async function set(id,view,name=id+'-'+view,extra={}){records.push(await page.evaluate(o=>window.variantReview.set(o),{id,view,lod:'game',opened:false,level:0,...extra}));await capture(name);}
  for(const l of VARIANT_LAYOUTS)for(const view of smoke?['exterior','top','roof-off']:['exterior','rear','top','roof-off','grey','wire','joint'])await set(l.id,view);
  for(const id of['castle-gatehouse','cyclone-security-gatehouse']){
    for(const view of['gate-exterior','gate-interior','gate-swing'])for(const opened of[false,true])await set(id,view,id+'-'+view+'-'+(opened?'open':'closed'),{opened});
    await set(id,'gate-exterior',id+'-one-open',{oneLeaf:true});
  }
  for(const id of['castle-corner-tower','cyclone-guard-tower'])await set(id,'cutaway',id+'-access',{level:2});
  for(const id of['castle-rampart-platform','castle-datum-stair']){
    for(const view of['stair-detail','stair-top'])await set(id,view);
    await set(id,'stair-detail',id+'-stair-source',{lod:'source'});
  }
  await set('cyclone-fence-6','fence-detail');await set('cyclone-fence-6','deck-detail');
  for(const id of['link-castle-to-cyclone','link-cyclone-to-castle'])await set(id,'transition');
  for(const id of['castle-roof-store','cyclone-roof-store'])await set(id,'roof-join');
  if(!smoke){
    for(const r of VARIANT_BUILDINGS){
      for(const view of['exterior','rear','roof-off','grey','wire'])await set(r.id,view);
      for(let level=0;level<r.levels;level++)for(const view of['cutaway','plan'])await set(r.id,view,r.id+'-'+view+'-L'+level,{level});
      await set(r.id,'grey',r.id+'-source-grey',{lod:'source'});
    }
    for(const p of VARIANT_PARTS)for(const view of['exterior','grey'])await set(p.id,view);
    for(const r of[...VARIANT_LAYOUTS,...VARIANT_BUILDINGS,...VARIANT_PARTS]){records.push(await page.evaluate(id=>window.variantReview.interchange(id),r.id));await capture(r.id+'-gltf');}
    for(const id of['castle-gatehouse','cyclone-security-gatehouse','castle-postern','cyclone-service-gate'])for(const time of[.5,1]){
      records.push(await page.evaluate(o=>window.variantReview.interchange(o.id,o.time),{id,time}));await capture(id+'-gltf-gates-'+time);
    }
  }
  await page.evaluate(()=>window.variantReview.dispose());
  async function sheet(title,items,file,columns=2){
    await page.setViewportSize({width:2100,height:850});
    await page.setContent('<html><style>body{margin:0;background:#e5e3d5;color:#263c32;font:16px system-ui}header{padding:24px 30px;background:#233b31;color:#f1e9d5}h1{font:30px Georgia;margin:0 0 8px}main{display:grid;grid-template-columns:repeat('+columns+',1fr);gap:12px;padding:18px}article{min-width:0}h2{font:23px Georgia;margin:12px}img{width:100%;display:block}p{margin:10px 12px;font-size:15px}footer{padding:18px 30px;font-size:14px}</style><header><h1>'+title+'</h1>Original castle + modern cyclone construction · shared native connection profile</header><main>'+items.map(i=>'<article><h2>'+i.title+'</h2><img src="'+baseURL+'/artifacts/fort-variants-review/'+i.image+'.jpg"><p>'+(i.caption||'')+'</p></article>').join('')+'</main><footer>2.12 m walk datums · 1.4 m minimum clear lane · 3 / 6 m modules · native unit scale · geometry and source before reduction</footer></html>');
    await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))));await capture(file);
  }
  for(const theme of['castle','cyclone'])await sheet(theme==='castle'?'Castle · two configurations':'Modern cyclone · two configurations',VARIANT_LAYOUTS.filter(r=>r.theme===theme).map(r=>({title:r.name,image:r.id+'-exterior',caption:r.width+' × '+r.depth+' m; same kit and matching native walkway connections.'})),theme+'-family');
  await sheet('One connection contract · two constructions',[
    {title:'Castle courtyard',image:'castle-fort-courtyard-exterior'},{title:'Modern security courtyard',image:'cyclone-fort-courtyard-exterior'},
    {title:'Mixed compound',image:'fort-variants-mixed-exterior'},{title:'Handed masonry / mesh transition',image:'link-castle-to-cyclone-transition'}
  ],'family');
  if(!smoke){
    await sheet('Castle wall stairs · solid masonry, no railings',[
      {title:'Switchback along the curtain wall',image:'castle-rampart-platform-stair-detail',caption:'Two flights run parallel to the wall, with a solid return landing.'},
      {title:'Rampart plan',image:'castle-rampart-platform-stair-top',caption:'The upper apron opens directly onto the original 2.12 m walk datum.'},
      {title:'Reusable 6 × 3 m stone stair',image:'castle-datum-stair-stair-detail',caption:'Solid stone flights and half-landing; no modern rails or stringers.'},
      {title:'Opposite flight directions',image:'castle-datum-stair-stair-top',caption:'Climb west, turn across the landing, then climb east beside the wall.'}
    ],'castle-stair-review');
    for(const id of['castle-gatehouse','cyclone-security-gatehouse'])await sheet(id.startsWith('castle')?'Castle gate · independent leaves':'Security gate · independent mesh leaves',[
      {title:'Closed',image:id+'-gate-swing-closed'},{title:'Open',image:id+'-gate-swing-open'},
      {title:'One leaf open',image:id+'-one-open'},{title:'Standard glTF animation',image:id+'-gltf-gates-1'}
    ],id+'-gate-review');
    await sheet('Raised towers, real voids and native connections',[
      {title:'Battlement roof stair',image:'castle-corner-tower-access'},{title:'Raised guard cabin access',image:'cyclone-guard-tower-access'},
      {title:'Geometric diamond fence',image:'cyclone-fence-6-fence-detail'},{title:'Open steel grating',image:'cyclone-fence-6-deck-detail'},
      {title:'Castle roof / wall interface',image:'castle-roof-store-roof-join'},{title:'Modern roof / catwalk interface',image:'cyclone-roof-store-roof-join'}
    ],'access-review');
    for(const theme of['castle','cyclone'])await sheet(theme==='castle'?'Masonry kit pieces':'Cyclone / catwalk kit pieces',VARIANT_PARTS.filter(r=>r.theme===theme).map(r=>({title:r.name,image:r.id+'-exterior'})),theme+'-parts-review',3);
    for(const r of VARIANT_BUILDINGS)await sheet(r.name,[...['exterior','grey','wire','roof-off'].map(view=>({title:view,image:r.id+'-'+view})),
      {title:'Ground plan',image:r.id+'-plan-L0'},{title:'Detailed source',image:r.id+'-source-grey'}],r.id+'-review',3);
  }
  const report={baseline:'6d9dfeca7e47a4bded6497472f46f49f8ce14a5b',catalogueSha256:sha(new URL('../../../assets/fort-variants/catalogue.json',import.meta.url)),
    connectorsSha256:sha(new URL('../../../assets/fort-variants/connectors.json',import.meta.url)),browser:browser.version(),rendering:'Isolated Edge software WebGL2 visual correctness; no frame-rate claim.',smoke,records,captures,errors,failedRequests};
  fs.writeFileSync(path.join(out,smoke?'smoke-checks.json':'browser-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({views:records.length,captures:captures.length,errors,failedRequests}));
},{source:true,output:'fort-variants-review',owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:600000});
