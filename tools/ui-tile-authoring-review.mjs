// Static candidate design review only. No real Editor, renderer or authoring proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {withArtReview,projectRoot} from './art-review-browser.mjs';
import {projectAuthoringDiscovery} from '../candidates/tile-authoring/ui/discovery.js';
const prefix='candidates/tile-authoring/ui/';
const files=['contract.d.ts','discovery.js','specimen.html','specimen.css','specimen.js','examples/discovery.json','examples/payload-schema-specimen.json','examples/stroke-draft.json','examples/preset-draft.json'].map(file=>prefix+file);
files.push('tools/ui-tile-authoring-review.mjs','tools/art-review-browser.mjs');
const discovery=JSON.parse(fs.readFileSync(path.join(projectRoot,prefix,'examples/discovery.json')));
const projection=projectAuthoringDiscovery(discovery);
const report={
  scope:'Read-only UI contract/design specimen: metadata/layout only. No authoring, clipping, real floor/input behavior, history/save, installed package or physical device proof.',
  base:'b850e20e2fdd85435d33f16327482b80380af728',
  sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:projectRoot,encoding:'utf8',windowsHide:true}).trim(),
  hashes:Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(projectRoot,file))).digest('hex')])),
  checks:[],viewports:[]
};
await withArtReview('Tile-authoring UI contract/design specimen',async({page,browser,baseURL,out})=>{
  page.setDefaultTimeout(10000);
  report.browser=await browser.version();
  await page.emulateMedia({reducedMotion:'reduce'});
  const url=baseURL+'/'+prefix+'specimen.html';
  for(const viewport of [{width:1440,height:1100},{width:768,height:1024},{width:390,height:844},{width:320,height:740}]){
    await page.setViewportSize(viewport);await page.goto(url);
    await page.waitForFunction(()=>document.body.dataset.ready==='true');
    assert.match(await page.locator('.design-note').innerText(),/No live service/);
    assert.equal(await page.locator('.preview').getByRole('heading').innerText(),'Native preview unbound');
    assert.equal(await page.locator('.scope-panel').getByRole('heading').innerText(),'This placed instance');
    assert.match(await page.locator('.scope-panel').innerText(),/6.75 m/);
    const actual=await page.locator('[data-control-id]').evaluateAll(rows=>rows.map(row=>({
      controlId:row.dataset.controlId,commandId:row.dataset.commandId,
      label:row.querySelector('button')?.textContent||row.querySelector('label')?.firstChild?.textContent,
      disabled:row.querySelector('button,input,select').disabled
    })));
    const expected=projection.panels.flatMap(panel=>panel.controls.map(({control,command})=>({
      controlId:control.id,commandId:command.id,label:control.label+(control.unit?' ('+control.unit+')':''),
      disabled:true
    })));
    actual.sort((a,b)=>a.controlId.localeCompare(b.controlId));
    expected.sort((a,b)=>a.controlId.localeCompare(b.controlId));
    assert.deepEqual(actual,expected);
    assert.deepEqual(JSON.parse(await page.locator('#discovery').textContent()),discovery);
    for(const command of discovery.commands.filter(row=>!row.available)){
      for(const control of command.controls){
        const ids=(await page.locator('[data-control-id="'+control.id+'"] button,[data-control-id="'+control.id+'"] input,[data-control-id="'+control.id+'"] select').getAttribute('aria-describedby')).split(' ');
        const text=(await Promise.all(ids.map(id=>page.locator('#'+id).innerText()))).join(' ');
        for(const diagnostic of command.diagnostics){assert.ok(text.includes(diagnostic.code));assert.ok(text.includes(diagnostic.action));}
      }
    }
    const layout=await page.evaluate(()=>({
      viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      shortControls:[...document.querySelectorAll('button,input,select,summary')].filter(node=>node.getBoundingClientRect().height<44).map(node=>node.outerHTML)
    }));
    assert.ok(layout.scrollWidth<=layout.viewport,'No horizontal document overflow');
    assert.deepEqual(layout.shortControls,[],'All specimen controls meet 44 CSS px layout target');
    const file='design-'+viewport.width+'.png';await page.screenshot({path:path.join(out,file),fullPage:true});
    const topFile='design-'+viewport.width+'-top.png';await page.screenshot({path:path.join(out,topFile)});
    report.viewports.push({...viewport,topScreenshot:topFile,emulated:true,horizontalOverflow:false,minimumControlHeightCSSPx:44,screenshot:file,controlCount:actual.length});
  }
  report.checks.push('Shared command/control identity and labels at all four widths','Complete unchanged agent discovery remains inspectable',
    'Unavailable command codes and remedies remain visible','Instance scope and nonuniform native floor are explicit',
    'Unbound service/preview and disabled controls are labelled','No horizontal overflow and >=44 CSS px controls at 1440/768/390/320');
  fs.writeFileSync(path.join(out,'design-proof.json'),JSON.stringify(report,null,2)+'\n');
},{source:true,output:'tile-authoring-ui-design',timeoutMs:180000});
console.log(JSON.stringify({checks:report.checks.length,viewports:report.viewports.length,controls:projection.panels.flatMap(row=>row.controls).length,scope:report.scope}));
