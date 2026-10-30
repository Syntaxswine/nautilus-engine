import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {withArtReview,projectRoot} from '../../../tools/art-review-browser.mjs';
import {FARMYARD_WINDOW_CATALOGUE as C} from '../../../packages/adapters/farmyard/windows.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function browserProof(mode='source'){
  if(!['source','built','installed'].includes(mode))throw Error('Unknown browser proof mode');
  const output='window-presentation-'+mode;
  const receipt=await withArtReview('Native window '+mode+' desktop/phone WebGL proof',async({page,baseURL,out})=>{
    await page.goto(baseURL+'/examples/window-presentation.html'+(mode==='installed'?'?installed=1':''));await page.waitForFunction(()=>window.windowReview?.ready);
    const cases=[];
    const capture=async(name,options,phone=false)=>{
      await page.setViewportSize(phone?{width:390,height:844}:{width:1440,height:1050});
      await page.evaluate(async o=>window.windowReview.choose(o),options);await page.locator('#viewport').scrollIntoViewIfNeeded();
      const before=await page.evaluate(()=>window.windowReview.renderer());const png=await page.locator('#viewport').screenshot();fs.writeFileSync(path.join(out,name+'.png'),png);
      if(!(before.calls>1&&before.triangles>0))throw Error('Missing native WebGL output');
      cases.push({name,options,phone,sha256:sha(png),...before});
    };
    for(const preset of C.presets){await page.evaluate(async id=>window.windowReview.choose({definitionId:id}),preset.id);const info=await page.evaluate(()=>window.windowReview.renderer());if(!(info.calls>1&&info.triangles>0))throw Error('Missing preset draw '+preset.id);}
    await capture('native-six',{definitionId:'window.full.grid-3x2.3m',finish:'sage'});
    await capture('waist-brick',{definitionId:'window.waist.grid-3x2.3m',finish:'ivory',wall:'brick'});
    await capture('waist-concrete-back',{definitionId:'window.waist.grid-3x2.3m',wall:'concrete',angle:'back'});
    await capture('waist-corrugated',{definitionId:'window.waist.vertical-3.3m',wall:'corrugated'});
    await capture('joined-frames',{definitionId:'window.full.grid-3x2.3m',neighbor:true});
    await capture('joined-sheets',{definitionId:'window.full.borderless.3m',neighbor:true});
    await capture('tall-sheet',{definitionId:'window.full.borderless'});
    await capture('quarter-phone',{definitionId:'window.waist.grid-3x2.3m',angle:'quarter',finish:'sage'},true);
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Phone overflow');
    await page.getByRole('button',{name:'Confirm one pane'}).click();await page.waitForFunction(()=>window.windowReview.diagnostics().activeEffects===1);
    await page.evaluate(()=>window.windowReview.sample(.35));fs.writeFileSync(path.join(out,'shatter-phone.png'),await page.locator('#viewport').screenshot());
    await page.getByRole('button',{name:'Quiet reload'}).click();await page.waitForFunction(()=>window.windowReview.diagnostics().activeEffects===0);if(await page.evaluate(()=>window.windowReview.diagnostics().revision)!==1)throw Error('Quiet reload lost accepted mask');
    await capture('tall-phone',{definitionId:'window.full.borderless'},true);
    await page.evaluate(()=>{window.windowReview.impact();window.windowReview.sample(2.8);});fs.writeFileSync(path.join(out,'tall-shatter-phone.png'),await page.locator('#viewport').screenshot());
    await page.evaluate(()=>window.windowReview.sample(20));if(await page.evaluate(()=>window.windowReview.diagnostics().activeEffects)!==0)throw Error('Tall debris was not retired');
    await page.evaluate(()=>window.windowReview.close());
    return {schemaVersion:1,mode,status:'pass',presets:C.presets.length,cases,phone:'390x844',backend:'Isolated Edge/Chromium WebGL via SwiftShader; no real-device FPS claim',interactions:['confirm fixture-owned pane','host elapsed seconds','quiet reload','tall landing/fade','owned close'],errors:0,failedRequests:0};
  },{source:mode!=='built',owner:'01a18109-8bdd-73a2-b61a-3d2cd8f8fcb3',output,timeoutMs:180000});
  fs.writeFileSync(path.join(projectRoot,'artifacts',output,'result.json'),JSON.stringify(receipt,null,2));return receipt;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await browserProof(process.argv[2]||'source')));
