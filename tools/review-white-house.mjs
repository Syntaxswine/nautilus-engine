import fs from'node:fs';import path from'node:path';import{withArtReview}from'./art-review-browser.mjs';
const source=process.argv.includes('--source'),mode=source?'source':'built';
const result=await withArtReview('White House painterly model/furnishing review',async({page,baseURL,out})=>{
 await page.goto(baseURL+'/examples/white-house.html');await page.waitForFunction(()=>window.whiteHouseReview?.ready);const captures=[];
 for(const [name,view,detail]of [['north','north',''],['south','south',''],['estate','estate',''],['state-floor','state',''],['blue-room','state','blue-room'],['oval-office','state','oval-office'],['east-room','state','east-room'],['ground-floor','ground',''],['furnishing-kit','kit',''],['resolute-desk','piece','resolute-desk']]){
  await page.evaluate(async({view,detail})=>window.whiteHouseReview.show(view,detail),{view,detail});await page.locator('#stage').scrollIntoViewIfNeeded();await page.locator('#stage').screenshot({path:path.join(out,name+'.png')});const info=await page.evaluate(()=>window.whiteHouseReview.diagnostics());if(!info.draws)throw Error('No draws for '+name);captures.push({name,...info});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.whiteHouseReview.show('state','blue-room'));await page.locator('#stage').scrollIntoViewIfNeeded();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Phone layout overflow');await page.locator('#stage').screenshot({path:path.join(out,'blue-room-phone.png')});
 await page.evaluate(()=>window.whiteHouseReview.show('piece','empire-armchair','authoring'));await page.locator('#stage').screenshot({path:path.join(out,'authoring-chair-phone.png')});
 await page.getByRole('button',{name:'Fit view'}).click();await page.evaluate(()=>window.whiteHouseReview.close());
 const report={schemaVersion:1,mode,status:'pass',captures,phone:'390 x 844',errors:0,failedRequests:0,backend:'Isolated browser with SwiftShader WebGL; not a physical-phone FPS measurement'};fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2));return report;
},{source,output:'white-house-'+mode,owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',timeoutMs:180000});console.log(JSON.stringify({mode,status:result.status,captures:result.captures.length+2}));
